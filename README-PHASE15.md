# AeroScope India — Phase 15: Premium UI / animated orbital interface

This is a **visual-only frontend patch**. It does not alter Flask routes, request formats, model logic, scientific data, or public-access safeguards.

## What's included

- `frontend/src/App.tsx`: single shared navigation across all existing routes.
- `frontend/src/components/SiteHeader.tsx`: responsive, keyboard-accessible navigation.
- `frontend/src/components/OrbitalScene.tsx`: lightweight decorative CSS 3D orb; **not satellite data** or an Earth map.
- `frontend/src/pages/Home.tsx`: new editorial landing page, modular navigation cards, and live API status.
- `frontend/src/index.css`: complete visual system, interactive styling, mobile layouts, and reduced-motion support.

## Install

Make a Git commit / backup of your current frontend before extracting.

In PowerShell, from the **project root**, not `backend`:

```powershell
Expand-Archive -Path "$HOME\Downloads\aeroscope-phase15-premium-ui.zip" -DestinationPath . -Force
cd frontend
npm run build
npm run dev
```

Open `http://localhost:5173`. Test `/explore`, `/compare`, `/hotspots`, `/models`, `/research` and the mobile menu. Start Flask in a separate terminal for live status.

## Notes

- The existing individual page headers are hidden using a narrowly scoped selector; their content and feature logic remain untouched.
- Phase 15 relies on your installed `react-router-dom`, `lucide-react` and Tailwind setup from previous phases. It adds **no npm dependency**.
- If your local backend is offline, the homepage shows `Unavailable`, while the other pages still render their existing restricted/error states.
- No raw AOD, GeoTIFF, Parquet, or restricted research files are included.
- On Vercel, you must retain `VITE_API_BASE_URL` and the Render CORS configuration you established previously. This patch does not change them.
- Decorative orb is deliberately abstract. It does not encode actual spatial results.

## Deploy after testing

```powershell
cd ..
git add frontend/src/App.tsx frontend/src/index.css frontend/src/pages/Home.tsx frontend/src/components/SiteHeader.tsx frontend/src/components/OrbitalScene.tsx
git diff --cached --name-only
git commit -m "Polish AeroScope interface with responsive navigation and orbital hero"
git push origin main
```

If Vercel is connected to the production branch, it will rebuild under your existing domain.

## For the optional Claude / WebGL handoff

See `CLAUDE-3D-HANDOFF.md`. The current effect can be replaced with React Three Fiber later, without touching the API.
