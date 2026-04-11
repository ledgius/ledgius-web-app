import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { Button, InlineAlert } from "@/components/primitives"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useFeedback } from "@/components/feedback"
import { useCreateEmployee } from "../hooks/usePayroll"

export function CreateEmployeePage() {
  usePageHelp(pageHelpContent.employees)
  usePagePolicies(["payroll"])
  const navigate = useNavigate()
  const handleCancel = useCallback(() => navigate("/employees"), [navigate])
  useEscapeKey(handleCancel)
  const feedback = useFeedback()
  const createEmployee = useCreateEmployee()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [startDate, setStartDate] = useState("")
  const [employmentType, setEmploymentType] = useState("full_time")
  const [payCycle, setPayCycle] = useState("fortnightly")
  const [residency, setResidency] = useState("resident")
  const [taxFree, setTaxFree] = useState(true)
  const [helpDebt, setHelpDebt] = useState(false)
  const [superFund, setSuperFund] = useState("")
  const [error, setError] = useState("")

  const handleCreate = async () => {
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
      navigate("/employees")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create employee"
      feedback.error("Employee creation failed", message)
    }
  }

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">New Employee</h1>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button loading={createEmployee.isPending} onClick={handleCreate}>
          Create Employee
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      {error && <InlineAlert variant="error" className="mb-4">{error}</InlineAlert>}

      <PageSection title="Personal Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Jane" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="Smith" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="jane@example.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="0400 000 000" />
          </div>
        </div>
      </PageSection>

      <PageSection title="Employment Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Employment Type</label>
            <select value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="casual">Casual</option>
              <option value="contractor">Contractor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Pay Cycle</label>
            <select value={payCycle} onChange={(e) => setPayCycle(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Residency Status</label>
            <select value={residency} onChange={(e) => setResidency(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm">
              <option value="resident">Australian Resident</option>
              <option value="non_resident">Non-Resident</option>
              <option value="working_holiday">Working Holiday</option>
            </select>
          </div>
        </div>
      </PageSection>

      <PageSection title="Tax & Super">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Superannuation Fund</label>
            <input type="text" value={superFund} onChange={(e) => setSuperFund(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="e.g. AustralianSuper" />
          </div>
          <div className="flex items-end gap-6 pb-1">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={taxFree} onChange={(e) => setTaxFree(e.target.checked)} />
              Tax-free threshold
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={helpDebt} onChange={(e) => setHelpDebt(e.target.checked)} />
              HELP debt
            </label>
          </div>
        </div>
      </PageSection>
    </PageShell>
  )
}
