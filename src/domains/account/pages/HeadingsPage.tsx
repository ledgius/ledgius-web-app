import { useState } from "react"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button } from "@/components/primitives"
import { DataTable } from "@/shared/components/DataTable"
import { useAccountHeadings, useCreateHeading, type AccountHeading } from "../hooks/useAccounts"

const categoryLabels: Record<string, string> = { A: "Asset", L: "Liability", Q: "Equity", I: "Income", E: "Expense" }

// Derive a category letter from the accno range using standard accounting
// conventions. Used as a display fallback when category is NULL on the row.
function inferCategory(accno: string): string | null {
  const n = parseInt(accno, 10)
  if (isNaN(n)) return null
  if (n >= 1000 && n < 2000) return "A"
  if (n >= 2000 && n < 3000) return "L"
  if (n >= 3000 && n < 4000) return "Q"
  if (n >= 4000 && n < 5000) return "I"
  if (n >= 5000 && n < 7000) return "E"
  return null
}

function renderCategory(r: AccountHeading) {
  const letter = r.category?.trim() || inferCategory(r.accno)
  if (!letter) return <span className="text-gray-400">—</span>
  const label = categoryLabels[letter] ?? letter
  return r.category ? label : <span className="text-gray-500 italic" title="Derived from account number range">{label}</span>
}

const columns = [
  { key: "accno", header: "Code", className: "font-mono w-20" },
  { key: "description", header: "Description" },
  { key: "category", header: "Category", className: "w-28", render: renderCategory },
  { key: "parent_id", header: "Parent", className: "w-20", render: (r: AccountHeading) => r.parent_id ?? <span className="text-gray-400">—</span> },
]

export function HeadingsPage() {
  usePagePolicies(["account"])
  const { data: headings, isLoading, error: fetchError } = useAccountHeadings()
  const createHeading = useCreateHeading()
  const [showForm, setShowForm] = useState(false)
  const [accno, setAccno] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")

  const handleCreate = async () => {
    if (!accno || !description) { setError("Code and description required"); return }
    try {
      await createHeading.mutateAsync({ accno, description })
      setShowForm(false); setAccno(""); setDescription(""); setError("")
    } catch (err: any) { setError(err.message) }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Account Headings</h1>
        <span className="text-sm text-gray-500">{headings?.length ?? 0} headings</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Group and organise your chart of accounts</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Heading"}
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
{error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
      {showForm && (
        <PageSection title="New Heading">
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
              <input type="text" value={accno} onChange={e => setAccno(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="1000" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Current Assets" /></div>
            <button onClick={handleCreate} className="px-4 py-1.5 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700">Create</button>
          </div>
        </PageSection>
      )}
      <DataTable columns={columns} data={headings ?? []} loading={isLoading} error={fetchError} emptyMessage="No headings." />
    </PageShell>
  )
}
