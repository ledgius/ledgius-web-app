import { useCallback, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/components/primitives/Button"
import type { CellPosition, GridColumn, GridFooterRow } from "./types"
import { useGridKeyboard } from "./useGridKeyboard"
import { CellEditor } from "./CellEditor"

export interface FinancialGridProps<T extends Record<string, unknown>> {
  /** Column definitions */
  columns: GridColumn<T>[]
  /** Row data */
  rows: T[]
  /** Called when row data changes */
  onChange: (rows: T[]) => void
  /** Footer totals rows */
  footer?: GridFooterRow[]
  /** Allow adding new rows */
  canAddRow?: boolean
  /** Called to create a new blank row */
  createRow?: () => T
  /** Allow deleting rows */
  canDeleteRow?: boolean | ((row: T, index: number) => boolean)
  /** Whether the grid is read-only */
  readOnly?: boolean
  /** Validation errors by row index and column key */
  errors?: Record<number, Record<string, string>>
  /** Empty state message */
  emptyMessage?: string
  className?: string
}

/**
 * Shared editable financial grid infrastructure.
 * Per component_architecture_v1.md section 6: powers invoice lines, bill lines,
 * journal lines, reconciliation split allocations, import preview tables.
 *
 * Keyboard: Arrow keys navigate, Enter edits, Tab moves horizontally,
 * Esc cancels edit, Ctrl+Backspace deletes row.
 */
export function FinancialGrid<T extends Record<string, unknown>>({
  columns,
  rows,
  onChange,
  footer,
  canAddRow = false,
  createRow,
  canDeleteRow = false,
  readOnly = false,
  errors,
  emptyMessage = "No line items. Add a row to get started.",
  className,
}: FinancialGridProps<T>) {
  const [editingCell, setEditingCell] = useState<CellPosition | null>(null)
  const [editValue, setEditValue] = useState<unknown>(null)

  const editableColumns = useMemo(
    () => columns.map((c, i) => (c.editable ? i : -1)).filter((i) => i >= 0),
    [columns]
  )

  const handleStartEdit = useCallback(
    (pos: CellPosition) => {
      if (readOnly) return
      const col = columns[pos.col]
      if (!col.editable) return
      setEditingCell(pos)
      setEditValue(rows[pos.row][col.key])
    },
    [columns, rows, readOnly]
  )

  const handleCommitEdit = useCallback(() => {
    if (!editingCell) return
    const col = columns[editingCell.col]
    const newRows = [...rows]
    newRows[editingCell.row] = { ...newRows[editingCell.row], [col.key]: editValue }
    onChange(newRows)
    setEditingCell(null)
    setEditValue(null)
  }, [editingCell, editValue, columns, rows, onChange])

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditValue(null)
  }, [])

  const handleAddRow = useCallback(() => {
    if (!createRow) return
    onChange([...rows, createRow()])
  }, [rows, onChange, createRow])

  const handleDeleteRow = useCallback(
    (index: number) => {
      const canDelete = typeof canDeleteRow === "function" ? canDeleteRow(rows[index], index) : canDeleteRow
      if (!canDelete) return
      onChange(rows.filter((_, i) => i !== index))
    },
    [rows, onChange, canDeleteRow]
  )

  const { focusedCell, setFocusedCell, handleKeyDown } = useGridKeyboard({
    rowCount: rows.length,
    columns: columns as GridColumn<unknown>[],
    editableColumns,
    onStartEdit: handleStartEdit,
    onCommitEdit: handleCommitEdit,
    onCancelEdit: handleCancelEdit,
    onAddRow: canAddRow && createRow ? handleAddRow : undefined,
    onDeleteRow: canDeleteRow ? handleDeleteRow : undefined,
    isEditing: editingCell !== null,
  })

  const showDeleteColumn = !readOnly && canDeleteRow

  return (
    <div className={cn("border border-gray-200 rounded-lg overflow-hidden", className)}>
      <div className="overflow-x-auto" onKeyDown={handleKeyDown} role="grid" tabIndex={0}>
        <table className="w-full text-sm">
          {/* Header */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
              {showDeleteColumn && <th className="w-10" />}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (showDeleteColumn ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    "transition-colors",
                    focusedCell?.row === rowIndex && "bg-primary-50/50"
                  )}
                >
                  {columns.map((col, colIndex) => {
                    const isFocused = focusedCell?.row === rowIndex && focusedCell?.col === colIndex
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex
                    const cellError = errors?.[rowIndex]?.[col.key]

                    return (
                      <td
                        key={col.key}
                        className={cn(
                          "px-3 py-1.5 relative",
                          col.align === "right" && "text-right",
                          col.align === "center" && "text-center",
                          isFocused && !isEditing && "ring-2 ring-inset ring-primary-400",
                          cellError && !isEditing && "bg-red-50",
                          col.className
                        )}
                        onClick={() => {
                          setFocusedCell({ row: rowIndex, col: colIndex })
                          if (col.editable && !readOnly) {
                            handleStartEdit({ row: rowIndex, col: colIndex })
                          }
                        }}
                      >
                        {isEditing ? (
                          <CellEditor
                            column={col as GridColumn<unknown>}
                            value={editValue}
                            onChange={setEditValue}
                            onCommit={handleCommitEdit}
                            onCancel={handleCancelEdit}
                            error={cellError}
                          />
                        ) : (
                          <>
                            <span className="tabular-nums">
                              {col.render
                                ? col.render(row[col.key], row, rowIndex)
                                : String(row[col.key] ?? "")}
                            </span>
                            {cellError && (
                              <div className="absolute bottom-0 left-3 right-3 text-xs text-red-600 truncate">
                                {cellError}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    )
                  })}
                  {showDeleteColumn && (
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(rowIndex)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                        title="Delete row"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>

          {/* Footer totals */}
          {footer && footer.length > 0 && (
            <tfoot>
              {footer.map((footerRow, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-t border-gray-200 bg-gray-50",
                    footerRow.emphasis === "strong" && "font-semibold"
                  )}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-2.5 text-sm",
                        col.align === "right" && "text-right",
                        col.align === "center" && "text-center"
                      )}
                    >
                      {colIndex === 0 && !footerRow.values[col.key]
                        ? footerRow.label
                        : footerRow.values[col.key] ?? ""}
                    </td>
                  ))}
                  {showDeleteColumn && <td />}
                </tr>
              ))}
            </tfoot>
          )}
        </table>
      </div>

      {/* Add row button */}
      {canAddRow && createRow && !readOnly && (
        <div className="border-t border-gray-200 px-3 py-2 bg-gray-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddRow}
          >
            <Plus className="h-3.5 w-3.5" />
            Add line
          </Button>
        </div>
      )}
    </div>
  )
}
