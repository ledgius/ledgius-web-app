import { useState, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert, Combobox } from "@/components/primitives"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useNotification, useFeedback } from "@/components/feedback"
import { useInvoices, useCreateCreditNote, type InvoiceSummary } from "../hooks/useInvoices"
import { useCustomers } from "@/domains/contact/hooks/useContacts"
import { formatCurrency, formatDate } from "@/shared/lib/utils"

type PeriodFilter = "all" | "month" | "quarter" | "year"
type SortOrder = "newest" | "oldest" | "largest"

function isInPeriod(dateStr: string | null, period: PeriodFilter): boolean {
  if (!dateStr || period === "all") return true
  const date = new Date(dateStr)
  const now = new Date()
  if (period === "month") {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }
  if (period === "quarter") {
    const qNow = Math.floor(now.getMonth() / 3)
    const qDate = Math.floor(date.getMonth() / 3)
    return qDate === qNow && date.getFullYear() === now.getFullYear()
  }
  if (period === "year") {
    return date.getFullYear() === now.getFullYear()
  }
  return true
}

function sortInvoices(invoices: InvoiceSummary[], order: SortOrder): InvoiceSummary[] {
  return [...invoices].sort((a, b) => {
    if (order === "largest") return parseFloat(b.amount_bc) - parseFloat(a.amount_bc)
    const da = a.transdate ? new Date(a.transdate).getTime() : 0
    const db = b.transdate ? new Date(b.transdate).getTime() : 0
    return order === "newest" ? db - da : da - db
  })
}

