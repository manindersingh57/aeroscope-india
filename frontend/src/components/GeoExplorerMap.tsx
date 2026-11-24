import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import 'leaflet/dist/leaflet.css'

export type AtlasLayer = 'heat' | 'states' | 'mean' | 'model_a' | 'model_b'
export type StateAODStats = { name: string; meanAod: number | null; validCells?: number; coveragePercent?: number; maxCellMeanAod?: number; source: 'local-grid' | 'backend' }
export type GridCell = [number, number, number | null, number | null, number | null, string | null, number | null]
export type GridDataset = {
  schema: 'aeroscope-local-geo-v1'
  fields: string[]
  cell_step: { lat: number; lon: number }
  cells: GridCell[]
}

type Props = {
  layer: AtlasLayer
  dataset: GridDataset | null
  stateStats: Map<string, StateAODStats>
  focusedState: string
  focusRevision: number
  selection: { lat: number; lon: number } | null
  importing?: boolean
  onStateClick: (name: string, lat: number, lon: number) => void
  onMapClick: (lat: number, lon: number) => void
}

type BoundaryProps = { shapeName?: string; name?: string }
type BoundaryData = FeatureCollection<Polygon | MultiPolygon, BoundaryProps>
type StatePolygon = { name: string; path: L.Polygon; bounds: L.LatLngBounds }

const INDIA: L.LatLngBoundsExpression = [[6.0, 68.0], [37.8, 97.9]]
const A_COLORS = ['#2A9D8F', '#E9C46A', '#F4A261', '#D62828']
const B_COLORS = ['#2A9D8F', '#E9C46A', '#457B9D', '#E76F51', '#9D174D']
function formatAOD(value: number | null | undefined) { return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : 'Unavailable' }

function aodColor(value: number): string {
  // Continuous color ramp in AOD units (not PM2.5 or AQI thresholds).
  const stops: Array<[number, [number, number, number]]> = [
    [0.0, [255, 247, 200]], [0.4, [253, 217, 125]],
    [0.8, [251, 177, 92]], [1.2, [246, 130, 76]],
    [1.7, [216, 67, 74]], [2.4, [121, 36, 87]],
  ]
  if (value <= stops[0][0]) return 'rgb(255,247,200)'
  for (let i = 1; i < stops.length; i += 1) {
    const [limit, end] = stops[i]
    if (value <= limit) {
      const [beginAt, start] = stops[i - 1]
      const t = (value - beginAt) / (limit - beginAt)
      return `rgb(${start.map((v, n) => Math.round(v + (end[n] - v) * t)).join(',')})`
    }
  }
  return 'rgb(121,36,87)'
}

// Relative intensity is calculated from observed values only; these are NOT AQI thresholds.
// Contrast-adaptive color helps separate spatial variation when most mean-AOD cells
// occupy a narrow absolute range. The UI always labels this as percentile-scaled.
export function aodPercentiles(dataset: GridDataset | null): [number, number, number] | null {
  if (!dataset) return null
  const values = dataset.cells.map(c => c[2]).filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b)
  if (values.length < 3) return null
  const q = (p: number) => values[Math.min(values.length - 1, Math.floor(p * (values.length - 1)))]
  return [q(.1), q(.5), q(.9)]
}

function relativeAodColor(value: number, lower: number, upper: number): string {
  const fraction = Math.max(0, Math.min(1, (value - lower) / Math.max(.00001, upper - lower)))
  const stops: Array<[number, [number, number, number]]> = [
    [0.00, [40, 144, 155]], [0.26, [112, 199, 179]],
    [0.50, [255, 225, 124]], [0.75, [247, 143, 77]], [1.00, [175, 51, 83]],
  ]
  for (let i = 1; i < stops.length; i++) {
    if (fraction <= stops[i][0]) {
      const [endAt, end] = stops[i]
      const [startAt, start] = stops[i - 1]
      const t = (fraction - startAt) / (endAt - startAt)
      return `rgb(${start.map((v, n) => Math.round(v + (end[n] - v) * t)).join(',')})`
    }
  }
  return 'rgb(175,51,83)'
}

