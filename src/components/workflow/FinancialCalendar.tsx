import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  CheckCircle2, Circle, AlertCircle, Calendar,
  Landmark, Wallet, FileText, Calculator, Lock, ClipboardList,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import type { LucideIcon } from "lucide-react"

// ── Types ──

interface TimelineItem {
  id: string
  title: string
  description?: string
  date: Date
  type: "auto" | "task"
  category: "recon" | "payroll" | "ar" | "bas" | "period" | "task"
  icon: LucideIcon
  done: boolean
  doneAt?: Date
  doneBy?: string
  overdue: boolean
  badge?: string
  link?: string
}

// ── Mock data ──

function generateMockTimeline(): TimelineItem[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  function daysFromNow(n: number): Date {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return d
  }

  return [
    {
      id: "recon-overdue",
      title: "Bank reconciliation",
      description: "NAB Business Account — $134.50 variance",
      date: daysFromNow(-3),
      type: "auto",
      category: "recon",
      icon: Landmark,
      done: false,
      overdue: true,
      badge: "$134.50 out",
      link: "/banking",
    },
    {
      id: "payroll-done",
      title: "Fortnightly payroll",
      description: "Pay run for 12 employees processed",
      date: today,
      type: "auto",
      category: "payroll",
      icon: Wallet,
      done: true,
      doneAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      doneBy: "Matt Bush",
      overdue: false,
      link: "/pay-runs",
    },
    {
      id: "task-done",
      title: "Upload March bank statement",
      description: "From accountant: Ziryan",
      date: today,
      type: "task",
      category: "task",
      icon: ClipboardList,
      done: true,
      doneAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      doneBy: "Matt Bush",
      overdue: false,
    },
    {
      id: "ar-today",
      title: "3 invoice reminders due",
      description: "INV-0042, INV-0044, INV-0051 — total $8,420.00",
      date: today,
      type: "auto",
      category: "ar",
      icon: FileText,
      done: false,
      overdue: false,
      link: "/invoices",
    },
    {
      id: "task-tomorrow",
      title: "Review Q3 BAS draft",
      description: "From accountant: Ziryan — high priority",
      date: daysFromNow(1),
      type: "task",
      category: "task",
      icon: ClipboardList,
      done: false,
      overdue: false,
      link: "/bas",
    },
    {
      id: "recon-upcoming",
      title: "Weekly bank reconciliation",
      description: "NAB Business Account",
      date: daysFromNow(2),
      type: "auto",
      category: "recon",
      icon: Landmark,
      done: false,
      overdue: false,
      link: "/banking",
    },
    {
      id: "bas-upcoming",
      title: "BAS lodgement due",
      description: "Q3 FY2025-26 — lodge with ATO by COB",
      date: daysFromNow(4),
      type: "auto",
      category: "bas",
      icon: Calculator,
      done: false,
      overdue: false,
      badge: "Due in 4 days",
      link: "/bas",
    },
    {
      id: "period-close",
      title: "Month-end close",
      description: "Lock April period after review",
      date: daysFromNow(5),
      type: "auto",
      category: "period",
      icon: Lock,
      done: false,
      overdue: false,
    },
    {
      id: "payroll-next",
      title: "Next payroll due",
      description: "Fortnightly pay run — 12 employees",
      date: daysFromNow(6),
      type: "auto",
      category: "payroll",
      icon: Wallet,
      done: false,
      overdue: false,
      link: "/pay-runs",
    },
  ]
}

// ── Helpers ──

function formatDayLabel(date: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff < 0) return "Overdue"

  return date.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
}

const dotColors: Record<string, { bg: string; ring: string }> = {
  recon: { bg: "bg-blue-500", ring: "ring-blue-100" },
  payroll: { bg: "bg-purple-500", ring: "ring-purple-100" },
  ar: { bg: "bg-amber-500", ring: "ring-amber-100" },
  bas: { bg: "bg-red-500", ring: "ring-red-100" },
  period: { bg: "bg-gray-500", ring: "ring-gray-100" },
  task: { bg: "bg-primary-500", ring: "ring-primary-100" },
}

// ── Component ──

interface FinancialCalendarProps {
  isOpen: boolean
  onClose: () => void
}

