import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, InlineCreatePanel } from "@/components/layout"
import { Button, InfoPanel, InlineAlert } from "@/components/primitives"
import { DataTable } from "@/shared/components/DataTable"
import { SearchFilter } from "@/shared/components/SearchFilter"
import { useProducts, useCreateProduct, type Product } from "../hooks/useProducts"
import { useTaxCodes } from "@/domains/taxcode/hooks/useTaxCodes"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useFeedback } from "@/components/feedback"
import { formatCurrency } from "@/shared/lib/utils"
import { Plus } from "lucide-react"

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

function InlineProductForm({ onClose }: { onClose: () => void }) {
  const createProduct = useCreateProduct()
  const { data: taxCodes } = useTaxCodes()
  const { data: accounts } = useAccounts()
  const feedback = useFeedback()

  const [name, setName] = useState("")
  const [sku, setSku] = useState("")
  const [productType, setProductType] = useState("service")
  const [unit, setUnit] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [sellTaxCodeId, setSellTaxCodeId] = useState("")
  const [buyTaxCodeId, setBuyTaxCodeId] = useState("")
  const [incomeAccountId, setIncomeAccountId] = useState("")
  const [expenseAccountId, setExpenseAccountId] = useState("")
  const [error, setError] = useState("")

  const incomeAccounts = accounts?.filter(a => a.category === "I") ?? []
  const expenseAccounts = accounts?.filter(a => a.category === "E") ?? []

  const handleSubmit = async () => {
    setError("")
    if (!name) { setError("Name is required"); return }
    try {
      await createProduct.mutateAsync({
        name,
        sku: sku || undefined,
        product_type: productType,
        unit: unit || undefined,
        sell_price: sellPrice || "0",
        buy_price: buyPrice || "0",
        sell_tax_code_id: sellTaxCodeId ? parseInt(sellTaxCodeId) : undefined,
        buy_tax_code_id: buyTaxCodeId ? parseInt(buyTaxCodeId) : undefined,
        income_account_id: incomeAccountId ? parseInt(incomeAccountId) : undefined,
        expense_account_id: expenseAccountId ? parseInt(expenseAccountId) : undefined,
      } as any)
      feedback.success("Product created")
      setName("")
      setSku("")
      setProductType("service")
      setUnit("")
      setSellPrice("")
      setBuyPrice("")
      setSellTaxCodeId("")
      setBuyTaxCodeId("")
      setIncomeAccountId("")
      setExpenseAccountId("")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create product"
      setError(message)
    }
  }

  return (
    <div>
      {error && <InlineAlert variant="error" className="mb-3">{error}</InlineAlert>}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Consulting Hour" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
          <input type="text" value={sku} onChange={e => setSku(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select value={productType} onChange={e => setProductType(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
            <option value="service">Service</option>
            <option value="product">Product</option>
            <option value="overhead">Overhead</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
          <input type="text" value={unit} onChange={e => setUnit(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="hour, each, kg..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sell Price</label>
          <input type="number" step="0.01" value={sellPrice} onChange={e => setSellPrice(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="0.00" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Buy Price</label>
          <input type="number" step="0.01" value={buyPrice} onChange={e => setBuyPrice(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="0.00" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sell Tax Code</label>
          <select value={sellTaxCodeId} onChange={e => setSellTaxCodeId(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
            <option value="">None</option>
            {taxCodes?.map(tc => (
              <option key={tc.id} value={tc.id}>{tc.code} ({(parseFloat(tc.rate) * 100).toFixed(0)}%)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Buy Tax Code</label>
          <select value={buyTaxCodeId} onChange={e => setBuyTaxCodeId(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
            <option value="">None</option>
            {taxCodes?.map(tc => (
              <option key={tc.id} value={tc.id}>{tc.code} ({(parseFloat(tc.rate) * 100).toFixed(0)}%)</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Income Account</label>
          <select value={incomeAccountId} onChange={e => setIncomeAccountId(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
            <option value="">None</option>
            {incomeAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Expense Account</label>
          <select value={expenseAccountId} onChange={e => setExpenseAccountId(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
            <option value="">None</option>
            {expenseAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.accno} — {a.description}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button loading={createProduct.isPending} onClick={handleSubmit} size="sm">Create Product</Button>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

export function ProductsPage() {
  usePageHelp(pageHelpContent.products)
  usePagePolicies(["product"])
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const { data: products, isLoading, error } = useProducts(typeFilter, search)
  const navigate = useNavigate()

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Products & Services</h1>
        <span className="text-sm text-gray-500">{products?.length ?? 0} items</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">What you sell or buy</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setCreateOpen(!createOpen)} variant={createOpen ? "secondary" : "primary"}>
          <Plus className="h-4 w-4" />
          New Product
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <InfoPanel title="About Products & Services" storageKey="products-info">
        <p>
          <strong>Products & Services</strong> are reusable line-item templates that pre-fill description, unit,
          price, default accounts, and tax codes when you add them to invoices and bills. Create one entry per item
          you regularly sell or purchase, and you'll spend less time re-entering the same data on every invoice.
        </p>
        <p className="mt-1.5">
          <strong>Types</strong>:
          {" "}<span className="inline-block px-1.5 py-0 rounded-full bg-gray-100 text-[10px]">product</span>{" "}
          for physical goods held in inventory,
          {" "}<span className="inline-block px-1.5 py-0 rounded-full bg-gray-100 text-[10px]">service</span>{" "}
          for labour or consulting you bill for, and
          {" "}<span className="inline-block px-1.5 py-0 rounded-full bg-gray-100 text-[10px]">overhead</span>{" "}
          for internal cost codes (e.g. rent, utilities) used on bills but not sold.
        </p>
        <p className="mt-1.5">
          <strong>Sell / Buy prices</strong> default onto invoice and bill lines but can still be overridden per
          transaction. <strong>Default accounts</strong> (income and expense) control which GL account the transaction
          posts to; <strong>tax codes</strong> control GST treatment (usually <em>GST 10%</em> for taxable supplies,
          <em>GST Free</em> for exempt items like fresh food).
        </p>
        <p className="mt-1.5 text-blue-600">
          Using products is optional — you can still type free-text descriptions on invoices. But for anything you
          sell more than twice, a product entry pays for itself quickly.
        </p>
      </InfoPanel>
      <InlineCreatePanel isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Product / Service">
        <InlineProductForm onClose={() => setCreateOpen(false)} />
      </InlineCreatePanel>

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <SearchFilter placeholder="Search products..." onSearch={setSearch} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1.5 text-sm w-36 focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
          <option value="">All types</option>
          <option value="product">Products</option>
          <option value="service">Services</option>
          <option value="overhead">Overhead</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={products ?? []}
        loading={isLoading}
        error={error}
        emptyMessage="No products or services found."
        onRowClick={(row) => navigate(`/products/${row.id}`)}
      />
    </PageShell>
  )
}