const STATE_DISPLAY_NAMES: Record<string, string> = {
  andhrapradesh: 'Andhra Pradesh', arunachalpradesh: 'Arunachal Pradesh', assam: 'Assam', bihar: 'Bihar',
  chandigarh: 'Chandigarh', chhattisgarh: 'Chhattisgarh', delhi: 'Delhi', goa: 'Goa', gujarat: 'Gujarat',
  haryana: 'Haryana', himachalpradesh: 'Himachal Pradesh', jammuandkashmir: 'Jammu and Kashmir',
  jharkhand: 'Jharkhand', karnataka: 'Karnataka', kerala: 'Kerala', ladakh: 'Ladakh',
  madhyapradesh: 'Madhya Pradesh', maharashtra: 'Maharashtra', manipur: 'Manipur', meghalaya: 'Meghalaya',
  mizoram: 'Mizoram', nagaland: 'Nagaland', odisha: 'Odisha', puducherry: 'Puducherry', punjab: 'Punjab',
  rajasthan: 'Rajasthan', sikkim: 'Sikkim', tamilnadu: 'Tamil Nadu', telangana: 'Telangana',
  tripura: 'Tripura', uttarpradesh: 'Uttar Pradesh', uttarakhand: 'Uttarakhand', westbengal: 'West Bengal',
  dadraandnagarhavelidamananddiu: 'Dadra and Nagar Haveli and Daman and Diu',
  andamanandnicobarislands: 'Andaman and Nicobar Islands', lakshadweep: 'Lakshadweep',
}
export function displayStateName(value: string): string {
  return STATE_DISPLAY_NAMES[normalizeStateName(value)] ?? value.trim()
}

