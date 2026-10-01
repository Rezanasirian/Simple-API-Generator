import { useState } from "react"

import { Field } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { useAction } from "@/lib/queries"

export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const mismatch = confirm.length > 0 && next !== confirm

  const change = useAction(() => api.post("/auth/change-password", { current_password: current, new_password: next }), {
    success: "Password changed",
    onSuccess: () => {
      onOpenChange(false)
      setCurrent("")
      setNext("")
      setConfirm("")
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            change.mutate(undefined)
          }}
        >
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Use at least 8 characters.</DialogDescription>
          </DialogHeader>
          <Field label="Current password" htmlFor="cp-current">
            <Input id="cp-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
          </Field>
          <Field label="New password" htmlFor="cp-new">
            <Input id="cp-new" type="password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} maxLength={72} required autoComplete="new-password" />
          </Field>
          <Field label="Confirm new password" htmlFor="cp-confirm" error={mismatch ? "Passwords do not match" : undefined}>
            <Input id="cp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={mismatch || change.isPending}>
              Change password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
