// Spec references: A-0023.
import { useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight, ExternalLink } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { LucideIcon } from "lucide-react"

export type HealthStatus = "green" | "amber" | "red"

export interface HealthPanelProps {
  title: string
  icon: LucideIcon
  status: HealthStatus
  summary: string
  metric?: string
  link: string
  children?: ReactNode
}

const statusBorderClass: Record<HealthStatus, string> = {
  green: "border-l-green-500",
  amber: "border-l-amber-500",
  red: "border-l-red-500",
}

const statusBgClass: Record<HealthStatus, string> = {
  green: "bg-green-50",
  amber: "bg-amber-50",
  red: "bg-red-50",
}

function StatusDot({ status }: { status: HealthStatus }) {
  if (status === "red") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
  }
  if (status === "amber") {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
}

export function HealthPanel({
  title,
  icon: Icon,
  status,
  summary,
  metric,
  link,
  children,
}: HealthPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 border-l-4 shadow-sm flex flex-col",
        statusBorderClass[status]
      )}
    >
      {/* Top section */}
      <div className="px-4 pt-4 pb-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("p-1.5 rounded-md shrink-0", statusBgClass[status])}>
              <Icon className="h-4 w-4 text-gray-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900 truncate">{title}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusDot status={status} />
            <button
              type="button"
              onClick={() => navigate(link)}
              className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-gray-50 transition-colors"
              title={`Go to ${title}`}
              aria-label={`Navigate to ${title}`}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Metric */}
        {metric && (
          <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900">{metric}</p>
        )}

        {/* Summary */}
        <p className="mt-1.5 text-xs text-gray-500 leading-snug">{summary}</p>
      </div>

      {/* Expand toggle — only shown if there is detail content */}
      {children && (
        <>
          <div className="border-t border-gray-100">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="font-medium">{expanded ? "Hide details" : "View details"}</span>
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-150", expanded && "rotate-90")} />
            </button>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              {children}
            </div>
          )}
        </>
      )}
    </div>
  )
}
