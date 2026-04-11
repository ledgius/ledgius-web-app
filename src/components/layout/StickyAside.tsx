import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

export interface StickyAsideProps {
  children: ReactNode
  className?: string
}

/**
 * Sticky side panel container for totals, verification, or audit panels.
 * Sticks to the top of the viewport on desktop when the page scrolls.
 */
export function StickyAside({ children, className }: StickyAsideProps) {
  return (
    <div className={cn("lg:sticky lg:top-0 flex flex-col gap-4", className)}>
      {children}
    </div>
  )
}
