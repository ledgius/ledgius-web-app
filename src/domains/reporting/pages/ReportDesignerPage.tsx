// Spec references: R-0071 (RT-001, RT-010, RT-030), A-0042, T-0033-07, T-0033-10, T-0033-13.
import { useState, useCallback, useRef, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Puck, type Data } from "@measured/puck"
import "@measured/puck/puck.css"
import { reportPuckConfig } from "../components/reportComponents"
import { ReportEditorProvider } from "../components/FieldSlugPicker"
import { api } from "@/shared/lib/api"
import { useFeedback } from "@/components/feedback"
import { getAuthToken } from "@/shared/lib/auth"
import { cn } from "@/shared/lib/utils"
import { ArrowLeft, Eye, EyeOff, FileDown, Printer, History, X } from "lucide-react"

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
  updated_at: string
}

interface TemplateVersion {
  id: string
  template_id: string
  version: number
  template_json: Data
  created_by: string | null
  created_at: string
}

export function ReportDesignerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const feedback = useFeedback()
  const qc = useQueryClient()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [splitView, setSplitView] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [generating, setGenerating] = useState(false)

  const { data: template, isLoading } = useQuery({
    queryKey: ["report-template", id],
    queryFn: () => api.get<ReportTemplate>(`/reports/templates/${id}`),
    enabled: !!id,
  })

  const { data: versions } = useQuery({
    queryKey: ["report-template-versions", id],
    queryFn: () => api.get<TemplateVersion[]>(`/reports/templates/${id}/versions`),
    enabled: !!id && showVersions,
  })

  const saveTemplate = useMutation({
    mutationFn: (data: Data) => api.put(`/reports/templates/${id}`, {
      ...template,
      template_json: data,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-template", id] })
      qc.invalidateQueries({ queryKey: ["report-template-versions", id] })
      feedback.success("Template saved")
      if (splitView) refreshPreview()
    },
    onError: (err: Error) => feedback.error("Save failed", err.message),
  })

  const revertToVersion = useMutation({
    mutationFn: (version: TemplateVersion) => api.put(`/reports/templates/${id}`, {
      ...template,
      template_json: version.template_json,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report-template", id] })
      qc.invalidateQueries({ queryKey: ["report-template-versions", id] })
      feedback.success("Reverted to previous version")
      setShowVersions(false)
    },
    onError: () => feedback.error("Revert failed"),
  })

  const refreshPreview = useCallback(async () => {
    if (!template) return
    setGenerating(true)
    try {
      const result = await api.post<{ html: string }>("/reports/generate", {
        template_id: id,
        format: "html",
      })
      setPreviewHtml(result.html)
    } catch {
      feedback.error("Preview failed")
    } finally {
      setGenerating(false)
    }
  }, [id, template, feedback])

  const downloadPDF = useCallback(async () => {
    if (!template) return
    setGenerating(true)
    try {
      const token = getAuthToken()
      const resp = await fetch("/api/v1/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
    } finally {
      setGenerating(false)
    }
  }, [id, template, feedback])

  const handlePrint = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print()
    }
  }, [])

  // Auto-refresh preview when entering split view
  useEffect(() => {
    if (splitView && !previewHtml) refreshPreview()
  }, [splitView])

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
          <button
            onClick={() => { setSplitView(!splitView); if (!splitView) refreshPreview() }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors",
              splitView ? "border-primary-400 bg-primary-50 text-primary-700" : "border-gray-300 hover:bg-gray-50"
            )}
            title={splitView ? "Close split preview" : "Split view with live preview"}
          >
            {splitView ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {splitView ? "Close Preview" : "Split Preview"}
          </button>
          <button onClick={downloadPDF} disabled={generating} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50">
            <FileDown className="h-3.5 w-3.5" />PDF
          </button>
          <button
            onClick={() => setShowVersions(!showVersions)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors",
              showVersions ? "border-primary-400 bg-primary-50 text-primary-700" : "border-gray-300 hover:bg-gray-50"
            )}
          >
            <History className="h-3.5 w-3.5" />History
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Puck Editor */}
        <div className={cn("flex-1 overflow-hidden", splitView && "w-1/2")}>
          <ReportEditorProvider dataSource={template.data_source}>
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
          </ReportEditorProvider>
        </div>

        {/* Split preview panel */}
        {splitView && (
          <div className="w-1/2 border-l border-gray-200 flex flex-col bg-gray-50">
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
              <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshPreview}
                  disabled={generating}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Refresh"}
                </button>
                {previewHtml && (
                  <button onClick={handlePrint} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700" title="Print">
                    <Printer className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            {previewHtml ? (
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="flex-1 w-full border-none bg-white"
                title="Report Preview"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                {generating ? "Generating preview..." : "Click Refresh to load preview"}
              </div>
            )}
          </div>
        )}

        {/* Version history panel */}
        {showVersions && (
          <div className="w-72 border-l border-gray-200 flex flex-col bg-white shrink-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 shrink-0">
              <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Version History</h2>
              <button onClick={() => setShowVersions(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Current version */}
              <div className="px-4 py-3 border-b border-gray-100 bg-primary-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary-800">v{template.version}</span>
                  <span className="text-[10px] text-primary-600 font-medium">Current</span>
                </div>
                <p className="text-[10px] text-primary-600 mt-0.5">
                  {new Date(template.updated_at ?? Date.now()).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* Past versions */}
              {versions && versions.length > 0 ? (
                versions.map(v => (
                  <div key={v.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 group">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700">v{v.version}</span>
                      <button
                        onClick={() => {
                          if (confirm(`Revert to version ${v.version}? This will create a new version with the old template content.`)) {
                            revertToVersion.mutate(v)
                          }
                        }}
                        className="text-[10px] text-gray-400 hover:text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Revert
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(v.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                ))
              ) : (
                <div className="px-4 py-6 text-xs text-gray-400 text-center">
                  {versions ? "No previous versions yet" : "Loading..."}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
