import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

/**
 * Standard accounting page composition shell.
 * Enforces consistent zones across all pages per accounting_ux_spec_v4.md section 3.1:
 *
 *   PageShell
 *     header       — EntityHeader or PageHeader
 *     children     — primary content (grid, queue, form, report)
 *     aside        — secondary panel (totals, verification, evidence, audit)
 *     footer       — sticky action bar
 *     activity     — audit/activity timeline (below main content or in aside)
 */
export interface PageShellProps {
  /** Page header region — EntityHeader, PageHeader, or custom */
  header?: ReactNode
  /** Primary content area */
  children: ReactNode
  /** Secondary panel rendered alongside content on desktop, below on mobile */
  aside?: ReactNode
  /** Sticky footer action bar */
  footer?: ReactNode
  /** Activity/audit region below primary content */
  activity?: ReactNode
  /** Layout mode: 'full' has aside beside content, 'stacked' puts aside below */
  layout?: "full" | "stacked"
  className?: string
}

export function PageShell({
  header,
  children,
  aside,
  footer,
  activity,
  layout = aside ? "full" : "stacked",
  className,
}: PageShellProps) {
  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Header zone */}
      {header && <div className="shrink-0 mb-6">{header}</div>}

      {/* Main content zone */}
      <div className={cn(
        "flex-1 min-h-0",
        layout === "full" && aside
          ? "grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6"
          : "flex flex-col gap-6"
      )}>
        {/* Primary content */}
        <div className="min-h-0 min-w-0 flex flex-col gap-6">
          {children}
          {layout === "stacked" && aside && (
            <div>{aside}</div>
          )}
          {activity && (
            <div>{activity}</div>
          )}
        </div>

        {/* Side panel (full layout only) */}
        {layout === "full" && aside && (
          <div className="min-h-0 flex flex-col gap-6">
            <div className="lg:sticky lg:top-0">{aside}</div>
            {activity && (
              <div>{activity}</div>
            )}
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      {footer && (
        <div className="shrink-0 sticky bottom-0 mt-6 -mx-6 -mb-6 border-t border-gray-200 bg-white px-6 py-3">
          {footer}
        </div>
      )}
    </div>
  )
}
