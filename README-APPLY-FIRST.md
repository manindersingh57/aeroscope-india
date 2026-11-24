# AeroScope India | Reference-inspired Pearl Dashboard (Overview + shared shell)

This is a **frontend source overlay**, NOT a new standalone repository. It is based on the user's existing React + TypeScript + Vite + Tailwind v4 + Leaflet application. No Flask code, protected satellite research data, API endpoints or deployment files are included.

## 0. Keep your original safe
In VS Code PowerShell from your repository root:

```powershell
git status
git branch --show-current
```

Use your existing `claude-redesign` branch, or another new experimental branch. Do NOT apply to `main`. Commit or stash your current Claude Batch 1 edits before overlaying so you can roll back.

## 1. Unzip the overlay
From project root (modify ZIP path as appropriate):

```powershell
Expand-Archive -Path "$HOME\Downloads\aeroscope-reference-light-dashboard.zip" -DestinationPath . -Force
```

The archive root is `frontend/`, so extraction into the repository root will place the files correctly.

## 2. One necessary CSS change
Open `frontend/src/index.css` and add the following line **immediately after** the existing `@import "tailwindcss";` (if present):

```css
@import "./styles/aeroscope-light.css";
```

Do not add a second Tailwind import. This line is needed to load the new scoped dashboard design. Existing CSS remains unchanged and working older pages can retain their styles.

## 3. Map boundaries
The featured India map intentionally uses the local state-boundary GeoJSON as its basemap (not OSM raster tiles). It avoids the former bug where the screenshot displayed Afghanistan rather than India. Ensure this file already exists:

```
frontend/public/data/india-states.geojson
```

If missing, run from project root:

```powershell
python tools/fetch_india_states.py
```

This uses the original project's utility to download an openly licensed historical boundary reference. The data is not official contemporary administrative/cartographic material.

## 4. Build and test

```powershell
cd frontend
npm run build
npm run dev
```

Open the local URL printed by Vite (often `http://localhost:5173`).

Check (a) India-centered map, (b) state hover/click and +/- buttons, (c) satellite visibly floating, (d) Model A/B switch, (e) `/compare` and `/hotspots` redirect to the correct Cluster Insights tab, and (f) existing Geo Explorer/ML/Research functionality.

## Data integrity
- **4,212** files, **643** observation dates, **66,129** feature cells are documented local pipeline-stage counts, not numbers dynamically recomputed by this frontend.
- **Model A K=4** and **Model B K=5** follow the current research configurations.
- Historical hotspot markers and validation charts render only if the Flask capabilities endpoint explicitly reports research results available; no mock AOD scores are generated.
- Publicly restricted data remains withheld. The map still shows historical administrative reference boundaries.
- Decorative INSAT-inspired satellite animation is **not** real-time tracking.

## Scope
The Overview and five-page shell are comprehensively redesigned. The Geo Explorer, Model Laboratory and Research page internals are preserved; they inherit a small amount of scoped round-card visual styling. Cluster Insights combines your existing CompareRegions and HotspotExplorer components with a tab switch. Further detailed restyling can be done after the Overview design is approved.

This package has not been built with your own installed dependencies in your Windows workspace. Please run `npm run build` there and report any errors.
