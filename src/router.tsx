import { createBrowserRouter } from "react-router-dom"
import { Layout } from "@/shared/components/Layout"
import { RequireAuth } from "@/shared/components/RequireAuth"
import { AccountsPage } from "@/domains/account/pages/AccountsPage"
import { CreateAccountPage } from "@/domains/account/pages/CreateAccountPage"
import { CustomersPage } from "@/domains/contact/pages/CustomersPage"
import { VendorsPage } from "@/domains/contact/pages/VendorsPage"
import { ContactDetailPage } from "@/domains/contact/pages/ContactDetailPage"
import { CreateContactPage } from "@/domains/contact/pages/CreateContactPage"
import { InvoicesPage } from "@/domains/receivable/pages/InvoicesPage"
import { InvoiceDetailPage } from "@/domains/receivable/pages/InvoiceDetailPage"
import { CreateInvoicePage } from "@/domains/receivable/pages/CreateInvoicePage"
import { CreditNoteListPage } from "@/domains/receivable/pages/CreditNoteListPage"
import { CreditNotesPage } from "@/domains/receivable/pages/CreditNotesPage"
import { BillsPage } from "@/domains/payable/pages/BillsPage"
import { BillDetailPage } from "@/domains/payable/pages/BillDetailPage"
import { CreateBillPage } from "@/domains/payable/pages/CreateBillPage"
import { DebitNotesPage } from "@/domains/payable/pages/DebitNotesPage"
import { ReceiptsPage } from "@/domains/receipt/pages/ReceiptsPage"
import { PaymentsPage } from "@/domains/payment/pages/PaymentsPage"
import { BankingPage } from "@/domains/banking/pages/BankingPage"
import { BankStatementsPage } from "@/domains/banking/pages/BankStatementsPage"
import { ReconciliationPage } from "@/domains/banking/pages/ReconciliationPage"
import { TransfersPage } from "@/domains/banking/pages/TransfersPage"
import { ReportsPage } from "@/domains/reporting/pages/ReportsPage"
import { BASPage } from "@/domains/tax/pages/BASPage"
import { GLPage } from "@/domains/journal/pages/GLPage"
import { ApprovalsPage } from "@/domains/journal/pages/ApprovalsPage"
import { ProductsPage } from "@/domains/product/pages/ProductsPage"
import { CreateProductPage } from "@/domains/product/pages/CreateProductPage"
import { TaxCodesPage } from "@/domains/taxcode/pages/TaxCodesPage"
import { DashboardPage } from "@/domains/dashboard/pages/DashboardPage"
import { BooksHealthPage } from "@/domains/dashboard/pages/BooksHealthPage"
import { LoginPage } from "@/domains/auth/pages/LoginPage"
import { EditAccountPage } from "@/domains/account/pages/EditAccountPage"
import { EditProductPage } from "@/domains/product/pages/EditProductPage"
import { RecurringPage } from "@/domains/recurring/pages/RecurringPage"
import { TemplatesPage } from "@/domains/template/pages/TemplatesPage"
import { AuditLogPage } from "@/domains/audit/pages/AuditLogPage"
import { HeadingsPage } from "@/domains/account/pages/HeadingsPage"
import { PAYGConfigPage } from "@/domains/admin/pages/PAYGConfigPage"
import { SuperRatesPage } from "@/domains/admin/pages/SuperRatesPage"
import { UsersPage } from "@/domains/admin/pages/UsersPage"
import { DataImportPage } from "@/domains/admin/pages/DataImportPage"
import { FeedbackDashboardPage } from "@/domains/admin/pages/FeedbackDashboardPage"
import { FeedbackStatusPage } from "@/domains/admin/pages/FeedbackStatusPage"
import { JournalDetailPage } from "@/domains/journal/pages/JournalDetailPage"
import { CurrencyPage } from "@/domains/currency/pages/CurrencyPage"
import { EmployeesPage } from "@/domains/payroll/pages/EmployeesPage"
import { CreateEmployeePage } from "@/domains/payroll/pages/CreateEmployeePage"
import { EmployeeDetailPage } from "@/domains/payroll/pages/EmployeeDetailPage"
import { PayRunsPage } from "@/domains/payroll/pages/PayRunsPage"
import { CalendarPage } from "@/domains/calendar/pages/CalendarPage"

