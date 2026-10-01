import { useState } from "react"
import { Loader2Icon, PlayIcon, TriangleAlertIcon } from "lucide-react"

import { CodeBlock, Field } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiError, api } from "@/lib/api"
import type { ApiDefinitionInput, PreviewResponse } from "@/lib/types"

function buildBody(def: ApiDefinitionInput, values: Record<string, string | boolean>) {
  const body: Record<string, unknown> = {}
  for (const c of def.conditions) {
    const v = values[c.parameter]
    if (v === undefined || v === "" || v === false) continue
    body[c.parameter] = v
  }
  return body
}

function cell(v: unknown) {
  if (v === null || v === undefined) return <span className="text-muted-foreground">null</span>
  if (typeof v === "object") return <span className="font-mono text-xs">{JSON.stringify(v)}</span>
  return String(v)
}

export function TryPanel({ definition }: { definition: ApiDefinitionInput }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [limit, setLimit] = useState("")
  const [result, setResult] = useState<PreviewResponse | null>(null)
  const [error, setError] = useState<{ message: string; fields?: Record<string, string> } | null>(null)
  const [running, setRunning] = useState(false)

  const body = buildBody(definition, values)
  const slug = definition.slug || "your_api"

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await api.post<PreviewResponse>("/apis/preview", {
        definition: { ...definition, slug },
        request: { params: body, limit: limit ? Number(limit) : null },
      })
      setResult(res)
    } catch (e) {
      const detail = e instanceof ApiError ? e.detail : null
      const fields =
        detail && typeof detail === "object" && "errors" in detail
          ? (detail as { errors: Record<string, string> }).errors
          : undefined
      setError({ message: (e as Error).message, fields })
      setResult(null)
    } finally {
      setRunning(false)
    }
  }

  const rows = result?.result.data ?? []
  const columns = rows.length ? Object.keys(rows[0]) : []
  const curl = [
    `curl -X POST '${window.location.origin}/api/${slug}?limit=${limit || definition.default_limit}'`,
    `  -H 'Content-Type: application/json'`,
    ...(definition.require_api_key ? [`  -H 'X-API-Key: YOUR_API_KEY'`] : []),
    `  -d '${JSON.stringify(body)}'`,
  ].join(" \\\n")

  return (
    <Card className="min-w-0 gap-4">
      <CardHeader>
        <CardTitle>Try it</CardTitle>
        <CardDescription>Runs the current (unsaved) settings against the database.</CardDescription>
      </CardHeader>
      <CardContent className="grid min-w-0 gap-4 *:min-w-0">
        {definition.conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No filters yet — the API returns every row, page by page.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {definition.conditions.map((c) => {
              const isNull = c.operator === "IS NULL" || c.operator === "IS NOT NULL"
              return (
                <Field
                  key={c.parameter}
                  label={
                    <>
                      <span className="font-mono">{c.parameter}</span>
                      {c.required && <span className="text-destructive">*</span>}
                    </>
                  }
                  error={error?.fields?.[c.parameter]}
                  hint={c.operator === "IN" || c.operator === "NOT IN" ? "comma-separated" : undefined}
                >
                  {isNull || c.data_type === "boolean" ? (
                    <label className="flex h-9 items-center gap-2 text-sm">
                      <Switch
                        checked={values[c.parameter] === true || values[c.parameter] === "true"}
                        onCheckedChange={(v) => setValues((s) => ({ ...s, [c.parameter]: isNull ? v : String(v) }))}
                      />
                      {isNull ? c.operator.toLowerCase() : "true / false"}
                    </label>
                  ) : (
                    <Input
                      value={String(values[c.parameter] ?? "")}
                      type={c.data_type === "date" ? "date" : "text"}
                      inputMode={c.data_type === "integer" || c.data_type === "number" ? "decimal" : undefined}
                      placeholder={c.ignore_if ? `${c.ignore_if} = no filter` : c.display_name || `${c.column} ${c.operator} …`}
                      onChange={(e) => setValues((s) => ({ ...s, [c.parameter]: e.target.value }))}
                    />
                  )}
                </Field>
              )
            })}
          </div>
        )}
        <div className="flex items-end gap-3">
          <Field label="Limit" className="w-28">
            <Input type="number" min={1} max={definition.max_limit} value={limit} placeholder={String(definition.default_limit)} onChange={(e) => setLimit(e.target.value)} />
          </Field>
          <Button onClick={run} disabled={running || !definition.data_source_id || !definition.table} className="flex-1">
            {running ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
            Run
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span className="break-all">{error.message}</span>
          </div>
        )}

        {result && (
          <Tabs defaultValue="table" className="gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <TabsList>
                <TabsTrigger value="table">Rows</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
                <TabsTrigger value="query">Query</TabsTrigger>
              </TabsList>
              <div className="flex gap-2">
                <Badge variant="secondary">{result.result.pagination.total.toLocaleString()} total</Badge>
                <Badge variant="outline">{result.time_ms} ms</Badge>
              </div>
            </div>
            <TabsContent value="table">
              {rows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No rows match.</p>
              ) : (
                <div className="max-h-96 overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((c) => (
                          <TableHead key={c}>{c}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          {columns.map((c) => (
                            <TableCell key={c} className="max-w-64 truncate">
                              {cell(r[c])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            <TabsContent value="json">
              <CodeBlock code={JSON.stringify(result.result, null, 2)} />
            </TabsContent>
            <TabsContent value="query">
              <CodeBlock
                code={
                  typeof result.result.query === "string"
                    ? result.result.query
                    : JSON.stringify(result.result.query, null, 2)
                }
              />
            </TabsContent>
          </Tabs>
        )}

        <div className="grid gap-2">
          <div className="text-sm font-medium">Call it from anywhere</div>
          <CodeBlock code={curl} />
        </div>
      </CardContent>
    </Card>
  )
}
