# AeroScope India — Phase 8: API release preflight and React handoff

This update adds *only* a preflight script, a few non-data tests, and this guide. It does not change the research engines, the Flask API routes, the `.env` file, or any downloaded satellite data.

## Before running

- You should have installed the Phase 7 update and applied the `/api/v1/openapi.json` fix from the previous step. That route must return a normal Flask JSON response rather than `send_file(...)`, or the Phase 7 compression test can fail.
- Local dependencies: `python -m pip install -r requirements-dev.txt`.
- Keep `backend/data/`, `backend/config/backend_config.json`, and local `.env` private.

## Verify the backend

In PowerShell, from the **backend** directory:

```powershell
python -m pytest -q
python -m scripts.release_preflight
```

The preflight confirms that publicly safe metadata endpoints respond, production research endpoints are blocked when publication is disabled, and CORS does not accept unknown origins. It also executes pytest and the Phase 7 Git audit. It **never** uploads or commits scientific data.

While Flask is running in terminal A:

```powershell
python -m flask --app wsgi run --debug
```

Run the local, sequential timing check in terminal B:

```powershell
python -m scripts.benchmark_api --requests 5
python -m scripts.benchmark_api --research --requests 5
```

The `--research` mode is deliberately restricted to localhost. P95 from five requests is only a first-pass diagnostic, not a capacity or production load test.

## Deployment defaults

Render web service setup (from your linked private GitHub repo):

| Setting | Value |
| --- | --- |
| Runtime | Python 3 |
| Root directory | `backend` |
| Build | `pip install -r requirements.txt` |
| Start | `gunicorn --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120 wsgi:app` |
| Health check path | `/api/v1/health` |

Use these environment values on public hosting until release permission is resolved:

```env
AEROSCOPE_ENV=production
AEROSCOPE_PUBLIC_RESULTS_ENABLED=false
AEROSCOPE_ENABLE_GRID_API=false
```

After React is deployed, set `AEROSCOPE_ALLOWED_ORIGINS` to the actual HTTPS **frontend** origin, e.g., `https://your-frontend-host.example` (no path). Leave it unset until then. Do not copy your development `.env` to public hosting.

### Important release limitations

- A working server URL is **not yet a university-ready full website**; the React pages and live API integration must be tested.
- Live hosting does **not** mean live air pollution monitoring. Results in the project are historical.
- A green preflight is a **technical** check, not legal permission to distribute MOSDAC-derived raster or per-cell records.
- Public research-data endpoints return `403 public_results_disabled` by design until their release is authorized. CORS alone does not enforce privacy.
- Do not put the raw GeoTIFFs, the detailed Parquet table, compact analytics bundles, or local secrets in a public Git repository.

## Contract for the React UI

- API base URL: `http://127.0.0.1:5000/api/v1` (local), `https://YOUR-RENDER-SERVICE.onrender.com/api/v1` (production).
- Read `backend/docs/openapi.json` for precise route definitions and `backend/docs/react-api-client.ts` for a TypeScript client.
- Frontend environment file: `VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1`. These client-side variables are public and must not contain secrets.
- Bootstrap the app from `GET /capabilities`; if `research_results_available` is false, show a clear historical research demo/access notice rather than sending repeated protected requests.
- Treat `403` as access restricted, `503` as research artifacts unavailable, `400` as bad input, and `404` as not found. Never show raw Python tracebacks to users.
- `GET /map/hotspots/model_a` yields hotspot **centres**, not polygon borders. `/map/grid` returns grid-centre points and should remain disabled pending permissions review.
- `/models/model_a/pca` returns aggregate cluster-level PCA coordinates, not a complete per-cell PCA plot.

## Ready-to-give implementation brief for a React developer or Claude

> Build a responsive React + Vite + TypeScript + Tailwind frontend for AeroScope India, a historical INSAT-3D aerosol-pattern research platform. Use the supplied `openapi.json` and `react-api-client.ts` as the only backend contract; do not invent endpoints. Include an India exploration view, states comparison, location analysis, hotspot centres view, model evaluation page, and methodology/disclaimer page. Use MapLibre GL JS or Leaflet for map layers and Recharts for charts. Three.js animation may enhance the landing page, but must not impair map interactivity, mobile performance, or accessibility. Always show the historical observation window. Call `/capabilities` on startup and handle `403 public_results_disabled` as a restricted scientific result, not a server error. Do not claim live AQI, direct PM2.5 estimation, predictions, or source attribution. Never embed detailed research datasets or secrets in frontend code.

## Git before deployment

From the **repository root**, review changes:

```powershell
git status --short
cd backend
python -m scripts.audit_git_data
cd ..
git add backend/scripts/release_preflight.py backend/tests/test_release_preflight.py backend/docs/PHASE8_HANDOFF.md
git diff --cached --stat
git commit -m "Add release preflight and React API handoff"
git push origin main
```

Review staged paths before `git commit`. `git status --short` should not reveal tracked `.env` files or restricted research artifacts.
