import { useState } from "react"
import {
  CheckCircle2Icon,
  DatabaseIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlugZapIcon,
  PlusIcon,
  Trash2Icon,
  XCircleIcon,
} from "lucide-react"
import { toast } from "sonner"

import { ConfirmButton, DATA_SOURCE_LABELS, DataSourceBadge, EmptyState, Field, PageHeader } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"
import { keys, useAction, useDataSources } from "@/lib/queries"
import type { DataSource, DataSourceConfig, DataSourceType } from "@/lib/types"
import { cn } from "@/lib/utils"

const TYPES: DataSourceType[] = ["mongodb", "mysql", "postgresql", "trino", "sqlite"]
const DEFAULT_PORTS: Record<DataSourceType, number | null> = {
  mongodb: 27017,
  mysql: 3306,
  postgresql: 5432,
  trino: 8080,
  sqlite: null,
}

interface TestResult {
  ok: boolean
  message: string
}

function describe(ds: DataSource) {
  const c = ds.config
  if (c.uri) return "Connection string"
  if (ds.type === "sqlite") return c.path ?? ""
  return `${c.host ?? "localhost"}:${c.port ?? DEFAULT_PORTS[ds.type]}${c.database ? ` / ${c.database}` : ""}`
}

function DataSourceDialog({
  open,
  onOpenChange,
  existing,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  existing: DataSource | null
}) {
  const [name, setName] = useState(existing?.name ?? "")
  const [type, setType] = useState<DataSourceType>(existing?.type ?? "mongodb")
  const [cfg, setCfg] = useState<DataSourceConfig>(existing?.config ?? { verify_ssl: true })
  const [useUri, setUseUri] = useState(Boolean(existing?.config.uri))
  const [test, setTest] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)

  const set = (patch: Partial<DataSourceConfig>) => {
    setCfg((c) => ({ ...c, ...patch }))
    setTest(null)
  }

  const payload = () => {
    const config: DataSourceConfig = { ...cfg }
    if (useUri) {
      Object.assign(config, { host: null, port: null, username: null, password: null })
    } else {
      config.uri = null
    }
    return { name: name.trim(), type, config }
  }

  const save = useAction(
    () => (existing ? api.put(`/data-sources/${existing.id}`, payload()) : api.post("/data-sources", payload())),
    {
      invalidate: [keys.dataSources],
      success: existing ? "Data source updated" : "Data source added",
      onSuccess: () => onOpenChange(false),
    },
  )

  const runTest = async () => {
    setTesting(true)
    try {
      const qs = existing ? `?existing_id=${existing.id}` : ""
      setTest(await api.post<TestResult>(`/data-sources/test${qs}`, payload()))
    } catch (e) {
      setTest({ ok: false, message: (e as Error).message })
    } finally {
      setTesting(false)
    }
  }

  const isSqlite = type === "sqlite"
  const dbLabel = type === "trino" ? "Catalog" : "Default database"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate(undefined)
          }}
        >
          <DialogHeader>
            <DialogTitle>{existing ? "Edit data source" : "Add a data source"}</DialogTitle>
            <DialogDescription>The database your APIs read from. Credentials are never sent back to the browser.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                disabled={!!existing && existing.api_count > 0 && t !== existing.type}
                onClick={() => {
                  setType(t)
                  setTest(null)
                }}
                className={cn(
                  "rounded-lg border px-2 py-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40",
                  type === t && "border-primary bg-primary/5 ring-1 ring-primary",
                )}
              >
                {DATA_SOURCE_LABELS[t]}
              </button>
            ))}
          </div>

          <Field label="Name" htmlFor="ds-name" hint="Shown when you pick a data source for an API">
            <Input id="ds-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production Mongo" required />
          </Field>

          {isSqlite ? (
            <Field label="Database file" htmlFor="ds-path" hint="Path on the server, e.g. ./data/sample.db">
              <Input id="ds-path" value={cfg.path ?? ""} onChange={(e) => set({ path: e.target.value })} required />
            </Field>
          ) : (
            <>
              <Tabs value={useUri ? "uri" : "fields"} onValueChange={(v) => setUseUri(v === "uri")}>
                <TabsList>
                  <TabsTrigger value="fields">Host & credentials</TabsTrigger>
                  <TabsTrigger value="uri">Connection string</TabsTrigger>
                </TabsList>
              </Tabs>
              {useUri ? (
                <Field
                  label="Connection string"
                  htmlFor="ds-uri"
                  hint={
                    type === "mongodb"
                      ? "mongodb://user:pass@host:27017/?authSource=admin"
                      : "SQLAlchemy URL, e.g. postgresql+psycopg://user:pass@host/db"
                  }
                >
                  <Input id="ds-uri" value={cfg.uri ?? ""} onChange={(e) => set({ uri: e.target.value })} className="font-mono" required />
                </Field>
              ) : (
                <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                  <Field label="Host" htmlFor="ds-host">
                    <Input id="ds-host" value={cfg.host ?? ""} onChange={(e) => set({ host: e.target.value })} placeholder="localhost" />
                  </Field>
                  <Field label="Port" htmlFor="ds-port">
                    <Input
                      id="ds-port"
                      type="number"
                      value={cfg.port ?? ""}
                      placeholder={String(DEFAULT_PORTS[type] ?? "")}
                      onChange={(e) => set({ port: e.target.value ? Number(e.target.value) : null })}
                    />
                  </Field>
                  <Field label="Username" htmlFor="ds-user">
                    <Input id="ds-user" value={cfg.username ?? ""} onChange={(e) => set({ username: e.target.value })} autoComplete="off" />
                  </Field>
                  <Field
                    label="Password"
                    htmlFor="ds-pass"
                    className="sm:col-span-2"
                    hint={existing?.has_password ? "Leave empty to keep the saved password" : undefined}
                  >
                    <Input
                      id="ds-pass"
                      type="password"
                      value={cfg.password ?? ""}
                      onChange={(e) => set({ password: e.target.value })}
                      autoComplete="new-password"
                      placeholder={existing?.has_password ? "••••••••" : ""}
                    />
                  </Field>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={dbLabel}
                  htmlFor="ds-db"
                  hint={type === "trino" ? "e.g. hive" : "Optional; each API picks its own database"}
                >
                  <Input id="ds-db" value={cfg.database ?? ""} onChange={(e) => set({ database: e.target.value })} />
                </Field>
                {type === "mongodb" && !useUri && (
                  <Field label="Auth database" htmlFor="ds-authsrc">
                    <Input id="ds-authsrc" value={cfg.auth_source ?? ""} placeholder="admin" onChange={(e) => set({ auth_source: e.target.value })} />
                  </Field>
                )}
                {type === "trino" && (
                  <Field label="Protocol">
                    <Select value={cfg.http_scheme ?? "auto"} onValueChange={(v) => set({ http_scheme: v === "auto" ? null : (v as "http" | "https") })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto (https with password)</SelectItem>
                        <SelectItem value="http">http</SelectItem>
                        <SelectItem value="https">https</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </div>
              {type === "trino" && (
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={cfg.verify_ssl ?? true} onCheckedChange={(v) => set({ verify_ssl: v })} />
                  Verify TLS certificate
                </label>
              )}
            </>
          )}

          {test && (
            <div
              className={cn(
                "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
                test.ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
              )}
            >
              {test.ok ? <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" /> : <XCircleIcon className="mt-0.5 size-4 shrink-0" />}
              <span className="break-all">{test.message}</span>
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="outline" onClick={runTest} disabled={testing}>
              {testing ? <Loader2Icon className="animate-spin" /> : <PlugZapIcon />}
              Test connection
            </Button>
            <Button type="submit" disabled={save.isPending || !name.trim()}>
              {save.isPending && <Loader2Icon className="animate-spin" />}
              {existing ? "Save changes" : "Add data source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DataSourcesPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const { data, isLoading } = useDataSources()
  const [dialog, setDialog] = useState<{ open: boolean; existing: DataSource | null; key: number }>({
    open: false,
    existing: null,
    key: 0,
  })

  const openDialog = (existing: DataSource | null) => setDialog((d) => ({ open: true, existing, key: d.key + 1 }))

  const remove = useAction((id: number) => api.del(`/data-sources/${id}`), {
    invalidate: [keys.dataSources],
    success: "Data source deleted",
  })

  const testSaved = async (ds: DataSource) => {
    const id = toast.loading(`Connecting to ${ds.name}…`)
    try {
      const r = await api.post<TestResult>(`/data-sources/${ds.id}/test`)
      if (r.ok) {
        toast.success(r.message, { id })
      } else {
        toast.error(r.message, { id })
      }
    } catch (e) {
      toast.error((e as Error).message, { id })
    }
  }

  return (
    <>
      <PageHeader
        title="Data sources"
        description="Databases your APIs can read from"
        actions={
          isAdmin && (
            <Button onClick={() => openDialog(null)}>
              <PlusIcon /> Add data source
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={<DatabaseIcon />}
          title="No data sources"
          description={
            isAdmin
              ? "Add MongoDB, MySQL, PostgreSQL, Trino or SQLite to start building APIs."
              : "Ask an administrator to add a database connection."
          }
          action={
            isAdmin && (
              <Button onClick={() => openDialog(null)}>
                <PlusIcon /> Add data source
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((ds) => (
            <Card key={ds.id} className="gap-4">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div className="grid min-w-0 gap-2">
                  <CardTitle className="truncate">{ds.name}</CardTitle>
                  <DataSourceBadge type={ds.type} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Actions">
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => testSaved(ds)}>
                      <PlugZapIcon /> Test connection
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onSelect={() => openDialog(ds)}>
                        <PencilIcon /> Edit
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="truncate font-mono text-xs text-muted-foreground" title={describe(ds)}>
                  {describe(ds)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {ds.api_count} API{ds.api_count === 1 ? "" : "s"}
                  </span>
                  {isAdmin && (
                    <ConfirmButton
                      title={`Delete ${ds.name}?`}
                      description={
                        ds.api_count
                          ? "APIs still use this data source; delete them first."
                          : "This removes the saved connection settings."
                      }
                      onConfirm={() => remove.mutate(ds.id)}
                    >
                      <Button variant="ghost" size="icon-sm" aria-label="Delete" className="text-muted-foreground hover:text-destructive">
                        <Trash2Icon />
                      </Button>
                    </ConfirmButton>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DataSourceDialog
        key={dialog.key}
        open={dialog.open}
        existing={dialog.existing}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </>
  )
}
