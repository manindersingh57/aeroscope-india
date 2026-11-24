# AeroScope India | Phase 14: Research & Methodology

A **frontend-only** addition on top of Phase 13. The page is available at `/research`, linked from the homepage and its own navigation.

## Files included

- `frontend/src/pages/Research.tsx`: public-safe research methodology page.
- `frontend/src/App.tsx`: registers the `/research` route.
- `frontend/src/pages/Home.tsx`: adds research navigation and module card.

The ZIP does **not** modify Flask, the existing model analytics or map pages, local research datasets, or environment variables.

## Install on Windows PowerShell

Back up/commit local frontend changes before merging, because `App.tsx` and `Home.tsx` are replaced with the Phase 13-compatible versions with `/research` additions.

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
Expand-Archive -Path "$HOME\Downloads\aeroscope-phase14-research-methodology.zip" -DestinationPath . -Force
cd frontend
npm run build
npm run dev
```

Visit `http://localhost:5173/research`. The page works without Flask because its methodological text is static and has no restricted-data fetch requests.

## Verify

- `/research` loads from the Home link and when refreshed directly.
- All 7 table-of-contents anchors scroll to their sections.
- The `Model Laboratory` and `India Atlas` navigation links still work.
- Descriptions remain legible on narrow screens.
- `npm run build` passes with the existing `react-router-dom` and `lucide-react` dependencies installed.

## Scientific sources used for content

- Uploaded **INSAT3D_AOD_Regional_Hotspot_Clustering.ipynb**, enhanced notebook chunks 15–24, selected model configuration (chunks 18–20), and model robustness (chunk 23).
- Uploaded **INT396 UNSUPERVISED PROJECT.pdf**, objectives 1–3.
- Satellite product attribution: MOSDAC / SAC / ISRO; INSAT-3D 3DIMG_L2G_AOD V02R00; DOI 10.19038/SAC/10/3DIMG_L2G_AOD. The external source-information page is linked from the research page.

Note: the published site avoids making licensing determinations and does not provide downloads of original or detailed research data.

## Publish to the existing Vercel address

After build verification and a staged file review:

```powershell
cd ..
git add frontend/src/App.tsx frontend/src/pages/Home.tsx frontend/src/pages/Research.tsx
git diff --cached --name-only
git commit -m "Add scientific research and methodology page"
git push origin main
```

Vercel can redeploy from your existing GitHub branch; the permanent site URL does not need to change.

## Next: Phase 15

Visual polish and 3D motion, plus accessibility, performance optimization, mobile QA and final full-stack deployment smoke checks.
