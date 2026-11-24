# AeroScope India | Phase 12: Historical Hotspot Explorer

This is a **frontend-only overlay** for the Phase 11 React frontend. It does not modify Flask model engines or data.

## Changes included

- `frontend/src/pages/HotspotExplorer.tsx`: model switching, state/cluster/size/AOD filters, paginated results, region-detail inspection, safe restricted-data state.
- `frontend/src/lib/hotspotTypes.ts`: response types matching the notebook-derived Flask hotspot service.
- `frontend/src/lib/aeroscopeApi.ts`: typed calls to `/hotspots/{model}`, `/hotspots/{model}/summary`, and `/hotspots/{model}/{id}`.
- `frontend/src/App.tsx`: `/hotspots` route.
- `frontend/src/pages/Home.tsx`, `ExploreIndia.tsx`, `CompareRegions.tsx`: navigation links.

## Install from your existing project root (Windows PowerShell)

1. Download `aeroscope-phase12-hotspot-explorer.zip` into your Downloads directory.
2. Stop the React dev server (`Ctrl+C`).
3. Run:

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
Expand-Archive -Path "$HOME\Downloads\aeroscope-phase12-hotspot-explorer.zip" -DestinationPath . -Force
cd frontend
npm run build
npm run dev
```

4. Open `http://localhost:5173/hotspots` while Flask is running locally at `http://127.0.0.1:5000` with your approved research files present.

## Tests to perform

- Switch Model A to Model B and confirm legend and available regions change.
- Filter by a state, cluster name, minimum grid-cell count, and historical mean AOD.
- Select a region and verify centre coordinates, size, median valid days and AOD are shown.
- Page through results and clear filters.
- With Render's public data safeguards enabled, the page should explain that results are restricted, rather than displaying fabricated values.
- Check navigation to `/`, `/explore`, `/compare`, and direct loading of `/hotspots` on Vercel (the React router rewrite must be configured).

## Publish to your existing Vercel site

After a successful local build:

```powershell
cd ..
git status
git add frontend/src/App.tsx frontend/src/lib/aeroscopeApi.ts frontend/src/lib/hotspotTypes.ts frontend/src/pages/HotspotExplorer.tsx frontend/src/pages/Home.tsx frontend/src/pages/ExploreIndia.tsx frontend/src/pages/CompareRegions.tsx
git diff --cached --name-only
git commit -m "Add historical Hotspot Explorer page"
git push origin main
```

The same Vercel production URL is retained when the project is automatically redeployed from `main`.

## Data publication / interpretation

- The public Render backend currently reports no installed research dataset and publicly restricted research results. This page **will not** show actual hotspot results on the public website in that configuration, by design.
- Do not upload original MOSDAC GeoTIFF/HDF products, private processed grid files, or restricted data via GitHub/Vercel to populate this page.
- Region centres are not precise region shapes or emissions sources. Grid-cell counts are not land area or affected population. Historical AOD does not equal live AQI or ground-level PM2.5.

## Verification status

Source files passed a TypeScript transpilation syntax check; a full `npm run build` could not be executed in the packaging environment because npm package downloads were unavailable. Test in the existing local frontend with its installed dependencies.
