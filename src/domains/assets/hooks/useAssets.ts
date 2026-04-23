// Spec references: R-0062, T-0029.
//
// Data hooks for the fixed-assets feature. Wire the TanStack Query layer
// over the /api/v1/assets endpoints introduced by the ledgius-api T-0029
// PR. Shapes mirror openapi-assets.yaml and the Go structs in
// internal/asset/model.go — keep the three in sync.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

// ── Types (mirror openapi-assets.yaml + internal/asset/model.go) ────────────

export type AssetStatus =
  | "draft"
  | "active"
  | "fully_depreciated"
  | "disposed"
  | "archived"

export type DepreciationMethod =
  | "straight_line"
  | "diminishing_value"
  | "instant_writeoff"

export interface AssetCategory {
  id: string
  code: string
  name: string
  default_capital_account_id?: number
  default_accum_depr_account_id?: number
  default_depreciation_expense_account_id?: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  name: string
  description?: string
  category_id: string
  category?: AssetCategory
  purchase_date: string
  cost_ex_gst: string
  gst_amount: string
  useful_life_years?: number
  residual_value: string
  depreciation_method: DepreciationMethod
  accumulated_depreciation: string
  book_value: string
  business_use_pct?: string
  status: AssetStatus
  capital_account_id?: number
  accum_depreciation_account_id?: number
  depreciation_expense_account_id?: number
  supplier_entity_id?: number
  linked_bill_id?: number
  acquisition_transaction_id?: number
  disposal_transaction_id?: number
  disposal_date?: string
  estimate_changes: EstimateChange[]
  correction_id?: string
  created_at: string
  updated_at: string
}

export interface EstimateChange {
  field: string
  old: string | number
  new: string | number
  effective_from: string
  reason: string
}

export interface AssetListTotals {
  count_active: number
  count_disposed: number
  count_fully_depreciated: number
  total_cost: string
  total_accumulated: string
  total_book_value: string
}

export interface PaginationInfo {
  page: number
  page_size: number
  total: number
}

export interface AssetListResponse {
  items: Asset[]
  totals: AssetListTotals
  pagination: PaginationInfo
}

export interface AssetListFilters {
  statuses?: AssetStatus[]
  categoryId?: string
  purchaseFrom?: string
  purchaseTo?: string
  query?: string
  includeDisposed?: boolean
  page?: number
  pageSize?: number
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * List assets with filters + totals + pagination.
 *
 * Filters mirror the query parameters accepted by GET /api/v1/assets.
 */
export function useAssets(filters: AssetListFilters = {}) {
  const qs = buildQueryString(filters)
  return useQuery({
    queryKey: ["assets", filters],
    queryFn: () => api.get<AssetListResponse>(`/assets${qs}`),
  })
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ["asset", id],
    queryFn: () => api.get<Asset>(`/assets/${id}`),
    enabled: !!id,
  })
}

export interface AssetActivityEntry {
  id: number
  entity_type: string
  entity_id: string
  action: string
  user_id?: string | null
  before_json?: Record<string, unknown>
  after_json?: Record<string, unknown>
  metadata?: Record<string, unknown>
  created_at: string
}

export interface AssetActivityResponse {
  items: AssetActivityEntry[]
  pagination: PaginationInfo
}

export function useAssetActivity(id: string | undefined, pageSize = 100) {
  return useQuery({
    queryKey: ["asset-activity", id, pageSize],
    queryFn: () =>
      api.get<AssetActivityResponse>(`/assets/${id}/activity?page_size=${pageSize}`),
    enabled: !!id,
  })
}

export function useAssetCategories() {
  return useQuery({
    queryKey: ["asset-categories"],
    queryFn: () => api.get<AssetCategory[]>("/assets/categories"),
    // Categories rarely change; cache generously.
    staleTime: 5 * 60_000,
  })
}

export interface InstantWriteoffThreshold {
  fy_start: string
  fy_end: string
  threshold_aud: string
}

export function useInstantWriteoffThreshold(fyStart: string | undefined) {
  return useQuery({
    queryKey: ["instant-writeoff-threshold", fyStart],
    queryFn: () =>
      api.get<InstantWriteoffThreshold>(
        `/assets/instant-writeoff-threshold?fy_start=${fyStart}`,
      ),
    enabled: !!fyStart,
  })
}

export interface EditAssetNonPostingPayload {
  name?: string
  description?: string
  business_use_pct?: string
}

export function useUpdateAssetNonPosting(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: EditAssetNonPostingPayload) =>
      api.patch<Asset>(`/assets/${id}`, payload),
    onSuccess: (updated) => {
      qc.setQueryData(["asset", id], updated)
      qc.invalidateQueries({ queryKey: ["assets"] })
      qc.invalidateQueries({ queryKey: ["asset-activity", id] })
    },
  })
}

/**
 * AcquireAssetPayload mirrors the backend's acquireRequest in
 * internal/asset/handler.go. Decimal amounts are strings to avoid float
 * precision issues; dates are YYYY-MM-DD.
 *
 * Cash mode only for now — bill-linked modes (create-new-bill,
 * link-existing-bill) land in T-0030.
 */
export interface AcquireAssetPayload {
  name: string
  description?: string
  category_id: string
  purchase_date: string
  cost_ex_gst: string
  gst_amount?: string
  gst_applies?: boolean
  useful_life_years?: number
  residual_value?: string
  depreciation_method: DepreciationMethod
  business_use_pct?: string
  supplier_entity_id?: number
  capital_account_id_override?: number
  accum_depreciation_account_id_override?: number
  depreciation_expense_account_id_override?: number
  bank_account_id: number
}

export function useAcquireAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AcquireAssetPayload) =>
      api.post<Asset>("/assets", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] })
    },
  })
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildQueryString(f: AssetListFilters): string {
  const parts: string[] = []
  if (f.statuses) {
    for (const s of f.statuses) parts.push(`status=${encodeURIComponent(s)}`)
  }
  if (f.categoryId) parts.push(`category_id=${encodeURIComponent(f.categoryId)}`)
  if (f.purchaseFrom) parts.push(`purchase_from=${encodeURIComponent(f.purchaseFrom)}`)
  if (f.purchaseTo) parts.push(`purchase_to=${encodeURIComponent(f.purchaseTo)}`)
  if (f.query) parts.push(`q=${encodeURIComponent(f.query)}`)
  if (f.includeDisposed) parts.push("include_disposed=true")
  if (f.page) parts.push(`page=${f.page}`)
  if (f.pageSize) parts.push(`page_size=${f.pageSize}`)
  return parts.length ? `?${parts.join("&")}` : ""
}
