import { useState } from "react"
import { ChevronDown, ChevronRight, Info, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface InfoPanelProps {
  title?: string
  children: React.ReactNode
  dismissible?: boolean
  /** If true, panel renders with a chevron toggle and remembers collapsed state. */
  collapsible?: boolean
  /** Initial collapsed state when `collapsible` is set. Only used if no persisted state exists. */
  defaultCollapsed?: boolean
  storageKey?: string
  className?: string
}

export function InfoPanel({
  title,
  children,
  dismissible = true,
  collapsible = false,
  defaultCollapsed = false,
  storageKey,
  className,
}: InfoPanelProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissible || !storageKey) return false
    return localStorage.getItem(`info-dismissed-${storageKey}`) === "true"
  })
  const [collapsed, setCollapsed] = useState(() => {
    if (!collapsible) return false
    if (storageKey) {
      const v = localStorage.getItem(`info-collapsed-${storageKey}`)
      if (v === "true") return true
      if (v === "false") return false
    }
    return defaultCollapsed
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    if (storageKey) {
      localStorage.setItem(`info-dismissed-${storageKey}`, "true")
    }
  }

  const handleToggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    if (storageKey) {
      localStorage.setItem(`info-collapsed-${storageKey}`, next ? "true" : "false")
    }
  }

  return (
    <div className={cn("bg-blue-50 border border-blue-200 rounded-lg px-4 py-3", className)}>
      <div className="flex items-start gap-3">
        {collapsible ? (
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="shrink-0 p-0.5 -ml-0.5 mt-0 rounded hover:bg-blue-100 text-blue-500 hover:text-blue-700 transition-colors"
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        ) : (
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {title && (
            collapsible ? (
              <button
                type="button"
                onClick={handleToggleCollapse}
                className="text-sm font-medium text-blue-900 hover:text-blue-700 text-left w-full"
              >
                {title}
              </button>
            ) : (
              <p className="text-sm font-medium text-blue-900 mb-1">{title}</p>
            )
          )}
          {!collapsed && (
            <div className={cn("text-xs text-blue-700 leading-relaxed space-y-1", title && "mt-1")}>
              {children}
            </div>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 p-0.5 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
