import { cn } from "@/shared/lib/utils"
import { DateValue } from "@/components/financial/DateValue"
import { Badge } from "@/components/primitives/Badge"

export interface AuditEvent {
  /** Unique event ID */
  id: string | number
  /** Action performed (e.g. "created", "approved", "posted", "payment_allocated") */
  action: string
  /** Human-readable summary */
  summary: string
  /** Who performed the action */
  actor: string
  /** When the action occurred */
  timestamp: string | Date
  /** Field-level changes */
  changes?: AuditFieldChange[]
  /** Related entity references */
  linkedEntities?: AuditLinkedEntity[]
  /** Reason/note if provided */
  reason?: string
}

export interface AuditFieldChange {
  field: string
  before?: string
  after?: string
}

export interface AuditLinkedEntity {
  type: string
  reference: string
  href?: string
}

export interface AuditTimelineProps {
  /** Events in reverse chronological order (most recent first) */
  events: AuditEvent[]
  /** Show loading skeleton */
  loading?: boolean
  /** Max events to show before "Show more" */
  initialLimit?: number
  className?: string
}

const actionLabels: Record<string, { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }> = {
  created: { label: "Created", variant: "default" },
  updated: { label: "Updated", variant: "default" },
  approved: { label: "Approved", variant: "success" },
  posted: { label: "Posted", variant: "success" },
  sent: { label: "Sent", variant: "info" },
  payment_allocated: { label: "Payment", variant: "success" },
  voided: { label: "Voided", variant: "danger" },
  reversed: { label: "Reversed", variant: "danger" },
  rejected: { label: "Rejected", variant: "danger" },
  locked: { label: "Locked", variant: "default" },
  draft_saved: { label: "Draft Saved", variant: "default" },
  imported: { label: "Imported", variant: "default" },
  matched: { label: "Matched", variant: "success" },
  split: { label: "Split", variant: "info" },
  deferred: { label: "Deferred", variant: "warning" },
}

function getActionConfig(action: string) {
  return actionLabels[action] ?? { label: action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), variant: "default" as const }
}

/**
 * Append-only audit event timeline.
 * Per v4 spec section 19.2: create event, field changes, status changes,
 * send/post/pay actions, reversals and linked records, actor + timestamp.
 */
export function AuditTimeline({
  events,
  loading = false,
  className,
}: AuditTimelineProps) {
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-48 bg-gray-200 animate-pulse rounded" />
              <div className="h-3 w-32 bg-gray-200 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className={cn("py-6 text-center text-sm text-gray-500", className)}>
        No activity recorded
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {/* Vertical connector line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" aria-hidden="true" />

      <ol className="space-y-4">
        {events.map((event) => {
          const config = getActionConfig(event.action)
          return (
            <li key={event.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-gray-300 ring-2 ring-gray-100" />

              <div className="text-sm">
                {/* Header: action badge + actor + time */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={config.variant}>{config.label}</Badge>
                  <span className="font-medium text-gray-900">{event.actor}</span>
                  <DateValue value={event.timestamp} format="relative" className="text-xs text-gray-400" />
                </div>

                {/* Summary */}
                <p className="mt-1 text-gray-600">{event.summary}</p>

                {/* Reason */}
                {event.reason && (
                  <p className="mt-1 text-gray-500 italic">&ldquo;{event.reason}&rdquo;</p>
                )}

                {/* Field changes */}
                {event.changes && event.changes.length > 0 && (
                  <div className="mt-2 rounded border border-gray-100 bg-gray-50 text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="px-3 py-1.5 text-left font-medium text-gray-500">Field</th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-500">Before</th>
                          <th className="px-3 py-1.5 text-left font-medium text-gray-500">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {event.changes.map((c, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 font-medium text-gray-600">{c.field}</td>
                            <td className="px-3 py-1.5 text-red-600 line-through">{c.before ?? "\u2014"}</td>
                            <td className="px-3 py-1.5 text-green-600">{c.after ?? "\u2014"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Linked entities */}
                {event.linkedEntities && event.linkedEntities.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {event.linkedEntities.map((le, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <span className="text-gray-400">{le.type}:</span>
                        {le.href ? (
                          <a href={le.href} className="text-primary-600 hover:underline">{le.reference}</a>
                        ) : (
                          <span className="font-mono">{le.reference}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
