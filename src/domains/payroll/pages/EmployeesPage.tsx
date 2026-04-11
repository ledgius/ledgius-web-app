import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell } from "@/components/layout"
import { Button, Skeleton, Badge } from "@/components/primitives"
import { DateValue } from "@/components/financial"
import { DataTable, type Column } from "@/shared/components/DataTable"
import { useEmployees, type Employee } from "../hooks/usePayroll"
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

export function EmployeesPage() {
  usePageHelp(pageHelpContent.employees)
  usePagePolicies(["payroll"])
  const { data: employees, isLoading } = useEmployees()
  const navigate = useNavigate()

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
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => navigate("/employees/new")}>
          <Plus className="h-4 w-4" />
          New Employee
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {isLoading ? (
        <Skeleton variant="table" rows={5} columns={5} />
      ) : (
        <DataTable
          columns={columns}
          data={employees ?? []}
          emptyMessage="No employees. Click '+ New Employee' to add your first employee."
          onRowClick={(row) => navigate(`/employees/${row.id}`)}
        />
      )}
    </PageShell>
  )
}
