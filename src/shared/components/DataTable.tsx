import { cn } from "@/shared/lib/utils"
import { Skeleton } from "@/components/primitives"

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  emptyMessage?: string
  loading?: boolean
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data",
  loading = false,
}: DataTableProps<T>) {
  // While loading, show skeleton — no table flash
  if (loading) {
    return <Skeleton variant="table" rows={8} columns={columns.length} />
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn("px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "transition-colors",
                  i % 2 === 1 && "bg-gray-50/50",
                  onRowClick && "cursor-pointer hover:bg-gray-100"
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
