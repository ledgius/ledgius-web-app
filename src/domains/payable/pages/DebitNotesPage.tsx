import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Link } from "react-router-dom"
import { Button, InfoPanel, InlineAlert, Combobox } from "@/components/primitives"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useNotification, useFeedback } from "@/components/feedback"
import { useBills, useCreateDebitNote } from "../hooks/useBills"
import { useVendors } from "@/domains/contact/hooks/useContacts"
import { formatCurrency } from "@/shared/lib/utils"

export function DebitNotesPage() {
  usePageHelp(pageHelpContent.debitNotes)
  usePagePolicies(["payable", "tax"])
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/bills"), [navigate])
  useEscapeKey(handleCancel)
  const notify = useNotification()
  const feedback = useFeedback()
  const { data: vendors } = useVendors()
  const { data: bills } = useBills()
  const createDebitNote = useCreateDebitNote()

  const debitNotes = bills?.filter(b => parseFloat(b.amount_bc) < 0) ?? []
  const nextDebitNumber = `DN-${String((debitNotes?.length ?? 0) + 1).padStart(4, "0")}`
  const [vendorId, setVendorId] = useState("")
  const [billId, setBillId] = useState("")
  const [debitNumber, setDebitNumber] = useState("")
  const displayDebitNumber = debitNumber || nextDebitNumber
  const [debitDate, setDebitDate] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  const handleCreate = async () => {
    setError("")
    if (!vendorId || !billId || !displayDebitNumber || !debitDate || !amount || !reason) {
      setError("All fields are required"); return
    }
    try {
      await createDebitNote.mutateAsync({
        vendor_id: parseInt(vendorId), original_bill_id: parseInt(billId),
        debit_note_number: displayDebitNumber, debit_date: debitDate,
        amount: parseFloat(amount), reason, curr: "AUD",
      })
      notify.success("Debit note created")
      navigate("/bills")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create debit note"
      feedback.error("Debit note failed", message)
    }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Debit Notes</h1>
        <span className="text-sm text-gray-500">Issue debits against AP bills</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Adjustments reducing what you owe suppliers</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button loading={createDebitNote.isPending} onClick={handleCreate}>
          Create Debit Note
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="About Debit Notes" storageKey="debit-notes-info">
        <p>
          A <strong>Debit Note</strong> reduces the amount you owe a supplier — typically issued when you return goods,
          receive a refund, or agree a price adjustment on a previously entered <Link to="/bills" className="underline font-medium">bill</Link>.
        </p>
        <p className="mt-1.5">
          Pick the original bill, enter the adjustment amount (positive — the system records it as a credit against the
          bill), and give a short reason. The debit note reduces the bill's outstanding balance; if the debit exceeds
          the bill amount, the surplus remains as a vendor credit usable on future payments.
        </p>
        <p className="mt-1.5 text-blue-600">
          GST on the original bill is proportionally reversed — this affects the BAS period in which the debit note is dated.
        </p>
      </InfoPanel>
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}
      <PageSection title="Debit Note Details">
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
            <Combobox
              options={vendors?.map(v => ({ value: v.id, label: v.name })) ?? []}
              value={vendorId || null}
              onChange={(v) => setVendorId(v ? String(v) : "")}
              placeholder="Search vendors..."
            /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Original Bill</label>
            <Combobox
              options={bills?.map(b => ({ value: b.trans_id, label: b.invnumber, detail: formatCurrency(b.amount_bc) })) ?? []}
              value={billId || null}
              onChange={(v) => setBillId(v ? String(v) : "")}
              placeholder="Search bills..."
            /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">
              Debit Note #
              <span className="ml-1 font-normal text-gray-400">auto-generated</span>
            </label>
              <input type="text" value={displayDebitNumber} onChange={e => setDebitNumber(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={debitDate} onChange={e => setDebitDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="0.00" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
        </div>
      </PageSection>
    </PageShell>
  )
}
