import { useEffect, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"
import { useHelpPanel } from "@/components/workflow"

/** The shape returned by GET /api/v1/knowledge/articles?page=&domains= */
export interface ResolvedPage {
  route: string
  articles: ResolvedArticle[]
}

export interface ResolvedArticle {
  id: string
  title: string
  issuer: string
  authority_type: string
  source_url?: string
  effective: { start: string; end?: string }
  sections: ResolvedSection[]
}

export interface ResolvedSection {
  id: string
  heading: string
  body: string
  implemented_by: PublicRule[]
}

export interface PublicRule {
  type: string   // "expression", "policy", or "rule"
  name: string   // e.g. "payroll.payg_coefficient"
}

/**
 * Fetches policy articles for the current page's domains and stores
 * them in the help panel context. Clears on unmount.
 */
export function usePagePolicies(domains: string[]) {
  const { setPolicies } = useHelpPanel()

  // Stable key — sort a copy, never mutate the input.
  const domainsKey = useMemo(() => [...domains].sort().join(","), [domains.join(",")])

  const { data, error } = useQuery<ResolvedPage>({
    queryKey: ["knowledge", "policies", domainsKey],
    queryFn: () =>
      api.get<ResolvedPage>(
        `/knowledge/articles?page=${encodeURIComponent(window.location.pathname)}&domains=${encodeURIComponent(domainsKey)}`
      ),
    enabled: domainsKey.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  })

  useEffect(() => {
    if (error) {
      console.warn("[usePagePolicies] Failed to load policies:", error.message)
    }
  }, [error])

  useEffect(() => {
    if (data) setPolicies(data)
    return () => setPolicies(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])
}
