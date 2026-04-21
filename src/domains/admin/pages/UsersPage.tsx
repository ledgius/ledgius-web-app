// Spec references: R-0070 (UI-006, UI-011 through UI-015).
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel, Skeleton } from "@/components/primitives"
import { api } from "@/shared/lib/api"
import { Plus, X, Check, Mail, Clock, UserX } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface TenantMembership {
  id: string
  user_id: string
  role: string
  user: { id: string; email: string; display_name: string; status: string }
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expires_at: string
  created_at: string
}

interface UsersResponse {
  users: TenantMembership[]
  invitations: Invitation[]
}

const ROLES = [
  { value: "owner", label: "Owner", description: "Full access. Can manage users, settings, billing, and all accounting." },
  { value: "master_accountant", label: "Master Accountant", description: "Full accounting access plus admin settings, BAS lodgement, and rules engine." },
  { value: "accountant", label: "Accountant", description: "Full accounting operations — journals, invoices, bills, reconciliation, and reporting." },
  { value: "bookkeeper", label: "Bookkeeper", description: "Day-to-day data entry — invoices, bills, receipts, bank reconciliation." },
  { value: "viewer", label: "Viewer", description: "Read-only access to all data. Cannot create or modify anything." },
]

export function UsersPage() {
  usePageHelp(pageHelpContent.users)
  usePagePolicies(["platform"])
  const feedback = useFeedback()
  const qc = useQueryClient()
  const [showInvite, setShowInvite] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["settings", "users"],
    queryFn: () => api.get<UsersResponse>("/settings/users"),
  })

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.put(`/settings/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", "users"] }); feedback.success("Role updated") },
    onError: (err: Error) => feedback.error("Failed to change role", err.message),
  })

  const removeUser = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", "users"] }); feedback.success("User removed") },
    onError: (err: Error) => feedback.error("Failed to remove user", err.message),
  })

  const revokeInvitation = useMutation({
    mutationFn: (id: string) => api.post(`/settings/users/invitations/${id}/revoke`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", "users"] }); feedback.success("Invitation revoked") },
    onError: (err: Error) => feedback.error("Failed to revoke", err.message),
  })

  const resendInvitation = useMutation({
    mutationFn: (id: string) => api.post(`/settings/users/invitations/${id}/resend`, {}),
    onSuccess: () => feedback.success("Invitation resent"),
    onError: (err: Error) => feedback.error("Failed to resend", err.message),
  })

  const invite = useMutation({
    mutationFn: (body: { email: string; role: string; display_name: string }) => api.post("/settings/users/invite", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", "users"] }); feedback.success("Invitation sent"); setShowInvite(false) },
    onError: (err: Error) => feedback.error("Failed to invite", err.message),
  })

  const users = data?.users ?? []
  const invitations = data?.invitations ?? []

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Users</h1>
        <span className="text-sm text-gray-400">{users.length} active{invitations.length > 0 ? ` · ${invitations.length} pending` : ""}</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Manage who can access your organisation</p>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
          <Plus className="h-3.5 w-3.5" />Invite User
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Managing your team" storageKey="users-info" collapsible>
        <p>
          Invite team members by email to give them access to your organisation. Each person is assigned
          a role that controls what they can see and do:
        </p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {ROLES.map(r => (
            <li key={r.value}>
              <strong className="text-gray-700">{r.label}</strong> — {r.description}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-sm">
          Your accountant or bookkeeper can be invited at no extra cost — they get their own login
          with appropriate permissions.
        </p>
      </InfoPanel>

      {/* Invite Form */}
      {showInvite && <InviteForm onCancel={() => setShowInvite(false)} onInvite={body => invite.mutate(body)} saving={invite.isPending} />}

      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
      ) : (
        <div className="space-y-6">
          {/* Active Users */}
          {users.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase">Email</th>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase">Role</th>
                    <th className="px-4 py-2.5 w-32"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((m, i) => (
                    <tr key={m.id} className={cn("group", i % 2 === 1 ? "bg-gray-50/50" : "")}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{m.user.display_name}</td>
                      <td className="px-4 py-2.5 text-gray-600 text-xs font-mono">{m.user.email}</td>
                      <td className="px-4 py-2.5">
                        <select
                          value={m.role}
                          onChange={e => changeRole.mutate({ id: m.id, role: e.target.value })}
                          className="bg-white border border-gray-200 rounded px-2 py-1 text-xs pr-6"
                        >
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => removeUser.mutate(m.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-400 hover:text-red-600 flex items-center gap-1"
                          title="Remove from organisation"
                        >
                          <UserX className="h-3 w-3" />Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />Pending Invitations ({invitations.length})
              </h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase">Email</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase">Role</th>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs uppercase">Expires</th>
                      <th className="px-4 py-2.5 w-40"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invitations.map((inv, i) => (
                      <tr key={inv.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                        <td className="px-4 py-2.5 text-gray-700 text-xs font-mono">{inv.email}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{ROLES.find(r => r.value === inv.role)?.label ?? inv.role}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">
                          {new Date(inv.expires_at).toLocaleDateString("en-AU")}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => resendInvitation.mutate(inv.id)}
                              className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1">
                              <Mail className="h-3 w-3" />Resend
                            </button>
                            <button type="button" onClick={() => revokeInvitation.mutate(inv.id)}
                              className="text-xs text-gray-400 hover:text-red-600 flex items-center gap-1">
                              <X className="h-3 w-3" />Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {users.length === 0 && invitations.length === 0 && !showInvite && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-400 mb-4">No users yet. Invite your first team member.</p>
              <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
                <Plus className="h-3.5 w-3.5" />Invite User
              </Button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}

function InviteForm({ onCancel, onInvite, saving }: {
  onCancel: () => void
  onInvite: (body: { email: string; role: string; display_name: string }) => void
  saving: boolean
}) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("bookkeeper")

  return (
    <div className="border border-primary-200 rounded-lg bg-primary-50/30 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Invite a team member</h3>
        <button type="button" onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email address *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@example.com"
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name (optional)</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith"
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500">
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} — {r.description}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => onInvite({ email, role, display_name: name })} loading={saving} disabled={!email}>
            <Check className="h-3.5 w-3.5" />Send Invitation
          </Button>
        </div>
      </div>
    </div>
  )
}
