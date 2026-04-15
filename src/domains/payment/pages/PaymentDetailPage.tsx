// Spec references: R-0040, R-0049 (use case), R-0054 (Ledgius-shape pattern).
//
// Payment detail page — displays header, GL lines, bill allocations,
// and a vendor-attribution panel that lets the user attach a vendor
// to a previously-unattributed payment via the payment_vendor_link
// override table.

import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Badge, Button, Combobox, InlineAlert, Skeleton } from "@/components/primitives"
import { PageShell, PageSection } from "@/components/layout"
import { formatCurrency, formatDate } from "@/shared/lib/utils"
import { useVendors } from "@/domains/contact/hooks/useContacts"
import { usePayment, useAttachVendor } from "../hooks/usePayments"

export function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const transId = parseInt(id ?? "0", 10)
  const { data: payment, isLoading, error, refetch } = usePayment(transId)

  if (isLoading) {
    return (
      <PageShell header={<h1 className="text-xl font-semibold">Payment</h1>}>
        <Skeleton className="h-64 w-full" />
      </PageShell>
    )
  }
  if (error || !payment) {
    return (
      <PageShell header={<h1 className="text-xl font-semibold">Payment</h1>}>
        <InlineAlert variant="error">
          {error ? (error as Error).message : "Payment not found"}
        </InlineAlert>
      </PageShell>
    )
  }

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-gray-900 font-mono">{payment.reference}</h1>
          <Badge variant={payment.approved ? "success" : "warning"}>
            {payment.approved ? "Posted" : "Draft"}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {payment.payment_date ? formatDate(payment.payment_date) : "—"} ·{" "}
          {formatCurrency(parseFloat(payment.amount))} {payment.curr}
        </p>
      </div>
      <Link
        to="/payments"
        className="text-sm text-primary-600 hover:text-primary-700"
      >
        ← Back to payments
      </Link>
    </div>
  )

  return (
    <PageShell header={header}>
      <div className="space-y-4 max-w-4xl">
        <VendorPanel payment={payment} onChanged={() => refetch()} />
        <GLLinesSection payment={payment} />
        {payment.allocations && payment.allocations.length > 0 && (
          <AllocationsSection payment={payment} />
        )}
        {payment.description && (
          <PageSection title="Description">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{payment.description}</p>
          </PageSection>
        )}
      </div>
    </PageShell>
  )
}

function VendorPanel({
  payment,
  onChanged,
}: {
  payment: import("../hooks/usePayments").PaymentDetail
  onChanged: () => void
}) {
  const { data: vendors, isLoading: vendorsLoading } = useVendors()
  const attach = useAttachVendor(payment.trans_id)
  const [selected, setSelected] = useState("")
  const [notes, setNotes] = useState("")

  if (payment.vendor_source) {
    return (
      <PageSection title="Vendor">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-gray-900">{payment.vendor_name}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Vendor ID: {payment.vendor_id ?? "—"}
            </div>
          </div>
          <SourceBadge source={payment.vendor_source} />
        </div>
      </PageSection>
    )
  }

  // No vendor attributed — show the attach form.
  const handleAttach = async () => {
    const vendorId = parseInt(selected, 10)
    if (!vendorId) return
    try {
      await attach.mutateAsync({ vendor_id: vendorId, notes: notes || undefined })
      setSelected("")
      setNotes("")
      onChanged()
    } catch (e) {
      // attach.error renders below
    }
  }

  const options =
    vendors?.map(v => ({ value: v.id, label: v.name, detail: v.meta_number ?? "" })) ?? []

  return (
    <PageSection title="Vendor">
      <InlineAlert variant="warning" className="mb-3">
        This payment is not attributed to a vendor. Attach one below to make it
        appear correctly in vendor reports and the payments list. The general-
        ledger postings are not affected — this is a metadata-only enrichment.
      </InlineAlert>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Vendor</label>
          {vendorsLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : !vendors || vendors.length === 0 ? (
            <div className="text-sm text-gray-500 border rounded px-2 py-1.5 bg-gray-50">
              No vendors yet — <Link to="/vendors" className="text-primary-600 hover:underline">add one</Link> first.
            </div>
          ) : (
            <Combobox
              options={options}
              value={selected}
              onChange={v => setSelected(v == null ? "" : String(v))}
              placeholder="Search vendors..."
            />
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Imported from MYOB pre-cutover"
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button onClick={handleAttach} disabled={!selected || attach.isPending}>
          {attach.isPending ? "Attaching..." : "Attach vendor"}
        </Button>
        {attach.error && (
          <span className="text-sm text-red-700">
            {(attach.error as Error).message}
          </span>
        )}
      </div>
    </PageSection>
  )
}

function GLLinesSection({ payment }: { payment: import("../hooks/usePayments").PaymentDetail }) {
  return (
    <PageSection title="General Ledger postings">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Account</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {payment.gl_lines.map(line => (
            <tr key={line.acc_trans_id}>
              <td className="px-3 py-1.5 font-mono">{line.account_no}</td>
              <td className="px-3 py-1.5">{line.account_name}</td>
              <td
                className={`px-3 py-1.5 text-right font-mono tabular-nums ${parseFloat(line.amount_bc) < 0 ? "text-red-700" : "text-gray-900"}`}
              >
                {formatCurrency(parseFloat(line.amount_bc))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageSection>
  )
}

function AllocationsSection({ payment }: { payment: import("../hooks/usePayments").PaymentDetail }) {
  return (
    <PageSection title="Allocated to bills">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Bill ref</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Bill date</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {payment.allocations.map(a => (
            <tr key={a.bill_trans_id}>
              <td className="px-3 py-1.5 font-mono">{a.bill_ref}</td>
              <td className="px-3 py-1.5">{a.bill_date ? formatDate(a.bill_date) : "—"}</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                {formatCurrency(parseFloat(a.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageSection>
  )
}

function SourceBadge({ source }: { source: "lsmb" | "override" | "" | undefined }) {
  if (source === "lsmb") {
    return (
      <Badge variant="success" title="Vendor derived from bill allocations (LSMB-canonical)">
        attributed via bill allocation
      </Badge>
    )
  }
  if (source === "override") {
    return (
      <Badge variant="info" title="Vendor attributed manually via payment_vendor_link">
        manually attributed
      </Badge>
    )
  }
  return null
}
