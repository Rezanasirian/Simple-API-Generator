import { useState } from "react"

import { Field } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TRANSFORM_TYPES, type ResponseTransform, type TransformType } from "@/lib/types"

export const TRANSFORM_LABELS: Record<TransformType, string> = {
  template: "Template — combine fields and text",
  concat: "Join fields with a separator",
  upper: "UPPERCASE a field",
  lower: "lowercase a field",
  trim: "Trim spaces",
  substring: "Part of a field",
  replace: "Replace text",
  copy: "Copy a field (rename)",
}

export function describeTransform(t: ResponseTransform) {
  switch (t.type) {
    case "template":
      return t.template ?? ""
    case "concat":
      return t.sources.join(` ${JSON.stringify(t.separator ?? "")} `)
    case "substring":
      return `${t.sources[0]}[${t.start}, ${t.length}]`
    case "replace":
      return `${t.sources[0]}: "${t.old}" → "${t.new ?? ""}"`
    default:
      return `${t.type}(${t.sources[0] ?? ""})`
  }
}

export function TransformDialog({
  open,
  onOpenChange,
  initial,
  isNew,
  columns,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: ResponseTransform
  isNew: boolean
  columns: string[]
  onSave: (t: ResponseTransform) => void
}) {
  const [t, setT] = useState<ResponseTransform>(initial)
  const set = (patch: Partial<ResponseTransform>) => setT((prev) => ({ ...prev, ...patch }))
  const single = !["template", "concat"].includes(t.type)

  const valid =
    /^\w[\w .-]*$/.test(t.target) &&
    (t.type === "template" ? !!t.template : t.sources.length > 0) &&
    (t.type !== "substring" || (t.start != null && t.length != null)) &&
    (t.type !== "replace" || !!t.old)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) onSave(t)
          }}
        >
          <DialogHeader>
            <DialogTitle>{isNew ? "Add computed field" : "Edit computed field"}</DialogTitle>
            <DialogDescription>A new field calculated for every row in the response.</DialogDescription>
          </DialogHeader>
          <Field label="Field name" htmlFor="t-target">
            <Input id="t-target" value={t.target} onChange={(e) => set({ target: e.target.value })} placeholder="founded_date" required autoFocus />
          </Field>
          <Field label="Calculation">
            <Select value={t.type} onValueChange={(v) => set({ type: v as TransformType })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSFORM_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TRANSFORM_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <datalist id="t-columns">
            {columns.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          {t.type === "template" ? (
            <Field label="Template" htmlFor="t-template" hint="Put field names in braces, e.g. {founded_year}-{founded_month}-01">
              <Input id="t-template" className="font-mono" value={t.template ?? ""} onChange={(e) => set({ template: e.target.value })} />
            </Field>
          ) : single ? (
            <Field label="Source field" htmlFor="t-src">
              <Input id="t-src" list="t-columns" value={t.sources[0] ?? ""} onChange={(e) => set({ sources: e.target.value ? [e.target.value] : [] })} />
            </Field>
          ) : (
            <>
              <Field label="Fields to join" htmlFor="t-srcs" hint="Comma-separated, in order">
                <Input
                  id="t-srcs"
                  value={t.sources.join(", ")}
                  onChange={(e) => set({ sources: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                />
              </Field>
              <Field label="Separator" htmlFor="t-sep">
                <Input id="t-sep" value={t.separator ?? ""} onChange={(e) => set({ separator: e.target.value })} placeholder='e.g. " - "' />
              </Field>
            </>
          )}

          {t.type === "substring" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start (1 = first character)" htmlFor="t-start">
                <Input id="t-start" type="number" min={1} value={t.start ?? ""} onChange={(e) => set({ start: e.target.value ? Number(e.target.value) : null })} />
              </Field>
              <Field label="Length" htmlFor="t-len">
                <Input id="t-len" type="number" min={0} value={t.length ?? ""} onChange={(e) => set({ length: e.target.value ? Number(e.target.value) : null })} />
              </Field>
            </div>
          )}
          {t.type === "replace" && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Find" htmlFor="t-old">
                <Input id="t-old" value={t.old ?? ""} onChange={(e) => set({ old: e.target.value })} />
              </Field>
              <Field label="Replace with" htmlFor="t-new">
                <Input id="t-new" value={t.new ?? ""} onChange={(e) => set({ new: e.target.value })} />
              </Field>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
