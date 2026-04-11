import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { CheckCircle, AlertCircle, Info, X, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type FeedbackLevel = "idle" | "info" | "success" | "error"

interface FeedbackEntry {
  id: string
  level: FeedbackLevel
  message: string
  detail?: string
  timestamp: Date
}

interface FeedbackAPI {
  /** Show a success message in the console */
  success: (message: string) => void
  /** Show an info message in the console */
  info: (message: string) => void
  /** Show an error in the console. Detail is optional technical context. */
  error: (message: string, detail?: string) => void
  /** Clear the console back to idle */
  clear: () => void
}

const FeedbackContext = createContext<FeedbackAPI | null>(null)

interface FeedbackEntriesState {
  entries: FeedbackEntry[]
  dismiss: (id: string) => void
  clear: () => void
}

const FeedbackEntriesContext = createContext<FeedbackEntriesState | null>(null)

let nextId = 0

const MAX_HISTORY = 50

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<FeedbackEntry[]>([])

  const push = useCallback((level: FeedbackLevel, message: string, detail?: string) => {
    const entry: FeedbackEntry = {
      id: `fb-${++nextId}`,
      level,
      message,
      detail,
      timestamp: new Date(),
    }
    setEntries((prev) => [entry, ...prev].slice(0, MAX_HISTORY))
  }, [])

  const clear = useCallback(() => {
    setEntries([])
  }, [])

  const dismiss = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const api: FeedbackAPI = {
    success: (msg) => push("success", msg),
    info: (msg) => push("info", msg),
    error: (msg, detail) => push("error", msg, detail),
    clear,
  }

  const entriesState: FeedbackEntriesState = { entries, dismiss, clear }

  return (
    <FeedbackContext.Provider value={api}>
      <FeedbackEntriesContext.Provider value={entriesState}>
        {children}
      </FeedbackEntriesContext.Provider>
    </FeedbackContext.Provider>
  )
}

/**
 * Render this component where the feedback console strip should appear (e.g. bottom of Layout).
 * It reads entries from FeedbackProvider context.
 */
export function FeedbackConsoleStrip() {
  const ctx = useContext(FeedbackEntriesContext)
  if (!ctx) return null
  return <FeedbackConsoleUI entries={ctx.entries} onDismiss={ctx.dismiss} onClear={ctx.clear} />
}

/**
 * Hook to push messages to the feedback console.
 * Returns { success, info, error, clear }.
 */
export function useFeedback(): FeedbackAPI {
  const ctx = useContext(FeedbackContext)
  if (!ctx) {
    throw new Error("useFeedback must be used within a FeedbackProvider")
  }
  return ctx
}

/**
 * Hook to read recent feedback console entries.
 * Used by the user feedback panel to attach console messages to feedback submissions.
 */
export function useFeedbackEntries() {
  const ctx = useContext(FeedbackEntriesContext)
  return ctx?.entries ?? []
}

// ── Console UI ──

interface ConsoleUIProps {
  entries: FeedbackEntry[]
  onDismiss: (id: string) => void
  onClear: () => void
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function FeedbackConsoleUI({ entries, onDismiss, onClear }: ConsoleUIProps) {
  const [expanded, setExpanded] = useState(false)

  const latest = entries[0]
  const hasError = entries.some((e) => e.level === "error")
  const errorCount = entries.filter((e) => e.level === "error").length

  // Determine strip colour based on latest entry
  const stripColor = !latest
    ? "bg-gray-100 border-gray-200 text-gray-500"
    : latest.level === "error"
      ? "bg-gray-100 border-gray-200 text-gray-700"
      : latest.level === "success"
        ? "bg-gray-100 border-gray-200 text-gray-700"
        : "bg-gray-100 border-gray-200 text-gray-600"

  return (
    <div className="shrink-0 border-t border-gray-200">
      {/* ── Summary strip (always visible) ── */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-1.5 text-xs transition-colors",
          stripColor
        )}
      >
        {/* Status icon */}
        {!latest ? (
          <span className="text-gray-400">Ready</span>
        ) : (
          <>
            {latest.level === "success" && <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />}
            {latest.level === "error" && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
            {latest.level === "info" && <Info className="h-3.5 w-3.5 text-primary-500 shrink-0" />}
            <span className={cn("truncate", latest.level === "error" && "text-red-600 font-medium")}>
              {latest.message}
            </span>
          </>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Error count badge */}
        {hasError && errorCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
            <AlertCircle className="h-2.5 w-2.5" />
            {errorCount}
          </span>
        )}

        {/* Entry count */}
        {entries.length > 0 && (
          <span className="text-gray-400">{entries.length}</span>
        )}

        {/* Expand/collapse */}
        {entries.length > 0 && (
          expanded
            ? <ChevronDown className="h-3 w-3 text-gray-400" />
            : <ChevronUp className="h-3 w-3 text-gray-400" />
        )}
      </button>

      {/* ── Expanded history ── */}
      {expanded && entries.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-200 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-1 border-b border-gray-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Console</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear() }}
              className="text-[10px] text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 px-4 py-1.5 text-xs group">
                {/* Icon */}
                {entry.level === "success" && <CheckCircle className="h-3 w-3 mt-0.5 text-green-500 shrink-0" />}
                {entry.level === "error" && <AlertCircle className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />}
                {entry.level === "info" && <Info className="h-3 w-3 mt-0.5 text-primary-500 shrink-0" />}

                {/* Timestamp */}
                <span className="tabular-nums text-gray-400 shrink-0">{formatTime(entry.timestamp)}</span>

                {/* Message */}
                <span className={cn(
                  "flex-1 min-w-0",
                  entry.level === "error" ? "text-red-600" : "text-gray-700"
                )}>
                  {entry.message}
                  {entry.detail && (
                    <span className="ml-1 text-gray-400 break-all" title={entry.detail}>
                      [{entry.detail}]
                    </span>
                  )}
                </span>

                {/* Dismiss */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDismiss(entry.id) }}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-400 hover:text-gray-600 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
