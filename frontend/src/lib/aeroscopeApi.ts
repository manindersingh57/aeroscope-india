import type { HotspotFilters, HotspotsCollection, LayerCatalogue, LocationResult } from './mapTypes'
import type { StateProfile, StateSummary, StateComparison } from './regionalTypes'
/**
 * Typed client for the existing AeroScope Flask /api/v1 endpoints.
 * Client environment variables are public: never put secrets or research files here.
 */
export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/v1'
).replace(/\/$/, '')

export type Model = 'model_a' | 'model_b'
export type Health = { status: string; service: string; api_version: string }
export type Capabilities = {
  api_version: string
  research_data_loaded: boolean
  research_results_available: boolean
  grid_points_available: boolean
  historical_data_only: boolean
  documentation: string
}

type ErrorResponse = { error?: { code?: string; message?: string } }

export class AeroScopeHttpError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'AeroScopeHttpError'
    this.status = status
    this.code = code
  }
}

async function read<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'omit',
    signal,
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const body = (payload ?? {}) as ErrorResponse
    throw new AeroScopeHttpError(
      response.status,
      body.error?.code ?? `http_${response.status}`,
      body.error?.message ?? 'AeroScope API unavailable',
    )
  }
  return payload as T
}

async function send<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    credentials: 'omit',
    body: JSON.stringify(body),
    signal,
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const errorBody = (payload ?? {}) as ErrorResponse
    throw new AeroScopeHttpError(
      response.status,
      errorBody.error?.code ?? `http_${response.status}`,
      errorBody.error?.message ?? 'AeroScope API request failed',
    )
  }
  return payload as T
}

// Only health and capabilities are called automatically in the starter UI.
// The other methods are prepared for future authenticated/approved features.
export const aeroscopeApi = {
  health: (signal?: AbortSignal) => read<Health>('/health', signal),
  capabilities: (signal?: AbortSignal) => read<Capabilities>('/capabilities', signal),
  layers: (signal?: AbortSignal) => read<LayerCatalogue>('/map/layers', signal),
  overview: (signal?: AbortSignal) => read<Record<string, unknown>>('/overview', signal),
  location: (lat: number, lon: number, signal?: AbortSignal) => {
    const q = new URLSearchParams({lat: String(lat), lon: String(lon)})
    return read<LocationResult>(`/location?${q}`, signal)
  },
  modelMetrics: (model: Model, signal?: AbortSignal) =>
    read<Record<string, unknown>>(`/models/${model}/metrics`, signal),
  modelPCA: (model: Model, signal?: AbortSignal) =>
    read<Record<string, unknown>>(`/models/${model}/pca`, signal),
  states: (signal?: AbortSignal) => read<string[]>('/states', signal),
  stateSummaries: (signal?: AbortSignal) => read<StateSummary[]>('/state-summaries', signal),
  stateProfile: (name: string, signal?: AbortSignal) =>
    read<StateProfile>(`/states/${encodeURIComponent(name)}`, signal),
  compareStates: (states: string[], signal?: AbortSignal) =>
    send<StateComparison>('/compare/states', { states }, signal),
  hotspotCenters: (model: Model, filters: HotspotFilters = {}, signal?: AbortSignal) => {
    const q = new URLSearchParams({
      limit: String(filters.limit ?? 200),
      offset: String(filters.offset ?? 0),
      min_cells: String(filters.minCells ?? 1),
    })
    if (filters.state) q.set('state', filters.state)
    if (filters.clusterName) q.set('cluster_name', filters.clusterName)
    return read<HotspotsCollection>(`/map/hotspots/${model}?${q}`, signal)
  },
}
