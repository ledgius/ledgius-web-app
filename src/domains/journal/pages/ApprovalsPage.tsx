import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { usePendingApprovals, useApproveTransaction, useRejectTransaction, type PendingApproval } from "../hooks/useJournal"
import { formatDate } from "@/shared/lib/utils"
import { useState } from "react"

export function ApprovalsPage() {
  usePageHelp(pageHelpContent.approvals)
  usePagePolicies(["journal"])
  const { data: pending, isLoading } = usePendingApprovals()
  const approveTransaction = useApproveTransaction()
  const rejectTransaction = useRejectTransaction()
  const [message, setMessage] = useState("")
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const handleApprove = async (transId: number) => {
    try {
      await approveTransaction.mutateAsync({ transaction_id: transId, approved_by: 1 })
      setMessage(`Transaction ${transId} approved`)
    } catch (err: any) {
      setMessage(err.message || "Failed to approve")
    }
  }

  const columns: Column<PendingApproval>[] = [
    { key: "trans_id", header: "ID", className: "w-16" },
    { key: "table_name", header: "Type", className: "w-24",
      render: (row) => {
        const labels: Record<string, string> = { ar: "Invoice", ap: "Bill", gl: "Journal", payment: "Payment" }
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{labels[row.table_name] ?? row.table_name}</span>
      },
    },
    { key: "reference", header: "Reference" },
    { key: "description", header: "Description" },
    { key: "transdate", header: "Date",
      render: (row) => row.transdate ? formatDate(row.transdate) : "-" },
    { key: "actions", header: "", className: "w-40",
      render: (row) => (
        <div className="flex gap-1.5">
          <button onClick={() => handleApprove(row.trans_id)}
            className="text-xs font-medium px-2.5 py-1 rounded-md bg-green-50 text-green-600 border border-transparent hover:bg-green-600 hover:text-white hover:shadow-sm transition-all duration-150">
            Approve
          </button>
          <button onClick={() => { setRejectId(row.trans_id); setRejectReason("") }}
            className="text-xs font-medium px-2.5 py-1 rounded-md bg-red-50 text-red-500 border border-transparent hover:bg-red-600 hover:text-white hover:shadow-sm transition-all duration-150">
            Reject
          </button>
        </div>
      ),
    },
  ]

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Transaction Approvals</h1>
        <span className="text-sm text-gray-500">{pending?.length ?? 0} pending</span>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {message && (
        <div className="mb-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-md">{message}</div>
      )}
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <DataTable columns={columns} data={pending ?? []} emptyMessage="No transactions pending approval." />
      )}

      {rejectId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">Reject Transaction #{rejectId}</h3>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm mb-4" rows={3} placeholder="Reason for rejection..." />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRejectId(null)} className="px-3 py-1.5 text-sm rounded border text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={async () => {
                if (!rejectReason) return
                try {
                  await rejectTransaction.mutateAsync({ transaction_id: rejectId, rejected_by: "user", reason: rejectReason })
                  setMessage(`Transaction ${rejectId} rejected`)
                  setRejectId(null)
                } catch (err: any) {
                  setMessage(err.message)
                }
              }} className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700">Reject</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
