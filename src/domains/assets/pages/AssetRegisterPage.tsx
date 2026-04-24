// Spec references: R-0062, A-0040, A-0041, T-0029.
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { Button, Badge } from "@/components/primitives"
import { MoneyValue, DateValue } from "@/components/financial"
import { DataTable, type Column } from "@/shared/components/DataTable"
import {
  useAssets,
  useAssetCategories,
  type Asset,
  type AssetStatus,
} from "../hooks/useAssets"

const statusLabels: Record<AssetStatus, string> = {
  draft: "Draft",
  active: "Active",
  disposed: "Disposed",
  fully_depreciated: "Fully Depreciated",
  archived: "Archived",
}

const statusVariants: Record<AssetStatus, "success" | "default" | "warning"> = {
  draft: "default",
  active: "success",
  disposed: "default",
  fully_depreciated: "warning",
  archived: "default",
}

const columns: Column<Asset>[] = [
  {
    key: "name",
    header: "Asset Name",
    render: (r: Asset) => (
      <span className="text-primary-600 hover:underline cursor-pointer font-medium">
        {r.name}
      </span>
    ),
  },
  {
    key: "category",
    header: "Category",
    className: "w-40",
    render: (r: Asset) => <span className="text-gray-600">{r.category?.name ?? "—"}</span>,
  },
  {
    key: "purchase_date",
    header: "Purchase Date",
    className: "w-32",
    render: (r: Asset) => <DateValue value={r.purchase_date} format="short" />,
  },
  {
    key: "cost_ex_gst",
    header: "Cost (ex GST)",
    className: "w-32 text-right",
    render: (r: Asset) => (
      <div className="text-right">
        <MoneyValue amount={r.cost_ex_gst} currency="AUD" />
      </div>
    ),
  },
  {
    key: "book_value",
    header: "Current Book Value",
    className: "w-40 text-right",
    render: (r: Asset) => (
      <div className="text-right">
        <MoneyValue amount={r.book_value} currency="AUD" />
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    className: "w-32",
    render: (r: Asset) => (
      <Badge variant={statusVariants[r.status] ?? "default"}>
        {statusLabels[r.status] ?? r.status}
      </Badge>
    ),
  },
]

export function AssetRegisterPage() {
  usePagePolicies(["account", "tax", "assets"])
  const navigate = useNavigate()

  const [categoryId, setCategoryId] = useState("")
  const [status, setStatus] = useState<AssetStatus | "">("")
  const [query, setQuery] = useState("")
  const [includeDisposed, setIncludeDisposed] = useState(false)

  const { data: categories } = useAssetCategories()
  const {
    data,
    isLoading,
    error,
  } = useAssets({
    statuses: status ? [status] : undefined,
    categoryId: categoryId || undefined,
    query: query || undefined,
    includeDisposed,
    pageSize: 100,
  })

  const items = data?.items ?? []
  const totals = data?.totals

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Asset Register</h1>
        {totals && (
          <span className="text-sm text-gray-500">
            {totals.count_active} active
            {totals.count_fully_depreciated > 0
              ? ` \u00b7 ${totals.count_fully_depreciated} fully depreciated`
              : ""}
            {totals.count_disposed > 0 && includeDisposed
              ? ` \u00b7 ${totals.count_disposed} disposed`
              : ""}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Track every capital item and its depreciation</p>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <Button onClick={() => navigate("/assets/buy")}>
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AssetStatus | "")}
            className="border border-gray-300 rounded px-2 py-1.5 pr-7 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="fully_depreciated">Fully Depreciated</option>
            <option value="disposed">Disposed</option>
          </select>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 pr-7 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name..."
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
          <label className="flex items-center gap-1.5 text-xs text-gray-600 select-none">
            <input
              type="checkbox"
              checked={includeDisposed}
              onChange={(e) => setIncludeDisposed(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show disposed
          </label>
        </div>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      {totals && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <SummaryCard label="Active" value={String(totals.count_active)} />
          <SummaryCard label="Total Cost" value={<MoneyValue amount={totals.total_cost} currency="AUD" />} />
          <SummaryCard label="Accumulated Depreciation" value={<MoneyValue amount={totals.total_accumulated} currency="AUD" />} />
          <SummaryCard label="Total Book Value" value={<MoneyValue amount={totals.total_book_value} currency="AUD" />} />
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        error={error}
        emptyMessage="No assets registered. Add your first asset to start tracking depreciation."
        onRowClick={(row) => navigate(`/assets/${row.id}`)}
      />
    </PageShell>
  )
}

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-base font-semibold text-gray-900">{value}</p>
    </div>
  )
}
