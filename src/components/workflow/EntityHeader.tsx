import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/shared/lib/utils"
import { StatusPill } from "@/components/financial/StatusPill"
import { DateValue } from "@/components/financial/DateValue"

export interface EntityHeaderProps {
  /** Entity title (e.g. "Invoice INV-0042") */
  title: string
  /** Entity subtitle or description */
  subtitle?: string
  /** Current lifecycle state for StatusPill */
  status?: string
  /** Override StatusPill semantic colour */
  statusSemantic?: React.ComponentProps<typeof StatusPill>["semantic"]
  /** Key date to display (e.g. issue date, transaction date) */
  date?: string | Date
  /** Date label (e.g. "Issued", "Transaction date") */
  dateLabel?: string
  /** Secondary date (e.g. due date) */
  secondaryDate?: string | Date
  /** Secondary date label (e.g. "Due") */
  secondaryDateLabel?: string
  /** Reference number or code */
  reference?: string
  /** Primary action buttons */
  actions?: ReactNode
  /** Path or function for back navigation. True = browser back. */
  backTo?: string | true
  /** Extra metadata badges/pills rendered in the header */
  badges?: ReactNode
  className?: string
}

/**
 * Standard entity page header.
 * Per component_architecture_v1.md section 5.1: title, reference, state pill,
 * due/payment indicators, primary actions.
 */
export function EntityHeader({
  title,
  subtitle,
  status,
  statusSemantic,
  date,
  dateLabel,
  secondaryDate,
  secondaryDateLabel,
  reference,
  actions,
  backTo,
  badges,
  className,
}: EntityHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (backTo === true) {
      navigate(-1)
    } else if (backTo) {
      navigate(backTo)
    }
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      {/* Left: identity */}
      <div className="min-w-0">
        {backTo && (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-gray-900 truncate">{title}</h1>
          {status && <StatusPill status={status} semantic={statusSemantic} />}
          {badges}
        </div>
        {(subtitle || reference) && (
          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
            {reference && <span className="font-mono">{reference}</span>}
            {reference && subtitle && <span aria-hidden="true">&middot;</span>}
            {subtitle && <span>{subtitle}</span>}
          </div>
        )}
        {(date || secondaryDate) && (
          <div className="mt-1.5 flex items-center gap-4 text-sm">
            {date && (
              <div className="flex items-center gap-1.5">
                {dateLabel && <span className="text-gray-400">{dateLabel}:</span>}
                <DateValue value={date} />
              </div>
            )}
            {secondaryDate && (
              <div className="flex items-center gap-1.5">
                {secondaryDateLabel && <span className="text-gray-400">{secondaryDateLabel}:</span>}
                <DateValue value={secondaryDate} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: actions */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
