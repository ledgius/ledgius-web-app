import { useState } from "react"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button } from "@/components/primitives"
import { DataTable } from "@/shared/components/DataTable"
import { useRecurringSchedules, useCreateRecurring, type RecurringSchedule } from "../hooks/useRecurring"
import { formatDate } from "@/shared/lib/utils"

const columns = [
  { key: "name", header: "Name" },
  { key: "source_type", header: "Type", className: "w-16 uppercase" },
  { key: "frequency", header: "Frequency", className: "w-24 capitalize" },
  { key: "next_due_date", header: "Next Due", render: (r: RecurringSchedule) => formatDate(r.next_due_date) },
  { key: "active", header: "Active", className: "w-16 text-center",
    render: (r: RecurringSchedule) => r.active ? <span className="text-green-600 text-xs">Yes</span> : <span className="text-gray-400 text-xs">No</span> },
]

export function RecurringPage() {
  usePageHelp(pageHelpContent.recurring)
  usePagePolicies(["journal"])
  const { data: schedules, isLoading } = useRecurringSchedules()
  const createRecurring = useCreateRecurring()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [sourceType, setSourceType] = useState("gl")
  const [frequency, setFrequency] = useState("monthly")
  const [rrule, setRrule] = useState("")
  const [startDate, setStartDate] = useState("")
  const [error, setError] = useState("")

  const isCustom = frequency === "custom"

  const handleCreate = async () => {
    if (!name || !startDate) { setError("Name and start date required"); return }
    if (isCustom && !rrule) { setError("RRULE is required for custom frequency"); return }
    try {
      const payload: Record<string, unknown> = {
        name, source_type: sourceType, start_date: startDate, template_json: {},
      }
      if (isCustom) {
        payload.rrule = rrule
      } else {
        payload.frequency = frequency
      }
      await createRecurring.mutateAsync(payload)
      setShowForm(false)
      setName("")
      setRrule("")
    } catch (err: any) { setError(err.message) }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Recurring Transactions</h1>
        <span className="text-sm text-gray-500">{schedules?.length ?? 0} schedules</span>
      </div>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Schedule"}
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md">{error}</div>}
      {showForm && (
        <PageSection title="New Schedule">
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={sourceType} onChange={e => setSourceType(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="gl">GL</option><option value="ar">AR</option><option value="ap">AP</option>
                </select></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
                <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
                  <option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option>
                  <option value="custom">Custom (RRULE)...</option>
                </select></div>
            </div>
            {isCustom && (
              <div><label className="block text-xs font-medium text-gray-600 mb-1">RRULE <span className="text-gray-400 font-normal">(RFC 5545)</span></label>
                <input type="text" value={rrule} onChange={e => setRrule(e.target.value)} placeholder="e.g. FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15" className="w-full border rounded px-2 py-1.5 text-sm font-mono" /></div>
            )}
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" /></div>
            <button onClick={handleCreate} className="px-4 py-1.5 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-700">Create</button>
          </div>
        </PageSection>
      )}
      {isLoading ? <p className="text-gray-500">Loading...</p> : <DataTable columns={columns} data={schedules ?? []} emptyMessage="No recurring schedules." />}
    </PageShell>
  )
}
