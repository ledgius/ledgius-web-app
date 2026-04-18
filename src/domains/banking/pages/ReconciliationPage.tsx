// Spec references: R-0065 (Phase 1), A-0036
import { useState, useCallback, useMemo, useRef, useEffect } from "react"
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
  useBulkAllocate,
  useCreateFromLine,
  type QueueItem,
  type QueueFilter,
  type QueueSort,
  type ReconRule,
} from "../hooks/useReconciliation"
import { cn } from "@/shared/lib/utils"
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
type FilterTab = "all" | "not_matched" | "matched"
type ActionTab = "rule" | "manual" | "link" | "transfer"

interface AllocationLine {
  id: string
  contactId: number | null
  description: string
  accountId: number | null
  taxCodeId: number | null
  amount: string
}

// ── Status mapping ───────────────────────────────────────────────────────────

function reconStatusSemantic(status: string): string {
  switch (status) {
    case "unmatched":
    case "imported":
      return "unmatched"
    case "suggested":
      return "suggested"
    case "auto_matched":
    case "allocated":
      return "allocated"
    case "resolved":
    case "approved":
      return "approved"
    case "needs_review":
    case "exception":
      return "needs_review"
    default:
      return status
  }
}

function statusLabel(status: string): string {
  switch (reconStatusSemantic(status)) {
    case "unmatched":
      return "Unallocated"
    case "suggested":
      return "Suggested"
    case "allocated":
      return "Allocated"
    case "approved":
      return "Approved"
    case "needs_review":
      return "Unallocated"
    default:
      return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

function statusPillSemantic(status: string): "muted" | "info" | "active" | "warning" | "success" | "danger" | "locked" {
  const s = reconStatusSemantic(status)
  switch (s) {
    case "unmatched":
      return "muted"
    case "suggested":
      return "info"
    case "allocated":
      return "active"
    case "approved":
      return "success"
    case "needs_review":
      return "warning"
    default:
      return "muted"
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

/** Extract the meaningful business name from a bank transaction description,
 * stripping transaction-specific identifiers like card numbers, amounts,
 * reference numbers, currency codes, and fee descriptions. */
function extractMeaningfulName(description: string): string {
  let s = description
  // Strip common prefixes
  s = s.replace(/^(DEBIT CARD PURCHASE|CREDIT CARD PURCHASE|VISA PURCHASE|EFTPOS|DIRECT DEBIT|DIRECT CREDIT|DEPOSIT|WITHDRAWAL|OSKO PAYMENT|BPAY|TRANSFER)\s*/i, "")
  // Strip card numbers (Card No. ~NNNNNN, Card No ~NNNNNN)
  s = s.replace(/Card\s*No\.?\s*~?\d+/gi, "")
  // Strip dollar amounts ($1,234.56 or 1,234.56 or 3955.00)
  s = s.replace(/\$[\d,]+\.?\d*/g, "")
  s = s.replace(/\b\d{1,3}(?:,\d{3})*\.\d{2}\b/g, "")
  // Strip currency codes (AUD, USD, THB, NZD, etc.)
  s = s.replace(/\b(AUD|USD|NZD|GBP|EUR|THB|SGD|JPY|CAD|HKD|CNY|INR)\b/gi, "")
  // Strip "incl." fee descriptions
  s = s.replace(/incl\.?\s*[^,]*/gi, "")
  // Strip "Foreign Transaction Fee" and similar
  s = s.replace(/Foreign\s+Transaction\s+Fee/gi, "")
  // Strip reference-like patterns (long digit sequences, hex strings)
  s = s.replace(/\b[A-F0-9]{8,}\b/gi, "")
  s = s.replace(/\b\d{6,}\b/g, "")
  // Strip date-like patterns (01/04, 2026-04-10, etc.)
  s = s.replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, "")
  s = s.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
  // Strip 2C2P-style codes and asterisks
  s = s.replace(/\*+/g, " ")
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim()
  // If we stripped too aggressively, fall back to original
  return s.length >= 3 ? s : description.trim()
}

function highlightMatch(text: string, pattern: string): React.ReactNode {
  if (!pattern) return text
  const idx = text.toLowerCase().indexOf(pattern.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200 text-amber-900 rounded-sm px-0.5">{text.slice(idx, idx + pattern.length)}</mark>
      {text.slice(idx + pattern.length)}
    </>
  )
}

function testRulePattern(description: string, pattern: string, matchType: "contains" | "exact" | "regex"): boolean {
  if (!pattern || !description) return false
  const desc = description.toLowerCase()
  const pat = pattern.toLowerCase()
  if (matchType === "exact") return desc === pat
  if (matchType === "regex") {
    try { return new RegExp(pat, "i").test(description) } catch { return false }
  }
  // Contains: support * as wildcard (e.g., "DEPOSIT*Square" → /DEPOSIT.*Square/i)
  if (pat.includes("*")) {
    const escaped = pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")
    try { return new RegExp(escaped, "i").test(description) } catch { return false }
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
  onMatchTypeChange,
  onSave,
  onBulkAllocate,
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
  onMatchTypeChange: (matchType: "contains" | "exact" | "regex") => void
  onSave: (lines: AllocationLine[], createRule: boolean) => void
  onBulkAllocate: (pattern: string, matchType: "contains" | "exact" | "regex", lines: AllocationLine[]) => void
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
    },
  ])
  const [createRule, setCreateRule] = useState(false)

  // Rule editor state
  const [rulePattern, setRulePattern] = useState(() =>
    extractMeaningfulName(item.normalized_description || item.description || "")
  )
  const [ruleMatchType, setRuleMatchType] = useState<"contains" | "exact" | "regex">("contains")
  const [ruleAmountMatch, setRuleAmountMatch] = useState<"any" | "exact" | "range" | "set">("any")
  const [ruleAmountExact, setRuleAmountExact] = useState(Math.abs(amount).toFixed(2))
  const [ruleAmountSet, setRuleAmountSet] = useState("")
  const [ruleAmountMin, setRuleAmountMin] = useState("")
  const [ruleAmountMax, setRuleAmountMax] = useState("")

  // Match count for the rule preview
  const unallocatedItems = useMemo(() =>
    queueItems.filter((q) => {
      const s = reconStatusSemantic(q.reconciliation_status)
      return s === "unmatched" || s === "suggested" || s === "needs_review"
    }),
  [queueItems])
  const unallocatedCount = unallocatedItems.length
  const ruleMatchCount = useMemo(() => {
    if (!rulePattern) return 0
    return unallocatedItems.filter((q) => {
      const desc = q.normalized_description || q.description || ""
      return testRulePattern(desc, rulePattern, ruleMatchType)
    }).length
  }, [rulePattern, ruleMatchType, unallocatedItems])

  // Find auto-matched recon rule
  const matchedRule = useMemo(() => {
    if (!item.description) return null
    const desc = item.description.toLowerCase()
    return reconRules.find((r) => {
      if (r.disabled) return false
      const pat = r.match_pattern?.toLowerCase()
      if (!pat) return false
      if (r.match_type === "exact") return desc === pat
      if (r.match_type === "regex") {
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
              onClick={() => {
                if (actionTab === "rule" && rulePattern) {
                  onBulkAllocate(rulePattern, ruleMatchType, lines)
                } else {
                  onSave(lines, false)
                }
              }}
            >
              {actionTab === "rule" ? `Save & Allocate${ruleMatchCount > 0 ? ` (${ruleMatchCount})` : ""}` : "Save"}
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
                        <span className="ml-2 font-normal normal-case tracking-normal text-amber-600">
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
                      onChange={(e) => { const v = e.target.value as "contains" | "exact" | "regex"; setRuleMatchType(v); onMatchTypeChange(v) }}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="contains">Contains</option>
                      <option value="exact">Exact</option>
                      <option value="regex">Regex</option>
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
                        <option value="set">Set</option>
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
                    {ruleAmountMatch === "set" && (
                      <input
                        type="text"
                        value={ruleAmountSet}
                        onChange={(e) => setRuleAmountSet(e.target.value)}
                        className="w-48 bg-white border border-gray-300 rounded px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="38, 43, 68, 103, 138"
                        title="Comma-separated list of exact amounts"
                      />
                    )}
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

                {/* Row 2: Defaults — account, tax, contact */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Default account</label>
                    <Combobox
                      options={categoryAccountOptions}
                      value={lines[0]?.accountId ?? null}
                      onChange={(v) => {
                        if (lines[0]) updateLine(lines[0].id, "accountId", v ? Number(v) : null)
                      }}
                      placeholder="Select account..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Default tax code</label>
                    <Combobox
                      options={taxCodeOptions}
                      value={lines[0]?.taxCodeId ?? null}
                      onChange={(v) => {
                        if (lines[0]) updateLine(lines[0].id, "taxCodeId", v ? Number(v) : null)
                      }}
                      placeholder="Tax..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Default contact</label>
                    <Combobox
                      options={contactOptions}
                      value={lines[0]?.contactId ?? null}
                      onChange={(v) => {
                        if (lines[0]) updateLine(lines[0].id, "contactId", v ? Number(v) : null)
                      }}
                      placeholder="Contact..."
                    />
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

  // State
  const [selectedAccountId, setSelectedAccountId] = useState(0)
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
  const [rulePreviewMatchType, setRulePreviewMatchType] = useState<"contains" | "exact" | "regex">("contains")

  // Data queries
  const { data: queue, isLoading: queueLoading, error: queueError } = useReconQueue(selectedAccountId, "risk_first" as QueueSort, "all" as QueueFilter)
  const { data: reconSummary } = useReconSummary(selectedAccountId)
  const { data: importBatches } = useImportBatches(selectedAccountId)
  const { data: reconRulesData } = useReconRules()
  const reconRules = (reconRulesData ?? []) as ReconRule[]

  // Mutations
  const bulkAccept = useBulkAccept()
  const bulkAllocate = useBulkAllocate()
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
    if (filterTab === "not_matched") {
      items = items.filter((q) => {
        const s = reconStatusSemantic(q.reconciliation_status)
        return s === "unmatched" || s === "suggested" || s === "needs_review"
      })
    } else if (filterTab === "matched") {
      items = items.filter((q) => {
        const s = reconStatusSemantic(q.reconciliation_status)
        return s === "allocated" || s === "approved"
      })
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
    const notMatched = queueRaw.filter((q) => {
      const s = reconStatusSemantic(q.reconciliation_status)
      return s === "unmatched" || s === "suggested" || s === "needs_review"
    }).length
    const matched = queueRaw.filter((q) => {
      const s = reconStatusSemantic(q.reconciliation_status)
      return s === "allocated" || s === "approved"
    }).length
    return { all, notMatched, matched }
  }, [queueRaw])

  // Balances — use summary counts when available for the progress display
  const totalTransactions = reconSummary?.total_transactions ?? queueRaw.length
  const reconciledCount = (reconSummary?.auto_matched ?? 0) + (reconSummary?.manually_matched ?? 0)

  const bankBalance = useMemo(() => {
    return queueRaw.reduce((sum, q) => sum + parseAmount(q.amount), 0)
  }, [queueRaw])

  const bookBalance = useMemo(() => {
    const matched = queueRaw.filter((q) => {
      const s = reconStatusSemantic(q.reconciliation_status)
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

  const handleBulkRuleAllocate = useCallback(async (
    pattern: string,
    matchType: "contains" | "exact" | "regex",
    allocLines: AllocationLine[],
  ) => {
    if (allocLines.length === 0 || !allocLines[0].accountId) return

    // Find all unallocated transactions matching the pattern
    const unallocated = queueRaw.filter((q) => {
      const s = reconStatusSemantic(q.reconciliation_status)
      return s === "unmatched" || s === "suggested" || s === "needs_review"
    })
    const matchingIds = unallocated
      .filter((q) => testRulePattern(q.normalized_description || q.description || "", pattern, matchType))
      .map((q) => q.id)

    if (matchingIds.length === 0) {
      feedback.error("No matching transactions found")
      return
    }

    try {
      const result = await bulkAllocate.mutateAsync({
        transaction_ids: matchingIds,
        account_id: allocLines[0].accountId!,
        tax_code_id: allocLines[0].taxCodeId ?? undefined,
        contact_id: allocLines[0].contactId ?? undefined,
        description: allocLines[0].description || "",
        remember_rule: true,
        rule_pattern: pattern,
        rule_match_type: matchType,
        rule_name: pattern,
      })
      const r = result as { allocated?: number }
      feedback.success(`Rule created — ${r.allocated ?? matchingIds.length} transactions allocated`)
      setExpandedLineId(null)
      setRulePreviewPattern("")
    } catch (err: unknown) {
      feedback.error("Bulk allocate failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [queueRaw, bulkAllocate, feedback])

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
    <PageShell header={header} layout="stacked">
      {/* Info Panel */}
      <InfoPanel title="Getting started with bank reconciliation" storageKey="recon-v2-info" collapsible defaultCollapsed>
        <p>
          Select a bank account to see imported transactions. Expand a row to categorise it, match it to an existing
          record, or transfer between accounts. Use the checkbox to batch-approve multiple transactions.
        </p>
      </InfoPanel>

      {/* Bank Account Header (REC-008 to REC-010) — CSS Grid: row 1 = labels, row 2 = values */}
      <div className="border border-gray-300 rounded-lg bg-white px-5 py-3">
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
                  className="w-80"
                />
              </div>
              {selectedAccountId > 0 && selectedAccount && (
                <div className="flex items-center gap-1.5 text-sm py-[7px]">
                  <Landmark className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="font-medium truncate max-w-[300px]" title={selectedAccount.description ?? undefined}>
                    {selectedAccount.description}
                  </span>
                </div>
              )}
              {selectedAccountId > 0 && (
                <>
                  <div className="text-sm border-l border-gray-200 pl-5 py-[7px]">
                    <MoneyValue amount={bankBalance} size="sm" colorNegative className="font-normal tabular-nums" />
                  </div>
                  <div className="text-sm py-[7px]">
                    <MoneyValue amount={bookBalance} size="sm" colorNegative className="font-normal tabular-nums" />
                  </div>
                  <div className="text-sm py-[7px]">
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
                <div className="text-sm font-normal tabular-nums text-gray-700 py-[7px]">
                  {reconciledCount} of {totalTransactions}
                </div>
              )}
              {selectedAccountId > 0 && lastUpdated && (
                <div className="text-sm text-right py-[7px]">
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
          <div className="flex items-center gap-4 flex-wrap">
            {/* Tabs */}
            <div className="flex gap-1">
              {([
                { key: "all" as FilterTab, label: "All transactions", count: counts.all },
                { key: "not_matched" as FilterTab, label: "Not matched", count: counts.notMatched },
                { key: "matched" as FilterTab, label: "Matched", count: counts.matched },
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
                        onMatchTypeChange={setRulePreviewMatchType}
                        onSave={handleSaveAllocation}
                        onBulkAllocate={handleBulkRuleAllocate}
                        saving={createFromLine.isPending || bulkAllocate.isPending}
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
  onMatchTypeChange,
  onSave,
  onBulkAllocate,
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
  rulePreviewMatchType: "contains" | "exact" | "regex"
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
  onMatchTypeChange: (matchType: "contains" | "exact" | "regex") => void
  onSave: (lineId: number, lines: AllocationLine[], createRule: boolean) => void
  onBulkAllocate: (pattern: string, matchType: "contains" | "exact" | "regex", lines: AllocationLine[]) => void
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
      if (r.match_type === "regex") {
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
      if (r.match_type === "regex") {
        try { return new RegExp(pat, "i").test(desc) } catch { return false }
      }
      return desc.includes(pat)
    })?.name ?? null
  }, [item.description, reconRules])

  const sem = reconStatusSemantic(item.reconciliation_status)
  const isAllocated = sem === "allocated" || sem === "approved"

  // Rule preview — does this row match the pattern being edited?
  const isRulePreviewMatch = useMemo(() => {
    if (!rulePreviewPattern || isExpanded) return false
    const desc = item.normalized_description || item.description || ""
    return testRulePattern(desc, rulePreviewPattern, rulePreviewMatchType)
  }, [rulePreviewPattern, rulePreviewMatchType, item.description, item.normalized_description, isExpanded])

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
            : isRulePreviewMatch ? "bg-amber-50 border-l-2 border-l-amber-400"
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
            {isRulePreviewMatch && rulePreviewMatchType !== "regex" && rulePreviewPattern
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
          ) : (
            <span className="text-xs text-gray-400">N</span>
          )}
        </td>

        {/* Status */}
        <td className="px-3 py-2.5">
          <StatusPill
            status={statusLabel(item.reconciliation_status)}
            semantic={statusPillSemantic(item.reconciliation_status)}
            className="text-xs"
          />
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
          onMatchTypeChange={onMatchTypeChange}
          onSave={(lines, createRule) => { onPatternChange(""); onSave(item.id, lines, createRule) }}
          onBulkAllocate={(pattern, matchType, lines) => { onPatternChange(""); onBulkAllocate(pattern, matchType, lines) }}
          onCancel={() => { onPatternChange(""); onRowClick(item.id) }}
          saving={saving}
        />
      )}
    </>
  )
}
