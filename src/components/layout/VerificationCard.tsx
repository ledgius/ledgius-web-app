import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export interface VerificationBlocker {
  message: string
}

export interface VerificationWarning {
  message: string
}

export interface AccountEffect {
  /** Account code or name */
  account: string
  /** Debit amount (positive) or null */
  debit?: number | null
  /** Credit amount (positive) or null */
  credit?: number | null
}

export interface VerificationResult {
  /** Issues that prevent commit */
  blockers: VerificationBlocker[]
  /** Issues that should be reviewed but don't prevent commit */
  warnings: VerificationWarning[]
  /** Accounts that will be affected */
  accountsAffected: AccountEffect[]
  /** Tax impact summary lines */
  taxImpact?: string[]
  /** Posting period affected */
  periodImpact?: string
  /** State the entity will transition to */
  stateAfter?: string
}

export interface VerificationCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card title */
  title?: string
  /** Verification data */
  result: VerificationResult
  /** ISO 4217 currency code */
  currency?: string
}

const currencyFormatter = (currency: string) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  })

/**
 * Pre-commit verification panel showing posting impact.
 * Per v4 spec section 2.2: accounts affected, tax effect, totals, balance effect,
 * period/date effect, locking implications.
 */
export function VerificationCard({
  title = "Posting Impact",
  result,
  currency = "AUD",
  className,
  ...props
}: VerificationCardProps) {
  const { blockers, warnings, accountsAffected, taxImpact, periodImpact, stateAfter } = result
  const hasBlockers = blockers.length > 0
  const hasWarnings = warnings.length > 0
  const fmt = currencyFormatter(currency)

  return (
    <div
      className={cn(
        "rounded-lg border bg-white overflow-hidden",
        hasBlockers ? "border-red-200" : hasWarnings ? "border-amber-200" : "border-gray-200",
        className
      )}
      {...props}
    >
      <div className={cn(
        "px-4 py-3 border-b",
        hasBlockers ? "bg-red-50 border-red-200" : hasWarnings ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"
      )}>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Blockers */}
        {hasBlockers && (
          <div className="space-y-1.5">
            {blockers.map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{b.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className="space-y-1.5">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Accounts affected */}
        {accountsAffected.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Accounts affected</h4>
            <div className="space-y-1">
              {accountsAffected.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{a.account}</span>
                  <div className="flex gap-4 tabular-nums">
                    {a.debit != null && <span className="text-gray-900">{fmt.format(a.debit)} Dr</span>}
                    {a.credit != null && <span className="text-gray-900">{fmt.format(a.credit)} Cr</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tax impact */}
        {taxImpact && taxImpact.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Tax effect</h4>
            <ul className="space-y-1 text-sm text-gray-700">
              {taxImpact.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        )}

        {/* Period + state */}
        {(periodImpact || stateAfter) && (
          <div className="flex items-center gap-4 text-sm border-t border-gray-100 pt-3">
            {periodImpact && (
              <div className="text-gray-600">
                <span className="font-medium text-gray-700">Period:</span> {periodImpact}
              </div>
            )}
            {stateAfter && (
              <div className="text-gray-600">
                <span className="font-medium text-gray-700">State after:</span> {stateAfter}
              </div>
            )}
          </div>
        )}

        {/* All clear */}
        {!hasBlockers && !hasWarnings && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="h-4 w-4" />
            Ready to post
          </div>
        )}
      </div>
    </div>
  )
}
