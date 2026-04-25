import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection, TotalsCard } from "@/components/layout"
import { EntityHeader, AuditTimeline } from "@/components/workflow"
import { MoneyValue, StatusStepper, lifecycleSteps } from "@/components/financial"
import { Button, InlineAlert, Skeleton, Combobox } from "@/components/primitives"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { useNotification, useFeedback } from "@/components/feedback"
import { useBillDetail, useCreateDebitNote } from "../hooks/useBills"
import { useVendors } from "@/domains/contact/hooks/useContacts"
import { useEntityActivity } from "@/hooks/useEntityActivity"
import { api } from "@/shared/lib/api"
import { useQueryClient } from "@tanstack/react-query"

interface BillLine {
  id: number
  trans_id: number
  description: string | null
  qty: string
  sellprice: string
}

const lineColumns: Column<BillLine>[] = [
  { key: "description", header: "Description" },
  {
    key: "qty",
    header: "Qty",
    className: "text-right w-20",
    render: (row: BillLine) => <span className="tabular-nums">{parseFloat(row.qty) || 0}</span>,
  },
  {
    key: "sellprice",
    header: "Unit Price",
    className: "text-right w-32",
    render: (row: BillLine) => <MoneyValue amount={row.sellprice} size="sm" />,
  },
  {
    key: "total",
    header: "Total",
    className: "text-right w-32",
    render: (row: BillLine) => (
      <MoneyValue amount={(parseFloat(row.qty) || 0) * (parseFloat(row.sellprice) || 0)} size="sm" />
    ),
  },
]

export function BillDetailPage() {
  usePagePolicies(["payable", "account", "tax"])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const notify = useNotification()
  const feedback = useFeedback()
  const qc = useQueryClient()
  const transId = parseInt(id ?? "0")
  const { data, isLoading, error } = useBillDetail(transId)
  const { data: activity, isLoading: activityLoading } = useEntityActivity("bills", transId)
  const { data: vendors } = useVendors()

  // Draft editing state
  const [editedVendorId, setEditedVendorId] = useState<number | null>(null)

  const [showDebitForm, setShowDebitForm] = useState(false)
  const [debitNumber, setDebitNumber] = useState("")
  const [debitAmount, setDebitAmount] = useState("")
  const [debitReason, setDebitReason] = useState("")
  const [debitDate, setDebitDate] = useState("")
  const [formError, setFormError] = useState("")

  const createDebitNote = useCreateDebitNote()

  if (isLoading) return <Skeleton variant="table" rows={6} columns={4} className="mt-8" />
  if (error || !data) {
    return (
      <PageShell>
        <InlineAlert variant="error">Bill not found.</InlineAlert>
      </PageShell>
    )
  }

  const { bill, lines, vendor_name } = data
  const netAmount = parseFloat(bill.netamount_bc) || 0
  const totalAmount = parseFloat(bill.amount_bc) || 0
  const gstAmount = totalAmount - netAmount

  const handleDebitNote = async () => {
    setFormError("")
    const amount = parseFloat(debitAmount)
    if (!debitNumber || !debitDate || !amount || !debitReason) {
      setFormError("All fields are required")
      return
    }
    try {
      await createDebitNote.mutateAsync({
        vendor_id: bill.entity_credit_account,
        original_bill_id: transId,
        debit_note_number: debitNumber,
        debit_date: debitDate,
        amount,
        reason: debitReason,
        curr: bill.curr ?? "AUD",
      })
      notify.success("Debit note created successfully")
      setShowDebitForm(false)
      navigate("/bills")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create debit note"
      setFormError(message)
    }
  }

  const billStatus = bill.is_return ? "voided"
    : !bill.approved ? "draft"
    : "scheduled"

  const isDraft = billStatus === "draft"

  const vendorOptions = (vendors ?? []).map((v) => ({
    value: v.id,
    label: v.name,
    detail: v.meta_number,
  }))

  const isDirty = editedVendorId !== null

  const handleSave = async () => {
    try {
      if (editedVendorId !== null) {
        await api.patch(`/bills/${transId}/vendor`, { vendor_id: editedVendorId })
      }
      qc.invalidateQueries({ queryKey: ["bills", transId] })
      feedback.success("Bill saved")
      setEditedVendorId(null)
    } catch (err: unknown) {
      feedback.error("Save failed", err instanceof Error ? err.message : "")
    }
  }

  const header = (
    <div>
      <EntityHeader
        title={`Bill ${bill.invnumber ?? transId}`}
        subtitle={(() => {
          const displayName = editedVendorId
            ? vendorOptions.find((v) => v.value === editedVendorId)?.label ?? vendor_name
            : vendor_name
          return displayName ? `${displayName} · Accounts Payable` : "Accounts Payable"
        })()}
        status={billStatus}
        reference={`#${transId}`}
        date={bill.duedate ?? undefined}
        dateLabel="Due"
        backTo="/bills"
        actions={
          !bill.is_return ? (
            <Button variant="secondary" size="sm" onClick={() => setShowDebitForm(!showDebitForm)}>
              {showDebitForm ? "Cancel" : "Issue Debit Note"}
            </Button>
          ) : undefined
        }
      />
      {!bill.is_return && (
        <StatusStepper
          steps={[...lifecycleSteps.bill]}
          currentStatus={billStatus}
          className="mt-4 max-w-xl"
        />
      )}
      {isDraft && (
        <div className="flex items-center gap-2 mt-4">
          <Button disabled={!isDirty} onClick={handleSave}>Save Changes</Button>
          <Button variant="secondary" disabled={!isDirty} onClick={() => setEditedVendorId(null)}>
            Discard Changes
          </Button>
        </div>
      )}
    </div>
  )

  const aside = (
    <>
      <TotalsCard
        title="Bill Totals"
        rows={[
          { label: "Net Amount", value: <MoneyValue amount={netAmount} /> },
          { label: "GST", value: <MoneyValue amount={gstAmount} /> },
          { label: "Total (inc GST)", value: <MoneyValue amount={totalAmount} size="lg" />, emphasis: "strong", divider: true },
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
      <PageSection title="Vendor">
        {isDraft ? (
          <Combobox
            options={vendorOptions}
            value={editedVendorId ?? bill.entity_credit_account}
            onChange={(v) => setEditedVendorId(v ? Number(v) : null)}
            placeholder="Search vendors..."
          />
        ) : (
          <p className="text-sm text-gray-900">{vendor_name || "Unknown vendor"}</p>
        )}
      </PageSection>

      <PageSection title="Line Items">
        <DataTable columns={lineColumns} data={lines} emptyMessage="No line items" />
      </PageSection>

      {showDebitForm && (
        <PageSection title="Issue Debit Note">
          {formError && <InlineAlert variant="error" className="mb-4">{formError}</InlineAlert>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Debit Note #</label>
              <input type="text" value={debitNumber} onChange={(e) => setDebitNumber(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="DN-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={debitDate} onChange={(e) => setDebitDate(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input type="number" step="0.01" value={debitAmount} onChange={(e) => setDebitAmount(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
              <input type="text" value={debitReason} onChange={(e) => setDebitReason(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Reason for debit" />
            </div>
          </div>
          <Button loading={createDebitNote.isPending} onClick={handleDebitNote}>
            Create Debit Note
          </Button>
        </PageSection>
      )}
    </PageShell>
  )
}
