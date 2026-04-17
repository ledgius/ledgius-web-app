// Spec references: R-0062.
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel, Badge } from "@/components/primitives"
import { MoneyValue, DateValue } from "@/components/financial"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { Plus } from "lucide-react"

interface Asset {
  id: string
  name: string
  category: string
  purchase_date: string
  cost: number
  book_value: number
  status: "active" | "disposed" | "fully_depreciated"
}

const statusLabels: Record<string, string> = {
  active: "Active",
  disposed: "Disposed",
  fully_depreciated: "Fully Depreciated",
}

const statusVariants: Record<string, "success" | "default" | "warning"> = {
  active: "success",
  disposed: "default",
  fully_depreciated: "warning",
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
    render: (r: Asset) => <span className="text-gray-600">{r.category}</span>,
  },
  {
    key: "purchase_date",
    header: "Purchase Date",
    className: "w-32",
    render: (r: Asset) => <DateValue value={r.purchase_date} format="short" />,
  },
  {
    key: "cost",
    header: "Cost",
    className: "w-32 text-right",
    render: (r: Asset) => (
      <div className="text-right">
        <MoneyValue amount={r.cost} currency="AUD" />
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
    className: "w-28",
    render: (r: Asset) => (
      <Badge variant={statusVariants[r.status] ?? "default"}>
        {statusLabels[r.status] ?? r.status}
      </Badge>
    ),
  },
]

export function AssetRegisterPage() {
  usePageHelp(pageHelpContent.assetRegister)
  usePagePolicies(["account", "tax"])
  const navigate = useNavigate()

  // API not built yet — empty array shows the empty state
  const [assets] = useState<Asset[]>([])
  const isLoading = false

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Asset Register</h1>
        {assets.length > 0 && (
          <span className="text-sm text-gray-500">
            {assets.filter(a => a.status === "active").length} active
            {assets.filter(a => a.status !== "active").length > 0
              ? ` \u00b7 ${assets.filter(a => a.status !== "active").length} other`
              : ""}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Track every capital item and its depreciation</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => navigate("/assets/buy")}>
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <InfoPanel title="About Fixed Assets" storageKey="asset-register-info">
        <p>
          Your fixed asset register tracks every capital item — plant, equipment, vehicles, IT.
          Each asset carries its purchase cost, depreciation method, and current book value.
        </p>
      </InfoPanel>

      <DataTable
        columns={columns}
        data={assets}
        loading={isLoading}
        emptyMessage="No assets registered. Add your first asset to start tracking depreciation."
        onRowClick={(row) => navigate(`/assets/${row.id}`)}
      />
    </PageShell>
  )
}
