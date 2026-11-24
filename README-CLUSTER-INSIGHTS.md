# AeroScope India | Cluster Insights Visual Redesign

Frontend-only enhancement inspired by the same premium, light dashboard design used for the Overview and ML Laboratory.

## Applies to

Use **after** `aeroscope-reference-light-dashboard.zip`. The project must already have:
- `frontend/src/components/IndiaFeaturedMap.tsx` (from the light Overview update)
- Existing `frontend/src/pages/CompareRegions.tsx` and `HotspotExplorer.tsx`
- Existing `frontend/src/lib/aeroscopeApi.ts` and source types
- `react`, `react-router-dom`, `recharts`, `lucide-react`, and `leaflet`
- `frontend/public/data/india-states.geojson` for rendering Indian state boundaries

**This ZIP replaces only:**
- `frontend/src/pages/ClusterInsights.tsx`

**And creates:**
- `frontend/src/styles/aeroscope-insights.css`

The page imports its own stylesheet, so no edit to `index.css` is required. No Flask/backend files are changed.

## Visual modules

1. Four API-driven KPI cards (cluster count, model cells, connected regions, state summaries)
2. Selectable cluster-proportion SVG doughnut
3. India atlas with true state polygons, selected-state feedback, real permitted hotspot centres
4. Mean AOD by cluster (horizontal bar chart)
5. State/UT historical mean AOD ranking (horizontal bar chart)
6. Seasonal cluster AOD patterns (line chart)
7. Largest connected hotspot regions (bar chart)
8. Preserved original regional comparison and hotspot explorer as tabbed detailed workspaces

All visualizations use actual existing Flask API data. The public/unauthorised version shows explicit restricted/unavailable states and does NOT invent measurements.

## Apply in VS Code (PowerShell)

1. Save any uncommitted work first. Ensure you are on `claude-redesign` and the light Overview and lab update are installed.

   ```powershell
   cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
   git branch --show-current
   git status
   ```

2. If you want an extra undo checkpoint, commit the existing working frontend changes on `claude-redesign` after checking that no private datasets, passwords or `.env` files are staged.

3. Download `aeroscope-premium-cluster-insights.zip` to Downloads and extract it at the project **root**:

   ```powershell
   Expand-Archive -Path "$HOME\Downloads\aeroscope-premium-cluster-insights.zip" -DestinationPath . -Force
   ```

4. Build:

   ```powershell
   cd frontend
   npm run build
   npm run dev
   ```

5. Open http://localhost:5173/cluster-insights . The overview model switcher is in the page header, and the detail views have their own controls. Your Flask backend must be running for real scientific charts.

6. Check `/cluster-insights?model=model_b` and `/cluster-insights?tab=hotspots`. Existing `/compare` and `/hotspots` redirects remain defined in `App.tsx` from the light Overview patch.

## Important limitations

- The preview HTML/PNG in the ZIP is a **visual layout concept only**, with illustrative chart shapes. It is not a render of the API-backed React page. The production React component contains no fake result data.
- State ranking is by mean AOD of available state summaries, not ground-level PM2.5 concentration, AQI, or a measure of health risk. Coverage varies by state.
- Counts of mapped centres may be limited to the first 200 results for visual performance. The full hotspot explorer retains the pagination/filtering from the earlier implementation.
- On a public restricted-data backend, the map may show India boundaries but no research centres, and other charts display accurate empty states.
- The Overview `IndiaFeaturedMap` requires `frontend/public/data/india-states.geojson`. If missing, run `python tools/fetch_india_states.py` from the repository root (if that tool is present).
- The additional charts make concurrent calls to existing `stateSummaries`, `modelProfiles`, `hotspotSummary`, `hotspotRegions`, `hotspotCenters`, and `layers` endpoints only when research data is permitted; `capabilities` is checked first.
- The model toggle on the new summary dashboard is URL-synced. The preserved original detailed workspaces maintain their own model selection controls to avoid changing or risking their existing behavior.

## Build validation

The generated TSX passed TypeScript syntactic transpilation and the referenced local import paths were checked against the existing source. An end-to-end `npm run build` against your exact installed project has **not** been performed in this environment; please run it locally as above.
