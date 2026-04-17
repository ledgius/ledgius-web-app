import { useState, useEffect, useCallback } from "react"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert } from "@/components/primitives"
import { StatusPill, DateValue } from "@/components/financial"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { api } from "@/shared/lib/api"
import { Download, Play, RefreshCw } from "lucide-react"

const ENTITY_OPTIONS = [
  { key: "account", label: "Chart of Accounts" },
  { key: "contact", label: "Contacts" },
  { key: "invoice", label: "Invoices (AR)" },
  { key: "bill", label: "Bills (AP)" },
  { key: "credit_note", label: "Credit Notes" },
  { key: "tax_rate", label: "Tax Rates" },
]

interface ExportRun {
  id: string
  status: string
  channel: string
  run_kind: string
  started_at: string
  completed_at?: string
  bundle_storage_key?: string
}

type ExportFormat = "xero" | "myob" | "csv"
const FORMAT_OPTIONS: { key: ExportFormat; label: string; description: string }[] = [
  { key: "xero", label: "Xero", description: "Xero-compatible CSV bundle for import into Xero" },
  { key: "myob", label: "MYOB", description: "MYOB-compatible export for AccountRight / AO" },
  { key: "csv", label: "Generic CSV", description: "Standard CSV files for any system or spreadsheet" },
]

