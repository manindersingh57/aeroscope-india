# AeroScope India | Phase 11: Regional Comparison

This overlay adds a functional React `/compare` page. It consumes the **existing** Flask regional endpoints and does not change Python code or distribute any dataset.

## Install on Windows (PowerShell)

1. Stop React's dev server (Ctrl+C). Keep your original project, including `frontend/node_modules`, `.env.local`, and `backend/data`.
2. From `aeroscope-flask-backend` **project root**, extract this ZIP with `Expand-Archive -Path "$HOME\Downloads\aeroscope-phase11-regional-comparison.zip" -DestinationPath . -Force`.
3. `cd frontend`
4. `npm install recharts lucide-react` (once; your earlier installs may already include them).
5. `npm run build`; resolve any errors before starting.
6. `npm run dev` and open `http://localhost:5173/compare`.
7. Run Flask separately from the `backend` folder: `python -m flask --app wsgi run --debug`.

## Endpoints used

- `GET /api/v1/capabilities` checks whether research data are installed and enabled.
- `GET /api/v1/states` populates state selection.
- `GET /api/v1/state-summaries` confirms coverage summaries are available.
- `POST /api/v1/compare/states` with `{ "states": ["Punjab", "Haryana"] }` returns real state profiles.

The page compares 2–4 states, loads historical mean AOD, eligible grid-cell coverage, matched seasonal AOD and Model A/B cluster distributions. It works without publishing raw data.

## Important scientific boundaries

The engine returns **unweighted means of grid-cell summary values**. Matched seasonal means use the same grid cells *within each state*, but not the same locations across different states. No part of this dashboard depicts live AQI, surface PM2.5, health risk, or emission sources. Public release restrictions remain controlled by the existing Flask backend.

## Troubleshooting

- `Failed to fetch`: start Flask at `127.0.0.1:5000`, check `frontend/.env.local` and the browser developer console for CORS errors.
- `Research results restricted`: this is the intended response in environments without data-release approval. Do not turn off production safeguards.
- Empty state list: verify the research ZIP is imported and test `http://127.0.0.1:5000/api/v1/states` locally.
- Always run npm from `frontend` and Python from `backend`.
