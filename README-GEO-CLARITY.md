# AeroScope India — Geo Explorer map clarity fix

Fixes:
- AOD Heatmap now uses actual data-driven P10/P50/P90 scaling and a smooth Canvas blur masked to genuine valid cells. These colors show relative historical intensity, NOT AQI thresholds.
- Detailed Grid retains the original absolute-AOD color scale and crisp individual cells.
- State map uses a **relative range of observed state mean AOD** (P10–P90) and displays actual state AOD on hover.
- K=4/K=5 maps preserve real class assignments and missing data instead of inventing values.
- Removes the second overlapping Leaflet tooltip; fixes `Ker... Tamil Nadu...` text stacking.
- Standardizes known India state/UT display spellings, including Tamil Nadu, Maharashtra, Odisha, Jammu and Kashmir.
- Slight grid tile overlaps remove 1-pixel canvas seams; scientific missing-data holes remain visible.
- Layout dimensions and other pages unchanged. No backend changes.

## Install

1. Save/commit local changes; verify `git branch --show-current` is `claude-redesign`.
2. Download the ZIP to `C:\Users\ACER\Downloads`.
3. At AeroScope project root, run:

```powershell
Expand-Archive -Path "$HOME\Downloads\aeroscope-geo-explorer-map-clarity.zip" -DestinationPath . -Force
cd frontend
npm run build
npm run dev
```

4. Open `http://localhost:5173/explore`, load your same private `aeroscope-local-geolayers.json`, and switch map layers.

## Scientific caveat

The smoothing and percentile color scaling are **visual representations** of the same measured mean AOD values, not new or interpolated observations or new model predictions. Grey areas mean data unavailable/insufficient or no eligible class. Do not interpret grey as clean air. This update cannot correct missing source GeoTIFF coverage, geographical boundary errors in GeoJSON, or mislabeled source data. Model classes should be verified against your notebook.

## Compatibility

This ZIP is built on `aeroscope-geo-explorer-state-hover.zip` and supersedes its three Geo Explorer files only. No additional npm dependencies. Run the full Vite build on your laptop; this runtime has not built against your exact latest local working tree.
