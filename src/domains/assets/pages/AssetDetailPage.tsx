// Spec references: R-0062, A-0040, A-0041, T-0029.
import { useState, useMemo } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Pencil, Trash2, RotateCcw, Package, ArrowLeft } from "lucide-react"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InfoPanel, InlineAlert, Badge } from "@/components/primitives"
import { MoneyValue, DateValue, StatusPill } from "@/components/financial"
import { AuditTimeline, type AuditEvent } from "@/components/workflow"
import {
  useAsset,
  useAssetActivity,
  useUpdateAssetNonPosting,
  type Asset,
  type AssetStatus,
  type AssetActivityEntry,
} from "../hooks/useAssets"

const statusLabels: Record<AssetStatus, string> = {
  draft: "Draft",
  active: "Active",
  disposed: "Disposed",
  fully_depreciated: "Fully Depreciated",
  archived: "Archived",
}

const statusSemantic: Record<AssetStatus, React.ComponentProps<typeof StatusPill>["semantic"]> = {
  draft: "muted",
  active: "success",
  disposed: "muted",
  fully_depreciated: "warning",
  archived: "muted",
}

const methodLabels: Record<string, string> = {
  straight_line: "Straight Line",
  diminishing_value: "Diminishing Value",
  instant_writeoff: "Instant Write-off",
}

