import { useState } from "react"
import { KeyRoundIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react"

import { ConfirmButton, CopyButton, EmptyState, Field, PageHeader, formatDate, timeAgo } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { keys, useAction, useApiKeys } from "@/lib/queries"
import type { ApiKey } from "@/lib/types"

export function ApiKeysPage() {
  const { data, isLoading } = useApiKeys()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [created, setCreated] = useState<string | null>(null)

  const create = useAction(() => api.post<ApiKey & { key: string }>("/api-keys", { name }), {
    invalidate: [keys.apiKeys],
    onSuccess: (k) => {
      setCreateOpen(false)
      setName("")
      setCreated(k.key)
    },
  })
  const remove = useAction((id: number) => api.del(`/api-keys/${id}`), {
    invalidate: [keys.apiKeys],
    success: "API key revoked",
  })

  return (
    <>
      <PageHeader
        title="API keys"
        description={
          <>
            Send a key in the <code className="rounded bg-muted px-1 py-0.5 text-xs">X-API-Key</code> header to call
            protected APIs.
          </>
        }
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon /> New key
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !data?.length ? (
        <EmptyState
          icon={<KeyRoundIcon />}
          title="No API keys"
          description="Create a key for each app or service that calls your APIs, so you can revoke them one by one."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon /> New key
            </Button>
          }
        />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{k.prefix}…</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(k.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{timeAgo(k.last_used_at)}</TableCell>
                  <TableCell>
                    <ConfirmButton
                      title={`Revoke "${k.name}"?`}
                      description="Apps using this key will stop working immediately."
                      confirmLabel="Revoke"
                      onConfirm={() => remove.mutate(k.id)}
                    >
                      <Button variant="ghost" size="icon-sm" aria-label="Revoke" className="text-muted-foreground hover:text-destructive">
                        <Trash2Icon />
                      </Button>
                    </ConfirmButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              create.mutate(undefined)
            }}
          >
            <DialogHeader>
              <DialogTitle>New API key</DialogTitle>
              <DialogDescription>Name it after the app that will use it.</DialogDescription>
            </DialogHeader>
            <Field label="Name" htmlFor="key-name">
              <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mobile app" required autoFocus />
            </Field>
            <DialogFooter>
              <Button type="submit" disabled={create.isPending || !name.trim()}>
                Create key
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={created !== null} onOpenChange={(o) => !o && setCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription className="flex items-start gap-2">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
              Copy it now — for security it is stored hashed and will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2 pl-3">
            <code className="flex-1 font-mono text-sm break-all">{created}</code>
            {created && <CopyButton value={created} />}
          </div>
          <DialogFooter>
            <Button onClick={() => setCreated(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
