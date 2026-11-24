# AeroScope India · Premium Light-Theme ML Laboratory

This is a **frontend-only overlay** for the existing AeroScope India project after the `aeroscope-reference-light-dashboard.zip` Overview update.

## What's included

- `frontend/src/pages/ModelLaboratory.tsx` (REPLACE) — responsive ML Laboratory page with model selection, verified API data, Silhouette/DBI toggle, WCSS, PCA centroids, clickable cluster profile composition, algorithms, robustness and scientific interpretation.
- `frontend/src/styles/aeroscope-lab.css` (NEW) — isolated light-dashboard styles, using the same design language as your Overview.
- `REFERENCE-LAB-PREVIEW.html` — static design/layout illustration. It **does not access your Flask API or contain real model metrics**. Open locally to review the style; the real application uses the TSX component above.

No changes to `App.tsx`, `aeroscopeApi.ts`, your Flask backend, Geo Explorer, home page, or deployment are included.

## Important prerequisites

1. You have already applied the **reference-light Overview update** which provides `AeroLightShell` and the shared background/cards/sidebar styling.
2. Your project already has `recharts`, `lucide-react`, `react-router-dom`, React, Vite and Tailwind (as it did in Phase 13).
3. You are on `claude-redesign` and have saved any work you want to keep.
4. Existing `frontend/src/lib/modelTypes.ts` and `frontend/src/lib/aeroscopeApi.ts` are unchanged from the working AeroScope backend integration.

## Install (PowerShell, from project root)

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
git branch --show-current
git status
```

Confirm the branch is `claude-redesign` and save any uncommitted modifications that could be overwritten.

```powershell
Expand-Archive -Path "$HOME\Downloads\aeroscope-premium-ml-laboratory.zip" -DestinationPath . -Force
cd frontend
npm run build
npm run dev
```

Open the local Vite URL (typically `http://localhost:5173/models`). No manual CSS import needed: `ModelLaboratory.tsx` imports `../styles/aeroscope-lab.css` directly. No new npm packages are required.

## What to test

- Overview (`/`) and existing page navigation still work.
- `/models` shows the light-theme laboratory without its own duplicate header or sidebar.
- Model A / Model B switches selected model and requests the corresponding Flask results.
- Silhouette / DBI buttons switch the chart using API measurements.
- With local approved research results enabled: check the WCSS, centroid PCA, cluster profile clicks, method table, and robustness cards.
- With restricted public backend: no simulated scores or charts appear, only appropriately labeled unavailable states. Configured K=4 / K=5 remains visible as model metadata.

## Scientific safeguards

- The two models refer to **historical INSAT-3D AOD**. They are not real-time air-quality readings.
- K-Means clustering evaluation and ARI are not predictive accuracy.
- PCA API has **centroids only**, not a scatterplot of every observation.
- The public Render backend may deliberately suppress detailed MOSDAC-derived research results pending redistribution permission. This update respects that restriction.
- Model statistics and cluster labels are derived from the existing API; no new scientific data was introduced.

## Validation notes

The source was syntax-checked using the TypeScript compiler parser and CSS was parsed successfully. A complete `npm run build` could not be executed in this isolated environment because the project's installed frontend dependencies and full lockfile are not available here. Run the build in your own existing project before committing or deploying.

## Safe rollback

Before applying, you can commit or stash the latest working Overview on `claude-redesign`. To undo just this update, revert `frontend/src/pages/ModelLaboratory.tsx` to its saved version and remove `frontend/src/styles/aeroscope-lab.css`. Do not reset `main` or overwrite the original backup.