export const router = createBrowserRouter([
  // Login page (no layout wrapper, no auth required)
  { path: "login", element: <LoginPage /> },

  // All other routes require authentication
  {
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "books-health", element: <BooksHealthPage /> },
      { path: "calendar", element: <CalendarPage /> },

      // Chart of Accounts
      { path: "accounts", element: <AccountsPage /> },
      { path: "accounts/new", element: <CreateAccountPage /> },
      { path: "accounts/:id/edit", element: <EditAccountPage /> },
      { path: "headings", element: <HeadingsPage /> },

      // Contacts
      { path: "customers", element: <CustomersPage /> },
      { path: "vendors", element: <VendorsPage /> },
      { path: "contacts/new", element: <CreateContactPage /> },
      { path: "contacts/:id", element: <ContactDetailPage /> },

      // Accounts Receivable
      { path: "invoices", element: <InvoicesPage /> },
      { path: "invoices/new", element: <CreateInvoicePage /> },
      { path: "invoices/:id", element: <InvoiceDetailPage /> },
      { path: "credit-notes", element: <CreditNoteListPage /> },
      { path: "credit-notes/new", element: <CreditNotesPage /> },
      { path: "receipts", element: <ReceiptsPage /> },

      // Accounts Payable
      { path: "bills", element: <BillsPage /> },
      { path: "bills/new", element: <CreateBillPage /> },
      { path: "bills/:id", element: <BillDetailPage /> },
      { path: "debit-notes", element: <DebitNotesPage /> },
      { path: "payments", element: <PaymentsPage /> },

      // Cash & Banking
      { path: "bank-import-transactions", element: <BankStatementsPage /> },
      { path: "bank-reconciliation", element: <ReconciliationPage /> },
      { path: "bank-reconciliation/legacy", element: <BankingPage /> },
      { path: "transfers", element: <TransfersPage /> },

      // General Ledger
      { path: "gl", element: <GLPage /> },
      { path: "gl/:id", element: <JournalDetailPage /> },
      { path: "approvals", element: <ApprovalsPage /> },

      // Products & Services
      { path: "products", element: <ProductsPage /> },
      { path: "products/new", element: <CreateProductPage /> },
      { path: "products/:id/edit", element: <EditProductPage /> },

      // Recurring & Templates
      { path: "recurring", element: <RecurringPage /> },
      { path: "templates", element: <TemplatesPage /> },

      // Currency
      { path: "currencies", element: <CurrencyPage /> },

      // Payroll
      { path: "employees", element: <EmployeesPage /> },
      { path: "employees/new", element: <CreateEmployeePage /> },
      { path: "employees/:id", element: <EmployeeDetailPage /> },
      { path: "pay-runs", element: <PayRunsPage /> },

      // Admin
      { path: "payg-config", element: <PAYGConfigPage /> },
      { path: "super-rates", element: <SuperRatesPage /> },
      { path: "users", element: <UsersPage /> },

      // Audit
      { path: "audit-log", element: <AuditLogPage /> },

      // Data Import
      { path: "import", element: <DataImportPage /> },

      // Platform Admin (feedback dashboard)
      { path: "admin/feedback", element: <FeedbackDashboardPage /> },
      { path: "feedback/:id", element: <FeedbackStatusPage /> },

      // Reports & Tax
      { path: "reports", element: <ReportsPage /> },
      { path: "bas", element: <BASPage /> },
      { path: "tax-codes", element: <TaxCodesPage /> },
    ],
  },
])