export function CreditNotesPage() {
  usePageHelp(pageHelpContent.creditNotes)
  usePagePolicies(["receivable", "tax"])
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/credit-notes"), [navigate])
  useEscapeKey(handleCancel)
  const notify = useNotification()
  const feedback = useFeedback()
  const { data: customers } = useCustomers()
  const { data: invoices } = useInvoices()
  const createCreditNote = useCreateCreditNote()

  const [customerId, setCustomerId] = useState("")
  const [invoiceId, setInvoiceId] = useState("")
  const [creditDate, setCreditDate] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")

  // Auto-generate credit note number from existing count
  const existingCreditNotes = (invoices ?? []).filter((i) => parseFloat(i.amount_bc) < 0)
  const nextNumber = `CN-${String(existingCreditNotes.length + 1).padStart(4, "0")}`
  const [creditNumber, setCreditNumber] = useState("")
  const displayNumber = creditNumber || nextNumber

  // Selected invoice details for validation
  const selectedInvoice = invoices?.find((i) => String(i.trans_id) === invoiceId)
  const maxAmount = selectedInvoice ? parseFloat(selectedInvoice.amount_bc) : 0
  const enteredAmount = parseFloat(amount) || 0
  const exceedsMax = enteredAmount > 0 && maxAmount > 0 && enteredAmount > maxAmount

  // Invoice filters
  const [showPaid, setShowPaid] = useState(false)
  const [period, setPeriod] = useState<PeriodFilter>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest")

  const filteredInvoices = useMemo(() => {
    let result = invoices ?? []
    // Filter by selected customer if one is chosen
    if (customerId) {
      result = result.filter((i) => i.customer_name) // all invoices if no customer filter on API
    }
    // Filter by paid status
    if (!showPaid) {
      result = result.filter((i) => i.approved) // show only posted/active
    }
    // Filter by period
    result = result.filter((i) => isInPeriod(i.transdate, period))
    // Sort
    result = sortInvoices(result, sortOrder)
    return result
  }, [invoices, customerId, showPaid, period, sortOrder])

  const invoiceOptions = filteredInvoices.map((i) => ({
    value: i.trans_id,
    label: i.invnumber,
    detail: `${i.transdate ? formatDate(i.transdate) : "—"} · ${formatCurrency(i.amount_bc)} · ${i.customer_name}`,
  }))

  const handleCreate = async () => {
    setError("")
    if (!customerId || !invoiceId || !displayNumber || !creditDate || !amount || !reason) {
      setError("All fields are required"); return
    }
    if (exceedsMax) {
      setError(`Credit amount cannot exceed the invoice amount of ${formatCurrency(maxAmount)}`); return
    }
    try {
      await createCreditNote.mutateAsync({
        customer_id: parseInt(customerId), original_invoice_id: parseInt(invoiceId),
        credit_note_number: displayNumber, credit_date: creditDate,
        amount: parseFloat(amount), reason, curr: "AUD",
      })
      notify.success("Credit note created")
      navigate("/credit-notes")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create credit note"
      feedback.error("Credit note failed", message)
    }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Credit Notes</h1>
        <span className="text-sm text-gray-500">Issue credits against AR invoices</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Issue a credit adjustment for a customer</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button loading={createCreditNote.isPending} onClick={handleCreate}>
          Create Credit Note
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}
      <PageSection title="Credit Note Details">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Customer</label>
            <Combobox
              options={customers?.map((c) => ({ value: c.id, label: c.name, detail: c.meta_number })) ?? []}
              value={customerId || null}
              onChange={(v) => setCustomerId(v ? String(v) : "")}
              placeholder="Search customers..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Original Invoice</label>
            <div className="flex items-center gap-4">
              <div className="w-64">
                <Combobox
                  options={invoiceOptions}
                  value={invoiceId || null}
                  onChange={(v) => setInvoiceId(v ? String(v) : "")}
                  placeholder="Search invoices..."
                />
              </div>
              {selectedInvoice && (
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-gray-400 text-xs">Date</span>
                    <p className="font-medium">{selectedInvoice.transdate ? formatDate(selectedInvoice.transdate) : "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Status</span>
                    <p className="font-medium">{selectedInvoice.approved ? (selectedInvoice.on_hold ? "On Hold" : "Posted") : "Draft"}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Amount</span>
                    <p className="font-medium tabular-nums">{formatCurrency(selectedInvoice.amount_bc)}</p>
                  </div>
                  <div>
                    <span className="text-gray-400 text-xs">Customer</span>
                    <p className="font-medium">{selectedInvoice.customer_name}</p>
                  </div>
                </div>
              )}
            </div>
            {/* Filter chips */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <FilterChip active={showPaid} onClick={() => setShowPaid(!showPaid)}>
                Paid
              </FilterChip>
              <span className="text-gray-300">|</span>
              <FilterChip active={period === "month"} onClick={() => setPeriod(period === "month" ? "all" : "month")}>
                This Month
              </FilterChip>
              <FilterChip active={period === "quarter"} onClick={() => setPeriod(period === "quarter" ? "all" : "quarter")}>
                This Quarter
              </FilterChip>
              <FilterChip active={period === "year"} onClick={() => setPeriod(period === "year" ? "all" : "year")}>
                This Year
              </FilterChip>
              <span className="text-gray-300">|</span>
              <FilterChip active={sortOrder === "newest"} onClick={() => setSortOrder("newest")}>
                Newest
              </FilterChip>
              <FilterChip active={sortOrder === "oldest"} onClick={() => setSortOrder("oldest")}>
                Oldest
              </FilterChip>
              <FilterChip active={sortOrder === "largest"} onClick={() => setSortOrder("largest")}>
                Largest
              </FilterChip>
              <span className="ml-1 text-xs text-gray-400">{filteredInvoices.length} invoices</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Credit Note #
                <span className="ml-1 font-normal text-gray-400">auto-generated</span>
              </label>
              <input type="text" value={displayNumber} onChange={(e) => setCreditNumber(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input type="date" value={creditDate} onChange={(e) => setCreditDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Amount
                {selectedInvoice && (
                  <span className="ml-2 font-normal text-gray-400">max {formatCurrency(maxAmount)}</span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full border rounded px-2 py-1.5 text-sm font-mono ${exceedsMax ? "border-red-400 bg-red-50 text-red-700" : ""}`}
                placeholder="0.00"
                max={maxAmount || undefined}
              />
              {exceedsMax && (
                <p className="text-xs text-red-600 mt-1">Exceeds invoice amount of {formatCurrency(maxAmount)}</p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Reason for credit" />
          </div>
        </div>
      </PageSection>
    </PageShell>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
        active
          ? "bg-primary-50 border-primary-300 text-primary-700 font-medium"
          : "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
      }`}
    >
      {active && <span className="mr-1">✓</span>}
      {children}
    </button>
  )
}
