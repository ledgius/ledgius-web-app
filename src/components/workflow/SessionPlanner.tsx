import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  X, AlertTriangle, Clock, GitMerge, Send, Inbox, Camera,
  Wallet, Calculator, Percent, PiggyBank,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useCalendarTimeline } from "@/domains/calendar/hooks/useCalendar"
import type { TimelineItem } from "@/domains/calendar/hooks/useCalendar"
import type { LucideIcon } from "lucide-react"

// ── Category metadata ──

interface CategoryMeta {
  label: string
  icon: LucideIcon
  link: string
  hard: boolean   // true = hard deadline (always surfaces when overdue)
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  banking:     { label: "Reconcile Bank",      icon: GitMerge,      link: "/bank-reconciliation",    hard: false },
  receivables: { label: "Send & Chase",        icon: Send,          link: "/invoices",   hard: false },
  invoices:    { label: "Send & Chase",        icon: Send,          link: "/invoices",   hard: false },
  payables:    { label: "Review & Pay Bills",  icon: Inbox,         link: "/bills",      hard: false },
  bills:       { label: "Review & Pay Bills",  icon: Inbox,         link: "/bills",      hard: false },
  receipts:    { label: "Record Receipts",     icon: Camera,        link: "/receipts",   hard: false },
  task:        { label: "Pending Tasks",       icon: Clock,         link: "/",           hard: false },
  payroll:     { label: "Run Payroll",         icon: Wallet,        link: "/pay-runs",   hard: true  },
  compliance:  { label: "BAS / GST",          icon: Calculator,    link: "/bas",        hard: true  },
  bas:         { label: "BAS / GST",          icon: Calculator,    link: "/bas",        hard: true  },
  payg:        { label: "PAYG Withholding",   icon: Percent,       link: "/payg-config",hard: true  },
  super:       { label: "Super Guarantee",    icon: PiggyBank,     link: "/super-rates",hard: true  },
}

// ── Helpers ──

interface GroupedCategory {
  category: string
  meta: CategoryMeta
  count: number
  hasOverdue: boolean
  items: TimelineItem[]
}

function groupByCategory(items: TimelineItem[]): GroupedCategory[] {
  const map = new Map<string, TimelineItem[]>()
  for (const item of items) {
    const key = item.category?.toLowerCase() ?? "task"
    const existing = map.get(key) ?? []
    existing.push(item)
    map.set(key, existing)
  }

  const groups: GroupedCategory[] = []
  for (const [category, categoryItems] of map.entries()) {
    const meta = CATEGORY_META[category]
    if (!meta) continue
    groups.push({
      category,
      meta,
      count: categoryItems.length,
      hasOverdue: categoryItems.some(i => i.overdue),
      items: categoryItems,
    })
  }

  // Sort: hard deadlines with overdue first, then others
  return groups.sort((a, b) => {
    const aUrgent = a.meta.hard && a.hasOverdue ? 0 : a.meta.hard ? 1 : a.hasOverdue ? 2 : 3
    const bUrgent = b.meta.hard && b.hasOverdue ? 0 : b.meta.hard ? 1 : b.hasOverdue ? 2 : 3
    return aUrgent - bUrgent
  })
}

// ── Sub-components ──

interface CategoryChipProps {
  group: GroupedCategory
  onClick: () => void
}

function CategoryChip({ group, onClick }: CategoryChipProps) {
  const Icon = group.meta.icon
  const urgent = group.meta.hard && group.hasOverdue

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
        urgent
          ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          : group.hasOverdue
            ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            : "bg-white border-blue-200 text-blue-700 hover:bg-blue-100"
      )}
    >
      {urgent && <AlertTriangle className="w-3 h-3" />}
      <Icon className="w-3 h-3" />
      {group.meta.label}
      <span className={cn(
        "ml-0.5 inline-flex items-center justify-center rounded-full w-4 h-4 text-[10px] font-semibold",
        urgent
          ? "bg-red-200 text-red-800"
          : group.hasOverdue
            ? "bg-amber-200 text-amber-800"
            : "bg-blue-100 text-blue-800"
      )}>
        {group.count}
      </span>
    </button>
  )
}

// ── Main component ──

export function SessionPlanner() {
  const { data } = useCalendarTimeline(7)
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const allItems = data?.items ?? []
  const pendingItems = allItems.filter(i => !i.done)

  if (pendingItems.length === 0) return null

  const groups = groupByCategory(pendingItems)
  if (groups.length === 0) return null

  const hardGroups = groups.filter(g => g.meta.hard)
  const softGroups = groups.filter(g => !g.meta.hard)

  const hasUrgent = hardGroups.some(g => g.hasOverdue)

  const overdueCount = pendingItems.filter(i => i.overdue).length
  const todayCount = pendingItems.filter(i => !i.overdue).length

  return (
    <div className={cn(
      "mb-5 rounded-lg border px-4 py-3",
      hasUrgent
        ? "bg-red-50 border-red-200"
        : "bg-blue-50 border-blue-200"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Summary line */}
          <div className="flex items-center gap-2 mb-2.5">
            <Clock className={cn("w-3.5 h-3.5 flex-shrink-0", hasUrgent ? "text-red-500" : "text-blue-500")} />
            <span className={cn("text-xs font-semibold", hasUrgent ? "text-red-700" : "text-blue-700")}>
              This session
            </span>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" />
                {overdueCount} overdue
              </span>
            )}
            {todayCount > 0 && (
              <span className="text-xs text-blue-600">
                {todayCount} upcoming
              </span>
            )}
          </div>

          {/* Category chips — hard deadlines first, then soft cadence */}
          <div className="flex flex-wrap gap-1.5">
            {hardGroups.length > 0 && (
              <>
                {hardGroups.map(group => (
                  <CategoryChip
                    key={group.category}
                    group={group}
                    onClick={() => navigate(group.meta.link)}
                  />
                ))}
                {softGroups.length > 0 && (
                  <span className="self-center text-blue-200 select-none">|</span>
                )}
              </>
            )}
            {softGroups.map(group => (
              <CategoryChip
                key={group.category}
                group={group}
                onClick={() => navigate(group.meta.link)}
              />
            ))}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className={cn(
            "flex-shrink-0 rounded p-0.5 transition-colors",
            hasUrgent
              ? "text-red-400 hover:text-red-600 hover:bg-red-100"
              : "text-blue-400 hover:text-blue-600 hover:bg-blue-100"
          )}
          aria-label="Dismiss session planner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
