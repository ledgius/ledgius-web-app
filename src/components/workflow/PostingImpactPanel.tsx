import { VerificationCard, type VerificationResult } from "@/components/layout/VerificationCard"
import { PageSection } from "@/components/layout/PageSection"

export interface PostingImpactPanelProps {
  /** Verification result from preflight check */
  result: VerificationResult
  /** ISO 4217 currency code */
  currency?: string
  /** Whether the panel is loading (preflight in progress) */
  loading?: boolean
  className?: string
}

/**
 * Posting impact panel for use in entity page aside regions.
 * Wraps VerificationCard in a PageSection for consistent presentation.
 * Per v4 spec section 2.2 and component_architecture_v1.md section 5.1.
 */
export function PostingImpactPanel({
  result,
  currency = "AUD",
  loading = false,
  className,
}: PostingImpactPanelProps) {
  if (loading) {
    return (
      <PageSection title="Posting Impact" className={className}>
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-2/3 bg-gray-200 rounded" />
        </div>
      </PageSection>
    )
  }

  return (
    <VerificationCard
      result={result}
      currency={currency}
      className={className}
    />
  )
}

export type { VerificationResult }
