import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface AuditEntry {
  id: number
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  created_at: string
}

export function useAuditLog(entityType?: string) {
  const qs = entityType ? `?entity_type=${entityType}` : ""
  return useQuery({
    queryKey: ["audit-log", entityType],
    queryFn: () => api.get<AuditEntry[]>(`/audit-log${qs}`),
  })
}
