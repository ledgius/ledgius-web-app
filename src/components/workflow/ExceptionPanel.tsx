import { AlertCircle, AlertTriangle, Info, ChevronRight } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export type ExceptionSeverity = "blocker" | "warning" | "info"

export interface ExceptionItem {
  /** Unique ID */
  id: string | number
  /** Short explanation of the exception */
  message: string
  /** Severity level */
  severity: ExceptionSeverity
  /** Recommended next action */
  nextAction?: string
  /** Entity reference this exception relates to */
  entityRef?: string
  /** How long this has been unresolved */
  age?: string
  /** Click handler for the exception item */
  onClick?: () => void
}

export interface ExceptionPanelProps {
  /** Panel title */
  title?: string
  /** Exception items sorted by severity then age */
  items: ExceptionItem[]
  /** Hide when no items */
  hideWhenEmpty?: boolean
  className?: string
}

const severityConfig = {
  blocker: {
    icon: AlertCircle,
    containerClass: "border-red-200 bg-red-50",
    iconClass: "text-red-500",
    textClass: "text-red-800",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "border-amber-200 bg-amber-50",
    iconClass: "text-amber-500",
    textClass: "text-amber-800",
  },
  info: {
    icon: Info,
    containerClass: "border-primary-200 bg-primary-50",
    iconClass: "text-primary-500",
    textClass: "text-primary-800",
  },
} as const

/**
 * Exception panel showing blocking and warning issues.
 * Per component_architecture_v1.md section 5.1: blocking and warning issues,
 * issue type, severity, next action.
 */
export function ExceptionPanel({
  title = "Exceptions",
  items,
  hideWhenEmpty = false,
  className,
}: ExceptionPanelProps) {
  if (hideWhenEmpty && items.length === 0) return null

  const blockerCount = items.filter((i) => i.severity === "blocker").length
  const warningCount = items.filter((i) => i.severity === "warning").length

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2 text-xs">
          {blockerCount > 0 && (
            <span className="inline-flex items-center gap-1 text-red-600 font-medium">
              <AlertCircle className="h-3 w-3" />{blockerCount}
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
              <AlertTriangle className="h-3 w-3" />{warningCount}
            </span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-500">
          No exceptions — all clear.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => {
            const config = severityConfig[item.severity]
            const Icon = config.icon
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3",
                  item.onClick && "cursor-pointer hover:bg-gray-50 transition-colors"
                )}
                onClick={item.onClick}
              >
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.iconClass)} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", config.textClass)}>{item.message}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {item.entityRef && (
                      <span className="text-xs text-gray-500 font-mono">{item.entityRef}</span>
                    )}
                    {item.age && (
                      <span className="text-xs text-gray-400">{item.age}</span>
                    )}
                    {item.nextAction && (
                      <span className="text-xs text-primary-600">{item.nextAction}</span>
                    )}
                  </div>
                </div>
                {item.onClick && (
                  <ChevronRight className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
