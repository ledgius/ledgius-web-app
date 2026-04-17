// Spec references: R-0019, A-0019
import { BackLink } from "@/components/primitives"
import { useState, useEffect, useCallback, useRef } from "react"
import { Link } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { Button, Combobox, Skeleton, Badge, InfoPanel } from "@/components/primitives"
import { useFeedback } from "@/components/feedback"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { useImportBatches } from "@/domains/banking/hooks/useBanking"
import { formatCurrency, formatDate, cn } from "@/shared/lib/utils"
import {
  useReconQueue,
  useReconCandidates,
  useReconSummary,
  useReconAudit,
  useMatchLine,
  useDeferLine,
  useExcludeLine,
  useUndoAction,
  useBulkAccept,
  useRunPipeline,
  useCreateFromLine,
  useCreateBankRule,
  type QueueItem,
  type MatchCandidate,
  type QueueFilter,
  type QueueSort,
} from "../hooks/useReconciliation"
import { useBankRules, useDeleteBankRule, useUpdateRulePriority, type BankRule } from "@/domains/banking/hooks/useBanking"
import {
  Play,
  CheckCheck,
  Undo2,
  Clock,
  XCircle,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Circle,
  Zap,
  Filter,
  Search,
  RefreshCw,
  X,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

// ── Pattern extraction ────────────────────────────────────────────────────────

/**
 * Extract the stable "merchant" portion of a bank transaction description.
 * Strips leading transaction codes, trailing dates, and variable IDs.
 *
 * Example: "DEPOSIT 2459971 Square Australia Pty Ltd T3N8TVQKRJS78XT 05 JUL 2025"
 *          → "Square Australia Pty Ltd"
 */
function extractPattern(description: string): string {
  if (!description) return ""
  // Remove leading codes like "DEPOSIT 1234567" or "PAYMENT 9876543"
  let s = description.replace(/^\s*[A-Z]+\s+\d+\s*/i, "")
  // Remove trailing date like "05 JUL 2025" or "05/07/2025"
  s = s.replace(/\s+\d{1,2}\s+[A-Z]{3}\s+\d{4}\s*$/i, "")
  s = s.replace(/\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/, "")
  // Remove trailing alphanumeric ID tokens (all caps/digits 8+ chars)
  s = s.replace(/\s+[A-Z0-9]{8,}\s*$/i, "")
  return s.trim()
}

// ── Status helpers ────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string
  badgeVariant: "default" | "info" | "warning" | "danger" | "success" | "outline"
  icon: React.ReactNode
}

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case "imported":
      return { label: "Imported", badgeVariant: "default", icon: <Circle className="h-3 w-3" /> }
    case "auto_matched":
      return { label: "Auto-matched", badgeVariant: "info", icon: <Zap className="h-3 w-3" /> }
    case "needs_review":
      return { label: "Review", badgeVariant: "warning", icon: <AlertTriangle className="h-3 w-3" /> }
    case "exception":
      return { label: "Exception", badgeVariant: "danger", icon: <XCircle className="h-3 w-3" /> }
    case "resolved":
      return { label: "Resolved", badgeVariant: "success", icon: <CheckCircle2 className="h-3 w-3" /> }
    default:
      return { label: status, badgeVariant: "outline", icon: null }
  }
}

function confidenceColor(score: number): string {
  if (score >= 80) return "text-green-600 bg-green-50"
  if (score >= 50) return "text-amber-600 bg-amber-50"
  return "text-red-600 bg-red-50"
}

function confidenceBarColor(score: number): string {
  if (score >= 80) return "bg-green-500"
  if (score >= 50) return "bg-amber-500"
  return "bg-red-500"
}

// Evidence chip colour coding per chip type
function evidenceChipClass(chip: string): string {
  if (chip.includes("exact") || chip.includes("reference")) return "bg-green-50 text-green-700 border-green-200"
  if (chip.includes("date") || chip.includes("amount")) return "bg-blue-50 text-blue-700 border-blue-200"
  if (chip.includes("counterparty") || chip.includes("contact")) return "bg-purple-50 text-purple-700 border-purple-200"
  return "bg-gray-50 text-gray-600 border-gray-200"
}

function formatEvidenceLabel(chip: string | undefined): string {
  if (!chip) return ""
  return chip
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Left pane — individual queue row
function BankLineRow({
  item,
  selected,
  onClick,
}: {
  item: QueueItem
  selected: boolean
  onClick: () => void
}) {
  const { label, badgeVariant, icon } = getStatusConfig(item.reconciliation_status)
  const amount = typeof item?.amount === "number" ? (item?.amount ?? 0) : parseFloat(String(item?.amount ?? 0))
  const isCredit = amount >= 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 border-b border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none",
        selected && "bg-primary-50 border-l-2 border-l-primary-500 ring-1 ring-inset ring-primary-200"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-xs text-gray-500 shrink-0">{formatDate(item.trans_date)}</span>
        <span
          className={cn(
            "text-sm font-mono font-semibold shrink-0",
            isCredit ? "text-green-700" : "text-red-700"
          )}
        >
          {formatCurrency(amount)}
        </span>
      </div>
      <p className="text-xs text-gray-700 truncate mb-1.5">
        {item.normalized_description || item.description || "—"}
      </p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={badgeVariant} className="inline-flex items-center gap-1 text-xs py-0">
          {icon}
          {label}
        </Badge>
        {item.confidence_score !== null && item.confidence_score !== undefined && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0 text-xs font-medium",
              confidenceColor(item.confidence_score)
            )}
          >
            {Math.round(item.confidence_score)}%
          </span>
        )}
      </div>
    </button>
  )
}

// Center pane — single candidate card
function CandidateCard({
  candidate,
  rank,
  onAccept,
  accepting,
}: {
  candidate: MatchCandidate
  rank: number
  onAccept: (candidate: MatchCandidate) => void
  accepting: boolean
}) {
  const amount = typeof candidate.amount === "number" ? candidate.amount : parseFloat(String(candidate.amount))
  const isCredit = amount >= 0

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white hover:border-gray-400 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-xs font-medium text-gray-600 shrink-0">
            {rank}
          </span>
          <span className="font-medium text-sm text-gray-900 truncate">{candidate.account_name}</span>
        </div>
        <span
          className={cn(
            "text-sm font-mono font-semibold shrink-0",
            isCredit ? "text-green-700" : "text-red-700"
          )}
        >
          {formatCurrency(amount)}
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span>{formatDate(candidate.trans_date)}</span>
        {candidate.reference && <span className="truncate">{candidate.reference}</span>}
        <span className="ml-auto text-xs">Pass {candidate.match_pass}</span>
      </div>

      {/* Confidence bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Confidence</span>
          <span className={cn("font-medium px-1.5 py-0.5 rounded", confidenceColor(candidate.confidence_score))}>
            {Math.round(candidate.confidence_score)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", confidenceBarColor(candidate.confidence_score))}
            style={{ width: `${Math.min(100, Math.round(candidate.confidence_score))}%` }}
          />
        </div>
      </div>

      {/* Evidence chips */}
      {candidate.evidence_chips && candidate.evidence_chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {candidate.evidence_chips.map((chip) => (
            <span
              key={chip}
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                evidenceChipClass(chip)
              )}
            >
              {formatEvidenceLabel(chip)}
            </span>
          ))}
        </div>
      )}

      {/* Explanation */}
      {candidate.explanation && (
        <p className="text-xs text-gray-500 mb-3 italic">{candidate.explanation}</p>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onAccept(candidate)}
          disabled={accepting}
          className="flex-1"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Accept
        </Button>
        <Button variant="secondary" size="sm" disabled>
          Split
        </Button>
      </div>
    </div>
  )
}