export function normalizeStateName(value: string): string {
  const key = value.toLowerCase().normalize('NFKD')
    .replace(/\b(state|union territory|national capital territory of|nct of)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
  const aliases: Record<string, string> = {
    orissa: 'odisha', uttaranchal: 'uttarakhand', pondicherry: 'puducherry',
    tamilnadu: 'tamilnadu', jammukashmir: 'jammuandkashmir',
    andamannicobarislands: 'andamanandnicobarislands',
    nctdelhi: 'delhi', dadraandnagarhavelianddamananddiu: 'dadraandnagarhavelidamananddiu',
  }
  return aliases[key] ?? key
}

export default function GeoExplorerMap({ layer, dataset, stateStats, focusedState, focusRevision, selection, importing = false, onStateClick, onMapClick }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const boundaryRef = useRef<Map<string, StatePolygon>>(new Map())
  const baseFillRef = useRef<Map<string, L.Polygon>>(new Map())
  const currentRef = useRef({ layer, dataset, stateStats, focusedState, onStateClick, onMapClick })
  const selectedMarkerRef = useRef<L.CircleMarker | null>(null)
  const selectedHaloRef = useRef<L.CircleMarker | null>(null)
  const revealPreviousRef = useRef({ layer, dataset })
  const [revealing, setRevealing] = useState(false)
  const paintRef = useRef<() => void>(() => {})
  const frameRef = useRef<number | null>(null)
  const [ready, setReady] = useState(false)
  const [boundaryReady, setBoundaryReady] = useState(false)
  const [boundaryError, setBoundaryError] = useState<string | null>(null)
  const [hoverState, setHoverState] = useState('')

  currentRef.current = { layer, dataset, stateStats, focusedState, onStateClick, onMapClick }


  function refreshStateLayers() {
    const { layer: chosen, stateStats: summary, focusedState: selected } = currentRef.current
    const means = [...summary.values()].map(s => s.meanAod).filter((n): n is number => n !== null && Number.isFinite(n)).sort((a, b) => a - b)
    // State comparison is color-scaled to the range of observed STATE means.
    // The numerical labels remain real AOD values, never a fabricated category.
    const low = means.length ? means[Math.floor(.1 * (means.length - 1))] : 0
    const high = means.length ? means[Math.floor(.9 * (means.length - 1))] : 1
    for (const [key, polygon] of baseFillRef.current) {
      const stat = summary.get(key)
      const choropleth = chosen === 'states'
      const hasMean = stat?.meanAod != null && Number.isFinite(stat.meanAod)
      polygon.setStyle({
        color: '#dee9e5', weight: .45, opacity: .8,
        fillColor: choropleth && hasMean ? relativeAodColor(stat.meanAod!, low, high) : '#e4ebe8',
        fillOpacity: choropleth ? (hasMean ? .95 : .86) : .96,
      })
    }
    for (const [key, entry] of boundaryRef.current) {
      const highlighted = key === normalizeStateName(selected)
      const hovered = key === normalizeStateName(hoverStateRef.current)
      entry.path.setStyle({
        fillColor: '#10b99e',
        fillOpacity: hovered ? .16 : highlighted ? .10 : .001,
        color: hovered ? '#008f7b' : highlighted ? '#098c78' : '#fafffd',
        weight: hovered ? 3.1 : highlighted ? 2.6 : .8,
        opacity: 1,
      })
      if (hovered) entry.path.bringToFront()
    }
  }
  const hoverStateRef = useRef('')
  // Reveal real grid colors only when a user changes layers or loads new data.
  // The map and its controls remain interactive during the decorative sweep.
  useEffect(() => {
    const previous = revealPreviousRef.current
    revealPreviousRef.current = { layer, dataset }
    if (!dataset?.cells.length || (previous.layer === layer && previous.dataset === dataset)) return
    setRevealing(false)
    const frame = requestAnimationFrame(() => setRevealing(true))
    const done = window.setTimeout(() => setRevealing(false), 760)
    return () => { cancelAnimationFrame(frame); window.clearTimeout(done) }
  }, [layer, dataset])

  useEffect(() => {
    if (!hostRef.current) return
    const map = L.map(hostRef.current, {
      zoomControl: false, attributionControl: false, minZoom: 3, maxZoom: 10,
      zoomSnap: 0.25, scrollWheelZoom: false, preferCanvas: false,
      maxBounds: [[4.5, 65.0], [39.5, 100.0]], maxBoundsViscosity: 0.9,
    })
    mapRef.current = map
    map.fitBounds(INDIA, { padding: [22, 22], animate: false })
    map.createPane('as-state-base').style.zIndex = '410'
    map.createPane('as-geodata').style.zIndex = '420'
    map.createPane('as-state-outline').style.zIndex = '450'
    const canvas = L.DomUtil.create('canvas', 'ag-grid-canvas', map.getPane('as-geodata')) as HTMLCanvasElement
    canvas.style.pointerEvents = 'none'
    canvas.style.position = 'absolute'
    canvasRef.current = canvas

    function schedulePaint() {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = requestAnimationFrame(() => { frameRef.current = null; paintRef.current() })
    }
    map.on('moveend zoomend resize viewreset', schedulePaint)
    map.on('click', (event: L.LeafletMouseEvent) => currentRef.current.onMapClick(event.latlng.lat, event.latlng.lng))

    let cancelled = false
    const controller = new AbortController()
    async function loadBoundaries() {
      try {
        const response = await fetch('/data/india-states.geojson', { signal: controller.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const geojson = await response.json() as BoundaryData
        if (!Array.isArray(geojson.features) || !geojson.features.length) throw new Error('Boundary file is empty')
        if (cancelled) return
        L.geoJSON(geojson, {
          pane: 'as-state-base',
          interactive: false, // Only the outline layer handles hover: prevents duplicate popups.
          style: { color: '#cbd9d5', weight: .65, fillColor: '#cddbd6', fillOpacity: .72 },
          onEachFeature(feature, polygon) {
            if (!(polygon instanceof L.Polygon)) return
            const name = displayStateName(String(feature.properties?.shapeName ?? feature.properties?.name ?? ''))
            if (name) baseFillRef.current.set(normalizeStateName(name), polygon)
          },
        }).addTo(map)
        L.geoJSON(geojson, {
          pane: 'as-state-outline',
          style: () => ({ color: '#ffffff', weight: 1.05, opacity: 1, fillColor: '#ffffff', fillOpacity: 0.001 }),
          onEachFeature(feature, polygon) {
            if (!(polygon instanceof L.Polygon)) return
            const name = displayStateName(String(feature.properties?.shapeName ?? feature.properties?.name ?? ''))
            if (!name) return
            const item: StatePolygon = { name, path: polygon, bounds: polygon.getBounds() }
            boundaryRef.current.set(normalizeStateName(name), item)
            polygon.on('mouseover', () => {
              hoverStateRef.current = name
              setHoverState(name)
              polygon.setStyle({ fillOpacity: .18, fillColor: '#17b799', color: '#008e79', weight: 3.7 })
              polygon.bringToFront()
            })
            polygon.on('mouseout', () => {
              hoverStateRef.current = ''
              setHoverState('')
              refreshStateLayers()
            })
            polygon.on('click', (event: L.LeafletMouseEvent) => {
              L.DomEvent.stopPropagation(event.originalEvent)
              currentRef.current.onStateClick(name, event.latlng.lat, event.latlng.lng)
            })
          },
        }).addTo(map)
        setBoundaryReady(true)
        setBoundaryError(null)
        refreshStateLayers()
        schedulePaint()
      } catch (error) {
        if (!cancelled && !controller.signal.aborted) {
          setBoundaryError(error instanceof Error ? error.message : 'Unknown error')
        }
      }
    }
    void loadBoundaries()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
      map.invalidateSize({ pan: false })
      schedulePaint()
    }) : undefined
    if (hostRef.current) observer?.observe(hostRef.current)
    const initFrame = requestAnimationFrame(() => {
      if (cancelled) return
      map.invalidateSize({ pan: false })
      map.fitBounds(INDIA, { padding: [22, 22], animate: false })
      schedulePaint()
    })
    setReady(true)

    return () => {
      cancelled = true
      controller.abort()
      observer?.disconnect()
      cancelAnimationFrame(initFrame)
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      map.remove()
      mapRef.current = null
      canvasRef.current = null
      boundaryRef.current.clear()
      baseFillRef.current.clear()
    }
  }, [])

  paintRef.current = () => {
    const map = mapRef.current
    const canvas = canvasRef.current
    if (!map || !canvas) return
    const size = map.getSize()
    if (size.x < 1 || size.y < 1) return
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(size.x * ratio)
    canvas.height = Math.round(size.y * ratio)
    canvas.style.width = `${size.x}px`
    canvas.style.height = `${size.y}px`
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.clearRect(0, 0, size.x, size.y)
    const { dataset: grid, layer: chosen, focusedState: state } = currentRef.current
    if (!grid?.cells.length || chosen === 'states') return
    const stepLat = grid.cell_step.lat
    const stepLon = grid.cell_step.lon
    const width = Math.max(1, Math.min(80, Math.abs(map.latLngToContainerPoint([20, 80 + stepLon / 2]).x - map.latLngToContainerPoint([20, 80 - stepLon / 2]).x)))
    const visible = map.getBounds().pad(.1)
    const normalizedFilter = normalizeStateName(state)
    const percentiles = chosen === 'heat' ? aodPercentiles(grid) : null

    // The smooth heatmap is actually blended; the detailed grid keeps measured,
    // absolute AOD per pixel. A separate validity mask stops color leaking into
    // geographic cells that have NO observations.
    const offscreen = (chosen === 'heat') ? document.createElement('canvas') : null
    const mask = (chosen === 'heat') ? document.createElement('canvas') : null
    if (offscreen) { offscreen.width = canvas.width; offscreen.height = canvas.height }
    if (mask) { mask.width = canvas.width; mask.height = canvas.height }
    const colorCtx = offscreen?.getContext('2d') ?? ctx
    const maskCtx = mask?.getContext('2d')
    if (offscreen) colorCtx.scale(ratio, ratio)
    if (maskCtx) { maskCtx.scale(ratio, ratio); maskCtx.fillStyle = '#fff' }

    for (const cell of grid.cells) {
      const [lat, lon, aod, rankA, rankB, cellState] = cell
      if (!visible.contains([lat, lon])) continue
      let color: string | null = null
      if (chosen === 'heat' && aod !== null && percentiles) {
        color = relativeAodColor(aod, percentiles[0], percentiles[2])
      } else if (chosen === 'mean' && aod !== null) {
        color = aodColor(aod)
      } else if (chosen === 'model_a' || chosen === 'model_b') {
        const rank = chosen === 'model_a' ? rankA : rankB
        const palette = chosen === 'model_a' ? A_COLORS : B_COLORS
        color = rank === null ? null : palette[rank] ?? null
      }
      // Missing AOD and non-eligible model cells are intentionally NOT painted.
      if (!color) continue
      const center = map.latLngToContainerPoint([lat, lon])
      const top = map.latLngToContainerPoint([lat + stepLat / 2, lon]).y
      const bottom = map.latLngToContainerPoint([lat - stepLat / 2, lon]).y
      const height = Math.max(1, Math.min(80, Math.abs(bottom - top)))
      const dim = Boolean(normalizedFilter && normalizeStateName(cellState ?? '') !== normalizedFilter)
      colorCtx.globalAlpha = dim ? .18 : 1
      colorCtx.fillStyle = color
      // Tiny overlap prevents fake white hairlines from subpixel raster rounding.
      colorCtx.fillRect(center.x - width / 2, center.y - height / 2, width + .6, height + .6)
      if (maskCtx) {
        maskCtx.fillRect(center.x - width / 2, center.y - height / 2, width + .6, height + .6)
      }
    }
    colorCtx.globalAlpha = 1
    if (offscreen && mask) {
      ctx.save()
      ctx.filter = 'blur(4px)'
      ctx.drawImage(offscreen, 0, 0, size.x, size.y)
      ctx.restore()
      // Preserve the actual observed-cell footprint, not a guessed pollutant field.
      ctx.save()
      ctx.globalCompositeOperation = 'destination-in'
      ctx.drawImage(mask, 0, 0, size.x, size.y)
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  useEffect(() => { if (ready) paintRef.current() }, [layer, dataset, focusedState, ready])
  useEffect(() => { if (ready && boundaryReady) refreshStateLayers() }, [layer, stateStats, focusedState, ready, boundaryReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !boundaryReady) return
    const normalized = normalizeStateName(focusedState)
    refreshStateLayers()
    if (!normalized) {
      map.flyToBounds(INDIA, { padding: [22, 22], duration: 0.7 })
      return
    }
    const entry = boundaryRef.current.get(normalized)
    if (entry) map.flyToBounds(entry.bounds, { padding: [35, 35], maxZoom: 7.2, duration: 0.75 })
  }, [focusedState, focusRevision, ready, boundaryReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    selectedMarkerRef.current?.remove()
    selectedHaloRef.current?.remove()
    if (!selection) return
    const halo = L.circleMarker([selection.lat, selection.lon], {
      radius: 12, color: '#17a892', weight: 2.5, opacity: 0.65,
      fillColor: '#34c9ad', fillOpacity: 0.15, interactive: false,
      className: 'ag-selection-halo',
    }).addTo(map)
    const marker = L.circleMarker([selection.lat, selection.lon], {
      radius: 6, color: '#fff', weight: 2, fillColor: '#144c47', fillOpacity: 1,
    }).addTo(map)
    selectedHaloRef.current = halo
    selectedMarkerRef.current = marker
    return () => {
      marker.remove()
      halo.remove()
      if (selectedMarkerRef.current === marker) selectedMarkerRef.current = null
      if (selectedHaloRef.current === halo) selectedHaloRef.current = null
    }
  }, [selection, ready])

  return (
    <section className={`ag-map-shell ${revealing ? 'is-revealing' : ''}`} aria-label="Interactive India satellite aerosol map" aria-busy={importing}>
      <div ref={hostRef} className={`ag-map-canvas ${layer === 'heat' ? 'ag-heatmap-mode' : ''}`} />
      {revealing && <div className="ag-map-reveal" aria-hidden="true" />}
      {importing && <div className="ag-map-importing" role="status"><span className="ag-detail-spinner" /> Loading your private research grid…</div>}
      <div className="ag-map-toplabel">
        <span className="ag-map-pulse" />
        <span>{layer === 'heat' ? 'RELATIVE AOD HEATMAP' : layer === 'states' ? 'STATE-WISE MEAN AOD' : layer === 'mean' ? 'DETAILED AOD GRID' : layer === 'model_a' ? 'MODEL A · FOUR CLUSTERS' : 'MODEL B · FIVE CLUSTERS'}</span>
      </div>
      <div className="ag-map-zoom">
        <button type="button" onClick={() => mapRef.current?.zoomIn()} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => mapRef.current?.zoomOut()} aria-label="Zoom out">−</button>
        <button type="button" className="ag-zoom-home" onClick={() => mapRef.current?.flyToBounds(INDIA, { duration: 0.65, padding: [22, 22] })} aria-label="Fit India">⌖</button>
      </div>
      {hoverState && <div className="ag-state-hover-card" role="status">
        <span className="ag-hover-eyebrow">STATE AEROSOL PROFILE</span>
        <strong>{hoverState}</strong>
        <div className="ag-hover-metrics">
          <div><span>Mean AOD</span><b>{formatAOD(stateStats.get(normalizeStateName(hoverState))?.meanAod)}</b></div>
          <div><span>{stateStats.get(normalizeStateName(hoverState))?.coveragePercent != null ? 'Valid coverage' : 'Valid cells'}</span><b>{stateStats.get(normalizeStateName(hoverState))?.coveragePercent != null ? `${stateStats.get(normalizeStateName(hoverState))?.coveragePercent?.toFixed(1)}%` : stateStats.get(normalizeStateName(hoverState))?.validCells?.toLocaleString('en-IN') ?? '—'}</b></div>
        </div>
        <small>{stateStats.has(normalizeStateName(hoverState)) ? 'Historical INSAT-3D aerosol data · not AQI' : 'Load local research grid to see historical AOD'}</small>
      </div>}
      <div className="ag-missing-key"><i/> Pale grey = no mapped value</div>
      <div className="ag-map-footer">
        <span>{displayStateName(hoverState || focusedState || 'India · national view')}</span>
        <span>{dataset ? `${dataset.cells.length.toLocaleString()} local grid cells` : 'Boundaries only · load the private grid for detailed layers'}</span>
      </div>
      {boundaryError && <div role="alert" className="ag-map-warning">India boundaries unavailable: {boundaryError}. Run <code>python tools/fetch_india_states.py</code>.</div>}
      {(!dataset && (layer !== 'states' || stateStats.size === 0)) && <div className="ag-map-no-grid"><strong>Ready for your scientific maps</strong><span>Load the local research grid to render the real AOD and cluster layers.</span></div>}
    </section>
  )
}
