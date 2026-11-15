# Phase 7 — Performance and Frontend Integration

This patch **does not retrain models or change analytical calculations**.
It is compatible with the Phase 6 project and requires no Colab rerun.

## What changes

- Adds `X-Request-ID` and `Server-Timing` to `/api/*` responses.
- Compresses eligible JSON responses larger than 1 KiB with gzip **only** when the browser requests gzip, reducing transfer size for GeoJSON and OpenAPI documents. No compression is done for errors or large responses over 4 MiB.
- Preserves `Cache-Control: no-store` and existing production data-access guards.
- Adds a sequential API benchmark and a Git data safety audit.
- Adds a copyable React + TypeScript API helper.

## How to install

Extract the update ZIP **at the repository root**, the folder containing `backend/`, **not inside `backend/`**. The ZIP is a partial overlay, not a replacement for the working repository or your research data.

From PowerShell in that repository root:

```powershell
Expand-Archive -Path "$HOME\Downloads\aeroscope-phase7-performance.zip" -DestinationPath . -Force
cd backend
python -m pytest -q
```

## Local performance benchmark

Keep Flask running in a separate terminal:

```powershell
python -m flask --app wsgi run --debug
```

In a second terminal, run:

```powershell
cd backend
python -m scripts.benchmark_api --requests 5
python -m scripts.benchmark_api --research --requests 5
```

The second command calls **historical research endpoints** and is intentionally restricted to localhost / loopback IPs. It reads results for timing but never prints scientific values. The benchmark uses five sequential requests per endpoint; it is **not** a stress/load test and does not measure production concurrency.

Do not treat the sample lat/lon in the benchmark as an observation from a live satellite. Real-data requests need the existing data package and imported analytics ZIP.

## Git audit

Before committing or pushing:

```powershell
python -m scripts.audit_git_data
git status
```

Do not commit the local `backend/data/` research files or `backend/config/backend_config.json`. The audit is a conservative file-path check, not an authorization to distribute derived data.

## React integration

When creating the frontend with Vite, copy `backend/docs/react-api-client.ts` to `frontend/src/lib/aeroscopeApi.ts`. Set the **frontend** environment variable `VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1` in local development.

For local browser access, set `AEROSCOPE_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173` inside the backend `.env` and restart Flask. In production use your actual frontend HTTPS origin, and keep `AEROSCOPE_PUBLIC_RESULTS_ENABLED=false` until MOSDAC data-policy review permits the proposed public outputs.

Flask's development server is for testing only. For Linux hosting, keep the configured Gunicorn start command. A production performance benchmark should use safe endpoints only, with `--base-url https://YOUR_BACKEND_URL` and **without** `--research`.

## Test caveat

This patch can be syntax-checked without Flask installed, but full route tests require `python -m pip install -r requirements-dev.txt` on your VS Code environment. Do not describe a ZIP syntax check as a complete backend test pass.
