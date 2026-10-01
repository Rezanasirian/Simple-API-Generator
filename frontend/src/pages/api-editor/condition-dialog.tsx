import { useState } from "react"

import { Field } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { CAST_TYPES, DATA_TYPES, OPERATORS, type ColumnInfo, type Condition, type Operator } from "@/lib/types"

export const OPERATOR_HELP: Record<Operator, string> = {
  "=": "equals",
  "!=": "does not equal",
  ">": "greater than",
  ">=": "greater than or equal",
  "<": "less than",
  "<=": "less than or equal",
  LIKE: "matches a pattern (% = anything, _ = one character)",
  "NOT LIKE": "does not match a pattern",
  CONTAINS: "contains the text (case-insensitive)",
  "STARTS WITH": "starts with the text (case-insensitive)",
  IN: "is one of a list (array or comma-separated)",
  "NOT IN": "is not one of a list",
  "IS NULL": "is empty — the parameter switches the filter on",
  "IS NOT NULL": "is not empty — the parameter switches the filter on",
}

export function emptyCondition(column = ""): Condition {
  return {
    parameter: toParam(column),
    display_name: "",
    description: "",
    category: "",
    column,
    operator: "=",
    data_type: "string",
    required: false,
    ignore_if: null,
    validation: {},
    column_transform: {},
  }
}

export function toParam(s: string) {
  const p = s
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return /^[0-9]/.test(p) ? `p_${p}` : p
}

function guessType(t: string | undefined): Condition["data_type"] {
  const s = (t ?? "").toLowerCase()
  if (/int|long/.test(s)) return "integer"
  if (/float|double|decimal|numeric|real/.test(s)) return "number"
  if (/bool/.test(s)) return "boolean"
  if (/date|time/.test(s)) return "date"
  return "string"
}

const num = (v: string) => (v === "" ? null : Number(v))

