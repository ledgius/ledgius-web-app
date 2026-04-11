import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/components/primitives/Badge"
import { MoneyValue } from "@/components/financial/MoneyValue"

export interface DecisionQueueItem {
  /** Unique item ID */
  id: string | number
  /** Primary label (e.g. "14 bank lines unmatched") */
  label: string
  /** Financial magnitude if meaningful */
  amount?: number | string
  /** Currency for amount */
  currency?: string
  /** Urgency or count badge */
  count?: number
  /** Age or urgency text (e.g. "oldest 5 days") */
  urgency?: string
  /** Direct action label (e.g. "Review now") */
  actionLabel?: string
  /** Called when the action is clicked */
  onAction?: () => void
  /** Called when the item row is clicked */
  onClick?: () => void
  /** Badge variant for urgency colouring */
  variant?: React.ComponentProps<typeof Badge>["variant"]
}

export interface DecisionQueueProps {
  /** Queue title (e.g. "Reconciliation Queue") */
  title?: string
  /** Queue items sorted by urgency */
  items: DecisionQueueItem[]
  /** Show when the queue is empty */
  emptyMessage?: string
  /** Additional action in the header */
  headerAction?: ReactNode
  /** Hide the card entirely when empty */
  hideWhenEmpty?: boolean
  className?: string
}

/**
 * Actionable work queue card for dashboards and work surfaces.
 * Per v4 spec section 11.5: issue count, financial magnitude, age/urgency, one direct action.
 */
export function DecisionQueue({
  title,
  items,
  emptyMessage = "All clear — nothing requires attention.",
  headerAction,
  hideWhenEmpty = false,
  className,
}: DecisionQueueProps) {
  if (hideWhenEmpty && items.length === 0) return null

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white", className)}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          {title && <h3 className="text-sm font-semibold text-gray-900">{title}</h3>}
          {headerAction}
        </div>
      )}

      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                item.onClick && "cursor-pointer hover:bg-gray-50 transition-colors"
              )}
              onClick={item.onClick}
            >
              {/* Count badge */}
              {item.count != null && (
                <Badge variant={item.variant ?? "warning"} className="shrink-0 tabular-nums">
                  {item.count}
                </Badge>
              )}

              {/* Label + urgency */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{item.label}</p>
                {item.urgency && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.urgency}</p>
                )}
              </div>

              {/* Amount */}
              {item.amount != null && (
                <MoneyValue
                  amount={item.amount}
                  currency={item.currency}
                  size="sm"
                  className="shrink-0 font-medium"
                />
              )}

              {/* Action link */}
              {item.actionLabel && item.onAction && (
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation()
                    item.onAction?.()
                  }}
                >
                  {item.actionLabel}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
