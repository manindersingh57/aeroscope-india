# AeroScope India — Phase 9 frontend foundation

## Purpose

React + TypeScript + Tailwind CSS v4 starter that connects to the verified Flask backend. It does not request or embed restricted research results at startup, and is deliberately a basic foundation rather than the final 3D design.

## Setup on Windows PowerShell

From the **repository root** (`aeroscope-flask-backend`), after installing an up-to-date Node.js version:

```powershell
node -v
npm -v
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install tailwindcss @tailwindcss/vite
cd ..
# Extract this ZIP in the repo root with -Force to overlay Vite template files.
Set-Content frontend/.env.local 'VITE_API_BASE_URL=http://127.0.0.1:5000/api/v1'
```

In terminal 1 (backend):

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
$env:AEROSCOPE_ENV='development'
python -m flask --app wsgi run --debug
```

In terminal 2 (frontend):

```powershell
cd frontend
npm run dev
```

Open http://localhost:5173 and check that the Flask API shows **Connected** and that research data status is correct. If the server isn't running, the UI shows an error and offers retry.

## Integration contract

- Backend: `backend/docs/openapi.json`
- Server handoff: `backend/docs/PHASE8_HANDOFF.md`
- Frontend API client: `frontend/src/lib/aeroscopeApi.ts`
- Vite exposes `VITE_` variables publicly. Never store secrets or restricted dataset contents in them.
- For local CORS the Flask default allows `http://localhost:5173` in development; visit that origin, not a different IP/port.
- For production, use the real HTTPS backend address, and configure `AEROSCOPE_ALLOWED_ORIGINS` to the real frontend HTTPS origin. Production results remain blocked pending MOSDAC release clearance.
- Historical observation period: 2022-08-23 to 2024-06-05. Never label it live AQI.

## Next phase

Add React routes and validated pages for Explore, Location, Compare, Hotspots and Model Laboratory, then develop optional Three.js visuals. Do not invent new API endpoints: consult OpenAPI first.
