// Spec references: R-0068 (PA-040 through PA-046).
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { PageShell } from "@/components/layout"
import { Button, InfoPanel, Skeleton } from "@/components/primitives"
import { usePageHelp } from "@/hooks/usePageHelp"
import { usePagePolicies } from "@/hooks/usePagePolicies"
import { useFeedback } from "@/components/feedback"
import { api } from "@/shared/lib/api"
import {
  Server, Database, HardDrive, Download, RefreshCw, Play,
  CheckCircle, XCircle, AlertCircle, Clock, FlaskConical
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

// --- Types ---

interface Machine {
  id: string; name: string; state: string; region: string; app: string; image?: string
}

interface DatabaseSize {
  name: string; size_bytes: number; size_human: string
  tenant_id?: string; tenant_name?: string; is_test?: boolean
  flyway_version?: string; flyway_script?: string
}

interface StorageInfo {
  slug: string; tenant_id?: string; name?: string
  size_bytes: number; size_human: string; file_count: number
}

interface BackupFile {
  filename: string; database: string; size_bytes: number
  size_human: string; created_at: string; download: string
}

function machineStateColor(state: string) {
  switch (state) {
    case "started": return "text-green-600"
    case "stopped": return "text-gray-400"
    case "stopping": case "starting": return "text-amber-500"
    case "destroyed": return "text-red-500"
    default: return "text-gray-500"
  }
}

function machineStateIcon(state: string) {
  switch (state) {
    case "started": return <CheckCircle className="h-4 w-4" />
    case "stopped": return <XCircle className="h-4 w-4" />
    case "stopping": case "starting": return <Clock className="h-4 w-4" />
    default: return <AlertCircle className="h-4 w-4" />
  }
}

export function OperationsPage() {
  usePageHelp(undefined)
  usePagePolicies(["platform"])
  const [activeTab, setActiveTab] = useState<"machines" | "databases" | "storage" | "backups">("machines")

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Operations</h1>
      </div>
      <p className="text-sm text-gray-500">Monitor infrastructure, databases, storage, and backups</p>
    </div>
  )

  return (
    <PageShell header={header}>
      <InfoPanel title="Platform operations" storageKey="platform-ops-info" collapsible>
        <p>Monitor Fly.io machines, database sizes and schema versions, tenant storage volumes, and manage backups. All operations are audit-logged.</p>
      </InfoPanel>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
        {([
          { key: "machines" as const, label: "Machines", icon: <Server className="h-3.5 w-3.5" /> },
          { key: "databases" as const, label: "Databases", icon: <Database className="h-3.5 w-3.5" /> },
          { key: "storage" as const, label: "Storage", icon: <HardDrive className="h-3.5 w-3.5" /> },
          { key: "backups" as const, label: "Backups", icon: <Download className="h-3.5 w-3.5" /> },
        ]).map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.key ? "border-primary-500 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"
            )}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "machines" && <MachinesTab />}
      {activeTab === "databases" && <DatabasesTab />}
      {activeTab === "storage" && <StorageTab />}
      {activeTab === "backups" && <BackupsTab />}
    </PageShell>
  )
}

// --- Machines Tab ---

function MachinesTab() {
  const feedback = useFeedback()
  const qc = useQueryClient()
  const { data: machines, isLoading } = useQuery({
    queryKey: ["platform", "operations", "machines"],
    queryFn: () => api.get<Machine[]>("/platform/operations/machines"),
  })

  const restart = useMutation({
    mutationFn: ({ id, app }: { id: string; app: string }) => api.post(`/platform/operations/machines/${id}/restart`, { app }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["platform", "operations", "machines"] }); feedback.success("Machine restart initiated") },
    onError: (err: Error) => feedback.error("Restart failed", err.message),
  })

  if (isLoading) return <Skeleton className="h-48" />
  const grouped = (machines ?? []).reduce<Record<string, Machine[]>>((acc, m) => { (acc[m.app] ??= []).push(m); return acc }, {})

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([app, appMachines]) => (
        <div key={app}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{app}</h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Machine</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Region</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">State</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Image</th>
                  <th className="px-4 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appMachines.map((m, i) => (
                  <tr key={m.id} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900">{m.name || m.id}</p>
                      <p className="text-xs text-gray-400 font-mono">{m.id}</p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{m.region}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("flex items-center gap-1.5 font-medium", machineStateColor(m.state))}>
                        {machineStateIcon(m.state)}{m.state}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 font-mono truncate max-w-[200px]">{m.image || "—"}</td>
                    <td className="px-4 py-2.5">
                      <Button variant="secondary" size="sm" onClick={() => restart.mutate({ id: m.id, app })} loading={restart.isPending}>
                        <RefreshCw className="h-3 w-3" />Restart
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {Object.keys(grouped).length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No machines found. Ensure FLY_API_TOKEN is configured.</p>
      )}
    </div>
  )
}

// --- Databases Tab ---

