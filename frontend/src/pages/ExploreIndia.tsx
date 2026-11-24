import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight, CalendarDays, Check, ChevronDown, CircleAlert, Compass, Database,
  FileJson2, Layers3, LocateFixed, MapPinned, RotateCcw, ScanLine,
  Satellite, Search, ShieldCheck, SlidersHorizontal, Sparkles, Upload, Map as MapIcon, Flame,
} from 'lucide-react'
import GeoExplorerMap, { aodPercentiles, normalizeStateName, type AtlasLayer, type GridCell, type GridDataset, type StateAODStats } from '../components/GeoExplorerMap'
import { aeroscopeApi, type Capabilities } from '../lib/aeroscopeApi'
import type { LayerCatalogue, LocationResult } from '../lib/mapTypes'
import type { StateProfile, StateSummary } from '../lib/regionalTypes'
import '../styles/aeroscope-geo.css'

const LAYERS: Array<{ key: AtlasLayer; title: string; subtitle: string; icon: typeof Layers3 }> = [
  { key: 'heat', title: 'AOD Heatmap', subtitle: 'Smoothed, relative intensity', icon: Flame },
  { key: 'states', title: 'State AOD Map', subtitle: 'Compare state-level means', icon: MapIcon },
  { key: 'mean', title: 'Detailed Grid', subtitle: 'Original mean AOD cells', icon: ScanLine },
  { key: 'model_a', title: 'Model A · K=4', subtitle: 'Broad loading patterns', icon: Layers3 },
  { key: 'model_b', title: 'Model B · K=5', subtitle: 'Seasonal aerosol patterns', icon: CalendarDays },
]

const MODEL_A = [
  { name: 'Lower Aerosol Loading', color: '#2A9D8F' },
  { name: 'Moderate Aerosol Loading', color: '#E9C46A' },
  { name: 'Elevated and Variable Loading', color: '#F4A261' },
  { name: 'Frequent Elevated Loading', color: '#D62828' },
]
const MODEL_B = [
  { name: 'Lower Seasonal Loading', color: '#2A9D8F' },
  { name: 'Moderate Pre-monsoon Leaning', color: '#E9C46A' },
  { name: 'Monsoon-Dominant Loading', color: '#457B9D' },
  { name: 'Strong Pre-monsoon Peak', color: '#E76F51' },
  { name: 'Elevated Across Seasons', color: '#9D174D' },
]
const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra',
  'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal',
]

function formatNum(value: number | null | undefined, decimals = 3) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(decimals) : '—'
}
function isLayer(value: string | null): value is AtlasLayer {
  return value === 'heat' || value === 'states' || value === 'mean' || value === 'model_a' || value === 'model_b'
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Request failed'
}
function parseGrid(source: unknown): GridDataset {
  if (!source || typeof source !== 'object') throw new Error('Invalid local grid file')
  const obj = source as Partial<GridDataset>
  if (obj.schema !== 'aeroscope-local-geo-v1' || !Array.isArray(obj.cells) || !obj.cell_step) {
    throw new Error('Use the JSON created by tools/export_geoexplorer_local.py')
  }
  if (obj.cells.length > 200_000) throw new Error('Unexpectedly large grid file')
  if (!(obj.cell_step.lat > 0 && obj.cell_step.lat < 1 && obj.cell_step.lon > 0 && obj.cell_step.lon < 1)) {
    throw new Error('Invalid geographic grid resolution')
  }
  // Validate every row before drawing it. These are private *local* research results.
  for (const row of obj.cells) {
    if (!Array.isArray(row) || row.length !== 7 ||
      typeof row[0] !== 'number' || !Number.isFinite(row[0]) ||
      typeof row[1] !== 'number' || !Number.isFinite(row[1]) ||
      row[0] < 4 || row[0] > 40 || row[1] < 65 || row[1] > 100 ||
      ![2, 3, 4].every(i => row[i] === null || (typeof row[i] === 'number' && Number.isFinite(row[i]))) ||
      !(row[5] === null || typeof row[5] === 'string')) {
      throw new Error('Invalid values in grid cells. Re-export from the verified local Parquet file.')
    }
  }
  return obj as GridDataset
}

