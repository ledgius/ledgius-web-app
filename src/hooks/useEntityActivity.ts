import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"
import type { AuditEvent } from "@/components/workflow"

interface AuditLogEntry {
  id: number
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  before_json: Record<string, unknown> | null
  after_json: Record<string, unknown> | null
  created_at: string
}

function toAuditEvent(entry: AuditLogEntry): AuditEvent {
  return {
    id: entry.id,
    action: entry.action,
    summary: `${entry.action} ${entry.entity_type}${entry.entity_id ? ` #${entry.entity_id}` : ""}`,
    actor: entry.user_id ?? "system",
    timestamp: entry.created_at,
  }
}

export function useEntityActivity(entityPath: string, entityId: number | string, enabled = true) {
  return useQuery({
    queryKey: ["activity", entityPath, entityId],
    queryFn: async () => {
      const entries = await api.get<AuditLogEntry[]>(`/${entityPath}/${entityId}/activity`)
      return entries.map(toAuditEvent)
    },
    enabled: enabled && !!entityId,
  })
}
