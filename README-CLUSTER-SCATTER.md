# AeroScope India | Real PCA Cluster Scatter Gallery

## What was missing

The previous ML Laboratory had an enhanced *metric evaluation* gallery (WCSS, Silhouette, DBI, CHI) and a smaller PCA chart with **cluster centroids only**. Those are not a cluster-scatter plot. The notebook's Chunk 21A already produces a full *PCA scatter of every eligible satellite grid cell*, colored by the final K-Means membership.

This update adds **two full interactive scatter plots**, side by side on large screens:

- **Model A, K=4:** broad aerosol loading PCA, four saved colors/categories.
- **Model B, K=5:** seasonal aerosol behavior PCA, five saved colors/categories.

It also adds per-cluster proportions, hover information for points, clickable legends to emphasize a cluster, and responsive styling. Charts use a deterministic stratified display sample of at most **1,100 points per cluster** for smooth canvas performance, while proportions are calculated on **all** imported valid cells. It does **not** fit/retrain PCA, approximate PCA from geographic coordinates, or simulate data.

## Where the real points come from

In your Colab notebook, **Chunk 21A: PCA Visualisation of Selected Models** saves:

`/content/gdrive/MyDrive/INSAT3D_AOD_Project/enhanced/data/features/final_model_a_clusters.csv`

`/content/gdrive/MyDrive/INSAT3D_AOD_Project/enhanced/data/features/final_model_b_clusters.csv`

Each contains **PC1**, **PC2**, **cluster_rank**, **cluster_name** and **cluster_color** for actual model-eligible cells. These CSVs are **different from** `enhanced_kmeans_evaluation.csv`, which only has model-selection metric values for K=2–8.

Download both cluster CSVs privately to your laptop. From the ML Laboratory's new "See the clusters" section, click **Import CSV** separately for Model A and Model B. Points appear immediately, and the imported data are retained only in the browser's current tab. Nothing is sent to Flask or published.

**Do not** put the full model outputs in GitHub, `frontend/public`, Render or Vercel without clearing MOSDAC redistribution rights. The public interface shows a purposeful empty state until the viewer imports authorized local outputs.

## Install on Windows (PowerShell)

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
git branch --show-current
git status
# Commit/back up any outstanding changes before extracting
Expand-Archive -Path "$HOME\Downloads\aeroscope-cluster-scatter-graphs.zip" -DestinationPath . -Force
python tools\apply_cluster_scatter.py
cd frontend
npm run build
npm run dev
```

Then go to `http://localhost:5173/models`.

Expected layout: heading/stat cards; the eight model-evaluation curves if already installed; **new full cluster visualization**; existing cluster anatomy, model-selection cards, elbow, centroid PCA, profiles, robustness and research context.

## Manual integration if your page is different

In `frontend/src/pages/ModelLaboratory.tsx` add, near existing CSS imports:

```tsx
import ClusterScatterGallery from '../components/ClusterScatterGallery'
```

In the page return JSX, after the evaluation gallery and before the existing primary two-column research cards:

```tsx
<ClusterScatterGallery />
```

The new component imports its own CSS. No new npm packages are required. No backend or other pages are modified. The installer is idempotent.

## Scientific interpretation

A PCA dot is a **classified historical satellite grid cell**, not a household, person's exposure, or live air-quality reading. PCA positions describe variation in the model's standardized/weighted inputs, and do not represent physical geographic coordinates. Model A and Model B were fitted to **different feature spaces**, so their component axes are not numerically comparable. The scatter helps visualize overlap and separation; it is not a proof of model accuracy or selection of K.
