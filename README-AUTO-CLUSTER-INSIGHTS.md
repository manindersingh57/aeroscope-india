# AeroScope India: Automatic Backend PCA Scatter + Correct Page Placement

This update fixes two issues:
1. The browser should **not** ask for `final_model_a_clusters.csv` and `final_model_b_clusters.csv` on every visit.
2. Full PCA cluster scatter plots belong in **Cluster Insights**. ML Laboratory retains the K-selection and validation charts.

## What changes

- `frontend/src/components/ClusterScatterGallery.tsx`: replaces browser CSV import with automatic Flask fetch.
- `frontend/src/styles/aeroscope-cluster-scatter.css`: keeps the existing premium visuals.
- `backend/app/pca_scatter.py`: new, read-only saved PCA CSV reader, with deterministic stratified sampling.
- `tools/apply_auto_cluster_insights.py`: idempotent installer. Moves the scatter section out of ML Laboratory, adds it to Cluster Insights, adds the Flask API route, and adds `backend/data/pca/` to `.gitignore`.

No changes to the clustering algorithms, models, or other routes.

## 1. Apply update, from project root

**Commit or back up first**. Confirm `git branch --show-current` returns `claude-redesign`.

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
Expand-Archive -Path "$HOME\Downloads\aeroscope-cluster-insights-backend-auto.zip" -DestinationPath . -Force
python tools\apply_auto_cluster_insights.py
```

The installer saves original pages and route file in
`$HOME\Downloads\aeroscope-backend-pca-backups\`.

## 2. Copy the TWO PRIVATE notebook exports once

Use the files from notebook **Chunk 21A** (after it ran), located in Colab at:

- `INSAT3D_AOD_Project/enhanced/data/features/final_model_a_clusters.csv`
- `INSAT3D_AOD_Project/enhanced/data/features/final_model_b_clusters.csv`

Download them from Google Drive to the computer, then:

```powershell
New-Item -ItemType Directory -Force ".\backend\data\pca" | Out-Null
Copy-Item "$HOME\Downloads\final_model_a_clusters.csv" ".\backend\data\pca\" -Force
Copy-Item "$HOME\Downloads\final_model_b_clusters.csv" ".\backend\data\pca\" -Force
```

**Do not** put private research CSVs in `frontend/public/`, GitHub, Render, or Vercel. The new `.gitignore` excludes the local data folder. Check `git status` before pushing.

## 3. Run Flask and Vite

Backend terminal:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m flask --app wsgi run --debug
```

Check these local endpoints after copying the CSVs:

- `http://127.0.0.1:5000/api/v1/models/model_a/pca-points`
- `http://127.0.0.1:5000/api/v1/models/model_b/pca-points`

Frontend terminal, from project root:
```powershell
cd frontend
npm run build
npm run dev
```

Ensure `frontend/.env.local` contains:

`VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1`

Open `http://localhost:5173/cluster-insights`.

## Expected results

**ML Laboratory**: K=2–8 model selection curves (WCSS, Silhouette, Davies–Bouldin, Calinski–Harabasz), model comparisons, stability and PCA centroids as appropriate.

**Cluster Insights**: Model A K=4 full PCA scatter and Model B K=5 full PCA scatter, cluster shares, region patterns, hotspot atlas and state comparisons.

All scatter points are actual saved notebook PCA coordinates. The API returns at most 1,100 uniform sampled points per cluster for drawing, while counts and percentages use every valid row.

## Backend privacy and scientific caveats

The new route is explicitly blocked when `ENVIRONMENT=production` and `PUBLIC_RESULTS_ENABLED` is false. Your public deployment must stay protected until you have satellite-derived-data redistribution permission.

The full PCA scatter is distinct from the centroid-only `/api/v1/models/<model>/pca` endpoint. PCA dimensions are not geographic latitude/longitude and are not directly comparable across Model A and Model B.

## Troubleshooting

- **HTTP 404:** Apply the installer and restart Flask.
- **HTTP 503:** Check private CSV filenames and `backend/data/pca/`; CSVs must contain `PC1`, `PC2`, `cluster_rank`.
- **HTTP 403:** Public deployment restriction is working. Test with local Flask.
- **Connection refused:** Start Flask and confirm `.env.local` points to your local API.
- **Old import button remains:** Browser cache or the original component file was not replaced. Restart Vite and hard refresh.

A local integration smoke test checked installer idempotence and counted 4,800/6,000 synthetic cells, correctly sampling 4,400/5,500 PCA dots. TypeScript TSX syntax was checked. Full Vite build in your exact project is still needed.
