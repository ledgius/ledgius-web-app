// Spec references: R-0049 (AC-2, AC-6), A-0025 §"Sync status indicator", T-0026 (T-0026.15).
// Header indicator that summarises the worst-status across all connections.
// Polls every 60s; hides entirely when no connections exist (e.g. tenants
// who haven't enabled bank feeds at all).

import { Link } from "react-router-dom"
import { useBankFeedConnections, worstStatus } from "../hooks/useBankFeed"

export function BankFeedStatusBadge() {
  const { data, isLoading } = useBankFeedConnections({ refetchInterval: 60_000 })

  if (isLoading || !data || data.length === 0) return null

  const worst = worstStatus(data)
  if (!worst) return null

  const { dotClass, label } = describe(worst, data.length)

  return (
    <Link
      to="/settings/bank-feeds"
      className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900"
      title={label}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
      <span className="hidden sm:inline">Bank feeds</span>
    </Link>
  )
}

function describe(status: string, count: number): { dotClass: string; label: string } {
  switch (status) {
    case "active":
      return {
        dotClass: "bg-green-500",
        label: `Bank feeds healthy (${count} connection${count === 1 ? "" : "s"})`,
      }
    case "pending":
      return {
        dotClass: "bg-gray-400",
        label: `${count} bank feed connection${count === 1 ? "" : "s"} awaiting GL mapping`,
      }
    case "expiring":
      return {
        dotClass: "bg-amber-500",
        label: "A bank feed consent expires soon — reauthorise to keep importing",
      }
    case "expired":
    case "error":
    case "disconnected":
      return {
        dotClass: "bg-red-500",
        label: "A bank feed has expired or errored — action required",
      }
    default:
      return { dotClass: "bg-gray-400", label: "Bank feeds" }
  }
}