export default function ExploreIndia() {
  const [params, setParams] = useSearchParams()
  const [layer, setLayer] = useState<AtlasLayer>(() => isLayer(params.get('layer')) ? params.get('layer') as AtlasLayer : 'heat')
  const [regionInput, setRegionInput] = useState(params.get('state') ?? '')
  const [focusedState, setFocusedState] = useState(params.get('state') ?? '')
  const [focusRevision, setFocusRevision] = useState(0)
  const [dataset, setDataset] = useState<GridDataset | null>(null)
  const [fileError, setFileError] = useState('')
  const [fileLoading, setFileLoading] = useState(false)
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [legends, setLegends] = useState<LayerCatalogue | null>(null)
  const [apiStateSummaries, setApiStateSummaries] = useState<StateSummary[]>([])
  const [apiError, setApiError] = useState('')
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lon: number } | null>(null)
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [stateProfile, setStateProfile] = useState<StateProfile | null>(null)
  const [stateLoading, setStateLoading] = useState(false)
  const [stateError, setStateError] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  const allowed = Boolean(capabilities?.research_data_loaded && capabilities.research_results_available)
  // Mean AOD by state is calculated only from real, locally imported grid cells.
  // It is the unweighted average of grid-cell historical mean AOD, not AQI or PM2.5.
  const stateStats = useMemo(() => {
    const result = new Map<string, StateAODStats>()
    if (dataset) {
      const totals = new Map<string, { name: string; sum: number; count: number; max: number }>()
      for (const cell of dataset.cells) {
        const [,, aod,,, name] = cell
        if (!name || aod === null) continue
        const key = normalizeStateName(name)
        const prev = totals.get(key) ?? { name, sum: 0, count: 0, max: Number.NEGATIVE_INFINITY }
        prev.sum += aod
        prev.count += 1
        prev.max = Math.max(prev.max, aod)
        totals.set(key, prev)
      }
      for (const [key, val] of totals) result.set(key, {
        name: val.name, meanAod: val.sum / val.count, validCells: val.count,
        maxCellMeanAod: val.max, source: 'local-grid',
      })
    }
    // Authoritative backend summaries override local aggregation when permitted.
    for (const state of apiStateSummaries) result.set(normalizeStateName(state.state), {
      name: state.state, meanAod: state.mean_aod, validCells: state.valid_aod_cells,
      coveragePercent: state.valid_aod_percent, source: 'backend',
    })
    return result
  }, [dataset, apiStateSummaries])

  useEffect(() => {
    if (!allowed) { setApiStateSummaries([]); return }
    const controller = new AbortController()
    aeroscopeApi.stateSummaries(controller.signal)
      .then(states => { if (!controller.signal.aborted) setApiStateSummaries(states) })
      .catch(() => { /* Local-only state information remains available. */ })
    return () => controller.abort()
  }, [allowed])
  const selectedLocalCell = useMemo((): GridCell | null => {
    if (!selectedPoint || !dataset) return null
    let best: GridCell | null = null
    let minimum = Number.POSITIVE_INFINITY
    for (const row of dataset.cells) {
      const distance = ((row[0] - selectedPoint.lat) ** 2) +
        ((row[1] - selectedPoint.lon) * Math.cos(selectedPoint.lat * Math.PI / 180)) ** 2
      if (distance < minimum) { minimum = distance; best = row }
    }
    return best && minimum < 0.1 ** 2 ? best : null
  }, [selectedPoint, dataset])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([aeroscopeApi.capabilities(controller.signal), aeroscopeApi.layers(controller.signal)])
      .then(([caps, details]) => { if (!controller.signal.aborted) { setCapabilities(caps); setLegends(details) } })
      .catch((error: unknown) => { if (!controller.signal.aborted) setApiError(errorMessage(error)) })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setStateProfile(null)
    setStateError('')
    if (!focusedState || !allowed) return () => controller.abort()
    setStateLoading(true)
    aeroscopeApi.stateProfile(focusedState, controller.signal)
      .then(result => { if (!controller.signal.aborted) setStateProfile(result) })
      .catch((error: unknown) => { if (!controller.signal.aborted) setStateError(errorMessage(error)) })
      .finally(() => { if (!controller.signal.aborted) setStateLoading(false) })
    return () => controller.abort()
  }, [focusedState, allowed])

  useEffect(() => {
    const controller = new AbortController()
    setLocation(null)
    if (!selectedPoint || !allowed) return () => controller.abort()
    setLocationLoading(true)
    aeroscopeApi.location(selectedPoint.lat, selectedPoint.lon, controller.signal)
      .then(result => { if (!controller.signal.aborted) setLocation(result) })
      .catch(() => { /* Local in-memory grid remains usable when the Flask API is unavailable. */ })
      .finally(() => { if (!controller.signal.aborted) setLocationLoading(false) })
    return () => controller.abort()
  }, [selectedPoint, allowed])

  function chooseLayer(next: AtlasLayer) {
    setLayer(next)
    setParams(old => { const updated = new URLSearchParams(old); updated.set('layer', next); return updated }, { replace: true })
  }
  function chooseState(next: string) {
    setFocusedState(next)
    setRegionInput(next)
    setFocusRevision(v => v + 1)
    setParams(old => { const updated = new URLSearchParams(old); if (next) updated.set('state', next); else updated.delete('state'); return updated }, { replace: true })
  }
  function submitState(event: FormEvent<HTMLFormElement>) { event.preventDefault(); chooseState(regionInput.trim()) }
  async function loadLocalFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setFileError('')
    if (file.size > 40_000_000) { setFileError('File is too large. Use the supplied export script.'); return }
    setFileLoading(true)
    try {
      const parsed = parseGrid(JSON.parse(await file.text()) as unknown)
      setDataset(parsed)
    } catch (error) { setFileError(errorMessage(error)) }
    finally { setFileLoading(false) }
  }

  const heatQuantiles = useMemo(() => aodPercentiles(dataset), [dataset])
  const stateColorRange = useMemo(() => {
    const means = [...stateStats.values()].map(s => s.meanAod).filter((v): v is number => v !== null && Number.isFinite(v)).sort((a,b) => a-b)
    return means.length ? [means[Math.floor(.1 * (means.length-1))], means[Math.floor(.9 * (means.length-1))]] : null
  }, [stateStats])
  const modelLegend = layer === 'model_a' || layer === 'model_b' ? legends?.layers[layer] ?? null : null
  const fallbackLegend = layer === 'model_a' ? MODEL_A : MODEL_B
  const palette = modelLegend?.clusters?.length
    ? [...modelLegend.clusters].sort((a, b) => a.rank - b.rank).map(c => ({ name: c.name, color: c.color }))
    : fallbackLegend
  const localModelRank = selectedLocalCell ? (layer === 'model_a' ? selectedLocalCell[3] : layer === 'model_b' ? selectedLocalCell[4] : null) : null
  const apiProfile = location?.profile
  const clusterName = layer !== 'model_a' && layer !== 'model_b' ? null : apiProfile?.[layer]?.cluster_name ??
    (localModelRank === null ? null : palette[localModelRank]?.name ?? null)

  return (
    <div className="ag-explorer">
      <div className="ag-heading">
        <div>
          <span className="ag-eyebrow"><Satellite size={14} /> SATELLITE INTELLIGENCE / GEOSPATIAL ATLAS</span>
          <h1>Geo <span>Explorer.</span></h1>
          <p>Explore historical aerosol loading with an interactive heatmap, state-level comparisons and both verified clustering models.</p>
        </div>
        <div className="ag-head-meta">
          <span><span className="ag-dot"/> HISTORICAL · 2022–2024</span>
          <Link to="/cluster-insights">View cluster insights <ArrowUpRight size={15}/></Link>
        </div>
      </div>

      <div className="ag-workspace">
        <aside className="ag-sidebar">
          <section className="ag-card ag-layer-card">
            <div className="ag-card-title"><div><span className="ag-card-index">01 / EXPLORE</span><h2>Choose a map layer</h2></div><Layers3 size={18}/></div>
            <p className="ag-card-desc">Choose how to display the same historical research data.</p>
            <div className="ag-layers" role="radiogroup" aria-label="Scientific map layer">
              {LAYERS.map(item => {
                const Icon = item.icon
                return <button key={item.key} type="button" role="radio" aria-checked={layer === item.key}
                  className={`ag-layer-button ${layer === item.key ? 'is-active' : ''}`}
                  onClick={() => chooseLayer(item.key)}>
                  <span className={`ag-layer-icon ag-icon-${item.key}`}><Icon size={18}/></span>
                  <span className="ag-layer-copy"><strong>{item.title}</strong><small>{item.subtitle}</small></span>
                  <span className="ag-layer-check">{layer === item.key && <Check size={13}/>}</span>
                </button>
              })}
            </div>
          </section>

          <section className="ag-card ag-region-card">
            <div className="ag-card-title"><div><span className="ag-card-index">02 / FOCUS</span><h2>State details</h2></div><Compass size={18}/></div>
            <form onSubmit={submitState} className="ag-state-form">
              <label htmlFor="ag-state">Search Indian state</label>
              <div className="ag-search-field"><Search size={16}/><input id="ag-state" list="ag-state-list" value={regionInput}
                onChange={event => setRegionInput(event.target.value)} placeholder="e.g. Punjab, Delhi…"/>
                <datalist id="ag-state-list">{STATES.map(state => <option key={state} value={state}/>)}</datalist>
              </div>
              <div className="ag-field-actions"><button type="submit" className="ag-focus-btn"><MapPinned size={15}/> Focus region</button>
                <button type="button" className="ag-reset-btn" onClick={() => chooseState('')} title="Reset to India"><RotateCcw size={16}/></button></div>
            </form>
            <div className="ag-region-profile">
              <span className="ag-smalllabel">SELECTED REGION</span>
              <strong>{focusedState || 'All India'}</strong>
              {stateLoading ? <div className="ag-loading-values" role="status" aria-label="Loading regional analysis"><span className="ag-shimmer-line"/><span className="ag-shimmer-line short"/></div>
                : stateProfile ? <div key={focusedState} className="ag-mini-stats ag-details-enter">
                    <div><span>Mean AOD</span><strong>{formatNum(stateProfile.aerosol.mean_aod)}</strong></div>
                    <div><span>Valid coverage</span><strong>{formatNum(stateProfile.coverage.valid_aod_percent, 1)}%</strong></div>
                  </div>
                : focusedState && stateStats.get(normalizeStateName(focusedState)) ? <div className="ag-mini-stats ag-details-enter">
                  <div><span>Mean AOD · grid cells</span><strong>{formatNum(stateStats.get(normalizeStateName(focusedState))?.meanAod)}</strong></div>
                  <div><span>Valid grid cells</span><strong>{stateStats.get(normalizeStateName(focusedState))?.validCells?.toLocaleString('en-IN') ?? '—'}</strong></div>
                </div>
                : focusedState && allowed && stateError ? <span className="ag-muted">{stateError}</span>
                : <span className="ag-muted">Hover a state on the map to see its historical mean AOD. Click to focus.</span>}
            </div>
          </section>

          <section className="ag-card ag-legend-card">
            <div className="ag-card-title"><div><span className="ag-card-index">03 / INTERPRET</span><h2>Legend & research data</h2></div><SlidersHorizontal size={18}/></div>
            {layer === 'mean' || layer === 'heat' || layer === 'states' ? <div className="ag-ramp-wrap">
              <div className={`ag-ramp ${layer === 'heat' || layer === 'states' ? 'ag-relative-ramp' : ''}`}/>
              <div className="ag-ramp-ticks">
                {layer === 'heat' ? <><span>{heatQuantiles ? heatQuantiles[0].toFixed(2) : 'P10'}</span><span>{heatQuantiles ? heatQuantiles[1].toFixed(2) : 'Median'}</span><span>{heatQuantiles ? heatQuantiles[2].toFixed(2) : 'P90'}</span></>
                  : layer === 'states' ? <><span>{stateColorRange ? stateColorRange[0].toFixed(2) : 'Lower'}</span><span>State means</span><span>{stateColorRange ? stateColorRange[1].toFixed(2) : 'Higher'}</span></>
                  : <><span>0.0</span><span>0.8</span><span>1.7</span><span>2.4+</span></>}
              </div>
              <p>{layer === 'states' ? 'Relative colors among available state mean AOD values. Hover for actual numbers.' : layer === 'heat' ? 'Smoothed map of REAL mean AOD values; color contrast is scaled between observed P10 and P90 (not health thresholds).' : 'Absolute historical mean AOD for each eligible grid cell (unitless).'}</p>
              <div className="ag-legend-missing"><i/> Pale grey = missing / insufficient mapped data</div>
            </div> : <div className="ag-legend-list">
              {palette.map(item => <div key={item.name} className="ag-legend-item"><i style={{ background: item.color }}/><span>{item.name}</span></div>)}
              <div className="ag-legend-item"><i style={{ background: '#cbd9d6' }}/><span>Insufficient data</span></div>
            </div>}
            <div className="ag-load-section">
              <div className="ag-local-title"><Database size={15}/><span>Private research grid</span>{dataset && <Check size={15} className="ag-ok"/>}</div>
              <p>{dataset ? `${dataset.cells.length.toLocaleString('en-IN')} local study cells loaded. None are uploaded.`
                : 'Load the locally exported grid once to color all three real maps.'}</p>
              <input ref={inputRef} type="file" className="ag-visually-hidden" accept=".json,application/json" onChange={event => { void loadLocalFile(event) }} aria-label="Load local research grid"/>
              <button type="button" className="ag-upload-btn" onClick={() => inputRef.current?.click()} disabled={fileLoading}>
                {dataset ? <FileJson2 size={15}/> : <Upload size={15}/>} {fileLoading ? 'Reading file…' : dataset ? 'Replace local grid' : 'Load local research grid'}
                <ArrowUpRight size={14}/>
              </button>
              {fileError && <p className="ag-error" role="alert">{fileError}</p>}
            </div>
          </section>
        </aside>

        <div className="ag-map-column">
          <section className="ag-card ag-primary-map">
            <div className="ag-map-head">
              <div key={layer} className="ag-map-title-enter"><span className="ag-card-index">INDIA / SPATIAL DISTRIBUTION</span>
                <h2>{layer === 'heat' ? 'Historical AOD Heatmap' : layer === 'states' ? 'State-Wise Aerosol Loading' : layer === 'mean' ? 'Detailed Mean AOD Grid' : layer === 'model_a' ? 'Broad Aerosol Patterns' : 'Seasonal Aerosol Patterns'}</h2>
                <p>{layer === 'heat' ? 'Smoothed historical AOD; relative color scale based on observed grid values' : layer === 'states' ? 'State means with relative color contrast; hover for actual AOD values' : layer === 'mean' ? 'Actual historical mean AOD for each valid satellite grid cell'
                  : layer === 'model_a' ? 'Four unsupervised loading-pattern classes · K = 4'
                  : 'Five seasonal aerosol-behaviour classes · K = 5'}</p></div>
              <div className="ag-map-pill"><span className="ag-map-pill-dot"/>{dataset ? 'LOCAL GRID LOADED' : 'MAP READY'}</div>
            </div>
            <GeoExplorerMap layer={layer} dataset={dataset} stateStats={stateStats} focusedState={focusedState}
              focusRevision={focusRevision} selection={selectedPoint} importing={fileLoading}
              onStateClick={(name, lat, lon) => { chooseState(name); setSelectedPoint({ lat, lon }) }}
              onMapClick={(lat, lon) => { setSelectedPoint({ lat, lon }) }} />
            <div className="ag-map-caption"><span><ShieldCheck size={15}/> Historic INSAT-3D AOD, not live AQI or PM2.5</span>
              <span>Hover to highlight + read mean AOD · Click to inspect</span></div>
          </section>
          <section className={`ag-card ag-inspection ${locationLoading ? 'is-inspecting' : ''}`} aria-busy={locationLoading}>
            <div className="ag-inspection-title"><div><span className="ag-card-index">INSTANT INSPECTION</span><h2>Location intelligence</h2></div><LocateFixed size={19}/></div>
            {selectedPoint ? <div key={`${layer}-${selectedPoint.lat.toFixed(4)}-${selectedPoint.lon.toFixed(4)}-${locationLoading ? 'loading' : 'ready'}`} className="ag-inspection-results ag-details-enter">
              <div><span>SELECTED COORDINATES</span><strong>{selectedPoint.lat.toFixed(3)}° N, {selectedPoint.lon.toFixed(3)}° E</strong></div>
              <div><span>MEAN HISTORICAL AOD</span><strong>{formatNum(apiProfile?.aerosol.mean_aod ?? selectedLocalCell?.[2])}</strong></div>
              <div><span>VALID OBSERVATION DAYS</span><strong>{apiProfile?.aerosol.valid_days ?? selectedLocalCell?.[6] ?? '—'}</strong></div>
              <div><span>{layer === 'model_a' || layer === 'model_b' ? 'SELECTED PATTERN' : 'LOCATION'}</span><strong>{layer === 'model_a' || layer === 'model_b' ? clusterName ?? 'Insufficient data' : apiProfile?.state_name ?? selectedLocalCell?.[5] ?? '—'}</strong></div>
            </div> : <p className="ag-inspection-empty"><MapPinned size={20}/> Click anywhere on the India map to inspect the nearest available research grid cell.</p>}
            {locationLoading && <div className="ag-detail-fetch" role="status"><span className="ag-detail-spinner"/> Retrieving verified location details…</div>}
            {apiError && <p className="ag-api-warning"><CircleAlert size={14}/> Local API unavailable. Private imported grid can still display all three maps.</p>}
          </section>
        </div>
      </div>
      <div className="ag-footnote"><Sparkles size={13}/> State shading and heatmaps represent historical AOD, not health or regulatory pollution categories. Private grid data is loaded only in this browser session. <ChevronDown size={13}/></div>
    </div>
  )
}
