// Spec references: R-0054, A-0030, T-0028 §"Phase 5".
//
// React Query hook for the LSMB migration status admin endpoint.
// Endpoint contract: see ledgius-api/internal/admin/migration/parser.go
// (StatusReport + LiveDBSnapshot types).

import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface MigrationStatus {
  total: number
  by_status: Record<string, number>
  by_risk_tier: Record<string, number>
  completeness_pct: number
  in_use_high_risk: ArtifactRef[]
  inventory_source: string
  live_db?: LiveDBSnapshot
}

export interface ArtifactRef {
  name: string
  kind: string
  risk_tier: string
}

export interface LiveDBSnapshot {
  trigger_count: number
  function_count: number
  view_count: number
  drift_in_db_not_in_inventory: string[] | null
  drift_inventory_dropped_but_present: string[] | null
  captured_at: string
  source: string
  error?: string
}

export function useMigrationStatus() {
  return useQuery({
    queryKey: ["admin", "migration-status"],
    queryFn: () => api.get<MigrationStatus>("/admin/migration-status"),
    // Backend caches the live snapshot for 5 min — no need to poll faster.
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60 * 1000,
  })
}
