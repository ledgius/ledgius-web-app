// Spec references: R-0071 (RT-004), T-0033-09.
//
// Custom Puck field renderer — replaces the plain text fieldSlug
// input with a grouped, searchable picker populated from the
// data source's field catalogue API.

import { createContext, useContext, useState, useRef, useEffect, useMemo } from "react"
import { useFieldCatalogue, type DataField } from "../hooks/useReportTemplates"
import { cn } from "@/shared/lib/utils"
import { ChevronDown, Search } from "lucide-react"

// ── Context — passes template data_source from ReportDesignerPage ──

interface ReportEditorContextValue {
  dataSource: string
}

const ReportEditorContext = createContext<ReportEditorContextValue>({ dataSource: "" })

export function ReportEditorProvider({ dataSource, children }: { dataSource: string; children: React.ReactNode }) {
  return (
    <ReportEditorContext.Provider value={{ dataSource }}>
      {children}
    </ReportEditorContext.Provider>
  )
}

export function useReportEditorContext() {
  return useContext(ReportEditorContext)
}

// ── Type badge colours ──

const typeBadge: Record<string, { label: string; color: string }> = {
  string:   { label: "text",     color: "bg-gray-100 text-gray-600" },
  number:   { label: "number",   color: "bg-blue-50 text-blue-600" },
  currency: { label: "currency", color: "bg-green-50 text-green-700" },
  date:     { label: "date",     color: "bg-amber-50 text-amber-700" },
  boolean:  { label: "bool",     color: "bg-purple-50 text-purple-600" },
  list:     { label: "list",     color: "bg-cyan-50 text-cyan-700" },
}

// ── FieldSlugPicker — the custom Puck field ──

interface FieldSlugPickerProps {
  value: string
  onChange: (value: string) => void
  /** Optional: only show fields matching this type (e.g. "list", "date") */
  filterType?: string
}

export function FieldSlugPicker({ value, onChange, filterType }: FieldSlugPickerProps) {
  const { dataSource } = useReportEditorContext()
  const { data: fields, isLoading } = useFieldCatalogue(dataSource || undefined)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Filter by type if requested, then by search query
  const filteredFields = useMemo(() => {
    if (!fields) return []
    let f = fields
    if (filterType) f = f.filter(fd => fd.type === filterType)
    if (query) {
      const q = query.toLowerCase()
      f = f.filter(fd => fd.name.toLowerCase().includes(q) || fd.slug.toLowerCase().includes(q))
    }
    return f
  }, [fields, filterType, query])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, DataField[]> = {}
    for (const f of filteredFields) {
      const cat = f.category || "other"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(f)
    }
    return groups
  }, [filteredFields])

  const selectedField = fields?.find(f => f.slug === value)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  // Focus search when opened
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  if (!dataSource) {
    return <div className="text-xs text-gray-400 italic py-1">No data source selected</div>
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Selected value display / trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery("") }}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm rounded-md border transition-colors text-left",
          open ? "border-primary-400 ring-2 ring-primary-100" : "border-gray-300 hover:border-gray-400",
          "bg-white"
        )}
      >
        {selectedField ? (
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate">{selectedField.name}</span>
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", typeBadge[selectedField.type]?.color ?? "bg-gray-100 text-gray-500")}>
              {typeBadge[selectedField.type]?.label ?? selectedField.type}
            </span>
          </span>
        ) : (
          <span className="text-gray-400">{isLoading ? "Loading fields..." : "Select field..."}</span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 flex flex-col">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search fields..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-300"
            />
          </div>

          {/* Grouped options */}
          <div className="overflow-y-auto flex-1 py-1">
            {Object.keys(grouped).length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-400 italic">
                {isLoading ? "Loading..." : "No matching fields"}
              </div>
            )}
            {Object.entries(grouped).map(([category, categoryFields]) => (
              <div key={category}>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {category}
                </div>
                {categoryFields.map(f => (
                  <button
                    key={f.slug}
                    type="button"
                    onClick={() => { onChange(f.slug); setOpen(false); setQuery("") }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors text-left",
                      f.slug === value && "bg-primary-50 text-primary-800"
                    )}
                  >
                    <span className="flex-1 truncate">{f.name}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", typeBadge[f.type]?.color ?? "bg-gray-100 text-gray-500")}>
                      {typeBadge[f.type]?.label ?? f.type}
                    </span>
                    <span className="text-[10px] text-gray-300 font-mono shrink-0">{f.slug}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Puck custom field factory ──
// Creates a Puck-compatible field config object for use in
// reportComponents.tsx. filterType restricts which field types
// are shown (e.g. "list" for DataTable, "date" for DateField).

export function fieldSlugPickerField(label: string, filterType?: string) {
  return {
    type: "custom" as const,
    label,
    render: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
      <FieldSlugPicker value={value ?? ""} onChange={onChange} filterType={filterType} />
    ),
  }
}