function DatabasesTab() {
  const { data: databases, isLoading } = useQuery({
    queryKey: ["platform", "operations", "databases"],
    queryFn: () => api.get<DatabaseSize[]>("/platform/operations/databases"),
  })

  if (isLoading) return <Skeleton className="h-48" />

  const totalSize = (databases ?? []).reduce((sum, d) => sum + d.size_bytes, 0)

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Total: {(databases ?? []).length} databases, {humanSize(totalSize)}</p>
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Database</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Tenant</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs uppercase">Size</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Flyway Version</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(databases ?? []).map((db, i) => (
              <tr key={db.name} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                <td className="px-4 py-2.5 font-mono text-sm text-gray-900">{db.name}</td>
                <td className="px-4 py-2.5">
                  {db.tenant_name ? (
                    <span className="flex items-center gap-1.5 text-sm text-gray-700">
                      {db.tenant_name}
                      {db.is_test && <span title="Test tenant"><FlaskConical className="h-3 w-3 text-amber-500" /></span>}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">{db.name === "ledgius_platform" ? "Platform DB" : "—"}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{db.size_human}</td>
                <td className="px-4 py-2.5">
                  {db.flyway_version ? (
                    <span className="text-xs font-mono text-gray-600" title={db.flyway_script}>V{db.flyway_version}</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Storage Tab ---

function StorageTab() {
  const { data: storage, isLoading } = useQuery({
    queryKey: ["platform", "operations", "storage"],
    queryFn: () => api.get<StorageInfo[]>("/platform/operations/storage"),
  })

  if (isLoading) return <Skeleton className="h-48" />

  const totalSize = (storage ?? []).reduce((sum, s) => sum + s.size_bytes, 0)
  const totalFiles = (storage ?? []).reduce((sum, s) => sum + s.file_count, 0)

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Total: {(storage ?? []).length} directories, {humanSize(totalSize)}, {totalFiles} files</p>
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Directory</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Tenant</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs uppercase">Size</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs uppercase">Files</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(storage ?? []).map((s, i) => (
              <tr key={s.slug} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                <td className="px-4 py-2.5 font-mono text-sm text-gray-900">{s.slug}/</td>
                <td className="px-4 py-2.5 text-sm text-gray-700">{s.name || "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{s.size_human}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">{s.file_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Backups Tab ---

function BackupsTab() {
  const feedback = useFeedback()
  const qc = useQueryClient()
  const [backupDb, setBackupDb] = useState("")

  const { data: backups, isLoading } = useQuery({
    queryKey: ["platform", "operations", "backups"],
    queryFn: () => api.get<BackupFile[]>("/platform/operations/backups"),
  })

  const { data: databases } = useQuery({
    queryKey: ["platform", "operations", "databases"],
    queryFn: () => api.get<DatabaseSize[]>("/platform/operations/databases"),
  })

  const triggerBackup = useMutation({
    mutationFn: (database: string) => api.post("/platform/operations/backup", { database }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform", "operations", "backups"] })
      feedback.success("Backup complete")
      setBackupDb("")
    },
    onError: (err: Error) => feedback.error("Backup failed", err.message),
  })

  return (
    <div className="space-y-6">
      {/* Trigger backup */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Play className="h-4 w-4 text-primary-500" />Trigger Manual Backup
        </h3>
        <div className="flex items-center gap-3">
          <select value={backupDb} onChange={e => setBackupDb(e.target.value)}
            className="bg-white border border-gray-300 rounded px-3 py-2 text-sm pr-8 flex-1">
            <option value="">Select database...</option>
            {(databases ?? []).filter(d => d.name !== "postgres" && d.name !== "template0" && d.name !== "template1").map(d => (
              <option key={d.name} value={d.name}>{d.name}{d.tenant_name ? ` (${d.tenant_name})` : ""}</option>
            ))}
          </select>
          <Button variant="primary" size="sm" onClick={() => backupDb && triggerBackup.mutate(backupDb)}
            disabled={!backupDb} loading={triggerBackup.isPending}>
            <Download className="h-3.5 w-3.5" />Backup Now
          </Button>
        </div>
        {triggerBackup.isPending && (
          <p className="text-xs text-amber-600 mt-2">Running pg_dump... this may take a moment for large databases.</p>
        )}
      </div>

      {/* Backup list */}
      {isLoading ? <Skeleton className="h-32" /> : (backups ?? []).length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No backups yet. Use the form above to create one.</p>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Filename</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Database</th>
                <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs uppercase">Size</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs uppercase">Created</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(backups ?? []).map((b, i) => (
                <tr key={b.filename} className={i % 2 === 1 ? "bg-gray-50/50" : ""}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-900">{b.filename}</td>
                  <td className="px-4 py-2.5 text-gray-700">{b.database}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{b.size_human}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(b.created_at).toLocaleString("en-AU")}</td>
                  <td className="px-4 py-2.5">
                    <a href={`/api/v1${b.download}`} download className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
                      <Download className="h-3 w-3" />Download
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// --- Utils ---

function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}
