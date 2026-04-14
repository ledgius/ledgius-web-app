import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { DateValue } from "@/components/financial"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

interface SuperRate {
  id: number
  rate: string
  effective_from: string
  effective_to: string | null
  max_quarterly_base: string | null
}

function useSuperRates() {
  return useQuery({
    queryKey: ["super-rates"],
    queryFn: () => api.get<SuperRate[]>("/super-rates"),
  })
}

function getFYLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = d.getMonth()
  if (month >= 6) return `FY ${year}–${year + 1}`
  return `FY ${year - 1}–${year}`
}

const columns: Column<SuperRate>[] = [
  {
    key: "fy",
    header: "Financial Year",
    render: (r: SuperRate) => getFYLabel(r.effective_from),
  },
  {
    key: "rate",
    header: "SG Rate",
    className: "font-mono text-right w-24",
    render: (r: SuperRate) => `${(parseFloat(r.rate) * 100).toFixed(1)}%`,
  },
  {
    key: "effective_from",
    header: "From",
    render: (r: SuperRate) => <DateValue value={r.effective_from} format="medium" />,
  },
  {
    key: "effective_to",
    header: "To",
    render: (r: SuperRate) => r.effective_to ? <DateValue value={r.effective_to} format="medium" /> : <span className="text-gray-400">Ongoing</span>,
  },
  {
    key: "max_quarterly_base",
    header: "Max Quarterly Base",
    className: "font-mono text-right",
    render: (r: SuperRate) => r.max_quarterly_base ? `$${parseFloat(r.max_quarterly_base).toLocaleString()}` : "—",
  },
]

export function SuperRatesPage() {
  usePageHelp(pageHelpContent.superRates)
  usePagePolicies(["payroll"])
  const { data: rates, isLoading, error } = useSuperRates()

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Super Guarantee Rates</h1>
        <span className="text-sm text-gray-500">{rates?.length ?? 0} financial years</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Superannuation contribution percentages by year</p>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      <DataTable columns={columns} data={rates ?? []} loading={isLoading} error={error} emptyMessage="No super guarantee rates configured." />
    </PageShell>
  )
}
