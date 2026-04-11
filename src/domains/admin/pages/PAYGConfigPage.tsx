import { useState, useMemo } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Skeleton, Badge } from "@/components/primitives"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

interface PAYGBracket {
  id: number
  bracket_name: string
  residency: string
  tax_free_claimed: boolean
  weekly_from: string
  weekly_to: string | null
  coefficient_a: string
  coefficient_b: string
  effective_from: string
  effective_to: string | null
}

function usePAYGBrackets() {
  return useQuery({
    queryKey: ["payg-brackets"],
    queryFn: () => api.get<PAYGBracket[]>("/payg-config"),
  })
}

const columns: Column<PAYGBracket>[] = [
  { key: "bracket_name", header: "Bracket", className: "w-32" },
  {
    key: "residency",
    header: "Residency",
    className: "w-28",
    render: (r: PAYGBracket) => (
      <Badge variant={r.residency === "resident" ? "default" : "warning"}>
        {r.residency === "resident" ? "Resident" : "Non-resident"}
      </Badge>
    ),
  },
  {
    key: "tax_free_claimed",
    header: "TFT",
    className: "w-12 text-center",
    render: (r: PAYGBracket) => r.tax_free_claimed ? "Y" : "N",
  },
  {
    key: "annual_from",
    header: "Annual From",
    className: "text-right font-mono w-28",
    render: (r: PAYGBracket) => `$${(parseFloat(r.weekly_from) * 52).toLocaleString("en-AU", { maximumFractionDigits: 0 })}`,
  },
  {
    key: "annual_to",
    header: "Annual To",
    className: "text-right font-mono w-28",
    render: (r: PAYGBracket) => r.weekly_to ? `$${(parseFloat(r.weekly_to) * 52).toLocaleString("en-AU", { maximumFractionDigits: 0 })}` : "∞",
  },
  {
    key: "weekly_from",
    header: "Weekly From",
    className: "text-right font-mono w-24 text-gray-400",
    render: (r: PAYGBracket) => `$${parseFloat(r.weekly_from).toFixed(0)}`,
  },
  {
    key: "weekly_to",
    header: "Weekly To",
    className: "text-right font-mono w-24 text-gray-400",
    render: (r: PAYGBracket) => r.weekly_to ? `$${parseFloat(r.weekly_to).toFixed(0)}` : "∞",
  },
  {
    key: "coefficient_a",
    header: "Coeff A",
    className: "text-right font-mono w-20",
    render: (r: PAYGBracket) => parseFloat(r.coefficient_a).toFixed(4),
  },
  {
    key: "coefficient_b",
    header: "Coeff B",
    className: "text-right font-mono w-24",
    render: (r: PAYGBracket) => parseFloat(r.coefficient_b).toFixed(4),
  },
]

function getFYLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth()
  if (month >= 6) return `FY ${year}–${year + 1}`
  return `FY ${year - 1}–${year}`
}

export function PAYGConfigPage() {
  usePageHelp(pageHelpContent.paygConfig)
  usePagePolicies(["payroll"])
  const { data: brackets, isLoading } = usePAYGBrackets()
  const [selectedFY, setSelectedFY] = useState<string | null>(null)

  const fyGroups = useMemo(() => {
    const groups = new Map<string, PAYGBracket[]>()
    for (const b of brackets ?? []) {
      const fy = getFYLabel(b.effective_from)
      const existing = groups.get(fy)
      if (existing) existing.push(b)
      else groups.set(fy, [b])
    }
    return groups
  }, [brackets])

  const fyList = Array.from(fyGroups.keys())
  const activeFY = selectedFY ?? fyList[0] ?? null
  const activeBrackets = activeFY ? (fyGroups.get(activeFY) ?? []) : []

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">PAYG Withholding Configuration</h1>
        <span className="text-sm text-gray-500">{brackets?.length ?? 0} brackets · {fyList.length} financial years</span>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <PageSection variant="plain">
        <p className="text-sm text-gray-500 mb-4">
          ATO Schedule 1 coefficients. Formula: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">withholding = (a × weekly_earnings) − b</code>
        </p>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {fyList.map((fy) => (
            <button
              key={fy}
              type="button"
              onClick={() => setSelectedFY(fy)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                fy === activeFY
                  ? "bg-primary-50 border-primary-300 text-primary-700 font-medium"
                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {fy}
            </button>
          ))}
        </div>
      </PageSection>

      {isLoading ? (
        <Skeleton variant="table" rows={10} columns={7} />
      ) : (
        <DataTable columns={columns} data={activeBrackets} emptyMessage="No brackets for this period." />
      )}
    </PageShell>
  )
}
