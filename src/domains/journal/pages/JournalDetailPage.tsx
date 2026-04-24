import { useParams } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection, TotalsCard } from "@/components/layout"
import { EntityHeader, AuditTimeline } from "@/components/workflow"
import { MoneyValue, BalanceIndicator, StatusStepper, lifecycleSteps } from "@/components/financial"
import { InlineAlert, Skeleton } from "@/components/primitives"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { useJournalEntry } from "../hooks/useJournal"
import { useEntityActivity } from "@/hooks/useEntityActivity"

interface GLLine {
  entry_id: number
  chart_id: number
  amount_bc: string
  curr: string
  memo?: string
}

const lineColumns: Column<GLLine>[] = [
  { key: "chart_id", header: "Account", className: "font-mono w-24" },
  { key: "memo", header: "Memo", render: (row: GLLine) => <span className="text-gray-600">{row.memo ?? ""}</span> },
  {
    key: "debit",
    header: "Debit",
    className: "text-right w-32",
    render: (row: GLLine) => {
      const amt = parseFloat(row.amount_bc)
      return amt > 0 ? <MoneyValue amount={amt} size="sm" colorNegative={false} /> : <span className="text-gray-300">—</span>
    },
  },
  {
    key: "credit",
    header: "Credit",
    className: "text-right w-32",
    render: (row: GLLine) => {
      const amt = parseFloat(row.amount_bc)
      return amt < 0 ? <MoneyValue amount={Math.abs(amt)} size="sm" colorNegative={false} /> : <span className="text-gray-300">—</span>
    },
  },
  { key: "curr", header: "Curr", className: "w-16" },
]

export function JournalDetailPage() {
  usePagePolicies(["account", "journal", "audit"])
  const { id } = useParams<{ id: string }>()
  const entryId = parseInt(id ?? "0")
  const { data: entry, isLoading, error } = useJournalEntry(entryId)
  const { data: activity, isLoading: activityLoading } = useEntityActivity("gl", entryId)

  if (isLoading) return <Skeleton variant="table" rows={6} columns={5} className="mt-8" />
  if (error || !entry) {
    return (
      <PageShell>
        <InlineAlert variant="error">Journal entry not found.</InlineAlert>
      </PageShell>
    )
  }

  const lines = entry.lines ?? []
  const totalDebits = lines.reduce((sum, l) => {
    const amt = parseFloat(l.amount_bc)
    return amt > 0 ? sum + amt : sum
  }, 0)
  const totalCredits = lines.reduce((sum, l) => {
    const amt = parseFloat(l.amount_bc)
    return amt < 0 ? sum + Math.abs(amt) : sum
  }, 0)

  const journalStatus = entry.approved ? "posted" : "draft"

  const header = (
    <div>
      <EntityHeader
        title={`Journal ${entry.reference || `#${entry.id}`}`}
        subtitle={entry.description || "General Ledger"}
        status={journalStatus}
        reference={`#${entry.id}`}
        date={entry.transdate}
        dateLabel="Transaction date"
        backTo="/gl"
      />
      <StatusStepper
        steps={[...lifecycleSteps.journal]}
        currentStatus={journalStatus}
        className="mt-4 max-w-md"
      />
    </div>
  )

  const aside = (
    <>
      <BalanceIndicator debits={totalDebits} credits={totalCredits} />
      <TotalsCard
        title="Entry Summary"
        rows={[
          { label: "Total Debits", value: <MoneyValue amount={totalDebits} colorNegative={false} /> },
          { label: "Total Credits", value: <MoneyValue amount={totalCredits} colorNegative={false} /> },
          { label: "Lines", value: <span className="tabular-nums">{lines.length}</span>, emphasis: "muted" },
        ]}
      />
    </>
  )

  const activityPanel = (
    <PageSection title="Activity" variant="card">
      <AuditTimeline events={activity ?? []} loading={activityLoading} />
    </PageSection>
  )

  return (
    <PageShell header={header} aside={aside} activity={activityPanel}>
      <PageSection title="GL Lines">
        <DataTable columns={lineColumns} data={lines} emptyMessage="No journal lines" />
      </PageSection>
    </PageShell>
  )
}
