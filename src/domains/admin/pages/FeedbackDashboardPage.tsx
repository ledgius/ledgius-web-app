import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usePageHelp } from "@/hooks/usePageHelp"
import { PageShell, PageSection } from "@/components/layout"
import { Badge } from "@/components/primitives"
import { api } from "@/shared/lib/api"
import {
  Bug, Lightbulb, Heart, HelpCircle, ThumbsUp,
  MessageSquare, ChevronDown, ChevronRight, Image,
} from "lucide-react"

interface FeedbackSummary {
  total_open: number
  total_resolved: number
  by_type: Record<string, number>
  recent_count: number
  heat_map: {
    page_route: string
    total: number
    bugs: number
    suggestions: number
    praise: number
    questions: number
    open_count: number
    pulse_up: number
    pulse_down: number
  }[]
}

interface FeedbackItem {
  id: number
  user_id: string
  user_name: string
  page_route: string
  feature_area: string
  feedback_type: string
  title: string
  body: string
  status: string
  vote_count: number
  action_trail: { type: string; label: string; timestamp: string }[]
  screenshot_data: string | null
  comments: { id: number; user_name: string; body: string; created_at: string }[]
  created_at: string
}

const typeIcons: Record<string, typeof Bug> = {
  bug: Bug,
  suggestion: Lightbulb,
  praise: Heart,
  question: HelpCircle,
}

const typeColors: Record<string, string> = {
  bug: "bg-red-50 text-red-700 border-red-200",
  suggestion: "bg-amber-50 text-amber-700 border-amber-200",
  praise: "bg-green-50 text-green-700 border-green-200",
  question: "bg-blue-50 text-blue-700 border-blue-200",
}

const statusColors: Record<string, "default" | "info" | "success" | "warning"> = {
  open: "default",
  acknowledged: "info",
  in_progress: "warning",
  resolved: "success",
  wont_fix: "default",
}

