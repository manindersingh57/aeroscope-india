# AeroScope India | Synchronize updated Colab model

This update is based on your newly uploaded Colab notebook PDF and checks the real saved exports before changing the backend.

## Latest notebook specifications

- 4,212 INSAT-3D GeoTIFF observations, 643 unique days, 27,937 Indian grid cells.
- Model A: K=4, 3 features, 25,465 eligible cells, silhouette 0.3768, DBI 0.8957, 98.43% PCA PC1+PC2 variance.
- Model B: K=5, 6 features including winter/premonsoon/monsoon contrasts, 13,506 eligible cells, silhouette 0.2663, DBI 1.1677, 77.29% PCA PC1+PC2 variance.
- Model A cluster sizes by rank: 7,452 / 10,017 / 6,179 / 1,817.
- Model B cluster sizes by rank: 2,996 / 3,689 / 3,722 / 1,792 / 1,307.
- Best silhouette is still K=2 for both. Selected K values prioritize nuanced interpretation, not maximizing this metric alone.

## Installation

1. Commit or back up work on `claude-redesign`, unzip this update into your project root.
2. In PowerShell at the repository root:

   ```powershell
   python tools\apply_model_revision.py
   ```

3. **Download the new Colab artifacts, not the PDF.** Download your `INSAT3D_AOD_Project/enhanced` folder from Google Drive, including `data/features`, `config`, and `outputs/results`.
4. Run a **dry run** (does not alter backend data):

   ```powershell
   .\backend\.venv\Scripts\Activate.ps1
   python backend\scripts\sync_updated_model.py --source "$HOME\Downloads\enhanced"
   ```

5. Only if it validates, apply the update and backup existing data:

   ```powershell
   python backend\scripts\sync_updated_model.py --source "$HOME\Downloads\enhanced" --apply
   ```

6. If installed, refresh the private map JSON (outside Git):

   ```powershell
   python tools\export_geoexplorer_local.py
   ```

7. Restart Flask **from `backend`**:

   ```powershell
   cd backend
   python -m flask --app wsgi run --debug
   ```

8. In another terminal: `cd frontend; npm run build; npm run dev`. Open `/models`, `/cluster-insights`, `/research`.

## What actually changes

- Existing `backend/data/india_grid_features.parquet` is reconciled by **stable cell_id**, retaining backend-specific columns while refreshing AOD/seasonal features and both model assignments.
- New compact evaluation/profile CSVs replace older private analytics files. Optional new comparison, robustness, PCA and hotspot artifacts are refreshed **only if present**.
- Both model PCA CSVs are copied to `backend/data/pca` for the automatic full-scatter graphs; no browser CSV import is needed.
- `backend/data/model_revision.json` is created from validated exports and drives an automatically rendered, locally fetched model snapshot in **ML Laboratory, Cluster Insights and Research**.
- All original frontend aesthetic styles are preserved. The existing public research-data policy stays in force.

## Important limitations

- The **PDF** contains code and visible results but not the actual new machine-readable model output files. Therefore the ZIP does **not** manufacture new grid predictions or hotspot maps from screenshots.
- This package checks the precise 25,465/13,506 eligibility counts in the PDF; if your newly trained models have changed those, update the expected counts only after confirming their new notebook outputs.
- `dashboard_summary.json` is not automatically rebuilt because its schema is broader than the latest notebook export; if research results changed beyond model assignments, re-export this file from your notebook.
- If you modified hotspot algorithms, copy their updated region outputs too. The script warns if refreshed hotspot region tables are absent. Old hotspot tables could otherwise remain stale.
- Data licensing: do not commit the updated private Parquet, per-cell PCA files, satellite-derived JSON, or unapproved research exports to GitHub or a public host.
- AOD is historical column aerosol loading, not live AQI, ground-level PM2.5, health risk or a forecast.
