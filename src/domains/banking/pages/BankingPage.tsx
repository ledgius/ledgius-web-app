import { useState } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, Combobox } from "@/components/primitives"
import { useFeedback } from "@/components/feedback"
import { Upload, FileText, CheckCircle } from "lucide-react"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import {
  useUnclearedTransactions,
  useReconciliationStatus,
  useUnmatchedTransactions,
  useImportBatches,
  useImportBankFile,
  useBankRules,
  type UnclearedTransaction,
  type BankRule,
  type BankTransaction,
  type ImportBatch,
} from "../hooks/useBanking"
import { formatCurrency, formatDate } from "@/shared/lib/utils"

export function BankingPage() {
  usePageHelp(pageHelpContent.banking)
  usePagePolicies(["banking"])
  const { data: accounts } = useAccounts()
  const [selectedAccount, setSelectedAccount] = useState(0)
  const [statementBalance, setStatementBalance] = useState("")
  const [tab, setTab] = useState<"uncleared" | "unmatched" | "history" | "rules">("uncleared")
  const [showImport, setShowImport] = useState(false)
  const [importResult, setImportResult] = useState<{ fileName: string; total: number; matched: number } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const importFile = useImportBankFile()
  const feedback = useFeedback()

  const processFile = async (file: File) => {
    if (selectedAccount === 0) {
      feedback.error("No account selected", "Select a bank account before importing")
      return
    }
    setImportResult(null)

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!ext || !["ofx", "csv", "qif"].includes(ext)) {
      feedback.error("Unsupported file type", `Expected .ofx, .csv, or .qif but got .${ext}`)
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1] || btoa(reader.result as string)
      const format = ext === "ofx" ? "ofx" : ext === "qif" ? "qif" : "csv"
      try {
        const batch = await importFile.mutateAsync({
          account_id: selectedAccount,
          file_name: file.name,
          format: format,
          content: base64,
        })
        const result = batch as { total_rows?: number; matched_rows?: number }
        setImportResult({
          fileName: file.name,
          total: result.total_rows ?? 0,
          matched: result.matched_rows ?? 0,
        })
        feedback.success(`Imported ${file.name}: ${result.total_rows ?? 0} new transactions`)
        setTab("unmatched")
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Import failed"
        feedback.error("Import failed", message)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  // Filter to bank/cash accounts (category A with functional link containing "Cash" or common bank accnos)
  const bankAccounts = accounts?.filter(a => a.category === "A") ?? []

  const { data: uncleared, isLoading: unclearedLoading, error: unclearedError } = useUnclearedTransactions(selectedAccount)
  const { data: status } = useReconciliationStatus(selectedAccount, statementBalance || undefined)
  const { data: unmatched, isLoading: unmatchedLoading, error: unmatchedError } = useUnmatchedTransactions(selectedAccount)
  const { data: batches, isLoading: batchesLoading, error: batchesError } = useImportBatches(selectedAccount)
  const { data: bankRules, isLoading: rulesLoading, error: rulesError } = useBankRules(selectedAccount)

  const unclearedColumns: Column<UnclearedTransaction>[] = [
    { key: "transdate", header: "Date", render: (row) => formatDate(row.transdate) },
    { key: "reference", header: "Reference" },
    { key: "description", header: "Description" },
    { key: "amount_bc", header: "Amount", className: "text-right font-mono",
      render: (row) => {
        const amt = parseFloat(row.amount_bc)
        return <span className={amt >= 0 ? "text-green-700" : "text-red-700"}>{formatCurrency(row.amount_bc)}</span>
      },
    },
    { key: "cleared", header: "Cleared", className: "w-20 text-center",
      render: (row) => row.cleared
        ? <span className="text-green-600 text-xs">Yes</span>
        : <span className="text-gray-400 text-xs">No</span>,
    },
  ]

  const unmatchedColumns: Column<BankTransaction>[] = [
    { key: "trans_date", header: "Date", render: (row) => formatDate(row.trans_date) },
    { key: "description", header: "Description" },
    { key: "reference", header: "Reference" },
    { key: "amount", header: "Amount", className: "text-right font-mono",
      render: (row) => formatCurrency(row.amount) },
    { key: "match_status", header: "Status", className: "w-24",
      render: (row) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          row.match_status === "matched" ? "bg-green-50 text-green-700" :
          row.match_status === "suggested" ? "bg-blue-50 text-blue-700" :
          "bg-gray-100 text-gray-600"
        }`}>
          {row.match_status}
        </span>
      ),
    },
  ]

  const batchColumns: Column<ImportBatch>[] = [
    { key: "file_name", header: "File" },
    { key: "file_format", header: "Format", className: "w-16 uppercase" },
    { key: "imported_at", header: "Imported", render: (row) => formatDate(row.imported_at) },
    { key: "total_rows", header: "Rows", className: "text-right" },
    { key: "matched_rows", header: "Matched", className: "text-right" },
    { key: "status", header: "Status", className: "w-24",
      render: (row) => (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          row.status === "complete" ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
        }`}>
          {row.status}
        </span>
      ),
    },
  ]

  const tabs = [
    { key: "uncleared" as const, label: "Uncleared Transactions" },
    { key: "unmatched" as const, label: "Unmatched Imports" },
    { key: "history" as const, label: "Import History" },
    { key: "rules" as const, label: "Matching Rules" },
  ]

  const catLabels: Record<string, string> = { A: "Asset", L: "Liability", Q: "Equity", I: "Income", E: "Expense" }
  const accountOptions = bankAccounts.map((a) => ({
    value: a.id,
    label: `${a.accno} — ${a.description}`,
    detail: catLabels[a.category] ?? a.category,
  }))

  const selectedAccountName = bankAccounts.find((a) => a.id === selectedAccount)?.description

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Bank Reconciliation</h1>
        {selectedAccountName && (
          <span className="text-sm text-gray-500">{selectedAccountName}</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Match your bank statement to your books</p>
      <div className="flex items-end gap-4 mt-3">
        <div className="w-64">
          <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
          <Combobox
            options={accountOptions}
            value={selectedAccount || null}
            onChange={(v) => setSelectedAccount(v ? Number(v) : 0)}
            placeholder="Search bank accounts..."
          />
        </div>
        <div className="w-48">
          <label className="block text-xs font-medium text-gray-600 mb-1">Statement Balance</label>
          <input type="number" step="0.01" value={statementBalance}
            onChange={(e) => setStatementBalance(e.target.value)}
            className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="0.00" />
        </div>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>

      {status && (
        <div className={`mb-6 p-4 rounded-lg border ${status.is_reconciled ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex justify-between text-sm">
            <span>Cleared Balance: <strong className="font-mono">{formatCurrency(status.cleared_balance)}</strong></span>
            <span>Statement Balance: <strong className="font-mono">{formatCurrency(status.statement_balance)}</strong></span>
            <span>Difference: <strong className="font-mono">{formatCurrency(status.difference)}</strong></span>
            <span className={status.is_reconciled ? "text-green-700 font-medium" : "text-yellow-700 font-medium"}>
              {status.is_reconciled ? "Reconciled" : "Not Reconciled"}
            </span>
          </div>
        </div>
      )}

      {selectedAccount > 0 && (
        <div className="mb-4">
          <Button variant="secondary" size="sm" onClick={() => setShowImport(!showImport)}>
            <Upload className="h-3.5 w-3.5" />
            {showImport ? "Cancel Import" : "Import Statement"}
          </Button>
        </div>
      )}

      {showImport && selectedAccount > 0 && (
        <PageSection title="Import Bank Statement">
          <div className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="flex-1 space-y-3">
                <p className="text-sm text-gray-600">
                  Upload a bank statement file to import transactions for reconciliation.
                  Duplicate transactions are automatically detected and skipped.
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span><strong>OFX</strong> — Open Financial Exchange (recommended)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span><strong>CSV</strong> — Comma-separated values</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    <span><strong>QIF</strong> — Quicken Interchange Format</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary-600 text-white text-sm hover:bg-primary-700 cursor-pointer transition-colors">
                    <Upload className="h-4 w-4" />
                    Choose File
                    <input type="file" accept=".ofx,.csv,.qif,text/csv,application/x-ofx,application/vnd.intu.qfx" onChange={handleFileUpload} className="hidden" />
                  </label>
                  <span className="text-xs text-gray-400">or drag and drop below</span>
                </div>

                {/* Drop zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
                    dragOver
                      ? "border-primary-400 bg-primary-50 text-primary-700"
                      : "border-gray-300 bg-gray-50 text-gray-400"
                  }`}
                >
                  <Upload className={`h-8 w-8 mb-2 ${dragOver ? "text-primary-500" : "text-gray-300"}`} />
                  <p className="text-sm font-medium">
                    {dragOver ? "Drop file to import" : "Drop your bank statement here"}
                  </p>
                  <p className="text-xs mt-1">.ofx, .csv, or .qif files accepted</p>
                </div>
              </div>
            </div>

            {importResult && (
              <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Import complete: {importResult.fileName}</p>
                  <p className="text-green-700 mt-0.5">
                    {importResult.total} new transactions imported
                    {importResult.matched > 0 && ` · ${importResult.matched} auto-matched by rules`}
                    {importResult.total === 0 && " — all transactions in this file were already imported"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </PageSection>
      )}

      {selectedAccount > 0 && (
        <>
          <div className="flex gap-1 mb-4 border-b">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                  tab === t.key ? "border-gray-900 text-gray-900 font-medium" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "uncleared" && (
            <DataTable columns={unclearedColumns} data={uncleared ?? []} loading={unclearedLoading} error={unclearedError} emptyMessage="No uncleared transactions." />
          )}
          {tab === "unmatched" && (
            <DataTable columns={unmatchedColumns} data={unmatched ?? []} loading={unmatchedLoading} error={unmatchedError} emptyMessage="No unmatched imports." />
          )}
          {tab === "history" && (
            <DataTable columns={batchColumns} data={batches ?? []} loading={batchesLoading} error={batchesError} emptyMessage="No import history." />
          )}
          {tab === "rules" && (
            <DataTable columns={[
              { key: "name", header: "Rule Name" },
              { key: "description_pattern", header: "Description Pattern", render: (r: BankRule) => r.description_pattern ?? "-" },
              { key: "reference_pattern", header: "Reference Pattern", render: (r: BankRule) => r.reference_pattern ?? "-" },
              { key: "priority", header: "Priority", className: "w-16 text-right" },
              { key: "enabled", header: "Enabled", className: "w-16 text-center",
                render: (r: BankRule) => r.enabled ? <span className="text-green-600 text-xs">Yes</span> : <span className="text-gray-400 text-xs">No</span> },
            ]} data={bankRules ?? []} loading={rulesLoading} error={rulesError} emptyMessage="No matching rules configured." />
          )}
        </>
      )}

      {selectedAccount === 0 && (
        <div className="bg-white border rounded-lg p-8 text-center text-gray-500">
          <p>Select a bank account above to view transactions and reconciliation status.</p>
        </div>
      )}
    </PageShell>
  )
}
