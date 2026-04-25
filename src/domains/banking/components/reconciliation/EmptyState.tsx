// Spec references: T-0034-10.
//
// Empty states for the reconciliation page.

import { CheckCircle, Wifi, Upload, Inbox } from "lucide-react"
import { Button } from "@/components/primitives"

interface EmptyStateProps {
  kind: "no-account" | "unconnected" | "no-transactions" | "all-reconciled"
  onConnect?: () => void
  onImport?: () => void
}

export function EmptyState({ kind, onConnect, onImport }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white border border-gray-200 rounded-xl">
      {kind === "no-account" && (
        <>
          <Inbox className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Select a bank account</h3>
          <p className="text-xs text-gray-400 max-w-sm">Choose a bank account from the dropdown above to start reconciling transactions.</p>
        </>
      )}
      {kind === "unconnected" && (
        <>
          <Wifi className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-sm font-semibold text-gray-700 mb-1">No bank feed connected</h3>
          <p className="text-xs text-gray-400 max-w-sm mb-4">Connect a live bank feed to automatically import transactions, or upload a statement file manually.</p>
          <div className="flex gap-2">
            {onConnect && <Button variant="primary" size="sm" onClick={onConnect}><Wifi className="h-3.5 w-3.5" />Connect Bank Feed</Button>}
            {onImport && <Button variant="secondary" size="sm" onClick={onImport}><Upload className="h-3.5 w-3.5" />Upload Statement</Button>}
          </div>
        </>
      )}
      {kind === "no-transactions" && (
        <>
          <Inbox className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-sm font-semibold text-gray-700 mb-1">No transactions to reconcile</h3>
          <p className="text-xs text-gray-400 max-w-sm">Waiting for bank feed sync or statement upload. Transactions will appear here once imported.</p>
        </>
      )}
      {kind === "all-reconciled" && (
        <>
          <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
          <h3 className="text-sm font-semibold text-gray-700 mb-1">All caught up!</h3>
          <p className="text-xs text-gray-400 max-w-sm">Every transaction has been reconciled. New transactions will appear when your bank feed syncs.</p>
        </>
      )}
    </div>
  )
}
