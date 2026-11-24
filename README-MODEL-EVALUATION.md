# AeroScope India | Enhanced K-Means Evaluation Gallery

## What it adds

**ML Laboratory (`/models`)** gains an interactive, full evaluation section, matching your eight-panel notebook figure from Chunk 19B. It displays:

- Model A: K=2 through K=8, with **WCSS, Silhouette, Davies–Bouldin, Calinski–Harabasz**.
- Model B: the same four metrics and K range.
- A **Selected model / Compare A+B** switch. In comparison mode, all eight charts appear.
- Selected candidate K markers (A=4, B=5), selected K score, per-metric best K when meaningful, scientific interpretations, and tooltips.
- Optional **Import Colab CSV** to load your **actual saved experiment data in browser memory**, even if the public research API is restricted.

The current ML Laboratory's cluster composition, selected score cards, profiles, PCA, robustness, and existing charts remain untouched.

## Installation (Windows PowerShell)

First, commit/save any changes. Confirm the working branch is `claude-redesign` (not `main`).

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
git branch --show-current
git status
Expand-Archive -Path "$HOME\Downloads\aeroscope-model-evaluation-curves.zip" -DestinationPath . -Force
python tools\apply_model_evaluation.py
cd frontend
npm run build
npm run dev
```

Open `http://localhost:5173/models`.

## Where the exact evaluation values come from

The screenshot is generated in notebook **Chunk 19B** from the table computed in **Chunk 19A**. That code saves the real CSV here in Google Drive / Colab:

`/content/gdrive/MyDrive/INSAT3D_AOD_Project/enhanced/outputs/results/enhanced_kmeans_evaluation.csv`

If your Flask local research API has authorized outputs loaded, charts populate automatically.

**Otherwise**, download that CSV from your Google Drive, open ML Laboratory, click **Import Colab CSV**, and select it. On import it reads only the `Model_A` and `Model_B` experiment rows with the four corresponding metrics and optional cluster-size diagnostics. The file remains in your browser tab only, is never posted to the Flask server, and is not added to the project directory. Switching models or comparing both works immediately.

**Do not commit the CSV** to GitHub or place it in `frontend/public` until redistribution permission is confirmed. Public deployments correctly show empty states when research results are restricted, unless the viewer explicitly imports their own data.

## Scientific notes

- A and B use **different feature spaces**, so WCSS and Calinski–Harabasz magnitudes should not be compared directly across models.
- The screenshot's highest Silhouette value is at K=2 for **both** models, but the project's chosen candidates are K=4 and K=5. This is a research selection, not a claim that those K values optimize every metric.
- In Chunk 19A, Silhouette uses a reproducible random sample of 3,000 eligible cells per model, where available. Davies–Bouldin and Calinski–Harabasz use the full model matrix.
- These are internal clustering validation metrics, **not prediction accuracy** or a measurement of current ground-level pollution.

## Files changed

- **NEW**: `frontend/src/components/ModelEvaluationGallery.tsx`
- **NEW**: `frontend/src/styles/aeroscope-evaluation.css`
- **NEW**: `tools/apply_model_evaluation.py`
- **PATCHED by installer**: `frontend/src/pages/ModelLaboratory.tsx`, with a timestamped backup saved in `Downloads/aeroscope-model-evaluation-backups/`.

No other page or backend component is modified; no npm packages are added. Styles are isolated with `al-eval-*` selectors.

## Manual integration if installer cannot find the expected anchor

Add this import to `frontend/src/pages/ModelLaboratory.tsx`:

```tsx
import ModelEvaluationGallery from '../components/ModelEvaluationGallery'
```

Inside the page JSX, **after the research status bar and before the existing two-column section**, add:

```tsx
<ModelEvaluationGallery
  selectedModel={model}
  selectedMetrics={data.metrics}
  canAccessApi={allowed}
  apiLoading={loading}
  unavailableReason={errors.metrics ?? unavailableDetail}
/>
```

The component itself imports its CSS. Do not add any CSS import to `index.css`.

## Build validation

The TypeScript JSX syntax and Python installer have been checked here. Because your actual `frontend/node_modules` and project configuration aren't present in this environment, you still need to run `npm run build` locally to catch any dependency-version-specific type errors before committing.
