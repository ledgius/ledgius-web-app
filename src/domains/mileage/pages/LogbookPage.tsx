import { useState } from "react"
import { PageShell } from "@/components/layout"
import { DataTable } from "@/shared/components/DataTable"
import { SearchFilter } from "@/shared/components/SearchFilter"
import { Button } from "@/components/primitives"
import {
  useVehicles,
  useTrips,
  useLogTrip,
  useDeleteTrip,
  useMileageSummary,
  useCreateVehicle,
  type TripLog,
} from "../hooks/useMileage"
import { formatCurrency } from "@/shared/lib/utils"
import { Car, Plus, Trash2 } from "lucide-react"

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function LogbookPage() {
  const { data: vehicles = [] } = useVehicles()
  const { data: trips = [], isLoading } = useTrips()
  const { data: summary } = useMileageSummary()
  const logTrip = useLogTrip()
  const deleteTrip = useDeleteTrip()
  const createVehicle = useCreateVehicle()
  const [search, setSearch] = useState("")
  const [showAddVehicle, setShowAddVehicle] = useState(false)
  const [showAddTrip, setShowAddTrip] = useState(false)

  // Vehicle form
  const [vRego, setVRego] = useState("")
  const [vMake, setVMake] = useState("")
  const [vModel, setVModel] = useState("")
  const [vOdo, setVOdo] = useState("")

  // Trip form
  const [tVehicle, setTVehicle] = useState("")
  const [tDistance, setTDistance] = useState("")
  const [tFrom, setTFrom] = useState("")
  const [tTo, setTTo] = useState("")
  const [tPurpose, setTPurpose] = useState("")
  const [tType, setTType] = useState("business")

  const filtered = trips.filter((t) => {
    if (!search.trim()) return true
    const term = search.toLowerCase()
    return (
      (t.start_location ?? "").toLowerCase().includes(term) ||
      (t.end_location ?? "").toLowerCase().includes(term) ||
      (t.purpose ?? "").toLowerCase().includes(term) ||
      t.trip_type.includes(term)
    )
  })

  async function handleAddVehicle() {
    if (!vRego.trim()) return
    await createVehicle.mutateAsync({
      registration: vRego.trim().toUpperCase(),
      make: vMake.trim() || undefined,
      model: vModel.trim() || undefined,
      current_odometer: parseFloat(vOdo) || 0,
      is_default: vehicles.length === 0,
    })
    setShowAddVehicle(false)
    setVRego("")
    setVMake("")
    setVModel("")
    setVOdo("")
  }

  async function handleAddTrip() {
    const km = parseFloat(tDistance)
    if (!km || km <= 0) return
    await logTrip.mutateAsync({
      vehicle_id: parseInt(tVehicle) || vehicles[0]?.id,
      distance_km: km,
      start_location: tFrom.trim() || undefined,
      end_location: tTo.trim() || undefined,
      purpose: tPurpose.trim() || undefined,
      trip_type: tType,
    })
    setShowAddTrip(false)
    setTDistance("")
    setTFrom("")
    setTTo("")
    setTPurpose("")
  }

  const columns = [
    {
      key: "trip_type",
      header: "",
      className: "w-10",
      render: (row: TripLog) => (
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
          row.trip_type === "business"
            ? "bg-blue-100 text-blue-600"
            : "bg-gray-100 text-gray-500"
        }`}>
          {row.trip_type === "business" ? "B" : "P"}
        </span>
      ),
    },
    {
      key: "trip_date",
      header: "Date",
      className: "w-28",
      render: (row: TripLog) => formatDate(row.trip_date),
    },
    {
      key: "route",
      header: "Route",
      render: (row: TripLog) => (
        <span>
          {row.start_location && row.end_location
            ? `${row.start_location} → ${row.end_location}`
            : row.purpose || "—"}
        </span>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      className: "text-gray-500",
      render: (row: TripLog) => row.purpose ?? "—",
    },
    {
      key: "distance_km",
      header: "Distance",
      className: "text-right font-mono w-24",
      render: (row: TripLog) => `${Number(row.distance_km).toFixed(1)} km`,
    },
    {
      key: "source",
      header: "Source",
      className: "w-20 text-xs text-gray-400",
      render: (row: TripLog) => (
        <span className="capitalize">{row.source}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      render: (row: TripLog) => (
        <button
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          onClick={(e) => {
            e.stopPropagation()
            if (confirm("Delete this trip?")) deleteTrip.mutate(row.id)
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ]

  const header = (
    <div>
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Vehicle Logbook</h1>
        <span className="text-sm text-gray-500">{trips.length} trips</span>
      </div>
      <p className="text-sm text-gray-500 mt-0.5">Track mileage for ATO motor vehicle deductions</p>
      <div className="flex items-center gap-3 mt-3">
        <Button onClick={() => setShowAddTrip(!showAddTrip)} variant={showAddTrip ? "secondary" : "primary"}>
          <Plus className="h-4 w-4" />
          Log Trip
        </Button>
        <Button onClick={() => setShowAddVehicle(!showAddVehicle)} variant="secondary">
          <Car className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>
    </div>
  )

  return (
    <PageShell header={header} loading={isLoading}>
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{Number(summary.business_km).toFixed(0)}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">Business km (YTD)</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{Number(summary.business_pct).toFixed(0)}%</p>
            <p className="text-xs font-medium text-gray-500 mt-1">Business use</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(summary.cents_per_km_deduction)}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">Cents/km deduction</p>
            {summary.cents_per_km_capped && <p className="text-xs text-amber-600 mt-0.5">5,000 km cap reached</p>}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(summary.total_fuel_cost)}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">Fuel cost (YTD)</p>
          </div>
        </div>
      )}

      {/* Vehicles strip */}
      {vehicles.length > 0 && (
        <div className="flex gap-2 mb-4">
          {vehicles.filter(v => v.status === "active").map((v) => (
            <div key={v.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
              v.is_default
                ? "bg-cyan-700 text-white"
                : "bg-gray-100 text-gray-600 border border-gray-200"
            }`}>
              <Car className="w-3.5 h-3.5" />
              {v.registration}
              {v.make && v.model && <span className="text-xs opacity-70">({v.make} {v.model})</span>}
            </div>
          ))}
        </div>
      )}

      {/* Add vehicle inline form */}
      {showAddVehicle && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Vehicle</h3>
          <div className="flex gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-gray-500">Registration *</label>
              <input className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500" value={vRego} onChange={e => setVRego(e.target.value)} placeholder="ABC-123" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Make</label>
              <input className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500" value={vMake} onChange={e => setVMake(e.target.value)} placeholder="Toyota" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Model</label>
              <input className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500" value={vModel} onChange={e => setVModel(e.target.value)} placeholder="HiLux" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Odometer (km)</label>
              <input className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500" value={vOdo} onChange={e => setVOdo(e.target.value)} placeholder="47832" type="number" />
            </div>
            <Button onClick={handleAddVehicle} disabled={createVehicle.isPending}>Save</Button>
            <Button onClick={() => setShowAddVehicle(false)} variant="secondary">Cancel</Button>
          </div>
        </div>
      )}

      {/* Add trip inline form */}
      {showAddTrip && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Log Trip</h3>
          <div className="flex gap-3 items-end flex-wrap">
            {vehicles.length > 1 && (
              <div>
                <label className="text-xs font-medium text-gray-500">Vehicle</label>
                <select className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500" value={tVehicle} onChange={e => setTVehicle(e.target.value)}>
                  {vehicles.filter(v => v.status === "active").map(v => (
                    <option key={v.id} value={v.id}>{v.registration}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500">Distance (km) *</label>
              <input className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500" value={tDistance} onChange={e => setTDistance(e.target.value)} placeholder="14.2" type="number" step="0.1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">From</label>
              <input className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500" value={tFrom} onChange={e => setTFrom(e.target.value)} placeholder="Home" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">To</label>
              <input className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500" value={tTo} onChange={e => setTTo(e.target.value)} placeholder="Office" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Purpose</label>
              <input className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm w-36 focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500" value={tPurpose} onChange={e => setTPurpose(e.target.value)} placeholder="Client meeting" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Type</label>
              <select className="block mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500" value={tType} onChange={e => setTType(e.target.value)}>
                <option value="business">Business</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <Button onClick={handleAddTrip} disabled={logTrip.isPending}>Save</Button>
            <Button onClick={() => setShowAddTrip(false)} variant="secondary">Cancel</Button>
          </div>
        </div>
      )}

      <div className="mb-4">
        <SearchFilter placeholder="Search by location, purpose, or type..." onSearch={setSearch} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        emptyMessage="No trips logged yet. Use the mobile app or click 'Log Trip' to record your first trip."
      />
    </PageShell>
  )
}
