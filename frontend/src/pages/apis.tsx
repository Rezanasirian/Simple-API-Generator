import { useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router"
import {
  BoxesIcon,
  CopyPlusIcon,
  DownloadIcon,
  GlobeIcon,
  LockIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"

import { ConfirmButton, CopyButton, DataSourceBadge, EmptyState, PageHeader, timeAgo } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { keys, useAction, useApis } from "@/lib/queries"

function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [overwrite, setOverwrite] = useState(false)
  const [result, setResult] = useState<{ created: string[]; updated: string[]; skipped: string[] } | null>(null)

  const run = useAction(
    async () => {
      const file = fileRef.current?.files?.[0]
      if (!file) throw new Error("Choose a file first")
      const items = JSON.parse(await file.text())
      return api.post<{ created: string[]; updated: string[]; skipped: string[] }>(
        `/apis/import?overwrite=${overwrite}`,
        items,
      )
    },
    { invalidate: [keys.apis], onSuccess: setResult },
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setResult(null)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import APIs</DialogTitle>
          <DialogDescription>
            Upload a file made with “Export”. Data sources are matched by name and must already exist.
          </DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="grid gap-1 text-sm">
            <p>Created: {result.created.join(", ") || "none"}</p>
            <p>Updated: {result.updated.join(", ") || "none"}</p>
            <p className="text-muted-foreground">Skipped (already exist): {result.skipped.join(", ") || "none"}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <Input ref={fileRef} type="file" accept="application/json,.json" />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={overwrite} onCheckedChange={(v) => setOverwrite(v === true)} />
              Overwrite APIs that already exist
            </label>
          </div>
        )}
        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <Button onClick={() => run.mutate(undefined)} disabled={run.isPending}>
              <UploadIcon /> Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

async function exportAll() {
  const data = await api.get("/apis/export")
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `apis-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function ApisPage() {
  const { data, isLoading } = useApis()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [importOpen, setImportOpen] = useState(false)

  const remove = useAction((id: number) => api.del(`/apis/${id}`), { invalidate: [keys.apis], success: "API deleted" })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data ?? []
    return (data ?? []).filter((a) =>
      [a.slug, a.name, a.description, a.table, a.data_source_name].some((s) => s.toLowerCase().includes(q)),
    )
  }, [data, search])

  return (
    <>
      <PageHeader
        title="APIs"
        description="Each API turns a table or collection into a filterable REST endpoint"
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontalIcon /> More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setImportOpen(true)}>
                  <UploadIcon /> Import from file
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={exportAll} disabled={!data?.length}>
                  <DownloadIcon /> Export all
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild>
              <Link to="/apis/new">
                <PlusIcon /> New API
              </Link>
            </Button>
          </>
        }
      />

      {isLoading ? (
        <Skeleton className="h-64" />
      ) : !data?.length ? (
        <EmptyState
          icon={<BoxesIcon />}
          title="No APIs yet"
          description="Pick a table, choose the filters callers may use and the fields they get back."
          action={
            <Button asChild>
              <Link to="/apis/new">
                <PlusIcon /> Create your first API
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          <div className="relative max-w-sm">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search APIs…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>API</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-center">Filters</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/apis/${a.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.name || a.slug}</span>
                        {!a.is_active && <Badge variant="secondary">Disabled</Badge>}
                      </div>
                      {a.description && (
                        <div className="max-w-xs truncate text-xs text-muted-foreground">{a.description}</div>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/api/{a.slug}</code>
                        <CopyButton value={`${window.location.origin}/api/${a.slug}`} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <DataSourceBadge type={a.data_source_type} name={a.data_source_name} />
                        <span className="font-mono text-xs text-muted-foreground">{a.table}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{a.condition_count}</TableCell>
                    <TableCell>
                      {a.require_api_key ? (
                        <Badge variant="outline" className="gap-1">
                          <LockIcon /> API key
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1">
                          <GlobeIcon /> Public
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{timeAgo(a.updated_at)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Actions">
                            <MoreHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => navigate(`/apis/${a.id}`)}>
                            <PencilIcon /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => navigate(`/apis/new?from=${a.id}`)}>
                            <CopyPlusIcon /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <ConfirmButton
                            title={`Delete ${a.name || a.slug}?`}
                            description={`/api/${a.slug} will stop working for every caller.`}
                            onConfirm={() => remove.mutate(a.id)}
                          >
                            <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                              <Trash2Icon /> Delete
                            </DropdownMenuItem>
                          </ConfirmButton>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No APIs match “{search}”.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  )
}
