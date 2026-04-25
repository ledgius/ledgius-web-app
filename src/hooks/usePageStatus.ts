// Spec references: R-0008, T-0040 KCS-001..KCS-013, KCS-040..KCS-042.
//
// Fetches operational page status for the current route + active
// period. Pairs with the <PageStatus> widget; both are gated on the
// presence of a non-empty checklist.

import { useQuery } from "@tanstack/react-query"
import { useLocation } from "react-router-dom"
import { api } from "@/shared/lib/api"
import { useActivePeriodOrDefault } from "@/shared/lib/active-period"

/** Mirrors the api `PageStatus` JSON shape. */
export interface PageStatus {
  route: string
  period: string
  title?: string
  summary?: string
  checklist: ChecklistItem[]
  counters: Record<string, unknown>
  next_action?: Action
}

export type ChecklistState = "done" | "pending" | "blocked" | "not_applicable"

export interface ChecklistItem {
  id: string
  label: string
  state: ChecklistState
  evidence?: string
  drill_link?: string
}

export interface Action {
  label: string
  drill_link: string
}

/**
 * Fetches the page-status snapshot for the current route + active
 * period. Returns `undefined` while loading; the widget renders
 * nothing in that window so there's no flash of empty content.
 */
export function usePageStatus(): PageStatus | undefined {
  const location = useLocation()
  const period = useActivePeriodOrDefault()
  const route = location.pathname

  const { data } = useQuery<PageStatus>({
    // Period in the key so an active-period change invalidates and
    // re-fetches alongside the article payload.
    queryKey: ["page-status", route, period],
    queryFn: () =>
      api.get<PageStatus>(
        `/pages/${encodeURIComponent(route)}/status?period=${encodeURIComponent(period)}`,
      ),
    // KCS-041 says the endpoint advertises max-age=30. React-Query
    // honours that via Cache-Control on a fetch — but our api client
    // wrapper short-circuits, so set staleTime to match the advertised
    // freshness explicitly.
    staleTime: 30 * 1000,
    // 404 / 500 / network → return nothing rather than throw; status
    // is decorative, not blocking.
    retry: 1,
    // Don't show stale data from a different page across navigations
    // (different keys handle this; explicit for clarity).
    placeholderData: undefined,
  })

  return data
}
