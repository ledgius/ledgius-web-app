import { useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection, TotalsCard } from "@/components/layout"
import { EntityHeader, AuditTimeline } from "@/components/workflow"
import { MoneyValue, StatusStepper, lifecycleSteps } from "@/components/financial"
import { Button, InlineAlert, Skeleton, Combobox } from "@/components/primitives"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { useNotification, useFeedback } from "@/components/feedback"
import { useInvoiceDetail, useCreateCreditNote, useUpdateDraftInvoice } from "../hooks/useInvoices"
import { useCustomers } from "@/domains/contact/hooks/useContacts"
import { useEntityActivity } from "@/hooks/useEntityActivity"
import { api } from "@/shared/lib/api"
import { useQueryClient } from "@tanstack/react-query"
import { formatCurrency } from "@/shared/lib/utils"
import { FileDown, Plus, Trash2 } from "lucide-react"

interface InvoiceLine {
  id: number
  trans_id: number
  description: string | null
  qty: string
  sellprice: string
}

export function InvoiceDetailPage() {
  usePageHelp(pageHelpContent.invoiceDetail)
  usePagePolicies(["receivable", "tax"])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const notify = useNotification()
  const feedback = useFeedback()
  const transId = parseInt(id ?? "0")
  const qc = useQueryClient()
  const { data, isLoading, error } = useInvoiceDetail(transId)
  const { data: activity, isLoading: activityLoading } = useEntityActivity("invoices", transId)
  const { data: customers } = useCustomers()

  // Credit note form state
  const [showCreditForm, setShowCreditForm] = useState(false)
  const [creditNumber, setCreditNumber] = useState("")
  const [creditAmount, setCreditAmount] = useState("")
  const [creditReason, setCreditReason] = useState("")
  const [creditDate, setCreditDate] = useState("")
  const [formError, setFormError] = useState("")

  // Draft editing state
  const [editedNotes, setEditedNotes] = useState<string | null>(null)
  const [editedLines, setEditedLines] = useState<InvoiceLine[] | null>(null)
  const [editedCustomerId, setEditedCustomerId] = useState<number | null>(null)

  const createCreditNote = useCreateCreditNote()
  const updateInvoice = useUpdateDraftInvoice()

  // Derived state (safe to compute before early returns)
  const invoice = data?.invoice
  const lines = data?.lines ?? []
  const customerName = data?.customer_name ?? ""
  const invoiceStatus = !invoice ? "draft"
    : invoice.is_return ? "voided"
    : !invoice.approved ? "draft"
    : "sent"
  const isDraft = invoiceStatus === "draft"
  const workingLines = editedLines ?? lines
  const workingNotes = editedNotes ?? (invoice?.notes || "")
  const isDirty = editedNotes !== null || editedLines !== null || editedCustomerId !== null

  const customerOptions = (customers ?? []).map((c) => ({
    value: c.id,
    label: c.name,
    detail: c.meta_number,
  }))

  const handleCustomerChange = (newCustomerId: string | number | null) => {
    setEditedCustomerId(newCustomerId ? Number(newCustomerId) : null)
  }

  const netAmount = workingLines.reduce((sum, l) => {
    return sum + (parseFloat(l.qty) || 0) * (parseFloat(l.sellprice) || 0)
  }, 0)
  const gstAmount = netAmount * 0.10
  const totalAmount = netAmount + gstAmount

  // Line item columns — must be before early returns (hooks rules)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineColumns: Column<InvoiceLine>[] = useMemo((): any[] => [
    {
      key: "description",
      header: "Description",
      render: (row: InvoiceLine, _: unknown, rowIndex: number) =>
        isDraft ? (
          <input
            type="text"
            value={row.description ?? ""}
            onChange={(e) => updateLine(rowIndex, "description", e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm bg-white"
          />
        ) : (
          <span>{row.description}</span>
        ),
    },
    {
      key: "qty",
      header: "Qty",
      className: "text-right w-24",
      render: (row: InvoiceLine, _: unknown, rowIndex: number) =>
        isDraft ? (
          <input
            type="number"
            value={row.qty}
            onChange={(e) => updateLine(rowIndex, "qty", e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm text-right bg-white"
            min="1"
          />
        ) : (
          <span className="tabular-nums">{parseFloat(row.qty) || 0}</span>
        ),
    },
    {
      key: "sellprice",
      header: "Unit Price",
      className: "text-right w-32",
      render: (row: InvoiceLine, _: unknown, rowIndex: number) =>
        isDraft ? (
          <input
            type="number"
            step="0.01"
            value={row.sellprice}
            onChange={(e) => updateLine(rowIndex, "sellprice", e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm text-right font-mono bg-white"
            placeholder="0.00"
          />
        ) : (
          <MoneyValue amount={row.sellprice} size="sm" />
        ),
    },
    {
      key: "total",
      header: "Total",
      className: "text-right w-32",
      render: (row: InvoiceLine) => (
        <span className="tabular-nums bg-gray-100 text-gray-500 px-2 py-1 rounded inline-block">
          {formatCurrency((parseFloat(row.qty) || 0) * (parseFloat(row.sellprice) || 0))}
        </span>
      ),
    },
    ...(isDraft ? [{
      key: "actions" as const,
      header: "",
      className: "w-10",
      render: (_row: InvoiceLine, _: unknown, rowIndex: number) =>
        workingLines.length > 1 ? (
          <button
            type="button"
            onClick={() => removeLine(rowIndex)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        ) : null,
    }] : []),
  ], [isDraft, workingLines.length])

  // Early returns AFTER all hooks
  if (isLoading) return <Skeleton variant="table" rows={6} columns={4} className="mt-8" />
  if (error || !data || !invoice) {
    return (
      <PageShell>
        <InlineAlert variant="error">Invoice not found.</InlineAlert>
      </PageShell>
    )
  }

  const updateLine = (index: number, field: keyof InvoiceLine, value: string) => {
    const updated = [...workingLines]
    updated[index] = { ...updated[index], [field]: value }
    setEditedLines(updated)
  }

  const addLine = () => {
    setEditedLines([...workingLines, {
      id: 0,
      trans_id: transId,
      description: "",
      qty: "1",
      sellprice: "",
    }])
  }

  const removeLine = (index: number) => {
    setEditedLines(workingLines.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    try {
      // Save customer change if modified
      if (editedCustomerId !== null) {
        await api.patch(`/invoices/${transId}/customer`, { customer_id: editedCustomerId })
      }
      // Save lines/notes if modified
      if (editedLines !== null || editedNotes !== null) {
        await updateInvoice.mutateAsync({
          id: transId,
          data: {
            notes: workingNotes || undefined,
            lines: workingLines.map((l) => ({
              description: l.description ?? "",
              qty: parseFloat(l.qty) || 1,
              sellprice: parseFloat(l.sellprice) || 0,
              account_id: 47, // TODO: expose account selection on line items
              tax_account_id: 26, // GST Collected — TODO: expose tax code selection
            })),
          },
        })
      }
      qc.invalidateQueries({ queryKey: ["invoices", transId] })
      feedback.success("Invoice saved")
      setEditedLines(null)
      setEditedNotes(null)
      setEditedCustomerId(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save invoice"
      feedback.error("Save failed", message)
    }
  }

  const handleCreditNote = async () => {
    setFormError("")
    const amount = parseFloat(creditAmount)
    if (!creditNumber || !creditDate || !amount || !creditReason) {
      setFormError("All fields are required")
      return
    }
    try {
      await createCreditNote.mutateAsync({
        customer_id: invoice.entity_credit_account,
        original_invoice_id: transId,
        credit_note_number: creditNumber,
        credit_date: creditDate + "T00:00:00Z",
        amount,
        reason: creditReason,
        curr: invoice.curr ?? "AUD",
      })
      notify.success("Credit note created successfully")
      setShowCreditForm(false)
      navigate("/invoices")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create credit note"
      setFormError(message)
    }
  }

  const header = (
    <div>
      <EntityHeader
        title={`Invoice ${invoice.invnumber ?? transId}`}
        subtitle={(() => {
          if (invoice.is_return) return "Credit Note"
          const displayName = editedCustomerId
            ? customerOptions.find((c) => c.value === editedCustomerId)?.label ?? customerName
            : customerName
          return displayName ? `${displayName} · Accounts Receivable` : "Accounts Receivable"
        })()}
        status={invoiceStatus}
        reference={`#${transId}`}
        date={invoice.duedate ?? undefined}
        dateLabel="Due"
        backTo="/invoices"
        actions={
          <>
            <Button variant="secondary" size="sm">
              <a href={`/api/v1/invoices/${transId}/pdf`} target="_blank" rel="noopener noreferrer">
                <FileDown className="h-4 w-4" />
                PDF
              </a>
            </Button>
            {!invoice.is_return && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowCreditForm(!showCreditForm)}
              >
                {showCreditForm ? "Cancel" : "Issue Credit Note"}
              </Button>
            )}
          </>
        }
      />
      {!invoice.is_return && (
        <StatusStepper
          steps={[...lifecycleSteps.invoice]}
          currentStatus={invoiceStatus}
          className="mt-4 max-w-xl"
        />
      )}
      {isDraft && (
        <div className="flex items-center gap-2 mt-4">
          <Button disabled={!isDirty} onClick={handleSave}>Save Changes</Button>
          <Button variant="secondary" disabled={!isDirty} onClick={() => { setEditedLines(null); setEditedNotes(null); setEditedCustomerId(null) }}>
            Discard Changes
          </Button>
        </div>
      )}
    </div>
  )

  const aside = (
    <>
      <TotalsCard
        title="Invoice Totals"
        rows={[
          { label: "Net Amount", value: <MoneyValue amount={netAmount} /> },
          { label: "GST", value: <MoneyValue amount={gstAmount} /> },
          { label: "Total (inc GST)", value: <MoneyValue amount={totalAmount} size="lg" />, emphasis: "strong", divider: true },
        ]}
      />
      <PageSection title="Details" variant="card">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500 text-right">Currency</dt>
          <dd className="font-medium">{invoice.curr}</dd>
        </dl>
      </PageSection>
    </>
  )

  const activityPanel = (
    <PageSection title="Activity" variant="card">
      <AuditTimeline events={activity ?? []} loading={activityLoading} />
    </PageSection>
  )

  // No footer — Save/Discard buttons are in the header area for draft invoices

  return (
    <PageShell header={header} aside={aside} activity={activityPanel}>
      {/* Customer */}
      <PageSection title="Customer">
        {isDraft ? (
          <Combobox
            options={customerOptions}
            value={editedCustomerId ?? invoice?.entity_credit_account ?? null}
            onChange={handleCustomerChange}
            placeholder="Search customers..."
          />
        ) : (
          <p className="text-sm text-gray-900">{customerName || "Unknown customer"}</p>
        )}
      </PageSection>

      {/* Invoice description / notes — above line items */}
      <PageSection title="Description">
        {isDraft ? (
          <textarea
            value={workingNotes}
            onChange={(e) => setEditedNotes(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm bg-white resize-none"
            rows={2}
            placeholder="Invoice description or notes..."
          />
        ) : (
          <p className="text-sm text-gray-600">{invoice.notes || <span className="text-gray-400">No description</span>}</p>
        )}
      </PageSection>

      {/* Line items */}
      <PageSection
        title="Line Items"
        actions={isDraft ? (
          <Button variant="muted" size="sm" onClick={addLine}>
            <Plus className="h-3.5 w-3.5" />
            Add Line
          </Button>
        ) : undefined}
      >
        <DataTable columns={lineColumns} data={workingLines} emptyMessage="No line items" />
      </PageSection>

      {/* Credit note form (posted invoices only) */}
      {showCreditForm && (
        <PageSection title="Issue Credit Note">
          {formError && <InlineAlert variant="error" className="mb-4">{formError}</InlineAlert>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Credit Note #</label>
              <input type="text" value={creditNumber} onChange={(e) => setCreditNumber(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="CN-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={creditDate} onChange={(e) => setCreditDate(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <input type="number" step="0.01" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
              <input type="text" value={creditReason} onChange={(e) => setCreditReason(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Reason for credit" />
            </div>
          </div>
          <Button loading={createCreditNote.isPending} onClick={handleCreditNote}>
            Create Credit Note
          </Button>
        </PageSection>
      )}
    </PageShell>
  )
}
