import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface Vehicle {
  id: number
  registration: string
  make?: string
  model?: string
  year?: number
  colour?: string
  fuel_type: string
  current_odometer: string
  is_default: boolean
  status: string
  created_at: string
}

export interface TripLog {
  id: number
  vehicle_id: number
  trip_date: string
  start_odometer?: string
  end_odometer?: string
  distance_km: string
  start_location?: string
  end_location?: string
  purpose?: string
  trip_type: "business" | "personal"
  is_return_trip: boolean
  source: string
  created_at: string
}

export interface LogbookPeriod {
  id: number
  vehicle_id: number
  start_date: string
  end_date: string
  status: string
  total_business_km?: string
  total_personal_km?: string
  total_km?: string
  business_use_pct?: string
  valid_until?: string
}

export interface MileageSummary {
  financial_year: string
  total_km: string
  business_km: string
  personal_km: string
  business_pct: string
  cents_per_km_rate: string
  cents_per_km_deduction: string
  cents_per_km_capped: boolean
  logbook_pct?: string
  total_fuel_cost: string
  vehicle_count: number
  trip_count: number
}

export function useVehicles() {
  return useQuery({
    queryKey: ["vehicles"],
    queryFn: () => api.get<Vehicle[]>("/vehicles"),
  })
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<Vehicle>("/vehicles", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vehicles"] }),
  })
}

export function useTrips(vehicleId?: number, dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams()
  if (vehicleId) params.set("vehicle_id", String(vehicleId))
  if (dateFrom) params.set("date_from", dateFrom)
  if (dateTo) params.set("date_to", dateTo)
  const qs = params.toString()

  return useQuery({
    queryKey: ["trips", vehicleId, dateFrom, dateTo],
    queryFn: () => api.get<TripLog[]>(`/trips${qs ? `?${qs}` : ""}`),
  })
}

export function useLogTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post<TripLog>("/trips", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] })
      qc.invalidateQueries({ queryKey: ["mileage-summary"] })
    },
  })
}

export function useDeleteTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/trips/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trips"] })
      qc.invalidateQueries({ queryKey: ["mileage-summary"] })
    },
  })
}

export function useLogbookPeriods(vehicleId?: number) {
  const qs = vehicleId ? `?vehicle_id=${vehicleId}` : ""
  return useQuery({
    queryKey: ["logbook-periods", vehicleId],
    queryFn: () => api.get<LogbookPeriod[]>(`/logbook-periods${qs}`),
  })
}

export function useStartLogbook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { vehicle_id: number; start_date?: string }) =>
      api.post<LogbookPeriod>("/logbook-periods", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logbook-periods"] }),
  })
}

export function useCompleteLogbook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post<LogbookPeriod>(`/logbook-periods/${id}/complete`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["logbook-periods"] }),
  })
}

export function useMileageSummary() {
  return useQuery({
    queryKey: ["mileage-summary"],
    queryFn: () => api.get<MileageSummary>("/mileage/summary"),
  })
}
