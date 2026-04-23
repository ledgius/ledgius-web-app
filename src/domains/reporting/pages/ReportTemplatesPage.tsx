// Spec references: R-0071 (RT-007, RT-009), T-0033-11.
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel, Skeleton } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
import { api } from "@/shared/lib/api"
import { Plus, FileText, Copy, Pencil, Trash2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface ReportTemplate {
  id: string
  name: string
  description: string
  data_source: string
  category: string
  is_default: boolean
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
}

interface DataSourceInfo {
  slug: string; name: string; description: string; category: string
}

const CATEGORIES: Record<string, string> = {
  financial: "Financial Reports",
  customer: "Customer Documents",
  vendor: "Vendor Documents",
  compliance: "Compliance",
  payroll: "Payroll",
  custom: "Custom",
}

export function ReportTemplatesPage() {
  usePageHelp(undefined)
  usePagePolicies(["reporting"])
  const navigate = useNavigate()
  const feedback = useFeedback()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data: templates, isLoading } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => api.get<ReportTemplate[]>("/reports/templates"),
  })

  const { data: dataSources } = useQuery({
    queryKey: ["report-data-sources"],
    queryFn: () => api.get<DataSourceInfo[]>("/reports/data-sources"),
  })

  const cloneTemplate = useMutation({
    mutationFn: (id: string) => api.post(`/reports/templates/${id}/clone`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report-templates"] }); feedback.success("Template cloned") },
    onError: (err: Error) => feedback.error("Clone failed", err.message),
  })

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => api.delete(`/reports/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["report-templates"] }); feedback.success("Template archived") },
    onError: (err: Error) => feedback.error("Delete failed", err.message),
  })

  const createTemplate = useMutation({
    mutationFn: (body: { name: string; data_source: string; category: string }) =>
      api.post<ReportTemplate>("/reports/templates", {
        ...body,
        template_json: { root: { props: { title: body.name } }, content: [], zones: {} },
      }),
    onSuccess: (tmpl) => {
      qc.invalidateQueries({ queryKey: ["report-templates"] })
      feedback.success("Template created")
      setShowCreate(false)
      navigate(`/reports/templates/${tmpl.id}/edit`)
    },
    onError: (err: Error) => feedback.error("Create failed", err.message),
  })

  const all = templates ?? []
  const grouped = all.reduce<Record<string, ReportTemplate[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t)
    return acc
  }, {})

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Report Templates</h1>
        <span className="text-sm text-gray-400">{all.length} templates</span>
      </div>
      <p className="text-sm text-gray-500">Design and manage report layouts</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5" />New Template
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Report template designer" storageKey="report-templates-info" collapsible>
        <p>Create custom report layouts with a visual drag-and-drop editor. Select data fields, position them on the canvas, and generate reports as HTML or PDF. Clone system defaults to get started quickly.</p>
      </InfoPanel>

      {showCreate && (
        <CreateTemplateForm
          dataSources={dataSources ?? []}
          onCancel={() => setShowCreate(false)}
          onCreate={body => createTemplate.mutate(body)}
          saving={createTemplate.isPending}
        />
      )}

      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      ) : all.length === 0 && !showCreate ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400 mb-4">No templates yet. Create your first report template.</p>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" />Create Template</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, templates]) => (
            <div key={category}>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {CATEGORIES[category] || category}
              </h2>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {templates.map((t, i) => (
                      <tr key={t.id} className={cn("group hover:bg-primary-50/30 transition-colors", i % 2 === 1 ? "bg-gray-50/50" : "")}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900">{t.name}</p>
                              {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                            </div>
                            {t.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">System</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{t.data_source}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">v{t.version}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!t.is_default && (
                              <button onClick={() => navigate(`/reports/templates/${t.id}/edit`)} className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1" title="Edit">
                                <Pencil className="h-3 w-3" />Edit
                              </button>
                            )}
                            <button onClick={() => cloneTemplate.mutate(t.id)} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1" title="Clone">
                              <Copy className="h-3 w-3" />Clone
                            </button>
                            {!t.is_default && (
                              <button onClick={() => deleteTemplate.mutate(t.id)} className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1" title="Archive">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}

function CreateTemplateForm({ dataSources, onCancel, onCreate, saving }: {
  dataSources: DataSourceInfo[]; onCancel: () => void
  onCreate: (body: { name: string; data_source: string; category: string }) => void; saving: boolean
}) {
  const [name, setName] = useState("")
  const [dataSource, setDataSource] = useState("")
  const [category, setCategory] = useState("custom")

  return (
    <div className="border border-primary-200 rounded-lg bg-primary-50/30 p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">New Report Template</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Template Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Custom P&L Report"
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data Source</label>
            <select value={dataSource} onChange={e => setDataSource(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm pr-8">
              <option value="">Select data source...</option>
              {dataSources.map(ds => <option key={ds.slug} value={ds.slug}>{ds.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm pr-8">
              {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => onCreate({ name, data_source: dataSource, category })}
            loading={saving} disabled={!name || !dataSource}>
            Create & Open Editor
          </Button>
        </div>
      </div>
    </div>
  )
}
