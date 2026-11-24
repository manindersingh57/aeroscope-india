import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowLeft, ChevronDown, ExternalLink, Layers, LocateFixed, MapPin, RefreshCw } from 'lucide-react'
import AeroMap from '../components/AeroMap'
import { API_BASE, aeroscopeApi, type Capabilities } from '../lib/aeroscopeApi'
import type { HotspotFeature, HotspotsCollection, LayerCatalogue, LocationResult, ModelId } from '../lib/mapTypes'

const pageSize = 200
const formatNumber = (value: number | null | undefined, digits = 3): string =>
  value === null || value === undefined || !Number.isFinite(value) ? 'Not available' : value.toFixed(digits)

function getMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load research data'
}

export default function ExploreIndia() {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [layers, setLayers] = useState<LayerCatalogue | null>(null)
  const [setupLoading, setSetupLoading] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [model, setModel] = useState<ModelId>('model_a')
  const [draftState, setDraftState] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [focusRevision, setFocusRevision] = useState(0)
  const [clusterName, setClusterName] = useState('')
  const [minCells, setMinCells] = useState(1)
  const [hotspots, setHotspots] = useState<HotspotsCollection | null>(null)
  const [hotspotsLoading, setHotspotsLoading] = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const [hotspotsError, setHotspotsError] = useState<string | null>(null)
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotFeature | null>(null)
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null)
  const [inputLat, setInputLat] = useState('30.901')
  const [inputLon, setInputLon] = useState('75.857')
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const inFlightMore = useRef<AbortController | null>(null)
  const activeModel = layers?.layers[model] ?? null
  const allowed = Boolean(capabilities?.research_data_loaded && capabilities.research_results_available)

  useEffect(() => {
    const controller = new AbortController()
    setSetupLoading(true)
    setSetupError(null)
    Promise.all([aeroscopeApi.capabilities(controller.signal), aeroscopeApi.layers(controller.signal)])
      .then(([capabilityResponse, layerResponse]) => {
        setCapabilities(capabilityResponse)
        setLayers(layerResponse)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setSetupError(getMessage(error))
      })
      .finally(() => { if (!controller.signal.aborted) setSetupLoading(false) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    inFlightMore.current?.abort()
    setMoreLoading(false)
    const controller = new AbortController()
    setSelectedHotspot(null)
    setHotspots(null)
    setHotspotsError(null)
    if (!allowed) {
      setHotspotsLoading(false)
      return () => controller.abort()
    }
    setHotspotsLoading(true)
    aeroscopeApi.hotspotCenters(model, {
      state: stateFilter, clusterName, minCells, offset: 0, limit: pageSize,
    }, controller.signal)
      .then(setHotspots)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setHotspotsError(getMessage(error))
      })
      .finally(() => { if (!controller.signal.aborted) setHotspotsLoading(false) })
    return () => controller.abort()
  }, [allowed, model, stateFilter, clusterName, minCells])

  useEffect(() => {
    const controller = new AbortController()
    setLocation(null)
    setLocationLoading(false)
    setLocationError(null)
    if (!coordinates || !allowed) return () => controller.abort()
    setLocationLoading(true)
    aeroscopeApi.location(coordinates.lat, coordinates.lon, controller.signal)
      .then(setLocation)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setLocationError(getMessage(error))
      })
      .finally(() => { if (!controller.signal.aborted) setLocationLoading(false) })
    return () => controller.abort()
  }, [allowed, coordinates])

  const displayedFeatures = useMemo(() => hotspots?.features ?? [], [hotspots])
  const activeProfile = location?.profile?.[model]

  async function loadMore() {
    if (!hotspots?.pagination.has_more || moreLoading) return
    const controller = new AbortController()
    inFlightMore.current?.abort()
    inFlightMore.current = controller
    setMoreLoading(true)
    setHotspotsError(null)
    try {
      const next = await aeroscopeApi.hotspotCenters(model, {
        state: stateFilter, clusterName, minCells,
        offset: hotspots.pagination.offset + hotspots.pagination.limit,
        limit: pageSize,
      }, controller.signal)
      if (!controller.signal.aborted) {
        setHotspots({ ...next, features: [...hotspots.features, ...next.features] })
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) setHotspotsError(getMessage(error))
    } finally {
      if (!controller.signal.aborted) setMoreLoading(false)
    }
  }

  function chooseCoordinate(lat: number, lon: number) {
    setSelectedHotspot(null)
    setCoordinates({ lat, lon })
    setInputLat(lat.toFixed(5))
    setInputLon(lon.toFixed(5))
  }

  function submitCoordinates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const lat = Number(inputLat)
    const lon = Number(inputLon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setLocationError('Please enter valid latitude (−90 to 90) and longitude (−180 to 180).')
      return
    }
    chooseCoordinate(lat, lon)
  }

  return (
    <div className="min-h-screen bg-[#f3f6f7] text-[#112f38]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1580px] flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <span className="grid size-10 place-items-center rounded-xl bg-[#113e48] text-xl text-white">◎</span>
            <div><div className="text-lg font-bold tracking-tight">AeroScope <span className="text-[#1f8979]">India</span></div><div className="text-[10px] tracking-[0.19em] text-slate-500">SATELLITE RESEARCH PLATFORM</div></div>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs text-slate-500 sm:flex"><Activity size={15} /> Historical AOD, not live AQI</span>
            <Link to="/hotspots" className="inline-flex items-center gap-2 rounded-full border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">Browse hotspots</Link>
            <Link to="/models" className="inline-flex items-center gap-2 rounded-full border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">Model Laboratory</Link>
            <Link to="/compare" className="inline-flex items-center gap-2 rounded-full border border-teal-200 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">Compare states</Link>
            <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"><ArrowLeft size={16}/> Home</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1580px] px-5 pb-14 pt-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.19em] text-teal-700">Explore India · Interactive atlas</div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Discover historical aerosol patterns</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">INSAT-3D observations, 23 Aug 2022 to 5 Jun 2024. Model classifications and hotspot centres are historical research outputs.</p>
          </div>
          <div className="rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-900">{allowed ? 'Local research data available' : setupLoading ? 'Checking data access…' : 'Research results restricted'}</div>
        </div>

        {setupError && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Unable to contact Flask: {setupError}. Check the API at {API_BASE}.</p>}
        {!setupLoading && !setupError && !allowed && (
          <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            {capabilities?.research_data_loaded ? 'Map legends are available, but detailed research results are disabled on this server until publication permissions are confirmed.' : 'The backend is reachable, but its scientific dataset has not been installed. The basemap and model legends can still be explored.'}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 font-semibold"><Layers size={18} className="text-teal-700"/> Model layers</div>
              <div className="space-y-2">
                {(['model_a', 'model_b'] as const).map((id) => (
                  <button type="button" key={id} onClick={() => { setModel(id); setClusterName('') }}
                    aria-pressed={model === id}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition ${model === id ? 'border-teal-700 bg-teal-50 text-teal-900' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <div className="font-semibold">{id === 'model_a' ? 'Model A · Broad loading' : 'Model B · Seasonal behaviour'}</div>
                    <div className="mt-1 text-xs text-slate-500">{id === 'model_a' ? '4 aerosol-loading clusters' : '5 seasonal-pattern clusters'}</div>
                  </button>
                ))}
              </div>
              <form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); setStateFilter(draftState.trim()); setFocusRevision((v) => v + 1) }}>
                <label className="block text-xs font-semibold text-slate-600" htmlFor="state-search">Find a state · zoom and highlight</label>
                <input id="state-search" value={draftState} onChange={(event) => setDraftState(event.target.value)} placeholder="e.g. Punjab" list="as-indian-states" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
                <datalist id="as-indian-states">{["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"].map((name) => <option key={name} value={name}/>)}</datalist>
                <button type="submit" className="w-full rounded-lg bg-[#123d48] px-4 py-2 text-sm font-semibold text-white hover:bg-[#205863]">Zoom to state & filter hotspots</button>
                <button type="button" onClick={() => { setStateFilter(''); setDraftState(''); setFocusRevision((v) => v + 1) }} className="w-full rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50">Reset to all India</button>
              </form>
              <label className="mt-4 block text-xs font-semibold text-slate-600" htmlFor="cluster-filter">Cluster</label>
              <div className="relative mt-2">
                <select id="cluster-filter" value={clusterName} onChange={(event) => setClusterName(event.target.value)} className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm">
                  <option value="">All clusters</option>
                  {(activeModel?.clusters ?? []).map((cluster) => <option key={cluster.cluster_id} value={cluster.name}>{cluster.name}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-2.5 text-slate-500"/>
              </div>
              <label className="mt-4 block text-xs font-semibold text-slate-600" htmlFor="min-cells">Minimum hotspot size</label>
              <select id="min-cells" value={minCells} onChange={(event) => setMinCells(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                {[1, 10, 25, 100].map((n) => <option key={n} value={n}>{n} grid cell{n === 1 ? '' : 's'} minimum</option>)}
              </select>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">{activeModel?.title ?? 'Cluster legend'}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{activeModel?.description ?? 'Loading cluster definitions…'}</p>
              <div className="mt-4 space-y-3">
                {(activeModel?.clusters ?? []).map((cluster) => (
                  <div className="flex items-start gap-3" key={cluster.cluster_id}>
                    <span className="mt-1 size-3 shrink-0 rounded-full ring-2 ring-white" style={{ backgroundColor: cluster.color }}/>
                    <div><div className="text-xs font-semibold">{cluster.name}</div><p className="mt-0.5 text-xs leading-5 text-slate-500">{cluster.description}</p></div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <section aria-label="India interactive map" className="min-w-0 space-y-3">
            <AeroMap features={allowed ? displayedFeatures : []} legend={activeModel} selectedCoordinates={coordinates} focusState={stateFilter} focusRevision={focusRevision} onStateSelect={(stateName) => { setDraftState(stateName); setStateFilter(stateName); setFocusRevision((v) => v + 1) }} onCoordinateClick={chooseCoordinate} onHotspotClick={(hotspot) => { setSelectedHotspot(hotspot); setCoordinates(null) }} />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              <span><strong className="text-slate-900">{displayedFeatures.length}</strong> of <strong className="text-slate-900">{hotspots?.pagination.total ?? 0}</strong> hotspot centres shown · {hotspotsLoading ? 'Loading…' : 'Model ' + (model === 'model_a' ? 'A' : 'B')}</span>
              {hotspots?.pagination.has_more && allowed && <button type="button" onClick={loadMore} disabled={moreLoading} className="rounded-lg border border-teal-200 px-3 py-1.5 font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-60">{moreLoading ? 'Loading…' : 'Load more markers'}</button>}
            </div>
            {hotspotsError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">Hotspot API: {hotspotsError}</p>}
            {!hotspotsLoading && allowed && displayedFeatures.length === 0 && !hotspotsError && <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">No hotspot centres match the current filters. Try clearing the state or cluster filter.</p>}
            <p className="px-1 text-xs leading-5 text-slate-500">Glowing points represent centres of connected historical AOD regions; size and glow relate to recorded AOD, not ground-level PM2.5 or live AQI. State boundaries are an independent reference layer, not official survey boundaries. Basemap © OpenStreetMap contributors via OpenFreeMap; boundaries © geoBoundaries / DataMeet (CC BY 2.5 IN).</p>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold"><LocateFixed size={18} className="text-teal-700"/> Location analysis</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Click an empty map location, or enter coordinates. The API locates the nearest Indian study grid cell.</p>
              <form onSubmit={submitCoordinates} className="mt-4 grid grid-cols-2 gap-2">
                <label className="col-span-1 text-xs font-semibold text-slate-600">Latitude<input aria-label="Latitude" required value={inputLat} onChange={(event) => setInputLat(event.target.value)} type="number" step="any" min="-90" max="90" className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" /></label>
                <label className="col-span-1 text-xs font-semibold text-slate-600">Longitude<input aria-label="Longitude" required value={inputLon} onChange={(event) => setInputLon(event.target.value)} type="number" step="any" min="-180" max="180" className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm" /></label>
                <button disabled={!allowed} type="submit" className="col-span-2 mt-1 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">Analyse location</button>
              </form>
              {locationLoading && <p role="status" className="mt-4 text-sm text-slate-600">Looking up nearest satellite grid cell…</p>}
              {locationError && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{locationError}</p>}
              {location && !location.profile && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{location.message ?? 'No matching study cell found within the search radius.'}</p>}
              {location?.profile && <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm">
                <p className="font-semibold">{location.profile.state_name ?? 'Unknown state'}</p>
                <p className="text-xs text-slate-500">Nearest grid-cell centre {formatNumber(location.profile.distance_km, 1)} km from selected coordinates</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">Mean historical AOD</div><div className="mt-1 text-lg font-semibold">{formatNumber(location.profile.aerosol.mean_aod)}</div></div>
                  <div className="rounded-xl bg-slate-50 p-3"><div className="text-[11px] text-slate-500">Valid days</div><div className="mt-1 text-lg font-semibold">{location.profile.aerosol.valid_days ?? 'N/A'}</div></div>
                </div>
                <p className="text-xs text-slate-500">{model === 'model_a' ? 'Model A' : 'Model B'} classification</p>
                <p className="font-semibold">{activeProfile?.available ? activeProfile.cluster_name : activeProfile?.reason ?? 'Insufficient data for classification'}</p>
                <p className="text-xs leading-5 text-slate-500">Cluster separation is not calibrated prediction confidence. Satellite AOD is not ground-level pollution concentration.</p>
              </div>}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold"><MapPin size={18} className="text-teal-700"/> Hotspot detail</h2>
              {!selectedHotspot ? <p className="mt-3 text-sm leading-6 text-slate-500">Select a coloured hotspot-centre marker on the map to inspect its cluster, represented grid-cell count, and historical AOD.</p> : (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="font-semibold">Region #{selectedHotspot.properties.region_id}</div>
                  <div className="rounded-lg bg-slate-50 p-3 text-sm font-medium">{selectedHotspot.properties.cluster_name}</div>
                  <div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-slate-100 p-2"><div className="text-xs text-slate-500">Grid cells</div><strong>{selectedHotspot.properties.grid_cells}</strong></div><div className="rounded-lg border border-slate-100 p-2"><div className="text-xs text-slate-500">Mean AOD</div><strong>{formatNumber(selectedHotspot.properties.mean_aod)}</strong></div></div>
                  <p className="text-xs text-slate-500">States: {selectedHotspot.properties.states?.join(', ') || 'Not available'}</p>
                  <button type="button" onClick={() => chooseCoordinate(selectedHotspot.geometry.coordinates[1], selectedHotspot.geometry.coordinates[0])} disabled={!allowed} className="w-full rounded-lg border border-teal-200 px-3 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50">Analyse this centre</button>
                </div>
              )}
            </section>
            <a href={`${API_BASE}/map/layers`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-2 text-xs font-medium text-teal-800 underline underline-offset-4"><ExternalLink size={14}/> View map layer API</a>
          </aside>
        </div>
        <footer className="mt-9 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500">
          <span>Research demonstration only · INSAT-3D AOD · MOSDAC/SAC/ISRO data attribution required</span>
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center gap-2 font-medium text-teal-800"><RefreshCw size={14}/> Refresh data</button>
        </footer>
      </main>
    </div>
  )
}
