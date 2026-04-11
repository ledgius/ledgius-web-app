import { cn } from "@/shared/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render a full table skeleton with header and rows */
  variant?: "default" | "text" | "table"
  /** Number of rows for table variant */
  rows?: number
  /** Number of columns for table variant */
  columns?: number
}

export function Skeleton({
  className,
  variant = "default",
  rows = 5,
  columns = 4,
  ...props
}: SkeletonProps) {
  if (variant === "text") {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200" />
      </div>
    )
  }

  if (variant === "table") {
    return (
      <div className={cn("border border-gray-200 rounded-lg overflow-hidden", className)} {...props}>
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-3 flex-1 animate-pulse rounded bg-gray-200" />
          ))}
        </div>
        <div className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex gap-4">
              {Array.from({ length: columns }).map((_, j) => (
                <div key={j} className="h-3 flex-1 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn("animate-pulse rounded bg-gray-200", className)}
      {...props}
    />
  )
}
