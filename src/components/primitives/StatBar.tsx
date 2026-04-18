import { cn } from "@/shared/lib/utils"

// ── StatCell ────────────────────────────────────────────────────────────────

export interface StatCellProps {
  /** Small label above the value */
  label: string
  /** The value content — string, number, or any React node */
  children: React.ReactNode
  /** Optional className on the cell wrapper */
  className?: string
  /** Right-align label and value */
  align?: "left" | "right"
  /** Show a left border separator */
  separator?: boolean
}

/**
 * A single label-above-value cell for use inside a StatBar.
 * Can also be used standalone — but inside a StatBar, the CSS Grid
 * guarantees pixel-perfect baseline alignment across all cells.
 */
export function StatCell({ label, children, className, align = "left", separator }: StatCellProps) {
  return (
    <div className={cn(separator && "border-l border-gray-200 pl-5", className)}>
      <p className={cn(
        "text-xs text-gray-500 leading-none",
        align === "right" && "text-right"
      )}>
        {label}
      </p>
      <div className={cn(
        "mt-1 text-sm text-gray-800 leading-snug",
        align === "right" && "text-right"
      )}>
        {children}
      </div>
    </div>
  )
}

// ── StatBar ─────────────────────────────────────────────────────────────────

export interface StatBarProps {
  children: React.ReactNode
  className?: string
}

/**
 * Horizontal row of StatCells with CSS Grid alignment.
 * All labels share one row, all values share another — pixel-perfect
 * vertical alignment regardless of content height.
 *
 * Usage:
 * ```tsx
 * <StatBar>
 *   <StatCell label="Bank balance"><MoneyValue amount={553.44} /></StatCell>
 *   <StatCell label="Book balance"><MoneyValue amount={0} /></StatCell>
 *   <StatCell label="Variance" className="text-red-600">$553.44</StatCell>
 * </StatBar>
 * ```
 */
export function StatBar({ children, className }: StatBarProps) {
  return (
    <div className={cn("flex items-start gap-6", className)}>
      {children}
    </div>
  )
}
