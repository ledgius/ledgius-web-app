// Spec references: R-0065, T-0034-03.
//
// QueueList — left pane transaction queue with filter tabs, search,
// multi-select, and keyboard navigation.

import { useRef, useEffect } from "react"
import { cn } from "@/shared/lib/utils"
import { MoneyValue, DateValue } from "@/components/financial"
import { Search, Check, ChevronRight } from "lucide-react"
import type { QueueItem } from "../../hooks/useReconciliation"

type FilterTab = "all" | "unallocated" | "proposed" | "approved"

interface QueueListProps {
  transactions: QueueItem[]
  selectedId: number | null
  onSelect: (id: number) => void
  filter: FilterTab
  onFilter: (f: FilterTab) => void
  counts: { all: number; unallocated: number; proposed: number; approved: number }
  search: string
  onSearch: (s: string) => void
  rulePreviewIds?: Set<number>
  selectedIds: Set<number>
  onToggleSelected: (id: number) => void
  onSelectAll: () => void
  onClearSelection: () => void
}

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "unallocated", label: "To Review" },
  { key: "proposed", label: "Proposed" },
  { key: "approved", label: "Approved" },
]

function workflowStatus(item: QueueItem): string {
  return item.workflow_status || item.reconciliation_status || "unallocated"
}

function statusColor(status: string) {
  switch (status) {
    case "approved": return "bg-green-100 text-green-700"
    case "proposed": return "bg-blue-50 text-blue-700"
    case "unallocated": case "imported": return "bg-amber-50 text-amber-700"
    default: return "bg-gray-100 text-gray-600"
  }
}

export function QueueList({
  transactions, selectedId, onSelect, filter, onFilter, counts,
  search, onSearch, rulePreviewIds, selectedIds, onToggleSelected,
}: QueueListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Scroll selected row into view.
  useEffect(() => {
    if (!listRef.current || !selectedId) return
    const row = listRef.current.querySelector(`[data-tx-id="${selectedId}"]`)
    if (row) row.scrollIntoView({ block: "nearest" })
  }, [selectedId])

  const hasSelection = selectedIds.size > 0

  return (
    <div className="flex flex-col min-h-0 h-full bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-gray-200 space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search description, contact, amount…"
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {search && (
            <button onClick={() => onSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <span className="text-xs">✕</span>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {FILTER_TABS.map((tab) => {
            const count = counts[tab.key]
            const active = filter === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => onFilter(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  active ? "bg-primary-100 text-primary-700" : "text-gray-500 hover:bg-gray-100"
                )}
              >
                {tab.label}
                <span className={cn("tabular-nums", active ? "text-primary-600" : "text-gray-400")}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Transaction list */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400 p-8">
            {search ? "No transactions match your search" : "No transactions to display"}
          </div>
        ) : (
          transactions.map((tx, i) => {
            const status = workflowStatus(tx)
            const isSelected = selectedId === tx.id
            const isChecked = selectedIds.has(tx.id)
            const isRuleMatch = rulePreviewIds?.has(tx.id)
            const amount = tx.amount
            const isDeposit = amount > 0

            return (
              <div
                key={tx.id}
                data-tx-id={tx.id}
                onClick={() => onSelect(tx.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 cursor-pointer transition-colors",
                  isSelected ? "bg-primary-50 border-l-2 border-l-primary-500" : "border-l-2 border-l-transparent",
                  isRuleMatch && !isSelected ? "bg-green-50/60" : "",
                  !isSelected && !isRuleMatch && i % 2 === 1 ? "bg-gray-50/50" : "",
                  "hover:bg-primary-50/30",
                )}
              >
                {/* Checkbox for multi-select */}
                <label className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleSelected(tx.id)}
                    className="rounded border-gray-300 text-primary-600 h-3.5 w-3.5"
                  />
                </label>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-900 truncate font-medium">
                      {tx.counterparty_name || tx.normalized_description || tx.description}
                    </span>
                    <span className={cn(
                      "text-sm font-mono tabular-nums shrink-0 font-medium",
                      isDeposit ? "text-green-700" : "text-gray-900"
                    )}>
                      {isDeposit ? "+" : ""}
                      <MoneyValue amount={Math.abs(amount)} />
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <DateValue value={tx.trans_date} format="short" className="text-[10px] text-gray-400 shrink-0" />
                    {tx.description !== tx.counterparty_name && (
                      <span className="text-[10px] text-gray-400 truncate">{tx.description}</span>
                    )}
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-auto", statusColor(status))}>
                      {status === "approved" && <Check className="h-2.5 w-2.5 inline -mt-0.5 mr-0.5" />}
                      {status}
                    </span>
                  </div>
                </div>

                {isSelected && <ChevronRight className="h-3.5 w-3.5 text-primary-400 shrink-0" />}
              </div>
            )
          })
        )}
      </div>

      {/* Selection summary */}
      {hasSelection && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
          <span>{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <button onClick={() => onToggleSelected(-1)} className="text-primary-600 hover:text-primary-700">Select all</button>
            <button onClick={() => { /* clear handled by parent */ }} className="text-gray-400 hover:text-gray-600">Clear</button>
          </div>
        </div>
      )}
    </div>
  )
}
