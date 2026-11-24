# AeroScope India | Methodology & Research redesign

## Purpose

Frontend-only replacement for the `/research` page, designed in the premium light/pearl theme used by the AeroScope India Overview, ML Laboratory, and Cluster Insights. This patch does not change Flask, API routes, `App.tsx`, navigation, the map, or any scientific result files.

## Files in this ZIP

| Path | Action |
| --- | --- |
| `frontend/src/pages/Research.tsx` | **Replace** the existing Research page |
| `frontend/src/styles/aeroscope-research.css` | **Create** page-scoped CSS, imported automatically by `Research.tsx` |
| `PREVIEW-METHODOLOGY.html` | Optional **static layout illustration**, not the working React page |
| `PREVIEW-SHELL.css` | Styles for the standalone illustration only, not imported into React |
| `README-METHODOLOGY.md` | These directions |

## Install on Windows (VS Code PowerShell)

1. Confirm that you are working in the intended Git branch and preserve any changes you may want to restore:

   ```powershell
   cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
   git branch --show-current
   git status
   ```

   Expected working branch: `claude-redesign`. If there are uncommitted changes, **do not blindly discard them**. Commit the known-good work, or save a local copy of `Research.tsx` before proceeding. Your `main` branch stays untouched.

2. Download `aeroscope-premium-methodology.zip` into your Windows Downloads folder, then from the project root run:

   ```powershell
   Expand-Archive -Path "$HOME\Downloads\aeroscope-premium-methodology.zip" -DestinationPath . -Force
   ```

   The archive changes **only** `frontend/src/pages/Research.tsx` and adds `frontend/src/styles/aeroscope-research.css` inside the frontend. The remaining files are previews/documentation at project root.

3. Build, then run your Vite frontend:

   ```powershell
   cd frontend
   npm run build
   npm run dev
   ```

   Open the Vite URL shown in the terminal, then navigate to **`/research`**.

4. For a static approximation of the desktop design, open `PREVIEW-METHODOLOGY.html` (at the project root) in a browser. **This preview is an illustration and is not connected to React or Flask.** The actual React page includes clickable 7-stage pipeline buttons, working anchor navigation, expandable scientific limitations, and navigation to the ML Laboratory.

## Scientific integrity

This page uses only documented public-safe methodology already in the existing Research page:
- Original GeoTIFF scenes: **4,212**; unique dates: **643**; India grid: **27,937** cells.
- Observation window: **23 Aug 2022 to 5 Jun 2024**; product identifier **3DIMG_L2G_AOD V02R00**.
- Model A: **K=4**, **25,465** eligible cells; Model B: **K=5**, **13,506** seasonal-eligible cells.
- Pipeline, input features, seasonal definitions, K=2–8 experiments, validation diagnostics, caveats, references and DOI are retained from the original Research implementation.
- Colored visual representations denote **workflow steps or feature groups**, not synthesized satellite measurements, unseen AOD scores or fabricated cluster trends.
- The React Methodology page does **not** request restricted research outputs or publish raw INSAT-3D data.

## QA scope

Validated here: TSX parser/transpilation syntax, CSS parser, reference paths, and ZIP integrity. **A full `npm run build` against your exact installed frontend packages has not been executed here.** Please run that locally and share any error text if it appears.

## Rollback (only this page)

If you don't like the redesign, from the project root and only after ensuring no Research edits need saving, restore the previously committed version:

```powershell
git restore frontend/src/pages/Research.tsx
```

The new stylesheet can be left unused or removed if no longer referenced. The original `main` branch and original backup are unaffected.
