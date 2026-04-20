// Spec references: R-0068 (PA-001 through PA-005), A-0038.
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel, Skeleton } from "@/components/primitives"
import { DateValue, StatusPill } from "@/components/financial"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
import { api } from "@/shared/lib/api"
import { Check, X, ChevronRight, Mail, Phone, Building2, MapPin } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface SignupRequest {
  id: number
  business_name: string
  contact_name: string
  email: string
  phone: string
  business_type: string
  address_state: string
  status: string
  abn_validation_status: string
  email_verification_status: string
  stripe_setup_intent_id: string | null
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_reason: string | null
}

function statusSemantic(s: string): "muted" | "info" | "success" | "danger" | "warning" {
  switch (s) {
    case "pending_review": return "warning"
    case "accepted": return "success"
    case "rejected": return "danger"
    case "provisioning_started": return "info"
    case "provisioned": return "success"
    case "provisioning_failed": return "danger"
    default: return "muted"
  }
}

export function SignupQueuePage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])
  const feedback = useFeedback()
  const qc = useQueryClient()
  const [filter, setFilter] = useState("pending_review")
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const { data: signups, isLoading } = useQuery({
    queryKey: ["platform", "signups", filter],
    queryFn: () => api.get<SignupRequest[]>(`/platform/signups?status=${filter}`),
  })

  const accept = useMutation({
    mutationFn: (id: number) => api.post(`/platform/signups/${id}/accept`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform", "signups"] }); feedback.success("Signup accepted — provisioning will begin") },
    onError: (err: Error) => feedback.error("Accept failed", err.message),
  })

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.post(`/platform/signups/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform", "signups"] }); feedback.success("Signup rejected"); setRejectReason("") },
    onError: (err: Error) => feedback.error("Reject failed", err.message),
  })

  const pending = (signups ?? []).filter(s => s.status === "pending_review").length

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Sign-up Queue</h1>
        {pending > 0 && <span className="text-sm font-medium text-amber-600">{pending} pending</span>}
      </div>
      <p className="text-sm text-gray-500">Review and approve new business sign-ups</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Sign-up review" storageKey="platform-signups-info" collapsible>
        <p>New sign-ups from ledgius.com appear here. Review the details, verify the card is valid (Stripe SetupIntent), then accept to start provisioning or reject with a reason.</p>
      </InfoPanel>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["pending_review", "accepted", "rejected", "provisioned"] as const).map(s => (
          <button key={s} type="button" onClick={() => setFilter(s)}
            className={cn("px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              filter === s ? "bg-gray-700 text-white" : "text-gray-600 hover:bg-gray-100"
            )}>
            {s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
      ) : (signups ?? []).length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-12">No {filter.replace(/_/g, " ")} sign-ups</div>
      ) : (
        <div className="space-y-2">
          {(signups ?? []).map((s, idx) => (
            <div key={s.id} className={cn(
              "border rounded-lg bg-white overflow-hidden",
              s.status === "pending_review" ? "border-amber-200" : "border-gray-200"
            )}>
              {/* Summary row */}
              <div
                className={cn("px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors", idx % 2 === 1 && "bg-gray-50/50")}
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-800">{s.business_name}</span>
                    {s.business_type && <span className="text-xs text-gray-400">({s.business_type})</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>
                    {s.address_state && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.address_state}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <DateValue value={s.created_at} format="relative" className="text-xs text-gray-400" />
                  <StatusPill status={s.status.replace(/_/g, " ")} semantic={statusSemantic(s.status)} className="text-xs" />
                  {s.stripe_setup_intent_id && <span className="text-xs text-green-600" title="Card verified">💳</span>}
                  <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform", expandedId === s.id && "rotate-90")} />
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === s.id && (
                <div className="border-t border-gray-200 px-4 py-4 bg-gray-50 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-xs text-gray-500">Contact Name</span><p className="text-gray-800">{s.contact_name}</p></div>
                    <div><span className="text-xs text-gray-500">Email</span><p className="text-gray-800">{s.email}</p></div>
                    <div><span className="text-xs text-gray-500">Phone</span><p className="text-gray-800">{s.phone || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Business Type</span><p className="text-gray-800">{s.business_type || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">State</span><p className="text-gray-800">{s.address_state || "—"}</p></div>
                    <div><span className="text-xs text-gray-500">Card Verified</span><p className="text-gray-800">{s.stripe_setup_intent_id ? "Yes ✓" : "No"}</p></div>
                    <div><span className="text-xs text-gray-500">ABN Check</span><p className="text-gray-800">{s.abn_validation_status}</p></div>
                    <div><span className="text-xs text-gray-500">Email Verified</span><p className="text-gray-800">{s.email_verification_status}</p></div>
                  </div>

                  {s.rejection_reason && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs font-medium text-red-700">Rejection reason:</p>
                      <p className="text-sm text-red-600 mt-1">{s.rejection_reason}</p>
                    </div>
                  )}

                  {s.status === "pending_review" && (
                    <div className="flex items-end gap-3 pt-2 border-t border-gray-200">
                      <Button variant="primary" size="sm" onClick={() => accept.mutate(s.id)} loading={accept.isPending}>
                        <Check className="h-3.5 w-3.5" /> Accept & Provision
                      </Button>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Rejection reason</label>
                        <input type="text" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                          className="w-full bg-white border border-gray-300 rounded px-2 py-1.5 text-sm"
                          placeholder="Why is this signup being rejected?" />
                      </div>
                      <Button variant="secondary" size="sm" disabled={!rejectReason} onClick={() => reject.mutate({ id: s.id, reason: rejectReason })} loading={reject.isPending}>
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
