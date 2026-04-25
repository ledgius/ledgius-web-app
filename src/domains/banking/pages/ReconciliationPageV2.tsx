// Spec references: R-0065 (Phase 2), A-0036, T-0034-06, T-0034-07.
//
// Bank Reconciliation — complete UX rewrite.
// Two-pane layout: QueueList (left) + AllocatorPane (right).
// Progress header with ring gauge. Keyboard navigation. Bulk actions.

import { useState, useMemo, useEffect, useCallback } from "react"
import { useLocation } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
import { Skeleton } from "@/components/primitives"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useTaxCodes } from "@/domains/taxcode/hooks/useTaxCodes"
import { useCustomers, useVendors } from "@/domains/contact/hooks/useContacts"
import {
  useReconQueue,
  useReconSummary,
  useReconRules,
  useProposeAllocation,
  useApproveAllocations,
  type QueueItem,
  type AllocationLinePayload,
} from "../hooks/useReconciliation"
import {
  ProgressHeader,
  QueueList,
  AllocatorPane,
  BulkActionBar,
} from "../components/reconciliation"
import { RulesDrawer } from "../components/RulesDrawer"

type FilterTab = "all" | "unallocated" | "proposed" | "approved"

function workflowStatus(item: QueueItem): string {
  return item.workflow_status || item.reconciliation_status || "unallocated"
}

