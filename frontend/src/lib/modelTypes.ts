/** Scientific result schemas returned by the precomputed Flask analytics API. */
export interface EvaluationRow {
  model: string
  k: number
  wcss: number | null
  silhouette: number | null
  davies_bouldin: number | null
  calinski_harabasz: number | null
  smallest_cluster_pct: number | null
  largest_cluster_pct: number | null
}

export interface ModelMetricsResponse {
  model: string
  selected_k: number
  best_silhouette_k: number
  evaluation: EvaluationRow[]
  notes: string[]
}

export interface ClusterProfile {
  cluster_id: number
  cluster_rank: number
  cluster_name: string
  cluster_color: string
  description: string
  cells: number
  percentage: number
  mean_aod: number | null
  std_aod: number | null
  high_aod_percentage: number | null
  median_valid_days: number | null
  mean_coverage_fraction: number | null
  winter_mean: number | null
  premonsoon_mean: number | null
  monsoon_mean: number | null
  postmonsoon_mean: number | null
}

export interface ModelProfilesResponse {
  model: string
  cluster_count: number
  profiles: ClusterProfile[]
  notes: string
}

export interface AlgorithmRow {
  model: string
  algorithm: string
  k: number
  silhouette_euclidean: number | null
  silhouette_manhattan: number | null
  davies_bouldin: number | null
  ari_vs_kmeans: number | null
  ami_vs_kmeans: number | null
  smallest_cluster_pct: number | null
  largest_cluster_pct: number | null
}

export interface ModelComparisonsResponse {
  model: string
  algorithms: AlgorithmRow[]
  notes: string
}

export interface RobustnessRow {
  model: string
  seed_mean_ari: number | null
  seed_min_ari: number | null
  feature_removal_ari: number | null
  subsample_mean_ari: number | null
  subsample_min_ari: number | null
}

export interface ModelRobustnessResponse {
  model: string
  summary: RobustnessRow
  notes: string
}

export interface PCACentroid {
  cluster_id: number
  cells: number
  PC1: number
  PC2: number
}

export interface ModelPCAResponse {
  model: string
  explained_variance_ratio: number[]
  total_explained_variance: number
  centroids: PCACentroid[]
  point_type: string
  notes: string
}

export interface AnalyticsStatusResponse {
  models: string[]
  files: Record<string, boolean>
  data_is_live: boolean
  scope: string
}
