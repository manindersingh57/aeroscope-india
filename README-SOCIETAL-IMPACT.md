# AeroScope India | Societal Impact research workspace

Three integrated, data-driven functions using **existing Flask `/api/v1` endpoints**:

1. **Know Your Region**: region picker, historical mean AOD, spatial coverage, cautious coverage-filtered state comparison, plain-language interpretations and predominant Model A/B cluster labels.
2. **Monitoring candidates & seasonal insights**: screening signals, incomplete-data warnings, four-season bar chart based on matched cells only, clearly labeled as exploratory and not AQI / PM2.5.
3. **Downloadable regional research brief**: create a text file locally, or use browser Print → Save as PDF. Includes dataset attribution, methodological caveats, data quality, model distributions and tentative follow-up actions.

## Safety and validity

- The public Render backend restricts certain research results pending MOSDAC permission. When restricted, the page shows educational information and a clear no-data message. No fake values, simulated state rankings or forecasts are shown.
- The region comparison ranks *only* returned state summaries having >=30 valid cells and >=50% spatial grid coverage, and only when at least 8 states qualify. These are **exploratory display thresholds**, not scientifically validated risk categories or regulatory criteria. Comparisons use unweighted averages of available grid-cell means and may be confounded by temporal observation coverage.
- Seasonal comparisons use `seasonal_matched`, not independently selected regional cells. Seasonal contrasts are retrospective, not predicted future pollution.
- Monitoring signals are **screening suggestions**, not actionable health advice, forecasts or policy determinations.
- The generated report may contain protected research-derived data. Check redistribution rights before sharing or publishing.
- No raw satellite files, keys, backend changes, or additional npm packages are included.

## Files

- `frontend/src/pages/SocietalImpact.tsx` (NEW)
- `frontend/src/styles/aeroscope-impact.css` (NEW)
- `tools/apply_aeroscope_impact.py` (NEW installer; performs small and reversible route + sidebar edits)

## Installation on your `claude-redesign` branch

Open VS Code PowerShell in the project root:

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
git branch --show-current
git status
```

Make sure it says **`claude-redesign`**. Commit or stash your own changes before applying. Then:

```powershell
Expand-Archive -Path "$HOME\Downloads\aeroscope-societal-impact-upgrade.zip" -DestinationPath . -Force
python tools\apply_aeroscope_impact.py
cd frontend
npm run build
npm run dev
```

Visit `http://localhost:5173/impact`. There will be an **Social Impact** icon in the compact sidebar. A Community insights link will also appear in the matching Geo Explorer header. The script leaves `Home.tsx`, the Whisk hero, the model pages, research methodology and Flask logic untouched.

Start your LOCAL Flask backend with the approved research data installed. Publicly restricted deployments will not show the derived state values.

### How to test

1. With local Flask running, select **Punjab**, then **Haryana**. The mean AOD, matched-season bars and cluster labels should update from the API without placeholder data.
2. Switch state rapidly: stale API responses must not overwrite the current state.
3. Download `.txt` and try Print → Save as PDF. Confirm the saved numbers correspond to `/api/v1/states/<state>`.
4. Stop Flask or point to the public restricted backend: ensure no invented statistics appear.
5. On mobile, verify selector, signal cards, and regional brief buttons.
6. Inspect `git diff` before committing and confirm the only existing files changed by installer are `App.tsx`, `AeroLightShell.tsx`, and possibly `ExploreIndia.tsx`.

## Suggested next enhancement

An independent CPCB station validation module using licensed/open official ground-observation data aligned by location, time and quality, with objective disagreement metrics. Satellite AOD should not be equated to ground PM2.5 without validation.
