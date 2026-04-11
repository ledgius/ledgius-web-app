import { useState, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { X, Bug, Lightbulb, Heart, HelpCircle, Camera, ThumbsUp, MessageSquare, ChevronRight, AlertCircle, CheckCircle, Info } from "lucide-react"
import { api } from "@/shared/lib/api"
import { useFeedbackEntries } from "@/components/feedback"
import { getTrail } from "./actionTrail"
import { captureScreenshot } from "./screenshot"

interface FeedbackItem {
  id: number
  title: string
  feedback_type: string
  status: string
  vote_count: number
  created_at: string
}

const typeConfig = {
  bug: { icon: Bug, label: "Bug", color: "text-red-600 bg-red-50 border-red-200" },
  suggestion: { icon: Lightbulb, label: "Suggestion", color: "text-amber-600 bg-amber-50 border-amber-200" },
  praise: { icon: Heart, label: "Praise", color: "text-green-600 bg-green-50 border-green-200" },
  question: { icon: HelpCircle, label: "Question", color: "text-blue-600 bg-blue-50 border-blue-200" },
} as const

interface FeedbackPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackPanel({ isOpen, onClose }: FeedbackPanelProps) {
  const location = useLocation()
  const consoleEntries = useFeedbackEntries()
  const [mode, setMode] = useState<"browse" | "create">("browse")
  const [existing, setExisting] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState<number | null>(null)

  // Form state
  const [feedbackType, setFeedbackType] = useState<string>("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [capturingScreenshot, setCapturingScreenshot] = useState(false)

  // Load existing feedback for this page.
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      api.get<FeedbackItem[]>(`/feedback?page=${encodeURIComponent(location.pathname)}`)
        .then(setExisting)
        .catch(() => setExisting([]))
        .finally(() => setLoading(false))
      setMode("browse")
      setSubmitted(false)
    }
  }, [isOpen, location.pathname])

  const [hiddenForCapture, setHiddenForCapture] = useState(false)

  const handleScreenshot = async () => {
    setCapturingScreenshot(true)
    // Temporarily hide the panel visually for a clean screenshot (don't close — preserves form state).
    setHiddenForCapture(true)
    await new Promise(r => setTimeout(r, 400))
    try {
      const data = await captureScreenshot()
      if (data) {
        setScreenshot(data)
      } else {
        console.warn("Screenshot capture returned null")
      }
    } catch (err) {
      console.error("Screenshot capture failed:", err)
    }
    setHiddenForCapture(false)
    setCapturingScreenshot(false)
  }

  const handleSubmit = async () => {
    if (!feedbackType || !title) return
    setSubmitting(true)
    try {
      const created = await api.post<FeedbackItem>("/feedback", {
        page_route: location.pathname,
        feature_area: deriveFeatureArea(location.pathname),
        feedback_type: feedbackType,
        title,
        body,
        action_trail: getTrail(),
        browser_info: {
          userAgent: navigator.userAgent,
          screen: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          url: window.location.href,
          console_messages: consoleEntries.slice(0, 10).map(e => ({
            level: e.level,
            message: e.message,
            detail: e.detail,
            time: e.timestamp.toISOString(),
          })),
        },
        screenshot_data: screenshot,
      })
      setSubmittedId(created?.id ?? null)
      setSubmitted(true)
      setTitle("")
      setBody("")
      setScreenshot(null)
      setFeedbackType("")
    } catch (err) {
      console.error("Feedback submit failed:", err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (id: number) => {
    try {
      await api.post(`/feedback/${id}/vote`, {})
      setExisting(prev => prev.map(f => f.id === id ? { ...f, vote_count: f.vote_count + 1 } : f))
    } catch { /* already voted or error */ }
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center pt-16 ${hiddenForCapture ? "invisible" : ""}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={hiddenForCapture ? undefined : onClose} />

      {/* Panel */}
      <div data-feedback-panel className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-[480px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Feedback</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {location.pathname}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {submitted ? (
            <div className="text-center py-8">
              <Heart className="h-8 w-8 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">Thanks for your feedback!</p>
              {submittedId && <p className="text-xs font-mono text-primary-600 mt-1">Reference: FB-{submittedId}</p>}
              <p className="text-xs text-gray-500 mt-1">We'll review it and get back to you.</p>
              <button onClick={onClose} className="mt-4 text-xs text-primary-600 hover:underline">Close</button>
            </div>
          ) : mode === "browse" ? (
            <>
              {/* Existing feedback for this page */}
              {loading ? (
                <p className="text-xs text-gray-400">Loading...</p>
              ) : existing.length > 0 ? (
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Existing feedback on this page</p>
                  {existing.map(item => {
                    const cfg = typeConfig[item.feedback_type as keyof typeof typeConfig]
                    const Icon = cfg?.icon ?? HelpCircle
                    return (
                      <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg?.color ?? "bg-gray-50 border-gray-200"}`}>
                        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            FB-{item.id} · {item.vote_count} vote{item.vote_count !== 1 ? "s" : ""} · {item.status}
                          </p>
                        </div>
                        <button
                          onClick={() => handleVote(item.id)}
                          className="shrink-0 flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:bg-white hover:text-primary-600 transition-colors"
                          title="Me too / upvote"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {item.vote_count}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 mb-4">No feedback yet for this page.</p>
              )}

              {/* New feedback button */}
              <button
                onClick={() => setMode("create")}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Submit new feedback</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            </>
          ) : (
            <>
              {/* Type selector */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {(Object.entries(typeConfig) as [string, typeof typeConfig.bug][]).map(([key, cfg]) => {
                  const Icon = cfg.icon
                  const selected = feedbackType === key
                  return (
                    <button
                      key={key}
                      onClick={() => setFeedbackType(key)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-colors ${
                        selected
                          ? `${cfg.color} border-current`
                          : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs font-medium">{cfg.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brief summary..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:border-primary-500 focus:ring-1 focus:ring-primary-200"
                autoFocus
              />

              {/* Body */}
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="More detail (optional)..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:border-primary-500 focus:ring-1 focus:ring-primary-200 resize-none"
              />

              {/* Screenshot */}
              <div className="mb-3">
                <button
                  onClick={handleScreenshot}
                  disabled={capturingScreenshot}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {capturingScreenshot ? "Capturing..." : screenshot ? "Retake screenshot" : "Capture screenshot"}
                </button>
                {screenshot && (
                  <div className="mt-2 relative">
                    <img src={screenshot} className="w-full rounded border border-gray-200" alt="Screenshot preview" />
                    <button
                      onClick={() => setScreenshot(null)}
                      className="absolute top-1 right-1 p-0.5 rounded bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Console messages preview */}
              {consoleEntries.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Console messages (auto-attached)</p>
                  <div className="bg-gray-50 rounded-lg p-2 max-h-20 overflow-y-auto space-y-0.5">
                    {consoleEntries.slice(0, 5).map((entry, i) => {
                      const icon = entry.level === "error" ? <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                        : entry.level === "success" ? <CheckCircle className="h-3 w-3 text-green-400 shrink-0" />
                        : <Info className="h-3 w-3 text-gray-400 shrink-0" />
                      return (
                        <div key={entry.id} className="text-[11px] text-gray-500 flex items-center gap-1.5">
                          {icon}
                          <span className="truncate">{entry.message}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action trail preview */}
              {getTrail().length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">Recent actions (auto-attached)</p>
                  <div className="bg-gray-50 rounded-lg p-2 max-h-20 overflow-y-auto space-y-0.5">
                    {getTrail().slice(-5).map((entry, i) => (
                      <div key={i} className="text-[11px] text-gray-500 flex items-center gap-1.5">
                        <span className="text-gray-300 w-3 text-right shrink-0">{i + 1}.</span>
                        <span className="truncate">{entry.label}</span>
                      </div>
                    ))}
                    {getTrail().length > 5 && (
                      <p className="text-[10px] text-gray-400 ml-4">+{getTrail().length - 5} more steps included</p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!feedbackType || !title || submitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? "Submitting..." : "Submit feedback"}
                </button>
                <button
                  onClick={() => setMode("browse")}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function deriveFeatureArea(path: string): string {
  const segments = path.split("/").filter(Boolean)
  return segments[0] ?? "dashboard"
}
