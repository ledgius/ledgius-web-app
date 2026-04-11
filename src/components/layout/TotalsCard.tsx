import { cn } from "@/shared/lib/utils"

export interface TotalsRow {
  /** Label for the row (e.g. "Subtotal", "GST", "Total") */
  label: string
  /** Formatted value or ReactNode */
  value: React.ReactNode
  /** Visual emphasis */
  emphasis?: "normal" | "strong" | "muted"
  /** Show a divider above this row */
  divider?: boolean
}

export interface TotalsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card title (e.g. "Invoice Totals") */
  title?: string
  /** Rows to display */
  rows: TotalsRow[]
}

/**
 * Consistent financial totals display card.
 * Used for invoice/bill totals, reconciliation summaries, journal balance.
 * Per v4 spec section 13.3: subtotal, tax total, grand total, payments applied, outstanding.
 */
export function TotalsCard({ title, rows, className, ...props }: TotalsCardProps) {
  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white", className)} {...props}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="px-4 py-3 space-y-0">
        {rows.map((row, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between gap-4 py-1.5",
              row.divider && "border-t border-gray-200 mt-1.5 pt-2.5"
            )}
          >
            <span
              className={cn(
                "text-sm",
                row.emphasis === "strong" ? "font-semibold text-gray-900" : "",
                row.emphasis === "muted" ? "text-gray-400" : "",
                !row.emphasis || row.emphasis === "normal" ? "text-gray-600" : ""
              )}
            >
              {row.label}
            </span>
            <span
              className={cn(
                "text-sm tabular-nums text-right",
                row.emphasis === "strong" ? "font-semibold text-gray-900" : "",
                row.emphasis === "muted" ? "text-gray-400" : "",
                !row.emphasis || row.emphasis === "normal" ? "font-medium text-gray-900" : ""
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
