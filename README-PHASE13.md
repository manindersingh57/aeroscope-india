# AeroScope India | Phase 13: Model Laboratory

This is an additive frontend update for the **existing AeroScope India React + TypeScript + Tailwind project** after Phase 12. It does not modify Flask, the model, the Colab notebook, training files, or the private dataset.

## What is included

- `frontend/src/pages/ModelLaboratory.tsx`: Responsive research page with Model A/B switching, three separately scaled K-Means charts (Silhouette, Davies–Bouldin, WCSS), final cluster profile cards and distribution chart, PCA cluster-centroid scatter, algorithm comparison, robustness summaries, and clear access/error states.
- `frontend/src/lib/modelTypes.ts`: Types matched to the Flask analytics response schemas.
- `frontend/src/lib/aeroscopeApi.ts`: Adds typed `modelProfiles`, `modelComparisons`, `modelRobustness`, `modelPCA`, `modelMetrics`, and `analyticsStatus` methods. Existing methods are preserved.
- `frontend/src/App.tsx`: Adds `/models` route.
- `frontend/src/pages/{Home,ExploreIndia,CompareRegions,HotspotExplorer}.tsx`: Adds Model Laboratory navigation links.

## Install in VS Code (Windows PowerShell)

From the actual project root, containing `backend/` and `frontend/`:

```powershell
Expand-Archive -Path "$HOME\Downloads\aeroscope-phase13-model-laboratory.zip" -DestinationPath . -Force
cd frontend
npm install recharts lucide-react react-router-dom
npm run build
npm run dev
```

Keep Flask running in a separate terminal:

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend\backend"
.\.venv\Scripts\Activate.ps1
$env:AEROSCOPE_ENV="development"
python -m flask --app wsgi run --debug
```

Open `http://localhost:5173/models`. Confirm Model A and Model B each load; the saved analytics ZIP must already be imported into `backend/data/analytics` for the plots to appear.

### Flask endpoints used

- `GET /api/v1/capabilities`
- `GET /api/v1/models/model_a/metrics` or `model_b`
- `GET /api/v1/models/model_a/profiles` or `model_b`
- `GET /api/v1/models/model_a/pca` or `model_b`
- `GET /api/v1/models/model_a/comparisons` or `model_b`
- `GET /api/v1/models/model_a/robustness` or `model_b`

The page requests `/capabilities` before loading protected results. If research data is not installed or is intentionally restricted, a clear explanation is displayed rather than fictitious charts. If individual analytics files are missing, unaffected sections still render.

## Troubleshooting

- **Backend unavailable:** Keep Flask running on `http://127.0.0.1:5000` and check `frontend/.env.local` has `VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1`. Restart Vite after editing `.env.local`.
- **API 503 / missing analytics:** Re-import the saved compact analytics results ZIP locally: `python -m scripts.import_analytics "$HOME\Downloads\aeroscope_analytics.zip" --overwrite`, inside the backend folder, then restart Flask.
- **Public site shows restricted results:** Expected while Render has `research_data_loaded:false` or `research_results_available:false`. Do not publish restricted MOSDAC-derived datasets merely to fill the charts.
- **Vite build error:** Send the first error with file/line reference; do not disable TypeScript strictness or erase other frontend files.

## Git + deployed website

After a successful `npm run build` and data-safety review:

```powershell
cd ..
git add frontend/src
git diff --cached --name-only
git commit -m "Add Model Laboratory visual analytics"
git push origin main
```

Vercel will redeploy if automatic deployments are enabled. The existing production URL stays the same. The Render API is unchanged.

## Scientific interpretation and privacy

- The dataset is **historical** (23 Aug 2022 to 5 Jun 2024), not live AQI.
- PCA coordinates represent **cluster centroids only**, not grid-cell scatter points or geographic locations.
- WCSS is not directly comparable between Model A and B because their standardized feature spaces differ.
- ARI/AMI here are measures of cluster agreement, **not accuracy** against verified pollution ground truth.
- Keep original and detailed MOSDAC data private until you confirm applicable redistribution permissions. This frontend does not contain raw research measurements.

## Next: Phase 14

Research/methodology page: dataset provenance, feature engineering, clustering validation, limitations, ethics, citation/attribution and responsible-use documentation.
