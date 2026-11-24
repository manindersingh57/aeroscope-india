# AeroScope India — design handoff for Claude or another frontend developer

## Goal

Create an elegant, modern, cinematic environmental-research experience. The visual design must not compromise scientific integrity, responsiveness, accessibility or fast research-page interactions.

## Existing system

- React + TypeScript + Tailwind CSS + React Router.
- Flask backend on Render; production API base injected via `VITE_API_BASE_URL` at Vite build time.
- Existing pages: `/`, `/explore`, `/compare`, `/hotspots`, `/models`, `/research`.
- Scientific components and API access exist and must remain intact.
- Existing `OrbitalScene.tsx` is a decorative CSS 3D illustration on the landing page.
- INSAT-3D AOD observations are **historical**, not current AQI or real-time PM2.5.
- Public research results may be restricted pending MOSDAC permissions. Preserve backend capability checks and access restrictions.

## Design and interaction direction

Aesthetic: restrained sci-fi editorial, mineral deep teal, bioluminescent mint, soft silver, and warm ivory. Prioritize exquisite type rhythm, negative space, material depth, choreographed transitions and subtle details, not dashboard clutter.

### Opportunities

1. Replace the decorative orbital object with an optimized WebGL/React Three Fiber experience only if there is meaningful performance benefit. Keep a static/CSS fallback, pause when out of view and support reduced motion.
2. Enhance Atlas with well-optimized map overlays and cluster legends, **using only API-provided geospatial data**. Do not generate fake India boundaries or estimated pollution readings.
3. Add page transitions that preserve React Router navigation and avoid reloading expensive data.
4. Upgrade charts for hover interpretation, accessible legend patterns and consistent colours. Do not alter numeric values.
5. Make mobile and tablet layouts first-class. Verify keyboard use, focus states, colour contrast and touch interactions.

## Constraints

- Do not change any scientific calculation, dataset, research definitions, response schemas or model outputs.
- Do not add real-time AQI badges, forecasts, emission source claims, or unverified live satellite imagery.
- Do not bypass `research_results_available` / `research_data_loaded` checks.
- Avoid exposing raw or private MOSDAC data in `public/`, Vite assets, Git or client-side bundles.
- Keep `npm run build` passing and retain Vercel rewrites for nested routes.
- Prefer lazy-loaded WebGL and code splitting, since MapLibre and Recharts already increase bundle size.

## Acceptance tests

Homepage, all 5 feature routes, backend connected and disconnected states, public restricted-data state, mobile nav, keyboard nav, reduced-motion preference, deployment refresh on deep links, Lighthouse metrics, and no console errors.
