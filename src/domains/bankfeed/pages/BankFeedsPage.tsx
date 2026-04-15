// Spec references: R-0049 (AC-1, AC-4, AC-6), A-0025 §"Connection page", T-0026 (T-0026.14).
// Authoritative: https://api.basiq.io/docs/consent — Basiq hosts the consent UI;
// we only redirect users into it and reflect the resulting connections.

import { useState } from "react"
import { Button, Badge, Skeleton, EmptyState, InlineAlert, Combobox } from "@/components/primitives"
import { useAccounts } from "@/domains/account/hooks/useAccounts"
import { formatDate } from "@/shared/lib/utils"
import {
  useBankFeedConnections,
  useConnectBank,
  useMapBankFeedAccount,
  useSyncBankFeed,
  useReauthoriseBankFeed,
  statusVariant,
  type BankFeedConnection,
  type ConnectionStatus,
} from "../hooks/useBankFeed"

export function BankFeedsPage() {
  const { data: connections, isLoading, error, refetch } = useBankFeedConnections()
  const connect = useConnectBank()
  const [contactEmail, setContactEmail] = useState("")

  const handleConnect = async () => {
    if (!contactEmail) return
    const res = await connect.mutateAsync({ contact_email: contactEmail })
    // Redirect to Basiq Consent UI in the current tab — Basiq returns the
    // user via webhook, so we don't need a return URL handshake here.
    window.location.href = res.consent_url
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Bank Feeds</h1>
        <p className="text-sm text-gray-600">
          Connect your bank accounts to import transactions automatically. Powered by Basiq, the
          accredited Australian Consumer Data Right intermediary.
        </p>
      </header>

      <section className="rounded-lg border bg-white p-4 space-y-3">
        <h2 className="text-lg font-medium">Connect a new bank account</h2>
        <p className="text-sm text-gray-600">
          You'll be redirected to Basiq's secure consent page. Bank credentials are entered at your
          bank, never stored by Ledgius. CDR consent lasts up to 12 months and you can revoke it at
          any time.
        </p>
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="block text-sm text-gray-700 mb-1">Contact email</span>
            <input
              type="email"
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="you@business.com"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
            />
          </label>
          <Button onClick={handleConnect} disabled={!contactEmail || connect.isPending}>
            {connect.isPending ? "Opening..." : "Connect Bank Account"}
          </Button>
        </div>
        {connect.error && <InlineAlert variant="error">{(connect.error as Error).message}</InlineAlert>}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Connected accounts</h2>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {error && <InlineAlert variant="error">Failed to load: {(error as Error).message}</InlineAlert>}
        {isLoading && <Skeleton className="h-32 w-full" />}
        {!isLoading && connections && connections.length === 0 && (
          <EmptyState
            title="No bank feeds connected"
            description="Connect your first bank account above to start importing transactions automatically."
          />
        )}
        <ul className="space-y-2">
          {connections?.map(c => (
            <ConnectionCard key={c.id} connection={c} />
          ))}
        </ul>
      </section>
    </div>
  )
}

function ConnectionCard({ connection }: { connection: BankFeedConnection }) {
  const { data: accounts } = useAccounts()
  const map = useMapBankFeedAccount()
  const sync = useSyncBankFeed()
  const reauth = useReauthoriseBankFeed()

  // Account picker — limited to bank-class GL accounts (category 'A' in COA).
  const accountOptions =
    accounts
      ?.filter(a => a.category === "A" && !a.obsolete)
      .map(a => ({ value: String(a.id), label: `${a.accno} — ${a.description ?? a.accno}` })) ?? []

  const [selectedAccount, setSelectedAccount] = useState<string>(
    connection.bank_account_id ? String(connection.bank_account_id) : "",
  )

  const handleMap = async () => {
    const id = parseInt(selectedAccount, 10)
    if (!id) return
    await map.mutateAsync({ id: connection.id, bank_account_id: id })
  }

  const handleSync = async () => {
    await sync.mutateAsync({ id: connection.id })
  }

  const handleReauthorise = async () => {
    const res = await reauth.mutateAsync(connection.id)
    window.location.href = res.consent_url
  }

  return (
    <li className="rounded-lg border bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{connection.institution_name}</div>
          <div className="text-sm text-gray-600">
            {connection.account_name ?? "Unnamed account"}
            {connection.account_number_mask && (
              <span className="ml-1 text-gray-500">••••{connection.account_number_mask}</span>
            )}
          </div>
        </div>
        <Badge variant={statusVariant(connection.status)}>{statusLabel(connection.status)}</Badge>
      </div>

      {connection.bank_account_id == null ? (
        <div className="flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-600 mb-1">Map to GL account</div>
            <Combobox
              options={accountOptions}
              value={selectedAccount}
              onChange={v => setSelectedAccount(v == null ? "" : String(v))}
              placeholder="Choose a bank GL account..."
            />
          </div>
          <Button onClick={handleMap} disabled={!selectedAccount || map.isPending} size="sm">
            {map.isPending ? "Mapping..." : "Map account"}
          </Button>
        </div>
      ) : (
        <div className="text-sm text-gray-600">
          Linked to GL account #{connection.bank_account_id} ·{" "}
          <span>
            {connection.transactions_synced} txn{connection.transactions_synced === 1 ? "" : "s"} synced
          </span>
        </div>
      )}

      <SyncStatusLine connection={connection} />

      {connection.last_sync_error && (
        <InlineAlert variant="error">Last sync error: {connection.last_sync_error}</InlineAlert>
      )}

      <div className="flex flex-wrap gap-2">
        {connection.status === "active" && connection.bank_account_id && (
          <Button size="sm" variant="ghost" onClick={handleSync} disabled={sync.isPending}>
            {sync.isPending ? "Syncing..." : "Sync now"}
          </Button>
        )}
        {(connection.status === "expiring" || connection.status === "expired") && (
          <Button size="sm" onClick={handleReauthorise} disabled={reauth.isPending}>
            {reauth.isPending ? "Opening..." : "Reauthorise"}
          </Button>
        )}
      </div>
    </li>
  )
}

function SyncStatusLine({ connection }: { connection: BankFeedConnection }) {
  const lastSync = connection.last_sync_at
    ? formatDate(connection.last_sync_at)
    : "never"
  const expiry = connection.consent_expires_at ? formatDate(connection.consent_expires_at) : null
  return (
    <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
      <span>Last sync: {lastSync}</span>
      {expiry && <span>Consent expires: {expiry}</span>}
    </div>
  )
}

function statusLabel(s: ConnectionStatus): string {
  switch (s) {
    case "pending":
      return "Awaiting GL mapping"
    case "active":
      return "Active"
    case "expiring":
      return "Expiring soon"
    case "expired":
      return "Expired"
    case "disconnected":
      return "Disconnected"
    case "error":
      return "Error"
  }
}
