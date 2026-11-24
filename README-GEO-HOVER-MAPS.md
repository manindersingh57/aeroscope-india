# AeroScope India — Geo Explorer, state hover + five map modes

This is an **overlay patch** for the existing local three-map Geo Explorer. It changes only:

- `frontend/src/pages/ExploreIndia.tsx`
- `frontend/src/components/GeoExplorerMap.tsx`
- `frontend/src/styles/aeroscope-geo.css`

It does not alter the Flask backend, API client, Overview, ML Laboratory, Cluster Insights, Methodology, or datasets. No new npm packages are required beyond your existing frontend dependencies.

## What changed

1. **Map card is narrower, not shorter.** Desktop workspace width is 1280px, with a 405–465px left column for the three control/detail cards and the remaining width for the map. Map canvas height is restored to 650px on desktop. The full page remains scrollable.
2. **State hover is functional.** Hovering a state highlights its boundary and opens a movable Leaflet tooltip plus a compact map overlay showing the state name, historical mean AOD, and valid coverage percentage (if available from Flask) or valid grid-cell count. Clicking a state selects it and zooms there.
3. **Five map modes.** AOD Heatmap (visually smoothed rendering of the real mean-AOD cells), State AOD (choropleth based on real state mean AOD), Detailed Grid (original unblurred AOD grid), Model A (K=4), Model B (K=5).
4. **No fabricated data.** When local private grid or permitted API state summaries are unavailable, the map shows boundaries and a clear notice, not invented AOD colors or values. This is **historical AOD**, not live AQI or surface PM2.5.
5. **Animation.** The existing scientific layer reveal, location highlight, loading skeletons and reduced-motion support are preserved. Hover highlighting is subtle and smooth.

The State AOD layer first tries permitted Flask `stateSummaries()` data and falls back to the **unweighted average of valid historical grid-cell mean AOD** in the imported private local grid. The two sources may differ in sample coverage; the displayed value is historical satellite AOD, never health or regulatory AQI.

## Install on Windows PowerShell

Start at your existing repository root:

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
git branch --show-current
git status
```

Ensure you are on `claude-redesign`, not `main`. Commit or stash any uncommitted changes that you want to preserve *before* extracting, since the patch overwrites the three files above.

Download the ZIP to Downloads and extract:

```powershell
Expand-Archive -Path "$HOME\Downloads\aeroscope-geo-explorer-state-hover.zip" -DestinationPath . -Force
cd frontend
npm run build
npm run dev
```

Visit `http://localhost:5173/explore`.

## Research data loader

For all detailed map layers, use your existing **private local grid JSON** produced by:

```powershell
# Run from repository root, after activating the backend's .venv
python tools/export_geoexplorer_local.py
```

The output should be `Downloads\aeroscope-local-geolayers.json`, outside Git. In Geo Explorer choose **Load local research grid**. Keep this JSON and other satellite-derived products private until redistribution permissions are established. The initial layer is **AOD Heatmap**.

## Quick checks

- At desktop width, the left detail cards are visibly wider and the map is slightly narrower, while its canvas stays tall.
- Hover any state: boundary becomes teal and a card **inside the map** shows its details. Before loading any research results, it should say the AOD is unavailable.
- Choose **State AOD Map**: states are shaded by real mean AOD only after permitted results or local research grid are available.
- Switch to **AOD Heatmap**, **Detailed Grid**, **Model A** and **Model B** and verify the real imported cell raster colors.
- Search for Punjab and select it: the map zooms to Punjab and state statistics appear in the left panel.
- Click a point: the lower Location Intelligence card shows nearest available historical AOD data.
- Check smaller screens, zoom controls, and browser console errors.

**Validation:** Source TSX files passed TypeScript syntax transpilation; CSS parsed without top-level errors. Full Vite `npm run build` is not executable against your private project here, so it must be run locally before committing or deploying.
