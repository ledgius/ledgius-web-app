import { useEffect, useRef, useState } from "react"
import { cn } from "@/shared/lib/utils"
import type { GridColumn } from "./types"

interface CellEditorProps {
  column: GridColumn<unknown>
  value: unknown
  onChange: (value: unknown) => void
  onCommit: () => void
  onCancel: () => void
  error?: string | null
}

export function CellEditor({ column, value, onChange, onCommit, onCancel: _onCancel, error }: CellEditorProps) {
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)
  const [localValue, setLocalValue] = useState(value ?? "")

  useEffect(() => {
    inputRef.current?.focus()
    if (inputRef.current instanceof HTMLInputElement) {
      inputRef.current.select()
    }
  }, [])

  const handleChange = (newValue: string) => {
    setLocalValue(newValue)
    if (column.editor === "number" || column.editor === "money") {
      const num = parseFloat(newValue)
      onChange(isNaN(num) ? "" : num)
    } else {
      onChange(newValue)
    }
  }

  const baseClass = cn(
    "w-full h-full px-2 py-1 text-sm border-0 outline-none bg-white focus:ring-2 focus:ring-primary-400 rounded",
    column.align === "right" && "text-right",
    error && "ring-2 ring-red-400"
  )

  if (column.editor === "select" && column.options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={String(localValue)}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={onCommit}
        className={baseClass}
      >
        <option value="">Select...</option>
        {column.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={column.editor === "number" || column.editor === "money" ? "number" : "text"}
      value={String(localValue)}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={onCommit}
      step={column.editor === "money" ? "0.01" : undefined}
      className={cn(baseClass, "tabular-nums")}
    />
  )
}
