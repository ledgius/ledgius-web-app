import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { usePageHelp, pageHelpContent } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { PageShell, PageSection } from "@/components/layout"
import { EntityHeader, AuditTimeline } from "@/components/workflow"
import { Button, InlineAlert, Skeleton } from "@/components/primitives"
import { useFeedback } from "@/components/feedback"
import { useEscapeKey } from "@/hooks/useEscapeKey"
import { useEmployee } from "../hooks/usePayroll"
import { useEntityActivity } from "@/hooks/useEntityActivity"
import { api } from "@/shared/lib/api"
import { useQueryClient } from "@tanstack/react-query"

export function EmployeeDetailPage() {
  usePageHelp(pageHelpContent.employees)
  usePagePolicies(["payroll"])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const feedback = useFeedback()
  const qc = useQueryClient()
  const handleBack = useCallback(() => navigate("/employees"), [navigate])
  useEscapeKey(handleBack)
  const employeeId = parseInt(id ?? "0")
  const { data: employee, isLoading, error: loadError } = useEmployee(employeeId)
  const { data: activity, isLoading: activityLoading } = useEntityActivity("employees", employeeId)

  // Editable fields
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [employmentType, setEmploymentType] = useState("")
  const [payCycle, setPayCycle] = useState("")
  const [residency, setResidency] = useState("")
  const [taxFree, setTaxFree] = useState(true)
  const [helpDebt, setHelpDebt] = useState(false)
  const [superFund, setSuperFund] = useState("")
  const [bankBSB, setBankBSB] = useState("")
  const [bankAccount, setBankAccount] = useState("")
  const [bankName, setBankName] = useState("")
  const [saving, setSaving] = useState(false)
  const [initialised, setInitialised] = useState(false)

  useEffect(() => {
    if (employee && !initialised) {
      setEmail(employee.email ?? "")
      setPhone(employee.phone ?? "")
      setEmploymentType(employee.employment_type)
      setPayCycle(employee.pay_cycle)
      setResidency(employee.residency_status)
      setTaxFree(employee.tax_free_threshold)
      setHelpDebt(employee.help_debt)
      setSuperFund(employee.super_fund_name ?? "")
      setBankBSB(employee.bank_bsb ?? "")
      setBankAccount(employee.bank_account_number ?? "")
      setBankName(employee.bank_account_name ?? "")
      setInitialised(true)
    }
  }, [employee, initialised])

  const isDirty = initialised && employee ? (
    email !== (employee.email ?? "") ||
    phone !== (employee.phone ?? "") ||
    employmentType !== employee.employment_type ||
    payCycle !== employee.pay_cycle ||
    residency !== employee.residency_status ||
    taxFree !== employee.tax_free_threshold ||
    helpDebt !== employee.help_debt ||
    superFund !== (employee.super_fund_name ?? "") ||
    bankBSB !== (employee.bank_bsb ?? "") ||
    bankAccount !== (employee.bank_account_number ?? "") ||
    bankName !== (employee.bank_account_name ?? "")
  ) : false

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/employees/${employeeId}`, {
        email: email || undefined,
        phone: phone || undefined,
        employment_type: employmentType,
        pay_cycle: payCycle,
        residency_status: residency,
        tax_free_threshold: taxFree,
        help_debt: helpDebt,
        super_fund_name: superFund || undefined,
        bank_bsb: bankBSB || undefined,
        bank_account_number: bankAccount || undefined,
        bank_account_name: bankName || undefined,
      })
      qc.invalidateQueries({ queryKey: ["employees", employeeId] })
      setInitialised(false)
      feedback.success("Employee saved")
    } catch (err: unknown) {
      feedback.error("Save failed", err instanceof Error ? err.message : "")
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setInitialised(false)
  }

  if (isLoading) return <Skeleton variant="table" rows={4} columns={2} className="mt-8" />
  if (loadError || !employee) {
    return (
      <PageShell>
        <InlineAlert variant="error">Employee not found.</InlineAlert>
      </PageShell>
    )
  }

  const header = (
    <div>
      <EntityHeader
        title={`${employee.first_name} ${employee.last_name}`}
        subtitle={employee.employment_type.replace(/_/g, " ")}
        status={employee.active ? "active" : "archived"}
        backTo="/employees"
      />
      <div className="flex items-center gap-2 mt-3">
        <Button disabled={!isDirty} loading={saving} onClick={handleSave}>Save</Button>
        <Button variant="secondary" disabled={!isDirty} onClick={handleDiscard}>Discard Changes</Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header}>
      <PageSection title="Personal Details">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">First Name</label>
            <input type="text" value={employee.first_name} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-100 text-gray-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
            <input type="text" value={employee.last_name} disabled className="w-full border rounded px-2 py-1.5 text-sm bg-gray-100 text-gray-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
        </div>
      </PageSection>

      <PageSection title="Employment">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input type="text" value={employee.start_date ? new Date(employee.start_date).toLocaleDateString("en-AU") : ""} disabled
              className="w-full border rounded px-2 py-1.5 text-sm bg-gray-100 text-gray-500" />
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

      <PageSection title="Tax">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={taxFree} onChange={(e) => setTaxFree(e.target.checked)} />
              Tax-free threshold claimed
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={helpDebt} onChange={(e) => setHelpDebt(e.target.checked)} />
              HELP debt
            </label>
          </div>
        </div>
      </PageSection>

      <PageSection title="Superannuation">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fund Name</label>
            <input type="text" value={superFund} onChange={(e) => setSuperFund(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="e.g. AustralianSuper" />
          </div>
        </div>
      </PageSection>

      <PageSection title="Bank Details">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">BSB</label>
            <input type="text" value={bankBSB} onChange={(e) => setBankBSB(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="000-000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
            <input type="text" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="12345678" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Account Name</label>
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm" />
          </div>
        </div>
      </PageSection>

      <PageSection title="Activity">
        <AuditTimeline events={activity ?? []} loading={activityLoading} />
      </PageSection>
    </PageShell>
  )
}
