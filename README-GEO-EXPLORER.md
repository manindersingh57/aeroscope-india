# AeroScope India · Geo Explorer | Three scientific maps

## What this package changes

This is an **overlay patch**, not a standalone project.

- **Replace** `frontend/src/pages/ExploreIndia.tsx`.
- **Create** `frontend/src/components/GeoExplorerMap.tsx`.
- **Create** `frontend/src/styles/aeroscope-geo.css`.
- **Create** `tools/export_geoexplorer_local.py`.
- No change to Flask APIs, `frontend/src/App.tsx`, the Overview, ML Lab, Cluster Insights, Methodology, your Git branch, or your deployment configuration.
- The page imports its CSS directly, so **do not add an import to `index.css`**.

## Design

The reference-inspired premium light dashboard has **exactly three compact left-hand cards**:
1. Layer selection: `Mean AOD`, `Model A (K=4)`, `Model B (K=5)`.
2. State search and state-level historical statistics (if permitted by Flask).
3. Legend and **private local grid loader**.

The main area is one large interactive Leaflet map of India, with state hover/click/zoom and an inspection strip. It deliberately uses a quiet **vector state-silhouette map without external basemap tiles**, which keeps the scientific raster/cluster colors legible and avoids off-centre Afghanistan/Iran map screenshots. State boundaries come from `frontend/public/data/india-states.geojson`.

## Why there's a local import step

The existing Flask API provides **hotspot centre points**, state profiles, and individual location profiles, but **does not expose the complete geospatial grid needed to faithfully recreate all three maps**. Only the real processed file `backend/data/india_grid_features.parquet` has the values for all 3 layers:

| Layer | Existing parquet columns used |
| --- | --- |
| Mean AOD | `latitude`, `longitude`, `mean_aod` |
| Model A (K=4) | `model_a_available`, `model_a_cluster_rank` |
| Model B (K=5) | `model_b_available`, `model_b_cluster_rank` |

### One-time private data export (run on your own computer)

1. Start VS Code PowerShell in the **project root** (the folder containing `backend` and `frontend`).
2. Make sure the backend virtual environment is activated, which in your current setup is `backend/.venv`:

```powershell
.\backend\.venv\Scripts\Activate.ps1
```

3. Run:

```powershell
python tools/export_geoexplorer_local.py
```

It reads `backend/data/india_grid_features.parquet` and creates:

```text
C:\Users\ACER\Downloads\aeroscope-local-geolayers.json
```

The file is **outside the Git repository by default**. It is derived from your restricted satellite research and **must not be uploaded to GitHub, Vercel, or a public site without confirming data licensing and redistribution permission**.

4. With Flask and Vite running locally, open `http://localhost:5173/explore`.
5. Click **Load local research grid** in the third sidebar card and choose `aeroscope-local-geolayers.json` from Downloads.
6. Now select **Mean AOD**, **Model A** or **Model B**. The map repaints using the corresponding original data values, in the correct geographic cells.

No research rows are sent to an external server by this import feature. The loaded file stays in browser memory and disappears after a page reload. Your local Flask API is used for state/cell inspection when research data is available.

If the import fails, ensure `backend/data/india_grid_features.parquet` was imported into the local Flask backend. Use your original backend setup instructions. The exporter uses pandas and a Parquet engine already needed by your Flask project.

### Important scientific limitations

- Mean AOD is **historical column-integrated aerosol optical depth**, not real-time AQI, PM2.5 or a health-risk map.
- Model A and Model B represent **cluster memberships**, not actual numeric pollution concentration.
- Grey cells on the cluster maps represent **insufficient/missing eligible data**, not clean air.
- AOD gradient cutoffs are **visualization scaling points, not public-health thresholds**.
- State means are grid-cell summaries; there is no population exposure inference.
- The standalone PNG images from your notebook **cannot** supply exact hoverable geospatial values by themselves; this patch instead uses the real processed grid.

## Apply patch

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
git branch --show-current
git status
# Save any uncommitted edits you want to keep BEFORE -Force extraction.
Expand-Archive -Path "$HOME\Downloads\aeroscope-geo-explorer-three-maps.zip" -DestinationPath . -Force
cd frontend
npm run build
npm run dev
```

The branch should be `claude-redesign`. Do not modify `main` or deploy this private data to production. The frontend code itself is safe to commit, but the private JSON file must remain outside the repo.

## Local smoke test

- `http://localhost:5173/explore` renders a **centered India silhouette** and shows three selectable layer buttons.
- The page does not overlap the existing sidebar or top header.
- The map focuses and highlights a state selected by search or clicking a state polygon.
- The JSON file import displays the original mean AOD field and both cluster maps.
- Clicking the map shows the nearest available imported local grid-cell metrics; your local Flask server additionally supplies validated location and state results.
- If the backend research data isn't loaded or results are restricted, the interactive boundaries and local-file import still work; no fabricated data is displayed.
- `npm run build` passes (must be tested on your laptop; only static syntax/import checks were possible during patch generation).

## Dependencies

Uses the dependencies from your existing AeroScope frontend: React, React Router, Leaflet, geojson types, Lucide React, Tailwind/Vite. **No new npm dependencies.**
