// Spec references: R-0041, R-0068 (PA-034).
//
// Route guard that blocks access to pages requiring a specific feature.
// Shows an upgrade prompt if the feature isn't on the tenant's plan.

import { useFeatures } from "@/hooks/useFeatures"
import { Lock } from "lucide-react"

interface RequireFeatureProps {
  feature: string
  children: React.ReactNode
  /** Optional label for the feature in the upgrade message. */
  label?: string
}

export function RequireFeature({ feature, children, label }: RequireFeatureProps) {
  const { hasFeature, isLoading, allEnabled } = useFeatures()

  // Permissive while loading.
  if (isLoading || allEnabled) return <>{children}</>

  if (!hasFeature(feature)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Lock className="h-7 w-7 text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {label || feature.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} is not available on your plan
        </h2>
        <p className="text-sm text-gray-500 max-w-md mb-6">
          This feature requires a plan upgrade. Contact your administrator
          or upgrade your plan to access {label || feature.replace(/_/g, " ")}.
        </p>
        <a
          href="/au/pricing"
          className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
        >
          View Plans
        </a>
      </div>
    )
  }

  return <>{children}</>
}
