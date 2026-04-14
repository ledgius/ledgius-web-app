import { lazy, Suspense } from "react"
import { createBrowserRouter } from "react-router-dom"
import { Layout } from "@/shared/components/Layout"
import { RequireAuth } from "@/shared/components/RequireAuth"
import { PageLoader } from "@/components/primitives"

// Lazy-load all page components — each becomes a separate chunk.
// Pages only load when the user navigates to them.
const LoginPage = lazy(() => import("@/domains/auth/pages/LoginPage").then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import("@/domains/dashboard/pages/DashboardPage").then(m => ({ default: m.DashboardPage })))
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

const BankStatementsPage = lazy(() => import("@/domains/banking/pages/BankStatementsPage").then(m => ({ default: m.BankStatementsPage })))
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

const EmployeesPage = lazy(() => import("@/domains/payroll/pages/EmployeesPage").then(m => ({ default: m.EmployeesPage })))
const CreateEmployeePage = lazy(() => import("@/domains/payroll/pages/CreateEmployeePage").then(m => ({ default: m.CreateEmployeePage })))
const EmployeeDetailPage = lazy(() => import("@/domains/payroll/pages/EmployeeDetailPage").then(m => ({ default: m.EmployeeDetailPage })))
const PayRunsPage = lazy(() => import("@/domains/payroll/pages/PayRunsPage").then(m => ({ default: m.PayRunsPage })))

const PAYGConfigPage = lazy(() => import("@/domains/admin/pages/PAYGConfigPage").then(m => ({ default: m.PAYGConfigPage })))
const SuperRatesPage = lazy(() => import("@/domains/admin/pages/SuperRatesPage").then(m => ({ default: m.SuperRatesPage })))
const UsersPage = lazy(() => import("@/domains/admin/pages/UsersPage").then(m => ({ default: m.UsersPage })))
const DataImportPage = lazy(() => import("@/domains/admin/pages/DataImportPage").then(m => ({ default: m.DataImportPage })))
const FeedbackDashboardPage = lazy(() => import("@/domains/admin/pages/FeedbackDashboardPage").then(m => ({ default: m.FeedbackDashboardPage })))
const FeedbackStatusPage = lazy(() => import("@/domains/admin/pages/FeedbackStatusPage").then(m => ({ default: m.FeedbackStatusPage })))

const AuditLogPage = lazy(() => import("@/domains/audit/pages/AuditLogPage").then(m => ({ default: m.AuditLogPage })))
const ReportsPage = lazy(() => import("@/domains/reporting/pages/ReportsPage").then(m => ({ default: m.ReportsPage })))
const BASPage = lazy(() => import("@/domains/tax/pages/BASPage").then(m => ({ default: m.BASPage })))
const TaxCodesPage = lazy(() => import("@/domains/taxcode/pages/TaxCodesPage").then(m => ({ default: m.TaxCodesPage })))

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
      { index: true, element: <S><DashboardPage /></S> },
      { path: "books-health", element: <S><BooksHealthPage /></S> },
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

      // Cash & Banking
      { path: "bank-import-transactions", element: <S><BankStatementsPage /></S> },
      { path: "bank-reconciliation", element: <S><ReconciliationPage /></S> },
      { path: "captured-receipts", element: <S><CapturedReceiptsPage /></S> },
      { path: "logbook", element: <S><LogbookPage /></S> },
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

      // Recurring & Templates
      { path: "recurring", element: <S><RecurringPage /></S> },
      { path: "templates", element: <S><TemplatesPage /></S> },

      // Currency
      { path: "currencies", element: <S><CurrencyPage /></S> },

      // Payroll
      { path: "employees", element: <S><EmployeesPage /></S> },
      { path: "employees/new", element: <S><CreateEmployeePage /></S> },
      { path: "employees/:id", element: <S><EmployeeDetailPage /></S> },
      { path: "pay-runs", element: <S><PayRunsPage /></S> },

      // Admin
      { path: "payg-config", element: <S><PAYGConfigPage /></S> },
      { path: "super-rates", element: <S><SuperRatesPage /></S> },
      { path: "users", element: <S><UsersPage /></S> },

      // Audit
      { path: "audit-log", element: <S><AuditLogPage /></S> },

      // Data Import
      { path: "import", element: <S><DataImportPage /></S> },

      // Platform Admin (feedback dashboard)
      { path: "admin/feedback", element: <S><FeedbackDashboardPage /></S> },
      { path: "feedback/:id", element: <S><FeedbackStatusPage /></S> },

      // Reports & Tax
      { path: "reports", element: <S><ReportsPage /></S> },
      { path: "bas", element: <S><BASPage /></S> },
      { path: "tax-codes", element: <S><TaxCodesPage /></S> },
    ],
  },
])
