import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useHelpPanel } from "@/components/workflow"
import { getHelp } from "@/lib/help"

interface HelpSection {
  readonly heading?: string
  readonly body: string
}

interface PageHelp {
  readonly title: string
  readonly sections: readonly HelpSection[]
}

/**
 * Sets the help panel content for the current page.
 *
 * Priority:
 * 1. YAML-based help from locale files (matched by route)
 * 2. Inline help passed as argument (legacy, for pages not yet migrated)
 *
 * Content is cleared when the component unmounts.
 */
export function usePageHelp(inlineHelp?: PageHelp, context?: string) {
  const { setContent } = useHelpPanel()
  const location = useLocation()

  useEffect(() => {
    // Try YAML-based help first.
    const yamlHelp = getHelp(location.pathname, context)
    if (yamlHelp) {
      setContent(yamlHelp)
    } else if (inlineHelp) {
      setContent(inlineHelp)
    }

    return () => setContent(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, context, inlineHelp?.title, setContent])
}

/** Pre-defined help content for all pages (legacy — being migrated to YAML) */
export const pageHelpContent = {

  // ── Dashboard ──
  dashboard: {
    title: "Dashboard",
    sections: [
      { heading: "What is this?", body: "Today's decisions queue — the items that need your attention right now, in priority order. This is a doing page, not a monitoring page." },
      { heading: "Health Check vs Dashboard", body: "Dashboard shows what to do today. Health Check shows the overall state of your books (aged receivables, BAS readiness, period close, etc.). Use Health Check for terminology (AR, AP, GST position) and status colour meanings." },
      { heading: "Tip", body: "Click any amount to jump directly to the list where you can act on it." },
    ],
  },

  // ── Sales / Receivables ──
  // invoices, invoiceDetail, createInvoice, creditNotes, receipts: migrated
  // to knowledge pipeline (Tranche C) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-{invoices,
  // invoice-detail,invoice-create,credit-notes,receipts}.yaml.

  // ── Purchases / Payables ──
  // bills, billDetail, createBill, debitNotes, payments: migrated to
  // knowledge pipeline (Tranche D) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-{bills,bill-detail,
  // bill-create,debit-notes,payments}.yaml.

  // ── Banking, GL, Approvals ──
  //
  // Migrated to the knowledge pipeline per T-0038 Tranche A. Articles live in
  // ledgius-api/docs/authority/articles/internal/ledgius-{bank-reconciliation,
  // bank-statements,bank-feeds,transfers,journal-entries,journal-detail,
  // approvals}.yaml. Pages declare domains via usePagePolicies() — no inline
  // help entries needed here.

  // ── Chart of Accounts ──
  chartOfAccounts: {
    title: "Chart of Accounts",
    sections: [
      { heading: "What is this?", body: "The chart of accounts is the backbone of your accounting system. It lists every account where transactions can be recorded." },
      { heading: "Active vs inactive", body: "By default only accounts with transactions are shown. Click 'Show all' to see unused accounts that came with the standard template." },
      { heading: "Account types", body: "A = Asset, L = Liability, Q = Equity, I = Income, E = Expense. Each account must belong to one of these categories." },
      { heading: "Links", body: "Links like AR, AP, IC_sale connect accounts to functional roles in the system (e.g. AR = Accounts Receivable control account)." },
      { heading: "Tip", body: "Click any row to edit the account details. Use Mark Obsolete to retire accounts you no longer need — never delete them." },
    ],
  },
  editAccount: {
    title: "Edit Account",
    sections: [
      { heading: "What can you change?", body: "You can update the description, and toggle the contra and tax flags. The account code and category cannot be changed after creation." },
      { heading: "Contra accounts", body: "A contra account offsets another account of the same type (e.g. accumulated depreciation is a contra asset)." },
      { heading: "Tax accounts", body: "Tax accounts are used for GST calculations. Only mark an account as a tax account if it holds GST collected or paid." },
      { heading: "Mark Obsolete", body: "Obsolete accounts are hidden from selection lists but preserved for historical reporting. This cannot be undone easily." },
    ],
  },
  createAccount: {
    title: "Create Account",
    sections: [
      { heading: "Account code", body: "Use the standard numbering: 1xxx = Assets, 2xxx = Liabilities, 3xxx = Equity, 4xxx = Income, 5xxx-6xxx = Expenses." },
      { heading: "Heading ID", body: "Each account must belong to a heading group. Headings organise the chart for reporting (e.g. 'Current Assets', 'Revenue')." },
      { heading: "Tip", body: "Start with the standard template accounts. Only create new accounts when you need a category that doesn't exist." },
    ],
  },
  accountHeadings: {
    title: "Account Headings",
    sections: [
      { heading: "What is this?", body: "Headings are the grouping structure for your chart of accounts. They appear as section headers in financial reports." },
      { heading: "Examples", body: "1000 = Current Assets, 1500 = Inventory, 1800 = Non-Current Assets, 2000 = Current Liabilities, 4000 = Revenue." },
      { heading: "Creating headings", body: "Enter a code and description. The code determines sort order in reports." },
    ],
  },

  // ── Contacts ──
  customers: {
    title: "Customers",
    sections: [
      { heading: "What is this?", body: "Your customer contacts for accounts receivable. Each customer has a credit account that tracks their invoices and payments." },
      { heading: "Key fields", body: "ABN (Australian Business Number), credit limit, payment terms, and currency. These defaults are used when creating invoices." },
      { heading: "Tip", body: "Click any customer to view and edit their details. Credit limits are advisory — they don't block invoice creation." },
    ],
  },
  vendors: {
    title: "Vendors",
    sections: [
      { heading: "What is this?", body: "Your supplier contacts for accounts payable. Each vendor has a credit account that tracks bills and payments you make to them." },
      { heading: "Tip", body: "Set up accurate payment terms to help manage cash flow and bill scheduling." },
    ],
  },
  contactDetail: {
    title: "Contact Detail",
    sections: [
      { heading: "What is this?", body: "The full profile of a customer or vendor including entity details, credit account settings, and activity history." },
      { heading: "Editing", body: "Click Edit to modify credit limit, payment terms, and discount settings. Entity details (name, ABN) are shown read-only here." },
      { heading: "Activity", body: "The activity panel shows changes made to this contact record." },
    ],
  },
  createContact: {
    title: "Create Contact",
    sections: [
      { heading: "Customer vs Vendor", body: "The type is set based on where you navigated from — Customers or Vendors. Each creates the appropriate credit account." },
      { heading: "Required fields", body: "Name is mandatory. Legal name defaults to the name if not specified." },
      { heading: "ABN", body: "The Australian Business Number is optional but recommended for GST reporting and BAS preparation." },
      { heading: "Payment terms", body: "Default payment terms (in days) are applied to new invoices or bills for this contact." },
    ],
  },

  // ── Reports ──
  reports: {
    title: "Financial Reports",
    sections: [
      { heading: "What is this?", body: "Standard financial reports: Profit & Loss, Balance Sheet, Trial Balance, Aged Receivables/Payables, Cash Flow, and Customer/Vendor Statements." },
      { heading: "Date range", body: "Select the reporting period using the date controls. Most reports compare against the same period last year." },
      { heading: "Drill down", body: "Click on amounts to see the underlying transactions. This helps investigate variances and verify balances." },
      { heading: "Export", body: "Reports can be exported for use in spreadsheets or for your accountant." },
    ],
  },
  // bas: migrated to knowledge pipeline (T-0038 Tranche A) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-bas.yaml.

  // ── Products ──
  products: {
    title: "Products & Services",
    sections: [
      { heading: "What is this?", body: "Your product and service catalogue. Items here can be selected when creating invoices and bills for consistent pricing and account coding." },
      { heading: "Product types", body: "Service = time-based (hours, sessions). Product = physical goods. Overhead = internal costs." },
      { heading: "Pricing", body: "Set default sell and buy prices. These are used as defaults when adding the item to an invoice or bill — they can be overridden per transaction." },
      { heading: "Tax codes", body: "Assign default sell and buy tax codes so the correct GST treatment is applied automatically." },
    ],
  },
  createProduct: {
    title: "Create Product / Service",
    sections: [
      { heading: "Required fields", body: "Name is mandatory. All other fields are optional but recommended for accurate invoicing." },
      { heading: "SKU", body: "Stock Keeping Unit — a unique identifier for the product. Optional but useful for inventory tracking." },
      { heading: "Accounts", body: "Income account = where revenue is recorded when sold. Expense account = where cost is recorded when purchased." },
    ],
  },
  editProduct: {
    title: "Edit Product / Service",
    sections: [
      { heading: "What can you change?", body: "Name, unit, prices, and tax code assignments. Changes apply to future transactions only — existing invoices and bills are not affected." },
    ],
  },

  // taxCodes: migrated to knowledge pipeline (T-0038 Tranche A) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-tax-codes.yaml.

  // ── Currency ──
  currency: {
    title: "Currency & Exchange Rates",
    sections: [
      { heading: "What is this?", body: "Manage exchange rates for foreign currency transactions. The base currency is AUD." },
      { heading: "Adding rates", body: "Enter the currency code (e.g. USD, NZD) and the exchange rate relative to AUD." },
      { heading: "Tip", body: "Exchange rates are used when creating invoices or bills in foreign currencies. Keep rates up to date for accurate reporting." },
    ],
  },

  // ── Recurring ──
  recurring: {
    title: "Recurring Transactions",
    sections: [
      { heading: "What is this?", body: "Set up transactions that repeat on a schedule — monthly rent, weekly wages, quarterly insurance." },
      { heading: "How it works", body: "Create a schedule with the amount, accounts, and frequency. The system generates transactions automatically at each interval." },
      { heading: "Tip", body: "Review generated transactions before posting. Recurring entries create drafts that still need approval." },
    ],
  },

  // ── Templates ──
  templates: {
    title: "Transaction Templates",
    sections: [
      { heading: "What is this?", body: "Saved templates for common transactions. Use them to quickly create invoices, bills, or journal entries with pre-filled values." },
      { heading: "Tip", body: "Templates save time for repetitive entries. They store the accounts, descriptions, and amounts but not dates or references." },
    ],
  },

  // ── Payroll ──
  // employees + payRuns: migrated to knowledge pipeline (Tranche B) —
  // see ledgius-api/docs/authority/articles/internal/ledgius-employees.yaml
  // and ledgius-pay-runs.yaml.

  // auditLog: migrated to knowledge pipeline (T-0038 Tranche A) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-audit-log.yaml.

  // ── Admin ──
  users: {
    title: "Users & Roles",
    sections: [
      { heading: "What is this?", body: "Manage user accounts and their roles within the organisation." },
      { heading: "Roles", body: "Owner = full access. Master Accountant = reports, BAS, period close. Accountant = transaction entry and review. Bookkeeper = day-to-day entry. Viewer = read-only." },
      { heading: "Tip", body: "Assign the minimum role needed. Users can always be upgraded but restricting access prevents accidental changes." },
    ],
  },
  // paygConfig + superRates: migrated to knowledge pipeline (Tranche B) —
  // see ledgius-api/docs/authority/articles/internal/ledgius-payg-config.yaml
  // and ledgius-super-rates.yaml.

  // ── Export ──
  dataExport: {
    title: "Data Export",
    sections: [
      { heading: "What is this?", body: "Export your accounting data in a format compatible with Xero, MYOB, or as generic CSV files. Select the target format, choose entity types, and download the bundle." },
      { heading: "Xero format", body: "Produces a ZIP bundle of CSV files — one per entity type (accounts, contacts, invoices, bills, credit notes, tax rates). Ready for direct import via Xero's CSV import tool." },
      { heading: "MYOB format", body: "Produces tab-delimited text files (.txt) compatible with MYOB AccountRight's Import/Export Assistant. This format is specific to MYOB AccountRight and may not be compatible with other MYOB products (e.g. MYOB Essentials, MYOB Business). Includes accounts, customer cards, and vendor cards. Open the files in AccountRight via File → Import Data." },
      { heading: "Entity types", body: "Choose which data to include. Leave empty to export all available entities for the selected format." },
      { heading: "Date range", body: "Date filtering applies to transactional entities (invoices, bills, credit notes). Master data (accounts, contacts, tax rates) is always exported in full." },
      { heading: "Download", body: "Completed exports produce a ZIP bundle. Recent exports are listed at the bottom — you can re-download previous bundles." },
    ],
  },

  // ── Fixed Assets & Loans / Liabilities ──
  //
  // Migrated to the knowledge pipeline per T-0038. Articles are now served
  // by GET /api/v1/knowledge/articles from internal-policy YAML in
  // ledgius-api/docs/authority/articles/internal/. The Help tab picks them
  // up automatically via the usePagePolicies hook on each page — no inline
  // pageHelpContent entries are needed here. Remaining pages migrate in
  // follow-up PRs (see T-0038 inventory punch-list).

  // superObligations: migrated to knowledge pipeline (Tranche B) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-super-obligations.yaml.
} as const
