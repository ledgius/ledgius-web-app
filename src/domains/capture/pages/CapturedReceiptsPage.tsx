import { BackLink } from "@/components/primitives"
import { useState } from "react"
import { Link } from "react-router-dom"
import { PageShell } from "@/components/layout"
import { InfoPanel } from "@/components/primitives"
import { SearchFilter } from "@/shared/components/SearchFilter"
import { DataTable } from "@/shared/components/DataTable"
import { useCaptures, useDeleteCapture, useUpdateCapture, type CapturedReceipt } from "../hooks/useCaptures"
import { formatCurrency } from "@/shared/lib/utils"
import { Camera, Trash2, Pencil, X, Check } from "lucide-react"

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  uploaded: { label: "Uploaded", className: "bg-amber-100 text-amber-700" },
  processing: { label: "Scanning", className: "bg-blue-100 text-blue-700" },
  ready: { label: "Ready", className: "bg-green-100 text-green-700" },
  matched: { label: "Matched", className: "bg-purple-100 text-purple-700" },
  archived: { label: "Archived", className: "bg-gray-100 text-gray-500" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.uploaded
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function CapturedReceiptsPage() {
  const { data: captures = [], isLoading } = useCaptures()
  const deleteCapture = useDeleteCapture()
  const updateCapture = useUpdateCapture()
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editVendor, setEditVendor] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editDate, setEditDate] = useState("")
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const filtered = captures.filter((c) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    const vendor = (c.vendor ?? c.ocr_vendor ?? "").toLowerCase()
    const desc = (c.description ?? c.ocr_description ?? "").toLowerCase()
    return vendor.includes(term) || desc.includes(term) || c.status.includes(term)
  })

  function startEdit(c: CapturedReceipt) {
    setEditingId(c.id)
    setEditVendor(c.vendor ?? c.ocr_vendor ?? "")
    setEditAmount(String(Number(c.amount ?? c.ocr_amount ?? 0)))
    setEditDate(c.receipt_date ?? c.ocr_date ?? "")
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: number) {
    await updateCapture.mutateAsync({
      id,
      data: {
        vendor: editVendor || undefined,
        amount: editAmount ? Number(editAmount) : undefined,
        receipt_date: editDate || undefined,
      },
    })
    setEditingId(null)
  }

  function handleDelete(id: number) {
    if (confirm("Delete this captured receipt?")) {
      deleteCapture.mutate(id)
    }
  }

  const selected = selectedId ? captures.find((c) => c.id === selectedId) : null

  const columns = [
    {
      key: "thumbnail",
      header: "",
      className: "w-14",
      render: (row: CapturedReceipt) => (
        <div className="w-10 h-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer"
          onClick={() => setSelectedId(selectedId === row.id ? null : row.id)}
        >
          {row.thumbnail_data ? (
            <img
              src={`data:image/jpeg;base64,${row.thumbnail_data}`}
              alt="Receipt"
              className="w-full h-full object-cover"
            />
          ) : (
            <Camera className="w-4 h-4 text-gray-400" />
          )}
        </div>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      render: (row: CapturedReceipt) =>
        editingId === row.id ? (
          <input
            className="text-sm border border-gray-300 rounded px-2 py-1 w-full focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            value={editVendor}
            onChange={(e) => setEditVendor(e.target.value)}
            placeholder="Vendor name"
            autoFocus
          />
        ) : (
          <span className="font-medium text-gray-900">
            {row.vendor ?? row.ocr_vendor ?? "Unknown"}
          </span>
        ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right font-mono w-28",
      render: (row: CapturedReceipt) =>
        editingId === row.id ? (
          <input
            className="text-sm border border-gray-300 rounded px-2 py-1 w-24 text-right focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            value={editAmount}
            onChange={(e) => setEditAmount(e.target.value)}
            placeholder="0.00"
            type="number"
            step="0.01"
          />
        ) : (
          <span>
            {Number(row.amount ?? row.ocr_amount ?? 0) > 0
              ? formatCurrency(row.amount ?? row.ocr_amount ?? "0")
              : "—"}
          </span>
        ),
    },
    {
      key: "receipt_date",
      header: "Date",
      className: "w-28",
      render: (row: CapturedReceipt) =>
        editingId === row.id ? (
          <input
            className="text-sm border border-gray-300 rounded px-2 py-1 w-full focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            type="date"
          />
        ) : (
          formatDate(row.receipt_date ?? row.ocr_date)
        ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-24",
      render: (row: CapturedReceipt) => <StatusBadge status={row.status} />,
    },
    {
      key: "file_info",
      header: "File",
      className: "w-20 text-gray-500 text-xs",
      render: (row: CapturedReceipt) => formatBytes(row.file_size_bytes),
    },
    {
      key: "uploaded",
      header: "Uploaded",
      className: "w-28 text-gray-500 text-xs",
      render: (row: CapturedReceipt) => formatDate(row.created_at),
    },
    {
      key: "actions",
      header: "",
      className: "w-20",
      render: (row: CapturedReceipt) =>
        editingId === row.id ? (
          <div className="flex gap-1">
            <button
              className="p-1 text-green-600 hover:bg-green-50 rounded"
              onClick={() => saveEdit(row.id)}
              title="Save"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
              onClick={cancelEdit}
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1">
            <button
              className="p-1 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded"
              onClick={() => startEdit(row)}
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              onClick={() => handleDelete(row.id)}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ),
    },
  ]

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Captured Receipts</h1>
        <span className="text-sm text-gray-500">{captures.length} receipt{captures.length !== 1 ? "s" : ""}</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Receipts captured from the Ledgius mobile app</p>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <BackLink />
      <InfoPanel title="About Captured Receipts" storageKey="captured-receipts-info">
        <p>
          <strong>Captured Receipts</strong> are photos and PDFs of supplier receipts that you've uploaded for OCR
          scanning. The system extracts vendor, date, amount, and GST, then holds the receipt in a <em>Ready</em> state
          until you attach it to a bill or bank transaction.
        </p>
        <p className="mt-1.5">
          Upload via the mobile app or drag-and-drop here. Review the scanned fields, correct anything wrong, then
          either create a new <Link to="/bills" className="underline font-medium">Bill</Link> from the receipt or match
          it to an imported bank transaction on the <Link to="/bank-reconciliation" className="underline font-medium">Reconciliation</Link> page.
        </p>
        <p className="mt-1.5 text-blue-600">
          Matched receipts become the audit evidence attached to the related bill or transaction — the ATO requires
          supporting evidence for every GST claim.
        </p>
      </InfoPanel>
      <div className="flex items-center justify-between mb-4">
        <SearchFilter
          placeholder="Search by vendor, description, or status..."
          onSearch={setSearch}
        />
      </div>

      <div className="flex gap-4">
        {/* Main table */}
        <div className={selected ? "flex-1" : "w-full"}>
          <DataTable
            columns={columns}
            data={filtered}
            loading={isLoading}
            emptyMessage="No captured receipts yet. Receipts captured from the Ledgius mobile app will appear here."
            onRowClick={(row) => setSelectedId(selectedId === row.id ? null : row.id)}
          />
        </div>

        {/* Preview panel */}
        {selected && (
          <div className="w-80 shrink-0">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden sticky top-4">
              {/* Image */}
              <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
                {selected.thumbnail_data ? (
                  <img
                    src={`data:image/jpeg;base64,${selected.thumbnail_data}`}
                    alt="Receipt"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Camera className="w-16 h-16 text-gray-300" />
                )}
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selected.vendor ?? selected.ocr_vendor ?? "Unknown"}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</p>
                    <p className="text-sm font-mono font-medium text-gray-900">
                      {Number(selected.amount ?? selected.ocr_amount ?? 0) > 0
                        ? formatCurrency(selected.amount ?? selected.ocr_amount ?? "0")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</p>
                    <p className="text-sm text-gray-900">
                      {formatDate(selected.receipt_date ?? selected.ocr_date)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={selected.status} />
                  </div>
                </div>
                {selected.ocr_raw_text && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">OCR Text</p>
                    <p className="text-xs text-gray-500 mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap font-mono bg-gray-50 rounded p-2">
                      {selected.ocr_raw_text}
                    </p>
                  </div>
                )}
                <button
                  className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600"
                  onClick={() => setSelectedId(null)}
                >
                  Close preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
