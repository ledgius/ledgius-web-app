import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search, Plus, User, LogOut, Settings, HelpCircle, MessageSquare,
  FileText, Receipt, Landmark, Users, BookOpen,
  ChevronDown, ChevronLeft, ChevronRight, CreditCard, DollarSign,
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/shared/lib/utils"
import { useAuth } from "@/shared/lib/auth"
import { useActivePeriod } from "@/shared/lib/active-period"
import { useHelpPanelToggle } from "@/components/workflow"
import { FinancialTimeline, useCalendarBadge } from "@/components/workflow/FinancialTimeline"
import { api } from "@/shared/lib/api"
import type { DashboardMetrics } from "@/domains/dashboard/hooks/useDashboard"
import { BankFeedStatusBadge } from "@/domains/bankfeed/components/BankFeedStatusBadge"

interface AppHeaderProps {
  onSearchOpen: () => void
}

const quickCreateItems = [
  { label: "New Invoice", path: "/invoices/new", icon: FileText },
  { label: "New Bill", path: "/bills/new", icon: Receipt },
  { label: "New Journal Entry", path: "/gl", icon: Landmark },
  { label: "New Customer", path: "/contacts/new?type=customer", icon: Users },
  { label: "New Vendor", path: "/contacts/new?type=vendor", icon: Users },
  { label: "New Account", path: "/accounts/new", icon: BookOpen },
]

function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}m`
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`
  return `$${amount.toFixed(0)}`
}

