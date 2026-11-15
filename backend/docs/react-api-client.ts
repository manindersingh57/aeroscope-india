/** AeroScope API helper for a Vite/React application.
 *  Copy into frontend/src/lib/aeroscopeApi.ts when building the frontend.
 *  No JWT, API secret, or research dataset belongs in Vite environment variables.
 */
const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

export type Model = 'model_a' | 'model_b';
export type ApiError = { error?: { code?: string; message?: string } };
export type Capabilities = {
  api_version: string;
  research_data_loaded: boolean;
  research_results_available: boolean;
  grid_points_available: boolean;
  historical_data_only: boolean;
  documentation: string;
};

export class AeroScopeHttpError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'AeroScopeHttpError';
  }
}

async function read<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
    credentials: 'omit',
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const body = (payload || {}) as ApiError;
    throw new AeroScopeHttpError(response.status,
      body.error?.code || `http_${response.status}`,
      body.error?.message || 'AeroScope API temporarily unavailable');
  }
  return payload as T;
}

export const aeroscopeApi = {
  capabilities: (signal?: AbortSignal) => read<Capabilities>('/capabilities', signal),
  layers: (signal?: AbortSignal) => read<Record<string, unknown>>('/map/layers', signal),
  overview: (signal?: AbortSignal) => read<Record<string, unknown>>('/overview', signal),
  location: (lat: number, lon: number, signal?: AbortSignal) => {
    const q = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    return read<Record<string, unknown>>(`/location?${q}`, signal);
  },
  modelMetrics: (model: Model, signal?: AbortSignal) =>
    read<Record<string, unknown>>(`/models/${model}/metrics`, signal),
  modelPCA: (model: Model, signal?: AbortSignal) =>
    read<Record<string, unknown>>(`/models/${model}/pca`, signal),
  hotspotCenters: (model: Model, limit = 50, offset = 0, signal?: AbortSignal) => {
    const q = new URLSearchParams({limit: String(limit), offset: String(offset)});
    return read<Record<string, unknown>>(`/map/hotspots/${model}?${q}`, signal);
  },
};