// Right pane detail tabs
type DetailTab = "details" | "actions" | "audit"

function DetailInspector({
  item,
  onDefer,
  onExclude,
  onUndo,
  deferring,
  excluding,
  undoing,
}: {
  item: QueueItem
  onDefer: (lineId: number, reasonCode: string, notes: string) => void
  onExclude: (lineId: number, reasonCode: string, notes: string) => void
  onUndo: (lineId: number) => void
  deferring: boolean
  excluding: boolean
  undoing: boolean
}) {
  const [tab, setTab] = useState<DetailTab>("details")
  const [deferReason, setDeferReason] = useState("")
  const [deferNotes, setDeferNotes] = useState("")
  const [excludeReason, setExcludeReason] = useState("")
  const [excludeNotes, setExcludeNotes] = useState("")
  const [showDeferForm, setShowDeferForm] = useState(false)
  const [showExcludeForm, setShowExcludeForm] = useState(false)

  const { data: auditEvents, isLoading: auditLoading } = useReconAudit(tab === "audit" ? item.id : null)

  const amount = typeof item?.amount === "number" ? (item?.amount ?? 0) : parseFloat(String(item?.amount ?? 0))
  const { label, badgeVariant } = getStatusConfig(item.reconciliation_status)

  const handleDefer = () => {
    if (!deferReason) return
    onDefer(item.id, deferReason, deferNotes)
    setShowDeferForm(false)
    setDeferReason("")
    setDeferNotes("")
  }

  const handleExclude = () => {
    if (!excludeReason || !excludeNotes) return
    onExclude(item.id, excludeReason, excludeNotes)
    setShowExcludeForm(false)
    setExcludeReason("")
    setExcludeNotes("")
  }

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "actions", label: "Actions" },
    { key: "audit", label: "Audit" },
  ]

  const entities = item.extracted_entities
    ? Object.entries(item.extracted_entities).flatMap(([key, val]) =>
        Array.isArray(val) ? val.map((v) => ({ key, value: String(v) })) : [{ key, value: String(val) }]
      )
    : []

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-300 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors",
              tab === t.key
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* ── Details tab ── */}
        {tab === "details" && (
          <>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Status</p>
              <Badge variant={badgeVariant}>{label}</Badge>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Amount</p>
              <p className={cn("text-lg font-mono font-semibold", amount >= 0 ? "text-green-700" : "text-red-700")}>
                {formatCurrency(amount)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Raw Description</p>
              <p className="text-sm text-gray-700 break-words">{item.description || "—"}</p>
            </div>

            {item.normalized_description && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Normalised</p>
                <p className="text-sm text-gray-700 font-mono break-words">{item.normalized_description}</p>
              </div>
            )}

            {item.counterparty_name && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Counterparty</p>
                <p className="text-sm text-gray-700">{item.counterparty_name}</p>
              </div>
            )}

            {item.reference && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Reference</p>
                <p className="text-sm text-gray-700 font-mono">{item.reference}</p>
              </div>
            )}

            {item.channel && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Channel</p>
                <p className="text-sm text-gray-700 capitalize">{item.channel}</p>
              </div>
            )}

            {entities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Extracted Entities</p>
                <div className="flex flex-wrap gap-1">
                  {entities.map((e, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs text-purple-700"
                      title={e.key}
                    >
                      {e.value}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {item.confidence_score !== null && item.confidence_score !== undefined && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Pipeline Confidence</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", confidenceBarColor(item.confidence_score))}
                      style={{ width: `${Math.min(100, item.confidence_score)}%` }}
                    />
                  </div>
                  <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", confidenceColor(item.confidence_score))}>
                    {Math.round(item.confidence_score)}%
                  </span>
                </div>
                {item.match_pass !== null && (
                  <p className="text-xs text-gray-400 mt-1">Pass {item.match_pass} match</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Actions tab ── */}
        {tab === "actions" && (
          <>
            <p className="text-xs text-gray-500">
              Actions create or link ledger entries to this bank line. Use keyboard shortcuts for speed: <kbd className="px-1 py-0.5 rounded bg-gray-100 text-xs font-mono">d</kbd> defer, <kbd className="px-1 py-0.5 rounded bg-gray-100 text-xs font-mono">x</kbd> exclude, <kbd className="px-1 py-0.5 rounded bg-gray-100 text-xs font-mono">u</kbd> undo.
            </p>

            <div className="space-y-2">
              {/* Undo */}
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                onClick={() => onUndo(item.id)}
                disabled={undoing}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo last action
              </Button>
            </div>

            {/* Defer form */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setShowDeferForm(!showDeferForm)}
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Defer
                </span>
                <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform", showDeferForm && "rotate-90")} />
              </button>
              {showDeferForm && (
                <div className="p-3 space-y-3 border-t border-gray-300">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reason code</label>
                    <input
                      type="text"
                      value={deferReason}
                      onChange={(e) => setDeferReason(e.target.value)}
                      placeholder="e.g. awaiting_invoice"
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={deferNotes}
                      onChange={(e) => setDeferNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>
                  <Button variant="primary" size="sm" onClick={handleDefer} disabled={!deferReason || deferring}>
                    Confirm Defer
                  </Button>
                </div>
              )}
            </div>

            {/* Exclude form */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => setShowExcludeForm(!showExcludeForm)}
              >
                <span className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  Exclude
                </span>
                <ChevronRight className={cn("h-4 w-4 text-gray-400 transition-transform", showExcludeForm && "rotate-90")} />
              </button>
              {showExcludeForm && (
                <div className="p-3 space-y-3 border-t border-gray-300">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
                    <select
                      value={excludeReason}
                      onChange={(e) => setExcludeReason(e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select reason...</option>
                      <option value="duplicate">Duplicate transaction</option>
                      <option value="bank_error">Bank error</option>
                      <option value="already_accounted">Already accounted for</option>
                      <option value="out_of_scope">Out of scope for this entity</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes (required)</label>
                    <textarea
                      value={excludeNotes}
                      onChange={(e) => setExcludeNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleExclude}
                    disabled={!excludeReason || !excludeNotes || excluding}
                  >
                    Confirm Exclude
                  </Button>
                </div>
              )}
            </div>

          </>
        )}

        {/* ── Audit tab ── */}
        {tab === "audit" && (
          <>
            {auditLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : auditEvents && auditEvents.length > 0 ? (
              <div className="space-y-3">
                {auditEvents.map((event) => (
                  <div key={event.id} className="flex gap-2">
                    <div className="mt-1 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-gray-700 capitalize">
                          {(event.event_type ?? "").replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(event.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500">{event.actor}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No audit events yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Rule Creation Panel with live pattern matching and amount limits ──────────

function highlightPattern(text: string, pattern: string): React.ReactNode {
  if (!pattern || !text) return <span className="text-xs text-gray-600">{text}</span>
  const idx = text.toLowerCase().indexOf(pattern.toLowerCase())
  if (idx === -1) return <span className="text-xs text-gray-600">{text}</span>
  return (
    <span className="text-xs text-gray-600">
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + pattern.length)}</mark>
      {text.slice(idx + pattern.length)}
    </span>
  )
}

interface RuleCreationPanelProps {
  item: QueueItem
  accounts: { id: number; accno: string; description: string | null; category: string }[]
  rulePattern: string
  onPatternChange: (v: string) => void
  ruleAccountId: number
  onAccountChange: (v: number) => void
  creating: boolean
  onSave: (pattern: string, accountId: number) => void
}

function RuleCreationPanel({
  item, accounts, rulePattern, onPatternChange,
  ruleAccountId, onAccountChange, creating, onSave,
}: RuleCreationPanelProps) {
  const [showRuleIncome, setShowRuleIncome] = useState(true)
  const [showRuleExpense, setShowRuleExpense] = useState(true)
  const [showRuleOther, setShowRuleOther] = useState(false)
  const [amountMode, setAmountMode] = useState<"any" | "exact" | "range">("any")
  const [amountExact, setAmountExact] = useState("")
  const [amountMin, setAmountMin] = useState("")
  const [amountMax, setAmountMax] = useState("")

  const sampleDescription = item.description ?? ""
  const patternMatches = rulePattern
    ? sampleDescription.toLowerCase().includes(rulePattern.toLowerCase())
    : false

  return (
    <>
      <p className="text-xs text-gray-500 mb-3">
        Create a rule so future transactions matching this pattern are automatically classified.
      </p>

      <div className="space-y-3">
        {/* Sample transaction */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Sample transaction</p>
          <div className="font-mono text-xs text-gray-700 break-all leading-relaxed">
            {highlightPattern(sampleDescription, rulePattern)}
          </div>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
            <span>{item.trans_date}</span>
            <span className={cn("font-mono font-medium", (item?.amount ?? 0) < 0 ? "text-red-600" : "text-green-600")}>
              ${Math.abs((item?.amount ?? 0)).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Pattern input */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description pattern</label>
          <input
            type="text"
            value={rulePattern}
            onChange={(e) => onPatternChange(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex items-center gap-2 mt-1">
            {rulePattern && (
              <span className={cn(
                "text-[10px] font-medium",
                patternMatches ? "text-green-600" : "text-red-500"
              )}>
                {patternMatches ? "Pattern matches sample" : "Pattern does not match sample"}
              </span>
            )}
          </div>
        </div>

        {/* Amount qualifier */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount filter (optional)</label>
          <div className="flex gap-1.5 mb-2">
            {(["any", "exact", "range"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAmountMode(m)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-medium border transition-colors",
                  amountMode === m
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                )}
              >
                {m === "any" ? "Any amount" : m === "exact" ? "Exact amount" : "Amount range"}
              </button>
            ))}
          </div>
          {amountMode === "exact" && (
            <div>
              <input
                type="number"
                step="0.01"
                value={amountExact}
                onChange={(e) => setAmountExact(e.target.value)}
                placeholder={Math.abs((item?.amount ?? 0)).toFixed(2)}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
          {amountMode === "range" && (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="0.01"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="Min"
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="number"
                step="0.01"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="Max"
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>

        {/* Target account with category filters */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Target GL account</label>
          <div className="flex items-center gap-2 mb-2">
            <button type="button" onClick={() => setShowRuleIncome(!showRuleIncome)}
              className={cn("px-2 py-0.5 rounded-full text-xs font-medium border transition-colors",
                showRuleIncome ? "bg-green-50 border-green-300 text-green-700" : "bg-white border-gray-300 text-gray-400")}>
              Income
            </button>
            <button type="button" onClick={() => setShowRuleExpense(!showRuleExpense)}
              className={cn("px-2 py-0.5 rounded-full text-xs font-medium border transition-colors",
                showRuleExpense ? "bg-red-50 border-red-300 text-red-700" : "bg-white border-gray-300 text-gray-400")}>
              Expense
            </button>
            <button type="button" onClick={() => setShowRuleOther(!showRuleOther)}
              className={cn("px-2 py-0.5 rounded-full text-xs font-medium border transition-colors",
                showRuleOther ? "bg-blue-50 border-blue-300 text-blue-700" : "bg-white border-gray-300 text-gray-400")}>
              Other
            </button>
          </div>
          <Combobox
            options={accounts
              .filter((a) => {
                if (a.category === "I" && !showRuleIncome) return false
                if (a.category === "E" && !showRuleExpense) return false
                if (!["I", "E"].includes(a.category) && !showRuleOther) return false
                return true
              })
              .map((a) => {
                const catLabels: Record<string, string> = { A: "Asset", L: "Liability", Q: "Equity", I: "Income", E: "Expense" }
                return {
                  value: a.id,
                  label: `${a.accno} — ${a.description}`,
                  detail: catLabels[a.category] ?? a.category,
                }
              })}
            value={ruleAccountId || null}
            onChange={(v) => onAccountChange(v ? Number(v) : 0)}
            placeholder="Search accounts..."
          />
        </div>

        <Button
          size="sm"
          variant="primary"
          disabled={!rulePattern || !ruleAccountId || creating}
          onClick={() => onSave(rulePattern, ruleAccountId)}
        >
          {creating ? "Saving..." : "Save Rule"}
        </Button>
      </div>

      <div className="border-t border-gray-200 pt-3 mt-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">How rules work</h4>
        <p className="text-[10px] text-gray-400 leading-relaxed">
          When you run Auto-Match, the system checks each bank transaction against your rules. If the description contains the pattern text (and amount matches if specified), the transaction is automatically classified to the target account.
        </p>
      </div>
    </>
  )
}

// ── Create Entry Form with smart filtering, search, and past matches ─────────

interface CreateEntryFormProps {
  accounts: { id: number; accno: string; description: string | null; category: string }[]
  selectedItem: QueueItem
  accountId: number
  onAccountChange: (id: number) => void
  description: string
  onDescriptionChange: (d: string) => void
  rememberRule: boolean
  onRememberRuleChange: (v: boolean) => void
  creating: boolean
  onSubmit: () => void
}

function CreateEntryForm({
  accounts, selectedItem, accountId, onAccountChange,
  description, onDescriptionChange, rememberRule, onRememberRuleChange,
  creating, onSubmit,
}: CreateEntryFormProps) {

  const [showIncome, setShowIncome] = useState(true)
  const [showExpense, setShowExpense] = useState(true)
  const [showPastMatches, setShowPastMatches] = useState(false)
  const [rulePatternOverride, setRulePatternOverride] = useState("")
  const pastMatchesRef = useRef<HTMLDivElement>(null)

  // Smart default: positive amount = income first, negative = expense first
  // Also derive a clean rule pattern from the description
  useEffect(() => {
    if (selectedItem) {
      const isCredit = (selectedItem?.amount ?? 0) > 0
      setShowIncome(isCredit)
      setShowExpense(!isCredit)
      setRulePatternOverride(extractPattern(selectedItem.description ?? ""))
    }
  }, [selectedItem?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close past matches popup on outside click
  useEffect(() => {
    if (!showPastMatches) return
    function handleClick(e: MouseEvent) {
      if (pastMatchesRef.current && !pastMatchesRef.current.contains(e.target as Node)) {
        setShowPastMatches(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showPastMatches])

  // Filter accounts by category toggles (Combobox handles text search internally)
  const filteredAccounts = accounts.filter((a) => {
    if (a.category === "I" && !showIncome) return false
    if (a.category === "E" && !showExpense) return false
    return true
  })

  // Mock past matches — in production this would come from an API endpoint
  // querying acc_trans WHERE chart_id = selectedAccountId ORDER BY transdate DESC LIMIT 10
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const pastMatches = accountId > 0 ? [
    // These would come from the API in a real implementation
  ] : []

  return (
    <div className="border border-gray-300 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-700">Create ledger entry</h3>
      <p className="text-xs text-gray-500">
        Create a journal entry from this bank transaction and match it automatically.
      </p>

      {/* Category filter toggles */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">GL Account</label>
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setShowIncome(!showIncome)}
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium border transition-colors",
              showIncome
                ? "bg-green-50 border-green-300 text-green-700"
                : "bg-white border-gray-300 text-gray-400"
            )}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setShowExpense(!showExpense)}
            className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium border transition-colors",
              showExpense
                ? "bg-red-50 border-red-300 text-red-700"
                : "bg-white border-gray-300 text-gray-400"
            )}
          >
            Expense
          </button>
          <span className="text-[10px] text-gray-400 ml-1">
            {(selectedItem?.amount ?? 0) > 0 ? "(credit — income suggested)" : "(debit — expense suggested)"}
          </span>
        </div>

        {/* Searchable account selector */}
        <Combobox
          options={filteredAccounts.map((a) => ({
            value: a.id,
            label: `${a.accno} — ${a.description}`,
            detail: a.category === "I" ? "Income" : "Expense",
          }))}
          value={accountId || null}
          onChange={(v) => onAccountChange(v ? Number(v) : 0)}
          placeholder="Search accounts..."
        />

        {/* Past matches button + popup */}
        {accountId > 0 && (
          <div className="relative mt-1.5" ref={pastMatchesRef}>
            <button
              type="button"
              onClick={() => setShowPastMatches(!showPastMatches)}
              className="text-xs text-primary-600 hover:text-primary-800 hover:underline"
            >
              Show past matches for {selectedAccount?.accno ?? "this account"}
            </button>
            {showPastMatches && (
              <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700">Recent transactions for {selectedAccount?.accno} — {selectedAccount?.description}</p>
                </div>
                {pastMatches.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-gray-400">
                    No past matches yet for this account. Once you create entries, previous matches will appear here.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {pastMatches.map((m: { date: string; description: string; amount: number }, i: number) => (
                      <div key={i} className="px-3 py-2 text-xs flex items-center gap-3">
                        <span className="text-gray-400 tabular-nums shrink-0">{m.date}</span>
                        <span className="text-gray-700 truncate flex-1">{m.description}</span>
                        <span className={cn("font-mono tabular-nums shrink-0", m.amount < 0 ? "text-red-600" : "text-green-600")}>
                          ${Math.abs(m.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <label className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            checked={rememberRule}
            onChange={(e) => onRememberRuleChange(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span>Also create a rule for future similar transactions</span>
        </label>
        {rememberRule && (
          <div className="px-3 py-2 border-t border-gray-200 bg-white space-y-2">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Rule pattern (editable)</label>
              <input
                type="text"
                data-rule-pattern
                value={rulePatternOverride}
                onChange={(e) => setRulePatternOverride(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <p className="text-[10px] text-gray-400">
              Future transactions containing "<strong>{rulePatternOverride}</strong>" will auto-match to this account.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={!accountId || creating}
          onClick={onSubmit}
        >
          {creating ? "Creating..." : "Create & Match"}
        </Button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ReconciliationPage() {
  usePageHelp(pageHelpContent.banking)
  usePagePolicies(["banking"])

  const feedback = useFeedback()
  const { data: accounts } = useAccounts()
  const [selectedAccountId, setSelectedAccountId] = useState(0)
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null)
  const [sort, setSort] = useState<QueueSort>("risk_first")
  const [filter, setFilter] = useState<QueueFilter>("all")
  const [searchText, setSearchText] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [pipelineMessage, setPipelineMessage] = useState<{ type: "success" | "info" | "error"; text: string } | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Create-from-line form state
  const [createAccountId, setCreateAccountId] = useState<number>(0)
  const [createDescription, setCreateDescription] = useState<string>("")
  const [createRememberRule, setCreateRememberRule] = useState(false)
  const [bulkAccepted, setBulkAccepted] = useState(false)
  const [centerTab, setCenterTab] = useState<"allocation" | "rules">("allocation")
  const [rulePattern, setRulePattern] = useState("")
  const [ruleAccountId, setRuleAccountId] = useState<number>(0)
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null)

  // Data queries
  const { data: queue, isLoading: queueLoading, error: queueError } = useReconQueue(selectedAccountId, sort, filter)
  const { data: candidatesData, isLoading: candidatesLoading } = useReconCandidates(selectedLineId)
  const { data: summary } = useReconSummary(selectedAccountId)
  const { data: importBatches } = useImportBatches(selectedAccountId)
  const { data: bankRules, isLoading: rulesLoading } = useBankRules(selectedAccountId)

  // Mutations
  const matchLine = useMatchLine()
  const deferLine = useDeferLine()
  const excludeLine = useExcludeLine()
  const undoAction = useUndoAction()
  const bulkAccept = useBulkAccept()
  const runPipeline = useRunPipeline()
  const createFromLine = useCreateFromLine()
  const createBankRule = useCreateBankRule()
  const deleteBankRule = useDeleteBankRule()
  const updateRulePriority = useUpdateRulePriority()

  const candidates = candidatesData?.candidates ?? []
  const selectedItem = queue?.find((q) => q.id === selectedLineId) ?? null
  const queueRaw = queue ?? []
  const queueList = searchText
    ? queueRaw.filter((q) => {
        const s = searchText.toLowerCase()
        return (
          (q.description ?? "").toLowerCase().includes(s) ||
          (q.reference ?? "").toLowerCase().includes(s) ||
          (q.counterparty_name ?? "").toLowerCase().includes(s) ||
          (q.normalized_description ?? "").toLowerCase().includes(s) ||
          String(q.amount ?? "").includes(s)
        )
      })
    : queueRaw

  const allAccounts = accounts ?? []
  const bankAccounts = allAccounts.filter((a) => a.category === "A")
  const incomeExpenseAccounts = allAccounts.filter((a) => a.category === "E" || a.category === "I")
  const catLabel: Record<string, string> = { A: "Asset", L: "Liability", Q: "Equity", I: "Income", E: "Expense" }
  const accountOptions = bankAccounts.map((a) => ({
    value: a.id,
    label: `${a.accno} — ${a.description}`,
    detail: catLabel[a.category] ?? a.category,
  }))

  // Progress metrics from summary
  const total = summary?.total_transactions ?? queueList.length
  const reconciled = (summary?.auto_matched ?? 0) + (summary?.manually_matched ?? 0)
  const progressPct = total > 0 ? Math.round((reconciled / total) * 100) : 0

  // Keyboard navigation
  const selectedIndex = selectedLineId !== null ? queueList.findIndex((q) => q.id === selectedLineId) : -1

  const handleAcceptTopCandidate = useCallback(async (lineId: number, candidate: MatchCandidate) => {
    try {
      await matchLine.mutateAsync({
        lineId,
        body: {
          match_type: "one_to_one",
          matched_entry_ids: [candidate.entry_id],
        },
      })
      feedback.success(`Match accepted — linked to ${candidate.account_name}`)
    } catch (err: unknown) {
      feedback.error("Match failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [matchLine, feedback])

  const handleDefer = useCallback(async (lineId: number, reasonCode: string, notes: string) => {
    try {
      await deferLine.mutateAsync({ lineId, body: { reason_code: reasonCode, notes } })
      feedback.success("Line deferred")
    } catch (err: unknown) {
      feedback.error("Defer failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [deferLine, feedback])

  const handleExclude = useCallback(async (lineId: number, reasonCode: string, notes: string) => {
    try {
      await excludeLine.mutateAsync({ lineId, body: { reason_code: reasonCode, notes } })
      feedback.success("Line excluded")
    } catch (err: unknown) {
      feedback.error("Exclude failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [excludeLine, feedback])

  const handleUndo = useCallback(async (lineId: number) => {
    try {
      await undoAction.mutateAsync({ lineId })
      feedback.success("Action undone")
    } catch (err: unknown) {
      feedback.error("Undo failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [undoAction, feedback])

  const handleRunPipeline = useCallback(async () => {
    if (!selectedAccountId) return
    try {
      const result = await runPipeline.mutateAsync({ account_id: selectedAccountId })
      const r = result as Record<string, number> | undefined
      const matched = (r?.pass1_matched ?? 0) + (r?.pass2_matched ?? 0) + (r?.pass3_matched ?? 0) + (r?.pass4_generated ?? 0) + (r?.pass5_suggested ?? 0)
      const review = r?.needs_review ?? 0
      const total = (r?.total_processed ?? 0)

      if (matched > 0) {
        const msg = `Auto-matching complete — ${matched} transaction${matched !== 1 ? "s" : ""} matched.${review > 0 ? ` ${review} need manual review.` : ""}`
        feedback.success(msg)
        setPipelineMessage({ type: "success", text: msg })
      } else if (review > 0) {
        const msg = `${review} transaction${review !== 1 ? "s" : ""} processed — no automatic matches found. These are now in the Review queue on the left. Click each one to manually match or create a ledger entry.`
        feedback.info(msg)
        setPipelineMessage({ type: "info", text: msg })
      } else if (total === 0) {
        const msg = "No transactions to process. Import your bank statements first (Banking → Bank Statements)."
        feedback.info(msg)
        setPipelineMessage({ type: "info", text: msg })
      } else {
        const msg = "Auto-matching complete — all transactions already processed."
        feedback.success(msg)
        setPipelineMessage({ type: "success", text: msg })
      }
    } catch (err: unknown) {
      feedback.error("Auto-matching failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [runPipeline, selectedAccountId, feedback])

  const handleBulkAccept = useCallback(async () => {
    const exactMatches = queueList.filter(
      (q) => q.reconciliation_status === "auto_matched" && q.confidence_score !== null && q.confidence_score >= 95
    )
    if (exactMatches.length === 0) {
      feedback.info("No exact matches — no auto-matched items with confidence ≥ 95% found")
      return
    }
    try {
      await bulkAccept.mutateAsync({ bank_transaction_ids: exactMatches.map((q) => q.id) })
      setBulkAccepted(true)
      feedback.success(`Bulk accepted ${exactMatches.length} exact matches`)
    } catch (err: unknown) {
      feedback.error("Bulk accept failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [bulkAccept, queueList, feedback])

  const handleCreateEntry = useCallback(async () => {
    if (!selectedLineId || !createAccountId) return
    const desc = createDescription || selectedItem?.description || ""
    try {
      await createFromLine.mutateAsync({
        lineId: selectedLineId,
        account_id: createAccountId,
        description: desc,
        remember_rule: createRememberRule,
        rule_pattern: createRememberRule ? (document.querySelector<HTMLInputElement>('[data-rule-pattern]')?.value ?? extractPattern(selectedItem?.description ?? "")) : "",
      })
      feedback.success("Ledger entry created and matched")
      setCreateAccountId(0)
      setCreateDescription("")
      setCreateRememberRule(false)
    } catch (err: unknown) {
      feedback.error("Create entry failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [selectedLineId, createAccountId, createDescription, createRememberRule, createFromLine, selectedItem, feedback])

  // Reset rule pattern when selected item changes
  useEffect(() => {
    if (selectedItem) {
      setRulePattern(extractPattern(selectedItem.description ?? ""))
      setRuleAccountId(0)
    }
  }, [selectedItem?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateRule = useCallback(async (_lineId: number, pattern: string, accountId: number) => {
    try {
      await createBankRule.mutateAsync({
        account_id: selectedAccountId,
        name: pattern,
        description_pattern: pattern,
        match_account_id: accountId,
        priority: 10,
      })
      feedback.success(`Rule saved — future "${pattern}" transactions will suggest this account`)
    } catch (err: unknown) {
      feedback.error("Save rule failed", err instanceof Error ? err.message : "Unknown error")
    }
  }, [createBankRule, selectedAccountId, feedback])

  // Keyboard shortcut handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      switch (e.key) {
        case "j": {
          e.preventDefault()
          const next = selectedIndex < queueList.length - 1 ? selectedIndex + 1 : 0
          if (queueList[next]) setSelectedLineId(queueList[next].id)
          break
        }
        case "k": {
          e.preventDefault()
          const prev = selectedIndex > 0 ? selectedIndex - 1 : queueList.length - 1
          if (queueList[prev]) setSelectedLineId(queueList[prev].id)
          break
        }
        case "a": {
          e.preventDefault()
          if (selectedLineId && candidates.length > 0) {
            handleAcceptTopCandidate(selectedLineId, candidates[0])
          }
          break
        }
        case "d": {
          e.preventDefault()
          // Trigger defer — focus Actions tab in inspector
          break
        }
        case "x": {
          e.preventDefault()
          // Trigger exclude — focus Actions tab in inspector
          break
        }
        case "u": {
          e.preventDefault()
          if (selectedLineId) handleUndo(selectedLineId)
          break
        }
        case "/": {
          e.preventDefault()
          searchRef.current?.focus()
          break
        }
        case "Escape": {
          setSelectedLineId(null)
          break
        }
        default: {
          // Number keys 1-9: select candidate by rank
          const n = parseInt(e.key)
          if (!isNaN(n) && n >= 1 && n <= 9 && selectedLineId && candidates[n - 1]) {
            e.preventDefault()
            handleAcceptTopCandidate(selectedLineId, candidates[n - 1])
          }
          break
        }
      }
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [selectedIndex, queueList, selectedLineId, candidates, handleAcceptTopCandidate, handleUndo])

  const exactMatchCount = queueList.filter(
    (q) => q.reconciliation_status === "auto_matched" && q.confidence_score !== null && q.confidence_score >= 95
  ).length

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0">
      <BackLink />

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 mb-4">
        <div className="flex items-baseline gap-3 mb-2">
          <h1 className="text-xl font-semibold text-gray-900">Bank Reconciliation</h1>
          {selectedAccountId > 0 && (
            <span className="text-sm text-gray-500">
              {bankAccounts.find((a) => a.id === selectedAccountId)?.description}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">Match your bank statement to your books</p>

        <InfoPanel title="How to use this page" storageKey="recon-info" className="mb-3">
          <div className="space-y-2">
            {/* Pre-requisite */}
            <div className="flex items-start gap-2">
              {(summary?.total_transactions ?? 0) > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
              )}
              <p className="text-xs">
                {(() => {
                  const batches = (importBatches ?? []) as Array<{imported_at: string; total_rows: number; status: string}>
                  const completeBatches = batches.filter(b => b.status === "complete")
                  const latestBatch = completeBatches.length > 0
                    ? completeBatches.reduce((a, b) => new Date(a.imported_at) > new Date(b.imported_at) ? a : b)
                    : null
                  const totalImported = completeBatches.reduce((sum, b) => sum + (b.total_rows ?? 0), 0)
                  if (latestBatch) {
                    const importDate = new Date(latestBatch.imported_at)
                    const diffMs = Date.now() - importDate.getTime()
                    const daysAgo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
                    const timeLabel = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`
                    return (
                      <>
                        <strong>Pre-requisite:</strong> Bank statement last imported <strong>{timeLabel}</strong> ({totalImported} transactions total).{" "}
                        <Link to="/bank-import-transactions" className="text-primary-600 hover:text-primary-800 underline">Import more</Link>
                      </>
                    )
                  }
                  return (
                    <>
                      <strong>Pre-requisite:</strong> Import bank statements via <Link to="/bank-import-transactions" className="text-primary-600 hover:text-primary-800 underline font-semibold">Import Transactions</Link> before using this page.
                    </>
                  )
                })()}
              </p>
            </div>

            {/* Step 1: Select account + auto-match */}
            <div className="flex items-start gap-2">
              {(summary?.auto_matched ?? 0) > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              ) : (summary?.total_transactions ?? 0) > 0 ? (
                <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
              )}
              <p className="text-xs">
                <strong>1. Select a bank account</strong> from the dropdown above, then click the <strong>"Auto-Match Transactions"</strong> button to find matches.
              </p>
            </div>

            {/* Step 2: Work through items */}
            <div className="flex items-start gap-2">
              {(summary?.manually_matched ?? 0) > 0 && (summary?.needs_review ?? 0) === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              ) : (summary?.manually_matched ?? 0) > 0 ? (
                <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
              )}
              <p className="text-xs">
                <strong>2. Click a transaction</strong> in the left panel. The centre shows match candidates — click <strong>"Create & Match"</strong> to create a ledger entry. Switch to the <strong>Rules</strong> tab in the centre pane to save patterns for future auto-matching.
              </p>
            </div>

            {/* Step 3: Bulk accept */}
            <div className="flex items-start gap-2">
              {bulkAccepted ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 shrink-0 mt-0.5" />
              )}
              <p className="text-xs">
                <strong>3. Bulk actions:</strong> after defining rules and re-running auto-match, the <strong>"Accept exact matches"</strong> button accepts all high-confidence matches at once. Use <strong>Defer</strong> or <strong>Exclude</strong> in the right panel Actions tab for items you want to skip.
              </p>
            </div>
          </div>
        </InfoPanel>

        <div className="flex items-end gap-4 flex-wrap">
          <div className="w-72">
            <label className="block text-xs font-medium text-gray-600 mb-1">Bank Account</label>
            <Combobox
              options={accountOptions}
              value={selectedAccountId || null}
              onChange={(v) => {
                setSelectedAccountId(v ? Number(v) : 0)
                setSelectedLineId(null)
              }}
              placeholder="Search bank accounts..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunPipeline}
              disabled={!selectedAccountId || runPipeline.isPending}
              title="Run the matching pipeline: checks each bank transaction against your ledger entries and rules. Matches by exact references first, then by amount and date, then by rules you've defined."
            >
              <Play className="h-3.5 w-3.5" />
              {runPipeline.isPending ? "Matching..." : "Auto-Match Transactions"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkAccept}
              disabled={!selectedAccountId || exactMatchCount === 0 || bulkAccept.isPending}
              title={exactMatchCount > 0
                ? `Accept ${exactMatchCount} high-confidence matches (auto-matched with confidence ≥ 95%). These were matched by the pipeline using exact references, amounts, or rules you defined.`
                : "No auto-matched items yet. Run Auto-Match first, or create rules via the Rules tab — the pipeline will auto-match transactions matching your rules on the next run."
              }
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Accept exact matches {exactMatchCount > 0 && `(${exactMatchCount})`}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary bar ──────────────────────────────────────────────────────── */}
      {selectedAccountId > 0 && !queueLoading && summary && (
        <div className="shrink-0 mb-4 border border-gray-300 rounded-lg bg-white px-4 py-3">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{reconciled} of {total} reconciled ({progressPct}%)</span>
                  <span className={cn("font-medium", (summary.unprocessed ?? 0) === 0 ? "text-green-600" : "text-amber-600")}>
                    {(summary.unprocessed ?? 0) === 0 && (summary.needs_review ?? 0) === 0 ? "All matched" : "In progress"}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressPct >= 100 ? "bg-green-500" : "bg-primary-500")}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-600 shrink-0">
              <span title="Bank transactions successfully matched to ledger entries (auto or manual)" className="cursor-help border-b border-dashed border-gray-400 hover:border-gray-600 hover:text-gray-900 transition-colors">Matched: <strong className="font-mono">{reconciled}</strong></span>
              <span title="Newly imported bank transactions not yet processed by the matching pipeline" className="cursor-help border-b border-dashed border-gray-400 hover:border-gray-600 hover:text-gray-900 transition-colors">Unprocessed: <strong className="font-mono">{summary.unprocessed ?? 0}</strong></span>
              <span title="Transactions the pipeline could not auto-match — need manual review, create entry, or define a rule" className="cursor-help border-b border-dashed border-gray-400 hover:border-gray-600 hover:text-gray-900 transition-colors">Review: <strong className="font-mono">{summary.needs_review ?? 0}</strong></span>
            </div>
            {(summary.exception ?? 0) > 0 && (
              <Badge variant="danger" className="shrink-0 cursor-help" title="Transactions flagged as problems — duplicates, ambiguous matches, or items needing investigation">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {summary.exception} exceptions
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* ── No account selected prompt ────────────────────────────────────────── */}
      {selectedAccountId === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-16 px-8 max-w-sm">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-6 w-6 text-gray-400" />
            </div>
            <h2 className="text-base font-medium text-gray-900 mb-2">Select a bank account</h2>
            <p className="text-sm text-gray-500">
              Choose a bank account from the selector above to open the reconciliation workstation.
            </p>
          </div>
        </div>
      )}

      {/* ── Pipeline result banner ──────────────────────────────────────────── */}
      {pipelineMessage && (
        <div className={cn(
          "mb-3 px-4 py-3 rounded-lg border border-l-[3px] text-sm flex items-center justify-between",
          pipelineMessage.type === "success" && "bg-gray-50 border-gray-200 border-l-green-400 text-gray-800",
          pipelineMessage.type === "info" && "bg-gray-50 border-gray-200 border-l-amber-400 text-gray-800",
          pipelineMessage.type === "error" && "bg-red-50 border-red-200 border-l-red-500 text-red-800",
        )}>
          <span>{pipelineMessage.text}</span>
          <button type="button" onClick={() => setPipelineMessage(null)} className="ml-3 text-current opacity-50 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Three-pane workstation ────────────────────────────────────────────── */}
      {selectedAccountId > 0 && queueLoading && (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="text-center py-16">
            <Skeleton className="h-8 w-48 mx-auto mb-3" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      )}
      {selectedAccountId > 0 && !queueLoading && (
        <div className="flex-1 min-h-0 flex gap-0 border border-gray-300 rounded-lg overflow-hidden bg-white">

          {/* ── Left pane: Bank Line Queue ───────────────────────────────────── */}
          <div className="w-[484px] shrink-0 flex flex-col border-r border-gray-300 min-h-0">
            {/* Filter / sort bar */}
            <div className="shrink-0 border-b border-gray-300 px-3 py-2 space-y-2 bg-gray-50">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search transactions..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className={cn(
                    "w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500",
                    searchFocused && "ring-2 ring-primary-500"
                  )}
                />
              </div>
              {/* Filter chips + sort buttons on one row */}
              <div className="flex items-center gap-1 flex-wrap">
                {(["all", "unmatched", "needs_review", "exception"] as QueueFilter[]).map((f) => {
                  const filterTips: Record<string, string> = {
                    all: "Show all bank transactions regardless of status",
                    unmatched: "Show only newly imported transactions not yet processed",
                    needs_review: "Show transactions that need manual review — no auto-match found",
                    exception: "Show flagged transactions — duplicates, ambiguous matches, or issues",
                  }
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      title={filterTips[f]}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium border transition-colors",
                        filter === f
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                      )}
                    >
                      {f === "all" ? "All" : f === "unmatched" ? "Unmatched" : f === "needs_review" ? "Review" : "Exceptions"}
                    </button>
                  )
                })}
                <span className="w-px h-4 bg-gray-300 mx-0.5" />
                {(["risk_first", "aged_first", "amount_first"] as QueueSort[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSort(s)}
                    title={s === "risk_first" ? "Sort by highest risk first" : s === "aged_first" ? "Sort by oldest first" : "Sort by largest amount first"}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium border transition-colors",
                      sort === s
                        ? "bg-primary-100 text-primary-700 border-primary-300"
                        : "bg-white text-gray-500 border-gray-300 hover:border-gray-400"
                    )}
                  >
                    {s === "risk_first" ? "Risk" : s === "aged_first" ? "Oldest" : "Amount"}
                  </button>
                ))}
              </div>
            </div>

            {/* Queue list */}
            <div className="flex-1 overflow-y-auto">
              {queueError ? (
                <div className="p-4 text-center">
                  <AlertCircle className="h-5 w-5 text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-red-700">{queueError.message}</p>
                </div>
              ) : queueLoading ? (
                <div className="p-3 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              ) : queueList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-green-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">All reconciled</p>
                  <p className="text-xs text-gray-400 mt-1">No items match the current filter.</p>
                </div>
              ) : (
                queueList.map((item) => (
                  <BankLineRow
                    key={item.id}
                    item={item}
                    selected={item.id === selectedLineId}
                    onClick={() => setSelectedLineId(item.id === selectedLineId ? null : item.id)}
                  />
                ))
              )}
            </div>

            {/* Queue footer */}
            <div className="shrink-0 border-t border-gray-300 px-3 py-2 bg-gray-50">
              <p className="text-xs text-gray-500">{queueList.length} items</p>
            </div>
          </div>

          {/* ── Center pane: Allocation / Rules ──────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 border-r border-gray-300">
            {/* Selected line summary (when a line is chosen) */}
            {selectedItem && selectedLineId && (
              <div className="shrink-0 border-b border-gray-300 px-4 py-3 bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">{formatDate(selectedItem.trans_date)}</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {selectedItem.normalized_description || selectedItem.description || "—"}
                    </p>
                    {selectedItem.counterparty_name && (
                      <p className="text-xs text-gray-500 truncate">{selectedItem.counterparty_name}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className={cn(
                        "text-base font-mono font-semibold",
                        (typeof (selectedItem?.amount ?? 0) === "number"
                          ? (selectedItem?.amount ?? 0)
                          : parseFloat(String((selectedItem?.amount ?? 0)))) >= 0
                          ? "text-green-700"
                          : "text-red-700"
                      )}
                    >
                      {formatCurrency(
                        typeof (selectedItem?.amount ?? 0) === "number"
                          ? (selectedItem?.amount ?? 0)
                          : parseFloat(String((selectedItem?.amount ?? 0)))
                      )}
                    </p>
                    <Badge variant={getStatusConfig(selectedItem.reconciliation_status).badgeVariant} className="mt-1">
                      {getStatusConfig(selectedItem.reconciliation_status).label}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Tab bar */}
            <div className="shrink-0 border-b border-gray-300 px-4 py-2 bg-white flex gap-1">
              {(["allocation", "rules"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCenterTab(t)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                    centerTab === t
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-500 border-gray-300 hover:border-gray-400 hover:text-gray-700"
                  )}
                >
                  {t === "allocation" ? "Allocation" : "Rules"}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {/* ── Allocation tab ── */}
              {centerTab === "allocation" && (
                <>
                  {!selectedLineId ? (
                    <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center">
                      <Filter className="h-10 w-10 text-gray-300 mb-3" />
                      <h3 className="text-sm font-medium text-gray-600 mb-1">Select a bank line</h3>
                      <p className="text-xs text-gray-400">
                        Click a transaction in the left pane, or use <kbd className="px-1 py-0.5 rounded bg-gray-100 text-xs font-mono">j</kbd>/<kbd className="px-1 py-0.5 rounded bg-gray-100 text-xs font-mono">k</kbd> to navigate.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-4">
                      {candidatesLoading ? (
                        <div className="space-y-4">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                              <Skeleton className="h-2 w-full" />
                              <div className="flex gap-1">
                                <Skeleton className="h-5 w-20" />
                                <Skeleton className="h-5 w-16" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : candidates.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                              {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} ranked by confidence
                            </h3>
                            <span className="text-xs text-gray-400">Press 1–9 to accept by rank</span>
                          </div>
                          {candidates.map((candidate, idx) => (
                            <CandidateCard
                              key={candidate.entry_id}
                              candidate={candidate}
                              rank={idx + 1}
                              onAccept={(c) => handleAcceptTopCandidate(selectedLineId, c)}
                              accepting={matchLine.isPending}
                            />
                          ))}
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-amber-600 mb-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <p className="text-xs">No matching ledger entries found. Create a new entry below.</p>
                          </div>

                          <CreateEntryForm
                            accounts={incomeExpenseAccounts}
                            selectedItem={selectedItem!}
                            accountId={createAccountId}
                            onAccountChange={setCreateAccountId}
                            description={createDescription || selectedItem?.description || ""}
                            onDescriptionChange={setCreateDescription}
                            rememberRule={createRememberRule}
                            onRememberRuleChange={setCreateRememberRule}
                            creating={createFromLine.isPending}
                            onSubmit={handleCreateEntry}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── Rules tab ── */}
              {centerTab === "rules" && (
                <div className="p-4 space-y-6">
                  {/* Rule editor */}
                  {selectedItem ? (
                    <RuleCreationPanel
                      item={selectedItem}
                      accounts={allAccounts}
                      rulePattern={rulePattern}
                      onPatternChange={setRulePattern}
                      ruleAccountId={ruleAccountId}
                      onAccountChange={setRuleAccountId}
                      creating={createBankRule.isPending}
                      onSave={(pattern, accountId) => handleCreateRule(selectedItem.id, pattern, accountId)}
                    />
                  ) : (
                    <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-400">Select a bank transaction on the left to create a rule based on it, or browse existing rules below.</p>
                    </div>
                  )}

                  {/* Existing rules list */}
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Existing Rules {bankRules && bankRules.length > 0 && `(${bankRules.length})`}
                      </h3>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-3">Rules are listed in priority order — first match wins</p>
                    {rulesLoading ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : !bankRules || bankRules.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-4">No rules yet. Create one above to auto-classify future transactions.</p>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                        {(bankRules as BankRule[]).map((rule, idx) => {
                          const targetAccount = allAccounts.find((a) => a.id === rule.match_account_id)
                          const patternMatches = selectedItem &&
                            rule.description_pattern &&
                            (selectedItem.description ?? "").toLowerCase().includes(rule.description_pattern.toLowerCase())
                          const isConfirmingDelete = deletingRuleId === rule.id
                          const sortedRules = bankRules as BankRule[]
                          const isFirst = idx === 0
                          const isLast = idx === sortedRules.length - 1

                          return (
                            <div
                              key={rule.id}
                              className={cn(
                                "flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors",
                                isConfirmingDelete && "bg-red-50"
                              )}
                            >
                              {/* Match indicator */}
                              <div className="w-4 shrink-0">
                                {patternMatches ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                ) : (
                                  <span className="w-3.5 h-3.5 block" />
                                )}
                              </div>

                              {/* Rule info — clickable to populate editor */}
                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  setRulePattern(rule.description_pattern ?? "")
                                  setRuleAccountId(rule.match_account_id)
                                }}
                              >
                                <p className="font-medium text-gray-800 truncate">{rule.name}</p>
                                {rule.description_pattern && rule.description_pattern !== rule.name && (
                                  <p className="text-gray-400 font-mono truncate text-[10px]">{rule.description_pattern}</p>
                                )}
                              </div>

                              {/* Target account */}
                              <div className="w-[120px] shrink-0 hidden xl:block">
                                {targetAccount ? (
                                  <span className="text-gray-600 truncate block text-[10px]">
                                    {targetAccount.accno} — {targetAccount.description}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-[10px]">—</span>
                                )}
                              </div>

                              {/* Enabled badge */}
                              <span className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0",
                                rule.enabled
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : "bg-gray-100 text-gray-400 border border-gray-200"
                              )}>
                                {rule.enabled ? "Yes" : "No"}
                              </span>

                              {/* Inline delete confirmation */}
                              {isConfirmingDelete ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] text-red-600 font-medium">Delete?</span>
                                  <button
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                                    onClick={() => {
                                      deleteBankRule.mutate(rule.id)
                                      setDeletingRuleId(null)
                                    }}
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
                                    onClick={() => setDeletingRuleId(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {/* Priority up */}
                                  <button
                                    disabled={isFirst || updateRulePriority.isPending}
                                    className="p-0.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                    title="Move up (higher priority)"
                                    onClick={() => {
                                      const above = sortedRules[idx - 1]
                                      updateRulePriority.mutate({ ruleId: rule.id, priority: above.priority })
                                      updateRulePriority.mutate({ ruleId: above.id, priority: rule.priority })
                                    }}
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  {/* Priority down */}
                                  <button
                                    disabled={isLast || updateRulePriority.isPending}
                                    className="p-0.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                                    title="Move down (lower priority)"
                                    onClick={() => {
                                      const below = sortedRules[idx + 1]
                                      updateRulePriority.mutate({ ruleId: rule.id, priority: below.priority })
                                      updateRulePriority.mutate({ ruleId: below.id, priority: rule.priority })
                                    }}
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                  {/* Delete */}
                                  <button
                                    className="p-0.5 rounded text-red-400 hover:text-red-600 transition-colors ml-1"
                                    title="Delete rule"
                                    onClick={() => setDeletingRuleId(rule.id)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right pane: Detail Inspector ─────────────────────────────────── */}
          <div className="w-[484px] shrink-0 flex flex-col min-h-0">
            {selectedItem ? (
              <DetailInspector
                item={selectedItem}
                onDefer={handleDefer}
                onExclude={handleExclude}
                onUndo={handleUndo}
                deferring={deferLine.isPending}
                excluding={excludeLine.isPending}
                undoing={undoAction.isPending}
              />
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
                <p className="text-xs text-gray-400">Select a transaction to inspect details and take actions.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Keyboard shortcut status bar ──────────────────────────────────────── */}
      {selectedAccountId > 0 && (
        <div className="shrink-0 mt-3 flex items-center justify-between text-xs text-gray-400 px-1">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-gray-600">j</kbd>/<kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-gray-600">k</kbd> navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-gray-600">a</kbd> accept</span>
            <span><kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-gray-600">d</kbd> defer</span>
            <span><kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-gray-600">x</kbd> exclude</span>
            <span><kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-gray-600">u</kbd> undo</span>
            <span><kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-gray-600">1–9</kbd> select candidate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-gray-100 font-mono text-gray-600">Esc</kbd> deselect</span>
          </div>
          {selectedItem && (
            <span className="text-gray-500">
              {selectedIndex + 1} of {queueList.length}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
