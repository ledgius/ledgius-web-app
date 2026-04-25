import { BackLink } from "@/components/primitives"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
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
        return (
          <Link to={`/payments/${row.trans_id}`} className="text-amber-700 hover:underline text-xs">
            (no vendor — attribute)
          </Link>
        )
      }
      return (
        <span className="inline-flex items-center gap-2">
          {row.vendor_name}
          {row.vendor_source === "override" && <Badge variant="info">manual</Badge>}
        </span>
      )
    },
  },
  {
    key: "bill_refs",
    header: "Bills Paid",
    className: "font-mono text-xs text-gray-700",
    render: (row: PaymentSummary) => row.bill_refs || <span className="text-gray-400">—</span>,
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
  usePagePolicies(["payable", "payment", "account", "banking"])
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
  const [amount, setAmount] = useState("")
  const displayReference = reference || nextReference
  // allocations: bill_trans_id → amount string. A bill is "ticked" iff it has
  // an entry here (even "0"). Untick removes the entry.
  const [allocations, setAllocations] = useState<Record<number, string>>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const bankAccounts = accounts?.filter(a => a.category === "A") ?? []

  // Bills for the selected vendor, open only, ordered by due date ASC so the
  // user works down the oldest-due list first.
  const vendorBills = useMemo(() => {
    if (!vendorId || !bills) return []
    return bills
      .filter(b => b.vendor_id === parseInt(vendorId) && b.approved && !b.on_hold)
      .slice()
      .sort((a, b) => {
        const da = a.duedate ? new Date(a.duedate).getTime() : Number.POSITIVE_INFINITY
        const db = b.duedate ? new Date(b.duedate).getTime() : Number.POSITIVE_INFINITY
        return da - db
      })
  }, [bills, vendorId])

  const amountNum = parseFloat(amount) || 0
  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
  const unallocated = amountNum - totalAllocated
  const overAllocated = totalAllocated > amountNum && amountNum > 0

  const toggleBill = (bill: { trans_id: number; amount_bc: string }) => {
    setAllocations(prev => {
      if (prev[bill.trans_id] !== undefined) {
        const { [bill.trans_id]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [bill.trans_id]: bill.amount_bc }
    })
  }

  const selectAllOpen = () => {
    const next: Record<number, string> = {}
    for (const b of vendorBills) next[b.trans_id] = b.amount_bc
    setAllocations(next)
  }

  const clearAll = () => setAllocations({})

  const resetForm = () => {
    setShowForm(false); setAllocations({}); setReference(""); setAmount("")
    setVendorId(""); setBankAccountId(""); setPaymentDate("")
  }

  const handleCreate = async () => {
    setError(""); setSuccess("")
    if (!vendorId || !bankAccountId || !paymentDate || !displayReference || amountNum <= 0) {
      setError("Amount, vendor, bank account, date, and reference are required"); return
    }
    const allocs = Object.entries(allocations)
      .filter(([, amt]) => parseFloat(amt) > 0)
      .map(([transId, amt]) => ({ bill_trans_id: parseInt(transId), amount: parseFloat(amt) }))
    if (allocs.length === 0) { setError("Tick at least one bill to allocate the payment against"); return }
    if (overAllocated) { setError(`Allocated ${formatCurrency(totalAllocated)} exceeds payment amount ${formatCurrency(amountNum)}`); return }
    try {
      await createPayment.mutateAsync({
        bank_account_id: parseInt(bankAccountId), vendor_id: parseInt(vendorId),
        payment_date: paymentDate, reference: displayReference, curr: "AUD", allocations: allocs,
      })
      setSuccess("Payment recorded"); resetForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record payment")
    }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Payments</h1>
        <span className="text-sm text-gray-500">{payments?.length ?? 0} payments made</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Record payments made to suppliers</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => showForm ? resetForm() : setShowForm(true)}>
          {showForm ? "Cancel" : "New Payment"}
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <BackLink />
{error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md">{success}</div>}

      {showForm && (
        <PageSection title="Record Payment">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border rounded px-2 py-1.5 text-sm font-mono text-right max-w-[11rem]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
              <Combobox
                options={vendors?.map(v => ({ value: v.id, label: v.name })) ?? []}
                value={vendorId || null}
                onChange={(v) => { setVendorId(v ? String(v) : ""); setAllocations({}) }}
                placeholder="Search vendors..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}
                className="w-full border rounded pl-2 pr-7 py-1.5 text-sm max-w-[20rem]">
                <option value="">Select bank account...</option>
                {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm max-w-[11rem]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Reference
                <span className="ml-1 font-normal text-gray-400">auto-generated</span>
              </label>
              <input type="text" value={displayReference} onChange={e => setReference(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm font-mono max-w-[14rem]" />
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Open Bills for this Vendor</h4>
            {vendorId && vendorBills.length > 0 && (
              <div className="flex gap-2">
                <button type="button" onClick={selectAllOpen}
                  className="text-xs text-primary-600 hover:text-primary-700 underline">
                  Tick all
                </button>
                <span className="text-gray-300">|</span>
                <button type="button" onClick={clearAll}
                  className="text-xs text-gray-500 hover:text-gray-700 underline">
                  Clear
                </button>
              </div>
            )}
          </div>
          <table className="w-full border rounded-lg text-sm mb-3">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-3 py-2"></th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Bill #</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600 w-32">Due Date</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Outstanding</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-36">Allocated</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vendorBills.map(bill => {
                    const ticked = allocations[bill.trans_id] !== undefined
                    const outstanding = parseFloat(bill.amount_bc) || 0
                    const isOverdue = bill.duedate && new Date(bill.duedate).getTime() < Date.now()
                    return (
                      <tr key={bill.trans_id} className={ticked ? "bg-primary-50" : ""}>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={ticked} onChange={() => toggleBill(bill)}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                        </td>
                        <td className="px-3 py-2 font-mono">{bill.invnumber}</td>
                        <td className="px-3 py-2">
                          {bill.duedate ? (
                            <span className={isOverdue ? "text-red-600 font-medium" : ""}>{formatDate(bill.duedate)}</span>
                          ) : "-"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{formatCurrency(outstanding)}</td>
                        <td className="px-3 py-2">
                          <input type="number" step="0.01" min="0" max={outstanding}
                            value={allocations[bill.trans_id] ?? ""}
                            onChange={e => setAllocations({ ...allocations, [bill.trans_id]: e.target.value })}
                            disabled={!ticked}
                            className="w-full border rounded px-2 py-1 text-sm text-right font-mono disabled:bg-gray-50 disabled:text-gray-400" />
                        </td>
                      </tr>
                    )
                  })}
                  {vendorBills.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-500 text-sm">
                      {vendorId ? "No open bills for this vendor." : "Select a vendor above to populate open bills."}
                    </td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={3} className="px-3 py-2 text-right text-sm font-medium text-gray-600">Payment amount</td>
                    <td colSpan={2} className="px-3 py-2 text-right font-mono text-sm text-gray-700 tabular-nums">
                      {formatCurrency(amountNum)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-1 text-right text-sm font-medium text-gray-600">Allocated</td>
                    <td colSpan={2} className="px-3 py-1 text-right font-mono text-sm text-gray-700 tabular-nums">
                      {formatCurrency(totalAllocated)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="px-3 py-1 text-right text-sm font-medium text-gray-600">
                      {overAllocated ? "Over-allocated" : "Remaining (credit)"}
                    </td>
                    <td colSpan={2} className={`px-3 py-1 text-right font-mono text-sm tabular-nums ${overAllocated ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                      {formatCurrency(Math.abs(unallocated))}
                    </td>
                  </tr>
                </tfoot>
              </table>

          <div className="flex items-center gap-2">
            <Button loading={createPayment.isPending} disabled={overAllocated || totalAllocated === 0 || amountNum <= 0} onClick={handleCreate}>
              Record Payment
            </Button>
            {overAllocated && (
              <span className="text-xs text-red-600">
                Un-tick a bill or reduce allocated amounts — allocated total exceeds payment amount.
              </span>
            )}
          </div>
        </PageSection>
      )}

      <DataTable columns={columns} data={payments ?? []} loading={isLoading} error={fetchError} emptyMessage="No payments recorded yet." />
    </PageShell>
  )
}
