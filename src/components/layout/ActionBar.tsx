import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

export interface ActionBarProps {
  /** Primary actions (right-aligned): save, post, approve, reconcile */
  primaryActions?: ReactNode
  /** Secondary actions (left-aligned): cancel, back, delete draft */
  secondaryActions?: ReactNode
  /** Status or context information displayed between action groups */
  status?: ReactNode
  className?: string
}

/**
 * Consistent action bar used at the bottom of entity pages.
 * Per v4 spec section 3.2: save draft, approve, post, reconcile, reverse, export.
 *
 * Typically passed as the `footer` prop to PageShell.
 */
export function ActionBar({
  primaryActions,
  secondaryActions,
  status,
  className,
}: ActionBarProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-2">
        {secondaryActions}
      </div>
      {status && (
        <div className="flex-1 text-center text-sm text-gray-500">
          {status}
        </div>
      )}
      <div className="flex items-center gap-2">
        {primaryActions}
      </div>
    </div>
  )
}
