import { useState, useRef, useCallback, useEffect } from "react"
import { usePageHelp } from "@/hooks/usePageHelp"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert, Badge, Combobox, InfoPanel, Skeleton } from "@/components/primitives"
import { StatusStepper, type StatusStep } from "@/components/financial"
import { MoneyValue, DateValue } from "@/components/financial"
import { useFeedback } from "@/components/feedback"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useCustomers, useVendors } from "@/domains/contact/hooks/useContacts"
import { api } from "@/shared/lib/api"
import { Upload, Database, CheckCircle, AlertCircle, ArrowRight, Trash2, RefreshCw } from "lucide-react"

const pipelineSteps: StatusStep[] = [
  { key: "upload", label: "Upload" },
  { key: "analyse", label: "Analyse" },
  { key: "map_accounts", label: "Map Accounts" },
  { key: "map_contacts", label: "Map Contacts" },
  { key: "preview", label: "Preview" },
  { key: "commit", label: "Commit" },
  { key: "verify", label: "Verify" },
]

interface ImportBatch {
  id: number
  source_system: string
  import_strategy: string
  status: string
  current_stage: string
  accounts_total: number
  accounts_mapped: number
  accounts_new: number
  contacts_total: number
  contacts_mapped: number
  contacts_new: number
  txn_total: number
  txn_imported: number
  txn_skipped: number
  source_debit_total: string | null
  source_credit_total: string | null
  target_debit_total: string | null
  target_credit_total: string | null
  verified: boolean
  error_message: string | null
  source_files: { name: string; type: string; rows: number; customers?: number; vendors?: number; unresolved_types?: number }[]
}

interface StagingAccount {
  id: number
  source_code: string
  source_name: string
  source_type: string | null
  mapped_to_code: string | null
  mapping_status: string
  confidence: number
  is_valid: boolean
  validation_warnings: string[]
}

interface StagingContact {
  id: number
  source_name: string
  source_code: string | null
  source_type: string | null
  source_abn: string | null
  mapping_status: string
  mapped_to_id: number | null
  confidence: number
}

const sourceOptions = [
  { id: "xero", name: "Xero", description: "Import from Xero CSV exports" },
  { id: "myob", name: "MYOB", description: "Import from MYOB AccountRight exports" },
  { id: "csv", name: "Generic CSV", description: "Import from any CSV with manual column mapping" },
]

type ImportSource = "xero" | "myob" | "csv"

