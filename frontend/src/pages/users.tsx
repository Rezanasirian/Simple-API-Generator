import { useState } from "react"
import { Navigate } from "react-router"
import { KeySquareIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { ConfirmButton, Field, PageHeader, formatDate } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/hooks/use-auth"
import { api } from "@/lib/api"
import { keys, useAction, useUsers } from "@/lib/queries"
import type { Role, User } from "@/lib/types"

function UserDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  user: User | null
}) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("user")

  const save = useAction(
    () =>
      user
        ? api.patch(`/users/${user.id}`, { password })
        : api.post("/users", { username, password, role }),
    {
      invalidate: [keys.users],
      success: user ? "Password reset" : "User created",
      onSuccess: () => {
        onOpenChange(false)
        setUsername("")
        setPassword("")
        setRole("user")
      },
    },
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate(undefined)
          }}
        >
          <DialogHeader>
            <DialogTitle>{user ? `Reset password for ${user.username}` : "New user"}</DialogTitle>
            <DialogDescription>
              {user ? "They will need the new password to sign in." : "Admins can also manage users and data sources."}
            </DialogDescription>
          </DialogHeader>
          {!user && (
            <Field label="Username" htmlFor="u-name" hint="Letters, numbers, . - _ @">
              <Input id="u-name" value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} required autoFocus />
            </Field>
          )}
          <Field label="Password" htmlFor="u-pass" hint="At least 8 characters">
            <Input id="u-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} required autoComplete="new-password" />
          </Field>
          {!user && (
            <Field label="Role">
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User — build and use APIs</SelectItem>
                  <SelectItem value="admin">Admin — everything, incl. users and data sources</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {user ? "Reset password" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function UsersPage() {
  const { user: me } = useAuth()
  const { data, isLoading } = useUsers()
  const [dialog, setDialog] = useState<{ open: boolean; user: User | null }>({ open: false, user: null })

  const update = useAction(({ id, ...body }: { id: number; role?: Role; is_active?: boolean }) => api.patch(`/users/${id}`, body), {
    invalidate: [keys.users],
  })
  const remove = useAction((id: number) => api.del(`/users/${id}`), { invalidate: [keys.users], success: "User deleted" })

  if (me?.role !== "admin") return <Navigate to="/" replace />

  return (
    <>
      <PageHeader
        title="Users"
        description="Who can sign in to the panel"
        actions={
          <Button onClick={() => setDialog({ open: true, user: null })}>
            <PlusIcon /> New user
          </Button>
        }
      />
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.username}
                    {u.id === me.id && (
                      <Badge variant="outline" className="ml-2">
                        you
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(role) => update.mutate({ id: u.id, role: role as Role })}>
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.is_active}
                      disabled={u.id === me.id}
                      onCheckedChange={(is_active) => update.mutate({ id: u.id, is_active })}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" aria-label="Reset password" onClick={() => setDialog({ open: true, user: u })}>
                      <KeySquareIcon />
                    </Button>
                    {u.id !== me.id && (
                      <ConfirmButton title={`Delete ${u.username}?`} description="Their API keys are revoked too." onConfirm={() => remove.mutate(u.id)}>
                        <Button variant="ghost" size="icon-sm" aria-label="Delete" className="text-muted-foreground hover:text-destructive">
                          <Trash2Icon />
                        </Button>
                      </ConfirmButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <UserDialog open={dialog.open} user={dialog.user} onOpenChange={(open) => setDialog((d) => ({ ...d, open }))} />
    </>
  )
}
