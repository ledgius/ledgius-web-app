import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { EntityHeader, AuditTimeline } from "@/components/workflow"
import { Button, InlineAlert, Skeleton, Badge } from "@/components/primitives"
import { useNotification } from "@/components/feedback"
import { useAccount, useDeleteAccount } from "../hooks/useAccounts"
import { useEntityActivity } from "@/hooks/useEntityActivity"
import { api } from "@/shared/lib/api"
import { useQueryClient } from "@tanstack/react-query"

const categoryLabels: Record<string, string> = {
  A: "Asset", L: "Liability", Q: "Equity", I: "Income", E: "Expense",
}

export function EditAccountPage() {
  usePageHelp(pageHelpContent.editAccount)
  usePagePolicies(["account"])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const notify = useNotification()
  const qc = useQueryClient()
  const accountId = parseInt(id ?? "0")
  const { data: account, isLoading } = useAccount(accountId)
  const { data: activity, isLoading: activityLoading } = useEntityActivity("accounts", accountId)
  const deleteAccount = useDeleteAccount()

  const [description, setDescription] = useState("")
  const [contra, setContra] = useState(false)
  const [tax, setTax] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (account) {
      setDescription(account.description ?? "")
      setContra(account.contra)
      setTax(account.tax)
    }
  }, [account])

  if (isLoading) return <Skeleton variant="table" rows={4} columns={2} className="mt-8" />
  if (!account) {
    return (
      <PageShell>
        <InlineAlert variant="error">Account not found.</InlineAlert>
      </PageShell>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/accounts/${accountId}`, { description, contra, tax })
      qc.invalidateQueries({ queryKey: ["accounts"] })
      notify.success("Account updated")
      navigate("/accounts")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save"
      notify.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleObsolete = async () => {
    try {
      await deleteAccount.mutateAsync(accountId)
      notify.success(`Account ${account.accno} marked as obsolete`)
      navigate("/accounts")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to mark obsolete"
      notify.error(message)
    }
  }

  const header = (
    <div>
      <EntityHeader
        title={`Account ${account.accno}`}
        subtitle={account.description ?? ""}
        status={account.obsolete ? "archived" : "active"}
        backTo="/accounts"
        badges={
          <Badge variant="default">{categoryLabels[account.category] || account.category}</Badge>
        }
      />
      <div className="flex items-center gap-2 mt-4">
        <Button variant="secondary" onClick={() => navigate("/accounts")}>Cancel</Button>
        <Button loading={saving} onClick={handleSave}>Save</Button>
        <div className="flex-1" />
        <Button variant="danger" size="sm" onClick={handleObsolete} loading={deleteAccount.isPending}>
          Mark Obsolete
        </Button>
      </div>
    </div>
  )

  const aside = (
    <PageSection title="Activity" variant="card">
      <AuditTimeline events={activity ?? []} loading={activityLoading} />
    </PageSection>
  )

  return (
    <PageShell header={header} aside={aside}>
      <PageSection title="Account Details">
        <div className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account Code</label>
            <input type="text" value={account.accno} disabled
              className="w-full border rounded px-2 py-1.5 text-sm font-mono bg-gray-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={contra} onChange={(e) => setContra(e.target.checked)} /> Contra
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={tax} onChange={(e) => setTax(e.target.checked)} /> Tax Account
            </label>
          </div>
        </div>
      </PageSection>
    </PageShell>
  )
}
