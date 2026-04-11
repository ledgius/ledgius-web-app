import type { ReactNode } from "react"

/** Column definition for the financial grid */
export interface GridColumn<T> {
  /** Unique key matching a field in the row data */
  key: string
  /** Column header label */
  header: string
  /** Column width (CSS value or "auto") */
  width?: string
  /** Text alignment */
  align?: "left" | "right" | "center"
  /** Whether this column is editable */
  editable?: boolean
  /** Cell editor type */
  editor?: "text" | "number" | "money" | "select" | "combobox"
  /** Options for select/combobox editors */
  options?: { value: string; label: string }[]
  /** Custom cell renderer for display mode */
  render?: (value: unknown, row: T, rowIndex: number) => ReactNode
  /** Cell-level validation returning error message or null */
  validate?: (value: unknown, row: T) => string | null
  /** Additional CSS class for the column */
  className?: string
}

/** Row-level validation result */
export interface RowValidation {
  /** Row index */
  rowIndex: number
  /** Field-level errors */
  errors: Record<string, string>
  /** Field-level warnings */
  warnings: Record<string, string>
}

/** Grid-level validation result */
export interface GridValidation {
  /** Blockers that prevent commit */
  blockers: string[]
  /** Warnings that should be reviewed */
  warnings: string[]
  /** Per-row validation */
  rows: RowValidation[]
}

/** Cell position in the grid */
export interface CellPosition {
  row: number
  col: number
}

/** Footer totals row definition */
export interface GridFooterRow {
  /** Label for the totals row */
  label: string
  /** Values keyed by column key */
  values: Record<string, ReactNode>
  /** Visual emphasis */
  emphasis?: "normal" | "strong"
}
