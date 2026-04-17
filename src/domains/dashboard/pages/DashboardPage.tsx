import { useNavigate } from "react-router-dom"
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { MoneyValue } from "@/components/financial"
import { DecisionQueue, type DecisionQueueItem } from "@/components/workflow"
import { InfoPanel, Skeleton } from "@/components/primitives"
import { useDashboard } from "../hooks/useDashboard"
import { useCalendarTimeline, useCompleteCalendarTask } from "@/domains/calendar/hooks/useCalendar"

export function DashboardPage() {
  usePageHelp(pageHelpContent.dashboard)
  usePagePolicies(["reporting"])
  const { data: metrics, isLoading } = useDashboard()
  const { data: timelineData } = useCalendarTimeline(7)
  const completeTask = useCompleteCalendarTask()
  const navigate = useNavigate()

  const pendingItems = (timelineData?.items ?? []).filter((i) => !i.done)
  const overdueCount = pendingItems.filter((i) => i.overdue).length

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
      <p className="mt-0.5 text-sm text-gray-500">What needs attention today</p>
    </div>
  )

  if (isLoading) {
    return (
      <PageShell header={header} loading={isLoading}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </PageShell>
    )
  }

  const arOutstanding = metrics ? parseFloat(metrics.ar_outstanding) : 0
  const apOutstanding = metrics ? parseFloat(metrics.ap_outstanding) : 0
  const gstPosition = metrics ? parseFloat(metrics.gst_position) : 0

  const receivablesItems: DecisionQueueItem[] = arOutstanding > 0
    ? [{
        id: "ar-outstanding",
        label: "Outstanding receivables",
        amount: arOutstanding,
        actionLabel: "Review",
        onAction: () => navigate("/invoices"),
        variant: "warning",
      }]
    : []

  const payablesItems: DecisionQueueItem[] = apOutstanding > 0
    ? [{
        id: "ap-outstanding",
        label: "Outstanding payables",
        amount: apOutstanding,
        actionLabel: "Review",
        onAction: () => navigate("/bills"),
        variant: "warning",
      }]
    : []

  return (
    <PageShell header={header} loading={isLoading}>
      <InfoPanel
        title={
          pendingItems.length === 0
            ? "All clear for today"
            : `Today (${pendingItems.length})${overdueCount > 0 ? ` — ${overdueCount} overdue` : ""}`
        }
        storageKey="dashboard-today-info"
      >
        {pendingItems.length === 0 ? (
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            <span>Nothing pending in the next 7 days. Good time to catch up on reconciliations or review the{" "}
              <button onClick={() => navigate("/")} className="underline font-medium hover:text-blue-900">Books Overview</button>.
            </span>
          </p>
        ) : (
          <ul className="space-y-1">
            {pendingItems.map((item) => {
              const isTask = item.type === "task"
              const icon = item.overdue ? (
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              ) : isTask ? (
                <button
                  type="button"
                  onClick={() => completeTask.mutate(item.id)}
                  disabled={completeTask.isPending}
                  className="shrink-0 mt-0.5 text-blue-400 hover:text-green-500 disabled:opacity-50"
                  title="Mark as done"
                  aria-label={`Mark "${item.title}" as done`}
                >
                  <Circle className="h-4 w-4" />
                </button>
              ) : (
                <Circle className="h-4 w-4 text-blue-300 shrink-0 mt-0.5" />
              )
              const dateLabel = new Date(item.date).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
              return (
                <li key={item.id} className="flex items-start gap-2">
                  {icon}
                  <span className="flex-1">
                    {item.link ? (
                      <button onClick={() => navigate(item.link!)} className="underline font-medium text-left hover:text-blue-900">
                        {item.title}
                      </button>
                    ) : (
                      <span className="font-medium">{item.title}</span>
                    )}
                    <span className={item.overdue ? "ml-2 text-red-700 font-medium" : "ml-2 text-blue-600"}>
                      {item.overdue ? `overdue (was due ${dateLabel})` : dateLabel}
                    </span>
                    {item.description && <span className="block text-blue-600 text-[11px] mt-0.5">{item.description}</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-2 text-blue-500 text-[11px]">
          Manual tasks (circles) can be checked off here. Auto-generated items (BAS, payroll, due dates) clear when the underlying work is done.
        </p>
      </InfoPanel>

      {/* Financial position summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PageSection title="Receivables" variant="card">
          <MoneyValue amount={arOutstanding} size="xl" colorNegative={false} />
          <p className="text-xs text-gray-500 mt-1">Outstanding AR</p>
        </PageSection>
        <PageSection title="Payables" variant="card">
          <MoneyValue amount={apOutstanding} size="xl" colorNegative={false} />
          <p className="text-xs text-gray-500 mt-1">Outstanding AP</p>
        </PageSection>
        <PageSection title="GST Position" variant="card">
          <MoneyValue amount={gstPosition} size="xl" />
          <p className="text-xs text-gray-500 mt-1">{gstPosition >= 0 ? "Owing to ATO" : "Refund expected"}</p>
        </PageSection>
      </div>

      {/* Work queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DecisionQueue
          title="Receivables requiring attention"
          items={receivablesItems}
          emptyMessage="All receivables are current."
          headerAction={
            <button
              type="button"
              className="text-xs text-primary-600 hover:underline"
              onClick={() => navigate("/invoices")}
            >
              View all
            </button>
          }
        />
        <DecisionQueue
          title="Payables requiring attention"
          items={payablesItems}
          emptyMessage="All payables are current."
          headerAction={
            <button
              type="button"
              className="text-xs text-primary-600 hover:underline"
              onClick={() => navigate("/bills")}
            >
              View all
            </button>
          }
        />
      </div>

      {/* Activity summary */}
      {metrics && metrics.recent_txn_count > 0 && (
        <PageSection variant="plain">
          <p className="text-sm text-gray-500">
            {metrics.recent_txn_count} transactions in the last 30 days.
          </p>
        </PageSection>
      )}
    </PageShell>
  )
}
