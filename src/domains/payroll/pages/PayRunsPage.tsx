import { useState } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button } from "@/components/primitives"
import { DataTable } from "@/shared/components/DataTable"
import { usePayRuns, useEmployees, useProcessPayRun, type PayRun } from "../hooks/usePayroll"
import { formatCurrency, formatDate } from "@/shared/lib/utils"

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
]

export function PayRunsPage() {
  usePageHelp(pageHelpContent.payRuns)
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

  return (
    <PageShell header={header} loading={isLoading}>
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
