// Spec references: R-0068 (PA-030 through PA-039), R-0069 (PP-029, PP-050 through PP-052), A-0038.
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel, Skeleton } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
import { api } from "@/shared/lib/api"
import {
  Pencil, Check, Crown, ChevronUp, ChevronDown, Eye, Settings,
  ArrowRight, Minus, Globe, Plus, X
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

// --- Types ---

interface Feature {
  id: number
  slug: string
  name: string
  description: string
  markup_description?: string
  category: string
  sort_order: number
}

interface PlanFeature {
  slug: string
  name: string
  description: string
  markup_description?: string
  category: string
  enabled: boolean
  limit_value: string | null
}

interface PlanFeatureAssignment {
  feature_id: number
  enabled: boolean
  limit_value: string | null
}

interface PricingPlan {
  id: number
  slug: string
  name: string
  description: string
  price_monthly: number
  price_annually: number
  currency: string
  sort_order: number
  is_popular: boolean
  max_users: number | null
  max_employees: number | null
  status: string
  inherits_from_plan_id: number | null
  tagline: string | null
  feature_bullets: string | null
  badge_text: string | null
  cta_text: string | null
  features: PlanFeature[]
}

interface RegionalFeature {
  slug: string
  name: string
  description: string
  markup_description?: string
  category: string
  enabled: boolean
  limit_value?: string | null
}

interface RegionalPlan {
  name: string
  slug: string
  tagline: string
  badge?: string
  monthly_price: number
  annual_price: number
  currency: string
  currency_symbol: string
  tax_note?: string
  savings_pct: number
  feature_description: string
  feature_bullets: string
  features: RegionalFeature[]
  inherits_from?: string
  inherited_features?: RegionalFeature[]
  additional_features?: RegionalFeature[]
  competitive_context?: string
  cta_text: string
  cta_url: string
  sort_order: number
  is_popular: boolean
  max_users?: number | null
}

interface RegionalPricingResponse {
  region: string
  plans: RegionalPlan[]
  partner_plan?: RegionalPlan
}

// --- Page ---

type TabMode = "manage" | "preview"

export function PricingPlansPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])
  const feedback = useFeedback()
  const qc = useQueryClient()
  const [tab, setTab] = useState<TabMode>("manage")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { data: plans, isLoading } = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: () => api.get<PricingPlan[]>("/platform/plans"),
  })

  const { data: allFeatures } = useQuery({
    queryKey: ["platform", "features"],
    queryFn: () => api.get<Feature[]>("/platform/features"),
  })

  const savePlanFeatures = useMutation({
    mutationFn: ({ planId, features }: { planId: number; features: PlanFeatureAssignment[] }) =>
      api.put(`/platform/plans/${planId}/features`, { features }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "plans"] })
      qc.invalidateQueries({ queryKey: ["pricing", "regional"] })
      feedback.success("Features updated")
    },
    onError: (err: Error) => feedback.error("Failed to save features", err.message),
  })

  const createPlan = useMutation({
    mutationFn: (plan: Partial<PricingPlan>) => api.post("/platform/plans", plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "plans"] })
      feedback.success("Plan created")
      setShowCreateForm(false)
    },
    onError: (err: Error) => feedback.error("Create failed", err.message),
  })

  const updatePlan = useMutation({
    mutationFn: (plan: PricingPlan) => api.put(`/platform/plans/${plan.id}`, plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "plans"] })
      qc.invalidateQueries({ queryKey: ["pricing", "regional"] })
      feedback.success("Plan updated")
      setEditingId(null)
    },
    onError: (err: Error) => feedback.error("Update failed", err.message),
  })

  const reorderPlans = useMutation({
    mutationFn: (planIds: number[]) => api.put("/platform/plans/reorder", { plan_ids: planIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "plans"] })
      qc.invalidateQueries({ queryKey: ["pricing", "regional"] })
      feedback.success("Plan order updated")
    },
    onError: (err: Error) => feedback.error("Reorder failed", err.message),
  })

  const sorted = [...(plans ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  const moveUp = (index: number) => {
    if (index === 0) return
    const ids = sorted.map(p => p.id)
    ;[ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]
    reorderPlans.mutate(ids)
  }
  const moveDown = (index: number) => {
    if (index >= sorted.length - 1) return
    const ids = sorted.map(p => p.id)
    ;[ids[index], ids[index + 1]] = [ids[index + 1], ids[index]]
    reorderPlans.mutate(ids)
  }

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Pricing Plans</h1>
          <span className="text-sm text-gray-400">{(plans ?? []).length} plans</span>
        </div>
        <p className="text-sm text-gray-500">Configure plans, features, pricing, and preview how they render</p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={() => { setTab("manage"); setShowCreateForm(true) }}>
          <Plus className="h-3.5 w-3.5" />Add Plan
        </Button>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setTab("manage")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
              tab === "manage" ? "bg-primary-50 text-primary-700" : "bg-white text-gray-500 hover:text-gray-700"
            )}
          >
            <Settings className="h-3.5 w-3.5" />Manage
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200",
              tab === "preview" ? "bg-primary-50 text-primary-700" : "bg-white text-gray-500 hover:text-gray-700"
            )}
          >
            <Eye className="h-3.5 w-3.5" />Preview
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {tab === "manage" ? (
        <ManageTab
          plans={sorted}
          isLoading={isLoading}
          editingId={editingId}
          onEdit={id => setEditingId(editingId === id ? null : id)}
          onSave={plan => updatePlan.mutate(plan)}
          showCreateForm={showCreateForm}
          onShowCreate={() => setShowCreateForm(true)}
          onCancelCreate={() => setShowCreateForm(false)}
          onCreate={plan => createPlan.mutate(plan)}
          creating={createPlan.isPending}
          saving={updatePlan.isPending}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          allPlans={plans ?? []}
          allFeatures={allFeatures ?? []}
          onSaveFeatures={(planId, features) => savePlanFeatures.mutate({ planId, features })}
          savingFeatures={savePlanFeatures.isPending}
        />
      ) : (
        <PreviewTab />
      )}
    </PageShell>
  )
}

