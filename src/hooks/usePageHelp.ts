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
  // dashboard, booksHealth, calendar: migrated to knowledge pipeline
  // (Tranche Final) — see ledgius-api/docs/authority/articles/internal/
  // ledgius-{books-health,calendar}.yaml.

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
  // chartOfAccounts, editAccount, createAccount, accountHeadings: migrated
  // to knowledge pipeline (Tranche Final) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-{chart-of-accounts,
  // account-edit,account-create,account-headings}.yaml.

  // ── Contacts ──
  // customers, vendors, contactDetail, createContact: migrated to knowledge
  // pipeline (Tranche Contacts) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-{customers,vendors,
  // contact-detail,contact-create}.yaml.

  // ── Reports ──
  // reports: migrated to knowledge pipeline (Tranche Final) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-reports.yaml.
  // bas: migrated (T-0038 Tranche A) — ledgius-bas.yaml.

  // ── Products ──
  // products, createProduct, editProduct: migrated to knowledge pipeline
  // (Tranche Final) — see ledgius-api/docs/authority/articles/internal/
  // ledgius-{products,product-create,product-edit}.yaml.

  // taxCodes: migrated to knowledge pipeline (T-0038 Tranche A) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-tax-codes.yaml.

  // ── Currency / Recurring / Templates ──
  // currency, recurring, templates: migrated to knowledge pipeline
  // (Tranche Final) — see ledgius-api/docs/authority/articles/internal/
  // ledgius-{currency,recurring,templates}.yaml.

  // ── Payroll ──
  // employees + payRuns: migrated to knowledge pipeline (Tranche B) —
  // see ledgius-api/docs/authority/articles/internal/ledgius-employees.yaml
  // and ledgius-pay-runs.yaml.

  // auditLog: migrated to knowledge pipeline (T-0038 Tranche A) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-audit-log.yaml.

  // ── Admin ──
  // users: migrated to knowledge pipeline (Tranche Final) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-users.yaml.
  // paygConfig + superRates: migrated (Tranche B).

  // ── Export ──
  // dataExport: migrated to knowledge pipeline (Tranche Final) — see
  // ledgius-api/docs/authority/articles/internal/ledgius-export.yaml.

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
