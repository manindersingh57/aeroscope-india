/** Types for the notebook-derived Flask hotspot region endpoints. */
import type { Model } from './aeroscopeApi'

export type HotspotRegion = {
  model: Model
  region_id: number
  region_rank: number
  cluster_rank: number
  cluster_name: string
  grid_cells: number
  mean_aod: number | null
  mean_high_aod_frequency: number | null
  median_valid_days: number | null
  center: { latitude: number | null; longitude: number | null }
  bounds: { south: number | null; north: number | null; west: number | null; east: number | null }
  states: string[]
}

export type HotspotRegionPage = {
  items: HotspotRegion[]
  total: number
  limit: number
  offset: number
}

export type HotspotSummary = {
  model: Model
  qualifying_regions: number
  total_region_cells: number
  largest_region_cells: number
  cluster_counts: Record<string, number>
  interpretation: string
}

export type RegionFilters = {
  state?: string
  clusterName?: string
  minCells?: number
  minMeanAod?: number
  limit?: number
  offset?: number
}
