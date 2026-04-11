import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { Button } from "@/components/primitives"
import { DataTable } from "@/shared/components/DataTable"
import { SearchFilter } from "@/shared/components/SearchFilter"
import { useProducts, type Product } from "../hooks/useProducts"
import { formatCurrency } from "@/shared/lib/utils"

const columns = [
  { key: "sku", header: "SKU", className: "font-mono w-24",
    render: (row: Product) => row.sku ?? "-" },
  { key: "name", header: "Name" },
  { key: "product_type", header: "Type", className: "w-20",
    render: (row: Product) => (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 capitalize">{row.product_type}</span>
    ),
  },
  { key: "unit", header: "Unit", className: "w-16", render: (row: Product) => row.unit ?? "-" },
  { key: "sell_price", header: "Sell Price", className: "text-right font-mono",
    render: (row: Product) => formatCurrency(row.sell_price) },
  { key: "buy_price", header: "Buy Price", className: "text-right font-mono",
    render: (row: Product) => formatCurrency(row.buy_price) },
]

export function ProductsPage() {
  usePageHelp(pageHelpContent.products)
  usePagePolicies(["product"])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const { data: products, isLoading } = useProducts(typeFilter, search)
  const navigate = useNavigate()

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Products & Services</h1>
        <span className="text-sm text-gray-500">{products?.length ?? 0} items</span>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => navigate("/products/new")}>New Product</Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <SearchFilter placeholder="Search products..." onSearch={setSearch} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border rounded px-2 py-1.5 text-sm w-36">
          <option value="">All types</option>
          <option value="product">Products</option>
          <option value="service">Services</option>
          <option value="overhead">Overhead</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <DataTable columns={columns} data={products ?? []} emptyMessage="No products or services found." />
      )}
    </PageShell>
  )
}
