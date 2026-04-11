import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert } from "@/components/primitives"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useCreateAccount, useAccounts } from "../hooks/useAccounts"
import { useFeedback } from "@/components/feedback"

export function CreateAccountPage() {
  usePageHelp(pageHelpContent.createAccount)
  usePagePolicies(["account"])
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/accounts"), [navigate])
  useEscapeKey(handleCancel)
  const createAccount = useCreateAccount()
  const { data: accounts } = useAccounts()
  const feedback = useFeedback()

  const [accno, setAccno] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("E")
  const [headingId, setHeadingId] = useState("")
  const [contra, setContra] = useState(false)
  const [tax, setTax] = useState(false)
  const [error, setError] = useState("")

  void accounts // Used for future heading selector enhancement.

  const handleSubmit = async () => {
    setError("")
    if (!accno || !description || !headingId) { setError("Account code, description, and heading are required"); return }
    try {
      await createAccount.mutateAsync({
        accno, description, category, heading_id: parseInt(headingId), contra, tax,
      })
      feedback.success("Account created")
      navigate("/accounts")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create account"
      feedback.error("Account creation failed", message)
    }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Create Account</h1>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button loading={createAccount.isPending} onClick={handleSubmit}>Create Account</Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}
      <PageSection title="Account Details">
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Account Code</label>
            <input type="text" value={accno} onChange={e => setAccno(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="1010" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="A">Asset</option><option value="L">Liability</option><option value="Q">Equity</option>
              <option value="I">Income</option><option value="E">Expense</option>
            </select></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Heading ID</label>
            <input type="number" value={headingId} onChange={e => setHeadingId(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={contra} onChange={e => setContra(e.target.checked)} /> Contra</label>
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={tax} onChange={e => setTax(e.target.checked)} /> Tax Account</label>
          </div>
        </div>
      </PageSection>
    </PageShell>
  )
}
