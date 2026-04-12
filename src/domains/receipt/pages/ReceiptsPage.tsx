import { useState } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, Combobox, InfoPanel } from "@/components/primitives"
import { DataTable } from "@/shared/components/DataTable"
import { useReceipts, useCreateReceipt, type ReceiptSummary } from "../hooks/useReceipts"
import { useCustomers } from "@/domains/contact/hooks/useContacts"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useInvoices } from "@/domains/receivable/hooks/useInvoices"
import { formatCurrency, formatDate } from "@/shared/lib/utils"

const columns = [
  { key: "reference", header: "Reference", className: "font-mono" },
  { key: "receipt_date", header: "Date", render: (row: ReceiptSummary) => row.receipt_date ? formatDate(row.receipt_date) : "-" },
  { key: "customer_name", header: "Customer" },
  { key: "amount", header: "Amount", className: "text-right font-mono", render: (row: ReceiptSummary) => formatCurrency(row.amount) },
  { key: "approved", header: "Status", className: "w-20",
    render: (row: ReceiptSummary) => (
      <span className={`text-xs px-2 py-0.5 rounded-full ${row.approved ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
        {row.approved ? "Posted" : "Draft"}
      </span>
    ),
  },
]

export function ReceiptsPage() {
  usePageHelp(pageHelpContent.receipts)
  usePagePolicies(["receipt"])
  const { data: receipts, isLoading, error: fetchError } = useReceipts()
  const { data: customers } = useCustomers()
  const { data: accounts } = useAccounts()
  const { data: invoices } = useInvoices()
  const createReceipt = useCreateReceipt()

  const nextReference = `REC-${String((receipts?.length ?? 0) + 1).padStart(4, "0")}`
  const [showForm, setShowForm] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [bankAccountId, setBankAccountId] = useState("")
  const [receiptDate, setReceiptDate] = useState("")
  const [reference, setReference] = useState("")
  const displayReference = reference || nextReference
  const [allocations, setAllocations] = useState<Record<number, string>>({})
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const bankAccounts = accounts?.filter(a => a.category === "A") ?? []

  // Filter invoices for selected customer.
  const customerInvoices = invoices?.filter(i => {
    if (!customerId) return false
    return i.approved && !i.on_hold
  }) ?? []

  const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)

  const handleCreate = async () => {
    setError(""); setSuccess("")
    if (!customerId || !bankAccountId || !receiptDate || !displayReference) {
      setError("Customer, bank account, date, and reference are required"); return
    }

    const allocs = Object.entries(allocations)
      .filter(([, amt]) => parseFloat(amt) > 0)
      .map(([transId, amt]) => ({ invoice_trans_id: parseInt(transId), amount: parseFloat(amt) }))

    if (allocs.length === 0) { setError("Allocate at least one amount"); return }

    try {
      await createReceipt.mutateAsync({
        bank_account_id: parseInt(bankAccountId),
        customer_id: parseInt(customerId),
        receipt_date: receiptDate,
        reference: displayReference,
        curr: "AUD",
        allocations: allocs,
      })
      setSuccess("Receipt created")
      setShowForm(false)
      setAllocations({})
      setReference("")
    } catch (err: any) { setError(err.message) }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Receipts</h1>
        <span className="text-sm text-gray-500">{receipts?.length ?? 0} payments received</span>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Receipt"}
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Recording receipts" storageKey="receipts-info">
        <p><strong>1. Select customer and invoice</strong> — choose who paid and which invoice the payment is for.</p>
        <p><strong>2. Enter payment details</strong> — amount received, date, bank account, and payment reference.</p>
        <p><strong>3. Post</strong> — the receipt creates journal entries crediting your accounts receivable and debiting your bank account.</p>
      </InfoPanel>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md">{success}</div>}

      {showForm && (
        <PageSection title="Receive Payment">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
              <Combobox
                options={customers?.map(c => ({ value: c.id, label: c.name })) ?? []}
                value={customerId || null}
                onChange={(v) => { setCustomerId(v ? String(v) : ""); setAllocations({}) }}
                placeholder="Search customers..."
              /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                <option value="">Select bank account...</option>
                {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>)}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">
              Reference
              <span className="ml-1 font-normal text-gray-400">auto-generated</span>
            </label>
              <input type="text" value={displayReference} onChange={e => setReference(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" /></div>
          </div>

          {customerId && (
            <>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Allocate to Invoices</h4>
              <table className="w-full border rounded-lg text-sm mb-4">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Invoice #</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600">Outstanding</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600 w-32">Allocate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {customerInvoices.map(inv => (
                    <tr key={inv.trans_id}>
                      <td className="px-3 py-2 font-mono">{inv.invnumber}</td>
                      <td className="px-3 py-2">{inv.transdate ? formatDate(inv.transdate) : "-"}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(inv.amount_bc)}</td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" min="0"
                          value={allocations[inv.trans_id] ?? ""}
                          onChange={e => setAllocations({ ...allocations, [inv.trans_id]: e.target.value })}
                          className="w-full border rounded px-2 py-1 text-sm text-right font-mono" placeholder="0.00" />
                      </td>
                    </tr>
                  ))}
                  {customerInvoices.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">No open invoices for this customer.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-500 text-white font-medium">
                    <td colSpan={3} className="px-3 py-2 text-right">Total Allocated</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(totalAllocated)}</td>
                  </tr>
                </tfoot>
              </table>
            </>
          )}

          <button onClick={handleCreate} disabled={createReceipt.isPending || totalAllocated === 0}
            className="px-4 py-1.5 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
            {createReceipt.isPending ? "Creating..." : "Create Receipt"}
          </button>
        </PageSection>
      )}

      <DataTable columns={columns} data={receipts ?? []} loading={isLoading} error={fetchError} emptyMessage="No receipts recorded yet." />
    </PageShell>
  )
}
