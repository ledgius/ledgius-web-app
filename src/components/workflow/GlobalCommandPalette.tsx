import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  Search, FileText, Receipt, Users, BookOpen, Landmark,
  CreditCard, BarChart3, Shield, Plus, ArrowRight,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { LucideIcon } from "lucide-react"

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: LucideIcon
  group: string
  path: string
  keywords: string[]
}

const commands: CommandItem[] = [
  // Navigation
  { id: "nav-invoices", label: "Invoices", description: "View all invoices", icon: FileText, group: "Go to", path: "/invoices", keywords: ["invoice", "ar", "receivable", "sales"] },
  { id: "nav-bills", label: "Bills", description: "View all bills", icon: Receipt, group: "Go to", path: "/bills", keywords: ["bill", "ap", "payable", "purchase"] },
  { id: "nav-customers", label: "Customers", description: "Customer contacts", icon: Users, group: "Go to", path: "/customers", keywords: ["customer", "contact", "client"] },
  { id: "nav-vendors", label: "Vendors", description: "Vendor contacts", icon: Users, group: "Go to", path: "/vendors", keywords: ["vendor", "supplier", "contact"] },
  { id: "nav-accounts", label: "Chart of Accounts", description: "View all accounts", icon: BookOpen, group: "Go to", path: "/accounts", keywords: ["account", "chart", "coa", "ledger"] },
  { id: "nav-gl", label: "Journal Entries", description: "General ledger", icon: Landmark, group: "Go to", path: "/gl", keywords: ["journal", "gl", "ledger", "entry"] },
  { id: "nav-banking", label: "Bank Reconciliation", description: "Reconcile bank accounts", icon: CreditCard, group: "Go to", path: "/bank-reconciliation", keywords: ["bank", "reconcile", "recon", "statement"] },
  { id: "nav-reports", label: "Financial Reports", description: "P&L, balance sheet, more", icon: BarChart3, group: "Go to", path: "/reports", keywords: ["report", "pnl", "balance", "financial"] },
  { id: "nav-approvals", label: "Approvals", description: "Pending transaction approvals", icon: Shield, group: "Go to", path: "/approvals", keywords: ["approval", "approve", "pending"] },
  { id: "nav-audit", label: "Audit Log", description: "System-wide audit trail", icon: Shield, group: "Go to", path: "/audit-log", keywords: ["audit", "log", "history", "trail"] },

  // Create actions
  { id: "create-invoice", label: "New Invoice", description: "Create a new sales invoice", icon: Plus, group: "Create", path: "/invoices/new", keywords: ["new", "create", "invoice", "sales"] },
  { id: "create-bill", label: "New Bill", description: "Record a new supplier bill", icon: Plus, group: "Create", path: "/bills/new", keywords: ["new", "create", "bill", "purchase"] },
  { id: "create-journal", label: "New Journal Entry", description: "Post a manual journal entry", icon: Plus, group: "Create", path: "/gl", keywords: ["new", "create", "journal", "entry"] },
  { id: "create-customer", label: "New Customer", description: "Add a new customer", icon: Plus, group: "Create", path: "/contacts/new?type=customer", keywords: ["new", "create", "customer"] },
  { id: "create-vendor", label: "New Vendor", description: "Add a new vendor", icon: Plus, group: "Create", path: "/contacts/new?type=vendor", keywords: ["new", "create", "vendor", "supplier"] },
  { id: "create-account", label: "New Account", description: "Add to chart of accounts", icon: Plus, group: "Create", path: "/accounts/new", keywords: ["new", "create", "account"] },
]

export interface GlobalCommandPaletteProps {
  open: boolean
  onClose: () => void
  onNavigate: (path: string) => void
}

export function GlobalCommandPalette({ open, onClose, onNavigate }: GlobalCommandPaletteProps) {
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords.some((k) => k.includes(q))
    )
  }, [query])

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    for (const item of filtered) {
      const existing = map.get(item.group)
      if (existing) {
        existing.push(item)
      } else {
        map.set(item.group, [item])
      }
    }
    return map
  }, [filtered])

  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Scroll active item into view
  useEffect(() => {
    const active = listRef.current?.querySelector("[data-active=true]")
    active?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  const handleSelect = useCallback(
    (item: CommandItem) => {
      onNavigate(item.path)
    },
    [onNavigate]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (filtered[activeIndex]) {
          handleSelect(filtered[activeIndex])
        }
      } else if (e.key === "Escape") {
        onClose()
      }
    },
    [filtered, activeIndex, handleSelect, onClose]
  )

  if (!open) return null

  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

      {/* Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-gray-100">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or jump to..."
              className="flex-1 py-3 text-sm bg-transparent border-0 outline-none placeholder:text-gray-400"
            />
            <kbd className="hidden sm:inline-flex items-center rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              Array.from(groups.entries()).map(([groupName, items]) => (
                <div key={groupName} className="mb-2">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {groupName}
                  </p>
                  {items.map((item) => {
                    flatIndex++
                    const isActive = flatIndex === activeIndex
                    const Icon = item.group === "Create" ? Plus : ArrowRight
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-active={isActive}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setActiveIndex(flatIndex)}
                        className={cn(
                          "flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-left transition-colors",
                          isActive ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"
                        )}
                      >
                        <item.icon className="h-4 w-4 shrink-0 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{item.label}</span>
                          {item.description && (
                            <span className="ml-2 text-xs text-gray-400">{item.description}</span>
                          )}
                        </div>
                        <Icon className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400">
            <span><kbd className="font-mono">&uarr;&darr;</kbd> navigate</span>
            <span><kbd className="font-mono">&crarr;</kbd> select</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </div>
  )
}
