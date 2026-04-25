// Spec references: R-0071 (RT-020, RT-030), T-0033-12.
//
// Report generation page — select a template, fill parameters
// (date range, entity), preview rendered HTML, download PDF.

import { useState, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { PageShell } from "@/components/layout"
import { Button, Badge } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
import { api } from "@/shared/lib/api"
import { ArrowLeft, Eye, FileDown, Printer } from "lucide-react"
import { getAuthToken } from "@/shared/lib/auth"

interface ReportTemplate {
  id: string
  name: string
  description: string
  data_source: string
  category: string
  is_default: boolean
  version: number
}

// Parameter schemas per data source — what inputs each source needs
const dataSourceParams: Record<string, { key: string; label: string; type: "date" | "text" }[]> = {
  profit_loss:        [{ key: "start_date", label: "Start Date", type: "date" }, { key: "end_date", label: "End Date", type: "date" }],
  cash_flow:          [{ key: "start_date", label: "Start Date", type: "date" }, { key: "end_date", label: "End Date", type: "date" }],
  balance_sheet:      [{ key: "as_at_date", label: "As at Date", type: "date" }],
  trial_balance:      [{ key: "as_at_date", label: "As at Date", type: "date" }],
  invoice:            [{ key: "invoice_id", label: "Invoice ID", type: "text" }],
  customer_statement: [{ key: "customer_id", label: "Customer ID", type: "text" }, { key: "start_date", label: "Start Date", type: "date" }, { key: "end_date", label: "End Date", type: "date" }],
  bas_worksheet:      [{ key: "start_date", label: "Period Start", type: "date" }, { key: "end_date", label: "Period End", type: "date" }],
}

export function ReportGeneratePage() {
  usePageHelp(undefined)
  usePagePolicies(["reporting"])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const feedback = useFeedback()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [params, setParams] = useState<Record<string, string>>({})
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const { data: template, isLoading } = useQuery({
    queryKey: ["report-template", id],
    queryFn: () => api.get<ReportTemplate>(`/reports/templates/${id}`),
    enabled: !!id,
  })

  const paramSchema = template ? (dataSourceParams[template.data_source] ?? []) : []

  const setParam = (key: string, value: string) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  // Default dates to current FY quarter
  const today = new Date()
  const fyStart = today.getMonth() >= 6
    ? `${today.getFullYear()}-07-01`
    : `${today.getFullYear() - 1}-07-01`

  const getParam = (key: string) => {
    if (params[key]) return params[key]
    if (key === "start_date") return fyStart
    if (key === "end_date") return today.toISOString().split("T")[0]
    if (key === "as_at_date") return today.toISOString().split("T")[0]
    return ""
  }

  const generatePreview = useCallback(async () => {
    if (!template) return
    setGenerating(true)
    try {
      const effectiveParams: Record<string, string> = {}
      for (const p of paramSchema) {
        effectiveParams[p.key] = getParam(p.key)
      }
      const result = await api.post<{ html: string }>("/reports/generate", {
        template_id: id,
        params: effectiveParams,
        format: "html",
      })
      setPreviewHtml(result.html)
    } catch {
      feedback.error("Generation failed")
    } finally {
      setGenerating(false)
    }
  }, [id, template, paramSchema, params, feedback])

  const downloadPDF = useCallback(async () => {
    if (!template) return
    setGenerating(true)
    try {
      const effectiveParams: Record<string, string> = {}
      for (const p of paramSchema) {
        effectiveParams[p.key] = getParam(p.key)
      }
      const token = getAuthToken()
      const resp = await fetch("/api/v1/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ template_id: id, params: effectiveParams, format: "pdf" }),
      })
      if (!resp.ok) {
        const err = await resp.text()
        feedback.error("PDF failed", err)
        return
      }
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${template.name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      feedback.success("PDF downloaded")
    } catch {
      feedback.error("PDF download failed")
    } finally {
      setGenerating(false)
    }
  }, [id, template, paramSchema, params, feedback])

  const handlePrint = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print()
    }
  }, [])

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => navigate("/reports/templates")} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />Templates
          </button>
        </div>
        <h1 className="text-xl font-semibold text-gray-900">
          Generate Report{template ? `: ${template.name}` : ""}
        </h1>
        {template && (
          <p className="text-sm text-gray-500 mt-0.5">
            Data source: <Badge variant="outline">{template.data_source}</Badge>
            {" · "}v{template.version}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={generatePreview} disabled={generating}>
          <Eye className="h-4 w-4 mr-1.5" />{generating ? "Generating..." : "Preview"}
        </Button>
        <Button onClick={downloadPDF} variant="secondary" disabled={generating}>
          <FileDown className="h-4 w-4 mr-1.5" />PDF
        </Button>
        {previewHtml && (
          <Button onClick={handlePrint} variant="secondary">
            <Printer className="h-4 w-4 mr-1.5" />Print
          </Button>
        )}
      </div>
    </div>
  )

  if (isLoading || !template) {
    return <PageShell header={header} loading>{null}</PageShell>
  }

  return (
    <PageShell header={header}>
      {/* Parameters */}
      {paramSchema.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Report Parameters</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {paramSchema.map(p => (
              <div key={p.key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{p.label}</label>
                <input
                  type={p.type}
                  value={getParam(p.key)}
                  onChange={e => setParam(p.key, e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No parameters hint */}
      {paramSchema.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-sm text-gray-500">
          This data source uses sample data. Click <strong>Preview</strong> to generate.
        </div>
      )}

      {/* Preview */}
      {previewHtml ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white" style={{ minHeight: 600 }}>
          <iframe
            ref={iframeRef}
            srcDoc={previewHtml}
            className="w-full border-none"
            style={{ height: 800 }}
            title="Report Preview"
          />
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 text-sm" style={{ minHeight: 400 }}>
          {paramSchema.length > 0
            ? "Fill in the parameters above and click Preview to generate the report."
            : "Click Preview to generate the report."}
        </div>
      )}
    </PageShell>
  )
}
