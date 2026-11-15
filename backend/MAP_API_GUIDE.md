# AeroScope India | Map API Extension

## What was added

- `GET /api/v1/map/layers`: notebook-grounded Model A/B legends, cluster colors, descriptions, and availability flags. Works even when real-data files have not been installed.
- `GET /api/v1/map/hotspots/model_a?limit=100&offset=0`: point-geometry GeoJSON for **centres** of precomputed connected regions; accepts `state`, `cluster_name`, `min_cells`, `min_mean_aod`, `limit`, `offset`. Model B also works.
- Production data policy safeguard: existing research-result endpoints and the new map hotspots endpoint are disabled by default when `AEROSCOPE_ENV=production`. **Do not enable publicly without a data-policy decision.**

`/api/v1/map/grid` already existed in the original starter and remains separately disabled by default (`AEROSCOPE_ENABLE_GRID_API=false`). It is NOT a raster layer or a polygon map.

## Commands (Windows PowerShell, in backend/)

```powershell
python -m pytest -v
flask --app wsgi run --debug
```

Try:

- `http://127.0.0.1:5000/api/v1/map/layers`
- `http://127.0.0.1:5000/api/v1/map/hotspots/model_a?limit=5`
- `http://127.0.0.1:5000/api/v1/map/hotspots/model_b?state=Punjab&limit=5`

## Public release settings

```env
AEROSCOPE_ENV=production
AEROSCOPE_PUBLIC_RESULTS_ENABLED=false
AEROSCOPE_ENABLE_GRID_API=false
```

Do not put research data in a public Git repository. Those flags are server-side access controls, **not legal permission**, and must not be treated as a substitute for a review of MOSDAC terms. Configure exact HTTPS CORS origins when in production.

## Frontend example

```js
const API = import.meta.env.VITE_API_BASE_URL;
const [layers, hotspots] = await Promise.all([
  fetch(`${API}/map/layers`).then(r => r.json()),
  fetch(`${API}/map/hotspots/model_a?limit=100`).then(async r => {
    if (!r.ok) throw new Error(`Hotspots HTTP ${r.status}`);
    return r.json();
  })
]);
// Pass hotspots (a FeatureCollection) to MapLibre's GeoJSON source.
// Use layers.layers.model_a.clusters for legend swatches.
```

## Geometry limitation

The `properties.bounds` of each hotspot feature are the **min/max coordinate bounding box**, not the connected region's polygon geometry. Do not draw the rectangle as if it were the actual hotspot footprint.
