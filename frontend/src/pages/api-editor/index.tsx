import { useEffect, useMemo, useState } from "react"
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from "react-router"
import {
  ArrowLeftIcon,
  DatabaseIcon,
  FilterIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  SparklesIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react"

import { CopyButton, DataSourceBadge, EmptyState, Field } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { keys, useAction, useApi, useColumns, useDataSources, useDatabases, useTables } from "@/lib/queries"
import type { ApiDefinition, ApiDefinitionInput, Condition, ResponseTransform } from "@/lib/types"
import { cn } from "@/lib/utils"

import { ConditionDialog, OPERATOR_HELP, emptyCondition, toParam } from "./condition-dialog"
import { TransformDialog, describeTransform } from "./transform-dialog"
import { TryPanel } from "./try-panel"

const BLANK: ApiDefinitionInput = {
  slug: "",
  name: "",
  description: "",
  version: "1.0.0",
  is_active: true,
  require_api_key: true,
  data_source_id: 0,
  database: "",
  table: "",
  default_limit: 50,
  max_limit: 1000,
  default_order_field: null,
  default_order_direction: "ASC",
  cache_ttl: 0,
  conditions: [],
  response_fields: [],
  response_transforms: [],
}

function toInput(a: ApiDefinition): ApiDefinitionInput {
  const out = { ...BLANK }
  for (const k of Object.keys(BLANK) as (keyof ApiDefinitionInput)[]) {
    ;(out as Record<string, unknown>)[k] = a[k]
  }
  return out
}

/** A text input with suggestions from the database; free text is always allowed. */
function SuggestInput({
  id,
  value,
  onChange,
  options,
  loading,
  error,
  placeholder,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  options: string[] | undefined
  loading?: boolean
  error?: boolean
  placeholder?: string
}) {
  return (
    <div className="relative">
      <Input id={id} list={`${id}-list`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="font-mono" />
      {loading && <Loader2Icon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {error && !loading && (
        <TriangleAlertIcon
          className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-warning"
          aria-label="Could not load suggestions from the database"
        />
      )}
      <datalist id={`${id}-list`}>
        {options?.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  )
}

export function ApiEditorPage() {
  const params = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const editingId = params.id ? Number(params.id) : null
  const copyFrom = search.get("from") ? Number(search.get("from")) : null

  const existing = useApi(editingId ?? copyFrom)
  const { data: sources, isLoading: sourcesLoading } = useDataSources()

  const [form, setForm] = useState<ApiDefinitionInput | null>(null)
  const [saved, setSaved] = useState<string>("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [conditionDialog, setConditionDialog] = useState<{ index: number; value: Condition; key: number } | null>(null)
  const [transformDialog, setTransformDialog] = useState<{ index: number; value: ResponseTransform; key: number } | null>(null)
  const [manualField, setManualField] = useState("")

  // Initialise the form once its source data is available.
  useEffect(() => {
    if (form) return
    if (editingId || copyFrom) {
      if (!existing.data) return
      const input = toInput(existing.data)
      if (copyFrom && !editingId) {
        input.slug = `${input.slug}_copy`
        input.name = input.name ? `${input.name} (copy)` : ""
        setForm(input)
        setSaved("")
      } else {
        setForm(input)
        setSaved(JSON.stringify(input))
      }
      setSlugTouched(true)
    } else if (sources) {
      setForm({ ...BLANK, data_source_id: sources[0]?.id ?? 0 })
    }
  }, [form, editingId, copyFrom, existing.data, sources])

  const ds = sources?.find((s) => s.id === form?.data_source_id)
  const isMongo = ds?.type === "mongodb"
  const isSql = !!ds && !isMongo

  const databases = useDatabases(ds?.id ?? null)
  const tables = useTables(ds?.id ?? null, form?.database ?? "", !isMongo || !!form?.database)
  const columns = useColumns(ds?.id ?? null, form?.database ?? "", form?.table ?? "")
  const columnInfo = useMemo(() => columns.data ?? [], [columns.data])
  const columnNames = useMemo(() => columnInfo.map((c) => c.name), [columnInfo])

  const dirty = form !== null && JSON.stringify(form) !== saved
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)

  useEffect(() => {
    if (blocker.state !== "blocked") return
    if (window.confirm("You have unsaved changes. Leave anyway?")) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  useEffect(() => {
    if (!dirty) return
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", onUnload)
    return () => window.removeEventListener("beforeunload", onUnload)
  }, [dirty])

  const save = useAction(
    (body: ApiDefinitionInput) =>
      editingId ? api.put<ApiDefinition>(`/apis/${editingId}`, body) : api.post<ApiDefinition>("/apis", body),
    {
      invalidate: [keys.apis],
      success: "API saved",
      onSuccess: (res) => {
        const input = toInput(res)
        setForm(input)
        setSaved(JSON.stringify(input))
        if (!editingId) setTimeout(() => navigate(`/apis/${res.id}`, { replace: true }))
      },
    },
  )

  if ((editingId || copyFrom) && existing.isError) {
    return <EmptyState icon={<TriangleAlertIcon />} title="API not found" action={<Button asChild variant="outline"><Link to="/apis">Back to APIs</Link></Button>} />
  }
  if (!form || sourcesLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }
  if (!sources?.length) {
    return (
      <EmptyState
        icon={<DatabaseIcon />}
        title="Add a data source first"
        description="APIs read from a database connection. An administrator can add one on the Data sources page."
        action={
          <Button asChild>
            <Link to="/data-sources">Go to data sources</Link>
          </Button>
        }
      />
    )
  }

  const set = (patch: Partial<ApiDefinitionInput>) => setForm((f) => (f ? { ...f, ...patch } : f))
  const slugError = form.slug && !/^[A-Za-z][A-Za-z0-9_-]*$/.test(form.slug) ? "Start with a letter; letters, numbers, _ and - only" : undefined
  const canSave = !!form.slug && !slugError && !!form.table && !!form.data_source_id && (!isMongo || !!form.database)
  const fieldOptions = form.response_fields.length ? form.response_fields : columnNames

  const saveCondition = (c: Condition) => {
    if (!conditionDialog) return
    const list = [...form.conditions]
    if (conditionDialog.index < 0) list.push(c)
    else list[conditionDialog.index] = c
    set({ conditions: list })
    setConditionDialog(null)
  }

  const saveTransform = (t: ResponseTransform) => {
    if (!transformDialog) return
    const list = [...form.response_transforms]
    if (transformDialog.index < 0) list.push(t)
    else list[transformDialog.index] = t
    set({ response_transforms: list })
    setTransformDialog(null)
  }

  const toggleField = (name: string, on: boolean) =>
    set({
      response_fields: on
        ? [...form.response_fields, name]
        : form.response_fields.filter((f) => f !== name),
    })

  const moveCondition = (from: number, to: number) => {
    if (to < 0 || to >= form.conditions.length) return
    const list = [...form.conditions]
    const [item] = list.splice(from, 1)
    list.splice(to, 0, item)
    set({ conditions: list })
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/apis" aria-label="Back">
              <ArrowLeftIcon />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {form.name || (editingId ? form.slug : "New API")}
            </h1>
            {form.slug && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <code className="font-mono">POST /api/{form.slug}</code>
                {editingId && <CopyButton value={`${window.location.origin}/api/${form.slug}`} />}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {dirty && <Badge variant="warning">Unsaved changes</Badge>}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.is_active} onCheckedChange={(is_active) => set({ is_active })} />
            {form.is_active ? "Active" : "Disabled"}
          </label>
          <Button onClick={() => save.mutate(form)} disabled={!canSave || save.isPending || (!dirty && !!editingId)}>
            {save.isPending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <Tabs defaultValue="source">
          <TabsList>
            <TabsTrigger value="source">
              <DatabaseIcon /> Source
            </TabsTrigger>
            <TabsTrigger value="filters">
              <FilterIcon /> Filters
              {form.conditions.length > 0 && <Badge variant="secondary" className="px-1.5">{form.conditions.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="response">
              <SparklesIcon /> Response
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="source" className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" htmlFor="name">
                  <Input
                    id="name"
                    value={form.name}
                    placeholder="Company list"
                    onChange={(e) => {
                      const name = e.target.value
                      set({ name, ...(slugTouched ? {} : { slug: toParam(name.toLowerCase()) }) })
                    }}
                  />
                </Field>
                <Field label="Endpoint id" htmlFor="slug" error={slugError} hint="Used in the URL: /api/<id>">
                  <Input
                    id="slug"
                    value={form.slug}
                    className="font-mono"
                    placeholder="companies"
                    onChange={(e) => {
                      setSlugTouched(true)
                      set({ slug: e.target.value })
                    }}
                  />
                </Field>
                <Field label="Description" htmlFor="desc" className="sm:col-span-2">
                  <Textarea id="desc" rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="What this API returns and who uses it" />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Where the data comes from</CardTitle>
                <CardDescription>Suggestions are read live from the database; you can also type names.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <Field label="Data source">
                  <Select
                    value={String(form.data_source_id || "")}
                    onValueChange={(v) => set({ data_source_id: Number(v), database: "", table: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {ds && <DataSourceBadge type={ds.type} />}
                </Field>
                <Field
                  label={isMongo ? "Database" : "Schema"}
                  htmlFor="database"
                  hint={isMongo ? "Required" : "Optional; defaults to the connection's"}
                >
                  <SuggestInput
                    id="database"
                    value={form.database}
                    onChange={(database) => set({ database, table: "" })}
                    options={databases.data}
                    loading={databases.isFetching}
                    error={databases.isError}
                  />
                </Field>
                <Field label={isMongo ? "Collection" : "Table or view"} htmlFor="table">
                  <SuggestInput
                    id="table"
                    value={form.table}
                    onChange={(table) => set({ table })}
                    options={tables.data}
                    loading={tables.isFetching}
                    error={tables.isError}
                  />
                </Field>
                {columns.isError && (
                  <p className="text-sm text-warning sm:col-span-3">Could not read the columns: {columns.error.message}</p>
                )}
                {columnInfo.length > 0 && (
                  <div className="sm:col-span-3">
                    <div className="mb-2 text-sm text-muted-foreground">{columnInfo.length} columns</div>
                    <div className="flex flex-wrap gap-1.5">
                      {columnInfo.map((c) => (
                        <Badge key={c.name} variant="outline" className="font-mono font-normal">
                          {c.name}
                          <span className="text-muted-foreground">{c.type.toLowerCase()}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="filters">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Parameters callers can send to narrow down the results.</CardDescription>
                <CardAction>
                  <Button size="sm" onClick={() => setConditionDialog({ index: -1, value: emptyCondition(), key: Date.now() })}>
                    <PlusIcon /> Add filter
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {form.conditions.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No filters — every call returns all rows (paginated).
                    {columnNames.length > 0 && (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {columnNames.slice(0, 6).map((name) => (
                          <Button
                            key={name}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const c = emptyCondition(name)
                              setConditionDialog({ index: -1, value: c, key: Date.now() })
                            }}
                          >
                            <PlusIcon /> {name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {form.conditions.map((c, i) => (
                      <div key={c.parameter} className="flex items-center gap-3 p-3">
                        <div className="flex flex-col">
                          <button type="button" className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0} onClick={() => moveCondition(i, i - 1)} aria-label="Move up">
                            <ChevronUpIcon className="size-4" />
                          </button>
                          <button type="button" className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === form.conditions.length - 1} onClick={() => moveCondition(i, i + 1)} aria-label="Move down">
                            <ChevronDownIcon className="size-4" />
                          </button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="font-mono text-sm font-medium">{c.parameter}</code>
                            <Badge variant="secondary" className="font-normal">{c.data_type}</Badge>
                            {c.required && <Badge variant="outline">required</Badge>}
                            {c.ignore_if !== null && <Badge variant="outline">skip if “{c.ignore_if}”</Badge>}
                          </div>
                          <div className="mt-0.5 truncate text-sm text-muted-foreground">
                            <span className="font-mono">{c.column}</span> {OPERATOR_HELP[c.operator]}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => setConditionDialog({ index: i, value: c, key: Date.now() })}>
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => set({ conditions: form.conditions.filter((_, j) => j !== i) })}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="response" className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Fields</CardTitle>
                <CardDescription>
                  {form.response_fields.length === 0
                    ? "Returning every field. Pick some to return only those."
                    : `Returning ${form.response_fields.length} field${form.response_fields.length === 1 ? "" : "s"}.`}
                </CardDescription>
                {form.response_fields.length > 0 && (
                  <CardAction>
                    <Button variant="ghost" size="sm" onClick={() => set({ response_fields: [] })}>
                      Return all
                    </Button>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="grid gap-4">
                {columnNames.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {columnInfo.map((c) => (
                      <label
                        key={c.name}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent",
                          form.response_fields.includes(c.name) && "border-primary/50 bg-primary/5",
                        )}
                      >
                        <Checkbox checked={form.response_fields.includes(c.name)} onCheckedChange={(v) => toggleField(c.name, v === true)} />
                        <span className="truncate font-mono">{c.name}</span>
                        <span className="ml-auto truncate text-xs text-muted-foreground">{c.type.toLowerCase()}</span>
                      </label>
                    ))}
                  </div>
                )}
                {form.response_fields.filter((f) => !columnNames.includes(f)).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.response_fields
                      .filter((f) => !columnNames.includes(f))
                      .map((f) => (
                        <Badge key={f} variant="secondary" className="gap-1 font-mono">
                          {f}
                          <button type="button" aria-label={`Remove ${f}`} onClick={() => toggleField(f, false)}>
                            ×
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
                <form
                  className="flex max-w-sm gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const name = manualField.trim()
                    if (name && !form.response_fields.includes(name)) toggleField(name, true)
                    setManualField("")
                  }}
                >
                  <Input value={manualField} onChange={(e) => setManualField(e.target.value)} placeholder="Add a field by name" className="font-mono" />
                  <Button type="submit" variant="outline">
                    Add
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Computed fields</CardTitle>
                <CardDescription>Extra fields calculated from each row, e.g. a full date from year and month.</CardDescription>
                <CardAction>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setTransformDialog({ index: -1, value: { target: "", type: "template", sources: [], template: "" }, key: Date.now() })
                    }
                  >
                    <PlusIcon /> Add
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                {form.response_transforms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None.</p>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {form.response_transforms.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <code className="font-mono text-sm font-medium">{t.target}</code>
                          <div className="truncate font-mono text-xs text-muted-foreground">{describeTransform(t)}</div>
                        </div>
                        <Button variant="ghost" size="icon-sm" aria-label="Edit" onClick={() => setTransformDialog({ index: i, value: t, key: Date.now() })}>
                          <PencilIcon />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => set({ response_transforms: form.response_transforms.filter((_, j) => j !== i) })}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Paging & order</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field label="Rows per page" htmlFor="dl" hint="When the caller does not send ?limit=">
                  <Input id="dl" type="number" min={1} value={form.default_limit} onChange={(e) => set({ default_limit: Number(e.target.value) })} />
                </Field>
                <Field label="Maximum rows per page" htmlFor="ml" error={form.default_limit > form.max_limit ? "Must be at least the rows per page" : undefined}>
                  <Input id="ml" type="number" min={1} max={10000} value={form.max_limit} onChange={(e) => set({ max_limit: Number(e.target.value) })} />
                </Field>
                <Field label="Sort by" htmlFor="order" hint="Callers can override with ?order_by=">
                  <SuggestInput id="order" value={form.default_order_field ?? ""} onChange={(v) => set({ default_order_field: v || null })} options={fieldOptions} placeholder="none" />
                </Field>
                <Field label="Direction">
                  <Select value={form.default_order_direction} onValueChange={(v) => set({ default_order_direction: v as "ASC" | "DESC" })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASC">Ascending (A → Z, 1 → 9)</SelectItem>
                      <SelectItem value="DESC">Descending (Z → A, 9 → 1)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Access & caching</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5">
                <label className="flex items-start gap-3">
                  <Switch checked={form.require_api_key} onCheckedChange={(require_api_key) => set({ require_api_key })} className="mt-0.5" />
                  <span>
                    <span className="text-sm font-medium">Require an API key</span>
                    <span className="block text-sm text-muted-foreground">
                      {form.require_api_key
                        ? "Callers must send a valid X-API-Key header."
                        : "Anyone who knows the URL can read this data."}
                    </span>
                  </span>
                </label>
                <Field label="Browser/CDN cache (seconds)" htmlFor="ttl" hint="0 disables caching; sets Cache-Control: max-age" className="max-w-xs">
                  <Input id="ttl" type="number" min={0} value={form.cache_ttl} onChange={(e) => set({ cache_ttl: Number(e.target.value) })} />
                </Field>
                <Field label="Version" htmlFor="version" className="max-w-xs">
                  <Input id="version" value={form.version} onChange={(e) => set({ version: e.target.value })} />
                </Field>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
          <TryPanel definition={form} />
        </div>
      </div>

      {conditionDialog && (
        <ConditionDialog
          key={conditionDialog.key}
          open
          onOpenChange={(o) => !o && setConditionDialog(null)}
          initial={conditionDialog.value}
          isNew={conditionDialog.index < 0}
          columns={columnInfo}
          isSql={isSql}
          takenParams={form.conditions.filter((_, i) => i !== conditionDialog.index).map((c) => c.parameter)}
          onSave={saveCondition}
        />
      )}
      {transformDialog && (
        <TransformDialog
          key={transformDialog.key}
          open
          onOpenChange={(o) => !o && setTransformDialog(null)}
          initial={transformDialog.value}
          isNew={transformDialog.index < 0}
          columns={columnNames}
          onSave={saveTransform}
        />
      )}
    </div>
  )
}
