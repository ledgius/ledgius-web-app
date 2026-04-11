import { cn } from "@/shared/lib/utils"

export interface DateValueProps extends React.HTMLAttributes<HTMLTimeElement> {
  /** Date string or Date object */
  value: string | Date
  /** Display format */
  format?: "short" | "medium" | "long" | "relative"
}

const formatters = {
  short: new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }),
  medium: new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }),
  long: new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
} as const

function relativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffDay > 30) return formatters.medium.format(date)
  if (diffDay > 1) return `${diffDay} days ago`
  if (diffDay === 1) return "yesterday"
  if (diffHr > 1) return `${diffHr}h ago`
  if (diffHr === 1) return "1h ago"
  if (diffMin > 1) return `${diffMin}m ago`
  if (diffMin === 1) return "1m ago"
  return "just now"
}

export function DateValue({
  value,
  format = "medium",
  className,
  ...props
}: DateValueProps) {
  const date = typeof value === "string" ? new Date(value) : value
  const isoString = date.toISOString()

  const display = format === "relative"
    ? relativeTime(date)
    : formatters[format].format(date)

  return (
    <time
      dateTime={isoString}
      className={cn("text-sm text-gray-600 tabular-nums", className)}
      title={formatters.long.format(date)}
      {...props}
    >
      {display}
    </time>
  )
}
