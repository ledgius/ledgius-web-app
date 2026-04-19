import { useState, useRef, useCallback, useEffect } from "react"
import { X, GripVertical, ChevronRight, Check, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react"
import { Button, Combobox } from "@/components/primitives"
import { cn } from "@/shared/lib/utils"
import { useReconRules, type ReconRule } from "../hooks/useReconciliation"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useTaxCodes } from "@/domains/taxcode/hooks/useTaxCodes"
import { useCustomers, useVendors } from "@/domains/contact/hooks/useContacts"
import { useFeedback } from "@/components/feedback"
import { api } from "@/shared/lib/api"
import { useQueryClient } from "@tanstack/react-query"

interface RulesDrawerProps {
  open: boolean
  onClose: () => void
}

export function RulesDrawer({ open, onClose }: RulesDrawerProps) {
  const { data: rulesData, isLoading } = useReconRules()
  const rules = (rulesData ?? []) as ReconRule[]
  const sortedRules = [...rules].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))

  const { data: accounts } = useAccounts()
  const { data: taxCodes } = useTaxCodes("AU")
  const { data: customers } = useCustomers()
  const { data: vendors } = useVendors()
  const feedback = useFeedback()
  const qc = useQueryClient()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const dragItemRef = useRef<number | null>(null)

  const allAccounts = accounts ?? []
  const categoryAccountOptions = allAccounts
    .filter((a) => a.category === "I" || a.category === "E")
    .map((a) => ({ value: a.id, label: `${a.accno} — ${a.description ?? ""}`, detail: a.category === "I" ? "Income" : "Expense" }))
  const taxCodeOptions = (taxCodes ?? []).map((tc) => ({ value: tc.id, label: `${tc.code} — ${tc.name}`, detail: `${tc.rate}%` }))
  const contactOptions = [
    ...(customers ?? []).map((c) => ({ value: c.id, label: c.name })),
    ...(vendors ?? []).map((v) => ({ value: v.id, label: v.name })),
  ]

  const handleDragStart = (ruleId: number) => {
    dragItemRef.current = ruleId
  }

  const handleDragOver = (e: React.DragEvent, ruleId: number) => {
    e.preventDefault()
    setDragOverId(ruleId)
  }

  const handleDrop = useCallback(async (targetId: number) => {
    const dragId = dragItemRef.current
    dragItemRef.current = null
    setDragOverId(null)
    if (!dragId || dragId === targetId) return

    const dragIdx = sortedRules.findIndex((r) => r.id === dragId)
    const targetIdx = sortedRules.findIndex((r) => r.id === targetId)
    if (dragIdx === -1 || targetIdx === -1) return

    // Reorder: assign new priorities
    const reordered = [...sortedRules]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(targetIdx, 0, moved)

    // Save new priorities
    try {
      await Promise.all(
        reordered.map((r, i) =>
          api.put(`/bank-reconciliation/rules/${r.id}`, { ...r, priority: i })
        )
      )
      qc.invalidateQueries({ queryKey: ["reconciliation"] })
      feedback.success("Rule priority updated")
    } catch {
      feedback.error("Failed to update priority")
    }
  }, [sortedRules, qc, feedback])

  const handleToggleEnabled = useCallback(async (rule: ReconRule) => {
    try {
      if (rule.disabled) {
        // Enable: use the enabled endpoint or update
        await api.put(`/bank-reconciliation/rules/${rule.id}`, { ...rule, disabled: false })
      } else {
        await api.patch(`/bank-reconciliation/rules/${rule.id}/disable`, {})
      }
      qc.invalidateQueries({ queryKey: ["reconciliation"] })
    } catch {
      feedback.error("Failed to toggle rule")
    }
  }, [qc, feedback])

  const handleDelete = useCallback(async (ruleId: number) => {
    try {
      await api.delete(`/bank-reconciliation/rules/${ruleId}`)
      qc.invalidateQueries({ queryKey: ["reconciliation"] })
      feedback.success("Rule deleted")
      if (editingId === ruleId) setEditingId(null)
    } catch {
      feedback.error("Failed to delete rule")
    }
  }, [qc, feedback, editingId])

  // Resizable width
  const [width, setWidth] = useState(420)
  const resizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(420)

  useEffect(() => {
    if (!open) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return
      const delta = startX.current - e.clientX
      setWidth(Math.max(300, Math.min(600, startWidth.current + delta)))
    }
    const handleMouseUp = () => { resizing.current = false }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="flex shrink-0 h-full" style={{ width }}>
      {/* Resize handle */}
      <div
        className="w-2 cursor-col-resize bg-gray-200 hover:bg-primary-300 active:bg-primary-400 transition-colors shrink-0 flex items-center justify-center"
        onMouseDown={(e) => {
          e.preventDefault()
          resizing.current = true
          startX.current = e.clientX
          startWidth.current = width
        }}
        title="Drag to resize"
      >
        <div className="w-0.5 h-8 bg-gray-400 rounded-full" />
      </div>

      {/* Drawer content */}
      <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Allocation Rules</h2>
            <p className="text-xs text-gray-400 mt-0.5">Drag to reorder priority</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Rules list */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-8">Loading rules...</p>
          ) : sortedRules.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No rules yet — create one from the Allocation Rule tab.</p>
          ) : (
            sortedRules.map((rule, idx) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={idx}
                isEditing={editingId === rule.id}
                isDragOver={dragOverId === rule.id}
                categoryAccountOptions={categoryAccountOptions}
                taxCodeOptions={taxCodeOptions}
                contactOptions={contactOptions}
                onEdit={() => setEditingId(editingId === rule.id ? null : rule.id)}
                onToggleEnabled={() => handleToggleEnabled(rule)}
                onDelete={() => handleDelete(rule.id)}
                onDragStart={() => handleDragStart(rule.id)}
                onDragOver={(e) => handleDragOver(e, rule.id)}
                onDrop={() => handleDrop(rule.id)}
                onDragEnd={() => setDragOverId(null)}
                onSave={async (updates) => {
                  try {
                    await api.put(`/bank-reconciliation/rules/${rule.id}`, { ...rule, ...updates })
                    qc.invalidateQueries({ queryKey: ["reconciliation"] })
                    feedback.success("Rule updated")
                    setEditingId(null)
                  } catch {
                    feedback.error("Failed to update rule")
                  }
                }}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-2 shrink-0">
          <p className="text-xs text-gray-400">{sortedRules.length} rule{sortedRules.length !== 1 ? "s" : ""} · {sortedRules.filter((r) => !r.disabled).length} enabled</p>
        </div>
      </div>
    </div>
  )
}

