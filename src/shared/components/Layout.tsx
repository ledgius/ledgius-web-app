import { useState, useEffect, useCallback } from "react"
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom"
import {
  ShoppingCart, ShoppingBag, Landmark, BookOpen,
  BarChart3, Users, Settings2, Shield,
  FileText, Receipt, ArrowDownToLine, ArrowUpFromLine,
  CreditCard, ArrowLeftRight,
  CheckCircle, ListTree, Package,
  Calculator, DollarSign, Repeat, ClipboardList,
  UsersRound, Percent, PiggyBank, UserCheck, Wallet,
  Camera, Car, GitMerge, Send, Inbox, Sparkles, Import, Upload, Radio,
  FileBarChart, Scale, TrendingUp, Clock, ClipboardCheck, ChevronsLeft, ChevronsRight,
  Menu, X, HeartPulse, Calendar, MessageSquare as MessageSquareIcon,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useAuthTokenSync, useAuth } from "@/shared/lib/auth"
import { AppHeader } from "./AppHeader"
import { FeedbackConsoleStrip } from "@/components/feedback"
import { HelpPanelSidebar, useHelpDockPosition } from "@/components/workflow"
import { FeedbackPanel, FlowPulse, initActionTrail, trailNavigate } from "@/lib/feedback"
import { GlobalCommandPalette } from "@/components/workflow/GlobalCommandPalette"
import { KeyboardShortcutOverlay } from "@/components/workflow/KeyboardShortcutOverlay"
import type { LucideIcon } from "lucide-react"

// ── Types ──

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  badge?: string
}

interface NavSection {
  title: string
  icon?: LucideIcon
  items: NavItem[]
}

type SidebarMode = "finance" | "tasks" | "reports" | "ai" | "assets" | "liabilities" | "payroll" | "settings" | "platform"

// ── Mode definitions ──

