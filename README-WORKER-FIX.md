# Phase 16 map worker fix (MapLibre GL JS v6 + Vite)

## What changed
`frontend/src/components/AeroMap.tsx` now imports MapLibre's worker through Vite:

```ts
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
maplibregl.setWorkerUrl(maplibreWorkerUrl)
```

The imported URL points to the generated same-origin worker asset on Vite and Vercel. The change does not alter the hotspot data, state filters, or Flask endpoints.

## Apply
1. Backup any changes you made to `frontend/src/components/AeroMap.tsx`.
2. Extract the ZIP at the `aeroscope-flask-backend` project root with overwrite; it replaces **only** this TSX file (plus this readme).
3. In `frontend`, run `npm run build`, then `npm run dev`.
4. Hard-refresh `http://localhost:5173/explore` (Ctrl+Shift+R).
5. To publish it, stage `frontend/src/components/AeroMap.tsx` and commit/push, then verify the Vercel deployment.

**Expected:** the basemap renders and the state hover/zoom works. Hotspot glowing dots show only where the API supplies approved research data; public Render does not currently serve those restricted data.

## If the map still fails
- Run `npm ls maplibre-gl` and confirm you are on MapLibre GL JS 6.x; this fix uses its v6 worker path.
- Check `frontend/.env.local` has `VITE_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty`, and restart Vite after changing it.
- Open DevTools > Network and verify a `maplibre-gl-worker...js` asset loads with HTTP 200, not 404/HTML.
- Open the map style URL directly to verify it is reachable.
- Ensure `frontend/public/data/india-states.geojson` exists for state overlays.
