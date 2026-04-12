import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, InlineCreatePanel } from "@/components/layout"
import { Button, Badge, InlineAlert } from "@/components/primitives"
import { DateValue } from "@/components/financial"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { useEmployees, useCreateEmployee, type Employee } from "../hooks/usePayroll"
import { useFeedback } from "@/components/feedback"
import { Plus } from "lucide-react"

const employmentTypeLabels: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  casual: "Casual",
  contractor: "Contractor",
}

const payCycleLabels: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
}

const columns: Column<Employee>[] = [
  {
    key: "name",
    header: "Name",
    render: (r: Employee) => (
      <span className="text-primary-600 hover:underline cursor-pointer">
        {r.first_name} {r.last_name}
      </span>
    ),
  },
  {
    key: "start_date",
    header: "Start Date",
    className: "w-32",
    render: (r: Employee) => <DateValue value={r.start_date} format="short" />,
  },
  {
    key: "employment_type",
    header: "Employment Type",
    className: "w-32",
    render: (r: Employee) => (
      <Badge variant="default">{employmentTypeLabels[r.employment_type] ?? r.employment_type}</Badge>
    ),
  },
  {
    key: "pay_cycle",
    header: "Pay Cycle",
    className: "w-28",
    render: (r: Employee) => payCycleLabels[r.pay_cycle] ?? r.pay_cycle,
  },
  {
    key: "active",
    header: "Status",
    className: "w-20",
    render: (r: Employee) => (
      <Badge variant={r.active ? "success" : "default"}>
        {r.active ? "Active" : "Inactive"}
      </Badge>
    ),
  },
]

function InlineEmployeeForm({ onClose }: { onClose: () => void }) {
  const createEmployee = useCreateEmployee()
  const feedback = useFeedback()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [startDate, setStartDate] = useState("")
  const [employmentType, setEmploymentType] = useState("full_time")
  const [payCycle, setPayCycle] = useState("fortnightly")
  const [residency, setResidency] = useState("resident")
  const [superFund, setSuperFund] = useState("")
  const [taxFree, setTaxFree] = useState(true)
  const [helpDebt, setHelpDebt] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    setError("")
    if (!firstName || !lastName || !startDate) {
      setError("First name, last name, and start date are required")
      return
    }
    try {
      await createEmployee.mutateAsync({
        first_name: firstName,
        last_name: lastName,
        email: email || undefined,
        phone: phone || undefined,
        start_date: startDate + "T00:00:00Z",
        employment_type: employmentType,
        pay_cycle: payCycle,
        residency_status: residency,
        tax_free_threshold: taxFree,
        help_debt: helpDebt,
        super_fund_name: superFund || undefined,
      })
      feedback.success(`Employee ${firstName} ${lastName} created`)
      setFirstName("")
      setLastName("")
      setEmail("")
      setPhone("")
      setStartDate("")
      setEmploymentType("full_time")
      setPayCycle("fortnightly")
      setResidency("resident")
      setSuperFund("")
      setTaxFree(true)
      setHelpDebt(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create employee"
      setError(message)
    }
  }

  return (
    <div>
      {error && <InlineAlert variant="error" className="mb-3">{error}</InlineAlert>}

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Personal</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
          <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Jane" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
          <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Smith" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="jane@example.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="0400 000 000" />
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Employment</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label>
          <select value={employmentType} onChange={e => setEmploymentType(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="casual">Casual</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Pay Cycle</label>
          <select value={payCycle} onChange={e => setPayCycle(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Residency Status</label>
          <select value={residency} onChange={e => setResidency(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500">
            <option value="resident">Australian Resident</option>
            <option value="non_resident">Non-Resident</option>
            <option value="working_holiday">Working Holiday</option>
          </select>
        </div>
      </div>

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tax & Super</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Super Fund Name</label>
          <input type="text" value={superFund} onChange={e => setSuperFund(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            placeholder="e.g. AustralianSuper" />
        </div>
        <div className="flex items-end gap-6 pb-1">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={taxFree} onChange={e => setTaxFree(e.target.checked)} />
            Tax-free threshold
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={helpDebt} onChange={e => setHelpDebt(e.target.checked)} />
            HELP debt
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Button loading={createEmployee.isPending} onClick={handleSubmit} size="sm">Create Employee</Button>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

export function EmployeesPage() {
  usePageHelp(pageHelpContent.employees)
  usePagePolicies(["payroll"])
  const { data: employees, isLoading, error } = useEmployees()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)

  const activeCount = employees?.filter((e) => e.active).length ?? 0
  const totalCount = employees?.length ?? 0

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Employees</h1>
        <span className="text-sm text-gray-500">
          {activeCount} active{totalCount > activeCount ? ` · ${totalCount - activeCount} inactive` : ""}
        </span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Manage your team and their pay details</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setCreateOpen(!createOpen)} variant={createOpen ? "secondary" : "primary"}>
          <Plus className="h-4 w-4" />
          New Employee
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <InlineCreatePanel isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New Employee">
        <InlineEmployeeForm onClose={() => setCreateOpen(false)} />
      </InlineCreatePanel>

      <DataTable
        columns={columns}
        data={employees ?? []}
        loading={isLoading}
        error={error}
        emptyMessage="No employees. Click '+ New Employee' to add your first employee."
        onRowClick={(row) => navigate(`/employees/${row.id}`)}
      />
    </PageShell>
  )
}
