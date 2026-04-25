// Spec references: R-0065, T-0034-02.
//
// Progress header — shows reconciliation progress with ring gauge,
// account selector, variance, and stat counts.

import { cn } from "@/shared/lib/utils"
import { Combobox } from "@/components/primitives"
import { MoneyValue } from "@/components/financial"
import { RefreshCw } from "lucide-react"

interface ProgressHeaderProps {
  total: number
  approved: number
  proposed: number
  unallocated: number
  accountId: number
  onAccountChange: (id: number) => void
  accountOptions: Array<{ value: string; label: string; detail?: string }>
  bankBalance: number
  bookBalance: number
  lastUpdated?: string
}

export function ProgressHeader({
  total, approved, proposed, unallocated,
  accountId, onAccountChange, accountOptions,
  bankBalance, bookBalance, lastUpdated,
}: ProgressHeaderProps) {
  const pctApproved = total ? Math.round((approved / total) * 100) : 0
  const variance = bankBalance - bookBalance

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-6">
      {/* Ring gauge */}
      <RingGauge pctApproved={pctApproved} total={total} approved={approved} proposed={proposed} />

      {/* Stats */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center gap-4 text-xs">
          <Legend color="bg-green-500" label={`${approved} approved`} />
          <Legend color="bg-blue-400 opacity-60" label={`${proposed} proposed`} />
          <Legend color="bg-amber-400" label={`${unallocated} to review`} />
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {lastUpdated && (
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />Last sync: {lastUpdated}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1" />

      {/* Account selector */}
      <div className="w-64">
        <Combobox
          options={accountOptions}
          value={accountId > 0 ? String(accountId) : ""}
          onChange={(v) => onAccountChange(v ? parseInt(String(v), 10) : 0)}
          placeholder="Select bank account…"
        />
      </div>

      {/* Variance */}
      <div className="text-right space-y-0.5">
        <div className="flex items-center justify-end gap-4 text-xs">
          <div>
            <span className="text-gray-400">Bank </span>
            <MoneyValue amount={bankBalance} className="font-mono text-gray-700" />
          </div>
          <div>
            <span className="text-gray-400">Book </span>
            <MoneyValue amount={bookBalance} className="font-mono text-gray-700" />
          </div>
        </div>
        <div className={cn("text-xs font-semibold tabular-nums", Math.abs(variance) < 0.01 ? "text-green-600" : "text-red-600")}>
          Variance: <MoneyValue amount={variance} />
        </div>
      </div>
    </div>
  )
}

function RingGauge({ pctApproved, total, approved, proposed }: {
  pctApproved: number; total: number; approved: number; proposed: number
}) {
  const size = 80
  const r = (size - 12) / 2
  const c = 2 * Math.PI * r
  const approvedOffset = c - (c * approved) / Math.max(total, 1)
  const combinedOffset = c - (c * (approved + proposed)) / Math.max(total, 1)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#60a5fa" strokeWidth={8}
          strokeDasharray={c} strokeDashoffset={combinedOffset} strokeLinecap="round" opacity={0.4}
          className="transition-all duration-500" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#22c55e" strokeWidth={8}
          strokeDasharray={c} strokeDashoffset={approvedOffset} strokeLinecap="round"
          className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-semibold text-gray-900 tabular-nums">{pctApproved}%</span>
        <span className="text-[10px] text-gray-400 -mt-0.5">reconciled</span>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full", color)} />
      <span className="tabular-nums">{label}</span>
    </span>
  )
}