// ── Rule Card ─────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  index,
  isEditing,
  isDragOver,
  categoryAccountOptions,
  taxCodeOptions,
  contactOptions,
  onEdit,
  onToggleEnabled,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onSave,
}: {
  rule: ReconRule
  index: number
  isEditing: boolean
  isDragOver: boolean
  categoryAccountOptions: Array<{ value: number; label: string; detail?: string }>
  taxCodeOptions: Array<{ value: number; label: string; detail?: string }>
  contactOptions: Array<{ value: number; label: string }>
  onEdit: () => void
  onToggleEnabled: () => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
  onSave: (updates: Partial<ReconRule>) => void
}) {
  const [editName, setEditName] = useState(rule.name)
  const [editPattern, setEditPattern] = useState(rule.match_pattern)
  const [editMatchType, setEditMatchType] = useState(rule.match_type)
  const [editAccountId, setEditAccountId] = useState<number | null>(rule.default_account_id)
  const [editTaxCodeId, setEditTaxCodeId] = useState<number | null>(rule.default_tax_code_id)
  const [editContactId, setEditContactId] = useState<number | null>(rule.default_contact_id)
  const amountVal = rule.amount_match_value
  const [editAmountType, setEditAmountType] = useState<string>(rule.amount_match_type ?? "any")
  const [editAmountValue, setEditAmountValue] = useState(() => {
    if (!amountVal) return ""
    if (amountVal.value != null) return String(amountVal.value)
    if (amountVal.entries) return (amountVal.entries as Array<{ min: number; max: number }>).map((e) => e.min === e.max ? String(e.min) : `${e.min}-${e.max}`).join(", ")
    if (amountVal.min != null) return `${amountVal.min}-${amountVal.max}`
    return ""
  })

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "border rounded-lg bg-white transition-all",
        isDragOver ? "border-primary-400 shadow-md" : "border-gray-200",
        rule.disabled && "opacity-50"
      )}
    >
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical className="h-4 w-4 text-gray-300 cursor-grab shrink-0" />
        <span className="text-xs text-gray-400 font-mono w-5 shrink-0">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">{rule.name}</span>
            <span className="text-xs text-gray-400 font-mono">({rule.match_type})</span>
          </div>
          <p className="text-xs text-gray-500 truncate font-mono">{rule.match_pattern}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs tabular-nums text-gray-400" title="Times used">{rule.use_count}×</span>
          <button
            type="button"
            onClick={onToggleEnabled}
            className="p-1 rounded text-gray-400 hover:text-primary-500 transition-colors"
            title={rule.disabled ? "Enable rule" : "Disable rule"}
          >
            {rule.disabled ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4 text-green-500" />}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded text-gray-400 hover:text-primary-500 transition-colors"
            title="Edit rule"
          >
            {isEditing ? <ChevronRight className="h-4 w-4 rotate-90" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
            title="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Default allocation preview */}
      <div className="flex items-center gap-3 px-3 pb-2 text-xs text-gray-500">
        <span>→ {categoryAccountOptions.find((a) => a.value === rule.default_account_id)?.label ?? "No account"}</span>
        <span>· {taxCodeOptions.find((t) => t.value === rule.default_tax_code_id)?.label ?? "No tax"}</span>
      </div>

      {/* Edit panel */}
      {isEditing && (
        <div className="border-t border-gray-100 px-3 py-3 space-y-2 bg-gray-50">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Rule name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Match pattern</label>
              <input
                type="text"
                value={editPattern}
                onChange={(e) => setEditPattern(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={editMatchType}
                onChange={(e) => setEditMatchType(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="contains">Contains</option>
                <option value="exact">Exact</option>
                <option value="wildcard">Wildcard</option>
              </select>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <select
                value={editAmountType}
                onChange={(e) => setEditAmountType(e.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="any">Any</option>
                <option value="exact">Exact</option>
                <option value="set">Set / Ranges</option>
                <option value="range">Range</option>
              </select>
            </div>
            {editAmountType !== "any" && (
              <input
                type="text"
                value={editAmountValue}
                onChange={(e) => setEditAmountValue(e.target.value)}
                className="flex-1 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={editAmountType === "exact" ? "100.00" : editAmountType === "set" ? "38-42, 50, 68-70" : "40-500"}
              />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
              <Combobox
                options={categoryAccountOptions}
                value={editAccountId}
                onChange={(v) => setEditAccountId(v ? Number(v) : null)}
                placeholder="Account..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tax code</label>
              <Combobox
                options={taxCodeOptions}
                value={editTaxCodeId}
                onChange={(v) => setEditTaxCodeId(v ? Number(v) : null)}
                placeholder="Tax..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact</label>
              <Combobox
                options={contactOptions}
                value={editContactId}
                onChange={(v) => setEditContactId(v ? Number(v) : null)}
                placeholder="Contact..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={onEdit}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSave({
                name: editName,
                match_pattern: editPattern,
                match_type: editMatchType,
                default_account_id: editAccountId,
                default_tax_code_id: editTaxCodeId,
                default_contact_id: editContactId,
              })}
            >
              <Check className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