export function ReconciliationPageV2() {
  usePagePolicies(["banking", "reconciliation"])
  const feedback = useFeedback()
  const location = useLocation()

  // Account selection (from route state or default).
  const [accountId, setAccountId] = useState<number>(() => {
    const state = location.state as { accountId?: number } | null
    return state?.accountId ?? 0
  })

  // Queue state.
  const [filter, setFilter] = useState<FilterTab>("unallocated")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [rulePreviewPattern, setRulePreviewPattern] = useState("")

  // Multi-select.
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const toggleSelected = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Rules drawer.
  const [rulesOpen, setRulesOpen] = useState(false)

  // Data fetching.
  const { data: accounts } = useAccounts()
  const { data: taxCodes } = useTaxCodes()
  const { data: customers } = useCustomers()
  const { data: vendors } = useVendors()
  const { data: queueData, isLoading: queueLoading } = useReconQueue(accountId)
  const { data: summary } = useReconSummary(accountId)
  useReconRules() // prefetch for RulesDrawer

  // Mutations.
  const propose = useProposeAllocation()
  const approve = useApproveAllocations()

  // Account options for Combobox.
  const accountOptions = useMemo(() =>
    (accounts ?? [])
      .filter(a => a.category === "A")
      .map(a => ({ value: String(a.id), label: `${a.accno} — ${a.description}`, detail: "Bank" })),
    [accounts]
  )

  // GL account options (non-asset accounts for allocation).
  const glAccountOptions = useMemo(() =>
    (accounts ?? [])
      .filter(a => a.category !== "A")
      .map(a => ({
        value: String(a.id),
        label: `${a.accno} — ${a.description}`,
        detail: a.category === "I" ? "Income" : a.category === "E" ? "Expense" : a.category,
      })),
    [accounts]
  )

  // Tax code options.
  const taxOptions = useMemo(() =>
    (taxCodes ?? []).map(t => ({ value: String(t.id), label: t.code, detail: `${t.rate}%` })),
    [taxCodes]
  )

  // Contact options (customers + vendors merged).
  const contactOptions = useMemo(() => [
    ...(customers ?? []).map(c => ({ value: String(c.id), label: c.name })),
    ...(vendors ?? []).map(v => ({ value: String(v.id), label: v.name })),
  ], [customers, vendors])

  // Filter + search the queue.
  const filtered = useMemo(() => {
    let items = [...(queueData ?? [])]

    if (filter === "unallocated") items = items.filter(t => {
      const s = workflowStatus(t); return s === "unallocated" || s === "imported"
    })
    else if (filter === "proposed") items = items.filter(t => workflowStatus(t) === "proposed")
    else if (filter === "approved") items = items.filter(t => workflowStatus(t) === "approved")

    if (search) {
      const s = search.toLowerCase()
      items = items.filter(t =>
        t.description.toLowerCase().includes(s) ||
        (t.counterparty_name || "").toLowerCase().includes(s) ||
        String(Math.abs(t.amount)).includes(s)
      )
    }

    return items
  }, [queueData, filter, search])

  // Counts for filter tabs.
  const counts = useMemo(() => ({
    all: (queueData ?? []).length,
    unallocated: (queueData ?? []).filter(t => { const s = workflowStatus(t); return s === "unallocated" || s === "imported" }).length,
    proposed: (queueData ?? []).filter(t => workflowStatus(t) === "proposed").length,
    approved: (queueData ?? []).filter(t => workflowStatus(t) === "approved").length,
  }), [queueData])

  // Rule preview: highlight matching transactions.
  const rulePreviewIds = useMemo(() => {
    if (!rulePreviewPattern) return undefined
    const lc = rulePreviewPattern.toLowerCase()
    const ids = new Set<number>()
    for (const t of (queueData ?? [])) {
      if (workflowStatus(t) !== "unallocated" && workflowStatus(t) !== "imported") continue
      if (t.description.toLowerCase().includes(lc)) ids.add(t.id)
    }
    return ids
  }, [rulePreviewPattern, queueData])

  // Selected transaction.
  const selectedTx = (queueData ?? []).find(t => t.id === selectedId) ?? null

  // Auto-select first unallocated when queue loads.
  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id)
    }
  }, [filtered, selectedId])

  // Clear selection when filter changes.
  useEffect(() => {
    setSelectedIds(new Set())
  }, [filter, accountId])

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault()
        const idx = filtered.findIndex(t => t.id === selectedId)
        if (idx < filtered.length - 1) setSelectedId(filtered[idx + 1].id)
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault()
        const idx = filtered.findIndex(t => t.id === selectedId)
        if (idx > 0) setSelectedId(filtered[idx - 1].id)
      } else if (e.key === "Escape") {
        if (selectedIds.size) setSelectedIds(new Set())
      } else if (e.key === "/") {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('input[placeholder*="Search"]')?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [filtered, selectedId, selectedIds])

  // Advance to next transaction in queue.
  const advanceToNext = useCallback(() => {
    const idx = filtered.findIndex(t => t.id === selectedId)
    if (idx < filtered.length - 1) setSelectedId(filtered[idx + 1].id)
  }, [filtered, selectedId])

  // Save allocation (propose).
  const handleSave = useCallback((txId: number, lines: Array<{ accountId: number | null; taxCodeId: number | null; contactId: number | null; description: string; amount: string }>, createRule: boolean, rulePattern: string) => {
    const payload: AllocationLinePayload[] = lines.filter(l => l.accountId).map(l => ({
      account_id: l.accountId!,
      tax_code_id: l.taxCodeId,
      contact_id: l.contactId,
      description: l.description,
      amount: parseFloat(l.amount) || 0,
    }))

    propose.mutate({
      lineId: txId,
      lines: payload,
      allocation_method: "manual",
      remember_rule: createRule,
      rule_pattern: createRule ? rulePattern : undefined,
      rule_match_type: "contains",
    }, {
      onSuccess: () => {
        feedback.success("Allocation saved")
        advanceToNext()
      },
      onError: (err) => feedback.error("Save failed", err instanceof Error ? err.message : ""),
    })
  }, [propose, feedback, advanceToNext])

  // Approve single transaction.
  const handleApprove = useCallback((txId: number) => {
    approve.mutate({ bank_feed_line_ids: [txId] }, {
      onSuccess: () => {
        feedback.success("Transaction approved")
        advanceToNext()
      },
      onError: (err) => feedback.error("Approve failed", err instanceof Error ? err.message : ""),
    })
  }, [approve, feedback, advanceToNext])

  // Bulk approve.
  const handleBulkApprove = useCallback(() => {
    const ids = Array.from(selectedIds)
    approve.mutate({ bank_feed_line_ids: ids }, {
      onSuccess: () => {
        feedback.success(`Approved ${ids.length} transaction${ids.length === 1 ? "" : "s"}`)
        setSelectedIds(new Set())
      },
      onError: (err) => feedback.error("Bulk approve failed", err instanceof Error ? err.message : ""),
    })
  }, [selectedIds, approve, feedback])

  // Summary stats.
  const bankBalance = summary ? (summary.total_transactions || 0) : 0
  const bookBalance = summary ? (summary.auto_matched + summary.manually_matched) : 0

  if (!accountId && accountOptions.length > 0) {
    // Auto-select first bank account.
    const firstBank = accountOptions[0]
    if (firstBank) setAccountId(parseInt(firstBank.value, 10))
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] overflow-hidden p-4 gap-3">
      {/* Title */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Bank Reconciliation</h1>
        <p className="text-xs text-gray-400">Match bank transactions to your ledger · nothing is posted until approved</p>
      </div>

      {/* Progress header */}
      <ProgressHeader
        total={counts.all}
        approved={counts.approved}
        proposed={counts.proposed}
        unallocated={counts.unallocated}
        accountId={accountId}
        onAccountChange={setAccountId}
        accountOptions={accountOptions}
        bankBalance={bankBalance}
        bookBalance={bookBalance}
      />

      {/* Main split-pane workspace */}
      {queueLoading ? (
        <div className="flex-1 grid grid-cols-2 gap-3">
          <Skeleton className="h-full" />
          <Skeleton className="h-full" />
        </div>
      ) : (
        <div className="relative flex-1 min-h-0 grid grid-cols-[minmax(380px,1fr)_minmax(440px,1.2fr)] gap-3">
          <QueueList
            transactions={filtered}
            selectedId={selectedId}
            onSelect={setSelectedId}
            filter={filter}
            onFilter={setFilter}
            counts={counts}
            search={search}
            onSearch={setSearch}
            rulePreviewIds={rulePreviewIds}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
            onSelectAll={() => setSelectedIds(new Set(filtered.map(t => t.id)))}
            onClearSelection={() => setSelectedIds(new Set())}
          />
          <AllocatorPane
            tx={selectedTx}
            accountOptions={glAccountOptions}
            taxOptions={taxOptions}
            contactOptions={contactOptions}
            onSave={handleSave}
            onApprove={handleApprove}
            onSkip={advanceToNext}
            rulePatternSetter={setRulePreviewPattern}
          />
          <BulkActionBar
            count={selectedIds.size}
            total={filtered.length}
            onSelectAll={() => setSelectedIds(new Set(filtered.map(t => t.id)))}
            onClear={() => setSelectedIds(new Set())}
            onApprove={handleBulkApprove}
          />
        </div>
      )}

      {/* Rules drawer */}
      <RulesDrawer
        open={rulesOpen}
        onClose={() => setRulesOpen(false)}
        queueItems={(queueData ?? []).map(t => ({
          amount: t.amount,
          description: t.description,
          normalized_description: t.normalized_description,
        }))}
      />
    </div>
  )
}