export function FeedbackDashboardPage() {
  usePageHelp({
    title: "Feedback Dashboard",
    sections: [
      { heading: "What is this?", body: "Platform-level view of all user feedback across the application. Identifies which areas need attention and which are working well." },
      { heading: "Heat map", body: "Pages ranked by unresolved feedback count. Red = high volume of issues. Green = positive feedback or no issues." },
      { heading: "Access", body: "This page is only visible to platform administrators." },
    ],
  })

  const qc = useQueryClient()
  const { data: summary } = useQuery({
    queryKey: ["feedback-summary"],
    queryFn: () => api.get<FeedbackSummary>("/feedback/summary"),
  })
  const { data: allFeedback } = useQuery({
    queryKey: ["feedback-all"],
    queryFn: () => api.get<FeedbackItem[]>("/feedback"),
  })

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<string>("all")

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/feedback/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feedback-all"] })
      qc.invalidateQueries({ queryKey: ["feedback-summary"] })
    },
  })

  const deleteFeedback = useMutation({
    mutationFn: (id: number) => api.delete(`/feedback/${id}`),
    onSuccess: () => {
      setExpandedId(null)
      qc.invalidateQueries({ queryKey: ["feedback-all"] })
      qc.invalidateQueries({ queryKey: ["feedback-summary"] })
    },
  })

  const filtered = (allFeedback ?? []).filter(f =>
    filter === "all" || f.feedback_type === filter || f.status === filter
  )

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Feedback Dashboard</h1>
        <span className="text-sm text-gray-500">Platform administration</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Review and respond to user feedback</p>
    </div>
  )

  return (
    <PageShell header={header}>
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <SummaryCard label="Open" value={summary.total_open} color="text-amber-600" />
          <SummaryCard label="Resolved" value={summary.total_resolved} color="text-green-600" />
          <SummaryCard label="Last 7 days" value={summary.recent_count} color="text-primary-600" />
          <SummaryCard label="Praise" value={summary.by_type.praise ?? 0} color="text-green-600" />
        </div>
      )}

      {/* Heat map */}
      {summary && summary.heat_map.length > 0 && (
        <PageSection title="Page Heat Map">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Open</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-14">🐛</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-14">💡</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-14">💚</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-14">❓</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">👍</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">👎</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.heat_map.map((entry, i) => {
                  const sentiment = entry.pulse_up - entry.pulse_down
                  const heatBg = entry.open_count > 3 ? "bg-red-50" : entry.open_count > 0 ? "bg-amber-50" : sentiment > 0 ? "bg-green-50/50" : ""
                  return (
                    <tr key={entry.page_route} className={`${heatBg} ${i % 2 === 1 ? "bg-gray-50/30" : ""}`}>
                      <td className="px-3 py-2 font-mono text-xs">{entry.page_route}</td>
                      <td className="px-3 py-2 text-center font-semibold">{entry.open_count || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs">{entry.bugs || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs">{entry.suggestions || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs">{entry.praise || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs">{entry.questions || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs text-green-600">{entry.pulse_up || "—"}</td>
                      <td className="px-3 py-2 text-center text-xs text-red-500">{entry.pulse_down || "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </PageSection>
      )}

      {/* All feedback items */}
      <PageSection title="All Feedback">
        <div className="flex items-center gap-2 mb-4">
          {["all", "bug", "suggestion", "praise", "question", "open", "resolved"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary-100 text-primary-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {filtered.map(item => {
            const Icon = typeIcons[item.feedback_type] ?? MessageSquare
            const expanded = expandedId === item.id
            return (
              <div key={item.id} className={`border rounded-lg ${typeColors[item.feedback_type] ?? "border-gray-200 bg-white"}`}>
                <button
                  onClick={() => setExpandedId(expanded ? null : item.id)}
                  className="w-full flex items-start gap-3 p-3 text-left"
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 shrink-0">FB-{item.id}</span>
                      <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
                      <Badge variant={statusColors[item.status] ?? "default"}>{item.status}</Badge>
                      <span className="text-xs text-gray-400 shrink-0">
                        <ThumbsUp className="h-3 w-3 inline mr-0.5" />{item.vote_count}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.page_route} · {item.user_name || item.user_id || "anonymous"} · {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {expanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                </button>

                {expanded && (
                  <div className="px-3 pb-3 border-t border-gray-100 pt-3 ml-7">
                    {item.body && <p className="text-sm text-gray-700 mb-3">{item.body}</p>}

                    {/* Status controls */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-500">Status:</span>
                      {["open", "acknowledged", "in_progress", "resolved", "wont_fix"].map(s => (
                        <button
                          key={s}
                          onClick={() => updateStatus.mutate({ id: item.id, status: s })}
                          className={`px-2 py-0.5 rounded text-xs transition-colors ${
                            item.status === s
                              ? "bg-primary-100 text-primary-700 font-medium"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {s.replace("_", " ")}
                        </button>
                      ))}
                      <span className="flex-1" />
                      <button
                        onClick={() => { if (confirm("Delete this feedback item?")) deleteFeedback.mutate(item.id) }}
                        className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>

                    {/* Screenshot */}
                    {item.screenshot_data && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Image className="h-3 w-3" /> Screenshot</p>
                        <img src={item.screenshot_data} className="max-w-full border border-gray-200 rounded" />
                      </div>
                    )}

                    {/* Action trail */}
                    {item.action_trail && item.action_trail.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-1">Action trail ({item.action_trail.length} steps)</p>
                        <div className="bg-gray-50 rounded p-2 space-y-0.5">
                          {item.action_trail.map((a, i) => (
                            <div key={i} className="text-xs text-gray-600 flex items-center gap-2">
                              <span className="text-gray-400 w-5 text-right shrink-0">{i + 1}.</span>
                              <span>{a.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    {item.comments && item.comments.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Comments ({item.comments.length})</p>
                        <div className="space-y-2">
                          {item.comments.map(c => (
                            <div key={c.id} className="bg-white rounded p-2 border border-gray-100">
                              <p className="text-xs text-gray-400">{c.user_name || "anonymous"} · {new Date(c.created_at).toLocaleDateString()}</p>
                              <p className="text-sm text-gray-700">{c.body}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No feedback items.</p>
          )}
        </div>
      </PageSection>
    </PageShell>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
      <p className={`text-2xl font-bold ${color} mt-1`}>{value}</p>
    </div>
  )
}
