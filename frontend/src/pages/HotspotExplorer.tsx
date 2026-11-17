import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Database,
  Filter, Layers, MapPin, RefreshCw, ShieldAlert, X,
} from 'lucide-react'
import { aeroscopeApi, API_BASE, type Capabilities, type Model } from '../lib/aeroscopeApi'
import type { LayerCatalogue } from '../lib/mapTypes'
import type { HotspotRegion, HotspotRegionPage, HotspotSummary } from '../lib/hotspotTypes'

const PAGE_SIZE = 24
const SIZE_OPTIONS = [1, 10, 25, 50, 100, 250]
const AOD_OPTIONS = [
  { value: '', label: 'Any historical mean AOD' },
  { value: '0.3', label: 'Mean AOD ≥ 0.3' },
  { value: '0.5', label: 'Mean AOD ≥ 0.5' },
  { value: '0.7', label: 'Mean AOD ≥ 0.7' },
  { value: '1', label: 'Mean AOD ≥ 1.0' },
]

function asMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load hotspot results'
}
function numberOrNA(value: number | null | undefined, digits = 3) {
  return value == null || !Number.isFinite(value) ? 'Not available' : value.toFixed(digits)
}
function integerOrNA(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? 'Not available' : value.toLocaleString()
}
function modelLabel(model: Model) {
  return model === 'model_a' ? 'Model A · Broad aerosol loading' : 'Model B · Seasonal aerosol behaviour'
}

