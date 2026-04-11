import { cn } from "@/shared/lib/utils"
import { AlertCircle, CheckCircle } from "lucide-react"

export interface BalanceIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Total debits */
  debits: number | string
  /** Total credits */
  credits: number | string
  /** ISO 4217 currency code */
  currency?: string
  /** Compact mode shows only the delta */
  compact?: boolean
}

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  })

export function BalanceIndicator({
  debits,
  credits,
  currency = "AUD",
  compact = false,
  className,
  ...props
}: BalanceIndicatorProps) {
  const debitNum = typeof debits === "string" ? parseFloat(debits) : debits
  const creditNum = typeof credits === "string" ? parseFloat(credits) : credits
  const delta = Math.round((debitNum - creditNum) * 100) / 100
  const isBalanced = delta === 0
  const fmt = currencyFormatter(currency)

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium",
          isBalanced ? "text-green-600" : "text-red-600",
          className
        )}
        {...props}
      >
        {isBalanced ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        {isBalanced ? "Balanced" : `Out of balance: ${fmt.format(Math.abs(delta))}`}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3",
        isBalanced ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Debits</span>
            <span className="tabular-nums font-medium text-gray-900">{fmt.format(debitNum)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-600">Credits</span>
            <span className="tabular-nums font-medium text-gray-900">{fmt.format(creditNum)}</span>
          </div>
          <div className="border-t border-current/10 pt-1 flex justify-between gap-4">
            <span className={cn("font-medium", isBalanced ? "text-green-700" : "text-red-700")}>
              Difference
            </span>
            <span className={cn("tabular-nums font-semibold", isBalanced ? "text-green-700" : "text-red-700")}>
              {fmt.format(Math.abs(delta))}
            </span>
          </div>
        </div>
        <div className={cn("shrink-0", isBalanced ? "text-green-500" : "text-red-500")}>
          {isBalanced ? (
            <CheckCircle className="h-8 w-8" />
          ) : (
            <AlertCircle className="h-8 w-8" />
          )}
        </div>
      </div>
    </div>
  )
}
