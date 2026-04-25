// Spec references: R-0046.
import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  ChevronLeft, ChevronRight, Plus, X,
  CheckCircle2, AlertCircle, ChevronRight as ChevronRightIcon,
  Landmark, Wallet, FileText, Calculator, Lock, ClipboardList, Receipt, Scale,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { PageShell } from "@/components/layout"
import { Skeleton } from "@/components/primitives"
import { useFeedback } from "@/components/feedback"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import {
  useCalendarTimeline,
  useCreateCalendarTask,
  type TimelineItem as APITimelineItem,
} from "@/domains/calendar/hooks/useCalendar"
import type { LucideIcon } from "lucide-react"

// ── Types ──

interface TimelineItem {
  id: string
  title: string
  description?: string
  date: Date
  type: "auto" | "task"
  category: string
  icon: LucideIcon
  done: boolean
  doneAt?: Date
  doneBy?: string
  overdue: boolean
  badge?: string
  link?: string
}

// ── Category colours/icons (kept in sync with FinancialTimeline) ──

const dotColors: Record<string, { bg: string; ring: string }> = {
  recon:       { bg: "bg-blue-500",    ring: "ring-blue-100" },
  banking:     { bg: "bg-blue-500",    ring: "ring-blue-100" },
  payroll:     { bg: "bg-purple-500",  ring: "ring-purple-100" },
  ar:          { bg: "bg-amber-500",   ring: "ring-amber-100" },
  receivables: { bg: "bg-amber-500",   ring: "ring-amber-100" },
  payables:    { bg: "bg-orange-500",  ring: "ring-orange-100" },
  bas:         { bg: "bg-red-500",     ring: "ring-red-100" },
  compliance:  { bg: "bg-red-500",     ring: "ring-red-100" },
  accounting:  { bg: "bg-gray-500",    ring: "ring-gray-100" },
  period:      { bg: "bg-gray-500",    ring: "ring-gray-100" },
  task:        { bg: "bg-primary-500", ring: "ring-primary-100" },
}

const categoryIconMap: Record<string, LucideIcon> = {
  recon:       Landmark,
  banking:     Landmark,
  payroll:     Wallet,
  ar:          FileText,
  receivables: FileText,
  payables:    Receipt,
  bas:         Calculator,
  compliance:  Scale,
  accounting:  Lock,
  period:      Lock,
  task:        ClipboardList,
}

function dotColor(category: string, done: boolean, overdue: boolean): string {
  if (done)    return "bg-green-400"
  if (overdue) return "bg-red-500"
  return dotColors[category]?.bg ?? "bg-gray-400"
}

// ── Map API items ──

function mapAPIItems(apiItems: APITimelineItem[]): TimelineItem[] {
  return apiItems.map((item) => ({
    id:          item.id,
    title:       item.title,
    description: item.description,
    date:        new Date(item.date),
    type:        item.type,
    category:    item.category,
    icon:        categoryIconMap[item.category] ?? ClipboardList,
    done:        item.done,
    doneAt:      item.done_at ? new Date(item.done_at) : undefined,
    doneBy:      item.done_by ?? undefined,
    overdue:     item.overdue,
    badge:       item.badge ?? undefined,
    link:        item.link ?? undefined,
  }))
}

// ── Date helpers ──

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
}

/** Build a 6-week grid starting on the Monday on or before the 1st of the month. */
function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  // getDay(): 0=Sun, 1=Mon...6=Sat — find Monday on or before
  const dow = firstOfMonth.getDay() // 0=Sun
  const offset = dow === 0 ? 6 : dow - 1 // days back to Monday
  const gridStart = new Date(year, month, 1 - offset)

  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i))
  }
  return days
}

/** How many days does the displayed month span (to pass to useCalendarTimeline)? */
function monthDayCount(year: number, month: number): number {
  // Days in month plus a 7-day buffer on each side for grid overlap
  return new Date(year, month + 1, 0).getDate() + 14
}

// ── Dot row for a day cell ──

