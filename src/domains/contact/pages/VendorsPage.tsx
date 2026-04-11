import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { Button, Skeleton } from "@/components/primitives"
import { MoneyValue } from "@/components/financial"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { SearchFilter } from "@/shared/components/SearchFilter"
import { useVendors, type ContactSummary } from "../hooks/useContacts"
import { Plus } from "lucide-react"

const columns: Column<ContactSummary>[] = [
  { key: "meta_number", header: "Code", className: "font-mono w-36 whitespace-nowrap", render: (row: ContactSummary) => <span className="text-primary-600 hover:underline cursor-pointer">{row.meta_number}</span> },
  { key: "name", header: "Name" },
  { key: "legal_name", header: "Legal Name" },
  { key: "tax_id", header: "ABN", className: "font-mono" },
  {
    key: "credit_limit",
    header: "Credit Limit",
    className: "text-right",
    render: (row: ContactSummary) => <MoneyValue amount={row.credit_limit} currency={row.curr} size="sm" />,
  },
]

export function VendorsPage() {
  usePageHelp(pageHelpContent.vendors)
  usePagePolicies(["contact"])
  const { data: vendors, isLoading } = useVendors()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    if (!search || !vendors) return vendors ?? []
    const q = search.toLowerCase()
    return vendors.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.meta_number?.toLowerCase().includes(q) ||
        v.tax_id?.toLowerCase().includes(q)
    )
  }, [vendors, search])

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Vendors</h1>
        <span className="text-sm text-gray-500">Accounts Payable &middot; {filtered.length} contacts</span>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => navigate("/contacts/new?type=vendor")}>
          <Plus className="h-4 w-4" />
          New Vendor
        </Button>
        <div className="flex-1" />
        <div className="max-w-sm">
          <SearchFilter placeholder="Search vendors..." onSearch={setSearch} />
        </div>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {isLoading ? (
        <Skeleton variant="table" rows={8} columns={5} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          emptyMessage="No vendors. Create a new vendor to get started."
          onRowClick={(row) => navigate(`/contacts/${row.id}`)}
        />
      )}
    </PageShell>
  )
}