export function FinancialCalendar({ isOpen, onClose }: FinancialCalendarProps) {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [items] = useState<TimelineItem[]>(generateMockTimeline)

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Group: overdue, then by day
  const overdue = items.filter((i) => i.overdue)
  const nonOverdue = items.filter((i) => !i.overdue)
  const dayGroups: { label: string; date: Date; items: TimelineItem[] }[] = []
  for (const item of nonOverdue) {
    const label = formatDayLabel(item.date)
    const existing = dayGroups.find((g) => g.label === label)
    if (existing) {
      existing.items.push(item)
    } else {
      dayGroups.push({ label, date: item.date, items: [item] })
    }
  }

  const overdueCount = overdue.length
  const todayUndone = items.filter((i) => !i.overdue && !i.done && formatDayLabel(i.date) === "Today").length

  function handleItemClick(item: TimelineItem) {
    if (item.link) {
      onClose()
      navigate(item.link)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1 w-[26rem] bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-[34rem] flex flex-col"
      style={{ left: "50%", transform: "translateX(-50%)" }}
    >
      {/* Header */}
      <div className="shrink-0 border-b border-gray-100 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary-50">
            <Calendar className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Financial Calendar</h3>
            <p className="text-[10px] text-gray-400">7-day rolling view</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-semibold">
              {overdueCount} overdue
            </span>
          )}
          {todayUndone > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold">
              {todayUndone} today
            </span>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {/* Overdue section */}
        {overdue.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Overdue</span>
            </div>
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-red-200" />
              {overdue.map((item) => (
                <TimelineNode key={item.id} item={item} onClick={() => handleItemClick(item)} variant="overdue" />
              ))}
            </div>
          </div>
        )}

        {/* Day groups */}
        {dayGroups.map((group, gi) => (
          <div key={group.label} className={cn("mb-4 last:mb-0", gi > 0 && "")}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{group.label}</span>
              {group.label === "Today" && (
                <span className="text-[10px] text-gray-300">
                  {group.date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
            <div className="relative pl-6">
              {/* Vertical line */}
              <div className={cn(
                "absolute left-[7px] top-0 bottom-0 w-px",
                group.label === "Today" ? "bg-primary-200" : "bg-gray-150"
              )}
                style={group.label !== "Today" ? { backgroundColor: "#e5e7eb" } : undefined}
              />
              {group.items.map((item) => (
                <TimelineNode key={item.id} item={item} onClick={() => handleItemClick(item)} variant={item.done ? "done" : "upcoming"} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Timeline Node ──

function TimelineNode({ item, onClick, variant }: { item: TimelineItem; onClick: () => void; variant: "done" | "upcoming" | "overdue" }) {
  const Icon = item.icon
  const colors = dotColors[item.category]
  const clickable = !!item.link

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 pb-4 last:pb-0 group",
        clickable && "cursor-pointer"
      )}
      onClick={clickable ? onClick : undefined}
    >
      {/* Dot on the timeline */}
      <div className="absolute -left-6 mt-1">
        {variant === "done" ? (
          <div className="h-[15px] w-[15px] rounded-full bg-green-500 flex items-center justify-center ring-2 ring-green-100">
            <CheckCircle2 className="h-[11px] w-[11px] text-white" strokeWidth={3} />
          </div>
        ) : variant === "overdue" ? (
          <div className="h-[15px] w-[15px] rounded-full bg-red-500 flex items-center justify-center ring-2 ring-red-100 animate-pulse">
            <AlertCircle className="h-[11px] w-[11px] text-white" strokeWidth={3} />
          </div>
        ) : (
          <div className={cn("h-[15px] w-[15px] rounded-full ring-2", colors.bg, colors.ring)} />
        )}
      </div>

      {/* Card */}
      <div className={cn(
        "flex-1 rounded-lg border px-3 py-2 transition-all",
        variant === "done"
          ? "border-gray-100 bg-gray-50/50"
          : variant === "overdue"
            ? "border-red-200 bg-red-50/30"
            : "border-gray-200 bg-white",
        clickable && "hover:border-primary-300 hover:shadow-sm group-hover:border-primary-300",
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={cn(
              "h-3.5 w-3.5 shrink-0",
              variant === "done" ? "text-gray-400" : variant === "overdue" ? "text-red-500" : "text-gray-500"
            )} />
            <span className={cn(
              "text-sm font-medium truncate",
              variant === "done" ? "text-gray-400 line-through" : "text-gray-900"
            )}>
              {item.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {item.badge && (
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                variant === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
              )}>
                {item.badge}
              </span>
            )}
            {item.type === "task" && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-50 text-primary-600">
                Task
              </span>
            )}
            {clickable && (
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary-500 transition-colors" />
            )}
          </div>
        </div>
        {item.description && (
          <p className={cn("text-xs mt-0.5 truncate", variant === "done" ? "text-gray-300" : "text-gray-500")}>
            {item.description}
          </p>
        )}
        {item.done && item.doneAt && (
          <p className="text-[10px] text-gray-300 mt-1">
            Completed {formatTime(item.doneAt)} by {item.doneBy}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Badge hook for header ──

export function useCalendarBadge() {
  const items = generateMockTimeline()
  const overdueCount = items.filter((i) => i.overdue).length
  const todayCount = items.filter((i) => !i.done && !i.overdue && formatDayLabel(i.date) === "Today").length
  return { overdueCount, todayCount }
}
