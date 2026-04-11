import { cn } from "@/shared/lib/utils"

export interface MoneyValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Numeric amount or string parseable as number */
  amount: number | string
  /** ISO 4217 currency code */
  currency?: string
  /** Show the value in red when negative */
  colorNegative?: boolean
  /** Display size */
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base font-medium",
  xl: "text-xl font-semibold",
} as const

const formatter = (currency: string) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  })

export function MoneyValue({
  amount,
  currency = "AUD",
  colorNegative = true,
  size = "md",
  className,
  ...props
}: MoneyValueProps) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  const formatted = formatter(currency).format(num)
  const isNegative = num < 0

  return (
    <span
      className={cn(
        "tabular-nums",
        sizeClasses[size],
        colorNegative && isNegative && "text-red-600",
        className
      )}
      {...props}
    >
      {formatted}
    </span>
  )
}
