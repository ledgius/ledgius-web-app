// Spec references: R-0068.
//
// Tenant self-admin page — business owners manage their own
// branding, contact details, and billing address.
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InfoPanel, Skeleton } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
import { api } from "@/shared/lib/api"
import { Building2, Upload } from "lucide-react"

interface BusinessSettings {
  id: string
  display_name: string
  legal_name: string | null
  trading_name: string | null
  abn: string | null
  gst_registered: boolean
  gst_registration_date: string | null
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
}

const inputCls = "w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"

export function BusinessSettingsPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])
  const feedback = useFeedback()
  const qc = useQueryClient()

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings", "business"],
    queryFn: () => api.get<BusinessSettings>("/settings/business"),
  })

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<BusinessSettings | null>(null)

  const startEdit = () => {
    if (settings) {
      setForm({ ...settings })
      setEditing(true)
    }
  }

  const save = useMutation({
    mutationFn: (data: BusinessSettings) => api.put("/settings/business", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "business"] })
      feedback.success("Business settings saved")
      setEditing(false)
    },
    onError: (err: Error) => feedback.error("Save failed", err.message),
  })

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("logo", file)
      return fetch("/api/v1/settings/business/logo", {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      }).then(r => r.json())
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "business"] })
      feedback.success("Logo uploaded")
    },
    onError: () => feedback.error("Logo upload failed"),
  })

  const s = editing ? form! : settings

  const header = (
    <div>
      <h1 className="text-xl font-semibold text-gray-900">Business Settings</h1>
      <p className="text-sm text-gray-500">Manage your business identity, branding, and contact details</p>
      <div className="flex items-center gap-2 mt-3">
        {editing ? (
          <>
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            <Button loading={save.isPending} onClick={() => form && save.mutate(form)}>Save Changes</Button>
          </>
        ) : (
          <Button variant="secondary" onClick={startEdit}>Edit</Button>
        )}
      </div>
    </div>
  )

  if (isLoading || !s) {
    return <PageShell header={header}><Skeleton className="h-64" /></PageShell>
  }

  return (
    <PageShell header={header}>
      <InfoPanel title="Your business details" storageKey="business-settings-info" collapsible>
        <p>Your trading name and logo appear in the top-left of the app. Your trading name, contact details, and billing address appear on invoices sent to customers.</p>
      </InfoPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left */}
        <div className="space-y-6">
          <PageSection title="Business Identity">
            <div className="space-y-3">
              <Field label="Business Name" value={s.display_name} editing={editing} onChange={v => setForm({...form!, display_name: v})} />
              <Field label="Legal Name" value={s.legal_name ?? ""} editing={editing} onChange={v => setForm({...form!, legal_name: v || null})} placeholder="As registered with ASIC" />
              <Field label="Trading Name" value={s.trading_name ?? ""} editing={editing} onChange={v => setForm({...form!, trading_name: v || null})} placeholder="Shown in app header and on invoices" />
              <Field label="ABN" value={s.abn ?? ""} editing={editing} onChange={v => setForm({...form!, abn: v || null})} placeholder="XX XXX XXX XXX" />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={s.gst_registered} disabled={!editing}
                  onChange={e => editing && setForm({...form!, gst_registered: e.target.checked})}
                  className="rounded border-gray-300 text-primary-600" />
                <span className="text-sm text-gray-700">GST Registered</span>
              </div>
            </div>
          </PageSection>

          <PageSection title="Contact Details">
            <p className="text-xs text-gray-400 mb-3">These details appear on your invoices and customer communications.</p>
            <div className="space-y-3">
              <Field label="Email" value={s.contact_email ?? ""} editing={editing} onChange={v => setForm({...form!, contact_email: v || null})} type="email" placeholder="billing@yourbusiness.com" />
              <Field label="Phone" value={s.contact_phone ?? ""} editing={editing} onChange={v => setForm({...form!, contact_phone: v || null})} type="tel" placeholder="03 9000 0000" />
              <Field label="Website" value={s.contact_website ?? ""} editing={editing} onChange={v => setForm({...form!, contact_website: v || null})} type="url" placeholder="www.yourbusiness.com.au" />
            </div>
          </PageSection>

          <PageSection title="Billing Address">
            <p className="text-xs text-gray-400 mb-3">Your registered business address. Appears on invoices.</p>
            <div className="space-y-3">
              <Field label="Street Address" value={s.billing_street ?? ""} editing={editing} onChange={v => setForm({...form!, billing_street: v || null})} />
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
                <Field label="City / Suburb" value={s.billing_city ?? ""} editing={editing} onChange={v => setForm({...form!, billing_city: v || null})} />
                <Field label="State" value={s.billing_state ?? ""} editing={editing} onChange={v => setForm({...form!, billing_state: v || null})} placeholder="VIC" />
                <Field label="Postcode" value={s.billing_postcode ?? ""} editing={editing} onChange={v => setForm({...form!, billing_postcode: v || null})} placeholder="3000" />
              </div>
            </div>
          </PageSection>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <PageSection title="Logo & Branding">
            <div className="flex items-start gap-4">
              <div className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                {s.logo_path ? (
                  <img src={`/data/${s.logo_path}`} alt="Business logo" className="max-w-full max-h-full object-contain p-2" />
                ) : (
                  <Building2 className="h-10 w-10 text-gray-300" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">{s.trading_name || s.display_name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {s.logo_path ? `${s.logo_type?.toUpperCase()} logo uploaded` : "No logo uploaded yet"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">SVG recommended for best quality. Also accepts PNG, JPEG, WebP.</p>
                <label className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-md cursor-pointer bg-white hover:bg-gray-50 transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  {s.logo_path ? "Replace Logo" : "Upload Logo"}
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
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-1">Preview — App Header</p>
              <div className="flex items-center gap-2 bg-white rounded px-3 py-2 border border-gray-200">
                {s.logo_path ? (
                  <img src={`/data/${s.logo_path}`} alt="" className="h-6 w-6 object-contain" />
                ) : (
                  <Building2 className="h-5 w-5 text-gray-400" />
                )}
                <span className="text-sm font-semibold text-gray-800">{s.trading_name || s.display_name}</span>
              </div>
            </div>
          </PageSection>
        </div>
      </div>
    </PageShell>
  )
}

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
