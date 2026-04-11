import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { PageShell } from "@/components/layout"
import { Button, Skeleton, Badge } from "@/components/primitives"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { SearchFilter } from "@/shared/components/SearchFilter"
import { useAccounts, type Account } from "../hooks/useAccounts"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { Plus, Eye, EyeOff } from "lucide-react"

const categoryLabels: Record<string, string> = {
  A: "Asset",
  L: "Liability",
  Q: "Equity",
  I: "Income",
  E: "Expense",
}

const columns: Column<Account>[] = [
  { key: "accno", header: "Code", className: "w-24 font-mono" },
  { key: "description", header: "Description" },
  {
    key: "category",
    header: "Type",
    className: "w-24",
    render: (row: Account) => (
      <Badge variant="default">{categoryLabels[row.category] || row.category}</Badge>
    ),
  },
  {
    key: "links",
    header: "Links",
    render: (row: Account) =>
      row.links?.map((l) => (
        <span key={l.description} className="mr-2 text-xs text-primary-600 hover:underline cursor-default">
          {l.description}
        </span>
      )),
  },
  {
    key: "tax",
    header: "Tax",
    className: "w-16 text-center",
    render: (row: Account) =>
      row.tax ? <Badge variant="success">Tax</Badge> : null,
  },
  {
    key: "has_activity",
    header: "Activity",
    className: "w-20 text-center",
    render: (row: Account) =>
      row.has_activity ? (
        <span className="inline-block h-2 w-2 rounded-full bg-green-500" title="Has transactions" />
      ) : (
        <span className="inline-block h-2 w-2 rounded-full bg-gray-200" title="No transactions" />
      ),
  },
]

export function AccountsPage() {
  usePageHelp(pageHelpContent.chartOfAccounts)
  usePagePolicies(["account"])
  const { data: accounts, isLoading } = useAccounts()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)

  const filtered = useMemo(() => {
    let result = accounts ?? []

    // Filter out inactive accounts (no transactions) unless toggled
    if (!showInactive) {
      result = result.filter((a) => a.has_activity)
    }

    // Text search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (a) =>
          a.accno.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.links?.some((l) => l.description.toLowerCase().includes(q))
      )
    }

    return result
  }, [accounts, search, showInactive])

  const totalCount = accounts?.length ?? 0
  const activeCount = accounts?.filter((a) => a.has_activity).length ?? 0
  const inactiveCount = totalCount - activeCount

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Chart of Accounts</h1>
        <span className="text-sm text-gray-500">
          {activeCount} active accounts
          {inactiveCount > 0 && <> &middot; {inactiveCount} inactive</>}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => navigate("/accounts/new")}>
          <Plus className="h-4 w-4" />
          New Account
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? (
            <>
              <EyeOff className="h-3.5 w-3.5" />
              Hide inactive
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              Show all ({inactiveCount} inactive)
            </>
          )}
        </Button>
        <div className="flex-1" />
        <div className="max-w-sm">
          <SearchFilter placeholder="Search accounts..." onSearch={setSearch} />
        </div>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {isLoading ? (
        <Skeleton variant="table" rows={10} columns={6} />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => navigate(`/accounts/${row.id}/edit`)}
          emptyMessage={
            showInactive
              ? "No accounts match your search."
              : "No active accounts. Click 'Show all' to see unused accounts."
          }
        />
      )}
    </PageShell>
  )
}
