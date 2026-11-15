# AeroScope India — React API Integration Contract

## API origin

Set `VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1` locally. In production use the actual HTTPS Render backend domain. Do **not** store research datasets or secret keys in Vite environment variables.

`GET /api/v1/openapi.json` provides the machine-readable OpenAPI specification. `GET /api/v1/capabilities` describes available services without disclosing measurements.

## Typed client example

```ts
const base = import.meta.env.VITE_API_BASE_URL;

export async function getAeroScope<T>(path: string): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const code = payload?.error?.code ?? `http_${response.status}`;
    const message = payload?.error?.message ?? 'AeroScope API unavailable';
    throw new Error(`${code}: ${message}`);
  }
  return payload as T;
}

// Example: use the returned metadata to populate the model switcher.
const layers = await getAeroScope('/map/layers');
```

## Map and analytics notes

- `/map/hotspots/model_a` is a GeoJSON FeatureCollection of **hotspot region centres**, not exact hotspot polygons.
- `/map/grid` returns grid-centre points, not tiles or true raster geometry; disabled unless explicitly approved.
- `/models/model_a/pca` returns cluster centroids in PCA space, not a dense PCA scatterplot.
- `/models/model_a/metrics` returns precomputed K-Means evaluation summaries, not newly trained results.
- Model A and Model B metrics are from different feature spaces: never compare WCSS across them.

## Error states to handle in React

| HTTP | Meaning | UX recommendation |
| --- | --- | --- |
| 200 | Success | Render result |
| 400 | Invalid input | Show validation message |
| 403 | Data release disabled | Display research access limitation; do not retry automatically |
| 404 | Unknown route/region | Show not found state |
| 503 | Research files not installed | Show unavailable state and retry action |

## Security and privacy

Production must set `AEROSCOPE_ENV=production`, `AEROSCOPE_PUBLIC_RESULTS_ENABLED=false`, and `AEROSCOPE_ENABLE_GRID_API=false` until appropriate permissions are confirmed. Never add MOSDAC-derived datasets to public Git. CORS is not an access-control substitute; the Flask server enforces release policy.

## Data validity

Historical observations cover 2022-08-23 to 2024-06-05. Outputs are not real-time AQI, direct PM2.5 measurements, health advice, or predicted pollution levels.
