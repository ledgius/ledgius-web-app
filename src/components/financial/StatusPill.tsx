import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/utils"

/**
 * Status semantic groups derived from accounting_state_machine_spec_v1.md.
 *
 * - muted:    Draft, Imported, Pending — no financial commitment yet
 * - info:     Approved, Suggested, Scheduled — validated, awaiting action
 * - active:   Sent, Matched, Split, Created — live / in-flight
 * - warning:  Overdue, PartPaid, ChangesRequested, SoftClosed, Deferred — needs attention
 * - success:  Paid, Reconciled, Posted — financially resolved
 * - danger:   Voided, Rejected, Excluded — cancelled or blocked
 * - locked:   Locked, HardClosed, Reversed — terminal / immutable
 */
const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      semantic: {
        muted: "bg-gray-100 text-gray-600",
        info: "bg-primary-50 text-primary-700",
        active: "bg-primary-100 text-primary-800",
        warning: "bg-amber-50 text-amber-700",
        success: "bg-green-50 text-green-700",
        danger: "bg-red-50 text-red-700",
        locked: "bg-gray-200 text-gray-500",
      },
    },
    defaultVariants: {
      semantic: "muted",
    },
  }
)

/** Maps entity lifecycle states to semantic colour groups */
const stateSemanticMap: Record<string, NonNullable<VariantProps<typeof statusPillVariants>["semantic"]>> = {
  // Lifecycle — pre-commit
  draft: "muted",
  imported: "muted",
  pending: "muted",

  // Lifecycle — validated
  approved: "info",
  suggested: "info",
  scheduled: "info",

  // Lifecycle — in-flight
  sent: "active",
  matched: "active",
  split: "active",
  created: "active",
  active: "active",
  open: "active",

  // Lifecycle — attention needed
  overdue: "warning",
  partpaid: "warning",
  part_paid: "warning",
  changesrequested: "warning",
  changes_requested: "warning",
  softclosed: "warning",
  soft_closed: "warning",
  deferred: "warning",
  onhold: "warning",
  on_hold: "warning",
  escalated: "warning",

  // Lifecycle — resolved
  paid: "success",
  reconciled: "success",
  posted: "success",

  // Lifecycle — cancelled
  voided: "danger",
  rejected: "danger",
  excluded: "danger",
  cancelled: "danger",

  // Lifecycle — terminal
  locked: "locked",
  hardclosed: "locked",
  hard_closed: "locked",
  reversed: "locked",
  archived: "locked",
}

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The entity state value (e.g. "draft", "sent", "paid") */
  status: string
  /** Override the auto-detected semantic colour */
  semantic?: VariantProps<typeof statusPillVariants>["semantic"]
  /** Optional leading dot indicator */
  dot?: boolean
}

function formatLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusPill({
  status,
  semantic,
  dot = true,
  className,
  ...props
}: StatusPillProps) {
  const resolvedSemantic = semantic ?? stateSemanticMap[status.toLowerCase()] ?? "muted"
  const label = formatLabel(status)

  const dotColorMap: Record<string, string> = {
    muted: "bg-gray-400",
    info: "bg-primary-500",
    active: "bg-primary-600",
    warning: "bg-amber-500",
    success: "bg-green-500",
    danger: "bg-red-500",
    locked: "bg-gray-400",
  }

  return (
    <span
      className={cn(statusPillVariants({ semantic: resolvedSemantic }), className)}
      {...props}
    >
      {dot && (
        <span className={cn("inline-block h-1.5 w-1.5 rounded-full", dotColorMap[resolvedSemantic])} />
      )}
      {label}
    </span>
  )
}

export { statusPillVariants, stateSemanticMap }
