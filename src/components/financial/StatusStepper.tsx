import { cn } from "@/shared/lib/utils"
import { Check } from "lucide-react"

export interface StatusStep {
  /** State key (e.g. "draft", "sent", "paid") */
  key: string
  /** Display label */
  label: string
}

export interface StatusStepperProps {
  /** Ordered list of steps in this entity's lifecycle */
  steps: StatusStep[]
  /** The current state key */
  currentStatus: string
  /** Optional: steps that were skipped (e.g. went from Sent → Paid, skipping PartPaid) */
  skippedSteps?: string[]
  /** Optional: called when a completed step is clicked (for back navigation) */
  onStepClick?: (stepKey: string) => void
  className?: string
}

/**
 * Horizontal lifecycle stepper for accounting entities.
 * Shows completed, current, and future steps with visual indicators.
 *
 * Per accounting_state_machine_spec_v1.md — each entity type has
 * a defined lifecycle. This component makes the current position
 * and progression history visible at a glance.
 */
export function StatusStepper({
  steps,
  currentStatus,
  skippedSteps = [],
  onStepClick,
  className,
}: StatusStepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStatus)

  return (
    <div className={cn("flex items-center w-full", className)}>
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex
        const isCurrent = i === currentIndex
        const isFuture = i > currentIndex
        const isSkipped = skippedSteps.includes(step.key)
        const isLast = i === steps.length - 1

        return (
          <div
            key={step.key}
            className={cn("flex items-center", !isLast && "flex-1")}
          >
            {/* Step indicator */}
            <div
              className={cn("flex flex-col items-center", isCompleted && onStepClick && "cursor-pointer")}
              onClick={() => isCompleted && onStepClick?.(step.key)}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "h-6 w-6 border-primary-500 bg-primary-500 text-white",
                  isCompleted && onStepClick && "hover:ring-2 hover:ring-primary-200",
                  isCurrent && "h-7 w-7 border-primary-500 bg-primary-50 text-primary-700 ring-4 ring-primary-100",
                  isFuture && !isSkipped && "h-6 w-6 border-gray-300 bg-white text-gray-300",
                  isSkipped && "h-6 w-6 border-gray-200 bg-gray-100 text-gray-300",
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                ) : isCurrent ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                ) : null}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-[10px] font-medium whitespace-nowrap",
                  isCompleted && "text-primary-600",
                  isCurrent && "text-primary-700 font-semibold",
                  isFuture && "text-gray-400",
                  isSkipped && "text-gray-300 line-through",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mt-[-1rem]",
                  i < currentIndex ? "bg-primary-400" : "bg-gray-200",
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Pre-defined lifecycle steps for common entity types.
 * Derived from accounting_state_machine_spec_v1.md.
 */
export const lifecycleSteps = {
  invoice: [
    { key: "draft", label: "Draft" },
    { key: "approved", label: "Approved" },
    { key: "sent", label: "Sent" },
    { key: "paid", label: "Paid" },
    { key: "locked", label: "Locked" },
  ],
  bill: [
    { key: "draft", label: "Draft" },
    { key: "approved", label: "Approved" },
    { key: "scheduled", label: "Scheduled" },
    { key: "paid", label: "Paid" },
    { key: "locked", label: "Locked" },
  ],
  journal: [
    { key: "draft", label: "Draft" },
    { key: "posted", label: "Posted" },
    { key: "reversed", label: "Reversed" },
    { key: "locked", label: "Locked" },
  ],
  bankLine: [
    { key: "imported", label: "Imported" },
    { key: "suggested", label: "Suggested" },
    { key: "matched", label: "Matched" },
    { key: "reconciled", label: "Reconciled" },
  ],
} as const
