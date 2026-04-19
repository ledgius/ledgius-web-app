// Spec references: R-0068, A-0038.
import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell, PageSection } from "@/components/layout"
import { Button, Skeleton } from "@/components/primitives"
import { DateValue, StatusPill } from "@/components/financial"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
import { api } from "@/shared/lib/api"
import { ArrowLeft, Upload, Users, Building2, FlaskConical } from "lucide-react"

interface Tenant {
  id: string
  slug: string
  display_name: string
  legal_name: string | null
  trading_name: string | null
  abn: string | null
  status: string
  is_test: boolean
  business_type: string | null
  timezone: string
  fiscal_year_start_month: number
  gst_registered: boolean
  logo_path: string | null
  logo_type: string | null
  contact_email: string | null
  contact_phone: string | null
  contact_website: string | null
  billing_street: string | null
  billing_city: string | null
  billing_state: string | null
  billing_postcode: string | null
  billing_country: string | null
  plan_id: number | null
  trial_ends_at: string | null
  created_at: string
}

interface TenantMembership {
  id: string
  role: string
  user: { id: string; email: string; display_name: string; status: string }
}

const inputCls = "w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"

export function TenantDetailPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const feedback = useFeedback()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["platform", "tenants", id],
    queryFn: () => api.get<{ tenant: Tenant; users: TenantMembership[] }>(`/platform/tenants/${id}`),
    enabled: !!id,
  })

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Tenant | null>(null)

  const startEdit = () => {
    if (data?.tenant) {
      setForm({ ...data.tenant })
      setEditing(true)
    }
  }

  const updateTenant = useMutation({
    mutationFn: (tenant: Tenant) => api.put(`/platform/tenants/${tenant.id}`, tenant),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "tenants", id] })
      feedback.success("Tenant updated")
      setEditing(false)
    },
    onError: (err: Error) => feedback.error("Update failed", err.message),
  })

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("logo", file)
      return fetch(`/api/v1/platform/tenants/${id}/logo`, {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      }).then(r => r.json())
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "tenants", id] })
      feedback.success("Logo uploaded")
    },
    onError: () => feedback.error("Logo upload failed"),
  })

  const tenant = data?.tenant
  const users = data?.users ?? []
  const t = editing ? form! : tenant

  const header = (
    <div>
      <button type="button" onClick={() => navigate("/platform/tenants")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-1">
        <ArrowLeft className="h-3 w-3" /> Back to Tenants
      </button>
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">{tenant?.display_name ?? "Tenant"}</h1>
        {tenant?.is_test && <span className="inline-flex items-center gap-1 text-xs text-amber-600"><FlaskConical className="h-3 w-3" />Test</span>}
        {tenant && <StatusPill status={tenant.status} semantic={tenant.status === "active" ? "success" : "muted"} className="text-xs" />}
      </div>
      <p className="text-sm text-gray-500 font-mono">{tenant?.slug}</p>
      <div className="flex items-center gap-2 mt-3">
        {editing ? (
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button loading={updateTenant.isPending} onClick={() => form && updateTenant.mutate(form)}>Save Changes</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={startEdit}>Edit</Button>
        )}
      </div>
    </div>
  )

  if (isLoading || !t) {
    return <PageShell header={header}><Skeleton className="h-64" /></PageShell>
  }

  return (
    <PageShell header={header}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <PageSection title="Identity">
            <div className="space-y-3">
              <Field label="Display Name" value={t.display_name} editing={editing} onChange={v => setForm({...form!, display_name: v})} />
              <Field label="Legal Name" value={t.legal_name ?? ""} editing={editing} onChange={v => setForm({...form!, legal_name: v || null})} />
              <Field label="Trading Name" value={t.trading_name ?? ""} editing={editing} onChange={v => setForm({...form!, trading_name: v || null})} placeholder="Appears in app header and on invoices" />
              <Field label="ABN" value={t.abn ?? ""} editing={editing} onChange={v => setForm({...form!, abn: v || null})} placeholder="XX XXX XXX XXX" />
              <Field label="Business Type" value={t.business_type ?? ""} editing={editing} onChange={v => setForm({...form!, business_type: v || null})} placeholder="e.g. Agriculture, Health & Beauty" />
            </div>
          </PageSection>

          <PageSection title="Contact Details">
            <p className="text-xs text-gray-400 mb-3">Appears on invoices and customer communications.</p>
            <div className="space-y-3">
              <Field label="Email" value={t.contact_email ?? ""} editing={editing} onChange={v => setForm({...form!, contact_email: v || null})} type="email" />
              <Field label="Phone" value={t.contact_phone ?? ""} editing={editing} onChange={v => setForm({...form!, contact_phone: v || null})} type="tel" />
              <Field label="Website" value={t.contact_website ?? ""} editing={editing} onChange={v => setForm({...form!, contact_website: v || null})} type="url" />
            </div>
          </PageSection>

          <PageSection title="Billing Address">
            <p className="text-xs text-gray-400 mb-3">Appears on invoices as the business address.</p>
            <div className="space-y-3">
              <Field label="Street" value={t.billing_street ?? ""} editing={editing} onChange={v => setForm({...form!, billing_street: v || null})} />
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
                <Field label="City / Suburb" value={t.billing_city ?? ""} editing={editing} onChange={v => setForm({...form!, billing_city: v || null})} />
                <Field label="State" value={t.billing_state ?? ""} editing={editing} onChange={v => setForm({...form!, billing_state: v || null})} placeholder="VIC" />
                <Field label="Postcode" value={t.billing_postcode ?? ""} editing={editing} onChange={v => setForm({...form!, billing_postcode: v || null})} placeholder="3000" />
              </div>
            </div>
          </PageSection>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <PageSection title="Branding">
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                {t.logo_path ? (
                  <img src={`/data/${t.logo_path}`} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Building2 className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-700 font-medium">{t.trading_name || t.display_name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {t.logo_path ? `${t.logo_type?.toUpperCase()} logo uploaded` : "No logo uploaded"}
                </p>
                <p className="text-xs text-gray-400">SVG preferred. Also accepts PNG, JPEG, WebP.</p>
                <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  Upload Logo
                  <input
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) uploadLogo.mutate(file)
                    }}
                  />
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              The logo with trading name appears in the top-left of the app header.
              Logo, trading name, contact details, and billing address appear on invoices.
            </p>
          </PageSection>

          <PageSection title="Settings">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Timezone" value={t.timezone} editing={editing} onChange={v => setForm({...form!, timezone: v})} />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Financial Year Start</label>
                  {editing ? (
                    <select value={form!.fiscal_year_start_month} onChange={e => setForm({...form!, fiscal_year_start_month: parseInt(e.target.value)})} className={inputCls}>
                      <option value={1}>January</option><option value={4}>April</option><option value={7}>July</option><option value={10}>October</option>
                    </select>
                  ) : (
                    <p className="text-sm text-gray-800 py-1.5">{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][t.fiscal_year_start_month - 1]}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={t.gst_registered} disabled={!editing} onChange={e => editing && setForm({...form!, gst_registered: e.target.checked})}
                  className="rounded border-gray-300 text-primary-600" />
                <span className="text-sm text-gray-700">GST Registered</span>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={t.is_test} disabled={!editing} onChange={e => editing && setForm({...form!, is_test: e.target.checked})}
                  className="rounded border-gray-300 text-primary-600" />
                <span className="text-sm text-gray-700">Test tenant (not billed)</span>
              </div>
            </div>
          </PageSection>

          <PageSection title={`Users (${users.length})`}>
            {users.length === 0 ? (
              <p className="text-sm text-gray-400">No users assigned</p>
            ) : (
              <div className="space-y-2">
                {users.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-800">{m.user.display_name}</p>
                        <p className="text-xs text-gray-400">{m.user.email}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{m.role}</span>
                  </div>
                ))}
              </div>
            )}
          </PageSection>

          <PageSection title="Metadata">
            <div className="text-xs text-gray-500 space-y-1">
              <p>Created: <DateValue value={t.created_at} format="long" className="text-gray-700" /></p>
              <p>Slug: <span className="font-mono text-gray-700">{t.slug}</span></p>
              <p>ID: <span className="font-mono text-gray-400">{t.id}</span></p>
            </div>
          </PageSection>
        </div>
      </div>
    </PageShell>
  )
}

// ── Reusable field component ──

function Field({ label, value, editing, onChange, type = "text", placeholder }: {
  label: string; value: string; editing: boolean
  onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {editing ? (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
      ) : (
        <p className="text-sm text-gray-800 py-1.5">{value || <span className="text-gray-400">—</span>}</p>
      )}
    </div>
  )
}
