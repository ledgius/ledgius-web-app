import { useState, useRef, useEffect } from "react"
import { cn } from "@/shared/lib/utils"
import { ChevronDown, X } from "lucide-react"

export interface ComboboxOption {
  value: string | number
  label: string
  detail?: string
}

export interface ComboboxProps {
  /** Available options */
  options: ComboboxOption[]
  /** Currently selected value */
  value: string | number | null
  /** Called when selection changes */
  onChange: (value: string | number | null) => void
  /** Placeholder text when nothing selected */
  placeholder?: string
  /** Disable the control */
  disabled?: boolean
  className?: string
}

/**
 * Type-ahead combobox that filters options as the user types.
 * Supports keyboard navigation (arrow keys, enter, escape).
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Use loose comparison to handle string/number mismatch (e.g. "1" vs 1)
  const selectedOption = options.find((o) => String(o.value) === String(value))

  const filtered = query
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.detail?.toLowerCase().includes(query.toLowerCase())
      )
    : options

  useEffect(() => {
    setHighlightIndex(0)
  }, [query])

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.querySelector("[data-highlighted=true]")
    el?.scrollIntoView({ block: "nearest" })
  }, [highlightIndex])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (inputRef.current && !inputRef.current.closest("[data-combobox]")?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (open && filtered[highlightIndex]) {
        onChange(filtered[highlightIndex].value)
        setOpen(false)
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  return (
    <div className={cn("relative", className)} data-combobox>
      {/* Display / input */}
      <div
        className={cn(
          "flex items-center border rounded px-2 py-1.5 text-sm transition-colors",
          open ? "border-primary-400 ring-2 ring-primary-100" : "border-gray-300",
          disabled && "bg-gray-50 opacity-60 pointer-events-none"
        )}
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none"
            placeholder={placeholder}
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
            className="flex-1 text-left truncate"
          >
            {selectedOption ? (
              <span className="text-gray-900">{selectedOption.label}</span>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </button>
        )}
        {value && !open ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(null) }}
            className="shrink-0 p-0.5 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
          ) : (
            filtered.map((opt, i) => (
              <button
                key={opt.value}
                type="button"
                data-highlighted={i === highlightIndex}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                onMouseEnter={() => setHighlightIndex(i)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors",
                  i === highlightIndex ? "bg-primary-50 text-primary-800" : "text-gray-700 hover:bg-gray-50",
                  String(opt.value) === String(value) && "font-medium"
                )}
              >
                <span>{opt.label}</span>
                {opt.detail && (
                  <span className="ml-2 text-xs text-gray-400">{opt.detail}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
