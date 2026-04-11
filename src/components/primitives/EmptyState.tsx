import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

export interface EmptyStateProps {
  /** Icon to display above the message */
  icon?: ReactNode
  /** Primary message explaining the empty state */
  title: string
  /** Guidance on what to do next */
  description?: string
  /** Action button or link */
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-4 text-center", className)}>
      {icon && (
        <div className="mb-3 text-gray-400">{icon}</div>
      )}
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  )
}