export function DataImportPage() {
  const feedback = useFeedback()
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null)
  const [batch, setBatch] = useState<ImportBatch | null>(null)

  // Dynamic help content based on import source — loads from YAML with sub-context.
  usePageHelp(undefined, batch?.source_system ?? selectedSource ?? undefined)
  const [loading, setLoading] = useState(false)
  const [stagingAccounts, setStagingAccounts] = useState<StagingAccount[]>([])
  const [stagingContacts, setStagingContacts] = useState<StagingContact[]>([])
  const [importMode, setImportMode] = useState<"full_history" | "opening_balances">("full_history")
  const [importStrategy, setImportStrategy] = useState<"import_as_new" | "map_to_existing">("import_as_new")
  const [viewStage, setViewStage] = useState<string | null>(null)

  // Load existing Ledgius data for mapping selectors
  const { data: ledgiusAccounts } = useAccounts()
  const { data: ledgiusCustomers } = useCustomers()
  const { data: ledgiusVendors } = useVendors()

  const catLabels: Record<string, string> = { A: "Asset", L: "Liability", Q: "Equity", I: "Income", E: "Expense" }
  const accountOptions = (ledgiusAccounts ?? []).map((a) => ({
    value: a.id,
    label: `${a.accno} — ${a.description ?? ""}`,
    detail: catLabels[a.category] ?? a.category,
  }))

  const contactOptions = [
    ...(ledgiusCustomers ?? []).map((c) => ({ value: c.id, label: c.name, detail: `Customer · ${c.meta_number}` })),
    ...(ledgiusVendors ?? []).map((v) => ({ value: v.id, label: v.name, detail: `Vendor · ${v.meta_number}` })),
  ]

  // ── Actions ──

  const uploadFile = async (fileType: string, file: File, contactType?: string) => {
    if (!batch) return
    setLoading(true)
    try {
      const base64 = await readFileAsBase64(file)
      const b = await api.post<ImportBatch>(`/import/batches/${batch.id}/upload`, {
        file_type: fileType,
        file_name: file.name,
        content: base64,
        contact_type: contactType,
      })
      setBatch(b)
      feedback.success(`Uploaded ${file.name}: ${fileType}`)
    } catch (err: unknown) {
      feedback.error("Upload failed", err instanceof Error ? err.message : "")
    } finally {
      setLoading(false)
    }
  }

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(",")[1])
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })

  const runStage = async (action: string, label: string) => {
    if (!batch) return
    setLoading(true)
    try {
      const b = await api.post<ImportBatch>(`/import/batches/${batch.id}/${action}`, {})
      setBatch(b)
      feedback.success(label)

      // Load staging data for review
      if (action === "accounts/auto-map" || action === "analyse") {
        const accts = await api.get<StagingAccount[]>(`/import/batches/${batch.id}/accounts`)
        setStagingAccounts(accts)
      }
      if (action === "contacts/auto-map") {
        const cts = await api.get<StagingContact[]>(`/import/batches/${batch.id}/contacts`)
        setStagingContacts(cts)
      }
    } catch (err: unknown) {
      feedback.error(`${label} failed`, err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const deleteBatch = async () => {
    if (!batch) return
    try {
      await api.delete(`/import/batches/${batch.id}`)
      setBatch(null)
      setStagingAccounts([])
      setStagingContacts([])
      feedback.success("Import batch deleted")
    } catch (err: unknown) {
      feedback.error("Delete failed", err instanceof Error ? err.message : "")
    }
  }

  const refreshBatch = async () => {
    if (!batch) return
    const b = await api.get<ImportBatch>(`/import/batches/${batch.id}`)
    setBatch(b)
  }

  const updateAccountMapping = async (stagingId: number, mappedToId: number | null, mappedToCode: string, status: string) => {
    if (!batch) return
    try {
      await api.patch(`/import/batches/${batch.id}/accounts`, {
        staging_id: stagingId,
        mapped_to_id: mappedToId,
        mapped_to_code: mappedToCode,
        mapping_status: status,
      })
      // Refresh staging accounts
      const accts = await api.get<StagingAccount[]>(`/import/batches/${batch.id}/accounts`)
      setStagingAccounts(accts)
      await refreshBatch()
    } catch (err: unknown) {
      feedback.error("Mapping update failed", err instanceof Error ? err.message : "")
    }
  }

  // ── Header ──

  const isCommitted = batch?.status === "committed" || batch?.status === "verified"

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Data Import</h1>
        <span className="text-sm text-gray-500">Migrate from another accounting system</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Bring in data from another accounting system</p>
      {batch && (
        <div className="flex items-center gap-2 mt-3">
          {isCommitted ? (
            <Button variant="secondary" size="sm" onClick={() => { setBatch(null); setStagingAccounts([]); setStagingContacts([]); setViewStage(null) }}>
              Done
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={deleteBatch}>
              <Trash2 className="h-3.5 w-3.5" />
              Cancel Import
            </Button>
          )}
        </div>
      )}
    </div>
  )

  // ── Format selector — always visible at top (even after batch created) ──

  const brandStyles: Record<string, { border: string; bg: string; text: string; icon: string }> = {
    xero:  { border: "border-[#13B5EA]", bg: "bg-[#13B5EA]/10", text: "text-[#0B7FA5]", icon: "text-[#13B5EA]" },
    myob:  { border: "border-[#6D28D9]", bg: "bg-[#6D28D9]/10", text: "text-[#6D28D9]", icon: "text-[#6D28D9]" },
    csv:   { border: "border-gray-400",   bg: "bg-gray-100",     text: "text-gray-700",  icon: "text-gray-400"  },
  }

  const formatSelector = (
    <PageSection title="Import Format">
      <div className="flex gap-3">
        {sourceOptions.map((src) => {
          const active = batch ? batch.source_system === src.id : selectedSource === src.id
          const brand = brandStyles[src.id] ?? brandStyles.csv
          return (
            <button
              key={src.id}
              type="button"
              onClick={() => {
                if (!batch) {
                  setSelectedSource(src.id as ImportSource)
                }
              }}
              disabled={!!batch}
              className={`flex-1 text-left p-3 rounded-lg border-2 transition-colors ${active ? `${brand.border} ${brand.bg}` : "border-gray-200 bg-white hover:border-gray-300"} ${batch ? "cursor-default" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Database className={`h-4 w-4 ${active ? brand.icon : "text-gray-400"}`} />
                <span className={`text-sm font-semibold ${active ? brand.text : "text-gray-900"}`}>{src.name}</span>
              </div>
              <p className="text-xs text-gray-500">{src.description}</p>
            </button>
          )
        })}
      </div>
    </PageSection>
  )

  // ── Buffered files (before batch creation) ──
  const [bufferedFiles, setBufferedFiles] = useState<{ type: string; file: File; contactType?: string }[]>([])

  const bufferFile = (type: string, file: File, contactType?: string) => {
    setBufferedFiles(prev => [...prev.filter(f => !(f.type === type && f.contactType === contactType)), { type, file, contactType }])
    feedback.success(`${file.name} ready for upload`)
  }

  const startImport = async () => {
    if (!selectedSource || bufferedFiles.length === 0) return
    setLoading(true)
    try {
      const b = await api.post<ImportBatch>("/import/batches", { source_system: selectedSource, import_mode: importMode, import_strategy: importStrategy })
      setBatch(b)
      for (const bf of bufferedFiles) {
        const reader = new FileReader()
        const content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1]
            resolve(base64)
          }
          reader.onerror = reject
          reader.readAsDataURL(bf.file)
        })
        const updated = await api.post<ImportBatch>(`/import/batches/${b.id}/upload`, {
          file_type: bf.type,
          file_name: bf.file.name,
          content,
          contact_type: bf.contactType,
        })
        setBatch(updated)
      }
      setBufferedFiles([])
      feedback.success("Files uploaded — ready to analyse")
      const accts = await api.get<StagingAccount[]>(`/import/batches/${b.id}/accounts`)
      setStagingAccounts(accts)
    } catch (err: unknown) {
      feedback.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setLoading(false)
    }
  }

  // ── No batch yet — show format selector + upload config ──

  const infoPanel = (
    <InfoPanel title="How data import works" storageKey="import-info">
      <p><strong>1. Choose format &amp; upload</strong> — select MYOB, Xero, or Generic CSV, configure options, and add your files.</p>
      <p><strong>2. Start Import</strong> — click to upload files and begin the analysis pipeline.</p>
      <p><strong>3. Analyse &amp; map</strong> — review staged accounts, contacts, and transactions.</p>
      <p><strong>4. Preview &amp; commit</strong> — verify the data looks correct, then commit to import into your ledger.</p>
    </InfoPanel>
  )

  if (!batch) {
    return (
      <PageShell header={header}>
        {infoPanel}
        {formatSelector}

        {selectedSource && (
          <>
            {/* Import options */}
            <div className="flex items-center gap-4 mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs font-medium text-gray-600">Import mode:</span>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="import_mode_pre" checked={importMode === "full_history"} onChange={() => setImportMode("full_history")} />
                <span>Full history</span>
                <span className="text-xs text-gray-400">(all transactions)</span>
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="import_mode_pre" checked={importMode === "opening_balances"} onChange={() => setImportMode("opening_balances")} />
                <span>Opening balances only</span>
              </label>
            </div>
            <div className="flex items-center gap-4 mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <span className="text-xs font-medium text-gray-600">Account strategy:</span>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="import_strategy_pre" checked={importStrategy === "import_as_new"} onChange={() => setImportStrategy("import_as_new")} />
                <span>Import as new</span>
              </label>
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" name="import_strategy_pre" checked={importStrategy === "map_to_existing"} onChange={() => setImportStrategy("map_to_existing")} />
                <span>Map to existing</span>
              </label>
            </div>

            {/* MYOB-specific guidance */}
            {selectedSource === "myob" && (
              <div className="mb-4 p-3 rounded-lg border border-primary-200 bg-primary-50 text-sm text-primary-800">
                <strong>Recommended:</strong> Export two files from MYOB. <strong>(1)</strong> Go to <em>Import and export data → Export</em>,
                select Data type <strong>"Data for your accountant"</strong> and Export file type <strong>"MYOB AO"</strong> or <strong>"CeeData"</strong>.
                <strong>(2)</strong> Also export your <strong>Chart of Accounts</strong> from MYOB (<em>Reports → Accounts → Chart of Accounts</em>).
              </div>
            )}

            {/* Upload dropzones — files buffered client-side */}
            <PageSection title="Upload Files">
              <DropZone label="Single File Import" onFileSelected={(f) => bufferFile("accounts", f)} hint="MYOB AO, CeeData — contains accounts + transactions in one file" />

              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or upload individual files</span></div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <DropZone label="Chart of Accounts" onFileSelected={(f) => bufferFile("accounts", f)} compact />
                <DropZone label="Customers" onFileSelected={(f) => bufferFile("contacts", f, "customer")} optional compact />
                <DropZone label="Vendors" onFileSelected={(f) => bufferFile("contacts", f, "vendor")} optional compact />
                <DropZone label="Transactions" onFileSelected={(f) => bufferFile("transactions", f)} compact />
              </div>

              {/* Buffered files summary */}
              {bufferedFiles.length > 0 && (
                <div className="mt-4 space-y-1">
                  {bufferedFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span className="font-mono">{f.file.name}</span>
                      <span>— {(f.file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
              )}
            </PageSection>

            {/* Start Import — creates batch + uploads all buffered files */}
            <div className="mt-4">
              <Button onClick={startImport} loading={loading} disabled={bufferedFiles.length === 0}>
                <Upload className="h-4 w-4" />
                Start Import ({bufferedFiles.length} file{bufferedFiles.length !== 1 ? "s" : ""})
              </Button>
              {bufferedFiles.length === 0 && (
                <p className="text-xs text-gray-400 mt-1.5">Add at least one file to begin</p>
              )}
            </div>

            {/* Import run history */}
            <div className="mt-6">
              <RecentImports />
            </div>
          </>
        )}
      </PageShell>
    )
  }

  // ── Active batch — show pipeline ──

  // Local view stage allows back navigation without changing backend state.
  const stage = viewStage ?? batch.current_stage
  const isImportAsNew = batch.import_strategy === "import_as_new"

  const handleStepClick = (stepKey: string) => {
    // Disable back navigation after commit — the import is done.
    if (isCommitted) return

    const stepOrder = pipelineSteps.map(s => s.key)
    const currentIdx = stepOrder.indexOf(batch.current_stage)
    const targetIdx = stepOrder.indexOf(stepKey)
    if (targetIdx < currentIdx) {
      setViewStage(stepKey)
    }
  }

  // Reset viewStage when backend advances.
  const runStageAndReset = async (action: string, label: string) => {
    setViewStage(null)
    await runStage(action, label)
  }

  return (
    <PageShell header={header}>
      {/* Info + format selector — stay visible through all stages */}
      {infoPanel}
      {formatSelector}

      {/* Pipeline progress — click completed steps to navigate back */}
      <StatusStepper steps={pipelineSteps} currentStatus={stage} onStepClick={handleStepClick} className="mb-6 max-w-2xl" />

      {/* Error display */}
      {batch.error_message && (
        <InlineAlert variant="error" className="mb-4">{batch.error_message}</InlineAlert>
      )}

      {/* Stage: Upload */}
      {(stage === "upload" || stage === "analyse") && (
        <PageSection title="Upload Files">
          <p className="text-sm text-gray-500 mb-2">
            Upload your data exported from {batch.source_system.toUpperCase()}.
            The format is auto-detected.
          </p>
          {batch.source_system === "myob" && (
            <div className="mb-4 p-3 rounded-lg border border-primary-200 bg-primary-50 text-sm text-primary-800">
              <strong>Recommended:</strong> Export two files from MYOB. <strong>(1)</strong> Go to <em>Import and export data → Export</em>,
              select Data type <strong>"Data for your accountant"</strong> and Export file type <strong>"MYOB AO"</strong> or <strong>"CeeData"</strong> — this
              produces a single file with your accounts and transactions. <strong>(2)</strong> Also export your <strong>Chart of Accounts</strong> from
              MYOB (<em>Reports → Accounts → Chart of Accounts</em>) — this provides the account type classifications needed for accurate reporting.
            </div>
          )}

          {/* Import mode selector */}
          <div className="flex items-center gap-4 mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <span className="text-xs font-medium text-gray-600">Import mode:</span>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="import_mode" checked={importMode === "full_history"} onChange={() => setImportMode("full_history")} />
              <span>Full history</span>
              <span className="text-xs text-gray-400">(all transactions)</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="import_mode" checked={importMode === "opening_balances"} onChange={() => setImportMode("opening_balances")} />
              <span>Opening balances only</span>
              <span className="text-xs text-gray-400">(summary balances, no transaction detail)</span>
            </label>
          </div>
          <div className="flex items-center gap-4 mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <span className="text-xs font-medium text-gray-600">Account strategy:</span>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="import_strategy" checked={importStrategy === "import_as_new"} onChange={() => setImportStrategy("import_as_new")} />
              <span>Import as new</span>
              <span className="text-xs text-gray-400">(use your source accounts, hide unused Ledgius defaults)</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="radio" name="import_strategy" checked={importStrategy === "map_to_existing"} onChange={() => setImportStrategy("map_to_existing")} />
              <span>Map to existing</span>
              <span className="text-xs text-gray-400">(manually map your accounts to existing Ledgius accounts)</span>
            </label>
          </div>
          <DropZone label="Single File Import" onFileSelected={(f) => uploadFile("accounts", f)} hint="MYOB AO, CeeData — contains accounts + transactions in one file" />

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-gray-400">or upload individual files</span></div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <DropZone label="Chart of Accounts" onFileSelected={(f) => uploadFile("accounts", f)} compact />
            <DropZone label="Customers" onFileSelected={(f) => uploadFile("contacts", f, "customer")} optional compact />
            <DropZone label="Vendors" onFileSelected={(f) => uploadFile("contacts", f, "vendor")} optional compact />
            <DropZone label="Transactions" onFileSelected={(f) => uploadFile("transactions", f)} compact />
          </div>

          {/* Files uploaded summary */}
          {batch.source_files && batch.source_files.length > 0 && (
            <div className="mt-4 space-y-1">
              {batch.source_files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="font-mono">{f.name}</span>
                  <span>— {f.rows} rows</span>
                </div>
              ))}
            </div>
          )}

          {/* Account type resolution status */}
          {(() => {
            const sf = batch.source_files?.find(f => f.unresolved_types !== undefined)
            if (!sf) return null
            const unresolved = sf.unresolved_types ?? 0
            if (unresolved > 0) return (
              <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
                <strong>{unresolved} accounts</strong> have unknown types (short MYOB codes).
                Upload your <strong>Chart of Accounts</strong> file below to resolve them — it
                contains the Account Type column needed for accurate classification.
              </div>
            )
            return (
              <div className="mt-3 p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-800">
                <CheckCircle className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
                All account types resolved from your Chart of Accounts file. Accounts, customers,
                and vendors are accurately classified.
              </div>
            )
          })()}

          <div className="flex items-center gap-3 mt-4">
            <Button onClick={() => runStageAndReset("analyse", "Analysis complete")} disabled={loading || batch.accounts_total === 0}>
              <ArrowRight className="h-4 w-4" />
              Analyse Data
            </Button>
            <span className="text-xs text-gray-400">
              {batch.accounts_total} accounts · {contactSummary(batch)} · {batch.txn_total} transactions staged
            </span>
          </div>
        </PageSection>
      )}

      {/* Stage: Map Accounts */}
      {stage === "map_accounts" && (
        <PageSection title="Map Accounts">
          <div className="flex items-center gap-3 mb-4">
            {isImportAsNew ? (
              <>
                <Button onClick={() => runStageAndReset("contacts/auto-map", "Contact mapping complete")} disabled={loading}>
                  <ArrowRight className="h-4 w-4" />
                  Continue to Contacts
                </Button>
                <span className="text-xs text-gray-400">
                  {batch.accounts_total} accounts will be created as new Ledgius accounts
                </span>
              </>
            ) : (
              <>
                <Button onClick={() => runStage("accounts/auto-map", "Auto-mapping complete")} disabled={loading}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Auto-Map Accounts
                </Button>
                <span className="text-xs text-gray-400">
                  {batch.accounts_mapped} of {batch.accounts_total} mapped
                </span>
              </>
            )}
          </div>

          {isImportAsNew ? (
            <p className="text-sm text-gray-500 mb-4">
              All {batch.accounts_total} source accounts will be imported as new Ledgius accounts.
              Existing default accounts with no transactions will be retired.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-4">
              Review how source accounts map to your Ledgius chart of accounts.
              Auto-mapped accounts show a confidence score. Click the mapping column to change.
            </p>
          )}

          {stagingAccounts.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Source Code</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-56">→ Map to Ledgius Account</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-16">Conf</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Skip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {stagingAccounts.map((acct, i) => (
                    <tr key={acct.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                      <td className="px-3 py-2 font-mono text-xs">{acct.source_code}</td>
                      <td className="px-3 py-2">{acct.source_name}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{acct.source_type ?? "—"}</td>
                      <td className="px-3 py-1.5">
                        <Combobox
                          options={[
                            { value: -1, label: "➕ Create New Account" },
                            ...accountOptions,
                          ]}
                          value={acct.mapped_to_code ? accountOptions.find(o => o.label.startsWith(acct.mapped_to_code!))?.value ?? null : null}
                          onChange={(v) => {
                            if (v === -1) {
                              updateAccountMapping(acct.id, null, acct.source_code, "create")
                            } else if (v) {
                              const opt = accountOptions.find(o => o.value === v)
                              updateAccountMapping(acct.id, Number(v), opt?.label.split(" — ")[0] ?? "", "manual")
                            }
                          }}
                          placeholder="Select account..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={acct.mapping_status === "auto" ? "success" : acct.mapping_status === "manual" ? "info" : acct.mapping_status === "create" ? "warning" : acct.mapping_status === "skip" ? "default" : "default"}>
                          {acct.mapping_status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {acct.confidence > 0 ? `${(acct.confidence * 100).toFixed(0)}%` : "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={acct.mapping_status === "skip"}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateAccountMapping(acct.id, null, "", "skip")
                            } else {
                              updateAccountMapping(acct.id, null, "", "pending")
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isImportAsNew && (
            <div className="flex items-center gap-3 mt-4">
              <Button onClick={() => runStageAndReset("contacts/auto-map", "Contact mapping complete")} disabled={loading}>
                <ArrowRight className="h-4 w-4" />
                Continue to Contacts
              </Button>
            </div>
          )}
        </PageSection>
      )}

      {/* Stage: Map Contacts */}
      {stage === "map_contacts" && (
        <PageSection title="Map Contacts">
          <div className="flex items-center gap-3 mb-4">
            <Button onClick={() => runStageAndReset("preview", "Preview ready")} disabled={loading}>
              <ArrowRight className="h-4 w-4" />
              Generate Preview
            </Button>
            <span className="text-xs text-gray-400">
              {isImportAsNew
                ? `${batch.contacts_total} contacts will be created`
                : `${batch.contacts_mapped} of ${batch.contacts_total} mapped`}
            </span>
          </div>

          {isImportAsNew ? (
            <p className="text-sm text-gray-500 mb-4">
              {batch.contacts_total} contacts extracted from transaction data will be created as new Ledgius contacts.
            </p>
          ) : (
            <p className="text-sm text-gray-500 mb-4">
              Review contact mappings. Contacts matched by ABN or name similarity.
              Use the dropdown to map to an existing contact or leave as "Create New".
            </p>
          )}

          {stagingContacts.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Code</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">ABN</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-56">→ Map to Ledgius Contact</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-16">Conf</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {stagingContacts.map((ct, i) => (
                    <tr key={ct.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                      <td className="px-3 py-2">{ct.source_name}</td>
                      <td className="px-3 py-2 font-mono text-xs">{ct.source_code ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{ct.source_type ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{ct.source_abn ?? "—"}</td>
                      <td className="px-3 py-1.5">
                        <Combobox
                          options={[
                            { value: -1, label: "➕ Create New Contact" },
                            ...contactOptions,
                          ]}
                          value={ct.mapped_to_id ?? null}
                          onChange={async (v) => {
                            if (!batch) return
                            try {
                              await api.patch(`/import/batches/${batch.id}/contacts`, {
                                staging_id: ct.id,
                                mapped_to_id: v === -1 ? null : v ? Number(v) : null,
                                mapping_status: v === -1 ? "create" : v ? "manual" : "pending",
                              })
                              const cts = await api.get<StagingContact[]>(`/import/batches/${batch.id}/contacts`)
                              setStagingContacts(cts)
                              await refreshBatch()
                            } catch (err: unknown) {
                              feedback.error("Contact mapping failed", err instanceof Error ? err.message : "")
                            }
                          }}
                          placeholder="Select contact..."
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={ct.mapping_status === "auto" ? "success" : ct.mapping_status === "create" ? "info" : ct.mapping_status === "manual" ? "info" : "default"}>
                          {ct.mapping_status === "create" ? "new" : ct.mapping_status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {ct.confidence > 0 ? `${(ct.confidence * 100).toFixed(0)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isImportAsNew && (
            <div className="flex items-center gap-3 mt-4">
              <Button onClick={() => runStageAndReset("preview", "Preview ready")} disabled={loading}>
                <ArrowRight className="h-4 w-4" />
                Generate Preview
              </Button>
            </div>
          )}
        </PageSection>
      )}

      {/* Stage: Preview */}
      {stage === "preview" && (
        <PageSection title="Import Preview">
          <div className="flex items-center gap-3 mb-4">
            <Button onClick={() => runStageAndReset("commit", "Import committed successfully!")} disabled={loading || isCommitted}>
              Commit Import
            </Button>
            <span className="text-xs text-gray-400">This will write all data to the live ledger. This action cannot be undone.</span>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Review totals before committing. Source and target totals should match.
          </p>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Source Totals</h4>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-gray-500 text-right">Debits</dt>
                <dd className="font-mono"><MoneyValue amount={batch.source_debit_total ?? "0"} /></dd>
                <dt className="text-gray-500 text-right">Credits</dt>
                <dd className="font-mono"><MoneyValue amount={batch.source_credit_total ?? "0"} /></dd>
              </dl>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Target Totals</h4>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-gray-500 text-right">Debits</dt>
                <dd className="font-mono"><MoneyValue amount={batch.target_debit_total ?? "0"} /></dd>
                <dt className="text-gray-500 text-right">Credits</dt>
                <dd className="font-mono"><MoneyValue amount={batch.target_credit_total ?? "0"} /></dd>
              </dl>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 mb-6">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Import Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Accounts</span>
                <p className="font-semibold">{batch.accounts_mapped} mapped · {batch.accounts_new} new</p>
              </div>
              <div>
                <span className="text-gray-500">Customers &amp; Vendors</span>
                <p className="font-semibold">{batch.contacts_mapped} mapped · {batch.contacts_new} new</p>
              </div>
              <div>
                <span className="text-gray-500">Transactions</span>
                <p className="font-semibold">
                  {batch.txn_imported} ready
                  {batch.txn_skipped > 0 && <span className="text-amber-600"> · {batch.txn_skipped} duplicates (will be skipped)</span>}
                </p>
              </div>
            </div>
          </div>

        </PageSection>
      )}

      {/* Stage: Commit / Verify */}
      {(stage === "commit" || stage === "verify") && (
        <PageSection title={batch.status === "verified" ? "Import Complete" : "Verification"}>
          {batch.status === "committed" && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <Button onClick={() => runStageAndReset("verify", "Verification complete")} disabled={loading}>
                  Run Verification
                </Button>
              </div>
              <div className="flex items-start gap-3 mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Import committed successfully</p>
                  <p className="text-green-700 mt-0.5">
                    {batch.accounts_new} accounts · {batch.contacts_new} customers &amp; vendors · {batch.txn_imported} transactions
                  </p>
                </div>
              </div>
            </>
          )}

          {batch.status === "verified" && (
            <>
              <div className="flex items-start gap-3 mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-green-800">
                    {batch.verified ? "All verification checks passed" : "Verification completed with warnings"}
                  </p>
                  <p className="text-green-700 mt-0.5">
                    {batch.accounts_new} accounts created · {batch.contacts_new} customers &amp; vendors created · {batch.txn_imported} transactions imported
                  </p>
                </div>
              </div>

              {/* Post-import tasks checklist */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <h4 className="text-xs font-semibold text-amber-700 uppercase mb-3">Post-Import Checklist</h4>
                <p className="text-sm text-amber-600 mb-3">Complete these manual tasks to finalise the migration:</p>
                <ul className="space-y-2">
                  <PostImportTask>Review new customers and vendors — verify ABNs, email addresses, and payment terms</PostImportTask>
                  <PostImportTask>Reconcile bank account balances against latest bank statements</PostImportTask>
                  <PostImportTask>Run a trial balance report and compare with source system</PostImportTask>
                  <PostImportTask>Verify aged receivables and aged payables match source reports</PostImportTask>
                </ul>
              </div>
            </>
          )}

          {batch.status === "failed" && (
            <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-red-800">Import failed — all changes rolled back</p>
                <p className="text-red-700 mt-0.5">{batch.error_message}</p>
              </div>
            </div>
          )}
        </PageSection>
      )}
    </PageShell>
  )
}

// ── Helpers ──

function contactSummary(batch: ImportBatch): string {
  const sf = batch.source_files?.find(f => f.customers !== undefined)
  const hasUnresolved = batch.source_files?.some(f => (f.unresolved_types ?? 0) > 0)
  // Only show customer/vendor split if account types are fully resolved.
  if (sf && !hasUnresolved) return `${sf.customers} customers · ${sf.vendors} vendors`
  return `${batch.contacts_total} contacts`
}

// ── Sub-components ──

function PostImportTask({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  return (
    <li className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="mt-1 shrink-0"
      />
      <span className={`text-sm ${checked ? "text-gray-400 line-through" : "text-amber-700"}`}>{children}</span>
    </li>
  )
}

interface ImportBatchSummary {
  id: number
  source_system: string
  status: string
  accounts_total: number
  contacts_total: number
  txn_total: number
  txn_imported: number
  started_at: string | null
  created_by_name: string | null
  source_files: { name: string; type: string; rows: number }[]
}

function DropZone({
  label,
  onFileSelected,
  optional,
  hint,
  compact,
}: {
  label: string
  onFileSelected: (file: File) => void
  optional?: boolean
  hint?: string
  compact?: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    onFileSelected(f)
  }, [onFileSelected])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }


  if (compact) {
    return (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
          dragOver ? "border-primary-400 bg-primary-50"
            : file ? "border-green-300 bg-green-50"
            : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-gray-900">{label}</p>
            {optional && <Badge variant="default" className="text-[10px] px-1.5 py-0">optional</Badge>}
          </div>
          <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] hover:bg-gray-200 cursor-pointer transition-colors shrink-0">
            <Upload className="h-2.5 w-2.5" />
            Choose
            <input ref={inputRef} type="file" accept=".csv,.txt" onChange={handleChange} className="hidden" />
          </label>
        </div>
        {file ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
            <span className="text-[10px] text-green-700 font-mono truncate">{file.name}</span>
          </div>
        ) : (
          <p className="text-[10px] text-gray-400 text-center">or drag &amp; drop</p>
        )}
      </div>
    )
  }

  // Full-width variant for "Single File Import"
  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`rounded-lg border-2 border-dashed p-4 transition-colors ${
        dragOver ? "border-primary-400 bg-primary-50"
          : file ? "border-green-300 bg-green-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`rounded-full p-2 shrink-0 ${file ? "bg-green-100" : "bg-gray-100"}`}>
          {file
            ? <CheckCircle className="h-5 w-5 text-green-500" />
            : <Upload className="h-5 w-5 text-gray-400" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {label}
            {optional && <span className="ml-2 text-xs font-normal text-gray-400">Optional</span>}
          </p>
          {file ? (
            <p className="text-xs text-green-700 font-mono mt-0.5 truncate">{file.name} — {(file.size / 1024).toFixed(0)} KB</p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">{hint ?? "Drop a file here or click Choose"}</p>
          )}
        </div>
        <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 cursor-pointer transition-colors shrink-0">
          <Upload className="h-3 w-3" />
          Choose
          <input ref={inputRef} type="file" accept=".csv,.txt" onChange={handleChange} className="hidden" />
        </label>
      </div>
    </div>
  )
}

function RecentImports() {
  const [batches, setBatches] = useState<ImportBatchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<ImportBatchSummary[]>("/import/batches")
      setBatches(data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load import history")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBatches() }, [fetchBatches])

  const statusBadge = (status: string) => {
    const variant = status === "verified" ? "success"
      : status === "committed" ? "info"
      : status === "failed" ? "danger"
      : status === "cancelled" ? "default"
      : "warning"
    return <Badge variant={variant}>{status}</Badge>
  }

  return (
    <PageSection
      title="Recent Imports"
      actions={
        <Button variant="ghost" size="sm" onClick={fetchBatches} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      {loading ? (
        <Skeleton variant="table" rows={3} columns={7} />
      ) : error ? (
        <InlineAlert variant="error">{error}</InlineAlert>
      ) : batches.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No previous imports</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Files</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Accounts</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Contacts</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Imported By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {batches.map((b) => (
                <tr key={b.id}>
                  <td className="px-3 py-2 text-xs">{b.started_at ? <DateValue value={b.started_at} /> : "—"}</td>
                  <td className="px-3 py-2 text-xs uppercase font-medium">{b.source_system}</td>
                  <td className="px-3 py-2 text-xs text-right tabular-nums">{b.source_files?.length ?? 0}</td>
                  <td className="px-3 py-2 text-xs text-right tabular-nums">{b.accounts_total}</td>
                  <td className="px-3 py-2 text-xs text-right tabular-nums">{b.contacts_total}</td>
                  <td className="px-3 py-2 text-xs text-right tabular-nums">{b.txn_imported}</td>
                  <td className="px-3 py-2">{statusBadge(b.status)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{b.created_by_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageSection>
  )
}