// --- Manage Tab ---

function ManageTab({ plans, isLoading, editingId, onEdit, onSave, saving, onMoveUp, onMoveDown, allPlans, showCreateForm, onShowCreate, onCancelCreate, onCreate, creating, allFeatures, onSaveFeatures, savingFeatures }: {
  plans: PricingPlan[]; isLoading: boolean; editingId: number | null
  onEdit: (id: number) => void; onSave: (plan: PricingPlan) => void
  saving: boolean; onMoveUp: (i: number) => void; onMoveDown: (i: number) => void
  allPlans: PricingPlan[]
  showCreateForm: boolean; onShowCreate: () => void; onCancelCreate: () => void
  onCreate: (plan: Partial<PricingPlan>) => void; creating: boolean
  allFeatures: Feature[]; onSaveFeatures: (planId: number, features: PlanFeatureAssignment[]) => void; savingFeatures: boolean
}) {
  return (
    <>
      <InfoPanel title="Pricing plan management" storageKey="platform-plans-info" collapsible>
        <p>Plans define pricing, feature access, and trial periods. Changes to pricing do not retroactively affect existing subscribers. Marketing metadata (tagline, bullets, badge) drives the pricing cards on ledgius.com. Use the Preview tab to see how plans render on the public pricing page.</p>
      </InfoPanel>

      {showCreateForm && <CreatePlanForm onCancel={onCancelCreate} onCreate={onCreate} saving={creating} allPlans={allPlans} />}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" />
        </div>
      ) : plans.length === 0 && !showCreateForm ? (
        <div className="text-center py-12">
          <p className="text-sm text-gray-400 mb-4">No pricing plans configured</p>
          <Button variant="primary" size="sm" onClick={onShowCreate}><Plus className="h-3.5 w-3.5" />Create your first plan</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={index}
              total={plans.length}
              isEditing={editingId === plan.id}
              onEdit={() => onEdit(plan.id)}
              onSave={onSave}
              saving={saving}
              onMoveUp={() => onMoveUp(index)}
              onMoveDown={() => onMoveDown(index)}
              allPlans={allPlans}
              allFeatures={allFeatures}
              onSaveFeatures={onSaveFeatures}
              savingFeatures={savingFeatures}
            />
          ))}
        </div>
      )}
    </>
  )
}

// --- Plan Card (Manage) ---

