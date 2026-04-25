// Spec references: R-0065, T-0034-04.
//
// AllocatorPane — right pane allocation editor with mode tabs,
// multi-line split, rule creation, and approve/skip actions.

import { useState, useMemo } from "react"
import { cn } from "@/shared/lib/utils"
import { Button, Combobox } from "@/components/primitives"
import { DateValue } from "@/components/financial"
import {
  CheckCircle, Plus, Trash2, Zap, Link2, ArrowLeftRight, Layers,
} from "lucide-react"
import type { QueueItem } from "../../hooks/useReconciliation"

type AllocMode = "auto" | "split" | "link" | "transfer"

interface AllocationLine {
  id: string
  contactId: number | null
  description: string
  accountId: number | null
  taxCodeId: number | null
  amount: string
}

interface AllocatorPaneProps {
  tx: QueueItem | null
  accountOptions: Array<{ value: string; label: string; detail?: string }>
  taxOptions: Array<{ value: string; label: string; detail?: string }>
  contactOptions: Array<{ value: string; label: string }>
  onSave: (txId: number, lines: AllocationLine[], createRule: boolean, rulePattern: string) => void
  onApprove: (txId: number) => void
  onSkip: () => void
  rulePatternSetter?: (pattern: string) => void
}

export function AllocatorPane({
  tx, accountOptions, taxOptions, contactOptions,
  onSave, onApprove, onSkip, rulePatternSetter,
}: AllocatorPaneProps) {
  if (!tx) return <EmptyAllocator />
  return (
    <AllocatorInner
      key={tx.id}
      tx={tx}
      accountOptions={accountOptions}
      taxOptions={taxOptions}
      contactOptions={contactOptions}
      onSave={onSave}
      onApprove={onApprove}
      onSkip={onSkip}
      rulePatternSetter={rulePatternSetter}
    />
  )
}

function EmptyAllocator() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-white border border-gray-200 rounded-xl">
      <CheckCircle className="h-10 w-10 text-green-400 mb-3" />
      <p className="text-sm font-medium text-gray-600 mb-1">Nothing selected</p>
      <p className="text-xs">Choose a transaction from the queue to allocate it.</p>
    </div>
  )
}

