import { useState } from "react"
import { Link } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InfoPanel } from "@/components/primitives"
import { DataTable } from "@/shared/components/DataTable"
import { usePayRuns, useEmployees, useProcessPayRun, type PayRun } from "../hooks/usePayroll"
import { formatCurrency, formatDate } from "@/shared/lib/utils"

// STP status → colour + label map. "Not submitted" (no STP row) is amber to
// signal that the pay run is incomplete from an ATO-compliance standpoint.
function renderSTPStatus(r: PayRun) {
  const status = r.stp_status
  if (!status) {
    return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Not submitted</span>
  }
  const styles: Record<string, string> = {
    accepted: "bg-green-50 text-green-700",
    submitted: "bg-blue-50 text-blue-700",
    pending:   "bg-yellow-50 text-yellow-700",
    failed:    "bg-red-50 text-red-700",
  }
  const cls = styles[status] ?? "bg-gray-50 text-gray-700"
  return <span className={`text-xs px-2 py-0.5 rounded-full ${cls}`}>{status}</span>
}

const columns = [
  { key: "id", header: "ID", className: "w-12" },
  { key: "pay_period_start", header: "Period Start", render: (r: PayRun) => formatDate(r.pay_period_start) },
  { key: "pay_period_end", header: "Period End", render: (r: PayRun) => formatDate(r.pay_period_end) },
  { key: "employee_count", header: "Employees", className: "text-right w-20" },
  { key: "total_gross", header: "Gross", className: "text-right font-mono", render: (r: PayRun) => formatCurrency(r.total_gross) },
  { key: "total_tax", header: "PAYG", className: "text-right font-mono", render: (r: PayRun) => formatCurrency(r.total_tax) },
  { key: "total_super", header: "Super", className: "text-right font-mono", render: (r: PayRun) => formatCurrency(r.total_super) },
  { key: "total_net", header: "Net", className: "text-right font-mono", render: (r: PayRun) => formatCurrency(r.total_net) },
  { key: "status", header: "Status", className: "w-24",
    render: (r: PayRun) => <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "paid" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>{r.status}</span> },
  { key: "stp_status", header: "STP", className: "w-28", render: renderSTPStatus },
]

