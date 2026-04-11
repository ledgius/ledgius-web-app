import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

export interface PageSectionProps {
  /** Section title — should answer one question per v4 spec section 6.2 */
  title?: string
  /** Optional description below the title */
  description?: string
  /** Action elements rendered in the section header */
  actions?: ReactNode
  /** Section content */
  children: ReactNode
  /** Visual treatment */
  variant?: "card" | "plain"
  /** Collapsible section */
  collapsible?: boolean
  /** Controlled collapsed state (only when collapsible) */
  defaultCollapsed?: boolean
  className?: string
}

export function PageSection({
  title,
  description,
  actions,
  children,
  variant = "card",
  className,
}: PageSectionProps) {
  const content = (
    <>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </>
  )

  if (variant === "plain") {
    return <div className={cn(className)}>{content}</div>
  }

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white p-6", className)}>
      {content}
    </div>
  )
}