function PlanCard({ plan, index, total, isEditing, onEdit, onSave, saving, onMoveUp, onMoveDown, allPlans, allFeatures, onSaveFeatures, savingFeatures }: {
  plan: PricingPlan; index: number; total: number; isEditing: boolean
  onEdit: () => void; onSave: (plan: PricingPlan) => void; saving: boolean
  onMoveUp: () => void; onMoveDown: () => void; allPlans: PricingPlan[]
  allFeatures: Feature[]; onSaveFeatures: (planId: number, features: PlanFeatureAssignment[]) => void; savingFeatures: boolean
}) {
  const [edit, setEdit] = useState(plan)
  const bullets = (() => { try { return JSON.parse(plan.feature_bullets ?? "[]") as string[] } catch { return [] } })()
  const enabledFeatures = plan.features.filter(f => f.enabled)
  const parentPlan = plan.inherits_from_plan_id
    ? allPlans.find(p => p.id === plan.inherits_from_plan_id)
    : null

  return (
    <div className={cn(
      "border rounded-lg bg-white flex flex-col",
      plan.is_popular ? "border-primary-400 ring-2 ring-primary-100" : "border-gray-200"
    )}>
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {plan.badge_text && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 mb-1">
                <Crown className="h-3 w-3" />{plan.badge_text}
              </span>
            )}
            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            {plan.tagline && <p className="text-xs text-gray-500 mt-0.5">{plan.tagline}</p>}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {/* Reorder */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={onMoveUp}
                disabled={index === 0}
                className="p-0.5 text-gray-400 hover:text-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={index >= total - 1}
                className="p-0.5 text-gray-400 hover:text-primary-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <button type="button" onClick={onEdit} className="p-1.5 rounded text-gray-400 hover:text-primary-500 hover:bg-gray-50 transition-colors" title="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Pricing */}
        <div className="mt-3">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">${plan.price_monthly.toFixed(0)}</span>
            <span className="text-sm text-gray-500">/mo</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">or ${plan.price_annually.toFixed(0)}/year</p>
        </div>

        {/* Status + Limits */}
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span className={cn(
            "px-2 py-0.5 rounded-full font-medium",
            plan.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
          )}>{plan.status}</span>
          {plan.max_users && <span>{plan.max_users} users</span>}
          {plan.max_employees && <span>{plan.max_employees} employees</span>}
          <span className="text-gray-300">#{plan.sort_order}</span>
        </div>

        {/* Inheritance */}
        {parentPlan && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
            <ArrowRight className="h-3 w-3" />
            Everything in <span className="font-semibold">{parentPlan.name}</span> plus:
          </div>
        )}
      </div>

      {/* Feature Bullets */}
      {bullets.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100">
          <ul className="space-y-1.5">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />{b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Features */}
      <div className="px-5 py-3 border-t border-gray-100 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Features ({enabledFeatures.length})</p>
        <div className="flex flex-wrap gap-1">
          {enabledFeatures.map((f) => (
            <span key={f.slug} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {f.name}{f.limit_value && <span className="text-gray-400 ml-1">· {f.limit_value}</span>}
            </span>
          ))}
          {enabledFeatures.length === 0 && <span className="text-xs text-gray-400">No features assigned</span>}
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input type="text" value={edit.name} onChange={e => setEdit({...edit, name: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
              <input type="text" value={edit.slug} onChange={e => setEdit({...edit, slug: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm font-mono" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Monthly ($)</label>
              <input type="number" step="0.01" value={edit.price_monthly} onChange={e => setEdit({...edit, price_monthly: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm tabular-nums" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Yearly ($)</label>
              <input type="number" step="0.01" value={edit.price_annually} onChange={e => setEdit({...edit, price_annually: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm tabular-nums" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Tagline</label>
            <input type="text" value={edit.tagline ?? ""} onChange={e => setEdit({...edit, tagline: e.target.value || null})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="For sole traders getting started" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Badge</label>
              <input type="text" value={edit.badge_text ?? ""} onChange={e => setEdit({...edit, badge_text: e.target.value || null})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="Most Popular" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={edit.status} onChange={e => setEdit({...edit, status: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Inherits From</label>
              <select
                value={edit.inherits_from_plan_id ?? ""}
                onChange={e => setEdit({...edit, inherits_from_plan_id: e.target.value ? parseInt(e.target.value) : null})}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="">None (base plan)</option>
                {allPlans.filter(p => p.id !== plan.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">CTA Text</label>
              <input type="text" value={edit.cta_text ?? ""} onChange={e => setEdit({...edit, cta_text: e.target.value || null})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="Start Free Trial" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Max Users</label>
              <input type="number" value={edit.max_users ?? ""} onChange={e => setEdit({...edit, max_users: e.target.value ? parseInt(e.target.value) : null})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="Unlimited" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Max Employees</label>
              <input type="number" value={edit.max_employees ?? ""} onChange={e => setEdit({...edit, max_employees: e.target.value ? parseInt(e.target.value) : null})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="Unlimited" /></div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={edit.is_popular} onChange={e => setEdit({...edit, is_popular: e.target.checked})} className="rounded border-gray-300 text-primary-600" />
              Mark as popular
            </label>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={onEdit}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => onSave(edit)} loading={saving}><Check className="h-3.5 w-3.5" />Save Plan</Button>
          </div>

          {/* Feature assignments */}
          <FeatureEditor
            planId={plan.id}
            currentFeatures={plan.features}
            allFeatures={allFeatures}
            onSave={onSaveFeatures}
            saving={savingFeatures}
          />
        </div>
      )}
    </div>
  )
}

// --- Feature Editor ---

function FeatureEditor({ planId, currentFeatures, allFeatures, onSave, saving }: {
  planId: number; currentFeatures: PlanFeature[]; allFeatures: Feature[]
  onSave: (planId: number, features: PlanFeatureAssignment[]) => void; saving: boolean
}) {
  // Build initial state from current plan features.
  const [assignments, setAssignments] = useState<Record<number, { enabled: boolean; limit_value: string }>>(() => {
    const map: Record<number, { enabled: boolean; limit_value: string }> = {}
    for (const f of allFeatures) {
      const current = currentFeatures.find(cf => cf.slug === f.slug)
      map[f.id] = { enabled: !!current?.enabled, limit_value: current?.limit_value ?? "" }
    }
    return map
  })

  const toggle = (id: number) => setAssignments(prev => ({
    ...prev, [id]: { ...prev[id], enabled: !prev[id]?.enabled }
  }))

  const setLimit = (id: number, val: string) => setAssignments(prev => ({
    ...prev, [id]: { ...prev[id], limit_value: val }
  }))

  const handleSave = () => {
    const features: PlanFeatureAssignment[] = Object.entries(assignments)
      .filter(([, v]) => v.enabled)
      .map(([id, v]) => ({
        feature_id: parseInt(id),
        enabled: true,
        limit_value: v.limit_value || null,
      }))
    onSave(planId, features)
  }

  // Group features by category.
  const categories = allFeatures.reduce<Record<string, Feature[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f)
    return acc
  }, {})

  const enabledCount = Object.values(assignments).filter(a => a.enabled).length

  return (
    <div className="pt-3 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Features ({enabledCount} / {allFeatures.length})
        </p>
        <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
          <Check className="h-3.5 w-3.5" />Save Features
        </Button>
      </div>

      {allFeatures.length === 0 ? (
        <p className="text-xs text-gray-400">No features defined. Seed features via V1.11 migration.</p>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {Object.entries(categories).sort(([a], [b]) => a.localeCompare(b)).map(([category, features]) => (
            <div key={category}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{category}</p>
              <div className="space-y-1">
                {features.sort((a, b) => a.sort_order - b.sort_order).map(f => {
                  const a = assignments[f.id] ?? { enabled: false, limit_value: "" }
                  return (
                    <div key={f.id} className="flex items-center gap-2 group">
                      <input
                        type="checkbox"
                        checked={a.enabled}
                        onChange={() => toggle(f.id)}
                        className="rounded border-gray-300 text-primary-600 h-3.5 w-3.5"
                      />
                      <span className={cn("text-xs flex-1", a.enabled ? "text-gray-700" : "text-gray-400")}>{f.name}</span>
                      {a.enabled && (
                        <input
                          type="text"
                          value={a.limit_value}
                          onChange={e => setLimit(f.id, e.target.value)}
                          placeholder="no limit"
                          className="w-24 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Create Plan Form ---

function CreatePlanForm({ onCancel, onCreate, saving, allPlans }: {
  onCancel: () => void; onCreate: (plan: Partial<PricingPlan>) => void; saving: boolean; allPlans: PricingPlan[]
}) {
  const [form, setForm] = useState({
    name: "", slug: "", description: "", price_monthly: 0, price_annually: 0,
    currency: "AUD", status: "draft" as string, is_popular: false, tagline: "",
    badge_text: "", cta_text: "Start Free Trial", max_users: null as number | null,
    max_employees: null as number | null, inherits_from_plan_id: null as number | null,
    sort_order: (allPlans.length + 1),
  })

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  return (
    <div className="border border-primary-200 rounded-lg bg-primary-50/30 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">New Pricing Plan</h3>
        <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Plan Name</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value, slug: autoSlug(e.target.value)})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="e.g. Starter" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
              <input type="text" value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm font-mono" placeholder="starter" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Description / Tagline</label>
            <input type="text" value={form.tagline} onChange={e => setForm({...form, tagline: e.target.value, description: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="For sole traders getting started" /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Monthly ($)</label>
              <input type="number" step="0.01" value={form.price_monthly} onChange={e => setForm({...form, price_monthly: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm tabular-nums" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Yearly ($)</label>
              <input type="number" step="0.01" value={form.price_annually} onChange={e => setForm({...form, price_annually: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm tabular-nums" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option>
              </select></div>
          </div>
        </div>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Inherits From</label>
            <select value={form.inherits_from_plan_id ?? ""} onChange={e => setForm({...form, inherits_from_plan_id: e.target.value ? parseInt(e.target.value) : null})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">None (base plan)</option>
              {allPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Badge</label>
            <input type="text" value={form.badge_text} onChange={e => setForm({...form, badge_text: e.target.value})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="Most Popular" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Max Users</label>
              <input type="number" value={form.max_users ?? ""} onChange={e => setForm({...form, max_users: e.target.value ? parseInt(e.target.value) : null})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="∞" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Max Employees</label>
              <input type="number" value={form.max_employees ?? ""} onChange={e => setForm({...form, max_employees: e.target.value ? parseInt(e.target.value) : null})} className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm" placeholder="∞" /></div>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input type="checkbox" checked={form.is_popular} onChange={e => setForm({...form, is_popular: e.target.checked})} className="rounded border-gray-300 text-primary-600" />
            Mark as popular
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={() => onCreate(form)} loading={saving} disabled={!form.name || !form.slug}>
          <Check className="h-3.5 w-3.5" />Create Plan
        </Button>
      </div>
    </div>
  )
}

// --- Preview Tab ---

function PreviewTab() {
  const [region, setRegion] = useState("au")
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly")

  const { data, isLoading } = useQuery({
    queryKey: ["pricing", "regional", region],
    queryFn: () => api.get<RegionalPricingResponse>(`/pricing?region=${region}`),
  })

  return (
    <>
      <InfoPanel title="Pricing page preview" storageKey="platform-plans-preview-info" collapsible>
        <p>This is how the pricing plans render on the public website (ledgius.com). Changes saved in the Manage tab are reflected here immediately. Select a region to preview country-specific pricing.</p>
      </InfoPanel>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400" />
            <select
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="bg-white border border-gray-300 rounded px-2 py-1.5 text-sm"
            >
              <option value="au">Australia (AUD)</option>
              <option value="nz">New Zealand (NZD)</option>
              <option value="uk">United Kingdom (GBP)</option>
              <option value="us">United States (USD)</option>
            </select>
          </div>
        </div>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors",
              billing === "monthly" ? "bg-primary-50 text-primary-700" : "bg-white text-gray-500 hover:text-gray-700"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={cn(
              "px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-200",
              billing === "annual" ? "bg-primary-50 text-primary-700" : "bg-white text-gray-500 hover:text-gray-700"
            )}
          >
            Annual{data?.plans?.[0] && <span className="ml-1 text-green-600 text-xs font-semibold">Save up to {Math.max(...(data.plans.map(p => p.savings_pct)))}%</span>}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" />
        </div>
      ) : !data || data.plans.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-12">
          No pricing data found for region "{region}". Add content in the Manage tab or seed pricing_plan_content.
        </div>
      ) : (
        <>
          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.plans.map(plan => (
              <PreviewCard key={plan.slug} plan={plan} billing={billing} />
            ))}
          </div>

          {/* Partner Section */}
          {data.partner_plan && (
            <div className="mt-8 border border-gray-200 rounded-xl bg-gradient-to-r from-slate-50 to-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{data.partner_plan.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{data.partner_plan.tagline}</p>
                  {data.partner_plan.feature_description && (
                    <p className="text-sm text-gray-500 mt-3">{data.partner_plan.feature_description}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900">Free</span>
                  <p className="text-xs text-gray-500">practice console</p>
                </div>
              </div>
              <button className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                {data.partner_plan.cta_text || "Join Partner Program"}
              </button>
            </div>
          )}

          {/* Footer Note */}
          <p className="text-center text-xs text-gray-400 mt-6">
            All prices in {data.plans[0]?.currency ?? "AUD"}. {data.plans[0]?.tax_note ?? "Prices include GST."}
          </p>
        </>
      )}
    </>
  )
}

// --- Preview Card ---

function PreviewCard({ plan, billing }: { plan: RegionalPlan; billing: "monthly" | "annual" }) {
  const price = billing === "monthly" ? plan.monthly_price : plan.annual_price / 12
  const hasInheritance = plan.inherits_from && plan.additional_features && plan.additional_features.length > 0
  const features = plan.features?.filter(f => f.enabled) ?? []

  // Parse feature_bullets if present.
  const bullets: Array<{ label: string; included: boolean }> = (() => {
    try { return JSON.parse(plan.feature_bullets || "[]") } catch { return [] }
  })()

  return (
    <div className={cn(
      "border rounded-xl bg-white flex flex-col relative overflow-hidden transition-transform hover:scale-[1.01]",
      plan.is_popular ? "border-primary-400 ring-2 ring-primary-200 shadow-lg" : "border-gray-200 shadow-sm"
    )}>
      {/* Badge */}
      {plan.badge && (
        <div className="bg-primary-500 text-white text-center py-1.5 text-xs font-semibold tracking-wide">
          {plan.badge}
        </div>
      )}

      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
        {plan.tagline && <p className="text-sm text-gray-500 mt-1">{plan.tagline}</p>}

        <div className="mt-4">
          <div className="flex items-baseline gap-1">
            <span className="text-sm text-gray-500">{plan.currency_symbol}</span>
            <span className="text-4xl font-bold text-gray-900">{price.toFixed(0)}</span>
            <span className="text-sm text-gray-500">/mo</span>
          </div>
          {billing === "annual" && plan.savings_pct > 0 && (
            <p className="text-xs text-green-600 font-medium mt-1">
              Save {plan.savings_pct}% with annual billing
            </p>
          )}
          {billing === "monthly" && plan.annual_price > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              or {plan.currency_symbol}{(plan.annual_price / 12).toFixed(0)}/mo billed annually
            </p>
          )}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-4">
        <button className={cn(
          "w-full py-2.5 rounded-lg text-sm font-semibold transition-colors",
          plan.is_popular
            ? "bg-primary-500 text-white hover:bg-primary-600"
            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
        )}>
          {plan.cta_text || "Start Free Trial"}
        </button>
      </div>

      {/* Inheritance banner */}
      {hasInheritance && (
        <div className="mx-6 mb-3 flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          <span>Everything in <span className="font-semibold capitalize">{plan.inherits_from}</span> plus:</span>
        </div>
      )}

      {/* Feature list */}
      <div className="px-6 pb-6 flex-1 border-t border-gray-100 pt-4">
        {plan.feature_description && (
          <p className="text-xs text-gray-500 mb-3">{plan.feature_description}</p>
        )}

        {/* If we have inheritance, show additional features only */}
        {hasInheritance ? (
          <ul className="space-y-2">
            {plan.additional_features!.map(f => (
              <li key={f.slug} className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>{f.name}{f.limit_value && <span className="text-gray-400 ml-1">({f.limit_value})</span>}</span>
              </li>
            ))}
          </ul>
        ) : features.length > 0 ? (
          <ul className="space-y-2">
            {features.map(f => (
              <li key={f.slug} className="flex items-start gap-2 text-sm text-gray-700">
                <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>{f.name}{f.limit_value && <span className="text-gray-400 ml-1">({f.limit_value})</span>}</span>
              </li>
            ))}
          </ul>
        ) : bullets.length > 0 ? (
          <ul className="space-y-2">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {b.included
                  ? <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  : <Minus className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />}
                <span className={b.included ? "text-gray-700" : "text-gray-400"}>{b.label}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">No features configured</p>
        )}
      </div>

      {/* Competitive context */}
      {plan.competitive_context && (
        <div className="px-6 pb-4 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-400 italic">{plan.competitive_context}</p>
        </div>
      )}
    </div>
  )
}