export function PayRunsPage() {
  usePagePolicies(["payroll", "tax"])
  const { data: runs, isLoading, error: fetchError } = usePayRuns()
  const { data: employees } = useEmployees()
  const processPayRun = useProcessPayRun()

  const [showForm, setShowForm] = useState(false)
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState<Record<number, string>>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const activeEmployees = employees?.filter(e => e.active) ?? []

  const toggleEmployee = (id: number) => {
    const updated = { ...selectedEmployees }
    if (updated[id] !== undefined) {
      delete updated[id]
    } else {
      updated[id] = "38" // Default 38 hours
    }
    setSelectedEmployees(updated)
  }

  const handleProcess = async () => {
    setError(""); setSuccess("")
    if (!periodStart || !periodEnd || !paymentDate) {
      setError("Period dates and payment date are required"); return
    }
    const empList = Object.entries(selectedEmployees)
      .map(([id, hours]) => ({ employee_id: parseInt(id), hours_worked: parseFloat(hours) || 0 }))
    if (empList.length === 0) { setError("Select at least one employee"); return }

    try {
      const result = await processPayRun.mutateAsync({
        pay_period_start: periodStart,
        pay_period_end: periodEnd,
        payment_date: paymentDate,
        employees: empList,
      })
      setSuccess(`Pay run processed: ${(result as any).employee_count} employees, gross ${formatCurrency((result as any).total_gross)}, net ${formatCurrency((result as any).total_net)}`)
      setShowForm(false)
      setSelectedEmployees({})
    } catch (err: any) { setError(err.message) }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Pay Runs</h1>
        <span className="text-sm text-gray-500">{runs?.length ?? 0} pay runs</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Process payroll and generate payslips</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Process Pay Run"}
        </Button>
      </div>
    </div>
  )

  // STP submission signal for the info panel — how many recent runs are not yet
  // lodged with the ATO.
  const unlodged = (runs ?? []).filter((r) => !r.stp_status || r.stp_status === "pending" || r.stp_status === "failed").length

  return (
    <PageShell header={header} loading={isLoading}>
      <InfoPanel title="About Pay Runs" storageKey="pay-runs-info">
        <p>
          A <strong>Pay Run</strong> calculates each employee's gross pay, PAYG withholding (ATO Schedule 1), and
          superannuation guarantee for a pay period. Once processed, it posts the payroll journal and generates
          payslips.
        </p>
        <p className="mt-1.5">
          <strong>STP (Single Touch Payroll)</strong> is mandatory for most Australian employers — every pay run must
          be lodged with the ATO <em>on or before</em> the payment date. The <strong>STP</strong> column shows each
          pay run's submission state:
        </p>
        <ul className="mt-0.5 space-y-0.5 ml-2">
          <li><span className="inline-block px-1.5 py-0 rounded-full bg-green-50 text-green-700 text-[10px]">accepted</span> — ATO received and accepted the submission.</li>
          <li><span className="inline-block px-1.5 py-0 rounded-full bg-blue-50 text-blue-700 text-[10px]">submitted</span> — sent to the ATO via SBR, awaiting receipt.</li>
          <li><span className="inline-block px-1.5 py-0 rounded-full bg-yellow-50 text-yellow-700 text-[10px]">pending</span> — queued for submission.</li>
          <li><span className="inline-block px-1.5 py-0 rounded-full bg-red-50 text-red-700 text-[10px]">failed</span> — ATO rejected; click through to see the error and retry.</li>
          <li><span className="inline-block px-1.5 py-0 rounded-full bg-amber-50 text-amber-700 text-[10px]">Not submitted</span> — no submission yet. Don't leave this state after pay day.</li>
        </ul>
        {unlodged > 0 && (
          <p className="mt-1.5 text-amber-700 font-medium">
            {unlodged} pay run{unlodged === 1 ? "" : "s"} not yet lodged with the ATO. Open the run and click
            "Submit STP".
          </p>
        )}
        <p className="mt-1.5 text-blue-600">
          Manage employees, pay rates, and super funds from the <Link to="/employees" className="underline font-medium">Employees</Link> page.
          Year-end STP finalisation happens automatically from the last run of the financial year.
        </p>
      </InfoPanel>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md">{success}</div>}

      {showForm && (
        <PageSection title="Process Pay Run">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Period Start</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Period End</label>
              <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          </div>

          <h4 className="text-sm font-medium text-gray-700 mb-2">Select Employees</h4>
          <table className="w-full border rounded-lg text-sm mb-4">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-8 px-3 py-2"></th>
                <th className="text-left px-3 py-2 font-medium text-gray-600">Employee</th>
                <th className="text-left px-3 py-2 font-medium text-gray-600 w-24">Type</th>
                <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeEmployees.map(emp => (
                <tr key={emp.id} className={selectedEmployees[emp.id] !== undefined ? "bg-blue-50" : ""}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selectedEmployees[emp.id] !== undefined}
                      onChange={() => toggleEmployee(emp.id)} />
                  </td>
                  <td className="px-3 py-2">{emp.first_name} {emp.last_name}</td>
                  <td className="px-3 py-2 capitalize">{emp.employment_type.replace("_", " ")}</td>
                  <td className="px-3 py-2">
                    {selectedEmployees[emp.id] !== undefined && (
                      <input type="number" step="0.5" min="0"
                        value={selectedEmployees[emp.id]}
                        onChange={e => setSelectedEmployees({ ...selectedEmployees, [emp.id]: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm text-right font-mono" />
                    )}
                  </td>
                </tr>
              ))}
              {activeEmployees.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">No active employees. Add employees first.</td></tr>}
            </tbody>
          </table>

          <p className="text-xs text-gray-500 mb-3">
            PAYG withholding calculated using ATO Schedule 1 coefficient method. Super at current SG rate (11.5% FY2025, 12% FY2026+).
          </p>

          <button onClick={handleProcess} disabled={processPayRun.isPending || Object.keys(selectedEmployees).length === 0}
            className="px-4 py-1.5 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
            {processPayRun.isPending ? "Processing..." : "Process Pay Run"}
          </button>
        </PageSection>
      )}

      <DataTable columns={columns} data={runs ?? []} loading={isLoading} error={fetchError} emptyMessage="No pay runs processed yet." />
    </PageShell>
  )
}
