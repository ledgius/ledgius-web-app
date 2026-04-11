import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export interface DeltaValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The change amount */
  value: number | string
  /** Format as currency (default) or raw number */
  format?: "currency" | "number" | "percent"
  /** ISO 4217 currency code when format is currency */
  currency?: string
  /** Invert colour semantics (e.g. expenses where increase is bad) */
  invertColor?: boolean
}

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    signDisplay: "always",
  })

const numberFormatter = new Intl.NumberFormat("en-AU", {
  signDisplay: "always",
  minimumFractionDigits: 2,
})

const percentFormatter = new Intl.NumberFormat("en-AU", {
  style: "percent",
  signDisplay: "always",
  minimumFractionDigits: 1,
})

export function DeltaValue({
  value,
  format = "currency",
  currency = "AUD",
  invertColor = false,
  className,
  ...props
}: DeltaValueProps) {
  const num = typeof value === "string" ? parseFloat(value) : value
  const isPositive = num > 0
  const isZero = num === 0

  let formatted: string
  if (format === "currency") {
    formatted = currencyFormatter(currency).format(num)
  } else if (format === "percent") {
    formatted = percentFormatter.format(num / 100)
  } else {
    formatted = numberFormatter.format(num)
  }

  const colorClass = isZero
    ? "text-gray-500"
    : (isPositive !== invertColor)
      ? "text-green-600"
      : "text-red-600"

  const Icon = isZero ? Minus : isPositive ? ArrowUp : ArrowDown

  return (
    <span
      className={cn("inline-flex items-center gap-1 tabular-nums text-sm font-medium", colorClass, className)}
      {...props}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatted}
    </span>
  )
}
