// Spec references: R-0008, T-0040 KCS-070..KCS-075.
//
// PageStatus widget — operational checklist + optional next-action
// chip rendered between the page header and primary content (mounted
// in PageShell, same slot as ArticleInfoPanel but above it).
//
// Display rules (per T-0040 §Resolved Decisions):
//   - Done first, then pending → blocked → not_applicable (#2)
//   - Cap at 10 items with "and N more" overflow footer (#4)
//   - Drill-links use react-router <Link>; the active-period selector
//     stays as the user set it (#3)
//   - Empty checklist → render nothing (KCS-073)

import { Link } from "react-router-dom"
import { CheckCircle2, Circle, AlertCircle, MinusCircle } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { usePageStatus, type ChecklistItem, type ChecklistState } from "@/hooks/usePageStatus"

const MAX_ITEMS = 10

const stateOrder: Record<ChecklistState, number> = {
  done: 0,
  pending: 1,
  blocked: 2,
  not_applicable: 3,
}

export function PageStatus() {
  const status = usePageStatus()
  if (!status || !status.checklist || status.checklist.length === 0) {
    return null
  }

  // Sort done-first per Resolved Decision #2; checker-emitted order
  // preserved within each state group.
  const sorted = [...status.checklist].sort(
    (a, b) => stateOrder[a.state] - stateOrder[b.state],
  )
  const visible = sorted.slice(0, MAX_ITEMS)
  const overflow = sorted.length - visible.length

  return (
    <div className="mb-4 bg-white border border-gray-200 rounded-lg px-4 py-3">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          {status.title && (
            <h3 className="text-sm font-semibold text-gray-900">{status.title}</h3>
          )}
          {status.summary && (
            <p className="text-xs text-gray-500 mt-0.5">{status.summary}</p>
          )}
        </div>
        {status.next_action && (
          <Link
            to={status.next_action.drill_link}
            className="inline-flex items-center text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md px-2 py-1"
          >
            {status.next_action.label} →
          </Link>
        )}
      </div>

      <ul className="space-y-1.5">
        {visible.map((item) => (
          <ChecklistRow key={item.id} item={item} />
        ))}
      </ul>

      {overflow > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          and {overflow} more…
        </p>
      )}
    </div>
  )
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const Icon = stateIcon(item.state)
  const iconColour = stateIconColour(item.state)
  const labelColour =
    item.state === "done"
      ? "text-gray-500 line-through decoration-gray-300"
      : item.state === "blocked"
        ? "text-red-700"
        : item.state === "not_applicable"
          ? "text-gray-400"
          : "text-gray-800"

  const body = (
    <span className="flex items-start gap-2">
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", iconColour)} />
      <span className="flex-1 min-w-0">
        <span className={cn("text-xs", labelColour)}>{item.label}</span>
        {item.evidence && (
          <span className="block text-[11px] text-gray-400 mt-0.5">{item.evidence}</span>
        )}
      </span>
    </span>
  )

  if (item.drill_link && item.state !== "not_applicable") {
    return (
      <li>
        <Link
          to={item.drill_link}
          className="block rounded -mx-1 px-1 py-0.5 hover:bg-gray-50"
        >
          {body}
        </Link>
      </li>
    )
  }
  return <li>{body}</li>
}

function stateIcon(state: ChecklistState) {
  switch (state) {
    case "done":
      return CheckCircle2
    case "pending":
      return Circle
    case "blocked":
      return AlertCircle
    case "not_applicable":
      return MinusCircle
  }
}

function stateIconColour(state: ChecklistState): string {
  switch (state) {
    case "done":
      return "text-green-500"
    case "pending":
      return "text-gray-300"
    case "blocked":
      return "text-red-500"
    case "not_applicable":
      return "text-gray-200"
  }
}
