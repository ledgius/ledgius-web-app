// Spec references: R-0065 (Phase 1), A-0036
import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { Button, Combobox, Skeleton, InlineAlert, InfoPanel, StatBar, StatCell } from "@/components/primitives"
import { MoneyValue, DateValue, StatusPill } from "@/components/financial"
import { PageShell } from "@/components/layout"
import { useFeedback } from "@/components/feedback"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useTaxCodes } from "@/domains/taxcode/hooks/useTaxCodes"
import { useCustomers, useVendors } from "@/domains/contact/hooks/useContacts"
import { useImportBatches } from "@/domains/banking/hooks/useBanking"
import {
  useReconQueue,
  useReconSummary,
  useReconRules,
  useBulkAccept,
  useCreateFromLine,
  useApproveAllocations,
  type QueueItem,
  type QueueFilter,
  type QueueSort,
  type ReconRule,
} from "../hooks/useReconciliation"
import { RulesDrawer } from "../components/RulesDrawer"
import { cn } from "@/shared/lib/utils"
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  Search,
  X,
  Plus,
  ArrowUpDown,
  Landmark,
  Calendar,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

type SortColumn = "date" | "description" | "withdrawal" | "deposit" | "status"
type SortDirection = "asc" | "desc"
type FilterTab = "all" | "unallocated" | "proposed" | "approved"
type ActionTab = "rule" | "manual" | "link" | "transfer"

interface AllocationLine {
  id: string
  contactId: number | null
  description: string
  accountId: number | null
  taxCodeId: number | null
  amount: string
  mode: "amount" | "percent" | "remainder"
  percentage: string
}

// ── Status mapping (two-field model: workflow_status + allocation_method) ─────

function workflowStatus(item: { reconciliation_status?: string; workflow_status?: string }): string {
  // Prefer new workflow_status field, fall back to legacy reconciliation_status
  if (item.workflow_status) return item.workflow_status
  const s = item.reconciliation_status ?? ""
  switch (s) {
    case "imported": return "imported"
    case "unmatched": case "needs_review": case "exception": return "unallocated"
    case "suggested": case "auto_matched": case "manually_matched": return "proposed"
    case "resolved": case "approved": return "approved"
    default: return s || "imported"
  }
}

function statusLabel(ws: string): string {
  switch (ws) {
    case "imported": return "Imported"
    case "unallocated": return "Unallocated"
    case "proposed": return "Proposed"
    case "approved": return "Approved"
    default: return ws.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

function statusPillSemantic(ws: string): "muted" | "info" | "active" | "warning" | "success" | "danger" | "locked" {
  switch (ws) {
    case "imported": return "muted"
    case "unallocated": return "warning"
    case "proposed": return "info"
    case "approved": return "success"
    default: return "muted"
  }
}

// ── Sort logic ───────────────────────────────────────────────────────────────

function sortItems(
  items: QueueItem[],
  column: SortColumn,
  direction: SortDirection
): QueueItem[] {
  const sorted = [...items]
  const dir = direction === "asc" ? 1 : -1

  sorted.sort((a, b) => {
    switch (column) {
      case "date":
        return dir * a.trans_date.localeCompare(b.trans_date)
      case "description": {
        const descA = (a.normalized_description || a.description || "").toLowerCase()
        const descB = (b.normalized_description || b.description || "").toLowerCase()
        return dir * descA.localeCompare(descB)
      }
      case "withdrawal": {
        const wA = parseAmount(a.amount) < 0 ? Math.abs(parseAmount(a.amount)) : 0
        const wB = parseAmount(b.amount) < 0 ? Math.abs(parseAmount(b.amount)) : 0
        return dir * (wA - wB)
      }
      case "deposit": {
        const dA = parseAmount(a.amount) >= 0 ? parseAmount(a.amount) : 0
        const dB = parseAmount(b.amount) >= 0 ? parseAmount(b.amount) : 0
        return dir * (dA - dB)
      }
      case "status":
        return dir * statusLabel(a.reconciliation_status).localeCompare(statusLabel(b.reconciliation_status))
      default:
        return 0
    }
  })

  return sorted
}

function parseAmount(amount: number | string): number {
  return typeof amount === "number" ? amount : parseFloat(String(amount)) || 0
}

function nextId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function highlightMatch(text: string, pattern: string): React.ReactNode {
  if (!pattern) return text
  const idx = text.toLowerCase().indexOf(pattern.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-green-200 text-green-900 rounded-sm px-0.5">{text.slice(idx, idx + pattern.length)}</mark>
      {text.slice(idx + pattern.length)}
    </>
  )
}

/** Parse and validate a set/ranges input like "38-42, 50, 68-70".
 *  Returns sorted, non-overlapping entries or null if invalid. */
function parseAmountSetRanges(input: string): { entries: Array<{ min: number; max: number }>; error?: string } | null {
  if (!input.trim()) return null
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean)
  const entries: Array<{ min: number; max: number }> = []
  for (const part of parts) {
    if (part.includes("-")) {
      const [minStr, maxStr] = part.split("-").map((s) => s.trim())
      const min = parseFloat(minStr)
      const max = parseFloat(maxStr)
      if (isNaN(min) || isNaN(max)) return { entries: [], error: `Invalid range: ${part}` }
      if (min >= max) return { entries: [], error: `Range start must be less than end: ${part}` }
      entries.push({ min, max })
    } else {
      const val = parseFloat(part)
      if (isNaN(val)) return { entries: [], error: `Invalid value: ${part}` }
      entries.push({ min: val, max: val })
    }
  }
  // Sort by min
  entries.sort((a, b) => a.min - b.min)
  // Check overlaps
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].min <= entries[i - 1].max) {
      return { entries, error: `Overlapping ranges: ${entries[i - 1].min}-${entries[i - 1].max} and ${entries[i].min}-${entries[i].max}` }
    }
  }
  return { entries }
}

/** Format a set/ranges back to sorted string */
function formatAmountSetRanges(input: string): string {
  const result = parseAmountSetRanges(input)
  if (!result || result.error) return input
  return result.entries.map((e) => e.min === e.max ? String(e.min) : `${e.min}-${e.max}`).join(", ")
}

function testRulePattern(description: string, pattern: string, matchType: "contains" | "exact" | "wildcard"): boolean {
  if (!pattern || !description) return false
  const desc = description.toLowerCase()
  const pat = pattern.toLowerCase()
  if (matchType === "exact") return desc === pat
  if (matchType === "wildcard") {
    try { return new RegExp(pat, "i").test(description) } catch { return false }
  }
  return desc.includes(pat)
}

// ── Expansion Panel ──────────────────────────────────────────────────────────