const financeSections: NavSection[] = [
  {
    title: "",
    items: [
      { to: "/", label: "Books Overview", icon: HeartPulse },
      { to: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    title: "Sales",
    icon: ShoppingCart,
    items: [
      { to: "/invoices", label: "Invoices", icon: FileText },
      { to: "/receipts", label: "Receipts", icon: ArrowDownToLine },
      { to: "/credit-notes", label: "Credit Notes", icon: FileText },
    ],
  },
  {
    title: "Purchases",
    icon: ShoppingBag,
    items: [
      { to: "/bills", label: "Bills", icon: Receipt },
      { to: "/payments", label: "Payments", icon: ArrowUpFromLine },
      { to: "/debit-notes", label: "Debit Notes", icon: Receipt },
    ],
  },
  {
    title: "Banking",
    icon: CreditCard,
    items: [
      { to: "/bank-reconciliation", label: "Reconciliation", icon: GitMerge },
      { to: "/bank-statements", label: "Bank Statements", icon: FileText },
      { to: "/settings/bank-feeds", label: "Live Feed", icon: Radio },
      { to: "/captured-receipts", label: "Captured Receipts", icon: Camera },
      { to: "/transfers", label: "Transfers", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Ledger",
    icon: Landmark,
    items: [
      { to: "/gl", label: "Journal Entries", icon: Landmark },
      { to: "/approvals", label: "Approvals", icon: CheckCircle },
      { to: "/accounts", label: "Chart of Accounts", icon: BookOpen },
      { to: "/headings", label: "Account Headings", icon: ListTree },
    ],
  },
  {
    title: "Contacts",
    icon: Users,
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/vendors", label: "Vendors", icon: Users },
    ],
  },
  {
    title: "Audit",
    icon: Shield,
    items: [
      { to: "/audit-log", label: "Audit Log", icon: Shield },
    ],
  },
]

const assetsSections: NavSection[] = [
  {
    title: "",
    items: [
      { to: "/", label: "Books Overview", icon: HeartPulse },
    ],
  },
  {
    title: "Fixed Assets",
    items: [
      { to: "/assets", label: "Asset Register", icon: Package },
      { to: "/assets/buy", label: "Buy Asset", icon: ShoppingCart },
      { to: "/assets/sell", label: "Sell / Dispose Asset", icon: ArrowUpFromLine },
      { to: "/assets/depreciation", label: "Depreciation", icon: TrendingUp },
    ],
  },
  {
    title: "Vehicles",
    items: [
      { to: "/logbook", label: "Vehicle Logbook", icon: Car },
    ],
  },
]

const liabilitiesSections: NavSection[] = [
  {
    title: "",
    items: [
      { to: "/", label: "Books Overview", icon: HeartPulse },
    ],
  },
  {
    title: "Loans",
    items: [
      { to: "/loans", label: "Loan Register", icon: Landmark },
      { to: "/loans/payments", label: "Loan Payments", icon: ArrowUpFromLine },
      { to: "/loans/payout", label: "Loan Payout", icon: CheckCircle },
    ],
  },
]

const payrollSections: NavSection[] = [
  {
    title: "",
    items: [
      { to: "/", label: "Books Overview", icon: HeartPulse },
    ],
  },
  {
    title: "Payroll",
    items: [
      { to: "/pay-runs", label: "Pay Runs", icon: Wallet },
      { to: "/employees", label: "Employees", icon: UserCheck },
    ],
  },
  {
    title: "Leave",
    items: [
      { to: "/", label: "Leave Balances", icon: Calendar },
      { to: "/", label: "Leave Requests", icon: ClipboardCheck },
    ],
  },
  {
    title: "Compliance",
    items: [
      { to: "/payg-config", label: "PAYG Withholding", icon: Percent },
      { to: "/super-rates", label: "Super Rates", icon: PiggyBank },
      { to: "/super-obligations", label: "Super Obligations", icon: ClipboardCheck },
    ],
  },
]

const settingsSections: NavSection[] = [
  {
    title: "",
    items: [
      { to: "/", label: "Books Overview", icon: HeartPulse },
    ],
  },
  {
    title: "Configuration",
    items: [
      { to: "/products", label: "Products & Services", icon: Package },
      { to: "/tax-codes", label: "Tax Codes", icon: Settings2 },
      { to: "/currencies", label: "Currency", icon: DollarSign },
      { to: "/recurring", label: "Recurring", icon: Repeat },
      { to: "/templates", label: "Templates", icon: ClipboardList },
    ],
  },
  {
    title: "Connections",
    items: [
      { to: "/settings/bank-feeds", label: "Live Bank Feeds", icon: Radio },
    ],
  },
  {
    title: "Import / Export",
    items: [
      { to: "/import", label: "Data Import", icon: Import },
      { to: "/export", label: "Data Export", icon: Upload },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/users", label: "Users & Roles", icon: UsersRound },
      { to: "/admin", label: "Platform Admin", icon: Shield },
      { to: "/admin/feedback", label: "Feedback Inbox", icon: MessageSquareIcon },
    ],
  },
]

const tasksSections: NavSection[] = [
  {
    title: "",
    items: [
      { to: "/", label: "Books Overview", icon: HeartPulse },
      { to: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    title: "Banking",
    items: [
      { to: "/bank-reconciliation", label: "Reconcile Bank", icon: GitMerge },
      { to: "/bank-statements", label: "Bank Statements", icon: FileText },
      { to: "/settings/bank-feeds", label: "Live Feed", icon: Radio },
      { to: "/transfers", label: "Bank Transfers", icon: ArrowLeftRight },
    ],
  },
  {
    title: "Receivables",
    items: [
      { to: "/invoices", label: "Send & Chase Invoices", icon: Send },
      { to: "/credit-notes", label: "Apply Credit Notes", icon: FileText },
      { to: "/receipts", label: "Record Receipts", icon: Camera },
    ],
  },
  {
    title: "Payables",
    items: [
      { to: "/bills", label: "Review & Pay Bills", icon: Inbox },
      { to: "/payments", label: "Schedule Payments", icon: ArrowUpFromLine },
    ],
  },
  {
    title: "Compliance",
    items: [
      { to: "/bas", label: "BAS / GST", icon: Calculator },
    ],
  },
  {
    title: "Period",
    items: [
      { to: "/reports", label: "Month-end Review", icon: ClipboardCheck },
      { to: "/audit-log", label: "Audit Log", icon: Shield },
    ],
  },
  {
    title: "Data",
    items: [
      { to: "/import", label: "Data Import", icon: Import },
      { to: "/export", label: "Data Export", icon: Upload },
    ],
  },
]

const reportsSections: NavSection[] = [
  {
    title: "",
    items: [
      { to: "/", label: "Books Overview", icon: HeartPulse },
    ],
  },
  {
    title: "Financial",
    items: [
      { to: "/reports", label: "Profit & Loss", icon: TrendingUp },
      { to: "/reports", label: "Balance Sheet", icon: Scale },
      { to: "/reports", label: "Trial Balance", icon: ClipboardCheck },
      { to: "/reports", label: "Cash Flow", icon: FileBarChart },
    ],
  },
  {
    title: "Tax",
    items: [
      { to: "/bas", label: "BAS / GST", icon: Calculator },
      { to: "/tax-codes", label: "Tax Codes", icon: Settings2 },
    ],
  },
  {
    title: "Receivables & Payables",
    items: [
      { to: "/reports", label: "Aged Receivables", icon: Clock },
      { to: "/reports", label: "Aged Payables", icon: Clock },
    ],
  },
  {
    title: "Audit",
    items: [
      { to: "/audit-log", label: "Audit Log", icon: Shield },
    ],
  },
]

const aiSections: NavSection[] = [
  {
    title: "",
    items: [
      { to: "/", label: "Books Overview", icon: HeartPulse },
    ],
  },
  {
    title: "Finance AI",
    items: [
      { to: "/", label: "Ask a Question", icon: Sparkles },
      { to: "/", label: "Anomaly Detection", icon: Shield },
      { to: "/", label: "Cash Flow Forecast", icon: TrendingUp },
      { to: "/", label: "Tax Optimisation", icon: Calculator },
    ],
  },
]

const modeNavMap: Record<SidebarMode, NavSection[]> = {
  finance: financeSections,
  assets: assetsSections,
  liabilities: liabilitiesSections,
  payroll: payrollSections,
  tasks: tasksSections,
  reports: reportsSections,
  ai: aiSections,
  settings: settingsSections,
  platform: [
    {
      title: "Platform",
      items: [
        { to: "/platform/signups", label: "Sign-ups", icon: ClipboardList },
        { to: "/platform/tenants", label: "Tenants", icon: Landmark },
        { to: "/platform/plans", label: "Plans", icon: CreditCard },
        { to: "/platform/users", label: "Users", icon: UsersRound },
        { to: "/platform/operations", label: "Operations", icon: Settings2 },
        { to: "/platform/settings", label: "Settings", icon: Shield },
      ],
    },
  ],
}

const modeLabels: { key: SidebarMode; label: string; icon: LucideIcon }[] = [
  { key: "finance", label: "Finance", icon: Landmark },
  { key: "assets", label: "Assets", icon: Package },
  { key: "liabilities", label: "Liabilities", icon: CreditCard },
  { key: "payroll", label: "Payroll", icon: Wallet },
  { key: "tasks", label: "Tasks", icon: CheckCircle },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "ai", label: "AI", icon: Sparkles },
  { key: "settings", label: "Settings", icon: Settings2 },
  { key: "platform", label: "Platform", icon: Shield },
]

// ── Component ──

export function Layout() {
  useAuthTokenSync()
  const { user } = useAuth()
  const navigate = useNavigate()
  const helpDock = useHelpDockPosition()
  const [commandOpen, setCommandOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Initialise action trail and route tracking for feedback system.
  const location = useLocation()
  useEffect(() => { initActionTrail() }, [])
  useEffect(() => { trailNavigate(location.pathname); setMobileNavOpen(false) }, [location.pathname])

  // Sidebar mode — persisted to localStorage
  const [mode, setMode] = useState<SidebarMode>(() => {
    const saved = localStorage.getItem("ledgius-sidebar-mode")
    return (saved as SidebarMode) || "tasks"
  })
  const [navTransition, setNavTransition] = useState<"idle" | "out" | "in">("idle")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("ledgius-sidebar-collapsed") === "true"
  })

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      localStorage.setItem("ledgius-sidebar-collapsed", String(!prev))
      return !prev
    })
  }, [])

  const handleModeChange = (newMode: SidebarMode) => {
    if (newMode === mode) return
    setNavTransition("out")
    setTimeout(() => {
      setMode(newMode)
      localStorage.setItem("ledgius-sidebar-mode", newMode)
      setNavTransition("in")
      setTimeout(() => setNavTransition("idle"), 150)
    }, 120)
  }

  // Filter Settings mode: hide Platform Admin + Feedback Inbox for
  // non-admin users (backend enforces this — the filter just hides
  // links non-admins can't follow).
  const activeSections: NavSection[] = (() => {
    const sections = modeNavMap[mode]
    if (mode === "settings" && !user?.is_platform_admin) {
      return sections.map(s => {
        if (s.title === "Administration") {
          return { ...s, items: s.items.filter(i => i.to !== "/admin" && i.to !== "/admin/feedback") }
        }
        return s
      }).filter(s => s.items.length > 0)
    }
    return sections
  })()

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault()
      setCommandOpen(true)
    }
    if (e.key === "/" && !isInputFocused()) {
      e.preventDefault()
      setCommandOpen(true)
    }
    if (e.key === "?" && !isInputFocused()) {
      e.preventDefault()
      setShortcutsOpen(true)
    }
    if (e.key === "F2") {
      e.preventDefault()
      setFeedbackOpen(prev => !prev)
    }
  }, [])

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKeyDown)
    return () => document.removeEventListener("keydown", handleGlobalKeyDown)
  }, [handleGlobalKeyDown])

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ── Persistent header ── */}
      <AppHeader onSearchOpen={() => setCommandOpen(true)} onFeedbackOpen={() => setFeedbackOpen(true)} />

      {/* ── Sidebar + Main ── */}
      <div className="flex flex-1 min-h-0">
        {/* Mobile nav overlay */}
        {mobileNavOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="fixed bottom-4 left-4 z-50 md:hidden p-3 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <aside className={cn(
          "bg-white border-r border-gray-200 flex flex-col transition-all duration-200",
          sidebarCollapsed ? "w-12" : "w-52",
          // Mobile: fixed overlay, hidden by default
          "fixed md:static inset-y-0 left-0 z-40 mt-12 md:mt-0",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}>
          {/* Collapse toggle */}
          <div className={cn("flex items-center border-b border-gray-100 px-2 py-1.5", sidebarCollapsed ? "justify-center" : "justify-end")}>
            <button
              type="button"
              onClick={toggleSidebar}
              className="rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 p-2 overflow-y-auto transition-all duration-150 ease-in-out",
            navTransition === "out" && "opacity-0 -translate-x-3",
            navTransition === "in" && "opacity-0 translate-x-3",
            navTransition === "idle" && "opacity-100 translate-x-0",
          )}>
            {activeSections.map((section, idx) => (
              <div key={idx} className={cn(section.title && "mt-3")}>
                {section.title && !sidebarCollapsed && (
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {section.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to + label}
                      to={to}
                      end={to === "/"}
                      title={sidebarCollapsed ? label : undefined}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center rounded-md transition-colors",
                          sidebarCollapsed ? "justify-center px-1 py-1.5" : "gap-2 px-3 py-1.5 text-sm",
                          isActive
                            ? "bg-primary-50 text-primary-800 font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* ── Mode switcher ── */}
          <div className="border-t border-gray-200 p-2">
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-1">
                {modeLabels.filter(m => m.key !== "platform" || user?.is_platform_admin).map(({ key, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleModeChange(key)}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      mode === key
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    )}
                    title={key}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1">
                {modeLabels.filter(m => m.key !== "platform" || user?.is_platform_admin).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleModeChange(key)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 py-1.5 rounded-md text-[10px] transition-colors",
                      mode === key
                        ? "bg-primary-50 text-primary-700 font-medium"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    )}
                    title={label}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── Help panel (left dock) ── */}
        {helpDock === "left" && <HelpPanelSidebar />}

        <div className="flex-1 flex flex-col min-h-0">
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              <Outlet />
            </div>
          </main>
          {/* ── Feedback console (inside main content area) ── */}
          <FeedbackConsoleStrip />
        </div>

        {/* ── Help panel (right dock or float) ── */}
        {helpDock !== "left" && <HelpPanelSidebar />}
      </div>

      {/* ── Overlays ── */}
      <GlobalCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={(path) => {
          navigate(path)
          setCommandOpen(false)
        }}
      />
      <KeyboardShortcutOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <FeedbackPanel isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <FlowPulse />
    </div>
  )
}

function isInputFocused(): boolean {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === "input" || tag === "textarea" || tag === "select" || (el as HTMLElement).isContentEditable
}
