# AeroScope India - Phase 16 Interactive State Atlas

## New functionality
- Enter a state in the left search box, click **Zoom to state & filter hotspots**, and MapLibre fits the actual state polygon while highlighting its outline.
- Hover a state to highlight it and display its name.
- Click a state to select it; the original click-to-analyse coordinates also continue working.
- Three blurred, concentric circle layers produce subtle glowing hotspot-centre markers. The glow is derived from actual `mean_aod` on the existing Flask `map/hotspots` endpoint, not simulated air-quality values.
- The map remains viewable even when the research APIs are restricted. In that case, no hotspot glows are shown, and the existing UI explains why.
- Selecting a coordinate smoothly focuses the map on the marker.
- OpenFreeMap Liberty is the default basemap unless `VITE_MAP_STYLE_URL` is configured.

## Install into your existing project
1. From `backend`, go to the project root with `cd ..`.
2. Extract the patch ZIP into the project root, merging files. This replaces only `frontend/src/components/AeroMap.tsx` and `frontend/src/pages/ExploreIndia.tsx` and creates a Python download tool.
3. From the **project root**, run `python tools/fetch_india_states.py`. This downloads openly licensed state boundaries, independently of your restricted INSAT-3D files, to `frontend/public/data/india-states.geojson`. Internet access is required once.
4. In `frontend`, run `npm run build`, then `npm run dev`.
5. Keep Flask running separately (local `AEROSCOPE_ENV=development`) to see actual hotspot lights. Open `http://localhost:5173/explore`.
6. Test: enter Punjab and Apply, hover over Haryana and Punjab, click a state, switch A/B, select a hotspot, and enter coordinates for location inspection.
7. After checking your Git changes and distribution permissions, commit the two changed TSX files, this attribution/readme, the boundary fetcher and the independently licensed boundary file. Deploy Vercel as usual. Do not add private INSAT-derived Parquet, GeoTIFF or analytics files.

## IMPORTANT: Public versus local
- State boundary overlay and basemap are independent of MOSDAC data and can function publicly, subject to the boundary layer attribution and licensing.
- Your published Render API currently indicates `research_data_loaded=false` and `research_results_available=false`. Hence the **public** map will NOT show research-derived hotspot glowing dots. This is intentional until publication terms are clarified.
- Map markers are **centres** of historical aerosol pattern regions; their glow illustrates historical mean AOD and cluster classification. They are not exact pollution sources, district-level prevalence, real-time AQI, PM2.5, or polygon footprints.

## Attribution and boundary caveats
- geoBoundaries `gbOpen/IND/ADM1`, underlying source **DataMeet India community / Election Commission of India**, boundaryLicense reported as **Creative Commons Attribution 2.5 India (CC BY 2.5 IN)**, boundaryYearRepresented **2011**. https://www.geoboundaries.org/ . License: https://creativecommons.org/licenses/by/2.5/in/
- State borders may not represent the current official status or cartographic conventions; review before using the map in an academic publication. State name aliases allow minor naming differences but some more recent administrative changes may not match the historical boundary data.
- Basemap: OpenFreeMap Liberty, derived from OpenStreetMap. Preserve the attribution widget.
- Scientific satellite data: INSAT-3D AOD, MOSDAC/SAC/ISRO (separate data-use conditions apply).

## If boundary overlay does not load
- Confirm `frontend/public/data/india-states.geojson` exists.
- Open `http://localhost:5173/data/india-states.geojson` and confirm it returns a GeoJSON FeatureCollection.
- On Vercel, **commit** the boundary file and redeploy. If it is not in your repository, the map displays an explicit warning. With a large boundary file, test Vercel bundle sizes.
- If `fetch_india_states.py` fails due to networking restrictions, use the geoBoundaries API page to download its `simplifiedGeometryGeoJSON` manually, then place it in that same public path. The geometry must have `properties.shapeName`.
