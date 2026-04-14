import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { PageShell, PageSection } from "@/components/layout"
import { Badge } from "@/components/primitives"
import { api } from "@/shared/lib/api"
import { Bug, Lightbulb, Heart, HelpCircle, MessageSquare } from "lucide-react"

interface FeedbackDetail {
  id: number
  user_name: string
  page_route: string
  feature_area: string
  feedback_type: string
  title: string
  body: string
  status: string
  vote_count: number
  screenshot_data: string | null
  comments: { id: number; user_name: string; body: string; created_at: string }[]
  created_at: string
  updated_at: string
}

const typeConfig: Record<string, { icon: typeof Bug; label: string; color: string }> = {
  bug: { icon: Bug, label: "Bug", color: "bg-red-50 text-red-700 border-red-200" },
  suggestion: { icon: Lightbulb, label: "Suggestion", color: "bg-amber-50 text-amber-700 border-amber-200" },
  praise: { icon: Heart, label: "Praise", color: "bg-green-50 text-green-700 border-green-200" },
  question: { icon: HelpCircle, label: "Question", color: "bg-blue-50 text-blue-700 border-blue-200" },
}

const statusConfig: Record<string, { label: string; variant: "default" | "info" | "success" | "warning" }> = {
  open: { label: "Open", variant: "default" },
  acknowledged: { label: "Acknowledged", variant: "info" },
  in_progress: { label: "In Progress", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  wont_fix: { label: "Won't Fix", variant: "default" },
}

export function FeedbackStatusPage() {
  const { id } = useParams<{ id: string }>()
  const feedbackId = parseInt(id ?? "0", 10)

  const { data: item, isLoading, error } = useQuery({
    queryKey: ["feedback", feedbackId],
    queryFn: () => api.get<FeedbackDetail>(`/feedback/${feedbackId}`),
    enabled: feedbackId > 0,
  })

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Feedback Status</h1>
        <span className="text-sm font-mono text-gray-500">FB-{feedbackId}</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Track the status of a feedback item</p>
    </div>
  )

  if (isLoading) {
    return (
      <PageShell header={header}>
        <p className="text-sm text-gray-400">Loading...</p>
      </PageShell>
    )
  }

  if (error || !item) {
    return (
      <PageShell header={header}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Feedback item FB-{feedbackId} not found.
        </div>
      </PageShell>
    )
  }

  const typeCfg = typeConfig[item.feedback_type] ?? { icon: MessageSquare, label: item.feedback_type, color: "bg-gray-50 text-gray-700 border-gray-200" }
  const statusCfg = statusConfig[item.status] ?? { label: item.status, variant: "default" as const }
  const Icon = typeCfg.icon

  return (
    <PageShell header={header}>
      {/* Status banner */}
      <div className={`rounded-lg border p-4 mb-6 ${typeCfg.color}`}>
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500">FB-{item.id}</span>
              <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
              <span className="text-xs text-gray-500">{item.vote_count} vote{item.vote_count !== 1 ? "s" : ""}</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
            {item.body && (
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{item.body}</p>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <PageSection title="Details">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-gray-500 text-right">Page</dt>
          <dd className="font-mono text-xs bg-gray-50 px-2 py-0.5 rounded w-fit">{item.page_route}</dd>
          <dt className="text-gray-500 text-right">Type</dt>
          <dd className="capitalize">{typeCfg.label}</dd>
          <dt className="text-gray-500 text-right">Submitted by</dt>
          <dd>{item.user_name || "anonymous"}</dd>
          <dt className="text-gray-500 text-right">Submitted</dt>
          <dd>{new Date(item.created_at).toLocaleString("en-AU")}</dd>
          <dt className="text-gray-500 text-right">Last updated</dt>
          <dd>{new Date(item.updated_at).toLocaleString("en-AU")}</dd>
          <dt className="text-gray-500 text-right">Status</dt>
          <dd><Badge variant={statusCfg.variant}>{statusCfg.label}</Badge></dd>
        </dl>
      </PageSection>

      {/* Screenshot */}
      {item.screenshot_data && (
        <PageSection title="Screenshot">
          <img src={item.screenshot_data} className="max-w-full rounded border border-gray-200" alt="Screenshot" />
        </PageSection>
      )}

      {/* Comments */}
      <PageSection title={`Comments (${item.comments?.length ?? 0})`}>
        {item.comments && item.comments.length > 0 ? (
          <div className="space-y-3">
            {item.comments.map(c => (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-700">{c.user_name || "anonymous"}</span>
                  <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString("en-AU")}</span>
                </div>
                <p className="text-sm text-gray-600">{c.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No comments yet. We'll update you when there's progress.</p>
        )}
      </PageSection>
    </PageShell>
  )
}
