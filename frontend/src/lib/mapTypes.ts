/** Response types follow the Phase 4 Flask map routes and location engine. */
export type ModelId = 'model_a' | 'model_b'

export type ClusterLegend = {
  cluster_id: number
  rank: number
  name: string
  color: string
  description: string
}
export type ModelLegend = {
  title: string
  cluster_count: number
  description: string
  clusters: ClusterLegend[]
}
export type LayerCatalogue = {
  project: string
  temporal_scope: string
  data_is_live: boolean
  layers: Record<ModelId, ModelLegend>
  geometry_notes: string
  disclaimer: string
  availability: { research_results: boolean; grid_points: boolean }
}

export type HotspotProperties = {
  model: ModelId
  region_id: number
  region_rank: number
  cluster_rank: number
  cluster_name: string
  grid_cells: number
  mean_aod: number | null
  mean_high_aod_frequency: number | null
  median_valid_days: number | null
  states: string[]
  bounds: { north: number; south: number; west: number; east: number }
}
export type HotspotFeature = {
  type: 'Feature'
  id: string
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: HotspotProperties
}
export type HotspotsCollection = {
  type: 'FeatureCollection'
  features: HotspotFeature[]
  pagination: { total: number; offset: number; limit: number; has_more: boolean }
  geometry_type: string
  scientific_disclaimer: string
}

export type LocationModel = {
  available: boolean
  cluster_id: number | null
  cluster_name: string | null
  membership_strength: number | null
  reason: string | null
}
export type LocationResult = {
  status: string
  message?: string
  nearest_distance_km?: number
  profile: null | {
    cell_id: string | number | null
    state_name: string | null
    distance_km: number
    grid_center: { latitude: number; longitude: number }
    aerosol: {
      mean_aod: number | null
      std_aod: number | null
      high_aod_frequency: number | null
      valid_days: number | null
      coverage_fraction: number | null
    }
    model_a: LocationModel
    model_b: LocationModel
  }
}

export type HotspotFilters = {
  state?: string
  clusterName?: string
  minCells?: number
  limit?: number
  offset?: number
}
