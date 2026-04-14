import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { MoneyValue } from "@/components/financial"
import { DecisionQueue, type DecisionQueueItem } from "@/components/workflow"
import { Skeleton } from "@/components/primitives"
import { useDashboard } from "../hooks/useDashboard"

export function DashboardPage() {
  usePageHelp(pageHelpContent.dashboard)
  usePagePolicies(["reporting"])
  const { data: metrics, isLoading } = useDashboard()
  const navigate = useNavigate()

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
