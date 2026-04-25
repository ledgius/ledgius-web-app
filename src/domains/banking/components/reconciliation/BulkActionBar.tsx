// Spec references: R-0065, T-0034-05.
//
// BulkActionBar — bottom action bar for multi-select operations.
// Slides up when selection > 0.

import { Button } from "@/components/primitives"
import { CheckCircle, X } from "lucide-react"

interface BulkActionBarProps {
  count: number
  total: number
  onSelectAll: () => void
  onClear: () => void
  onApprove: () => void
}

export function BulkActionBar({ count, total, onSelectAll, onClear, onApprove }: BulkActionBarProps) {
  if (count === 0) return null

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-300 shadow-lg px-4 py-2.5 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium text-gray-900 tabular-nums">{count} selected</span>
        <button onClick={onSelectAll} className="text-xs text-primary-600 hover:text-primary-700">
          {count < total ? "Select all" : ""}
        </button>
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5">
          <X className="h-3 w-3" />Clear
        </button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={onApprove}>
          <CheckCircle className="h-3.5 w-3.5" />Approve {count}
        </Button>
      </div>
    </div>
  )
}
