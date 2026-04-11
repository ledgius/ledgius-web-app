import { useCallback, useState } from "react"
import type { CellPosition, GridColumn } from "./types"

interface UseGridKeyboardOptions {
  rowCount: number
  columns: GridColumn<unknown>[]
  editableColumns: number[]
  onStartEdit: (pos: CellPosition) => void
  onCommitEdit: () => void
  onCancelEdit: () => void
  onAddRow?: () => void
  onDeleteRow?: (rowIndex: number) => void
  isEditing: boolean
}

export function useGridKeyboard({
  rowCount,
  editableColumns,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onAddRow,
  onDeleteRow,
  isEditing,
}: UseGridKeyboardOptions) {
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null)

  const moveFocus = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      setFocusedCell((prev) => {
        if (!prev) return prev
        const { row, col } = prev

        switch (direction) {
          case "up":
            return row > 0 ? { row: row - 1, col } : prev
          case "down":
            return row < rowCount - 1 ? { row: row + 1, col } : prev
          case "left": {
            const idx = editableColumns.indexOf(col)
            return idx > 0 ? { row, col: editableColumns[idx - 1] } : prev
          }
          case "right": {
            const idx = editableColumns.indexOf(col)
            if (idx < editableColumns.length - 1) {
              return { row, col: editableColumns[idx + 1] }
            }
            // Last column, last row — add new row if supported
            if (row === rowCount - 1 && onAddRow) {
              onAddRow()
              return { row: row + 1, col: editableColumns[0] }
            }
            // Last column — wrap to next row
            if (row < rowCount - 1) {
              return { row: row + 1, col: editableColumns[0] }
            }
            return prev
          }
          default:
            return prev
        }
      })
    },
    [rowCount, editableColumns, onAddRow]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!focusedCell) return

      if (isEditing) {
        switch (e.key) {
          case "Enter":
            e.preventDefault()
            onCommitEdit()
            moveFocus("down")
            break
          case "Tab":
            e.preventDefault()
            onCommitEdit()
            moveFocus(e.shiftKey ? "left" : "right")
            break
          case "Escape":
            e.preventDefault()
            onCancelEdit()
            break
        }
        return
      }

      // Navigation mode
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          moveFocus("up")
          break
        case "ArrowDown":
          e.preventDefault()
          moveFocus("down")
          break
        case "ArrowLeft":
          e.preventDefault()
          moveFocus("left")
          break
        case "ArrowRight":
          e.preventDefault()
          moveFocus("right")
          break
        case "Tab":
          e.preventDefault()
          moveFocus(e.shiftKey ? "left" : "right")
          break
        case "Enter":
          e.preventDefault()
          onStartEdit(focusedCell)
          break
        case "Delete":
        case "Backspace":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            onDeleteRow?.(focusedCell.row)
          }
          break
      }
    },
    [focusedCell, isEditing, moveFocus, onStartEdit, onCommitEdit, onCancelEdit, onDeleteRow]
  )

  return { focusedCell, setFocusedCell, handleKeyDown }
}
