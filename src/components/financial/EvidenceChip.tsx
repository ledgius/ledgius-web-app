import { Check, CalendarDays, Hash, User, TrendingUp, HelpCircle } from "lucide-react"
import { cn } from "@/shared/lib/utils"

/**
 * Evidence types used in reconciliation matching.
 * Each type maps to an icon and label for consistent rendering.
 */
export type EvidenceType =
  | "exact_amount"
  | "date_proximity"
  | "reference_match"
  | "contact_match"
  | "pattern_match"
  | "custom"

const evidenceConfig: Record<EvidenceType, { icon: typeof Check; label: string }> = {
  exact_amount: { icon: Check, label: "Exact amount" },
  date_proximity: { icon: CalendarDays, label: "Date match" },
  reference_match: { icon: Hash, label: "Reference match" },
  contact_match: { icon: User, label: "Contact match" },
  pattern_match: { icon: TrendingUp, label: "Pattern match" },
  custom: { icon: HelpCircle, label: "Evidence" },
}

export type ConfidenceBucket = "exact" | "strong" | "possible" | "weak"

const confidenceClasses: Record<ConfidenceBucket, string> = {
  exact: "bg-green-50 text-green-700 border-green-200",
  strong: "bg-primary-50 text-primary-700 border-primary-200",
  possible: "bg-amber-50 text-amber-700 border-amber-200",
  weak: "bg-gray-50 text-gray-500 border-gray-200",
}

export interface EvidenceChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The type of evidence */
  type: EvidenceType
  /** Confidence bucket for colour coding */
  confidence?: ConfidenceBucket
  /** Optional detail text shown after the label */
  detail?: string
  /** Override the default label */
  label?: string
}

export function EvidenceChip({
  type,
  confidence = "possible",
  detail,
  label,
  className,
  ...props
}: EvidenceChipProps) {
  const config = evidenceConfig[type]
  const Icon = config.icon
  const displayLabel = label ?? config.label

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        confidenceClasses[confidence],
        className
      )}
      {...props}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {displayLabel}
      {detail && (
        <span className="font-normal opacity-75">{detail}</span>
      )}
    </span>
  )
}