function DayDots({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return null
  const visible = items.slice(0, 3)
  const extra = items.length - visible.length
  return (
    <div className="flex items-center gap-0.5 mt-1 flex-wrap">
      {visible.map((item) => (
        <span
          key={item.id}
          className={cn(
            "inline-block rounded-full",
            item.done ? "h-1.5 w-1.5 opacity-60" : "h-2 w-2",
            dotColor(item.category, item.done, item.overdue)
          )}
          title={item.title}
        />
      ))}
      {extra > 0 && (
        <span className="text-[9px] text-gray-400 font-medium leading-none">+{extra}</span>
      )}
    </div>
  )
}

// ── Day detail panel item card ──

function DayItemCard({ item, onNavigate }: { item: TimelineItem; onNavigate: (link: string) => void }) {
  const Icon = item.icon
  const colors = dotColors[item.category] ?? { bg: "bg-gray-400", ring: "ring-gray-100" }
  const variant: "done" | "overdue" | "upcoming" = item.done ? "done" : item.overdue ? "overdue" : "upcoming"
  const clickable = !!item.link

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 pb-4 last:pb-0 group",
        clickable && "cursor-pointer"
      )}
      onClick={clickable ? () => onNavigate(item.link!) : undefined}
    >
      {/* Timeline dot */}
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
        "flex-1 min-w-0 rounded-lg border px-3 py-2 transition-all overflow-hidden",
        variant === "done"
          ? "border-gray-100 bg-gray-50/50"
          : variant === "overdue"
            ? "border-red-200 bg-red-50/30"
            : "border-gray-200 bg-white",
        clickable && "hover:border-primary-300 hover:shadow-sm group-hover:border-primary-300"
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
              <ChevronRightIcon className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary-500 transition-colors" />
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

// ── Quick-add task form ──

const LINK_OPTIONS = [
  { label: "None", value: "" },
  { label: "Banking / Reconciliation", value: "/bank-reconciliation" },
  { label: "Invoices", value: "/invoices" },
  { label: "Bills", value: "/bills" },
  { label: "Pay Runs", value: "/pay-runs" },
  { label: "BAS / GST", value: "/bas" },
]

interface AddTaskFormProps {
  date: Date
  onCancel: () => void
  onCreated: () => void
}

