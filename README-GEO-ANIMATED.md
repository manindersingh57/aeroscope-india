# AeroScope India — Geo Explorer proportion and animation update

This is a **small overlay patch for the previously installed Three-Map Geo Explorer** (`aeroscope-geo-explorer-three-maps.zip`). It is not a full project or replacement for the Flask backend.

## Changes

- **Narrower map workspace:** sets the desktop workspace maximum width to 1215px and slightly expands the left controls to up to 335px. The right map automatically uses the remainder. At tablet/mobile sizes the map still stacks responsively.
- **Shorter map card:** reduces the viewport height from the previous large view to 485–615px at desktop (and scales down at smaller sizes).
- **Actual map-layer transition:** a 0.75-second soft sweep and grid fade appear when switching Mean AOD / Model A / Model B **after private grid data has been loaded**. The colors and locations still come only from your verified imported local data.
- **Location selection:** adds a subtle pulsing ring to the selected point.
- **State statistics:** shows shimmer placeholders only during the real API request, then smoothly reveals the verified values.
- **Location inspector:** displays a small fetching indicator while Flask is retrieving actual point details; results smoothly appear.
- **Reduced motion:** CSS respects `prefers-reduced-motion` and keeps all information readable without animation.

## Modified files (only three)

- `frontend/src/pages/ExploreIndia.tsx`
- `frontend/src/components/GeoExplorerMap.tsx`
- `frontend/src/styles/aeroscope-geo.css`

No changes to Overview, ML Laboratory, Cluster Insights, Methodology, backend, API contracts, existing scientific maps or data exporters. No npm package installation is required.

## Apply on Windows PowerShell

1. From the project root, save work or commit your current `claude-redesign` branch first. Do not use `main`.
2. Download `aeroscope-geo-explorer-map-animations.zip` to Downloads.
3. Run:

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
git branch --show-current
git status
Expand-Archive -Path "$HOME\Downloads\aeroscope-geo-explorer-map-animations.zip" -DestinationPath . -Force
cd frontend
npm run build
npm run dev
```

Open the URL printed by Vite and visit `/explore`. You can use the existing **Load local research grid** control to load the private file created by the earlier exporter.

## Quick smoke test

- Check that the three left cards and the map have comfortable proportions on desktop.
- Load your private JSON research grid. Switch between the three layers and observe the short **visual transition**, not a substitute for real data.
- Focus on a state and watch the map fly to it; when the local API is available, the state statistics show loading and then results.
- Click a location and check the new animated marker and location inspector.
- Check mobile layout and verify map zoom, state clicks and button controls still work.

## Privacy note

The JSON import remains local in browser memory. **Do not upload the exported satellite-derived JSON, raw GeoTIFFs or private Parquet data to GitHub/Vercel/Render** without permission. The public site can show state boundaries and metadata when private results are restricted.

**Verification:** Source files have been syntax-checked; a full npm/Vite build must be performed locally against your own repository.
