# AeroScope India: stable Leaflet map replacement

This replaces ONLY `frontend/src/components/AeroMap.tsx` and adds `AeroMap.css`.

Reason: the app's MapLibre v6 worker is hanging during map initialization, preventing even the basemap from loading. Leaflet uses standard raster tiles and SVG GeoJSON layers without a web worker.

### Installation from project root

1. Stop older Vite terminals. Back up any custom `AeroMap.tsx` edits.
2. Extract this archive in the existing project root (the folder containing `backend/` and `frontend/`).
3. Run:

```powershell
cd frontend
npm install leaflet@^1.9.4 @types/leaflet
npm run build
npm run dev
```

4. Open `http://localhost:5173/explore`. Hard-refresh. Keep local Flask running for research markers.
5. Ensure `frontend/public/data/india-states.geojson` exists; otherwise from the project root run `python tools/fetch_india_states.py`.
6. Only after local validation: commit `frontend/src/components/AeroMap.tsx`, `frontend/src/components/AeroMap.css`, `frontend/package.json`, and `frontend/package-lock.json`; push to GitHub.

### Expected results

- Raster basemap loads without any MapLibre Web Worker.
- Hover a state for a teal highlight; click it to select and zoom.
- Search Punjab -> apply state filter -> map zooms to Punjab.
- Click blank map to analyze coordinates.
- Historical research hotspot centers display as glowing markers from the Flask API locally.
- Public website must still restrict detailed MOSDAC-derived research outputs unless authorized.

### Notes

- `VITE_MAP_STYLE_URL` is ignored by Leaflet. You can leave it in `.env.local` harmlessly or remove it.
- Optional raster tile override: `VITE_RASTER_TILE_URL=https://.../{z}/{x}/{y}.png`.
- Default tiles: OpenStreetMap Standard, suitable for low-volume testing subject to https://operations.osmfoundation.org/policies/tiles/. Keep map attribution and respect OSM's usage policy; use a suitable paid or self-hosted tile provider for sustained production traffic.
- State polygons come from the independent open boundary reference, not INSAT-3D imagery. Historical AOD markers are not real-time AQI.
