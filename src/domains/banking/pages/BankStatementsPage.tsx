// Spec references: R-0019, A-0019
import { useState, useRef, useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { Button, Combobox, Badge, Skeleton, InfoPanel } from "@/components/primitives"
import { useFeedback } from "@/components/feedback"
import { DataTable } from "@/shared/components/DataTable"
import type { Column } from "@/shared/components/DataTable"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import {
  useImportBankFile,
  useImportBatches,
  useUnmatchedTransactions,
  type ImportBatch,
} from "../hooks/useBanking"
import { formatDate, cn } from "@/shared/lib/utils"
import {
  Upload,
  CheckCircle,
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ArrowRight,
  FileText,
} from "lucide-react"

// ── Helpers ───────────────────────────────────────────────────────────────────

type BatchStatus = "pending" | "processing" | "complete" | "failed"

type BatchStatusConfig = {
  label: string
  variant: "default" | "info" | "success" | "danger"
}

function getBatchStatusConfig(status: string): BatchStatusConfig {
  switch (status as BatchStatus) {
    case "pending":
      return { label: "Pending", variant: "default" }
    case "processing":
      return { label: "Processing", variant: "info" }
    case "complete":
      return { label: "Complete", variant: "success" }
    case "failed":
      return { label: "Failed", variant: "danger" }
    default:
      return { label: status, variant: "default" }
  }
}

function isBankAccount(accno: string, description: string | null): boolean {
  const desc = (description ?? "").toLowerCase()
  if (desc.includes("bank") || desc.includes("cheque") || desc.includes("savings") || desc.includes("transaction")) {
    return true
  }
  // accno ranges 1-0xxx or 1000–1099 (common chart-of-accounts bank ranges)
  if (accno.startsWith("1-0") || accno.startsWith("1-00")) return true
  const numeric = parseInt(accno.replace(/\D/g, ""), 10)
  if (!isNaN(numeric) && numeric >= 1000 && numeric <= 1099) return true
  return false
}

// ── Upload result inline feedback ─────────────────────────────────────────────

interface UploadResult {
  fileName: string
  totalRows: number
  duplicatesSkipped: number
  success: boolean
  errorMessage?: string
}

function UploadResultPanel({ result }: { result: UploadResult }) {
  if (result.success) {
    return (
      <div className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-gray-800">
            Uploaded {result.fileName}
          </p>
          <p className="text-gray-600 mt-0.5">
            {result.totalRows} transaction{result.totalRows !== 1 ? "s" : ""} imported
            {result.duplicatesSkipped > 0 && `, ${result.duplicatesSkipped} duplicate${result.duplicatesSkipped !== 1 ? "s" : ""} skipped`}
            {result.totalRows === 0 && " — all transactions in this file were already imported"}
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm">
      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
      <div>
        <p className="font-medium text-red-800">Import failed: {result.fileName}</p>
        {result.errorMessage && <p className="text-red-700 mt-0.5">{result.errorMessage}</p>}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BankStatementsPage() {
  usePagePolicies(["banking", "audit"])

  const navigate = useNavigate()
  const feedback = useFeedback()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedAccountId, setSelectedAccountId] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)

  const { data: accounts, isLoading: accountsLoading } = useAccounts()
  const { data: batches, isLoading: batchesLoading, error: batchesError } = useImportBatches(selectedAccountId)
  const { data: unmatched } = useUnmatchedTransactions(selectedAccountId)
  const importFile = useImportBankFile()

  // Filter to asset accounts that look like bank accounts
  const bankAccounts = (accounts ?? []).filter(
    (a) => a.category === "A" && isBankAccount(a.accno, a.description)
  )

  const categoryLabels: Record<string, string> = { A: "Asset", L: "Liability", Q: "Equity", I: "Income", E: "Expense" }
  const accountOptions = bankAccounts.map((a) => ({
    value: String(a.id),
    label: `${a.accno} — ${a.description ?? "Unnamed"}`,
    detail: categoryLabels[a.category] ?? a.category,
  }))

  const unmatchedCount = unmatched?.length ?? 0

  // ── File processing ────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (selectedAccountId === 0) {
      feedback.error("No account selected", "Select a bank account before uploading a statement")
      return
    }
    setUploadResult(null)

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!ext || !["ofx", "qbo", "qfx", "csv", "qif"].includes(ext)) {
      feedback.error("Unsupported file type", `Expected .ofx, .qbo, .csv, or .qif — got .${ext ?? "unknown"}`)
      return
    }

    setUploading(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1] || btoa(reader.result as string)
      const formatMap: Record<string, string> = { ofx: "ofx", qbo: "qbo", qfx: "ofx", csv: "csv", qif: "qif" }
      const format = formatMap[ext] ?? "csv"
      try {
        const batch = await importFile.mutateAsync({
          account_id: selectedAccountId,
          file_name: file.name,
          format: format,
          content: base64,
        })
        const result = batch as { total_rows?: number; matched_rows?: number; duplicates_skipped?: number }
        const totalRows = result.total_rows ?? 0
        const duplicatesSkipped = result.duplicates_skipped ?? 0
        setUploadResult({ fileName: file.name, totalRows, duplicatesSkipped, success: true })
        feedback.success(`Imported ${file.name}: ${totalRows} new transactions`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Import failed"
        setUploadResult({ fileName: file.name, totalRows: 0, duplicatesSkipped: 0, success: false, errorMessage: message })
        feedback.error("Import failed", message)
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }
    reader.readAsDataURL(file)
  }, [selectedAccountId, importFile, feedback])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  // ── Table columns ──────────────────────────────────────────────────────────

  const batchColumns: Column<ImportBatch>[] = [
    {
      key: "file_name",
      header: "File Name",
      render: (row) => (
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="text-gray-900">{row.file_name}</span>
        </span>
      ),
    },
    {
      key: "file_format",
      header: "Format",
      className: "w-20",
      render: (row) => (
        <span className="uppercase text-xs font-medium text-gray-500">{row.file_format}</span>
      ),
    },
    {
      key: "imported_at",
      header: "Date Imported",
      className: "w-36",
      render: (row) => <span className="text-gray-600">{formatDate(row.imported_at)}</span>,
    },
    {
      key: "total_rows",
      header: "Total Rows",
      className: "w-24 text-right",
      render: (row) => <span className="tabular-nums text-gray-700">{row.total_rows}</span>,
    },
    {
      key: "matched_rows",
      header: "Matched",
      className: "w-24 text-right",
      render: (row) => <span className="tabular-nums text-gray-700">{row.matched_rows}</span>,
    },
    {
      key: "status",
      header: "Status",
      className: "w-28",
      render: (row) => {
        const cfg = getBatchStatusConfig(row.status)
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>
      },
    },
  ]

  // ── Header ─────────────────────────────────────────────────────────────────

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Import Transactions</h1>
      <p className="mt-0.5 text-sm text-gray-500">Upload bank statement files and commit transactions to the ledger</p>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageShell header={header}>
      {/* Info panel */}
      <InfoPanel title="How to import bank transactions" storageKey="bank-import-transactions-info">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            {selectedAccountId > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
            )}
            <p className="text-xs"><strong>1. Select a bank account</strong> from the dropdown below.</p>
          </div>
          <div className="flex items-start gap-2">
            {(batches ?? []).length > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            ) : selectedAccountId > 0 ? (
              <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
            )}
            <p className="text-xs"><strong>2. Upload a bank statement</strong> file using the <strong>"Choose File"</strong> button or drag and drop (OFX, CSV, QIF, or QBO).</p>
          </div>
          <div className="flex items-start gap-2">
            {(batches ?? []).some((b: { status: string }) => b.status === "complete") ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            ) : (batches ?? []).length > 0 ? (
              <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
            )}
            <p className="text-xs"><strong>3. Review imported transactions</strong> in the Import History table below — check for duplicates and verify totals.</p>
          </div>
          <div className="flex items-start gap-2">
            {unmatchedCount === 0 && (batches ?? []).length > 0 ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
            )}
            <p className="text-xs"><strong>4. Go to <Link to="/bank-reconciliation" className="text-primary-600 hover:text-primary-800 underline">Reconciliation</Link></strong> to match imported transactions against your ledger entries.</p>
          </div>
        </div>
      </InfoPanel>

      {/* Bank account selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Bank Account</h2>
        {accountsLoading ? (
          <Skeleton className="h-9 w-72" />
        ) : (
          <div className="w-72">
            <Combobox
              options={accountOptions}
              value={selectedAccountId > 0 ? String(selectedAccountId) : ""}
              onChange={(val) => {
                setSelectedAccountId(val ? parseInt(String(val), 10) : 0)
                setUploadResult(null)
              }}
              placeholder="Select a bank account…"
            />
          </div>
        )}
        {bankAccounts.length === 0 && !accountsLoading && (
          <p className="text-xs text-gray-500">
            No bank accounts found. Add an asset account with "bank" in the description under Chart of Accounts.
          </p>
        )}
      </div>

      {/* Upload section — only shown when account selected */}
      {selectedAccountId > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Upload Statement</h2>
          <p className="text-sm text-gray-600">
            Upload a bank statement file to import transactions for reconciliation.
            Duplicate transactions are automatically detected and skipped.
          </p>

          {/* Action row */}
          <div className="flex items-center gap-4">
            <Button
              variant="primary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1.5" />
              {uploading ? "Uploading…" : "Choose File"}
            </Button>
            <span className="text-xs text-gray-400">or drag and drop below — .ofx, .qbo, .csv, or .qif</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.qbo,.qfx,.csv,.qif,text/csv,application/x-ofx"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-8 gap-2 transition-colors cursor-pointer",
              dragOver
                ? "border-primary-400 bg-primary-50"
                : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100",
              uploading && "opacity-50 pointer-events-none"
            )}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <Upload className={cn("h-8 w-8", dragOver ? "text-primary-500" : "text-gray-300")} />
            <p className="text-sm font-medium text-gray-600">
              {dragOver ? "Drop file to import" : "Drop your bank statement here"}
            </p>
            <p className="text-xs text-gray-400">.ofx, .csv, or .qif files accepted</p>
          </div>

          {/* Upload result inline feedback */}
          {uploadResult && <UploadResultPanel result={uploadResult} />}
        </div>
      )}

      {/* Import history */}
      {selectedAccountId > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Import History</h2>
          <DataTable<ImportBatch>
            columns={batchColumns}
            data={batches ?? []}
            loading={batchesLoading}
            error={batchesError}
            emptyMessage="No imports yet — upload a statement file above to get started"
          />

          {/* Unmatched transactions summary */}
          {unmatchedCount > 0 && (
            <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm text-amber-800">
                <strong>{unmatchedCount}</strong> unmatched transaction{unmatchedCount !== 1 ? "s" : ""} ready for reconciliation
              </p>
              <Button
                variant="secondary"
                onClick={() => navigate("/bank-reconciliation", { state: { accountId: selectedAccountId } })}
              >
                Go to Reconciliation
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Prompt to select account if nothing selected */}
      {selectedAccountId === 0 && !accountsLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <Upload className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">Select a bank account above to upload statements and view import history</p>
        </div>
      )}
    </PageShell>
  )
}