export function ConditionDialog({
  open,
  onOpenChange,
  initial,
  isNew,
  columns,
  isSql,
  takenParams,
  onSave,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  initial: Condition
  isNew: boolean
  columns: ColumnInfo[]
  isSql: boolean
  takenParams: string[]
  onSave: (c: Condition) => void
}) {
  const [c, setC] = useState<Condition>(initial)
  const [paramTouched, setParamTouched] = useState(!isNew)
  const set = (patch: Partial<Condition>) => setC((prev) => ({ ...prev, ...patch }))
  const setValidation = (patch: Partial<Condition["validation"]>) => set({ validation: { ...c.validation, ...patch } })
  const setTransform = (patch: Partial<Condition["column_transform"]>) =>
    set({ column_transform: { ...c.column_transform, ...patch } })

  const paramError = !/^[A-Za-z_][A-Za-z0-9_]*$/.test(c.parameter)
    ? "Letters, numbers and _; cannot start with a number"
    : takenParams.includes(c.parameter)
      ? "Another filter already uses this name"
      : ["limit", "offset", "order_by", "order_direction", "debug"].includes(c.parameter)
        ? "This name is reserved for paging"
        : undefined
  const isNumeric = c.data_type === "integer" || c.data_type === "number"
  const isNullOp = c.operator === "IS NULL" || c.operator === "IS NOT NULL"
  const t = c.column_transform

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (paramError || !c.column) return
            onSave(c)
          }}
        >
          <DialogHeader>
            <DialogTitle>{isNew ? "Add filter" : "Edit filter"}</DialogTitle>
            <DialogDescription>A request parameter that narrows down the rows the API returns.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <Field label="Column" htmlFor="c-column">
              <Input
                id="c-column"
                list="c-columns"
                value={c.column}
                autoFocus
                required
                onChange={(e) => {
                  const column = e.target.value
                  const info = columns.find((col) => col.name === column)
                  set({
                    column,
                    ...(paramTouched ? {} : { parameter: toParam(column) }),
                    ...(info ? { data_type: guessType(info.type) } : {}),
                  })
                }}
              />
              <datalist id="c-columns">
                {columns.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.type}
                  </option>
                ))}
              </datalist>
            </Field>
            <Field label="Operator">
              <Select value={c.operator} onValueChange={(v) => set({ operator: v as Operator })}>
                <SelectTrigger className="sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op} value={op}>
                      <span className="font-mono">{op}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Request parameter" htmlFor="c-param" error={c.parameter ? paramError : undefined}>
              <Input
                id="c-param"
                value={c.parameter}
                className="font-mono"
                required
                onChange={(e) => {
                  setParamTouched(true)
                  set({ parameter: e.target.value })
                }}
              />
            </Field>
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">
            Rows where <span className="font-mono text-foreground">{c.column || "column"}</span> {OPERATOR_HELP[c.operator]}
            {!isNullOp && (
              <>
                {" "}
                <span className="font-mono text-foreground">{c.parameter || "parameter"}</span>
              </>
            )}
            .
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Value type">
              <Select value={c.data_type} onValueChange={(v) => set({ data_type: v as Condition["data_type"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_TYPES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Skip filter when value is" htmlFor="c-ignore" hint='e.g. "All" or "-1"'>
              <Input
                id="c-ignore"
                value={c.ignore_if ?? ""}
                onChange={(e) => set({ ignore_if: e.target.value === "" ? null : e.target.value })}
              />
            </Field>
            <Field label="Required">
              <label className="flex h-9 items-center gap-3 text-sm">
                <Switch checked={c.required} onCheckedChange={(required) => set({ required })} />
                {c.required ? "Callers must send it" : "Optional"}
              </label>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label" htmlFor="c-label">
              <Input id="c-label" value={c.display_name} onChange={(e) => set({ display_name: e.target.value })} placeholder="Founded year" />
            </Field>
            <Field label="Group" htmlFor="c-cat" hint="Optional, for organising many filters">
              <Input id="c-cat" value={c.category} onChange={(e) => set({ category: e.target.value })} />
            </Field>
            <Field label="Description" htmlFor="c-desc" className="sm:col-span-2" hint="Shown in the API documentation">
              <Textarea id="c-desc" value={c.description} rows={2} onChange={(e) => set({ description: e.target.value })} />
            </Field>
          </div>

          {!isNullOp && (
            <details className="rounded-lg border p-4 [&_summary]:cursor-pointer" open={Object.values(c.validation).some((v) => v != null && v !== "")}>
              <summary className="text-sm font-medium">Validation</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {isNumeric ? (
                  <>
                    <Field label="Minimum" htmlFor="v-min">
                      <Input id="v-min" type="number" value={c.validation.min ?? ""} onChange={(e) => setValidation({ min: num(e.target.value) })} />
                    </Field>
                    <Field label="Maximum" htmlFor="v-max">
                      <Input id="v-max" type="number" value={c.validation.max ?? ""} onChange={(e) => setValidation({ max: num(e.target.value) })} />
                    </Field>
                  </>
                ) : c.data_type === "string" ? (
                  <>
                    <Field label="Min length" htmlFor="v-minl">
                      <Input id="v-minl" type="number" min={0} value={c.validation.min_length ?? ""} onChange={(e) => setValidation({ min_length: num(e.target.value) })} />
                    </Field>
                    <Field label="Max length" htmlFor="v-maxl">
                      <Input id="v-maxl" type="number" min={0} value={c.validation.max_length ?? ""} onChange={(e) => setValidation({ max_length: num(e.target.value) })} />
                    </Field>
                    <Field label="Pattern (regex)" htmlFor="v-pat" className="sm:col-span-2" hint="The whole value must match, e.g. [A-Z]{3}\d+">
                      <Input id="v-pat" className="font-mono" value={c.validation.pattern ?? ""} onChange={(e) => setValidation({ pattern: e.target.value || null })} />
                    </Field>
                  </>
                ) : null}
                <Field label="Allowed values" htmlFor="v-allowed" className="sm:col-span-2" hint="Comma-separated; leave empty to allow anything">
                  <Input
                    id="v-allowed"
                    value={(c.validation.allowed_values ?? []).join(", ")}
                    onChange={(e) => {
                      const values = e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                      setValidation({ allowed_values: values.length ? values : null })
                    }}
                  />
                </Field>
              </div>
            </details>
          )}

          {isSql && (
            <details className="rounded-lg border p-4 [&_summary]:cursor-pointer" open={Boolean(t.cast || t.substring || t.trim || t.replace)}>
              <summary className="text-sm font-medium">Transform the column before comparing (SQL)</summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Cast to">
                  <Select value={t.cast ?? "none"} onValueChange={(v) => setTransform({ cast: v === "none" ? null : (v as (typeof CAST_TYPES)[number]) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No cast</SelectItem>
                      {CAST_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {ct}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Trim spaces">
                  <label className="flex h-9 items-center gap-3 text-sm">
                    <Switch checked={!!t.trim} onCheckedChange={(trim) => setTransform({ trim })} />
                    TRIM(column)
                  </label>
                </Field>
                <Field label="Substring (start, length)" hint="1-based, like SQL">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="start"
                      value={t.substring?.[0] ?? ""}
                      onChange={(e) =>
                        setTransform({ substring: e.target.value ? [Number(e.target.value), t.substring?.[1] ?? 1] : null })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="length"
                      value={t.substring?.[1] ?? ""}
                      disabled={!t.substring}
                      onChange={(e) => t.substring && setTransform({ substring: [t.substring[0], Number(e.target.value)] })}
                    />
                  </div>
                </Field>
                <Field label="Replace (text, with)">
                  <div className="flex gap-2">
                    <Input
                      placeholder="text"
                      value={t.replace?.[0] ?? ""}
                      onChange={(e) => setTransform({ replace: e.target.value ? [e.target.value, t.replace?.[1] ?? ""] : null })}
                    />
                    <Input
                      placeholder="with"
                      value={t.replace?.[1] ?? ""}
                      disabled={!t.replace}
                      onChange={(e) => t.replace && setTransform({ replace: [t.replace[0], e.target.value] })}
                    />
                  </div>
                </Field>
              </div>
            </details>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!!paramError || !c.column}>
              {isNew ? "Add filter" : "Save filter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
