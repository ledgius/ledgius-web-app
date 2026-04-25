import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"
import { PageLoader } from "@/components/primitives"
import { ArticleInfoPanel } from "@/components/workflow/ArticleInfoPanel"
import { PageStatus } from "@/components/workflow/PageStatus"

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
  /** Show branded loading spinner instead of content */
  loading?: boolean
  className?: string
}

export function PageShell({
  header,
  children,
  aside,
  footer,
  activity,
  layout = aside ? "full" : "stacked",
  loading = false,
  className,
}: PageShellProps) {
  if (loading) {
    return (
      <div className={cn("flex flex-col h-full min-h-0", className)}>
        {header && <div className="shrink-0 mb-6">{header}</div>}
        <PageLoader />
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Header zone */}
      {header && <div className="shrink-0 mb-6">{header}</div>}

      {/* T-0040 page status widget — operational checklist + counters.
          Renders nothing when the current route has no registered
          status checker (Books Overview, contacts, etc.). Sits above
          the InfoPanel because operational state ("here's where you
          are") logically precedes the steps ("here's how to do it"). */}
      <PageStatus />

      {/* API-served Info Panel — sits below the page header, above the
          primary content. The component renders nothing when the
          current route has no primary-bound article (Books Overview,
          detail pages, unmigrated pages). */}
      <ArticleInfoPanel />

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
