// Spec references: R-0068 (PA-030 through PA-039), A-0038.
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel, Skeleton } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
import { api } from "@/shared/lib/api"
import { Pencil, Check, Crown } from "lucide-react"
import { cn } from "@/shared/lib/utils"

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
  tagline: string | null
  feature_bullets: string | null
  badge_text: string | null
  cta_text: string | null
  features: Array<{
    slug: string
    name: string
    category: string
    enabled: boolean
    limit_value: string | null
  }>
}

export function PricingPlansPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])
  const feedback = useFeedback()
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)

  const { data: plans, isLoading } = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: () => api.get<PricingPlan[]>("/platform/plans"),
  })

  const updatePlan = useMutation({
    mutationFn: (plan: PricingPlan) => api.put(`/platform/plans/${plan.id}`, plan),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "plans"] })
      feedback.success("Plan updated")
      setEditingId(null)
    },
    onError: (err: Error) => feedback.error("Update failed", err.message),
  })

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Pricing Plans</h1>
        <span className="text-sm text-gray-400">{(plans ?? []).length} plans</span>
      </div>
      <p className="text-sm text-gray-500">Configure plans, features, and pricing for tenants and the public website</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Pricing plan management" storageKey="platform-plans-info" collapsible>
        <p>Plans define pricing, feature access, and trial periods. Changes to pricing do not retroactively affect existing subscribers. Marketing metadata (tagline, bullets, badge) drives the pricing cards on ledgius.com.</p>
      </InfoPanel>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (plans ?? []).length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-12">No pricing plans configured</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(plans ?? []).sort((a, b) => a.sort_order - b.sort_order).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isEditing={editingId === plan.id}
              onEdit={() => setEditingId(editingId === plan.id ? null : plan.id)}
              onSave={(updated) => updatePlan.mutate(updated)}
              saving={updatePlan.isPending}
            />
          ))}
        </div>
      )}
    </PageShell>
  )
}

function PlanCard({ plan, isEditing, onEdit, onSave, saving }: {
  plan: PricingPlan; isEditing: boolean; onEdit: () => void
  onSave: (plan: PricingPlan) => void; saving: boolean
}) {
  const [edit, setEdit] = useState(plan)
  const bullets = (() => { try { return JSON.parse(plan.feature_bullets ?? "[]") as string[] } catch { return [] } })()
  const enabledFeatures = plan.features.filter(f => f.enabled)

  return (
    <div className={cn(
      "border rounded-lg bg-white flex flex-col",
      plan.is_popular ? "border-primary-400 ring-2 ring-primary-100" : "border-gray-200"
    )}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            {plan.badge_text && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 mb-1">
                <Crown className="h-3 w-3" />{plan.badge_text}
              </span>
            )}
            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            {plan.tagline && <p className="text-xs text-gray-500 mt-0.5">{plan.tagline}</p>}
          </div>
          <button type="button" onClick={onEdit} className="p-1.5 rounded text-gray-400 hover:text-primary-500 hover:bg-gray-50 transition-colors" title="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">${plan.price_monthly.toFixed(0)}</span>
            <span className="text-sm text-gray-500">/mo</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">or ${plan.price_annually.toFixed(0)}/year</p>
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span className={cn("px-2 py-0.5 rounded-full font-medium", plan.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")}>{plan.status}</span>
          {plan.max_users && <span>{plan.max_users} users</span>}
          {plan.max_employees && <span>{plan.max_employees} employees</span>}
        </div>
      </div>

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

      <div className="px-5 py-3 border-t border-gray-100 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Features ({enabledFeatures.length})</p>
        <div className="flex flex-wrap gap-1">
          {enabledFeatures.map((f) => (
            <span key={f.slug} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
              {f.name}{f.limit_value && <span className="text-gray-400 ml-1">({f.limit_value})</span>}
            </span>
          ))}
          {enabledFeatures.length === 0 && <span className="text-xs text-gray-400">No features assigned</span>}
        </div>
      </div>

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
          <div className="flex items-center gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={onEdit}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => onSave(edit)} loading={saving}><Check className="h-3.5 w-3.5" />Save</Button>
          </div>
        </div>
      )}
    </div>
  )
}