export default function HotspotExplorer() {
  const [model, setModel] = useState<Model>('model_a')
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [layers, setLayers] = useState<LayerCatalogue | null>(null)
  const [states, setStates] = useState<string[]>([])
  const [setupLoading, setSetupLoading] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  const [stateFilter, setStateFilter] = useState('')
  const [clusterFilter, setClusterFilter] = useState('')
  const [minCells, setMinCells] = useState(1)
  const [minAod, setMinAod] = useState('')
  const [page, setPage] = useState(0)

  const [summary, setSummary] = useState<HotspotSummary | null>(null)
  const [regions, setRegions] = useState<HotspotRegionPage | null>(null)
  const [loadingResults, setLoadingResults] = useState(false)
  const [resultsError, setResultsError] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<HotspotRegion | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const available = Boolean(capabilities?.research_data_loaded && capabilities?.research_results_available)
  const currentModel = layers?.layers[model]
  const clusterColors = useMemo(() => new Map(
    (currentModel?.clusters ?? []).map(cluster => [cluster.name, cluster.color]),
  ), [currentModel])
  const activeRegionId = selectedRegion?.region_id

  useEffect(() => {
    const controller = new AbortController()
    setSetupLoading(true)
    setSetupError(null)
    setCapabilities(null)
    setLayers(null)
    async function prepare() {
      try {
        // Layer legends remain public; research-result APIs are requested only when authorised.
        const [caps, catalogue] = await Promise.all([
          aeroscopeApi.capabilities(controller.signal),
          aeroscopeApi.layers(controller.signal),
        ])
        if (controller.signal.aborted) return
        setCapabilities(caps)
        setLayers(catalogue)
        if (caps.research_data_loaded && caps.research_results_available) {
          const names = await aeroscopeApi.states(controller.signal)
          if (!controller.signal.aborted) setStates(names)
        } else {
          setStates([])
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) setSetupError(asMessage(error))
      } finally {
        if (!controller.signal.aborted) setSetupLoading(false)
      }
    }
    void prepare()
    return () => controller.abort()
  }, [retry])

  useEffect(() => {
    const controller = new AbortController()
    setSummary(null)
    if (!available) return () => controller.abort()
    aeroscopeApi.hotspotSummary(model, controller.signal)
      .then(data => { if (!controller.signal.aborted) setSummary(data) })
      .catch(() => { /* The filtered list remains useful if summary is unavailable. */ })
    return () => controller.abort()
  }, [available, model])

  useEffect(() => {
    const controller = new AbortController()
    setRegions(null)
    setResultsError(null)
    setLoadingResults(false)
    setSelectedRegion(null)
    if (!available) return () => controller.abort()
    setLoadingResults(true)
    aeroscopeApi.hotspotRegions(model, {
      state: stateFilter,
      clusterName: clusterFilter,
      minCells,
      minMeanAod: minAod ? Number(minAod) : undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setRegions(data) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResultsError(asMessage(error))
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingResults(false) })
    return () => controller.abort()
  }, [available, model, stateFilter, clusterFilter, minCells, minAod, page, retry])

  useEffect(() => {
    if (!available || activeRegionId === undefined) return
    const controller = new AbortController()
    setDetailError(null)
    setDetailLoading(true)
    aeroscopeApi.hotspotRegion(model, activeRegionId, controller.signal)
      .then(region => { if (!controller.signal.aborted) setSelectedRegion(region) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setDetailError(asMessage(error))
      })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false) })
    return () => controller.abort()
    // Details are refreshed only when a different region is selected.
  }, [available, model, activeRegionId])

  function resetFilters() {
    setStateFilter('')
    setClusterFilter('')
    setMinCells(1)
    setMinAod('')
    setPage(0)
  }
  function changeModel(value: Model) {
    setModel(value)
    setClusterFilter('')
    setPage(0)
  }

  const first = regions && regions.total > 0 ? regions.offset + 1 : 0
  const last = regions ? Math.min(regions.offset + regions.items.length, regions.total) : 0
  const pageCount = regions ? Math.max(1, Math.ceil(regions.total / PAGE_SIZE)) : 1

  return (
    <div className="min-h-screen bg-[#f3f6f7] text-[#112f38]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#113e48] text-xl text-white">◎</span>
            <span><strong className="block text-lg tracking-tight">AeroScope <span className="text-[#1f8979]">India</span></strong><span className="block text-[10px] tracking-[0.19em] text-slate-500">SATELLITE RESEARCH PLATFORM</span></span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link to="/explore" className="rounded-full border border-teal-200 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">India atlas</Link>
            <Link to="/compare" className="rounded-full border border-teal-200 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">Compare states</Link>
            <Link to="/models" className="rounded-full border border-teal-200 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">Model Laboratory</Link>
            <Link to="/" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50"><ArrowLeft size={15}/> Home</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-9 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Research workspace · Phase 12</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Historical hotspot explorer</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Explore precomputed connected regions of elevated aerosol-pattern clusters in India. These are historical satellite observations, not real-time pollution alerts or identified emission sources.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-900"><Activity size={15}/> 23 Aug 2022 to 5 Jun 2024</span>
        </div>

        {setupLoading && <p role="status" className="mt-6 rounded-xl bg-white p-5 text-sm text-slate-600">Checking backend research access…</p>}
        {setupError && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">Unable to reach Flask: {setupError}. Check <code className="break-all">{API_BASE}</code> and your CORS settings.</div>}
        {!setupLoading && !setupError && !available && (
          <section role="status" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <div className="flex items-start gap-3"><ShieldAlert className="mt-1 shrink-0" size={22}/><div>
              <h2 className="font-semibold">Research-result access is currently restricted</h2>
              <p className="mt-2 text-sm leading-6">{capabilities?.research_data_loaded
                ? 'The backend is online, but detailed hotspot results are not released publicly. You can still explore model definitions while redistribution permissions are reviewed.'
                : 'The backend is online, but the detailed research dataset is not installed on this server. The public website does not provide invented hotspot results.'}</p>
              <p className="mt-2 text-sm leading-6">You can test the full explorer locally with your approved research package. Keep public data restrictions enabled on Render until publication rights are confirmed.</p>
            </div></div>
          </section>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-3" aria-label="Model summary">
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><Layers size={16}/> Model</div><p className="mt-3 text-lg font-semibold">{model === 'model_a' ? 'Broad aerosol loading' : 'Seasonal behaviour'}</p><p className="mt-1 text-xs leading-5 text-slate-500">{currentModel?.cluster_count ?? (model === 'model_a' ? 4 : 5)} clusters</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><MapPin size={16}/> Qualifying regions</div><p className="mt-3 text-2xl font-semibold">{summary ? integerOrNA(summary.qualifying_regions) : 'Restricted / unavailable'}</p><p className="mt-1 text-xs text-slate-500">Total unfiltered regions in this model</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><BarChart3 size={16}/> Largest region</div><p className="mt-3 text-2xl font-semibold">{summary ? integerOrNA(summary.largest_region_cells) : 'Restricted / unavailable'}</p><p className="mt-1 text-xs text-slate-500">Grid cells, not square kilometres</p></div>
        </section>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold"><Filter size={17} className="text-teal-700"/> Filter regions</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="model-select" className="block text-xs font-semibold text-slate-600">Clustering model</label>
                  <select id="model-select" value={model} onChange={event => changeModel(event.target.value as Model)} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="model_a">Model A · Broad loading</option><option value="model_b">Model B · Seasonal patterns</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="state-select" className="block text-xs font-semibold text-slate-600">State / UT</label>
                  <select id="state-select" disabled={!available} value={stateFilter} onChange={event => { setStateFilter(event.target.value); setPage(0) }} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:opacity-50">
                    <option value="">All available states</option>
                    {states.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="cluster-select" className="block text-xs font-semibold text-slate-600">Cluster classification</label>
                  <select id="cluster-select" value={clusterFilter} onChange={event => { setClusterFilter(event.target.value); setPage(0) }} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="">All clusters</option>
                    {(currentModel?.clusters ?? []).map(cluster => <option key={cluster.cluster_id} value={cluster.name}>{cluster.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="size-select" className="block text-xs font-semibold text-slate-600">Minimum region size</label>
                  <select id="size-select" value={minCells} onChange={event => { setMinCells(Number(event.target.value)); setPage(0) }} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    {SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} grid cell{n === 1 ? '' : 's'}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="aod-select" className="block text-xs font-semibold text-slate-600">Historical mean AOD threshold</label>
                  <select id="aod-select" value={minAod} onChange={event => { setMinAod(event.target.value); setPage(0) }} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                    {AOD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button type="button" onClick={resetFilters} className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Clear filters</button>
                <button type="button" onClick={() => setRetry(n => n + 1)} className="rounded-lg border border-teal-200 px-3 py-2 text-teal-800 hover:bg-teal-50" aria-label="Retry data connection"><RefreshCw size={17}/></button>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold">{currentModel?.title ?? 'Model explanation'}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-600">{currentModel?.description ?? 'Loading cluster definitions…'}</p>
              <div className="mt-4 space-y-3">
                {(currentModel?.clusters ?? []).map(cluster => (
                  <div key={cluster.cluster_id} className="flex items-start gap-2"><span aria-hidden="true" className="mt-1 size-3 shrink-0 rounded-full" style={{ backgroundColor: cluster.color }}/><div><p className="text-xs font-semibold">{cluster.name}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{cluster.description}</p></div></div>
                ))}
              </div>
            </section>
          </aside>

          <div className="min-w-0 space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="results-heading">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 id="results-heading" className="text-lg font-semibold">Identified aerosol-pattern regions</h2><p className="mt-1 text-xs text-slate-500">{modelLabel(model)} · Sorted by region size (descending)</p></div>
                {regions && <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{first}–{last} of {regions.total.toLocaleString()}</span>}
              </div>
              {loadingResults && <p role="status" className="mt-5 text-sm text-slate-500">Loading hotspot regions…</p>}
              {resultsError && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{resultsError}</p>}
              {!available && !setupLoading && <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm leading-6 text-slate-600">No public hotspot list is shown because this deployment has not released the required research dataset.</p>}
              {regions && regions.items.length === 0 && <p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No regions match the current filters. Try lowering the AOD threshold or minimum region size.</p>}
              {regions && regions.items.length > 0 && (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {regions.items.map(region => {
                    const isSelected = selectedRegion?.region_id === region.region_id
                    return (
                      <button key={`${model}-${region.region_id}`} type="button" onClick={() => setSelectedRegion(region)} aria-pressed={isSelected}
                        className={`rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${isSelected ? 'border-teal-700 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'}`}>
                        <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Region #{region.region_id}</span><span className="inline-flex items-center gap-1 text-xs text-slate-500"><span className="size-2.5 rounded-full" style={{ backgroundColor: clusterColors.get(region.cluster_name) ?? '#64748b' }}/>{region.grid_cells.toLocaleString()} cells</span></div>
                        <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-[#123d48]">{region.cluster_name}</h3>
                        <p className="mt-2 line-clamp-2 text-xs text-slate-600">{region.states.length ? region.states.join(', ') : 'State not assigned'}</p>
                        <div className="mt-4 flex items-end justify-between"><span><span className="block text-[11px] uppercase tracking-wider text-slate-500">Mean AOD</span><strong className="text-lg">{numberOrNA(region.mean_aod)}</strong></span><span className="flex items-center gap-1 text-xs font-semibold text-teal-800">Details <ArrowRight size={14}/></span></div>
                      </button>
                    )
                  })}
                </div>
              )}
              {regions && regions.total > PAGE_SIZE && (
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  <button type="button" disabled={page === 0 || loadingResults} onClick={() => setPage(p => Math.max(0, p - 1))} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button>
                  <span className="text-xs text-slate-500">Page {page + 1} / {pageCount}</span>
                  <button type="button" disabled={page + 1 >= pageCount || loadingResults} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button>
                </div>
              )}
            </section>

            {selectedRegion && (
              <section aria-label="Selected hotspot region" className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Selected region · #{selectedRegion.region_id}</p><h2 className="mt-2 text-xl font-semibold">{selectedRegion.cluster_name}</h2></div><button type="button" aria-label="Close region details" onClick={() => setSelectedRegion(null)} className="rounded-lg p-2 hover:bg-slate-100"><X size={19}/></button></div>
                {detailLoading && <p role="status" className="mt-3 text-xs text-slate-500">Checking region details…</p>}
                {detailError && <p role="alert" className="mt-3 text-xs text-rose-800">Could not refresh details: {detailError}</p>}
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[['Grid cells', integerOrNA(selectedRegion.grid_cells)], ['Mean AOD', numberOrNA(selectedRegion.mean_aod)], ['Median valid days', numberOrNA(selectedRegion.median_valid_days, 0)]].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 text-xs leading-6 text-slate-600 sm:grid-cols-2">
                  <p><strong className="text-slate-800">Centre:</strong> {numberOrNA(selectedRegion.center.latitude, 4)}° N, {numberOrNA(selectedRegion.center.longitude, 4)}° E</p>
                  <p><strong className="text-slate-800">States:</strong> {selectedRegion.states.join(', ') || 'Not available'}</p>
                  <p><strong className="text-slate-800">High-AOD frequency:</strong> {numberOrNA(selectedRegion.mean_high_aod_frequency, 4)}</p>
                  <p><strong className="text-slate-800">Model region rank:</strong> {integerOrNA(selectedRegion.region_rank)}</p>
                </div>
                <p className="mt-4 rounded-lg bg-amber-50 p-4 text-xs leading-6 text-amber-900">The centre is a representative point, not an emission location. Bounding coordinates are not exact region polygons. AOD is not directly equivalent to PM2.5, AQI or population exposure.</p>
                <Link to="/explore" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#123d48] px-4 py-2 text-sm font-semibold text-white hover:bg-[#205863]">Open interactive atlas <ArrowRight size={15}/></Link>
              </section>
            )}
          </div>
        </div>
        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs leading-6 text-slate-500"><div className="flex items-start gap-2"><Database size={15} className="mt-1 shrink-0"/> Historical INSAT-3D AOD · MOSDAC/SAC/ISRO source attribution · Restricted publication of detailed derived data remains subject to permission. Region sizes count grid cells, not physical land area.</div></footer>
      </main>
    </div>
  )
}
