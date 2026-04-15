// Spec references: R-0054, A-0030 §"Reporting UI", T-0028 §"Phase 5".
//
// LSMB Migration Status tile — surfaces the platform-level migration
// progress to platform owners. Two-column layout:
//   left  — inventory-derived counts, completeness bar, risk breakdown
//   right — live DB introspection: actual trigger + function counts,
//           drift indicators where the inventory disagrees with reality

import { Badge, Skeleton, InlineAlert } from "@/components/primitives"
import { useMigrationStatus, type MigrationStatus } from "../hooks/useMigrationStatus"
import { Database, AlertTriangle, CheckCircle2 } from "lucide-react"

export function LsmbMigrationTile() {
  const { data, isLoading, error } = useMigrationStatus()

  return (
    <div className="rounded-lg border bg-white p-4 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-gray-500" />
            LSMB Migration Status
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Progress replacing inherited LedgerSMB triggers + functions with Go services. See R-0054.
          </p>
        </div>
      </header>

      {isLoading && <Skeleton className="h-32 w-full" />}
      {error && (
        <InlineAlert variant="error">
          Couldn't load migration status: {(error as Error).message}
        </InlineAlert>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InventorySection report={data} />
          <LiveDBSection report={data} />
        </div>
      )}

      {data?.in_use_high_risk && data.in_use_high_risk.length > 0 && (
        <HighRiskDrillDown report={data} />
      )}

      {data && (
        <p className="text-[11px] text-gray-400 mt-1">
          Inventory: {data.inventory_source}
          {data.live_db?.captured_at && (
            <> · Live DB captured: {new Date(data.live_db.captured_at).toLocaleString()}</>
          )}
        </p>
      )}
    </div>
  )
}

function InventorySection({ report }: { report: MigrationStatus }) {
  const pct = report.completeness_pct
  return (
    <section>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Inventory (curated)</h4>
      <div className="mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-xs text-gray-500">Completeness</span>
          <span className="text-sm font-semibold tabular-nums">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full transition-all ${pct >= 75 ? "bg-green-500" : pct >= 25 ? "bg-amber-400" : "bg-red-400"}`}
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-gray-500">Total inventoried</dt>
        <dd className="text-right tabular-nums">{report.total}</dd>
        {Object.entries(report.by_status).map(([k, v]) => (
          <DefRow key={k} label={k} value={v} />
        ))}
      </dl>
      <div className="mt-3">
        <div className="text-xs text-gray-500 mb-1">By risk tier (in-use)</div>
        <div className="flex gap-1.5">
          {Object.entries(report.by_risk_tier).map(([tier, count]) => (
            <Badge key={tier} variant={riskVariant(tier)}>
              {tier}: {count}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  )
}

function LiveDBSection({ report }: { report: MigrationStatus }) {
  const live = report.live_db
  return (
    <section>
      <h4 className="text-sm font-medium text-gray-700 mb-2">Live DB (actual)</h4>
      {!live && <p className="text-xs text-gray-400">Not available.</p>}
      {live?.error && (
        <InlineAlert variant="warning" className="mb-2">
          {live.error}
        </InlineAlert>
      )}
      {live && (
        <>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <DefRow label="Triggers present" value={live.trigger_count} />
            <DefRow label="Functions present" value={live.function_count} />
            <DefRow label="Views present" value={live.view_count} />
          </dl>
          <DriftBlock
            label="In DB but not in inventory"
            items={live.drift_in_db_not_in_inventory}
            severity="warning"
          />
          <DriftBlock
            label="Inventory says dropped, but still present"
            items={live.drift_inventory_dropped_but_present}
            severity="error"
          />
          {(!live.drift_in_db_not_in_inventory || live.drift_in_db_not_in_inventory.length === 0) &&
            (!live.drift_inventory_dropped_but_present || live.drift_inventory_dropped_but_present.length === 0) && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Inventory and live DB are in sync.
              </div>
            )}
        </>
      )}
    </section>
  )
}

function HighRiskDrillDown({ report }: { report: MigrationStatus }) {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-gray-600 hover:text-gray-900 flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        High-risk artifacts still in use ({report.in_use_high_risk.length})
      </summary>
      <ul className="mt-2 ml-5 list-disc space-y-0.5 text-gray-600">
        {report.in_use_high_risk.map(a => (
          <li key={`${a.kind}:${a.name}`}>
            <span className="font-mono text-[11px]">{a.name}</span>
            <span className="ml-1 text-gray-400">({a.kind})</span>
          </li>
        ))}
      </ul>
    </details>
  )
}

function DriftBlock({
  label,
  items,
  severity,
}: {
  label: string
  items: string[] | null | undefined
  severity: "warning" | "error"
}) {
  if (!items || items.length === 0) return null
  return (
    <div className="mt-2">
      <div className={`text-xs flex items-center gap-1.5 ${severity === "error" ? "text-red-700" : "text-amber-700"}`}>
        <AlertTriangle className="h-3.5 w-3.5" />
        {label} ({items.length})
      </div>
      <ul className="mt-1 ml-5 list-disc space-y-0.5 text-[11px] font-mono text-gray-600">
        {items.map(name => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </div>
  )
}

function DefRow({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt className="text-gray-500 capitalize">{label.replace(/_/g, " ")}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </>
  )
}

function riskVariant(tier: string): "default" | "success" | "warning" | "danger" {
  switch (tier) {
    case "low":
      return "success"
    case "medium":
      return "warning"
    case "high":
      return "danger"
    default:
      return "default"
  }
}
