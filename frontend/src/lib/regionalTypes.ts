/** Real Flask response contracts, from regional_engine.py. No synthetic values. */
export type DataPoint = { mean_aod: number | null; median_aod: number | null; valid_cells: number }
export type MatchedSeason = { mean_aod: number | null; median_aod: number | null }
export type SeasonKey = 'winter' | 'pre_monsoon' | 'monsoon' | 'post_monsoon'
export type ClusterShare = { cluster: string; cells: number; percent_of_eligible: number }

export type StateSummary = {
  state: string
  total_grid_cells: number
  valid_aod_cells: number
  valid_aod_percent: number
  mean_aod: number | null
  model_a_percent: number
  model_b_percent: number
}
export type StateProfile = {
  state: string
  coverage: {
    total_grid_cells: number
    valid_aod_cells: number
    valid_aod_percent: number
    model_a_cells: number
    model_a_percent: number
    model_b_cells: number
    model_b_percent: number
  }
  aerosol: {
    mean_aod: number | null
    median_cell_mean_aod: number | null
    std_of_cell_mean_aod: number | null
    min_cell_mean_aod: number | null
    max_cell_mean_aod: number | null
  }
  seasonal_all_available: Record<SeasonKey, DataPoint>
  seasonal_matched: { matched_cells: number; seasons: Record<SeasonKey, MatchedSeason> }
  model_a_distribution: ClusterShare[]
  model_b_distribution: ClusterShare[]
  interpretation: string
}
export type StateComparison = { states: StateProfile[]; comparison_note: string }