export function ExportPage() {
  usePageHelp(pageHelpContent.dataExport)
  usePagePolicies(["export", "tax", "privacy", "compliance"])
  const [format, setFormat] = useState<ExportFormat>("xero")
  const [entities, setEntities] = useState<string[]>([])
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")
  const [lastResult, setLastResult] = useState<{ run_id: string; status: string; entity_counts: Record<string, number> } | null>(null)
  const [runs, setRuns] = useState<ExportRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true)
    try {
      const res = await api.get<ExportRun[]>("/export/xero/runs")
      setRuns(res ?? [])
    } catch {
      // ignore — runs list is supplementary
    } finally {
      setLoadingRuns(false)
    }
  }, [])

  useEffect(() => { loadRuns() }, [loadRuns])

  const toggleEntity = (key: string) => {
    setEntities(prev => prev.includes(key) ? prev.filter(e => e !== key) : [...prev, key])
  }

  const selectAll = () => setEntities(ENTITY_OPTIONS.map(e => e.key))
  const selectNone = () => setEntities([])

  const handleRun = async () => {
    if (format !== "xero") {
      setError(`${format.toUpperCase()} export is coming soon. Only Xero export is available in v1.`)
      return
    }
    setError("")
    setLastResult(null)
    setRunning(true)
    try {
      const res = await api.post<{ run_id: string; status: string; entity_counts: Record<string, number> }>(`/export/${format}/run`, {
        entity_types: entities.length > 0 ? entities : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      })
      setLastResult(res)
      loadRuns()
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { error?: string; status?: string; run_id?: string } } }
        if (axiosErr.response?.data?.status === "failed") {
          setLastResult({ run_id: axiosErr.response.data.run_id ?? "", status: "failed", entity_counts: {} })
          setError(axiosErr.response.data.error ?? "Export failed — check validation report")
        } else {
          setError(axiosErr.response?.data?.error ?? "Export failed")
        }
      } else {
        setError(err instanceof Error ? err.message : "Export failed")
      }
    } finally {
      setRunning(false)
    }
  }

  const handleDownload = async (runId: string) => {
    try {
      const res = await fetch(`/api/v1/export/xero/runs/${runId}/download`)
      if (!res.ok) throw new Error(`Download failed: ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `xero-export-${runId.slice(0, 8)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Download failed")
    }
  }

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Data Export</h1>
      <p className="text-sm text-gray-500 mt-0.5">Export your accounting data in a format compatible with external systems</p>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}

      <PageSection title="Export Format">
        <div className="flex gap-3">
          {FORMAT_OPTIONS.map(opt => {
            const selected = format === opt.key
            const brandStyles: Record<string, { border: string; bg: string; text: string }> = {
              xero:  { border: "border-[#13B5EA]", bg: "bg-[#13B5EA]/10", text: "text-[#0B7FA5]" },
              myob:  { border: "border-[#6D28D9]", bg: "bg-[#6D28D9]/10", text: "text-[#6D28D9]" },
              csv:   { border: "border-gray-400",   bg: "bg-gray-100",     text: "text-gray-700"  },
            }
            const brand = brandStyles[opt.key]
            return (
              <button
                key={opt.key}
                onClick={() => setFormat(opt.key)}
                className={`flex-1 text-left p-3 rounded-lg border-2 transition-colors ${selected ? `${brand.border} ${brand.bg}` : "border-gray-200 bg-white hover:border-gray-300"}`}
              >
                <span className={`text-sm font-semibold ${selected ? brand.text : "text-gray-900"}`}>{opt.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </button>
            )
          })}
        </div>
      </PageSection>

      <PageSection title="Entity Selection">
        <div className="space-y-3">
          <div className="flex gap-2 mb-2">
            <button onClick={selectAll} className="text-xs text-primary-600 hover:underline">Select all</button>
            <span className="text-gray-300">|</span>
            <button onClick={selectNone} className="text-xs text-primary-600 hover:underline">Clear</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ENTITY_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={entities.includes(opt.key)}
                  onChange={() => toggleEntity(opt.key)}
                  className="rounded border-gray-300"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400">Leave empty to export all entities</p>
        </div>
      </PageSection>

      <PageSection title="Date Range (optional)">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">Only applies to transactional entities (invoices, bills, credit notes). Master data is always exported in full.</p>
      </PageSection>

      <div className="flex gap-2 mt-4 mb-6">
        <Button onClick={handleRun} loading={running} className="flex items-center gap-2">
          <Play className="w-4 h-4" /> Run Export
        </Button>
      </div>

      {lastResult && (
        <PageSection title="Export Result">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <StatusPill status={lastResult.status === "completed" ? "posted" : lastResult.status === "failed" ? "overdue" : "draft"} />
              <span className="text-sm font-mono text-gray-500">{lastResult.run_id}</span>
            </div>
            {lastResult.entity_counts && Object.keys(lastResult.entity_counts).length > 0 && (
              <div className="flex flex-wrap gap-3 text-sm">
                {Object.entries(lastResult.entity_counts).map(([entity, count]) => (
                  <span key={entity} className="bg-gray-100 px-2 py-0.5 rounded">{entity}: {count}</span>
                ))}
              </div>
            )}
            {lastResult.status === "completed" && (
              <Button variant="secondary" onClick={() => handleDownload(lastResult.run_id)} className="flex items-center gap-2 mt-2">
                <Download className="w-4 h-4" /> Download Bundle
              </Button>
            )}
          </div>
        </PageSection>
      )}

      <PageSection title="Recent Exports">
        <div className="flex justify-end mb-2">
          <button onClick={loadRuns} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loadingRuns ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-gray-400">No exports yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 text-xs">
                  <th className="py-2 pr-4">Run ID</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Started</th>
                  <th className="py-2 pr-4">Completed</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{run.id.slice(0, 8)}</td>
                    <td className="py-2 pr-4">
                      <StatusPill status={run.status === "completed" ? "posted" : run.status === "failed" ? "overdue" : "draft"} />
                    </td>
                    <td className="py-2 pr-4"><DateValue value={run.started_at} format="short" /></td>
                    <td className="py-2 pr-4">{run.completed_at ? <DateValue value={run.completed_at} format="short" /> : <span className="text-gray-300">—</span>}</td>
                    <td className="py-2">
                      {run.status === "completed" && run.bundle_storage_key && (
                        <button onClick={() => handleDownload(run.id)} className="text-primary-600 hover:underline text-xs flex items-center gap-1">
                          <Download className="w-3 h-3" /> Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </PageShell>
  )
}
