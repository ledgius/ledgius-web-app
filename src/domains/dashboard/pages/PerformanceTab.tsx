// Spec references: A-0023.
import { TrendingUp, TrendingDown, Minus, DollarSign, CreditCard, PiggyBank } from "lucide-react"
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts"
import { cn } from "@/shared/lib/utils"
import { MoneyValue } from "@/components/financial/MoneyValue"
import { Skeleton } from "@/components/primitives"
import { usePerformance, type PerformanceMonth } from "../hooks/usePerformance"

// ── Colours ──

const REVENUE_COLOR = "#22c55e"   // green-500
const EXPENSE_COLOR = "#f59e0b"   // amber-500
const NET_COLOR     = "#3b82f6"   // blue-500
const PRIOR_OPACITY = 0.3

// ── Chart data shape ──

interface ChartPoint {
  month: string
  revenue: number
  expenses: number
  net: number
  priorRevenue?: number
  priorExpenses?: number
  priorNet?: number
}

function buildChartData(
  current: PerformanceMonth[],
  prior: PerformanceMonth[] | undefined,
): ChartPoint[] {
  return current.map((m) => {
    const priorMonth = prior?.find((p) => p.month === m.month)
    return {
      month: m.month,
      revenue: m.revenue,
      expenses: m.expenses,
      net: m.net,
      priorRevenue: priorMonth?.revenue,
      priorExpenses: priorMonth?.expenses,
      priorNet: priorMonth?.net,
    }
  })
}

// ── Mini bar chart for summary cards ──

function MiniBar({ data, color }: { data: { label: string; current: number; prior?: number }[]; color: string }) {
  const max = Math.max(...data.flatMap((d) => [d.current, d.prior ?? 0]), 1)

  return (
    <div className="flex items-end gap-1 h-10 mt-2">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-0.5">
          <div className="w-full flex items-end justify-center gap-px h-8">
            {d.prior !== undefined && (
              <div
                className="w-2.5 rounded-t-sm"
                style={{
                  height: `${Math.max(2, (d.prior / max) * 100)}%`,
                  backgroundColor: color,
                  opacity: PRIOR_OPACITY,
                }}
              />
            )}
            <div
              className="w-2.5 rounded-t-sm"
              style={{
                height: `${Math.max(2, (d.current / max) * 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="text-[9px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Tooltip ──

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}</span>
          </span>
          <MoneyValue amount={entry.value} size="sm" className="font-medium" />
        </div>
      ))}
    </div>
  )
}

// ── Summary card ──

interface SummaryCardProps {
  title: string
  icon: typeof DollarSign
  iconBg: string
  total: number
  priorTotal?: number
  miniData?: { label: string; current: number; prior?: number }[]
  color: string
}

function SummaryCard({ title, icon: Icon, iconBg, total, priorTotal, miniData, color }: SummaryCardProps) {
  const hasPrior = priorTotal !== undefined && priorTotal !== 0
  const change = hasPrior ? ((total - priorTotal) / Math.abs(priorTotal)) * 100 : undefined
  const trendUp = change !== undefined && change > 0
  const trendDown = change !== undefined && change < 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-1.5 rounded-md", iconBg)}>
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
        <span className="text-sm font-semibold text-gray-900">{title}</span>
      </div>

      <MoneyValue amount={total} size="xl" className="text-gray-900" colorNegative />

      {/* Prior year comparison */}
      {hasPrior && change !== undefined && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {trendUp ? (
            <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          ) : trendDown ? (
            <TrendingDown className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span className={cn(
            "text-xs font-medium",
            trendUp ? "text-green-600" : trendDown ? "text-red-600" : "text-gray-500"
          )}>
            {change > 0 ? "+" : ""}{change.toFixed(1)}% vs prior year
          </span>
        </div>
      )}

      {/* Mini bar chart */}
      {miniData && miniData.length > 0 && (
        <MiniBar data={miniData} color={color} />
      )}
    </div>
  )
}

// ── Main Performance Tab ──

export function PerformanceTab() {
  const { data, isLoading } = usePerformance()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        No performance data available. Transactions need to be recorded before financial performance can be charted.
      </div>
    )
  }

  const hasPrior = data.prior_year !== null
  const chartData = buildChartData(data.months, data.prior_year?.months)

  // Last 3 months of data for mini bar charts
  const last3 = data.months.slice(-3)
  const last3Prior = hasPrior ? data.prior_year!.months.slice(-3) : undefined

  const revenueMiniData = last3.map((m, i) => ({
    label: m.month.substring(0, 3),
    current: m.revenue,
    prior: last3Prior?.[i]?.revenue,
  }))

  const expenseMiniData = last3.map((m, i) => ({
    label: m.month.substring(0, 3),
    current: m.expenses,
    prior: last3Prior?.[i]?.expenses,
  }))

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Income"
          icon={DollarSign}
          iconBg="bg-green-50"
          total={data.total_revenue}
          priorTotal={data.prior_year?.total_revenue}
          miniData={revenueMiniData}
          color={REVENUE_COLOR}
        />
        <SummaryCard
          title="Expenses"
          icon={CreditCard}
          iconBg="bg-amber-50"
          total={data.total_expenses}
          priorTotal={data.prior_year?.total_expenses}
          miniData={expenseMiniData}
          color={EXPENSE_COLOR}
        />
        <SummaryCard
          title="Net Profit"
          icon={PiggyBank}
          iconBg="bg-blue-50"
          total={data.total_net}
          priorTotal={data.prior_year?.total_net}
          color={NET_COLOR}
        />
      </div>

      {/* Combined bar + line chart */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue vs Expenses — Financial Year</h3>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={{ stroke: "#e5e7eb" }}
              tickFormatter={(v: string) => v.substring(0, 3)}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
            />

            {/* Prior year bars (behind current) */}
            {hasPrior && (
              <>
                <Bar
                  dataKey="priorRevenue"
                  name="Revenue (Prior Year)"
                  fill={REVENUE_COLOR}
                  fillOpacity={PRIOR_OPACITY}
                  radius={[2, 2, 0, 0]}
                  barSize={14}
                />
                <Bar
                  dataKey="priorExpenses"
                  name="Expenses (Prior Year)"
                  fill={EXPENSE_COLOR}
                  fillOpacity={PRIOR_OPACITY}
                  radius={[2, 2, 0, 0]}
                  barSize={14}
                />
              </>
            )}

            {/* Current year bars */}
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill={REVENUE_COLOR}
              radius={[3, 3, 0, 0]}
              barSize={18}
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill={EXPENSE_COLOR}
              radius={[3, 3, 0, 0]}
              barSize={18}
            />

            {/* Net profit/loss line */}
            <Line
              type="monotone"
              dataKey="net"
              name="Net Profit"
              stroke={NET_COLOR}
              strokeWidth={2}
              dot={{ fill: NET_COLOR, r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