function ExpansionPanel({
  item,
  accounts,
  taxCodes,
  contacts,
  bankAccounts,
  selectedAccountId,
  reconRules,
  initialTab,
  queueItems,
  onPatternChange,
  onAccountChange,
  onAmountFilterChange,
  onMatchTypeChange,
  onSave,
  onCancel,
  saving,
}: {
  item: QueueItem
  accounts: { id: number; accno: string; description: string | null; category: string }[]
  taxCodes: { id: number; code: string; name: string; rate: string }[]
  contacts: { id: number; name: string }[]
  bankAccounts: { id: number; accno: string; description: string | null }[]
  selectedAccountId: number
  reconRules: ReconRule[]
  initialTab?: ActionTab | null
  queueItems: QueueItem[]
  onPatternChange: (pattern: string) => void
  onAccountChange: (hasAccount: boolean) => void
  onAmountFilterChange: (filter: ((amount: number) => boolean) | null) => void
  onMatchTypeChange: (matchType: "contains" | "exact" | "wildcard") => void
  onSave: (lines: AllocationLine[], createRule: boolean) => void
  onCancel: () => void
  saving: boolean
}) {
  const amount = parseAmount(item.amount)
  const [lines, setLines] = useState<AllocationLine[]>(() => [
    {
      id: nextId(),
      contactId: null,
      description: item.normalized_description || item.description || "",
      accountId: null,
      taxCodeId: null,
      amount: Math.abs(amount).toFixed(2),
      mode: "amount",
      percentage: "100",
    },
  ])
  const [createRule, setCreateRule] = useState(false)
  const [auditExpanded, setAuditExpanded] = useState(false)

  // Rule editor state
  const [rulePattern, setRulePattern] = useState(item.normalized_description || item.description || "")
  const [ruleMatchType, setRuleMatchType] = useState<"contains" | "exact" | "wildcard">("contains")
  const [ruleAmountMatch, setRuleAmountMatch] = useState<"any" | "exact" | "range" | "set">("any")
  const [ruleAmountExact, setRuleAmountExact] = useState(Math.abs(amount).toFixed(2))
  const [ruleAmountSet, setRuleAmountSet] = useState("")
  const [ruleAmountMin, setRuleAmountMin] = useState("")
  const [ruleAmountMax, setRuleAmountMax] = useState("")

  // Match count for the rule preview
  const unallocatedItems = useMemo(() =>
    queueItems.filter((q) => {
      const ws = workflowStatus(q)
      return ws === "imported" || ws === "unallocated"
    }),
  [queueItems])
  const unallocatedCount = unallocatedItems.length
  // Build the current amount filter function for match counting
  const amountFilter = useMemo((): ((a: number) => boolean) | null => {
    if (ruleAmountMatch === "any") return null
    if (ruleAmountMatch === "exact") {
      const v = parseFloat(ruleAmountExact)
      return isNaN(v) ? null : (a) => Math.abs(a - v) < 0.01
    }
    if (ruleAmountMatch === "range") {
      const min = parseFloat(ruleAmountMin), max = parseFloat(ruleAmountMax)
      return (isNaN(min) || isNaN(max)) ? null : (a) => a >= min && a <= max
    }
    if (ruleAmountMatch === "set") {
      const parsed = parseAmountSetRanges(ruleAmountSet)
      if (!parsed || parsed.error || parsed.entries.length === 0) return null
      const entries = parsed.entries
      return (a) => entries.some((e) => a >= e.min && a <= e.max)
    }
    return null
  }, [ruleAmountMatch, ruleAmountExact, ruleAmountSet, ruleAmountMin, ruleAmountMax])

  const ruleMatchCount = useMemo(() => {
    if (!rulePattern) return 0
    return unallocatedItems.filter((q) => {
      const desc = q.normalized_description || q.description || ""
      if (!testRulePattern(desc, rulePattern, ruleMatchType)) return false
      if (amountFilter && !amountFilter(Math.abs(parseAmount(q.amount)))) return false
      return true
    }).length
  }, [rulePattern, ruleMatchType, amountFilter, unallocatedItems])

  // Find auto-matched recon rule
  const matchedRule = useMemo(() => {
    if (!item.description) return null
    const desc = item.description.toLowerCase()
    return reconRules.find((r) => {
      if (r.disabled) return false
      const pat = r.match_pattern?.toLowerCase()
      if (!pat) return false
      if (r.match_type === "exact") return desc === pat
      if (r.match_type === "wildcard") {
        try { return new RegExp(pat, "i").test(desc) } catch { return false }
      }
      return desc.includes(pat) // "contains" default
    }) ?? null
  }, [item.description, reconRules])

  // Default tab: use initialTab if provided, otherwise manual allocation
  const startTab = initialTab ?? "manual"
  const [actionTab, setActionTab] = useState<ActionTab>(startTab)

  // Fire initial pattern preview if starting on rule tab
  useEffect(() => {
    if (startTab === "rule") {
      onPatternChange(rulePattern)
      onMatchTypeChange(ruleMatchType)
    }
    return () => { onPatternChange("") }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Propagate amount filter for rule preview
  useEffect(() => {
    if (actionTab !== "rule" || ruleAmountMatch === "any") {
      onAmountFilterChange(null)
      return
    }
    if (ruleAmountMatch === "exact") {
      const v = parseFloat(ruleAmountExact)
      if (!isNaN(v)) onAmountFilterChange((a) => Math.abs(a - v) < 0.01)
      else onAmountFilterChange(null)
    } else if (ruleAmountMatch === "range") {
      const min = parseFloat(ruleAmountMin)
      const max = parseFloat(ruleAmountMax)
      if (!isNaN(min) && !isNaN(max)) onAmountFilterChange((a) => a >= min && a <= max)
      else onAmountFilterChange(null)
    } else if (ruleAmountMatch === "set") {
      const parsed = parseAmountSetRanges(ruleAmountSet)
      if (parsed && !parsed.error && parsed.entries.length > 0) {
        const entries = parsed.entries
        onAmountFilterChange((a) => entries.some((e) => a >= e.min && a <= e.max))
      } else {
        onAmountFilterChange(null)
      }
    }
  }, [actionTab, ruleAmountMatch, ruleAmountExact, ruleAmountSet, ruleAmountMin, ruleAmountMax, onAmountFilterChange])

  const switchTab = useCallback((tab: ActionTab) => {
    setActionTab(tab)
    if (tab === "rule") {
      onPatternChange(rulePattern)
      onMatchTypeChange(ruleMatchType)
    } else {
      onPatternChange("")
    }
  }, [rulePattern, ruleMatchType, onPatternChange, onMatchTypeChange])

  // Apply matched rule defaults to first allocation line on mount
  useEffect(() => {
    if (!matchedRule) return
    setLines((prev) => {
      const first = prev[0]
      if (!first || first.accountId) return prev // already set
      return [
        {
          ...first,
          accountId: matchedRule.default_account_id ?? null,
          taxCodeId: matchedRule.default_tax_code_id ?? null,
          contactId: matchedRule.default_contact_id ?? null,
        },
        ...prev.slice(1),
      ]
    })
  }, [matchedRule])


  // Account options for the Combobox (exclude bank accounts from categories)
  const categoryAccountOptions = useMemo(() => {
    return accounts
      .filter((a) => a.category === "I" || a.category === "E")
      .map((a) => ({
        value: a.id,
        label: `${a.accno} — ${a.description ?? ""}`,
        detail: a.category === "I" ? "Income" : "Expense",
      }))
  }, [accounts])

  const taxCodeOptions = useMemo(() => {
    return taxCodes.map((tc) => ({
      value: tc.id,
      label: `${tc.code} — ${tc.name}`,
      detail: `${tc.rate}%`,
    }))
  }, [taxCodes])

  const contactOptions = useMemo(() => {
    return contacts.map((c) => ({
      value: c.id,
      label: c.name,
    }))
  }, [contacts])

  const bankAccountOptions = useMemo(() => {
    return bankAccounts
      .filter((a) => a.id !== selectedAccountId)
      .map((a) => ({
        value: a.id,
        label: `${a.accno} — ${a.description ?? ""}`,
      }))
  }, [bankAccounts, selectedAccountId])

  const updateLine = (lineId: string, field: keyof AllocationLine, value: unknown) => {
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, [field]: value } : l))
    )
  }

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: nextId(),
        contactId: null,
        description: "",
        accountId: null,
        taxCodeId: null,
        amount: "",
        mode: "amount",
        percentage: "",
      },
    ])
  }

  const removeLine = (lineId: string) => {
    if (lines.length <= 1) return
    setLines((prev) => prev.filter((l) => l.id !== lineId))
  }

  const subtotal = lines.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0)
  const outOfBalance = Math.abs(amount) - subtotal
  const isBalanced = Math.abs(outOfBalance) < 0.01
  const canSave = lines.every((l) => l.accountId && l.taxCodeId && parseFloat(l.amount) > 0) && isBalanced

  return (
    <tr>
      <td colSpan={10} className="p-0">
        <div className="border-t border-b-2 border-gray-200 bg-gray-50 px-6 py-3 space-y-3">

          {/* Tab buttons + Cancel/Save */}
          <div className="flex items-center gap-1">
            {([
              { key: "manual" as ActionTab, label: "Manual Allocation" },
              { key: "rule" as ActionTab, label: "Allocation Rule", badge: matchedRule ? "1" : undefined },
              { key: "link" as ActionTab, label: "Link Existing" },
              { key: "transfer" as ActionTab, label: "Transfer Money" },
            ]).map((tab) => (
              <button
                key={tab.key}
                type="button"
                data-guide-target={`tab-${tab.key}`}
                onClick={() => switchTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                  actionTab === tab.key
                    ? "bg-gray-700 text-white border-gray-700"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                )}
              >
                {tab.label}
                {tab.badge && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-green-500 text-white text-[10px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
            <div className="flex-1" />
            <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!canSave || saving}
              loading={saving}
              onClick={() => onSave(lines, actionTab === "rule")}
            >
              Save
            </Button>
          </div>

          {/* ── Tab: Allocation Rule ─────────────────────────────────────── */}
          {actionTab === "rule" && (
            <div className="space-y-2">
              {/* Rule pattern editor */}
              <div className="border border-gray-200 rounded-lg bg-white px-4 py-3 space-y-2">
                {/* Row 1: Pattern + type + amount — all on one line */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Match pattern
                      {rulePattern && (
                        <span className="ml-2 font-normal normal-case tracking-normal text-green-600">
                          — matches {ruleMatchCount} of {unallocatedCount} unallocated
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={rulePattern}
                      onChange={(e) => { setRulePattern(e.target.value); onPatternChange(e.target.value) }}
                      className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Transaction description pattern..."
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select
                      value={ruleMatchType}
                      onChange={(e) => { const v = e.target.value as "contains" | "exact" | "wildcard"; setRuleMatchType(v); onMatchTypeChange(v) }}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="contains">Contains</option>
                      <option value="exact">Exact</option>
                      <option value="wildcard">Wildcard</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
                      <select
                        value={ruleAmountMatch}
                        onChange={(e) => setRuleAmountMatch(e.target.value as "any" | "exact" | "range" | "set")}
                        className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="any">Any</option>
                        <option value="exact">Exact</option>
                        <option value="set">Set / Ranges</option>
                        <option value="range">Range</option>
                      </select>
                    </div>
                    {ruleAmountMatch === "exact" && (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={ruleAmountExact}
                        onChange={(e) => setRuleAmountExact(e.target.value)}
                        className="w-24 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="0.00"
                      />
                    )}
                    {ruleAmountMatch === "set" && (() => {
                      const parsed = ruleAmountSet ? parseAmountSetRanges(ruleAmountSet) : null
                      return (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={ruleAmountSet}
                            onChange={(e) => setRuleAmountSet(e.target.value)}
                            onBlur={() => setRuleAmountSet(formatAmountSetRanges(ruleAmountSet))}
                            className={cn(
                              "w-56 bg-white border rounded px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500",
                              parsed?.error ? "border-red-400" : "border-gray-300"
                            )}
                            placeholder="38-42, 50, 68-70"
                            title="Values and/or ranges, comma-separated. E.g. 38-42, 50, 68-70"
                          />
                          {parsed?.error && (
                            <span className="text-xs text-red-500 whitespace-nowrap">{parsed.error}</span>
                          )}
                        </div>
                      )
                    })()}
                    {ruleAmountMatch === "range" && (
                      <>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={ruleAmountMin}
                          onChange={(e) => setRuleAmountMin(e.target.value)}
                          className="w-20 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Min"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={ruleAmountMax}
                          onChange={(e) => setRuleAmountMax(e.target.value)}
                          className="w-20 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Max"
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Allocation lines (same editor as Manual Allocation) */}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_70px_80px_32px] gap-2 px-1 py-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <span>Contact</span>
                    <span>Description</span>
                    <span>Account / Category</span>
                    <span>Tax code</span>
                    <span className="text-right">Mode</span>
                    <span className="text-right">Value</span>
                    <span />
                  </div>
                  {lines.map((line) => {
                    const otherTotal = lines.filter((l) => l.id !== line.id).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
                    const remainderAmt = Math.max(0, Math.abs(amount) - otherTotal)
                    return (
                    <div key={line.id} className="grid grid-cols-[1fr_1fr_1.5fr_1fr_70px_80px_32px] gap-2 px-1 py-1 items-start">
                      <Combobox
                        options={contactOptions}
                        value={line.contactId}
                        onChange={(v) => updateLine(line.id, "contactId", v ? Number(v) : null)}
                        placeholder="Contact..."
                      />
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, "description", e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Description"
                      />
                      <Combobox
                        options={categoryAccountOptions}
                        value={line.accountId}
                        onChange={(v) => {
                          updateLine(line.id, "accountId", v ? Number(v) : null)
                          onAccountChange(lines.some((l) => l.id === line.id ? !!v : !!l.accountId))
                        }}
                        placeholder="Select account..."
                      />
                      <Combobox
                        options={taxCodeOptions}
                        value={line.taxCodeId}
                        onChange={(v) => updateLine(line.id, "taxCodeId", v ? Number(v) : null)}
                        placeholder="Tax..."
                      />
                      <select
                        value={line.mode}
                        onChange={(e) => {
                          const m = e.target.value as "amount" | "percent" | "remainder"
                          updateLine(line.id, "mode", m)
                          if (m === "percent" && line.percentage) {
                            updateLine(line.id, "amount", (Math.abs(amount) * parseFloat(line.percentage) / 100).toFixed(2))
                          } else if (m === "remainder") {
                            updateLine(line.id, "amount", remainderAmt.toFixed(2))
                            updateLine(line.id, "percentage", "")
                          }
                        }}
                        className="bg-white border border-gray-300 rounded px-1 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="amount">$</option>
                        <option value="percent">%</option>
                        <option value="remainder">Rest</option>
                      </select>
                      {line.mode === "percent" ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.percentage}
                          onChange={(e) => {
                            const pct = e.target.value
                            updateLine(line.id, "percentage", pct)
                            const pctNum = parseFloat(pct) || 0
                            updateLine(line.id, "amount", (Math.abs(amount) * pctNum / 100).toFixed(2))
                          }}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-right font-normal tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="%"
                        />
                      ) : line.mode === "remainder" ? (
                        <div className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-sm text-right font-normal tabular-nums text-gray-500">
                          {remainderAmt.toFixed(2)}
                        </div>
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.amount}
                          onChange={(e) => updateLine(line.id, "amount", e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm text-right font-normal tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="0.00"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 1}
                        className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                        title="Remove line"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    )
                  })}
                  <div className="flex items-center justify-between px-1 pt-1">
                    <Button variant="ghost" size="sm" onClick={addLine}>
                      <Plus className="h-3.5 w-3.5" />
                      Add line
                    </Button>
                    <StatBar>
                      <StatCell label="Subtotal" align="right">
                        <span className="font-normal tabular-nums">${subtotal.toFixed(2)}</span>
                      </StatCell>
                      <StatCell label="Out of Balance" align="right">
                        <span className={cn("font-normal tabular-nums", isBalanced ? "text-green-600" : "text-red-600")}>
                          ${Math.abs(outOfBalance).toFixed(2)}
                        </span>
                      </StatCell>
                    </StatBar>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ── Tab: Manual Allocation ───────────────────────────────────── */}
          {actionTab === "manual" && (
            <div className="space-y-3">
              {/* Allocation lines */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Line header */}
                <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_100px_32px] gap-2 px-3 py-2 bg-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <span>Contact</span>
                  <span>Description</span>
                  <span>Account / Category</span>
                  <span>Tax code</span>
                  <span className="text-right">Amount ($)</span>
                  <span />
                </div>

                {lines.map((line) => (
                  <div
                    key={line.id}
                    className="grid grid-cols-[1fr_1fr_1.5fr_1fr_100px_32px] gap-2 px-3 py-2 border-t border-gray-100 items-start"
                  >
                    <Combobox
                      options={contactOptions}
                      value={line.contactId}
                      onChange={(v) => updateLine(line.id, "contactId", v ? Number(v) : null)}
                      placeholder="Contact..."
                    />
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Description"
                    />
                    <Combobox
                      options={categoryAccountOptions}
                      value={line.accountId}
                      onChange={(v) => updateLine(line.id, "accountId", v ? Number(v) : null)}
                      placeholder="Select account..."
                    />
                    <Combobox
                      options={taxCodeOptions}
                      value={line.taxCodeId}
                      onChange={(v) => updateLine(line.id, "taxCodeId", v ? Number(v) : null)}
                      placeholder="Tax..."
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={line.amount}
                      onChange={(e) => updateLine(line.id, "amount", e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-right font-normal tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length <= 1}
                      className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                      title="Remove line"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <Button variant="ghost" size="sm" onClick={addLine}>
                <Plus className="h-3.5 w-3.5" />
                Add line
              </Button>

              {/* Subtotal + Out of Balance */}
              <div className="flex justify-end pt-2 border-t border-gray-200">
                <StatBar>
                  <StatCell label="Subtotal" align="right">
                    <span className="font-normal tabular-nums">${subtotal.toFixed(2)}</span>
                  </StatCell>
                  <StatCell label="Out of Balance" align="right">
                    <span className={cn(
                      "font-normal tabular-nums",
                      isBalanced ? "text-green-600" : "text-red-600"
                    )}>
                      ${Math.abs(outOfBalance).toFixed(2)}
                    </span>
                  </StatCell>
                </StatBar>
              </div>

              {/* Create rule checkbox */}
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createRule}
                  onChange={(e) => setCreateRule(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Create rule for future allocations
              </label>
            </div>
          )}

          {/* ── Tab: Link Existing ───────────────────────────────────────── */}
          {actionTab === "link" && (
            <div className="text-sm text-gray-500 py-6 text-center border border-dashed border-gray-300 rounded-lg">
              Link to an existing invoice, bill, or journal entry. Search by reference or amount.
              <p className="text-xs text-gray-400 mt-1">Coming in Phase 2 (REC-048 to REC-051)</p>
            </div>
          )}

          {/* ── Tab: Transfer Money ──────────────────────────────────────── */}
          {actionTab === "transfer" && (
            <div className="space-y-3 max-w-sm">
              <p className="text-xs text-gray-500">Transfer between bank accounts (e.g. cheque to savings).</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target bank account</label>
                <Combobox
                  options={bankAccountOptions}
                  value={null}
                  onChange={() => {}}
                  placeholder="Select target account..."
                />
              </div>
              <p className="text-xs text-gray-400">Phase 2 (REC-056 to REC-059) — full transfer support with two-sided matching.</p>
            </div>
          )}

          {/* ── Audit (collapsed by default) ──────────────────────────────── */}
          <div>
            <button
              type="button"
              onClick={() => setAuditExpanded(!auditExpanded)}
              className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors"
            >
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-150", auditExpanded && "rotate-90")} />
              Audit
            </button>
            {auditExpanded && (
              <div className="mt-2 px-3 py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-400">
                Audit trail will appear here
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Batch Action Bar ─────────────────────────────────────────────────────────

function BatchActionBar({
  count,
  onClear,
  onBulkApprove,
  approving,
}: {
  count: number
  onClear: () => void
  onBulkApprove: () => void
  approving: boolean
}) {
  return (
    <div className="border border-gray-300 rounded-lg bg-gray-50 px-4 py-3 flex items-center gap-4">
      <span className="text-sm text-gray-700 font-medium">
        {count} transaction{count !== 1 ? "s" : ""} selected
        <span className="text-xs text-gray-400 ml-1">(max 50)</span>
      </span>
      <div className="flex-1" />
      <Button variant="secondary" size="sm" onClick={onClear}>
        Clear selection
      </Button>
      <Button variant="primary" size="sm" onClick={onBulkApprove} disabled={approving} loading={approving}>
        Approve selected
      </Button>
    </div>
  )
}

// ── Sortable Column Header ───────────────────────────────────────────────────

function SortHeader({
  label,
  column,
  currentColumn,
  currentDirection,
  onSort,
  align = "left",
}: {
  label: string
  column: SortColumn
  currentColumn: SortColumn
  currentDirection: SortDirection
  onSort: (col: SortColumn) => void
  align?: "left" | "right"
}) {
  const isActive = currentColumn === column
  const nextDirection = isActive && currentDirection === "asc" ? "descending" : "ascending"
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-xs font-medium uppercase tracking-wide cursor-pointer select-none transition-colors group text-left",
        isActive ? "text-primary-700" : "text-gray-500 hover:text-gray-700",
        align === "right" && "text-right"
      )}
      onClick={() => onSort(column)}
      title={`Sort ${nextDirection} by ${label.toLowerCase()}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDirection === "asc" ? (
            <ChevronUp className="h-3 w-3 text-primary-500" />
          ) : (
            <ChevronDown className="h-3 w-3 text-primary-500" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-60 group-hover:text-primary-400 transition-all" />
        )}
      </span>
    </th>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function ReconciliationPage() {
  usePageHelp(pageHelpContent.banking)
  usePagePolicies(["banking"])

  const feedback = useFeedback()
  const { data: accounts } = useAccounts()
  const { data: taxCodes } = useTaxCodes("AU")
  const { data: customers } = useCustomers()
  const { data: vendors } = useVendors()
  const searchRef = useRef<HTMLInputElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  // Hover-to-highlight: glow target element orange, clear previous immediately
  const activeGlowRef = useRef<{ el: HTMLElement; li: HTMLElement | null } | null>(null)
  const clearGlow = useCallback(() => {
    if (activeGlowRef.current) {
      activeGlowRef.current.el.style.boxShadow = ""
      if (activeGlowRef.current.li) activeGlowRef.current.li.style.backgroundColor = ""
      activeGlowRef.current = null
    }
  }, [])
  const glowTarget = useCallback((targetId: string, liElement?: HTMLElement | null) => {
    clearGlow()
    const el = document.querySelector(`[data-guide-target="${targetId}"]`) as HTMLElement | null
    if (!el) return
    el.style.boxShadow = "0 0 0 3px rgba(251, 146, 60, 0.5)"
    el.style.transition = "box-shadow 0.3s ease"
    el.style.borderRadius = el.style.borderRadius || "0.5rem"
    if (liElement) {
      liElement.style.backgroundColor = "rgba(255, 237, 213, 0.6)"
      liElement.style.transition = "background-color 0.2s ease"
    }
    activeGlowRef.current = { el, li: liElement ?? null }
  }, [clearGlow])
  const navState = location.state as { accountId?: number } | null

  // State
  const [selectedAccountId, setSelectedAccountId] = useState(navState?.accountId ?? 0)
  const [expandedLineId, setExpandedLineId] = useState<number | null>(null)
  const [expandedTab, setExpandedTab] = useState<ActionTab | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [sortColumn, setSortColumn] = useState<SortColumn>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [filterTab, setFilterTab] = useState<FilterTab>("all")
  const [searchText, setSearchText] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [rulePreviewPattern, setRulePreviewPattern] = useState("")
  const [rulePreviewMatchType, setRulePreviewMatchType] = useState<"contains" | "exact" | "wildcard">("contains")
  const [rulePreviewHasAccount, setRulePreviewHasAccount] = useState(false)
  const [rulePreviewAmountFilter, setRulePreviewAmountFilterRaw] = useState<{ fn: ((amount: number) => boolean) | null }>({ fn: null })
  const setRulePreviewAmountFilter = useCallback((fn: ((amount: number) => boolean) | null) => {
    setRulePreviewAmountFilterRaw({ fn })
  }, [])
  const [rulesDrawerOpen, setRulesDrawerOpen] = useState(false)

  // Data queries
  const { data: queue, isLoading: queueLoading, error: queueError } = useReconQueue(selectedAccountId, "risk_first" as QueueSort, "all" as QueueFilter)
  const { data: reconSummary } = useReconSummary(selectedAccountId)
  const { data: importBatches } = useImportBatches(selectedAccountId)
  const { data: reconRulesData } = useReconRules()
  const reconRules = (reconRulesData ?? []) as ReconRule[]

  // Mutations
  const bulkAccept = useBulkAccept()
  const approveAllocations = useApproveAllocations()
  const createFromLine = useCreateFromLine()

  // Derived data
  const allAccounts = accounts ?? []
  const allTaxCodes = taxCodes ?? []
  const allContacts = [
    ...(customers ?? []).map((c) => ({ id: c.id, name: c.name })),
    ...(vendors ?? []).map((v) => ({ id: v.id, name: v.name })),
  ]
  const bankAccounts = allAccounts.filter((a) => a.category === "A")
  const accountOptions = bankAccounts.map((a) => ({
    value: a.id,
    label: `${a.accno} — ${a.description ?? ""}`,
    detail: "Bank",
  }))

  const selectedAccount = bankAccounts.find((a) => a.id === selectedAccountId)

  // Filter and search
  const queueRaw = queue ?? []

  const filteredQueue = useMemo(() => {
    let items = queueRaw

    // Tab filter
    if (filterTab === "unallocated") {
      items = items.filter((q) => {
        const ws = workflowStatus(q)
        return ws === "imported" || ws === "unallocated"
      })
    } else if (filterTab === "proposed") {
      items = items.filter((q) => workflowStatus(q) === "proposed")
    } else if (filterTab === "approved") {
      items = items.filter((q) => workflowStatus(q) === "approved")
    }

    // Date range filter
    if (dateFrom) {
      items = items.filter((q) => q.trans_date >= dateFrom)
    }
    if (dateTo) {
      items = items.filter((q) => q.trans_date <= dateTo)
    }

    // Text search
    if (searchText) {
      const s = searchText.toLowerCase()
      items = items.filter((q) =>
        (q.description ?? "").toLowerCase().includes(s) ||
        (q.normalized_description ?? "").toLowerCase().includes(s) ||
        (q.counterparty_name ?? "").toLowerCase().includes(s) ||
        (q.reference ?? "").toLowerCase().includes(s) ||
        String(q.amount ?? "").includes(s)
      )
    }

    return items
  }, [queueRaw, filterTab, dateFrom, dateTo, searchText])

  // Sort
  const sortedQueue = useMemo(() => {
    return sortItems(filteredQueue, sortColumn, sortDirection)
  }, [filteredQueue, sortColumn, sortDirection])

  // Counts for tabs
  const counts = useMemo(() => {
    const all = queueRaw.length
    const unallocated = queueRaw.filter((q) => {
      const ws = workflowStatus(q)
      return ws === "imported" || ws === "unallocated"
    }).length
    const proposed = queueRaw.filter((q) => workflowStatus(q) === "proposed").length
    const approved = queueRaw.filter((q) => workflowStatus(q) === "approved").length
    return { all, unallocated, proposed, approved }
  }, [queueRaw])

  // Balances — use summary counts when available for the progress display
  const totalTransactions = reconSummary?.total_transactions ?? queueRaw.length
  const reconciledCount = (reconSummary?.auto_matched ?? 0) + (reconSummary?.manually_matched ?? 0)

  const bankBalance = useMemo(() => {
    return queueRaw.reduce((sum, q) => sum + parseAmount(q.amount), 0)
  }, [queueRaw])

  const bookBalance = useMemo(() => {
    const matched = queueRaw.filter((q) => {
      const s = workflowStatus(q)
      return s === "allocated" || s === "approved"
    })
    return matched.reduce((sum, q) => sum + parseAmount(q.amount), 0)
  }, [queueRaw])

  const variance = bankBalance - bookBalance

  // Last updated
  const lastUpdated = useMemo(() => {
    const batches = (importBatches ?? []) as Array<{ imported_at: string; status: string }>
    const complete = batches.filter((b) => b.status === "complete")
    if (complete.length === 0) return null
    return complete.reduce((latest, b) =>
      new Date(b.imported_at) > new Date(latest.imported_at) ? b : latest
    ).imported_at
  }, [importBatches])

  // Handlers
  const handleSort = useCallback((col: SortColumn) => {
    setSortColumn((prev) => {
      if (prev === col) {
        setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
        return prev
      }
      setSortDirection("asc")
      return col
    })
  }, [])

  const handleRowClick = useCallback((id: number, tab?: ActionTab) => {
    setExpandedLineId((prev) => (prev === id && !tab ? null : id))
    setExpandedTab(tab ?? null)
  }, [])

  const handleCheckbox = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        if (next.size >= 50) return prev
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const ids = sortedQueue.slice(0, 50).map((q) => q.id)
      setSelectedIds(new Set(ids))
    } else {
      setSelectedIds(new Set())
    }
  }, [sortedQueue])

  const handleBulkApprove = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    try {
      await bulkAccept.mutateAsync({ bank_transaction_ids: ids })
      feedback.success(`Approved ${ids.length} transaction${ids.length !== 1 ? "s" : ""}`)
      setSelectedIds(new Set())
    } catch (err: unknown) {
      feedback.error("Bulk approve failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [selectedIds, bulkAccept, feedback])

  const handleSaveAllocation = useCallback(async (
    lineId: number,
    allocLines: AllocationLine[],
    shouldCreateRule: boolean
  ) => {
    const item = queueRaw.find((q) => q.id === lineId)
    if (!item || allocLines.length === 0 || !allocLines[0].accountId) return

    try {
      await createFromLine.mutateAsync({
        lineId,
        lines: allocLines.map((l) => ({
          account_id: l.accountId!,
          tax_code_id: l.taxCodeId ?? undefined,
          contact_id: l.contactId ?? undefined,
          description: l.description || item.description || "",
          amount: parseFloat(l.amount) || 0,
        })),
        remember_rule: shouldCreateRule,
      })
      feedback.success("Transaction categorised and matched")
      setExpandedLineId(null)
    } catch (err: unknown) {
      feedback.error("Save failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [queueRaw, createFromLine, feedback])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === "Escape") {
        setExpandedLineId(null)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  const header = (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-xl font-semibold text-gray-900">Bank Reconciliation</h1>
      </div>
      <p className="text-sm text-gray-500">Match bank transactions to your ledger</p>
    </div>
  )

  return (
    <div className="flex h-full">
    <PageShell header={header} layout="stacked" className="flex-1 min-w-0">
      {/* Info Panel */}
      <InfoPanel title="Getting started with bank reconciliation" storageKey="recon-v2-info" collapsible>
        {(() => {
          // Compute step progress
          const hasAccount = selectedAccountId > 0
          const hasTransactions = queueRaw.length > 0
          const hasUnallocated = counts.unallocated > 0
          const hasProposed = counts.proposed > 0
          const hasApproved = counts.approved > 0
          const allAllocated = hasTransactions && counts.unallocated === 0

          const steps: Array<{
            label: React.ReactNode
            status: "done" | "active" | "pending"
            target?: string
          }> = [
            {
              label: <><strong>Select a bank account</strong> — use the dropdown above to choose which bank account you want to reconcile. If you have multiple accounts, you can switch between them at any time.</>,
              status: hasAccount ? "done" : "active",
              target: "bank-account-header",
            },
            {
              label: <>
                <strong>Import transactions</strong> — upload a bank statement file (OFX, QIF, or CSV) via{" "}
                <button type="button" onClick={() => navigate("/bank-statements", { state: { accountId: selectedAccountId || undefined } })} className="text-blue-700 underline hover:text-blue-900 font-medium">Bank Statements</button>
                {", "}or if you have automatic bank feeds configured, transactions arrive via your{" "}
                <button type="button" onClick={() => navigate("/settings/bank-feeds")} className="text-blue-700 underline hover:text-blue-900 font-medium">live feed connection</button>.
              </>,
              status: hasTransactions ? "done" : hasAccount ? "active" : "pending",
            },
            {
              label: <><strong>Work through unallocated transactions</strong> — click the <em>Unallocated</em> tab to see transactions that need your attention. Click any row to expand it and choose how to handle it:</>,
              status: hasTransactions && !hasUnallocated ? "done" : hasTransactions ? "active" : "pending",
              target: "filter-tabs",
            },
            {
              label: <>
                <strong>Choose an allocation method</strong> for each transaction:
                <ul className="list-disc list-inside ml-4 mt-0.5 space-y-0.5">
                  <li className="rounded px-1 -mx-1 transition-colors" onMouseEnter={(e) => glowTarget("tab-manual", e.currentTarget)} onMouseLeave={clearGlow}><strong>Manual Allocation</strong> — select a GL account, tax code, and contact. Use <em>Add line</em> to split across multiple accounts (e.g., 70% business expense, 30% owner drawings).</li>
                  <li className="rounded px-1 -mx-1 transition-colors" onMouseEnter={(e) => glowTarget("tab-rule", e.currentTarget)} onMouseLeave={clearGlow}><strong>Allocation Rule</strong> — create a reusable pattern that automatically allocates this and all matching transactions. Rules save you time on recurring payments like rent, subscriptions, and EFTPOS deposits.</li>
                  <li className="rounded px-1 -mx-1 transition-colors" onMouseEnter={(e) => glowTarget("tab-link", e.currentTarget)} onMouseLeave={clearGlow}><strong>Link Existing</strong> — connect to an invoice, bill, or journal entry already in your books. Use this when you've already recorded the transaction and just need to mark it as reconciled.</li>
                  <li className="rounded px-1 -mx-1 transition-colors" onMouseEnter={(e) => glowTarget("tab-transfer", e.currentTarget)} onMouseLeave={clearGlow}><strong>Transfer Money</strong> — record a movement between your own bank accounts (e.g., cheque to savings, credit card payment).</li>
                </ul>
                <p className="mt-1">You can also <strong>defer</strong> a transaction to come back to it later, or <strong>exclude</strong> it from reconciliation entirely.</p>
              </>,
              status: allAllocated ? "done" : hasUnallocated ? "active" : "pending",
            },
            {
              label: <><strong>Review your work</strong> — click the <em>Proposed</em> tab to see all allocations you've made. Everything here is in a safe staging area — nothing has affected your books yet. You can change or undo any allocation before approving.</>,
              status: hasApproved && !hasProposed ? "done" : hasProposed ? "active" : "pending",
              target: "filter-tabs",
            },
            {
              label: <><strong>Approve</strong> — becomes enabled once you have at least one proposed allocation or exception. You don't have to finish everything in one session — approve what's ready now and come back for the rest later. Only approved transactions create journal entries in your books.</>,
              status: hasApproved && !hasProposed ? "done" : hasProposed ? "active" : "pending",
              target: "approve-button",
            },
          ]

          return (
            <ol className="space-y-1.5">
              {steps.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 cursor-default rounded px-1 -mx-1 transition-colors"
                  onMouseEnter={step.target ? (e) => glowTarget(step.target!, e.currentTarget) : undefined}
                  onMouseLeave={clearGlow}
                >
                  <span className="shrink-0 mt-0.5">
                    {step.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : step.status === "active" ? (
                      <Circle className="h-4 w-4 text-blue-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-300" />
                    )}
                  </span>
                  <span>{step.label}</span>
                </li>
              ))}
            </ol>
          )
        })()}
      </InfoPanel>

      {/* Bank Account Header (REC-008 to REC-010) — CSS Grid: row 1 = labels, row 2 = values */}
      <div className="border border-gray-300 rounded-lg bg-white px-5 py-3" data-guide-target="bank-account-header">
        {(() => {
          const cols = ["auto"]
          if (selectedAccountId > 0 && selectedAccount) cols.push("auto")
          if (selectedAccountId > 0) cols.push("auto", "auto", "auto")
          if (selectedAccountId > 0 && totalTransactions > 0) cols.push("auto")
          if (selectedAccountId > 0 && lastUpdated) cols.push("1fr")

          return (
            <div
              className="grid gap-x-6 gap-y-1 items-end"
              style={{ gridTemplateColumns: cols.join(" "), gridTemplateRows: "auto auto" }}
            >
              {/* Row 1: Labels */}
              <p className="text-xs text-gray-500">Bank Account</p>
              {selectedAccountId > 0 && selectedAccount && (
                <p className="text-xs text-gray-500">Account Name</p>
              )}
              {selectedAccountId > 0 && (
                <>
                  <p className="text-xs text-gray-500 border-l border-gray-200 pl-5">Bank balance</p>
                  <p className="text-xs text-gray-500">Book balance</p>
                  <p className="text-xs text-gray-500">Variance</p>
                </>
              )}
              {selectedAccountId > 0 && totalTransactions > 0 && (
                <p className="text-xs text-gray-500">Reconciled</p>
              )}
              {selectedAccountId > 0 && lastUpdated && (
                <p className="text-xs text-gray-500 text-right">Last updated</p>
              )}

              {/* Row 2: Values */}
              <div>
                <Combobox
                  options={accountOptions}
                  value={selectedAccountId || null}
                  onChange={(v) => {
                    setSelectedAccountId(v ? Number(v) : 0)
                    setExpandedLineId(null)
                    setSelectedIds(new Set())
                  }}
                  placeholder="Select a bank account..."
                  className="w-72"
                />
              </div>
              {selectedAccountId > 0 && selectedAccount && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Landmark className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="font-medium truncate max-w-[200px]" title={selectedAccount.description ?? undefined}>
                    {selectedAccount.description}
                  </span>
                </div>
              )}
              {selectedAccountId > 0 && (
                <>
                  <div className="text-sm border-l border-gray-200 pl-5">
                    <MoneyValue amount={bankBalance} size="sm" colorNegative className="font-normal tabular-nums" />
                  </div>
                  <div className="text-sm">
                    <MoneyValue amount={bookBalance} size="sm" colorNegative className="font-normal tabular-nums" />
                  </div>
                  <div className="text-sm">
                    <MoneyValue
                      amount={variance}
                      size="sm"
                      colorNegative
                      className={cn("font-normal tabular-nums", Math.abs(variance) < 0.01 ? "text-green-600" : "text-red-600")}
                    />
                  </div>
                </>
              )}
              {selectedAccountId > 0 && totalTransactions > 0 && (
                <div className="text-sm font-normal tabular-nums text-gray-700">
                  {reconciledCount} of {totalTransactions}
                </div>
              )}
              {selectedAccountId > 0 && lastUpdated && (
                <div className="text-sm text-right">
                  <DateValue value={lastUpdated} format="relative" className="text-gray-600" />
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* No account selected */}
      {selectedAccountId === 0 && (
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center max-w-sm">
            <Landmark className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <h2 className="text-base font-medium text-gray-900 mb-2">Select a bank account</h2>
            <p className="text-sm text-gray-500">
              Choose a bank account from the selector above to view transactions for reconciliation.
            </p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {selectedAccountId > 0 && queueLoading && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {/* Error state */}
      {selectedAccountId > 0 && queueError && (
        <InlineAlert variant="error" title="Failed to load transactions">
          {queueError.message}
        </InlineAlert>
      )}

      {/* Transaction list */}
      {selectedAccountId > 0 && !queueLoading && !queueError && (
        <>
          {/* Filter Tabs + Search (REC-011 to REC-013) */}
          <div className="flex items-center gap-4 flex-wrap" data-guide-target="filter-tabs">
            {/* Tabs */}
            <div className="flex gap-1">
              {([
                { key: "all" as FilterTab, label: "All", count: counts.all },
                { key: "unallocated" as FilterTab, label: "Unallocated", count: counts.unallocated },
                { key: "proposed" as FilterTab, label: "Proposed", count: counts.proposed },
                { key: "approved" as FilterTab, label: "Approved", count: counts.approved },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFilterTab(tab.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    filterTab === tab.key
                      ? "bg-gray-700 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={cn(
                      "ml-1.5 tabular-nums text-xs",
                      filterTab === tab.key ? "text-gray-300" : "text-gray-400"
                    )}>
                      ({tab.count})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Approve button */}
            <Button
              variant="primary"
              size="sm"
              disabled={counts.proposed === 0 || approveAllocations.isPending}
              loading={approveAllocations.isPending}
              data-guide-target="approve-button"
              onClick={async () => {
                const proposedIds = queueRaw
                  .filter((q) => workflowStatus(q) === "proposed")
                  .map((q) => q.id)
                if (proposedIds.length === 0) return
                try {
                  const result = await approveAllocations.mutateAsync({ bank_feed_line_ids: proposedIds })
                  const r = result as { succeeded?: number }
                  feedback.success(`Approved ${r.succeeded ?? proposedIds.length} transaction${proposedIds.length !== 1 ? "s" : ""}`)
                } catch (err: unknown) {
                  feedback.error("Approve failed", err instanceof Error ? err.message : "Unknown error")
                }
              }}
            >
              Approve{counts.proposed > 0 ? ` (${counts.proposed})` : ""}
            </Button>

            {/* Manage Rules */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRulesDrawerOpen((v) => !v)}
            >
              Rules ({reconRules.length})
            </Button>

            {/* Date range */}
            <div className="flex items-center gap-1.5 ml-auto">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="From"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-white border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="To"
              />
            </div>

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search descriptions..."
                className="w-full pl-8 pr-8 py-1.5 text-sm bg-white border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Batch selection bar (REC-014 to REC-016) */}
          {selectedIds.size > 0 && (
            <BatchActionBar
              count={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              onBulkApprove={handleBulkApprove}
              approving={bulkAccept.isPending}
            />
          )}

          {/* Transaction table (REC-001 to REC-004) */}
          <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === Math.min(sortedQueue.length, 50)}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      title="Select all visible (max 50)"
                    />
                  </th>
                  <SortHeader
                    label="Date"
                    column="date"
                    currentColumn={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Transaction Description"
                    column="description"
                    currentColumn={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortHeader
                    label="Withdrawal ($)"
                    column="withdrawal"
                    currentColumn={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortHeader
                    label="Deposit ($)"
                    column="deposit"
                    currentColumn={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    align="right"
                  />
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-center w-14">Rule</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-center w-24">Linked</th>
                  <th className="px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wide text-center w-56">Allocated</th>
                  <SortHeader
                    label="Status"
                    column="status"
                    currentColumn={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {sortedQueue.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <p className="text-sm text-gray-500 mb-1">No transactions match the current filters</p>
                      <p className="text-xs text-gray-400">
                        {searchText
                          ? "Try a different search term"
                          : "Import bank statements to get started"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  sortedQueue.map((item, idx) => {
                    const amount = parseAmount(item.amount)
                    const isWithdrawal = amount < 0
                    const isExpanded = expandedLineId === item.id
                    const isSelected = selectedIds.has(item.id)

                    return (
                      <TransactionRow
                        key={item.id}
                        item={item}
                        amount={amount}
                        isWithdrawal={isWithdrawal}
                        isExpanded={isExpanded}
                        isSelected={isSelected}
                        isOddRow={idx % 2 === 1}
                        initialTab={isExpanded ? expandedTab : null}
                        rulePreviewPattern={rulePreviewPattern}
                        rulePreviewHasAccount={rulePreviewHasAccount}
                        rulePreviewAmountFilter={rulePreviewAmountFilter.fn}
                        rulePreviewMatchType={rulePreviewMatchType}
                        onRowClick={handleRowClick}
                        onCheckbox={handleCheckbox}
                        accounts={allAccounts}
                        taxCodes={allTaxCodes}
                        contacts={allContacts}
                        bankAccounts={bankAccounts}
                        selectedAccountId={selectedAccountId}
                        reconRules={reconRules}
                        queueItems={queueRaw}
                        onPatternChange={setRulePreviewPattern}
                        onAccountChange={setRulePreviewHasAccount}
                        onAmountFilterChange={setRulePreviewAmountFilter}
                        onMatchTypeChange={setRulePreviewMatchType}
                        onSave={handleSaveAllocation}
                        saving={createFromLine.isPending}
                      />
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          <div className="flex items-center justify-between text-xs text-gray-400 px-1">
            <span>{sortedQueue.length} transaction{sortedQueue.length !== 1 ? "s" : ""}</span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-gray-600">/</kbd> search
              {" "}
              <kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-gray-600">Esc</kbd> collapse
            </span>
          </div>
        </>
      )}
    </PageShell>
    <RulesDrawer open={rulesDrawerOpen} onClose={() => setRulesDrawerOpen(false)} />
    </div>
  )
}

// ── Transaction Row (extracted for readability) ──────────────────────────────

function TransactionRow({
  item,
  amount,
  isWithdrawal,
  isExpanded,
  isSelected,
  isOddRow,
  initialTab,
  rulePreviewPattern,
  rulePreviewHasAccount,
  rulePreviewAmountFilter,
  rulePreviewMatchType,
  onRowClick,
  onCheckbox,
  accounts,
  taxCodes,
  contacts,
  bankAccounts,
  selectedAccountId,
  reconRules,
  queueItems,
  onPatternChange,
  onAccountChange,
  onAmountFilterChange,
  onMatchTypeChange,
  onSave,
  saving,
}: {
  item: QueueItem
  amount: number
  isWithdrawal: boolean
  isExpanded: boolean
  isSelected: boolean
  isOddRow: boolean
  initialTab: ActionTab | null
  rulePreviewPattern: string
  rulePreviewHasAccount: boolean
  rulePreviewAmountFilter: ((amount: number) => boolean) | null
  rulePreviewMatchType: "contains" | "exact" | "wildcard"
  onRowClick: (id: number, tab?: ActionTab) => void
  onCheckbox: (id: number, checked: boolean) => void
  accounts: { id: number; accno: string; description: string | null; category: string }[]
  taxCodes: { id: number; code: string; name: string; rate: string }[]
  contacts: { id: number; name: string }[]
  bankAccounts: { id: number; accno: string; description: string | null }[]
  selectedAccountId: number
  reconRules: ReconRule[]
  queueItems: QueueItem[]
  onPatternChange: (pattern: string) => void
  onAccountChange: (hasAccount: boolean) => void
  onAmountFilterChange: (filter: ((amount: number) => boolean) | null) => void
  onMatchTypeChange: (matchType: "contains" | "exact" | "wildcard") => void
  onSave: (lineId: number, lines: AllocationLine[], createRule: boolean) => void
  saving: boolean
}) {
  // Derive column display values
  const hasRule = useMemo(() => {
    if (!item.description) return false
    const desc = item.description.toLowerCase()
    return reconRules.some((r) => {
      if (r.disabled) return false
      const pat = r.match_pattern?.toLowerCase()
      if (!pat) return false
      if (r.match_type === "exact") return desc === pat
      if (r.match_type === "wildcard") {
        try { return new RegExp(pat, "i").test(desc) } catch { return false }
      }
      return desc.includes(pat)
    })
  }, [item.description, reconRules])

  const matchedRuleName = useMemo(() => {
    if (!item.description) return null
    const desc = item.description.toLowerCase()
    return reconRules.find((r) => {
      if (r.disabled) return false
      const pat = r.match_pattern?.toLowerCase()
      if (!pat) return false
      if (r.match_type === "exact") return desc === pat
      if (r.match_type === "wildcard") {
        try { return new RegExp(pat, "i").test(desc) } catch { return false }
      }
      return desc.includes(pat)
    })?.name ?? null
  }, [item.description, reconRules])

  const ws = workflowStatus(item)
  const isAllocated = ws === "proposed" || ws === "approved"

  // Rule preview — does this row match the pattern AND amount criteria?
  const isRulePatternMatch = useMemo(() => {
    if (!rulePreviewPattern || isExpanded) return false
    const desc = item.normalized_description || item.description || ""
    if (!testRulePattern(desc, rulePreviewPattern, rulePreviewMatchType)) return false
    // Also check amount filter if set
    if (rulePreviewAmountFilter && !rulePreviewAmountFilter(Math.abs(amount))) return false
    return true
  }, [rulePreviewPattern, rulePreviewMatchType, rulePreviewAmountFilter, item.description, item.normalized_description, isExpanded, amount])

  // Full preview: pattern matches AND account is selected
  const isRulePreviewMatch = isRulePatternMatch && rulePreviewHasAccount

  // Parse allocation info from match_explanation if available
  const allocInfo = useMemo(() => {
    const ex = item.match_explanation as Record<string, unknown> | null
    if (!ex || ex.action !== "create") return null
    const exLines = ex.lines as Array<{ account_id: number; amount: number }> | undefined
    if (!exLines || exLines.length === 0) return null
    return exLines.map((l) => {
      const acct = accounts.find((a) => a.id === l.account_id)
      return acct ? acct.accno : `#${l.account_id}`
    })
  }, [item.match_explanation, accounts])

  return (
    <>
      <tr
        className={cn(
          "border-b border-gray-100 cursor-pointer transition-colors",
          isExpanded ? "bg-primary-50"
            : isRulePreviewMatch ? "bg-green-50 border-l-2 border-l-green-400"
            : isRulePatternMatch ? "bg-blue-50/30"
            : isSelected ? "bg-primary-25"
            : isOddRow ? "bg-gray-50/50"
            : "bg-white",
          !isExpanded && !isRulePreviewMatch && !isSelected && "hover:bg-gray-100/60"
        )}
        onClick={() => onRowClick(item.id)}
      >
        {/* Checkbox */}
        <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onCheckbox(item.id, e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
        </td>

        {/* Date */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          <DateValue value={item.trans_date} format="short" className="text-xs text-gray-600" />
        </td>

        {/* Description */}
        <td className="px-3 py-2.5">
          <p className="text-sm text-gray-800 truncate max-w-[800px]">
            {isRulePatternMatch && rulePreviewMatchType !== "wildcard" && rulePreviewPattern
              ? highlightMatch(item.normalized_description || item.description || "", rulePreviewPattern)
              : (item.normalized_description || item.description || "\u2014")}
          </p>
          {item.counterparty_name && (
            <p className="text-xs text-gray-400 truncate">{item.counterparty_name}</p>
          )}
        </td>

        {/* Withdrawal */}
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          {isWithdrawal ? (
            <span className="text-sm font-normal tabular-nums text-gray-800">
              {Math.abs(amount).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          ) : null}
        </td>

        {/* Deposit */}
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          {!isWithdrawal ? (
            <span className="text-sm font-normal tabular-nums text-gray-800">
              {amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          ) : null}
        </td>

        {/* Rule */}
        <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
          {hasRule ? (
            <button
              type="button"
              onClick={() => onRowClick(item.id, "rule")}
              className="text-xs font-medium text-green-600 hover:text-green-800 transition-colors"
              title={matchedRuleName ?? "Rule matched"}
            >
              Y
            </button>
          ) : (
            <span className="text-xs text-gray-300">&mdash;</span>
          )}
        </td>

        {/* Linked */}
        <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-gray-300">&mdash;</span>
        </td>

        {/* Allocated */}
        <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
          {isAllocated && allocInfo ? (
            <span
              className="text-xs font-mono text-gray-600 cursor-default"
              title={allocInfo.join(" / ")}
            >
              {allocInfo.length === 1
                ? allocInfo[0]
                : `${allocInfo[0]} \u2026`}
            </span>
          ) : isRulePreviewMatch ? (
            <span className="text-xs">
              <span className="line-through text-gray-300">N</span>
              {" "}
              <span className="text-green-600 font-medium">Y</span>
            </span>
          ) : (
            <span className="text-xs text-gray-400">N</span>
          )}
        </td>

        {/* Status */}
        <td className="px-3 py-2.5">
          {isRulePreviewMatch ? (
            <StatusPill
              status="New Allocation"
              semantic="success"
              className="text-xs"
            />
          ) : (
            <StatusPill
              status={statusLabel(workflowStatus(item))}
              semantic={statusPillSemantic(workflowStatus(item))}
              className="text-xs"
            />
          )}
        </td>

        {/* Expand/collapse */}
        <td className="w-8 px-2 py-2.5 text-gray-400">
          <ChevronRight className={cn("h-4 w-4 transition-transform duration-150", isExpanded && "rotate-90")} />
        </td>
      </tr>

      {/* Expansion panel (REC-005, REC-006) */}
      {isExpanded && (
        <ExpansionPanel
          item={item}
          accounts={accounts}
          taxCodes={taxCodes}
          contacts={contacts}
          bankAccounts={bankAccounts}
          selectedAccountId={selectedAccountId}
          reconRules={reconRules}
          initialTab={initialTab}
          queueItems={queueItems}
          onPatternChange={onPatternChange}
          onAccountChange={onAccountChange}
          onAmountFilterChange={onAmountFilterChange}
          onMatchTypeChange={onMatchTypeChange}
          onSave={(lines, createRule) => { onPatternChange(""); onAccountChange(false); onAmountFilterChange(null); onSave(item.id, lines, createRule) }}
          onCancel={() => { onPatternChange(""); onAccountChange(false); onAmountFilterChange(null); onRowClick(item.id) }}
          saving={saving}
        />
      )}
    </>
  )
}
