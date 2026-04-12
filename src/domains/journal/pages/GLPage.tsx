import { useState } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button } from "@/components/primitives"
import { usePostJournal, usePendingApprovals, useApproveTransaction, useYearEndClose } from "../hooks/useJournal"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { formatCurrency, formatDate } from "@/shared/lib/utils"
import { DataTable, type Column } from "@/shared/components/DataTable"

interface JournalLineInput {
  account_id: number
  amount: number
  memo: string
}

export function GLPage() {
  usePageHelp(pageHelpContent.journalEntry)
  usePagePolicies(["journal"])
  const [showForm, setShowForm] = useState(false)
  const [reference, setReference] = useState("")
  const [description, setDescription] = useState("")
  const [transDate, setTransDate] = useState("")
  const [lines, setLines] = useState<JournalLineInput[]>([
    { account_id: 0, amount: 0, memo: "" },
    { account_id: 0, amount: 0, memo: "" },
  ])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const { data: accounts } = useAccounts()
  const postJournal = usePostJournal()
  const { data: pending, isLoading: pendingLoading } = usePendingApprovals()
  const approveTransaction = useApproveTransaction()
  const yearEndClose = useYearEndClose()

  const [showYearEnd, setShowYearEnd] = useState(false)
  const [fyEnd, setFyEnd] = useState("")
  const [retainedEarningsId, setRetainedEarningsId] = useState("")
  const [yearEndResult, setYearEndResult] = useState("")

  const addLine = () => setLines([...lines, { account_id: 0, amount: 0, memo: "" }])

  const updateLine = (idx: number, field: keyof JournalLineInput, value: string | number) => {
    const updated = [...lines]
    if (field === "amount") {
      updated[idx][field] = parseFloat(value as string) || 0
    } else if (field === "account_id") {
      updated[idx][field] = parseInt(value as string) || 0
    } else {
      updated[idx][field] = value as string
    }
    setLines(updated)
  }

  const removeLine = (idx: number) => {
    if (lines.length > 2) setLines(lines.filter((_, i) => i !== idx))
  }

  const totalDebits = lines.filter(l => l.amount > 0).reduce((sum, l) => sum + l.amount, 0)
  const totalCredits = lines.filter(l => l.amount < 0).reduce((sum, l) => sum + Math.abs(l.amount), 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.005

  const handleSubmit = async () => {
    setError("")
    setSuccess("")

    if (!reference || !transDate) {
      setError("Reference and date are required")
      return
    }
    if (!isBalanced) {
      setError("Journal entry must balance (debits = credits)")
      return
    }

    const validLines = lines.filter(l => l.account_id > 0 && l.amount !== 0)
    if (validLines.length < 2) {
      setError("At least two lines with accounts and amounts are required")
      return
    }

    try {
      await postJournal.mutateAsync({
        reference,
        description,
        transdate: transDate + "T00:00:00Z",
        lines: validLines,
      })
      setSuccess("Journal entry posted successfully")
      setShowForm(false)
      setReference("")
      setDescription("")
      setTransDate("")
      setLines([
        { account_id: 0, amount: 0, memo: "" },
        { account_id: 0, amount: 0, memo: "" },
      ])
    } catch (err: any) {
      setError(err.message || "Failed to post journal entry")
    }
  }

  const handleApprove = async (transId: number) => {
    try {
      await approveTransaction.mutateAsync({ transaction_id: transId, approved_by: 1 })
    } catch (err: any) {
      setError(err.message || "Failed to approve")
    }
  }

  const pendingColumns: Column<any>[] = [
    { key: "trans_id", header: "ID", className: "w-16" },
    { key: "table_name", header: "Type", className: "w-20",
      render: (row: any) => <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 uppercase">{row.table_name}</span> },
    { key: "reference", header: "Reference" },
    { key: "description", header: "Description" },
    { key: "transdate", header: "Date", render: (row: any) => row.transdate ? formatDate(row.transdate) : "-" },
    { key: "actions", header: "", className: "w-24",
      render: (row: any) => (
        <button
          onClick={() => handleApprove(row.trans_id)}
          className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100"
        >
          Approve
        </button>
      ),
    },
  ]

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">General Ledger</h1>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Journal Entry"}
        </Button>
        {showForm && (
          <Button onClick={handleSubmit} disabled={!isBalanced} loading={postJournal.isPending}>
            Post Entry
          </Button>
        )}
        <Button variant="secondary" onClick={() => setShowYearEnd(!showYearEnd)}>
          {showYearEnd ? "Cancel Year-End" : "Year-End Close"}
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md">{success}</div>}

      {showForm && (
        <PageSection title="New Journal Entry">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference</label>
              <input type="text" value={reference} onChange={e => setReference(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="JE-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={transDate} onChange={e => setTransDate(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Optional description" />
            </div>
          </div>

          <table className="w-full border rounded-lg text-sm mb-4">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Account</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 w-36">Debit</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 w-36">Credit</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Memo</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2">
                    <select value={line.account_id} onChange={e => updateLine(idx, "account_id", e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm">
                      <option value={0}>Select account...</option>
                      {accounts?.map(a => (
                        <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" step="0.01" min="0" placeholder="0.00"
                      value={line.amount > 0 ? line.amount : ""}
                      onChange={e => updateLine(idx, "amount", parseFloat(e.target.value) || 0)}
                      className="w-full border rounded px-2 py-1 text-sm font-mono text-right" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" step="0.01" min="0" placeholder="0.00"
                      value={line.amount < 0 ? Math.abs(line.amount) : ""}
                      onChange={e => updateLine(idx, "amount", -(parseFloat(e.target.value) || 0))}
                      className="w-full border rounded px-2 py-1 text-sm font-mono text-right" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="text" value={line.memo} onChange={e => updateLine(idx, "memo", e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm" placeholder="Line memo" />
                  </td>
                  <td className="px-3 py-2">
                    {lines.length > 2 && (
                      <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600 text-xs">X</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-500 text-white font-medium">
                <td className="px-3 py-2 text-right">Totals</td>
                <td className="px-3 py-2 font-mono text-right">{formatCurrency(totalDebits)}</td>
                <td className="px-3 py-2 font-mono text-right">{formatCurrency(totalCredits)}</td>
                <td className="px-3 py-2">
                  {isBalanced
                    ? <span className="text-green-300 text-xs">Balanced</span>
                    : <span className="text-red-300 text-xs">Out of balance: {formatCurrency(Math.abs(totalDebits - totalCredits))}</span>
                  }
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <button onClick={addLine}
            className="mb-4 px-3 py-1.5 text-xs rounded-md bg-gray-500 text-white hover:bg-gray-600 transition-colors">
            + Add Line
          </button>

        </PageSection>
      )}

      <PageSection title="Pending Approvals">
        <DataTable columns={pendingColumns} data={pending ?? []} loading={pendingLoading} emptyMessage="No transactions pending approval." />
      </PageSection>

      {showYearEnd && (
        <PageSection title="Year-End Close" description="This will zero all income and expense accounts and transfer the net profit to a retained earnings equity account.">
            {yearEndResult && <div className="mb-3 p-3 bg-green-50 text-green-700 text-sm rounded-md">{yearEndResult}</div>}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fiscal Year End Date</label>
                <input type="date" value={fyEnd} onChange={e => setFyEnd(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Retained Earnings Account</label>
                <select value={retainedEarningsId} onChange={e => setRetainedEarningsId(e.target.value)}
                  className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="">Select equity account...</option>
                  {accounts?.filter(a => a.category === "Q").map(a => (
                    <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!fyEnd || !retainedEarningsId) { setError("Date and account required"); return }
                try {
                  const result = await yearEndClose.mutateAsync({
                    fiscal_year_end: fyEnd,
                    retained_earnings_account_id: parseInt(retainedEarningsId),
                    curr: "AUD",
                  })
                  setYearEndResult(`Year-end close complete: ${(result as any).accounts_closed} accounts closed, net profit ${formatCurrency((result as any).net_profit)}`)
                  setShowYearEnd(false)
                } catch (err: any) {
                  setError(err.message)
                }
              }}
              disabled={yearEndClose.isPending}
              className="px-4 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              {yearEndClose.isPending ? "Closing..." : "Close Financial Year"}
            </button>
        </PageSection>
      )}
    </PageShell>
  )
}
