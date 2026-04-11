// Spec references: A-0023.
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Landmark, FileText, Receipt, DollarSign,
  ScrollText, CalculatorIcon, CalendarCheck,
  RefreshCw, CheckCircle2, XCircle,
  TrendingUp, TrendingDown, Minus,
  AlertCircle, Calendar,
  CheckCircle, Lock, ClipboardList, Wallet, Calculator,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { PageShell } from "@/components/layout"
import { HealthPanel } from "@/components/layout/HealthPanel"
import { Skeleton } from "@/components/primitives"
import { useBooksHealth, type AgeBuckets, type PeriodCloseChecklist } from "../hooks/useBooksHealth"
import { useCalendarTimeline, type TimelineItem as APITimelineItem } from "@/domains/calendar/hooks/useCalendar"
import type { LucideIcon } from "lucide-react"

// ── Currency formatting ──

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtTimestamp(isoStr: string): string {
  if (!isoStr) return "—"
  const d = new Date(isoStr)
  return d.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

// ── Aged buckets bar ──

function AgedBucketsBar({ buckets, total }: { buckets: AgeBuckets; total: number }) {
  const rows = [
    { label: "Current", bucket: buckets.current, color: "bg-green-500" },
    { label: "30+ days", bucket: buckets.days_30, color: "bg-amber-400" },
    { label: "60+ days", bucket: buckets.days_60, color: "bg-orange-500" },
    { label: "90+ days", bucket: buckets.days_90, color: "bg-red-500" },
  ]
  const safeTotal = total > 0 ? total : 1

  return (
    <div className="space-y-2 mt-1">
      {rows.map(({ label, bucket, color }) => (
        <div key={label}>
          <div className="flex justify-between text-[11px] text-gray-500 mb-0.5">
            <span>{label}</span>
            <span className="font-medium text-gray-700 tabular-nums">
              {fmtCurrency(bucket.amount)}{" "}
              <span className="text-gray-400">({bucket.count})</span>
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", color)}
              style={{ width: `${Math.min(100, (bucket.amount / safeTotal) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Checklist item ──

function CheckItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
      ) : (
        <XCircle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
      )}
      <span className={cn("text-xs", done ? "text-gray-600" : "text-gray-400 line-through")}>{label}</span>
    </div>
  )
}

// ── Full calendar timeline ──

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

const categoryIconMap: Record<string, LucideIcon> = {
  recon: Landmark,
  banking: Landmark,
  payroll: Wallet,
  ar: FileText,
  receivables: FileText,
  payables: Receipt,
  bas: Calculator,
  compliance: Lock,
  accounting: Lock,
  period: Lock,
  task: ClipboardList,
}

const dotColors: Record<string, { bg: string; ring: string }> = {
  recon: { bg: "bg-blue-500", ring: "ring-blue-100" },
  banking: { bg: "bg-blue-500", ring: "ring-blue-100" },
  payroll: { bg: "bg-purple-500", ring: "ring-purple-100" },
  ar: { bg: "bg-amber-500", ring: "ring-amber-100" },
  receivables: { bg: "bg-amber-500", ring: "ring-amber-100" },
  payables: { bg: "bg-orange-500", ring: "ring-orange-100" },
  bas: { bg: "bg-red-500", ring: "ring-red-100" },
  compliance: { bg: "bg-red-500", ring: "ring-red-100" },
  accounting: { bg: "bg-gray-500", ring: "ring-gray-100" },
  period: { bg: "bg-gray-500", ring: "ring-gray-100" },
  task: { bg: "bg-primary-500", ring: "ring-primary-100" },
}

function mapAPIItems(apiItems: APITimelineItem[]): TimelineItem[] {
  return apiItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    date: new Date(item.date),
    type: item.type,
    category: item.category,
    icon: categoryIconMap[item.category] ?? ClipboardList,
    done: item.done,
    doneAt: item.done_at ? new Date(item.done_at) : undefined,
    doneBy: item.done_by ?? undefined,
    overdue: item.overdue,
    badge: item.badge ?? undefined,
    link: item.link ?? undefined,
  }))
}

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

type ViewRange = "7d" | "30d" | "quarter"
const viewRangeOptions: { key: ViewRange; label: string; days: number }[] = [
  { key: "7d", label: "7 Days", days: 7 },
  { key: "30d", label: "Month", days: 30 },
  { key: "quarter", label: "Quarter", days: 90 },
]

function FullCalendarTimelineNode({
  item,
  onClick,
  variant,
}: {
  item: TimelineItem
  onClick: () => void
  variant: "done" | "upcoming" | "overdue"
}) {
  const Icon = item.icon
  const colors = dotColors[item.category] ?? { bg: "bg-gray-400", ring: "ring-gray-100" }
  const clickable = !!item.link

  return (
    <div
      className={cn("relative flex items-start gap-3 pb-4 last:pb-0 group", clickable && "cursor-pointer")}
      onClick={clickable ? onClick : undefined}
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
      <div
        className={cn(
          "flex-1 min-w-0 rounded-lg border px-3 py-2 transition-all overflow-hidden",
          variant === "done"
            ? "border-gray-100 bg-gray-50/50"
            : variant === "overdue"
              ? "border-red-200 bg-red-50/30"
              : "border-gray-200 bg-white",
          clickable && "hover:border-primary-300 hover:shadow-sm group-hover:border-primary-300"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                variant === "done" ? "text-gray-400" : variant === "overdue" ? "text-red-500" : "text-gray-500"
              )}
            />
            <span
              className={cn(
                "text-sm font-medium truncate",
                variant === "done" ? "text-gray-400 line-through" : "text-gray-900"
              )}
            >
              {item.title}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {item.badge && (
              <span
                className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  variant === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                )}
              >
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
          <p className={cn("text-xs mt-0.5", variant === "done" ? "text-gray-300" : "text-gray-500")}>
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

function FullCalendarTimeline() {
  const navigate = useNavigate()
  const [viewRange, setViewRange] = useState<ViewRange>("7d")
  const days = viewRangeOptions.find((v) => v.key === viewRange)!.days
  const { data: apiData } = useCalendarTimeline(days)

  const items: TimelineItem[] = apiData?.items ? mapAPIItems(apiData.items) : []

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
  const doneCount = items.filter((i) => i.done).length
  const todayUndone = items.filter((i) => !i.overdue && !i.done && formatDayLabel(i.date) === "Today").length

  function handleItemClick(item: TimelineItem) {
    if (item.link) navigate(item.link)
  }

  return (
    <div>
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary-50">
            <Calendar className="h-4 w-4 text-primary-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Financial Timeline</h2>
            <div className="flex items-center gap-1 mt-0.5">
              {viewRangeOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setViewRange(opt.key)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full transition-colors",
                    viewRange === opt.key
                      ? "bg-primary-100 text-primary-700 font-semibold"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {doneCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[11px] font-semibold">
              {doneCount} done
            </span>
          )}
          {overdueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold">
              {overdueCount} overdue
            </span>
          )}
          {todayUndone > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-semibold">
              {todayUndone} today
            </span>
          )}
        </div>
      </div>

      {/* Timeline content */}
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No calendar events in this period.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Overdue column */}
          {overdue.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Overdue</span>
              </div>
              <div className="relative pl-6">
                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-red-200" />
                {overdue.map((item) => (
                  <FullCalendarTimelineNode
                    key={item.id}
                    item={item}
                    onClick={() => handleItemClick(item)}
                    variant="overdue"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Day group columns */}
          {dayGroups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {group.label}
                </span>
                {group.label === "Today" && (
                  <span className="text-[10px] text-gray-300">
                    {group.date.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
              <div className="relative pl-6">
                <div
                  className={cn(
                    "absolute left-[7px] top-0 bottom-0 w-px",
                    group.label === "Today" ? "bg-primary-200" : "bg-gray-200"
                  )}
                />
                {group.items.map((item) => (
                  <FullCalendarTimelineNode
                    key={item.id}
                    item={item}
                    onClick={() => handleItemClick(item)}
                    variant={item.done ? "done" : "upcoming"}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──

export function BooksHealthPage() {
  const { data, isLoading, refetch, isFetching } = useBooksHealth()

  const header = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Books Health</h1>
        <p className="mt-0.5 text-sm text-gray-500">How clean are your books?</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {data?.last_updated && (
          <span className="text-xs text-gray-400">
            Updated {fmtTimestamp(data.last_updated)}
          </span>
        )}
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs text-gray-600 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          Refresh
        </button>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <PageShell header={header}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton variant="table" rows={4} columns={4} className="mt-4" />
      </PageShell>
    )
  }

  const bh = data

  return (
    <PageShell header={header}>
      {/* ── Row 1: 4 panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bank Reconciliation */}
        <HealthPanel
          title="Bank Reconciliation"
          icon={Landmark}
          status={bh?.bank_reconciliation?.status ?? "green"}
          summary={bh?.bank_reconciliation?.summary ?? "Loading…"}
          link="/banking"
        >
          {bh?.bank_reconciliation?.accounts && bh.bank_reconciliation.accounts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-1 pr-2 font-medium">Account</th>
                    <th className="text-right pb-1 pr-2 font-medium">Last Recon</th>
                    <th className="text-right pb-1 pr-2 font-medium">Unmatched</th>
                    <th className="text-right pb-1 font-medium">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bh.bank_reconciliation.accounts.map((acc) => (
                    <tr key={acc.account_id}>
                      <td className="py-1 pr-2 text-gray-700 truncate max-w-[80px]">{acc.account_name}</td>
                      <td className="py-1 pr-2 text-right text-gray-500 tabular-nums whitespace-nowrap">
                        {fmtDate(acc.last_reconciled)}
                        {acc.days_since > 7 && (
                          <span className="ml-1 text-red-500">({acc.days_since}d)</span>
                        )}
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums">
                        <span className={cn(acc.unmatched_count > 0 ? "text-amber-600 font-medium" : "text-gray-400")}>
                          {acc.unmatched_count}
                        </span>
                      </td>
                      <td className="py-1 text-right tabular-nums">
                        <span className={cn(Math.abs(acc.variance) > 0 ? "text-red-600 font-medium" : "text-gray-400")}>
                          {fmtCurrency(acc.variance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-400">All accounts reconciled.</p>
          )}
        </HealthPanel>

        {/* Receivables */}
        <HealthPanel
          title="Receivables"
          icon={FileText}
          status={bh?.receivables?.status ?? "green"}
          summary={bh?.receivables?.summary ?? "Loading…"}
          metric={bh ? fmtCurrency(bh.receivables.total_outstanding) : undefined}
          link="/invoices"
        >
          {bh?.receivables?.buckets && (
            <>
              <AgedBucketsBar buckets={bh.receivables.buckets} total={bh.receivables.total_outstanding} />
              <p className="text-[11px] text-gray-400 mt-2">
                Avg. {bh.receivables.avg_days_to_payment} days to payment
              </p>
            </>
          )}
        </HealthPanel>

        {/* Payables */}
        <HealthPanel
          title="Payables"
          icon={Receipt}
          status={bh?.payables?.status ?? "green"}
          summary={bh?.payables?.summary ?? "Loading…"}
          metric={bh ? fmtCurrency(bh.payables.total_outstanding) : undefined}
          link="/bills"
        >
          {bh?.payables?.buckets && (
            <>
              <AgedBucketsBar buckets={bh.payables.buckets} total={bh.payables.total_outstanding} />
              {bh.payables.due_this_week > 0 && (
                <p className="text-[11px] text-amber-600 font-medium mt-2">
                  {fmtCurrency(bh.payables.due_this_week)} due this week
                </p>
              )}
            </>
          )}
        </HealthPanel>

        {/* Cash Position */}
        <HealthPanel
          title="Cash Position"
          icon={DollarSign}
          status={bh?.cash_position?.status ?? "green"}
          summary={bh?.cash_position?.summary ?? "Loading…"}
          metric={bh ? fmtCurrency(bh.cash_position.current_balance) : undefined}
          link="/banking"
        >
          {bh?.cash_position && (
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Net cash flow (month)</span>
                <span className={cn("font-medium tabular-nums flex items-center gap-1",
                  bh.cash_position.net_cash_flow_month >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {bh.cash_position.trend === "up" && <TrendingUp className="h-3 w-3" />}
                  {bh.cash_position.trend === "down" && <TrendingDown className="h-3 w-3" />}
                  {bh.cash_position.trend === "flat" && <Minus className="h-3 w-3" />}
                  {fmtCurrency(bh.cash_position.net_cash_flow_month)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Projected EOM</span>
                <span className="font-medium tabular-nums text-gray-700">
                  {fmtCurrency(bh.cash_position.projected_end_of_month)}
                </span>
              </div>
            </div>
          )}
        </HealthPanel>
      </div>

      {/* ── Row 2: 3 panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Expense Documentation */}
        <HealthPanel
          title="Expense Docs"
          icon={ScrollText}
          status={bh?.expense_documentation?.status ?? "green"}
          summary={bh?.expense_documentation?.summary ?? "Loading…"}
          metric={bh ? `${bh.expense_documentation.coverage_percent}%` : undefined}
          link="/gl"
        >
          {bh?.expense_documentation && (
            <div className="space-y-2">
              {/* Coverage progress bar */}
              <div>
                <div className="flex justify-between text-[11px] text-gray-500 mb-1">
                  <span>Receipt coverage</span>
                  <span className="font-medium text-gray-700 tabular-nums">
                    {bh.expense_documentation.with_receipt} / {bh.expense_documentation.total_expenses}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      bh.expense_documentation.coverage_percent >= 95
                        ? "bg-green-500"
                        : bh.expense_documentation.coverage_percent >= 80
                          ? "bg-amber-400"
                          : "bg-red-500"
                    )}
                    style={{ width: `${bh.expense_documentation.coverage_percent}%` }}
                  />
                </div>
              </div>
              {bh.expense_documentation.without_receipt > 0 && (
                <p className="text-[11px] text-amber-600">
                  {bh.expense_documentation.without_receipt} missing receipts
                </p>
              )}
              {bh.expense_documentation.uncoded_count > 0 && (
                <p className="text-[11px] text-red-600">
                  {bh.expense_documentation.uncoded_count} uncoded transactions
                </p>
              )}
            </div>
          )}
        </HealthPanel>

        {/* GST / BAS Readiness */}
        <HealthPanel
          title="GST / BAS"
          icon={CalculatorIcon}
          status={bh?.gst_bas_readiness?.status ?? "green"}
          summary={bh?.gst_bas_readiness?.summary ?? "Loading…"}
          link="/bas"
        >
          {bh?.gst_bas_readiness && (
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Period</span>
                <span className="font-medium text-gray-700">{bh.gst_bas_readiness.period}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Lodgement due</span>
                <span className="font-medium text-gray-700 tabular-nums">
                  {fmtDate(bh.gst_bas_readiness.lodgement_deadline)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Coded / Total</span>
                <span className="font-medium text-gray-700 tabular-nums">
                  {bh.gst_bas_readiness.coded_count} / {bh.gst_bas_readiness.total_transactions}
                  {bh.gst_bas_readiness.uncoded_count > 0 && (
                    <span className="ml-1 text-red-500">
                      ({bh.gst_bas_readiness.uncoded_count} uncoded)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-100">
                <span className="text-gray-500">Net GST position</span>
                <span className={cn(
                  "font-semibold tabular-nums",
                  bh.gst_bas_readiness.net_gst_position > 0 ? "text-red-600" : "text-green-600"
                )}>
                  {fmtCurrency(bh.gst_bas_readiness.net_gst_position)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {bh.gst_bas_readiness.prior_quarter_lodged ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-400" />
                )}
                <span className={cn(
                  "text-[11px]",
                  bh.gst_bas_readiness.prior_quarter_lodged ? "text-green-600" : "text-red-500"
                )}>
                  Prior quarter {bh.gst_bas_readiness.prior_quarter_lodged ? "lodged" : "not lodged"}
                </span>
              </div>
            </div>
          )}
        </HealthPanel>

        {/* Period Close */}
        <HealthPanel
          title="Period Close"
          icon={CalendarCheck}
          status={bh?.period_close?.status ?? "green"}
          summary={bh?.period_close?.summary ?? "Loading…"}
          link="/reports"
        >
          {bh?.period_close && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] mb-2">
                <span className="text-gray-500">Current period</span>
                <span className="font-medium text-gray-700">{bh.period_close.current_period}</span>
              </div>
              <div className="flex justify-between text-[11px] mb-3">
                <span className="text-gray-500">Days remaining</span>
                <span className={cn(
                  "font-medium tabular-nums",
                  bh.period_close.days_remaining <= 5 ? "text-amber-600" : "text-gray-700"
                )}>
                  {bh.period_close.days_remaining}
                </span>
              </div>
              <ChecklistItems checklist={bh.period_close.checklist} />
            </div>
          )}
        </HealthPanel>
      </div>

      {/* ── Financial Timeline ── */}
      <div className="border-t border-gray-200 pt-6">
        <FullCalendarTimeline />
      </div>
    </PageShell>
  )
}

function ChecklistItems({ checklist }: { checklist: PeriodCloseChecklist }) {
  const items: { key: keyof PeriodCloseChecklist; label: string }[] = [
    { key: "bank_reconciled", label: "Bank reconciled" },
    { key: "journals_posted", label: "Journals posted" },
    { key: "adjustments_reviewed", label: "Adjustments reviewed" },
    { key: "gst_reconciled", label: "GST reconciled" },
    { key: "period_locked", label: "Period locked" },
  ]
  return (
    <div className="space-y-0.5">
      {items.map(({ key, label }) => (
        <CheckItem key={key} label={label} done={checklist[key]} />
      ))}
    </div>
  )
}
