import { lazy, Suspense } from "react"
import { createBrowserRouter } from "react-router-dom"
import { Layout } from "@/shared/components/Layout"
import { RequireAuth } from "@/shared/components/RequireAuth"
import { RequirePlatformAdmin } from "@/shared/components/RequirePlatformAdmin"
import { RequireFeature } from "@/components/workflow/RequireFeature"
import { PageLoader } from "@/components/primitives"

// Lazy-load all page components — each becomes a separate chunk.
// Pages only load when the user navigates to them.
const LoginPage = lazy(() => import("@/domains/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })))
const BooksHealthPage = lazy(() => import("@/domains/dashboard/pages/BooksHealthPage").then(m => ({ default: m.BooksHealthPage })))
const CalendarPage = lazy(() => import("@/domains/calendar/pages/CalendarPage").then(m => ({ default: m.CalendarPage })))

const AccountsPage = lazy(() => import("@/domains/account/pages/AccountsPage").then(m => ({ default: m.AccountsPage })))
const CreateAccountPage = lazy(() => import("@/domains/account/pages/CreateAccountPage").then(m => ({ default: m.CreateAccountPage })))
const EditAccountPage = lazy(() => import("@/domains/account/pages/EditAccountPage").then(m => ({ default: m.EditAccountPage })))
const HeadingsPage = lazy(() => import("@/domains/account/pages/HeadingsPage").then(m => ({ default: m.HeadingsPage })))

const CustomersPage = lazy(() => import("@/domains/contact/pages/CustomersPage").then(m => ({ default: m.CustomersPage })))
const VendorsPage = lazy(() => import("@/domains/contact/pages/VendorsPage").then(m => ({ default: m.VendorsPage })))
const ContactDetailPage = lazy(() => import("@/domains/contact/pages/ContactDetailPage").then(m => ({ default: m.ContactDetailPage })))
const CreateContactPage = lazy(() => import("@/domains/contact/pages/CreateContactPage").then(m => ({ default: m.CreateContactPage })))

const InvoicesPage = lazy(() => import("@/domains/receivable/pages/InvoicesPage").then(m => ({ default: m.InvoicesPage })))
const InvoiceDetailPage = lazy(() => import("@/domains/receivable/pages/InvoiceDetailPage").then(m => ({ default: m.InvoiceDetailPage })))
const CreateInvoicePage = lazy(() => import("@/domains/receivable/pages/CreateInvoicePage").then(m => ({ default: m.CreateInvoicePage })))
const CreditNoteListPage = lazy(() => import("@/domains/receivable/pages/CreditNoteListPage").then(m => ({ default: m.CreditNoteListPage })))
const CreditNotesPage = lazy(() => import("@/domains/receivable/pages/CreditNotesPage").then(m => ({ default: m.CreditNotesPage })))
const ReceiptsPage = lazy(() => import("@/domains/receipt/pages/ReceiptsPage").then(m => ({ default: m.ReceiptsPage })))

const BillsPage = lazy(() => import("@/domains/payable/pages/BillsPage").then(m => ({ default: m.BillsPage })))
const BillDetailPage = lazy(() => import("@/domains/payable/pages/BillDetailPage").then(m => ({ default: m.BillDetailPage })))
const CreateBillPage = lazy(() => import("@/domains/payable/pages/CreateBillPage").then(m => ({ default: m.CreateBillPage })))
const DebitNotesPage = lazy(() => import("@/domains/payable/pages/DebitNotesPage").then(m => ({ default: m.DebitNotesPage })))
const PaymentsPage = lazy(() => import("@/domains/payment/pages/PaymentsPage").then(m => ({ default: m.PaymentsPage })))
const PaymentDetailPage = lazy(() => import("@/domains/payment/pages/PaymentDetailPage").then(m => ({ default: m.PaymentDetailPage })))

const BankStatementsPage = lazy(() => import("@/domains/banking/pages/BankStatementsPage").then(m => ({ default: m.BankStatementsPage })))
const BankFeedsPage = lazy(() => import("@/domains/bankfeed/pages/BankFeedsPage").then(m => ({ default: m.BankFeedsPage })))
const BusinessSettingsPage = lazy(() => import("@/domains/admin/pages/BusinessSettingsPage").then(m => ({ default: m.BusinessSettingsPage })))
const ReconciliationPage = lazy(() => import("@/domains/banking/pages/ReconciliationPage").then(m => ({ default: m.ReconciliationPage })))
const BankingPage = lazy(() => import("@/domains/banking/pages/BankingPage").then(m => ({ default: m.BankingPage })))
const TransfersPage = lazy(() => import("@/domains/banking/pages/TransfersPage").then(m => ({ default: m.TransfersPage })))
const CapturedReceiptsPage = lazy(() => import("@/domains/capture/pages/CapturedReceiptsPage").then(m => ({ default: m.CapturedReceiptsPage })))
const LogbookPage = lazy(() => import("@/domains/mileage/pages/LogbookPage").then(m => ({ default: m.LogbookPage })))

const GLPage = lazy(() => import("@/domains/journal/pages/GLPage").then(m => ({ default: m.GLPage })))
const JournalDetailPage = lazy(() => import("@/domains/journal/pages/JournalDetailPage").then(m => ({ default: m.JournalDetailPage })))
const ApprovalsPage = lazy(() => import("@/domains/journal/pages/ApprovalsPage").then(m => ({ default: m.ApprovalsPage })))

const ProductsPage = lazy(() => import("@/domains/product/pages/ProductsPage").then(m => ({ default: m.ProductsPage })))
const CreateProductPage = lazy(() => import("@/domains/product/pages/CreateProductPage").then(m => ({ default: m.CreateProductPage })))
const EditProductPage = lazy(() => import("@/domains/product/pages/EditProductPage").then(m => ({ default: m.EditProductPage })))

const RecurringPage = lazy(() => import("@/domains/recurring/pages/RecurringPage").then(m => ({ default: m.RecurringPage })))
const TemplatesPage = lazy(() => import("@/domains/template/pages/TemplatesPage").then(m => ({ default: m.TemplatesPage })))
const CurrencyPage = lazy(() => import("@/domains/currency/pages/CurrencyPage").then(m => ({ default: m.CurrencyPage })))

// Report Designer
const ReportTemplatesPage = lazy(() => import("@/domains/reporting/pages/ReportTemplatesPage").then(m => ({ default: m.ReportTemplatesPage })))
const ReportDesignerPage = lazy(() => import("@/domains/reporting/pages/ReportDesignerPage").then(m => ({ default: m.ReportDesignerPage })))

const EmployeesPage = lazy(() => import("@/domains/payroll/pages/EmployeesPage").then(m => ({ default: m.EmployeesPage })))
const CreateEmployeePage = lazy(() => import("@/domains/payroll/pages/CreateEmployeePage").then(m => ({ default: m.CreateEmployeePage })))
const EmployeeDetailPage = lazy(() => import("@/domains/payroll/pages/EmployeeDetailPage").then(m => ({ default: m.EmployeeDetailPage })))
const PayRunsPage = lazy(() => import("@/domains/payroll/pages/PayRunsPage").then(m => ({ default: m.PayRunsPage })))
const SuperObligationsPage = lazy(() => import("@/domains/payroll/pages/SuperObligationsPage").then(m => ({ default: m.SuperObligationsPage })))

const PAYGConfigPage = lazy(() => import("@/domains/admin/pages/PAYGConfigPage").then(m => ({ default: m.PAYGConfigPage })))
const SuperRatesPage = lazy(() => import("@/domains/admin/pages/SuperRatesPage").then(m => ({ default: m.SuperRatesPage })))
const UsersPage = lazy(() => import("@/domains/admin/pages/UsersPage").then(m => ({ default: m.UsersPage })))
const DataImportPage = lazy(() => import("@/domains/admin/pages/DataImportPage").then(m => ({ default: m.DataImportPage })))
const ExportPage = lazy(() => import("@/domains/export/pages/ExportPage").then(m => ({ default: m.ExportPage })))
const FeedbackDashboardPage = lazy(() => import("@/domains/admin/pages/FeedbackDashboardPage").then(m => ({ default: m.FeedbackDashboardPage })))
const PlatformAdminPage = lazy(() => import("@/domains/admin/pages/PlatformAdminPage").then(m => ({ default: m.PlatformAdminPage })))
const FeedbackStatusPage = lazy(() => import("@/domains/admin/pages/FeedbackStatusPage").then(m => ({ default: m.FeedbackStatusPage })))

const AssetRegisterPage = lazy(() => import("@/domains/assets/pages/AssetRegisterPage").then(m => ({ default: m.AssetRegisterPage })))
const AssetDetailPage = lazy(() => import("@/domains/assets/pages/AssetDetailPage").then(m => ({ default: m.AssetDetailPage })))
const BuyAssetPage = lazy(() => import("@/domains/assets/pages/BuyAssetPage").then(m => ({ default: m.BuyAssetPage })))
const SellDisposePage = lazy(() => import("@/domains/assets/pages/SellDisposePage").then(m => ({ default: m.SellDisposePage })))
const DepreciationPage = lazy(() => import("@/domains/assets/pages/DepreciationPage").then(m => ({ default: m.DepreciationPage })))

const LoanRegisterPage = lazy(() => import("@/domains/liabilities/pages/LoanRegisterPage").then(m => ({ default: m.LoanRegisterPage })))
const LoanPaymentsPage = lazy(() => import("@/domains/liabilities/pages/LoanPaymentsPage").then(m => ({ default: m.LoanPaymentsPage })))
const LoanPayoutPage = lazy(() => import("@/domains/liabilities/pages/LoanPayoutPage").then(m => ({ default: m.LoanPayoutPage })))

const AuditLogPage = lazy(() => import("@/domains/audit/pages/AuditLogPage").then(m => ({ default: m.AuditLogPage })))
const ReportsPage = lazy(() => import("@/domains/reporting/pages/ReportsPage").then(m => ({ default: m.ReportsPage })))
const BASPage = lazy(() => import("@/domains/tax/pages/BASPage").then(m => ({ default: m.BASPage })))
const TaxCodesPage = lazy(() => import("@/domains/taxcode/pages/TaxCodesPage").then(m => ({ default: m.TaxCodesPage })))

const SignupQueuePage = lazy(() => import("@/domains/platform/pages/SignupQueuePage").then(m => ({ default: m.SignupQueuePage })))
const TenantsPage = lazy(() => import("@/domains/platform/pages/TenantsPage").then(m => ({ default: m.TenantsPage })))
const TenantDetailPage = lazy(() => import("@/domains/platform/pages/TenantDetailPage").then(m => ({ default: m.TenantDetailPage })))
const PricingPlansPage = lazy(() => import("@/domains/platform/pages/PricingPlansPage").then(m => ({ default: m.PricingPlansPage })))
const PlatformUsersPage = lazy(() => import("@/domains/platform/pages/PlatformUsersPage").then(m => ({ default: m.PlatformUsersPage })))
const OperationsPage = lazy(() => import("@/domains/platform/pages/OperationsPage").then(m => ({ default: m.OperationsPage })))
const PlatformSettingsPage = lazy(() => import("@/domains/platform/pages/PlatformSettingsPage").then(m => ({ default: m.PlatformSettingsPage })))

// Wrap each lazy page in Suspense with the branded loading spinner.
function S({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

export const router = createBrowserRouter([
  // Login page (no layout wrapper, no auth required)
  { path: "login", element: <S><LoginPage /></S> },

  // All other routes require authentication
  {
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true, element: <S><BooksHealthPage /></S> },
      { path: "calendar", element: <S><CalendarPage /></S> },

      // Chart of Accounts
      { path: "accounts", element: <S><AccountsPage /></S> },
      { path: "accounts/new", element: <S><CreateAccountPage /></S> },
      { path: "accounts/:id/edit", element: <S><EditAccountPage /></S> },
      { path: "headings", element: <S><HeadingsPage /></S> },

      // Contacts
      { path: "customers", element: <S><CustomersPage /></S> },
      { path: "vendors", element: <S><VendorsPage /></S> },
      { path: "contacts/new", element: <S><CreateContactPage /></S> },
      { path: "contacts/:id", element: <S><ContactDetailPage /></S> },

      // Accounts Receivable
      { path: "invoices", element: <S><InvoicesPage /></S> },
      { path: "invoices/new", element: <S><CreateInvoicePage /></S> },
      { path: "invoices/:id", element: <S><InvoiceDetailPage /></S> },
      { path: "credit-notes", element: <S><CreditNoteListPage /></S> },
      { path: "credit-notes/new", element: <S><CreditNotesPage /></S> },
      { path: "receipts", element: <S><ReceiptsPage /></S> },

      // Accounts Payable
      { path: "bills", element: <S><BillsPage /></S> },
      { path: "bills/new", element: <S><CreateBillPage /></S> },
      { path: "bills/:id", element: <S><BillDetailPage /></S> },
      { path: "debit-notes", element: <S><DebitNotesPage /></S> },
      { path: "payments", element: <S><PaymentsPage /></S> },
      { path: "payments/:id", element: <S><PaymentDetailPage /></S> },

      // Cash & Banking
      { path: "settings/bank-feeds", element: <RequireFeature feature="bank_feeds" label="Bank Feeds"><S><BankFeedsPage /></S></RequireFeature> },
      { path: "settings/business", element: <S><BusinessSettingsPage /></S> },
      { path: "bank-statements", element: <S><BankStatementsPage /></S> },
      { path: "bank-reconciliation", element: <S><ReconciliationPage /></S> },
      { path: "captured-receipts", element: <S><CapturedReceiptsPage /></S> },
      { path: "logbook", element: <RequireFeature feature="mileage" label="Mileage Tracking"><S><LogbookPage /></S></RequireFeature> },
      { path: "bank-reconciliation/legacy", element: <S><BankingPage /></S> },
      { path: "transfers", element: <S><TransfersPage /></S> },

      // General Ledger
      { path: "gl", element: <S><GLPage /></S> },
      { path: "gl/:id", element: <S><JournalDetailPage /></S> },
      { path: "approvals", element: <S><ApprovalsPage /></S> },

      // Products & Services
      { path: "products", element: <S><ProductsPage /></S> },
      { path: "products/new", element: <S><CreateProductPage /></S> },
      { path: "products/:id/edit", element: <S><EditProductPage /></S> },

      // Recurring & Templates (feature-gated)
      { path: "recurring", element: <RequireFeature feature="recurring" label="Recurring Transactions"><S><RecurringPage /></S></RequireFeature> },
      { path: "templates", element: <S><TemplatesPage /></S> },

      // Currency (feature-gated)
      { path: "currencies", element: <RequireFeature feature="multi_currency" label="Multi-Currency"><S><CurrencyPage /></S></RequireFeature> },

      // Payroll (feature-gated)
      { path: "employees", element: <RequireFeature feature="payroll" label="Payroll"><S><EmployeesPage /></S></RequireFeature> },
      { path: "employees/new", element: <RequireFeature feature="payroll"><S><CreateEmployeePage /></S></RequireFeature> },
      { path: "employees/:id", element: <RequireFeature feature="payroll"><S><EmployeeDetailPage /></S></RequireFeature> },
      { path: "pay-runs", element: <RequireFeature feature="payroll"><S><PayRunsPage /></S></RequireFeature> },

      // Fixed Assets (feature-gated)
      { path: "assets", element: <RequireFeature feature="fixed_assets" label="Fixed Assets"><S><AssetRegisterPage /></S></RequireFeature> },
      { path: "assets/buy", element: <RequireFeature feature="fixed_assets"><S><BuyAssetPage /></S></RequireFeature> },
      { path: "assets/sell", element: <RequireFeature feature="fixed_assets"><S><SellDisposePage /></S></RequireFeature> },
      { path: "assets/depreciation", element: <RequireFeature feature="fixed_assets"><S><DepreciationPage /></S></RequireFeature> },
      { path: "assets/:id", element: <RequireFeature feature="fixed_assets"><S><AssetDetailPage /></S></RequireFeature> },

      // Loans / Liabilities
      { path: "loans", element: <S><LoanRegisterPage /></S> },
      { path: "loans/payments", element: <S><LoanPaymentsPage /></S> },
      { path: "loans/payout", element: <S><LoanPayoutPage /></S> },

      // Admin
      { path: "payg-config", element: <S><PAYGConfigPage /></S> },
      { path: "super-rates", element: <S><SuperRatesPage /></S> },
      { path: "super-obligations", element: <RequireFeature feature="payroll" label="Super Obligations"><S><SuperObligationsPage /></S></RequireFeature> },
      { path: "users", element: <S><UsersPage /></S> },

      // Audit
      { path: "audit-log", element: <S><AuditLogPage /></S> },

      // Report Designer
      { path: "reports/templates", element: <S><ReportTemplatesPage /></S> },
      { path: "reports/templates/:id/edit", element: <ReportDesignerPage /> },

      // Data Import / Export
      { path: "import", element: <S><DataImportPage /></S> },
      { path: "export", element: <S><ExportPage /></S> },

      // Platform Admin (feedback dashboard) — gated to platform admins only
      { path: "admin", element: <RequirePlatformAdmin><S><PlatformAdminPage /></S></RequirePlatformAdmin> },
      { path: "admin/feedback", element: <RequirePlatformAdmin><S><FeedbackDashboardPage /></S></RequirePlatformAdmin> },
      { path: "feedback/:id", element: <S><FeedbackStatusPage /></S> },

      // Platform Admin
      { path: "platform/signups", element: <RequirePlatformAdmin><S><SignupQueuePage /></S></RequirePlatformAdmin> },
      { path: "platform/tenants", element: <RequirePlatformAdmin><S><TenantsPage /></S></RequirePlatformAdmin> },
      { path: "platform/tenants/:id", element: <RequirePlatformAdmin><S><TenantDetailPage /></S></RequirePlatformAdmin> },
      { path: "platform/plans", element: <RequirePlatformAdmin><S><PricingPlansPage /></S></RequirePlatformAdmin> },
      { path: "platform/users", element: <RequirePlatformAdmin><S><PlatformUsersPage /></S></RequirePlatformAdmin> },
      { path: "platform/operations", element: <RequirePlatformAdmin><S><OperationsPage /></S></RequirePlatformAdmin> },
      { path: "platform/settings", element: <RequirePlatformAdmin><S><PlatformSettingsPage /></S></RequirePlatformAdmin> },

      // Reports & Tax
      { path: "reports", element: <S><ReportsPage /></S> },
      { path: "bas", element: <S><BASPage /></S> },
      { path: "tax-codes", element: <S><TaxCodesPage /></S> },
    ],
  },
])
