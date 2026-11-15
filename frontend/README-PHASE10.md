# AeroScope India | Phase 10 Interactive India Atlas

## Scope
This is a **frontend-only overlay** for your existing Phase 9 Vite + React + TypeScript + Tailwind app. The Flask backend is unchanged. It preserves the original homepage and adds an `/explore` route.

### Implemented
- MapLibre GL JS basemap with India centred initially
- Model A/B switching and notebook-grounded cluster legends from `/api/v1/map/layers`
- Hotspot **centre** GeoJSON markers from `/api/v1/map/hotspots/{model}` with state, cluster and minimum-grid-cell filters, plus paginated loading
- Map-click and manual coordinate lookup through `/api/v1/location`
- State, historical AOD and coverage information displayed in the location panel
- Error/empty/loading states and a research-results restricted state (honours `/api/v1/capabilities`)
- Homepage navigation to `/explore`

## Install on Windows (PowerShell)
From the *real* AeroScope repository root containing `backend/` and `frontend/`:

```powershell
# Stop Vite first (Ctrl+C), then unzip the phase10 ZIP at repository root
Expand-Archive -Path "$HOME\Downloads\aeroscope-phase10-india-atlas.zip" -DestinationPath . -Force

cd frontend
npm install react-router-dom maplibre-gl lucide-react
npm run build
npm run dev
```

Open `http://localhost:5173/explore`.

If you have never configured the frontend API base URL, create `frontend/.env.local`:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1
```

For basemap styling, you can optionally specify:

```env
VITE_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

This defaults to MapLibre's public demonstration tiles. Use an appropriately licensed and capacity-rated tiles provider before public launch.

In another terminal at `backend/`, run Flask:

```powershell
.\.venv\Scripts\Activate.ps1
$env:AEROSCOPE_ENV="development"
python -m flask --app wsgi run --debug
```

Do not set `AEROSCOPE_PUBLIC_RESULTS_ENABLED=true` on public servers until derived-data publication rights have been verified. This map does not enable `/map/grid`, and it never downloads raw GeoTIFFs.

## Test steps
1. `npm run build` should complete without TypeScript errors.
2. `/` retains the Phase 9 connection check; its button opens `/explore`.
3. `/explore` initially shows the basemap and Model A legend; Model B changes the legend.
4. With local research data installed and permitted, hotspot-centre markers load. Clicking a marker shows a region summary.
5. Enter `30.901` and `75.857` as coordinates or click on the map; the location card loads the nearest study grid cell.
6. Apply `Punjab` as the state filter and try minimum grid-cell count options.
7. If results are disabled, only the map and metadata remain visible; a prominent notice explains the restriction.
8. When Flask stops, connection errors are shown rather than fabricated analytics.

## Known limitations
- The map shows **centres of historical connected aerosol regions**, *not* exact boundaries, a full AOD heatmap or real-time AQI.
- Results are sampled from the backend's precomputed science package (Aug 2022 to Jun 2024).
- The hotspot API permits up to 500 markers per page. The UI loads 200 at a time. Use filters for less clutter.
- The map basemap requires an Internet connection and displays attribution from the provider.
- AOD is not equivalent to PM2.5 or AQI. Cluster separation does not represent calibrated probability.
- MOSDAC research use and redistribution permissions must be resolved before a public data-driven release.

## Git safety
Only commit source code and documentation, plus project dependency manifests. Never push `backend/data/`, private Parquet files, raw GeoTIFFs, `.env`, or other restricted research exports.