export function AppHeader({ onSearchOpen, onFeedbackOpen }: AppHeaderProps & { onFeedbackOpen?: () => void }) {
  const navigate = useNavigate()
  const { user, currentRole, tenants, currentTenantId, switchTenant, logout } = useAuth()
  const { toggle: toggleHelp, isOpen: helpOpen } = useHelpPanelToggle()
  const [createOpen, setCreateOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [tenantOpen, setTenantOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const { overdueCount, todayCount } = useCalendarBadge()
  const createRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const tenantRef = useRef<HTMLDivElement>(null)

  const currentTenant = tenants.find((t) => t.tenant_id === currentTenantId)
  const tenantName = currentTenant?.tenant?.display_name ?? "No organisation"
  const now = new Date()

  // Reuse dashboard metrics for header alert badges
  const { data: metrics } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardMetrics>("/dashboard"),
    refetchInterval: 60_000,
  })

  const arOutstanding = metrics ? parseFloat(metrics.ar_outstanding) : 0
  const apOutstanding = metrics ? parseFloat(metrics.ap_outstanding) : 0

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) setCreateOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node)) setTenantOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <header className="h-12 shrink-0 border-b border-gray-200 bg-white flex items-center px-4 gap-4">
      {/* ── Left: Logo + Tenant ── */}
      <div className="flex items-center gap-3 min-w-0">
        <img src="/brand/logo/logo-compact.svg" alt="Ledgius" className="h-8 w-auto" />
        <span className="text-gray-300" aria-hidden="true">|</span>
        {tenants.length > 1 ? (
          <div ref={tenantRef} className="relative">
            <button
              type="button"
              onClick={() => setTenantOpen(!tenantOpen)}
              className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 truncate max-w-48"
            >
              {tenantName}
              <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" />
            </button>
            {tenantOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                {tenants.map((m) => (
                  <button
                    key={m.tenant_id}
                    onClick={() => { switchTenant(m.tenant_id); setTenantOpen(false) }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-sm hover:bg-gray-50",
                      m.tenant_id === currentTenantId && "bg-primary-50 font-medium"
                    )}
                  >
                    {m.tenant?.display_name ?? m.tenant_id}
                    <span className="text-[10px] text-gray-400 ml-1">({m.role})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-sm font-medium text-gray-700 truncate max-w-48">{tenantName}</span>
        )}
      </div>

      {/* ── Center: Active-period selector + date (hidden on mobile) ── */}
      <div className="hidden md:flex flex-1 items-center justify-center gap-3 text-xs text-gray-500 relative" ref={calendarRef}>
        <ActivePeriodSelector />
        <span className="text-gray-300" aria-hidden="true">&middot;</span>
        <button
          type="button"
          onClick={() => setCalendarOpen(!calendarOpen)}
          className={cn(
            "tabular-nums inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-colors",
            calendarOpen
              ? "bg-primary-50 text-primary-700"
              : "hover:bg-gray-100 hover:text-gray-700"
          )}
          title="Financial timeline — click to view tasks and events"
        >
          {formatHeaderDate(now)}
          {overdueCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
          {overdueCount === 0 && todayCount > 0 && (
            <span className="h-2 w-2 rounded-full bg-amber-400" />
          )}
        </button>
        <FinancialTimeline isOpen={calendarOpen} onClose={() => setCalendarOpen(false)} />
      </div>
      {/* Spacer on mobile when time context is hidden */}
      <div className="flex-1 md:hidden" />

      {/* ── Right: Alerts + Actions + User ── */}
      <div className="flex items-center gap-1">
        {/* Alert badges (hidden on mobile) */}
        {arOutstanding > 0 && (
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors"
            title="Outstanding receivables — money owed to you"
          >
            <DollarSign className="h-3 w-3" />
            <span className="font-medium">AR {formatCompact(arOutstanding)}</span>
          </button>
        )}
        {apOutstanding > 0 && (
          <button
            type="button"
            onClick={() => navigate("/bills")}
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
            title="Outstanding payables"
          >
            <DollarSign className="h-3 w-3" />
            <span className="font-medium">AP {formatCompact(apOutstanding)}</span>
          </button>
        )}

        {/* Reconciliation badge (hidden on mobile) */}
        <button
          type="button"
          onClick={() => navigate("/bank-reconciliation")}
          className="hidden md:block p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Bank reconciliation"
        >
          <CreditCard className="h-4 w-4" />
        </button>

        {/* Bank feed status (R-0049 — hidden on mobile) */}
        <div className="hidden md:flex items-center px-2">
          <BankFeedStatusBadge />
        </div>

        {/* Divider (hidden on mobile) */}
        <div className="hidden md:block w-px h-5 bg-gray-200 mx-1" />

        {/* Search */}
        <button
          type="button"
          onClick={onSearchOpen}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Search (Ctrl+K)"
        >
          <Search className="h-4 w-4" />
          <kbd className="hidden lg:inline-flex items-center rounded border border-gray-200 px-1 text-[10px] font-mono text-gray-400">
            {navigator.platform.includes("Mac") ? "\u2318" : "Ctrl"}K
          </kbd>
        </button>

        {/* Quick create */}
        <div ref={createRef} className="relative">
          <button
            type="button"
            onClick={() => setCreateOpen(!createOpen)}
            className="p-1.5 rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
            title="Quick create"
          >
            <Plus className="h-4 w-4" />
          </button>
          {createOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              {quickCreateItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setCreateOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <item.icon className="h-3.5 w-3.5 text-gray-400" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Feedback button (hidden on small mobile) */}
        {onFeedbackOpen && (
          <button
            type="button"
            onClick={onFeedbackOpen}
            className="hidden sm:block p-1.5 rounded-md transition-colors text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            title="Feedback (F2)"
            data-feedback-panel
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        )}

        {/* Help panel toggle (hidden on small mobile) */}
        <button
          type="button"
          onClick={toggleHelp}
          className={cn(
            "hidden sm:block p-1.5 rounded-md transition-colors",
            helpOpen
              ? "text-primary-600 bg-primary-50"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          )}
          title="Help (F1)"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-gray-200 mx-1" />

        {/* User menu */}
        <div ref={userRef} className="relative">
          <button
            type="button"
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <User className="h-4 w-4 text-gray-500" />
            <div className="hidden md:block text-left">
              <p className="text-xs font-medium text-gray-900 leading-tight">{user?.display_name ?? "User"}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{currentRole ?? "user"}</p>
            </div>
            <ChevronDown className="h-3 w-3 text-gray-400 hidden md:block" />
          </button>
          {userOpen && (
            <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.display_name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{currentRole}</p>
              </div>
              <button
                onClick={() => { navigate("/users"); setUserOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings & Profile
              </button>
              <div className="border-t border-gray-100">
                <button
                  onClick={() => { logout(); setUserOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ActivePeriodSelector — top-nav control from T-0039 KCR-030.
// Shows "< Q3 FY 2025-26 >"; left moves earlier, right moves later
// but is disabled when active_period === current_period. Clicking the
// label opens a popover with presets and a "reset to current" button.
function ActivePeriodSelector() {
  const { period, label, isCurrent, shiftQuarter, setPeriod, currentPeriod, resetToCurrent } = useActivePeriod()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  // Preset resolver — previous quarter, previous FY (same quarter one year back).
  function previousQuarter(): typeof period {
    const m = /^(\d{4})-Q([1-4])$/.exec(period)
    if (!m) return period
    let year = parseInt(m[1], 10)
    let q = parseInt(m[2], 10)
    q -= 1
    if (q < 1) {
      q = 4
      year -= 1
    }
    return `${year}-Q${q}` as typeof period
  }
  function previousFY(): typeof period {
    const m = /^(\d{4})-Q([1-4])$/.exec(period)
    if (!m) return period
    const year = parseInt(m[1], 10) - 1
    const q = m[2]
    return `${year}-Q${q}` as typeof period
  }

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={() => shiftQuarter(-1)}
        className="p-0.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        title="Previous quarter"
        aria-label="Previous quarter"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
          isCurrent
            ? "text-gray-700 hover:bg-gray-100"
            : "text-amber-700 border-b-2 border-amber-400 hover:bg-amber-50",
        )}
        title={isCurrent ? "Active period (current quarter)" : `Viewing past period — current is ${currentPeriod}`}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={() => shiftQuarter(1)}
        disabled={isCurrent}
        className={cn(
          "p-0.5 rounded",
          isCurrent
            ? "text-gray-300 cursor-not-allowed"
            : "hover:bg-gray-100 text-gray-500 hover:text-gray-700",
        )}
        title={isCurrent ? "Already at current quarter" : "Next quarter"}
        aria-label="Next quarter"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 text-left">
          <button
            type="button"
            onClick={() => { resetToCurrent(); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Current quarter
          </button>
          <button
            type="button"
            onClick={() => { setPeriod(previousQuarter()); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Previous quarter
          </button>
          <button
            type="button"
            onClick={() => { setPeriod(previousFY()); setOpen(false) }}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
          >
            Previous FY (same Q)
          </button>
          {!isCurrent && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                type="button"
                onClick={() => { resetToCurrent(); setOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-primary-700 hover:bg-primary-50 font-medium"
              >
                Reset to current
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
