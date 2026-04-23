// Spec references: R-0071 (RT-001, RT-010), A-0042, T-0033-07.
import { useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Puck, type Data } from "@measured/puck"
import "@measured/puck/puck.css"
import { reportPuckConfig } from "../components/reportComponents"
import { api } from "@/shared/lib/api"
import { useFeedback } from "@/components/feedback"
import { ArrowLeft, Eye, FileDown } from "lucide-react"

interface ReportTemplate {
  id: string
  name: string
  description: string
  data_source: string
  category: string
  template_json: Data
  page_size: string
  page_orientation: string
  is_default: boolean
  version: number
}

export function ReportDesignerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const feedback = useFeedback()
  const qc = useQueryClient()
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  const { data: template, isLoading } = useQuery({
    queryKey: ["report-template", id],
    queryFn: () => api.get<ReportTemplate>(`/reports/templates/${id}`),
    enabled: !!id,
  })

  const saveTemplate = useMutation({
    mutationFn: (data: Data) => api.put(`/reports/templates/${id}`, {
      ...template,
      template_json: data,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-template", id] })
      feedback.success("Template saved")
    },
    onError: (err: Error) => feedback.error("Save failed", err.message),
  })

  const generatePreview = useCallback(async () => {
    if (!template) return
    try {
      const result = await api.post<{ html: string }>("/reports/generate", {
        template_id: id,
        format: "html",
      })
      setPreviewHtml(result.html)
    } catch {
      feedback.error("Preview failed")
    }
  }, [id, template, feedback])

  const downloadPDF = useCallback(async () => {
    if (!template) return
    try {
      const resp = await fetch("/api/v1/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: id, format: "pdf" }),
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
    }
  }, [id, template, feedback])

  if (isLoading || !template) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Loading template...</div>
  }

  if (template.is_default) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-gray-600">This is a system default template and cannot be edited directly.</p>
        <button onClick={() => navigate(-1)} className="text-primary-600 hover:text-primary-700 text-sm font-medium">Go back</button>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/reports/templates")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-3.5 w-3.5" />Templates
          </button>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm font-semibold text-gray-900">{template.name}</h1>
          <span className="text-xs text-gray-400">v{template.version} · {template.data_source}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generatePreview} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <Eye className="h-3.5 w-3.5" />Preview
          </button>
          <button onClick={downloadPDF} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            <FileDown className="h-3.5 w-3.5" />PDF
          </button>
        </div>
      </div>

      {/* Preview modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Report Preview</h2>
              <button onClick={() => setPreviewHtml(null)} className="text-xs text-gray-500 hover:text-gray-700">Close</button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="flex-1 w-full border-none"
              title="Report Preview"
            />
          </div>
        </div>
      )}

      {/* Puck Editor */}
      <div className="flex-1 overflow-hidden">
        <Puck
          config={reportPuckConfig as any}
          data={template.template_json || { root: { props: {} }, content: [], zones: {} }}
          onPublish={(data: Data) => saveTemplate.mutate(data)}
          headerTitle={template.name}
          renderHeader={({ children }: { children: React.ReactNode }) => (
            <div className="flex items-center gap-2">
              {children}
            </div>
          )}
        />
      </div>
    </div>
  )
}
