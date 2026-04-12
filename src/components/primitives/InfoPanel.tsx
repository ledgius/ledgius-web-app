import { useState } from "react"
import { Info, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface InfoPanelProps {
  title?: string
  children: React.ReactNode
  dismissible?: boolean
  storageKey?: string
  className?: string
}

export function InfoPanel({ title, children, dismissible = true, storageKey, className }: InfoPanelProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (!dismissible || !storageKey) return false
    return localStorage.getItem(`info-dismissed-${storageKey}`) === "true"
  })

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    if (storageKey) {
      localStorage.setItem(`info-dismissed-${storageKey}`, "true")
    }
  }

  return (
    <div className={cn("bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4", className)}>
      <div className="flex items-start gap-3">
        <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          {title && <p className="text-sm font-medium text-blue-900 mb-1">{title}</p>}
          <div className="text-xs text-blue-700 leading-relaxed space-y-1">
            {children}
          </div>
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