export function AssetDetailPage() {
  usePagePolicies(["account", "tax", "assets"])

  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: asset, isLoading, error } = useAsset(id)
  const { data: activity } = useAssetActivity(id)

  const [editing, setEditing] = useState(false)

  if (isLoading) {
    return (
      <PageShell header={<h1 className="text-xl">Loading…</h1>} loading>
        <></>
      </PageShell>
    )
  }
  if (error || !asset) {
    return (
      <PageShell header={<h1 className="text-xl font-semibold text-gray-900">Asset not found</h1>}>
        <InlineAlert variant="error">Could not load asset. It may have been removed.</InlineAlert>
        <div className="mt-3">
          <Link to="/assets" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to register
          </Link>
        </div>
      </PageShell>
    )
  }

  const events: AuditEvent[] = useMemo(
    () => (activity?.items ?? []).map(toAuditEvent),
    [activity],
  )

  const isActive = asset.status === "active" || asset.status === "fully_depreciated"
  const canDispose = isActive
  const canEdit = asset.status !== "archived"

  const header = (
    <div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <Link to="/assets" className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Register
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">{asset.name}</h1>
        <StatusPill status={statusLabels[asset.status]} semantic={statusSemantic[asset.status]} />
        {asset.category && (
          <span className="text-sm text-gray-500">{asset.category.name}</span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-0.5">
        Purchased <DateValue value={asset.purchase_date} format="short" />
        {" · "}
        <MoneyValue amount={asset.cost_ex_gst} currency="AUD" /> ex GST
      </p>
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Button variant="secondary" onClick={() => setEditing((v) => !v)} disabled={!canEdit}>
          <Pencil className="h-4 w-4" />
          {editing ? "Cancel edit" : "Edit details"}
        </Button>
        <Button
          variant="danger"
          onClick={() => navigate(`/assets/sell?assetId=${asset.id}`)}
          disabled={!canDispose}
          title={canDispose ? undefined : "Already disposed or archived"}
        >
          <Trash2 className="h-4 w-4" />
          Dispose
        </Button>
        <Button
          variant="secondary"
          disabled
          title="Available once at least one depreciation run exists (T-0032)"
        >
          <RotateCcw className="h-4 w-4" />
          Reverse last depreciation
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Working with this asset" storageKey="asset-detail-info" collapsible>
        <p>
          This page is the hub for everything about a single asset. Edit non-posting fields
          (name, description, business-use %) in-place; use <strong>Dispose</strong> when you sell
          or scrap it. Reclassifications, estimate changes and prior-period restatements arrive
          with the correction commands in a later task.
        </p>
      </InfoPanel>

      {editing && <EditPanel asset={asset} onClose={() => setEditing(false)} />}

      <PageSection title="Summary">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon={<Package className="h-4 w-4 text-gray-400" />}
            label="Cost (ex GST)"
            value={<MoneyValue amount={asset.cost_ex_gst} currency="AUD" />}
          />
          <SummaryCard
            label="GST"
            value={<MoneyValue amount={asset.gst_amount} currency="AUD" />}
          />
          <SummaryCard
            label="Accumulated Depreciation"
            value={<MoneyValue amount={asset.accumulated_depreciation} currency="AUD" />}
          />
          <SummaryCard
            label="Book Value"
            value={<MoneyValue amount={asset.book_value} currency="AUD" />}
          />
          <SummaryCard
            label="Method"
            value={methodLabels[asset.depreciation_method] ?? asset.depreciation_method}
          />
          <SummaryCard
            label="Useful Life"
            value={asset.useful_life_years ? `${asset.useful_life_years} years` : "—"}
          />
          <SummaryCard
            label="Residual"
            value={<MoneyValue amount={asset.residual_value} currency="AUD" />}
          />
          <SummaryCard
            label="Business Use %"
            value={asset.business_use_pct ? `${asset.business_use_pct}%` : "—"}
          />
        </div>
      </PageSection>

      {asset.description && (
        <PageSection title="Description">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{asset.description}</p>
        </PageSection>
      )}

      {asset.estimate_changes && asset.estimate_changes.length > 0 && (
        <PageSection title="Estimate history">
          <ul className="text-sm text-gray-700 space-y-1.5">
            {asset.estimate_changes.map((c, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <Badge variant="default">{c.field}</Badge>
                <span className="text-gray-600">
                  {String(c.old)} → <strong>{String(c.new)}</strong>
                  {" effective "}
                  <DateValue value={c.effective_from} format="short" />
                  {c.reason ? ` — ${c.reason}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </PageSection>
      )}

      <PageSection title="Activity">
        <AuditTimeline events={events} />
      </PageSection>
    </PageShell>
  )
}

// ── Edit panel (non-posting fields) ─────────────────────────────────────────

function EditPanel({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const update = useUpdateAssetNonPosting(asset.id)
  const [name, setName] = useState(asset.name)
  const [description, setDescription] = useState(asset.description ?? "")
  const [businessUsePct, setBusinessUsePct] = useState(asset.business_use_pct ?? "")
  const [error, setError] = useState("")

  const handleSave = async () => {
    setError("")
    const payload: Parameters<typeof update.mutateAsync>[0] = {}
    if (name !== asset.name) payload.name = name
    if (description !== (asset.description ?? "")) payload.description = description
    if (businessUsePct !== (asset.business_use_pct ?? "")) payload.business_use_pct = businessUsePct
    if (Object.keys(payload).length === 0) {
      setError("No changes to save.")
      return
    }
    try {
      await update.mutateAsync(payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed")
    }
  }

  return (
    <PageSection title="Edit details">
      {error && <InlineAlert variant="error" className="mb-3">{error}</InlineAlert>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Business use %
            <span className="ml-2 font-normal text-gray-400">Motor vehicles only</span>
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={businessUsePct}
            onChange={(e) => setBusinessUsePct(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Posting-impacting fields (cost, method, useful life, residual) can't be changed in-place.
        Those flow through the reclassification, estimate-change and prior-period-restatement
        commands — delivered in a later task.
      </p>
      <div className="flex items-center gap-2 mt-3">
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </PageSection>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function toAuditEvent(entry: AssetActivityEntry): AuditEvent {
  const changes =
    entry.before_json && entry.after_json
      ? Object.keys({ ...entry.before_json, ...entry.after_json }).map((field) => ({
          field,
          before: String(entry.before_json?.[field] ?? ""),
          after: String(entry.after_json?.[field] ?? ""),
        }))
      : undefined
  return {
    id: entry.id,
    action: entry.action,
    summary: actionSummary(entry),
    actor: entry.user_id ?? "system",
    timestamp: entry.created_at,
    changes,
  }
}

function actionSummary(entry: AssetActivityEntry): string {
  switch (entry.action) {
    case "edited":
      return "Non-posting fields updated"
    case "acquired":
      return "Asset acquired"
    case "disposed":
      return "Asset disposed"
    case "dep_posted":
      return "Depreciation posted"
    case "dep_reversed":
      return "Depreciation reversed"
    case "estimate_changed":
      return "Depreciation estimate changed"
    case "reclassified":
      return "Reclassified (same-period reverse + repost)"
    case "restated":
      return "Prior-period restatement"
    default:
      return entry.action.replace(/_/g, " ")
  }
}
