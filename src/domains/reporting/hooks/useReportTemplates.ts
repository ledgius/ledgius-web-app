// Spec references: R-0071 (RT-004), T-0033-09, T-0033-12.
//
// TanStack Query hooks for the report template designer — field
// catalogue, data sources, and template generation.

import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/lib/api"

export interface DataField {
  slug: string
  name: string
  type: string     // string | number | currency | date | boolean | list
  category: string // grouping key (e.g. "revenue", "period", "summary")
  description: string
}

export interface DataSourceInfo {
  slug: string
  name: string
  description: string
  category: string
}

/** Fetch field catalogue for a data source. Returns fields grouped by category. */
export function useFieldCatalogue(dataSourceSlug: string | undefined) {
  return useQuery({
    queryKey: ["report-field-catalogue", dataSourceSlug],
    queryFn: () => api.get<DataField[]>(`/reports/data-sources/${dataSourceSlug}/fields`),
    enabled: !!dataSourceSlug,
    staleTime: 5 * 60_000, // field catalogues rarely change
  })
}

/** Fetch all available data sources. */
export function useDataSources() {
  return useQuery({
    queryKey: ["report-data-sources"],
    queryFn: () => api.get<DataSourceInfo[]>("/reports/data-sources"),
    staleTime: 5 * 60_000,
  })
}
