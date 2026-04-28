/**
 * TfnSection — TFN capture / display widget on the Employee Detail page.
 *
 * Spec references:
 *   - R-0005 PAY-STP-013 (TFN handling, mod-11 validation)
 *   - R-0005 PAY-STP-039 (encrypted storage + cleartext-window discipline)
 *   - A-0049 (Encryption at Rest)
 *
 * UX states (driven by Employee.tfn_provided):
 *
 *   no TFN on file (tfn_provided=false):
 *     ┌──────────────────────────────────────────────────────┐
 *     │ [ TFN input ____________ ]   [ Save TFN ] [ Cancel ] │
 *     │ Spaces and dashes accepted (123 456 782 = 123-456-…) │
 *     └──────────────────────────────────────────────────────┘
 *
 *   TFN on file (tfn_provided=true):
 *     ┌──────────────────────────────────────────────────────┐
 *     │ TFN: ***-***-782       Provided 14 May 2026          │
 *     │                  [ Change ] [ Clear ]                │
 *     └──────────────────────────────────────────────────────┘
 *
 *   Change-mode reuses the input UI but adds a banner explaining the
 *   prior ciphertext will be replaced.
 *
 * Cleartext-window discipline (A-0049):
 *   - Cleartext TFN exists in component state ONLY for the lifetime of
 *     the input box. After successful save, the state is cleared and
 *     the field reverts to the masked display.
 *   - The api response (SetEmployeeTFNResponse) never echoes the
 *     cleartext value — only employee_id + tfn_provided + tfn_supplied_at.
 */

import { useState, useMemo } from "react"
import { Button, InlineAlert } from "@/components/primitives"
import { useFeedback } from "@/components/feedback"
import { useSetEmployeeTFN, useClearEmployeeTFN } from "../hooks/usePayroll"

export interface TfnSectionProps {
  employeeId: number
  tfnProvided: boolean
  /** ISO 8601 timestamp of the last successful TFN save, or null. */
  tfnSuppliedAt: string | null
}

export function TfnSection({ employeeId, tfnProvided, tfnSuppliedAt }: TfnSectionProps) {
  const [editing, setEditing] = useState(!tfnProvided)
  const [tfnInput, setTfnInput] = useState("")
  const [echoError, setEchoError] = useState<string | null>(null)
  const feedback = useFeedback()
  const setTfnMutation = useSetEmployeeTFN(employeeId)
  const clearTfnMutation = useClearEmployeeTFN(employeeId)

  // Client-side mod-11 echo so the user sees feedback before the
  // network round-trip. Server-side validation runs regardless — this
  // is a usability hint, not the authoritative check.
  const clientValidation = useMemo(() => validateTfnEcho(tfnInput), [tfnInput])

  const handleSave = async () => {
    if (clientValidation !== null) {
      setEchoError(clientValidation)
      return
    }
    setEchoError(null)
    try {
      await setTfnMutation.mutateAsync(tfnInput)
      // Cleartext-window discipline: clear the input immediately so the
      // value doesn't linger in component state any longer than needed.
      setTfnInput("")
      setEditing(false)
      feedback.success("TFN saved (encrypted at rest)")
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Server rejected the TFN"
      // Common case: server-side mod-11 caught something the client
      // echo missed. Show the server's error verbatim.
      feedback.error("TFN save failed", message)
      setEchoError(message)
    }
  }

  const handleClear = async () => {
    if (!confirm("Clear the TFN on file? The employee will fall back to the no-TFN withholding rate until a new TFN is supplied.")) {
      return
    }
    try {
      await clearTfnMutation.mutateAsync()
      feedback.success("TFN cleared")
      setEditing(true) // open the input so a new value can be entered if desired
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Server rejected the clear"
      feedback.error("TFN clear failed", message)
    }
  }

  const handleCancelEdit = () => {
    setTfnInput("")
    setEchoError(null)
    if (tfnProvided) {
      // Only return to the masked-view state if a TFN was already on
      // file; otherwise stay in edit mode so the user has a clear next
      // step.
      setEditing(false)
    }
  }

  // ─── View mode (TFN on file, not editing) ───────────────────────
  if (!editing && tfnProvided) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">TFN</div>
            <div className="font-mono text-sm text-gray-900">
              {/* The cleartext is never sent to the frontend; this mask is
                  static rather than partial-reveal because we don't have
                  any digits client-side. */}
              ●●●&#8202;●●●&#8202;●●●
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-600 mb-1">Provided</div>
            <div className="text-sm text-gray-700">
              {tfnSuppliedAt ? new Date(tfnSuppliedAt).toLocaleString("en-AU") : "—"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>Change TFN</Button>
          <Button
            variant="danger"
            onClick={handleClear}
            loading={clearTfnMutation.isPending}
          >
            Clear TFN
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          TFNs are stored encrypted at rest (AES-256-GCM, per-tenant key).
          The cleartext value is decrypted only at STP submission time and
          every decryption is recorded in the audit log.
        </p>
      </div>
    )
  }

  // ─── Edit mode (no TFN on file, or "Change TFN" pressed) ────────
  return (
    <div className="space-y-3">
      {tfnProvided && (
        <InlineAlert variant="warning">
          Saving a new TFN replaces the existing encrypted value. The change is recorded in the audit log.
        </InlineAlert>
      )}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tax File Number</label>
        <input
          type="text"
          value={tfnInput}
          onChange={(e) => {
            setTfnInput(e.target.value)
            setEchoError(null)
          }}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          // Browsers sometimes try to save the value to credentials —
          // this attribute deters most credential managers.
          data-lpignore="true"
          className="w-64 border border-gray-300 rounded px-2 py-1.5 text-sm font-mono focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
          placeholder="123 456 782"
          aria-invalid={echoError !== null}
        />
        <p className="text-xs text-gray-500 mt-1">
          9 digits. Spaces and dashes are accepted on input —{" "}
          <span className="font-mono">123 456 782</span>,{" "}
          <span className="font-mono">123-456-782</span>, and{" "}
          <span className="font-mono">123456782</span> are all equivalent.
        </p>
      </div>
      {echoError && (
        <InlineAlert variant="error">{echoError}</InlineAlert>
      )}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={tfnInput.length === 0 || clientValidation !== null}
          loading={setTfnMutation.isPending}
        >
          Save TFN
        </Button>
        {(tfnProvided || tfnInput.length > 0) && (
          <Button variant="secondary" onClick={handleCancelEdit}>Cancel</Button>
        )}
      </div>
    </div>
  )
}

// validateTfnEcho runs the same ATO mod-11 algorithm the server uses,
// returning null on a valid TFN or an explanatory string on failure.
// The server-side validator is authoritative; this client-side echo
// gives instant feedback for the common typo case.
//
// Algorithm: 9 digits with weights [1,4,3,7,5,8,6,9,10]; sum mod 11 == 0.
// Source: ATO TFN integrity check algorithm.
function validateTfnEcho(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "")
  if (digits.length === 0) return null // not yet entered — don't show an error
  if (!/^\d+$/.test(digits)) return "TFN must contain only digits, spaces, and dashes"
  if (digits.length !== 9) return `TFN must be 9 digits (got ${digits.length})`
  const weights = [1, 4, 3, 7, 5, 8, 6, 9, 10]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]!, 10) * weights[i]!
  }
  if (sum % 11 !== 0) return "TFN failed the mod-11 checksum (likely a typo)"
  return null
}