function AddTaskForm({ date, onCancel, onCreated }: AddTaskFormProps) {
  const feedback = useFeedback()
  const createTask = useCreateCalendarTask()
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<"normal" | "high">("normal")
  const [link, setLink] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    try {
      await createTask.mutateAsync({
        title: title.trim(),
        due_date: toDateKey(date),
        priority,
        link: link || undefined,
      })
      feedback.success(`Task "${title.trim()}" added`)
      onCreated()
    } catch (err) {
      feedback.error("Failed to create task", String(err))
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="border border-gray-300 rounded-lg p-3 bg-gray-50 space-y-3">
      <p className="text-xs font-semibold text-gray-700">
        New task for {date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      {/* Title */}
      <div>
        <label className="text-[11px] font-medium text-gray-600 block mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chase invoice INV-0042"
          autoFocus
          required
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="text-[11px] font-medium text-gray-600 block mb-1">Priority</label>
        <div className="flex gap-2">
          {(["normal", "high"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                "flex-1 py-1 rounded-md text-xs font-medium border transition-colors",
                priority === p
                  ? p === "high"
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-primary-50 border-primary-300 text-primary-700"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
              )}
            >
              {p === "high" ? "High" : "Normal"}
            </button>
          ))}
        </div>
      </div>

      {/* Link */}
      <div>
        <label className="text-[11px] font-medium text-gray-600 block mb-1">Link to page (optional)</label>
        <select
          value={link}
          onChange={(e) => setLink(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        >
          {LINK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={createTask.isPending || !title.trim()}
          className="flex-1 py-1.5 rounded-md bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {createTask.isPending ? "Adding…" : "Add Task"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 text-xs hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Day detail slide-out panel ──

interface DayPanelProps {
  day: Date | null
  itemsByDay: Record<string, TimelineItem[]>
  onClose: () => void
}

function DayPanel({ day, itemsByDay, onClose }: DayPanelProps) {
  const navigate = useNavigate()
  const [showAddForm, setShowAddForm] = useState(false)

  // Reset add form when day changes
  useEffect(() => { setShowAddForm(false) }, [day])

  // Escape key to close
  useEffect(() => {
    if (!day) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [day, onClose])

  if (!day) return null

  const key = toDateKey(day)
  const items = itemsByDay[key] ?? []
  const today = new Date()

  return (
      <div className="w-80 shrink-0 bg-white border border-gray-300 rounded-lg shadow-sm flex flex-col max-h-[calc(100vh-12rem)] overflow-hidden">
        {/* Panel header */}
        <div className="shrink-0 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              {day.toLocaleDateString("en-AU", { weekday: "long" })}
            </p>
            <h2 className="text-base font-semibold text-gray-900">
              {day.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
            </h2>
            {isSameDay(day, today) && (
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-semibold">
                Today
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Add task button / form */}
        <div className="shrink-0 px-4 pt-3 pb-2 border-b border-gray-100">
          {showAddForm ? (
            <AddTaskForm
              date={day}
              onCancel={() => setShowAddForm(false)}
              onCreated={() => setShowAddForm(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-primary-400 transition-colors w-full justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </button>
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-gray-400">Nothing scheduled for this day.</p>
              <p className="text-xs text-gray-300 mt-1">Click "Add Task" to create one.</p>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-0 bottom-0 w-px bg-gray-200" />
              {items.map((item) => (
                <DayItemCard
                  key={item.id}
                  item={item}
                  onNavigate={(link) => { navigate(link); onClose() }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
  )
}

// ── Skeleton grid ──

function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-300">
      {/* Day headers */}
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
        <div key={d} className="bg-gray-50 px-2 py-2 text-center">
          <span className="text-xs font-semibold text-gray-400">{d}</span>
        </div>
      ))}
      {/* 42 cells */}
      {Array.from({ length: 42 }).map((_, i) => (
        <div key={i} className="bg-white min-h-[5rem] p-2 space-y-1">
          <Skeleton className="h-4 w-6 rounded" />
          <Skeleton className="h-2 w-full rounded" />
        </div>
      ))}
    </div>
  )
}

// ── Main CalendarPage ──

export function CalendarPage() {
  // Help panel content is resolved from YAML by route (see
  // locales/en-AU/help/dashboard/calendar.yaml).
  usePagePolicies(["dashboard", "tax", "payable", "receivable", "payroll"])
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [currentMonth, setCurrentMonth] = useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // Fetch enough days to cover the displayed grid (~6 weeks)
  const days = monthDayCount(year, month)
  const { data: apiData, isLoading } = useCalendarTimeline(days)

  const items: TimelineItem[] = apiData?.items ? mapAPIItems(apiData.items) : []

  // Group items by date key for O(1) cell lookup
  const itemsByDay: Record<string, TimelineItem[]> = {}
  for (const item of items) {
    const key = toDateKey(item.date)
    if (!itemsByDay[key]) itemsByDay[key] = []
    itemsByDay[key].push(item)
  }

  const grid = buildMonthGrid(year, month)

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }
  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }
  function goToday() {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDay(null)
  }

  const handleDayClick = useCallback((day: Date) => {
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))
  }, [])

  const monthLabel = currentMonth.toLocaleDateString("en-AU", { month: "long", year: "numeric" })

  const header = (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
          <span className="text-xl font-normal text-gray-500">{monthLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Today
          </button>
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Plan your month and manage tasks</p>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
<div className="flex gap-4 min-h-0">
        {/* Calendar grid — shrinks when panel is open */}
        <div className={cn("flex-1 min-w-0 transition-all duration-200")}>
          {isLoading ? (
            <CalendarSkeleton />
          ) : (
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden border border-gray-300">
              {/* Day-of-week headers */}
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <div
                  key={d}
                  className={cn(
                    "bg-gray-50 px-2 py-2 text-center border-b border-gray-200",
                    i >= 5 && "bg-gray-50/60"
                  )}
                >
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{d}</span>
                </div>
              ))}

              {/* Day cells */}
              {grid.map((day, idx) => {
                const key = toDateKey(day)
                const dayItems = itemsByDay[key] ?? []
                const isThisMonth = day.getMonth() === month
                const isToday = isSameDay(day, today)
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
                const isWeekend = idx % 7 >= 5
                const isPastDay = day < today && !isToday
                const hasOverdue = dayItems.some((i) => i.overdue)
                const allDone = dayItems.length > 0 && dayItems.every((i) => i.done)

                return (
                  <div
                    key={key + "-" + idx}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "bg-white min-h-[5rem] p-2 cursor-pointer transition-colors select-none",
                      "hover:bg-gray-50",
                      isWeekend && "bg-gray-50/40",
                      !isThisMonth && "opacity-30",
                      isToday && "bg-primary-50 border-primary-200",
                      hasOverdue && isPastDay && "bg-red-50/30",
                      allDone && isPastDay && "bg-green-50/20",
                      isSelected && "ring-2 ring-primary-500 ring-inset z-10 relative"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className={cn(
                        "text-sm font-medium",
                        isToday
                          ? "h-6 w-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-semibold"
                          : isThisMonth ? "text-gray-900" : "text-gray-400"
                      )}>
                        {day.getDate()}
                      </span>
                    </div>
                    <DayDots items={dayItems} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Day detail panel — inline, pushes grid to shrink */}
        {selectedDay && (
          <DayPanel
            day={selectedDay}
            itemsByDay={itemsByDay}
            onClose={() => setSelectedDay(null)}
          />
        )}
      </div>
    </PageShell>
  )
}
