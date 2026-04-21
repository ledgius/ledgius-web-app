// Spec references: R-0041, R-0068 (PA-031, PA-034).
//
// Feature gating hook. Fetches the tenant's enabled features from the API
// and provides hasFeature() for conditional rendering.
//
// Usage:
//   const { hasFeature, allEnabled, isLoading } = useFeatures()
//   if (hasFeature("payroll")) { ... }
//
// When allEnabled is true (single-tenant, trial, or no plan), all features
// are accessible. The hook does NOT block — it returns permissive defaults
// while loading.

import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

interface FeaturesResponse {
  features: string[]
  all_enabled: boolean
}

let _cachedFeatures: FeaturesResponse | null = null

export function useFeatures() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-features"],
    queryFn: async () => {
      const result = await api.get<FeaturesResponse>("/features")
      _cachedFeatures = result
      return result
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    refetchOnWindowFocus: false,
  })

  const features = data ?? _cachedFeatures
  const allEnabled = features?.all_enabled ?? true
  const featureSet = new Set(features?.features ?? [])

  return {
    /** Check if a specific feature is enabled for this tenant's plan. */
    hasFeature: (slug: string): boolean => {
      if (allEnabled) return true
      return featureSet.has(slug)
    },
    /** True when all features are available (trial, single-tenant, no plan). */
    allEnabled,
    /** The raw list of enabled feature slugs. */
    features: features?.features ?? [],
    /** True while the initial fetch is in progress. */
    isLoading,
  }
}

// Static accessor for use outside React components (e.g. sidebar filtering).
export function hasFeatureStatic(slug: string): boolean {
  if (!_cachedFeatures) return true // permissive until loaded
  if (_cachedFeatures.all_enabled) return true
  return _cachedFeatures.features.includes(slug)
}
