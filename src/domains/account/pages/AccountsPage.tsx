import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { PageShell, InlineCreatePanel } from "@/components/layout"
import { Button, Badge, InlineAlert } from "@/components/primitives"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { SearchFilter } from "@/shared/components/SearchFilter"
import { useAccounts, useCreateAccount, type Account } from "../hooks/useAccounts"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
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

function InlineAccountForm({ onClose }: { onClose: () => void }) {
  const createAccount = useCreateAccount()
  const feedback = useFeedback()
  const [accno, setAccno] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("E")
  const [headingId, setHeadingId] = useState("")
  const [contra, setContra] = useState(false)
  const [tax, setTax] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    setError("")
    if (!accno || !description || !headingId) {
      setError("Account code, description, and heading are required")
      return
    }
    try {
      await createAccount.mutateAsync({
        accno,
        description,
        category,
        heading_id: parseInt(headingId),
        contra,
        tax,
      })
      feedback.success("Account created")
      setAccno("")
      setDescription("")
      setCategory("E")
      setHeadingId("")
      setContra(false)
      setTax(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create account"
      setError(message)
    }
  }

  return (
    <div>
      {error && <InlineAlert variant="error" className="mb-3">{error}</InlineAlert>}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Account Code</label>
          <input type="text" value={accno} onChange={e => setAccno(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary-500 focus:border-primary-500" placeholder="1010" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
            <option value="A">Asset</option><option value="L">Liability</option><option value="Q">Equity</option>
            <option value="I">Income</option><option value="E">Expense</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Heading ID</label>
          <input type="number" value={headingId} onChange={e => setHeadingId(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div className="flex items-end gap-3 pb-0.5">
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={contra} onChange={e => setContra(e.target.checked)} /> Contra</label>
          <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={tax} onChange={e => setTax(e.target.checked)} /> Tax</label>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button loading={createAccount.isPending} onClick={handleSubmit} size="sm">Create Account</Button>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

export function AccountsPage() {
  usePageHelp(pageHelpContent.chartOfAccounts)
  usePagePolicies(["account"])
  const { data: accounts, isLoading, error } = useAccounts()
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    let result = accounts ?? []
    if (!showInactive) {
      result = result.filter((a) => a.has_activity)
    }
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
      <p className="text-sm text-gray-500 mt-0.5">Your business's financial categories</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setCreateOpen(!createOpen)} variant={createOpen ? "secondary" : "primary"}>
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
    <PageShell header={header} loading={isLoading}>
      <InlineCreatePanel isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Account">
        <InlineAccountForm onClose={() => setCreateOpen(false)} />
      </InlineCreatePanel>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        error={error}
        onRowClick={(row) => navigate(`/accounts/${row.id}/edit`)}
        emptyMessage={
          showInactive
            ? "No accounts match your search."
            : "No active accounts. Click 'Show all' to see unused accounts."
        }
      />
    </PageShell>
  )
}
