import { useState } from "react"
import { Link } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Badge, Button, Combobox } from "@/components/primitives"
import { DataTable } from "@/shared/components/DataTable"
import { usePayments, useCreatePayment, type PaymentSummary } from "../hooks/usePayments"
import { useVendors } from "@/domains/contact/hooks/useContacts"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useBills } from "@/domains/payable/hooks/useBills"
import { formatCurrency, formatDate } from "@/shared/lib/utils"

const columns = [
  {
    key: "reference",
    header: "Reference",
    className: "font-mono",
    render: (row: PaymentSummary) => (
      <Link to={`/payments/${row.trans_id}`} className="text-primary-600 hover:underline">
        {row.reference || `#${row.trans_id}`}
      </Link>
    ),
  },
  { key: "payment_date", header: "Date", render: (row: PaymentSummary) => row.payment_date ? formatDate(row.payment_date) : "-" },
  {
    key: "vendor_name",
    header: "Vendor",
    render: (row: PaymentSummary) => {
      if (!row.vendor_name) {
        // Unattributed payment — surface as a clear call-to-action so the
        // user knows they can fix it from the detail page.
        return (
          <Link to={`/payments/${row.trans_id}`} className="text-amber-700 hover:underline text-xs">
            (no vendor — attribute)
          </Link>
        )
      }
      return (
        <span className="inline-flex items-center gap-2">
          {row.vendor_name}
          {row.vendor_source === "override" && (
            <Badge variant="info">manual</Badge>
          )}
        </span>
      )
    },
  },
  { key: "amount", header: "Amount", className: "text-right font-mono", render: (row: PaymentSummary) => formatCurrency(row.amount) },
  { key: "approved", header: "Status", className: "w-20",
    render: (row: PaymentSummary) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${row.approved ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
        {row.approved ? "Posted" : "Draft"}
      </span>
    ),
  },
]

export function PaymentsPage() {
  usePageHelp(pageHelpContent.payments)
  usePagePolicies(["payment"])
  const { data: payments, isLoading, error: fetchError } = usePayments()
  const { data: vendors } = useVendors()
  const { data: accounts } = useAccounts()
  const { data: bills } = useBills()
  const createPayment = useCreatePayment()

  const nextReference = `PAY-${String((payments?.length ?? 0) + 1).padStart(4, "0")}`
  const [showForm, setShowForm] = useState(false)
  const [vendorId, setVendorId] = useState("")
  const [bankAccountId, setBankAccountId] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [reference, setReference] = useState("")
  const displayReference = reference || nextReference
  const [allocations, setAllocations] = useState<Record<number, string>>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const bankAccounts = accounts?.filter(a => a.category === "A") ?? []
  const vendorBills = bills?.filter(b => b.approved && !b.on_hold) ?? []
  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)

  const handleCreate = async () => {
    setError(""); setSuccess("")
    if (!vendorId || !bankAccountId || !paymentDate || !displayReference) {
      setError("Vendor, bank account, date, and reference are required"); return
    }
    const allocs = Object.entries(allocations)
      .filter(([, amt]) => parseFloat(amt) > 0)
      .map(([transId, amt]) => ({ bill_trans_id: parseInt(transId), amount: parseFloat(amt) }))
    if (allocs.length === 0) { setError("Allocate at least one amount"); return }
    try {
      await createPayment.mutateAsync({
        bank_account_id: parseInt(bankAccountId), vendor_id: parseInt(vendorId),
        payment_date: paymentDate, reference: displayReference, curr: "AUD", allocations: allocs,
      })
      setSuccess("Payment created"); setShowForm(false); setAllocations({}); setReference("")
    } catch (err: any) { setError(err.message) }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Payments</h1>
        <span className="text-sm text-gray-500">{payments?.length ?? 0} payments made</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Record payments made to suppliers</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Payment"}
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md">{success}</div>}

      {showForm && (
        <PageSection title="Make Payment">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
              <Combobox
                options={vendors?.map(v => ({ value: v.id, label: v.name })) ?? []}
                value={vendorId || null}
                onChange={(v) => { setVendorId(v ? String(v) : ""); setAllocations({}) }}
                placeholder="Search vendors..."
              /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">Select bank account...</option>
                {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">
              Reference
              <span className="ml-1 font-normal text-gray-400">auto-generated</span>
            </label>
              <input type="text" value={displayReference} onChange={e => setReference(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" /></div>
          </div>
          {vendorId && (
            <>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Allocate to Bills</h4>
              <table className="w-full border rounded-lg text-sm mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Bill #</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Outstanding</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Allocate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vendorBills.map(bill => (
                    <tr key={bill.trans_id}>
                      <td className="px-3 py-2 font-mono">{bill.invnumber}</td>
                      <td className="px-3 py-2">{bill.transdate ? formatDate(bill.transdate) : "-"}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(bill.amount_bc)}</td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0" value={allocations[bill.trans_id] ?? ""}
                          onChange={e => setAllocations({ ...allocations, [bill.trans_id]: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm text-right font-mono" placeholder="0.00" />
                      </td>
                    </tr>
                  ))}
                  {vendorBills.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">No open bills.</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-500 text-white font-medium"><td colSpan={3} className="px-3 py-2 text-right">Total</td><td className="px-3 py-2 text-right font-mono">{formatCurrency(totalAllocated)}</td></tr>
                </tfoot>
              </table>
            </>
          )}
          <button onClick={handleCreate} disabled={createPayment.isPending || totalAllocated === 0}
            className="px-4 py-1.5 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
            {createPayment.isPending ? "Creating..." : "Create Payment"}</button>
        </PageSection>
      )}

      <DataTable columns={columns} data={payments ?? []} loading={isLoading} error={fetchError} emptyMessage="No payments recorded yet." />
    </PageShell>
  )
}
