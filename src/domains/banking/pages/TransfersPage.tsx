import { useState, useMemo } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { api } from "@/shared/lib/api"
import { formatCurrency } from "@/shared/lib/utils"

export function TransfersPage() {
  usePageHelp(pageHelpContent.transfers)
  usePagePolicies(["banking"])
  const { data: accounts } = useAccounts()
  const bankAccounts = accounts?.filter(a => a.category === "A") ?? []

  const nextReference = useMemo(() => `XFER-${String(Date.now()).slice(-6)}`, [])
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [amount, setAmount] = useState("")
  const [transferDate, setTransferDate] = useState("")
  const [reference, setReference] = useState("")
  const displayReference = reference || nextReference
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleTransfer = async () => {
    setError(""); setSuccess("")
    if (!fromId || !toId || !amount || !transferDate || !displayReference) {
      setError("All fields are required"); return
    }
    if (fromId === toId) { setError("Source and destination must be different"); return }
    setSubmitting(true)
    try {
      await api.post("/bank-transfer", {
        from_account_id: parseInt(fromId), to_account_id: parseInt(toId),
        amount: parseFloat(amount), transfer_date: transferDate, reference: displayReference, curr: "AUD",
      })
      setSuccess(`Transfer of ${formatCurrency(parseFloat(amount))} completed`)
      setAmount(""); setReference("")
    } catch (err: any) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Bank Transfers</h1>
      <p className="mt-0.5 text-sm text-gray-500">Move money between your bank accounts</p>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
      {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md">{success}</div>}
      <PageSection title="Transfer Details">
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">From Account</label>
            <select value={fromId} onChange={e => setFromId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="">Select source...</option>
              {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>)}
            </select></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">To Account</label>
            <select value={toId} onChange={e => setToId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="">Select destination...</option>
              {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="0.00" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">
            Reference
            <span className="ml-1 font-normal text-gray-400">auto-generated</span>
          </label>
            <input type="text" value={displayReference} onChange={e => setReference(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" /></div>
          <button onClick={handleTransfer} disabled={submitting}
            className="px-4 py-1.5 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
            {submitting ? "Transferring..." : "Transfer"}</button>
        </div>
      </PageSection>
    </PageShell>
  )
}