function AllocatorInner({
  tx, accountOptions, taxOptions, contactOptions,
  onSave, onApprove, onSkip, rulePatternSetter,
}: AllocatorPaneProps & { tx: QueueItem }) {
  const amount = Math.abs(tx.amount)
  const isDeposit = tx.amount > 0
  const status = tx.workflow_status || tx.reconciliation_status || "unallocated"
  const isApproved = status === "approved"

  const [mode, setMode] = useState<AllocMode>("auto")
  const [lines, setLines] = useState<AllocationLine[]>([{
    id: "l1", contactId: null, description: tx.description,
    accountId: null, taxCodeId: null, amount: amount.toFixed(2),
  }])
  const [createRule, setCreateRule] = useState(false)
  const [rulePattern, setRulePattern] = useState(() =>
    tx.description.split(" ").slice(0, 2).join(" ")
  )
  const [ruleMatchType, setRuleMatchType] = useState("contains")
  const [ruleAmountType, setRuleAmountType] = useState("any")
  const [ruleAmountValue, setRuleAmountValue] = useState("")
  const [ruleAmountMin, setRuleAmountMin] = useState("")
  const [ruleAmountMax, setRuleAmountMax] = useState("")
  const [ruleAmountSet, setRuleAmountSet] = useState("")
  const [ruleDirection, setRuleDirection] = useState("any")

  const subtotal = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const outOfBal = amount - subtotal
  const balanced = Math.abs(outOfBal) < 0.01
  const canSave = balanced && lines.every(l => l.accountId)

  const updateLine = (id: string, field: keyof AllocationLine, value: unknown) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const addLine = () => {
    const remaining = Math.max(0, outOfBal).toFixed(2)
    setLines(prev => [...prev, {
      id: `l${prev.length + 1}_${Date.now()}`,
      contactId: null, description: "", accountId: null, taxCodeId: null, amount: remaining,
    }])
  }

  const removeLine = (id: string) => {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev)
  }

  // Notify parent of rule pattern for queue highlighting.
  useMemo(() => {
    rulePatternSetter?.(createRule ? rulePattern : "")
  }, [createRule, rulePattern, rulePatternSetter])

  const MODE_TABS: Array<{ key: AllocMode; label: string; icon: React.ReactNode }> = [
    { key: "auto", label: "Allocate", icon: <Zap className="h-3 w-3" /> },
    { key: "split", label: "Split", icon: <Layers className="h-3 w-3" /> },
    { key: "link", label: "Link", icon: <Link2 className="h-3 w-3" /> },
    { key: "transfer", label: "Transfer", icon: <ArrowLeftRight className="h-3 w-3" /> },
  ]

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header: transaction summary */}
      <div className="p-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {tx.counterparty_name || tx.normalized_description || tx.description}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{tx.description}</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
              <DateValue value={tx.trans_date} format="short" />
              {tx.reference && <span className="font-mono">{tx.reference}</span>}
              {tx.channel && <span className="text-gray-400">{tx.channel}</span>}
            </div>
          </div>
          <div className="text-right shrink-0 ml-4">
            <span className={cn("text-xl font-bold tabular-nums", isDeposit ? "text-green-700" : "text-gray-900")}>
              {isDeposit ? "+" : "-"}${amount.toFixed(2)}
            </span>
            <p className="text-[10px] text-gray-400 mt-0.5">{isDeposit ? "Deposit" : "Withdrawal"}</p>
          </div>
        </div>
      </div>

      {/* Mode tabs */}
      {!isApproved && (
        <div className="flex border-b border-gray-200">
          {MODE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setMode(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors",
                mode === tab.key ? "border-primary-500 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Allocation lines */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isApproved ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            This transaction has been approved and posted to the ledger.
          </div>
        ) : (
          <>
            {lines.map((line, i) => (
              <div key={line.id} className="space-y-2 p-3 border border-gray-200 rounded-lg bg-gray-50/30">
                {lines.length > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Line {i + 1}</span>
                    <button onClick={() => removeLine(line.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">GL Account</label>
                    <Combobox
                      options={accountOptions}
                      value={line.accountId ? String(line.accountId) : ""}
                      onChange={v => updateLine(line.id, "accountId", v ? parseInt(String(v), 10) : null)}
                      placeholder="Select account…"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Tax Code</label>
                    <Combobox
                      options={taxOptions}
                      value={line.taxCodeId ? String(line.taxCodeId) : ""}
                      onChange={v => updateLine(line.id, "taxCodeId", v ? parseInt(String(v), 10) : null)}
                      placeholder="Tax…"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={line.amount}
                      onChange={e => updateLine(line.id, "amount", e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm tabular-nums text-right"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Contact</label>
                  <Combobox
                    options={contactOptions}
                    value={line.contactId ? String(line.contactId) : ""}
                    onChange={v => updateLine(line.id, "contactId", v ? parseInt(String(v), 10) : null)}
                    placeholder="Optional…"
                  />
                </div>
              </div>
            ))}

            {/* Add line + balance */}
            <div className="flex items-center justify-between">
              <button onClick={addLine} className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                <Plus className="h-3 w-3" />Add line
              </button>
              {!balanced && (
                <span className="text-xs text-red-600 font-medium tabular-nums">
                  {outOfBal > 0 ? `$${outOfBal.toFixed(2)} remaining` : `$${Math.abs(outOfBal).toFixed(2)} over`}
                </span>
              )}
              {balanced && lines.length > 1 && (
                <span className="text-xs text-green-600 font-medium">Balanced ✓</span>
              )}
            </div>

            {/* Create rule toggle */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <label className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={createRule}
                  onChange={e => setCreateRule(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600"
                />
                <span className="text-xs font-medium text-gray-700">Create a rule for this pattern</span>
              </label>

              {createRule && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
                  {/* Pattern + match type */}
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Description Pattern</label>
                      <input
                        type="text"
                        value={rulePattern}
                        onChange={e => setRulePattern(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs"
                        placeholder="e.g. Square Australia"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Match Type</label>
                      <select
                        value={ruleMatchType}
                        onChange={e => setRuleMatchType(e.target.value)}
                        className="bg-white border border-gray-300 rounded px-2 py-1.5 text-xs pr-6"
                      >
                        <option value="contains">Contains</option>
                        <option value="exact">Exact Match</option>
                        <option value="wildcard">Wildcard</option>
                      </select>
                    </div>
                  </div>

                  {/* Amount matching */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Amount Matching</label>
                    <select
                      value={ruleAmountType}
                      onChange={e => setRuleAmountType(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs pr-6 mb-1.5"
                    >
                      <option value="any">Any amount</option>
                      <option value="exact">Exact amount</option>
                      <option value="range">Min / Max range</option>
                      <option value="set">Set of amounts</option>
                    </select>

                    {ruleAmountType === "exact" && (
                      <input
                        type="number"
                        step="0.01"
                        value={ruleAmountValue}
                        onChange={e => setRuleAmountValue(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs tabular-nums text-right"
                        placeholder="e.g. 39.36"
                      />
                    )}

                    {ruleAmountType === "range" && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={ruleAmountMin}
                          onChange={e => setRuleAmountMin(e.target.value)}
                          className="bg-white border border-gray-300 rounded px-2 py-1.5 text-xs tabular-nums text-right"
                          placeholder="Min"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={ruleAmountMax}
                          onChange={e => setRuleAmountMax(e.target.value)}
                          className="bg-white border border-gray-300 rounded px-2 py-1.5 text-xs tabular-nums text-right"
                          placeholder="Max"
                        />
                      </div>
                    )}

                    {ruleAmountType === "set" && (
                      <input
                        type="text"
                        value={ruleAmountSet}
                        onChange={e => setRuleAmountSet(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs"
                        placeholder="e.g. 39.36, 49.00, 79.00"
                      />
                    )}
                  </div>

                  {/* Direction */}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Direction</label>
                    <select
                      value={ruleDirection}
                      onChange={e => setRuleDirection(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-xs pr-6"
                    >
                      <option value="any">Any (deposit or withdrawal)</option>
                      <option value="deposit">Deposits only</option>
                      <option value="withdrawal">Withdrawals only</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            {/* Actions — directly below the rule section */}
            <div className="flex items-center gap-2 pt-2">
              <Button variant="primary" size="sm" disabled={!canSave}
                onClick={() => onSave(tx.id, lines, createRule, rulePattern)}>
                Save & Next
              </Button>
              <Button variant="secondary" size="sm"
                onClick={() => onApprove(tx.id)}>
                Approve
              </Button>
              <Button variant="secondary" size="sm" onClick={onSkip}>
                Skip
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
