import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

export interface SplitPaneProps {
  /** Left/primary pane */
  primary: ReactNode
  /** Right/secondary pane */
  secondary: ReactNode
  /** Column ratio on desktop */
  ratio?: "1:1" | "2:1" | "1:2" | "3:1" | "1:3"
  /** Direction on mobile: stack vertically or hide secondary */
  mobileBehaviour?: "stack" | "primary-only"
  className?: string
}

const ratioClasses: Record<NonNullable<SplitPaneProps["ratio"]>, string> = {
  "1:1": "lg:grid-cols-2",
  "2:1": "lg:grid-cols-[2fr_1fr]",
  "1:2": "lg:grid-cols-[1fr_2fr]",
  "3:1": "lg:grid-cols-[3fr_1fr]",
  "1:3": "lg:grid-cols-[1fr_3fr]",
}

export function SplitPane({
  primary,
  secondary,
  ratio = "1:1",
  mobileBehaviour = "stack",
  className,
}: SplitPaneProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-6", ratioClasses[ratio], className)}>
      <div className="min-w-0">{primary}</div>
      <div className={cn(
        "min-w-0",
        mobileBehaviour === "primary-only" && "hidden lg:block"
      )}>
        {secondary}
      </div>
    </div>
  )
}
