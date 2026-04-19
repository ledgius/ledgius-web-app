// Spec references: R-0064, R-0066, R-0067, A-0037.
//
// Reusable connection card for OAuth-connected accounting systems.
// Shows connection status, connect/disconnect, and pull/push buttons.

import { Link2, Link2Off, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/primitives"
import { DateValue } from "@/components/financial"
import { cn } from "@/shared/lib/utils"
import type { ConnectionStatus } from "@/hooks/useConnections"

export interface ConnectionCardProps {
  system: string
  label: string
  colour: string
  connection: ConnectionStatus | null
  mode: "import" | "export"
  onConnect: () => void
  onDisconnect: () => void
  onPull?: () => void
  onPush?: () => void
  pulling?: boolean
  pushing?: boolean
  disconnecting?: boolean
}

export function ConnectionCard({
  system,
  label,
  colour,
  connection,
  mode,
  onConnect,
  onDisconnect,
  onPull,
  onPush,
  pulling,
  pushing,
  disconnecting,
}: ConnectionCardProps) {
  const isConnected = connection?.status === "active"

  return (
    <div className={cn(
      "border rounded-lg p-4 transition-colors",
      isConnected ? "border-green-300 bg-green-50/30" : "border-gray-200 bg-white"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: colour }}
          >
            {system === "xero" ? "X" : system === "myob" ? "M" : "QB"}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{label}</p>
            {isConnected ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-xs text-green-700">
                  Connected{connection.org_name ? ` — ${connection.org_name}` : ""}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <XCircle className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-500">Not connected</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isConnected ? (
            <>
              {mode === "import" && onPull && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onPull}
                  disabled={pulling}
                  loading={pulling}
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  Pull Data
                </Button>
              )}
              {mode === "export" && onPush && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onPush}
                  disabled={pushing}
                  loading={pushing}
                >
                  <ArrowUpFromLine className="h-3.5 w-3.5" />
                  Push Data
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={onDisconnect}
                disabled={disconnecting}
              >
                <Link2Off className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={onConnect}
            >
              <Link2 className="h-3.5 w-3.5" />
              Connect
            </Button>
          )}
        </div>
      </div>

      {isConnected && connection.connected_at && (
        <p className="text-xs text-gray-400 mt-2">
          Connected <DateValue value={connection.connected_at} format="relative" />
          {connection.connected_by && ` by ${connection.connected_by}`}
        </p>
      )}
    </div>
  )
}
