import { useState, useEffect, useRef } from "react"
import { useLocation } from "react-router-dom"
import { ThumbsUp, ThumbsDown, X } from "lucide-react"
import { api } from "@/shared/lib/api"

const SESSION_KEY = "ledgius-pulse-session"
const DISMISSED_KEY = "ledgius-pulse-dismissed"
const MIN_SESSION_AGE_MS = 5 * 60 * 1000  // Don't show in first 5 minutes.
const MIN_ACTIONS_ON_PAGE = 3               // Minimum smooth actions before asking.
const COOLDOWN_MS = 60 * 1000              // Don't ask again within 60s of last pulse.

function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function getDismissed(): Set<string> {
  try {
    const stored = sessionStorage.getItem(DISMISSED_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function addDismissed(route: string) {
  const set = getDismissed()
  set.add(route)
  sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]))
}

/**
 * FlowPulse — shows a subtle inline bar when the user is flowing smoothly
 * through a page, asking for a quick thumbs up/down.
 *
 * Rules:
 * - Only after 5+ minutes in the session (let them settle in)
 * - Only after 3+ actions on the current page with no errors
 * - Only once per page per session
 * - Dismissible
 */
export function FlowPulse() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [responded, setResponded] = useState(false)
  const actionCount = useRef(0)
  const sessionStart = useRef(Date.now())
  const lastPulse = useRef(0)

  // Reset action count on route change.
  useEffect(() => {
    actionCount.current = 0
    setVisible(false)
    setResponded(false)
  }, [location.pathname])

  // Listen for smooth interactions.
  useEffect(() => {
    const handler = () => {
      actionCount.current++

      const sessionAge = Date.now() - sessionStart.current
      const sinceLastPulse = Date.now() - lastPulse.current
      const dismissed = getDismissed()

      if (
        actionCount.current >= MIN_ACTIONS_ON_PAGE &&
        sessionAge >= MIN_SESSION_AGE_MS &&
        sinceLastPulse >= COOLDOWN_MS &&
        !dismissed.has(location.pathname) &&
        !visible &&
        !responded
      ) {
        setVisible(true)
      }
    }

    document.addEventListener("click", handler, { capture: true, passive: true })
    return () => document.removeEventListener("click", handler, { capture: true })
  }, [location.pathname, visible, responded])

  const handlePulse = async (signal: "up" | "down") => {
    lastPulse.current = Date.now()
    addDismissed(location.pathname)
    setResponded(true)

    try {
      await api.post("/feedback/pulse", {
        page_route: location.pathname,
        signal,
        session_id: getSessionId(),
      })
    } catch { /* non-critical */ }

    setTimeout(() => setVisible(false), 1500)
  }

  const dismiss = () => {
    addDismissed(location.pathname)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div data-flow-pulse className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white border border-gray-200 shadow-lg">
        {responded ? (
          <span className="text-sm text-gray-600">Thanks!</span>
        ) : (
          <>
            <span className="text-sm text-gray-600">How's this working for you?</span>
            <button
              onClick={() => handlePulse("up")}
              className="p-1.5 rounded-full hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
              title="Good"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => handlePulse("down")}
              className="p-1.5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              title="Needs improvement"
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
            <button
              onClick={dismiss}
              className="p-1 rounded-full text-gray-300 hover:text-gray-500 transition-colors"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
