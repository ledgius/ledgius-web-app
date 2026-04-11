import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type NotificationType = "success" | "error" | "warning" | "info"

interface Notification {
  id: string
  type: NotificationType
  title?: string
  message: string
  duration: number
}

interface NotificationAPI {
  success: (message: string, options?: NotifyOptions) => void
  error: (message: string, options?: NotifyOptions) => void
  warning: (message: string, options?: NotifyOptions) => void
  info: (message: string, options?: NotifyOptions) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

interface NotifyOptions {
  title?: string
  /** Duration in ms. 0 = persistent until dismissed. Default 5000. */
  duration?: number
}

const NotificationContext = createContext<NotificationAPI | null>(null)

const defaultDurations: Record<NotificationType, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const

const styleMap = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-primary-200 bg-primary-50 text-primary-800",
} as const

let nextId = 0

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setNotifications([])
  }, [])

  const notify = useCallback(
    (type: NotificationType, message: string, options?: NotifyOptions) => {
      const id = `notification-${++nextId}`
      const duration = options?.duration ?? defaultDurations[type]
      const notification: Notification = { id, type, title: options?.title, message, duration }

      setNotifications((prev) => [...prev, notification])

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss]
  )

  const api: NotificationAPI = {
    success: (msg, opts) => notify("success", msg, opts),
    error: (msg, opts) => notify("error", msg, opts),
    warning: (msg, opts) => notify("warning", msg, opts),
    info: (msg, opts) => notify("info", msg, opts),
    dismiss,
    dismissAll,
  }

  return (
    <NotificationContext.Provider value={api}>
      {children}
      {/* Toast container — fixed top-right */}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)] pointer-events-none"
        aria-live="polite"
      >
        {notifications.map((n) => {
          const Icon = iconMap[n.type]
          return (
            <div
              key={n.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm animate-in slide-in-from-right",
                styleMap[n.type]
              )}
              role="alert"
            >
              <Icon className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                {n.title && <p className="font-medium">{n.title}</p>}
                <p className={n.title ? "mt-0.5" : ""}>{n.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(n.id)}
                className="shrink-0 rounded p-0.5 hover:opacity-70 transition-opacity"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </NotificationContext.Provider>
  )
}

/**
 * Hook to access the notification system.
 * Returns { success, error, warning, info, dismiss, dismissAll }.
 */
export function useNotification(): NotificationAPI {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return ctx
}
