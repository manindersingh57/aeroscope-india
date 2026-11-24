import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import 'leaflet/dist/leaflet.css'
import './AeroMap.css'
import type { HotspotFeature, ModelLegend } from '../lib/mapTypes'

const BOUNDARIES_URL = '/data/india-states.geojson'
const TILE_URL = import.meta.env.VITE_RASTER_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const INDIA_BOUNDS: L.LatLngBoundsExpression = [[6, 68], [37.6, 97.8]]

type BoundaryProps = { shapeName: string; shapeISO?: string }
type StateCollection = FeatureCollection<Polygon | MultiPolygon, BoundaryProps>
type StateEntry = { name: string; layer: L.Path; bounds: L.LatLngBounds }

type Props = {
  features: HotspotFeature[]
  legend: ModelLegend | null
  selectedCoordinates: { lat: number; lon: number } | null
  focusState: string
  focusRevision: number
  onStateSelect: (name: string) => void
  onCoordinateClick: (lat: number, lon: number) => void
  onHotspotClick: (hotspot: HotspotFeature) => void
}

function normalizeState(value: string): string {
  const k = value.toLowerCase().normalize('NFKD')
    .replace(/\b(state|union territory|nct of|national capital territory of)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
  const aliases: Record<string, string> = {
    orissa: 'odisha', uttaranchal: 'uttarakhand', pondicherry: 'puducherry',
    delhi: 'delhi', jammuandkashmir: 'jammuandkashmir',
    dadraandnagarhavelianddamananddiu: 'dadraandnagarhavelidamananddiu',
  }
  return aliases[k] ?? k
}

const normalStyle: L.PathOptions = {
  color: '#277A82', weight: 1.1, opacity: 0.8, fillColor: '#12A5A2', fillOpacity: 0.035,
}
const hoveredStyle: L.PathOptions = {
  color: '#0E9B88', weight: 2.4, opacity: 0.98, fillColor: '#5BE8C3', fillOpacity: 0.27,
}
const selectedStyle: L.PathOptions = {
  color: '#096F6B', weight: 3.2, opacity: 1, fillColor: '#13B8A6', fillOpacity: 0.18,
}

export default function AeroMap({
  features, legend, selectedCoordinates, focusState, focusRevision,
  onStateSelect, onCoordinateClick, onHotspotClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const hotspotGroupRef = useRef<L.LayerGroup | null>(null)
  const selectionRef = useRef<L.CircleMarker | null>(null)
  const stateLayersRef = useRef<Map<string, StateEntry>>(new Map())
  const selectedStateRef = useRef('')
  const onStateRef = useRef(onStateSelect)
  const onCoordinateRef = useRef(onCoordinateClick)
  const onHotspotRef = useRef(onHotspotClick)
  const [ready, setReady] = useState(false)
  const [boundariesReady, setBoundariesReady] = useState(false)
  const [hoveredName, setHoveredName] = useState<string | null>(null)
  const [tileError, setTileError] = useState<string | null>(null)
  const [boundaryError, setBoundaryError] = useState<string | null>(null)
  const [stateFocusError, setStateFocusError] = useState<string | null>(null)

  useEffect(() => { onStateRef.current = onStateSelect }, [onStateSelect])
  useEffect(() => { onCoordinateRef.current = onCoordinateClick }, [onCoordinateClick])
  useEffect(() => { onHotspotRef.current = onHotspotClick }, [onHotspotClick])

  useEffect(() => {
    if (!containerRef.current) return
    let disposed = false
    let tileFailures = 0

    // Leaflet renders without MapLibre's Web Worker. Map state and callbacks
    // remain independent of the Flask analytical service.
    const map = L.map(containerRef.current, { preferCanvas: false, zoomControl: true })
    mapRef.current = map
    map.fitBounds(INDIA_BOUNDS, { padding: [12, 12] })

    const tiles = L.tileLayer(TILE_URL, {
      maxZoom: 19,
      minZoom: 3,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      crossOrigin: true,
    }).addTo(map)
    tiles.on('tileerror', () => {
      tileFailures += 1
      if (!disposed && tileFailures >= 4) setTileError('Basemap tiles could not load. Check access to the tile provider in the browser Network tab.')
    })
    tiles.on('tileload', () => {
      tileFailures = 0
      if (!disposed) setTileError(null)
    })
    // Keep hotspot dots above state polygons, even when a state is hovered.
    const hotspotPane = map.createPane('aeroscope-hotspots')
    hotspotPane.style.zIndex = '450'
    hotspotGroupRef.current = L.layerGroup().addTo(map)
    map.on('click', (event: L.LeafletMouseEvent) => {
      onCoordinateRef.current(event.latlng.lat, event.latlng.lng)
    })
    setReady(true)

    async function loadStateBoundaries(): Promise<void> {
      try {
        const response = await fetch(BOUNDARIES_URL)
        if (!response.ok) throw new Error(`${BOUNDARIES_URL} returned HTTP ${response.status}`)
        const data = await response.json() as StateCollection
        if (disposed) return
        if (data.type !== 'FeatureCollection' || !Array.isArray(data.features) || !data.features.length) {
          throw new Error('Empty or invalid state boundary GeoJSON')
        }
        const layer = L.geoJSON(data, {
          style: () => normalStyle,
          onEachFeature: (feature, polygonLayer) => {
            const name = String(feature.properties?.shapeName ?? '')
            if (!name || !(polygonLayer instanceof L.Polygon)) return
            const entry: StateEntry = { name, layer: polygonLayer, bounds: polygonLayer.getBounds() }
            stateLayersRef.current.set(normalizeState(name), entry)
            polygonLayer.on('mouseover', () => {
              if (normalizeState(name) !== selectedStateRef.current) polygonLayer.setStyle(hoveredStyle)
              setHoveredName(name)
              polygonLayer.bringToFront()
            })
            polygonLayer.on('mouseout', () => {
              polygonLayer.setStyle(normalizeState(name) === selectedStateRef.current ? selectedStyle : normalStyle)
              setHoveredName(null)
            })
            polygonLayer.on('click', (event: L.LeafletMouseEvent) => {
              L.DomEvent.stopPropagation(event.originalEvent)
              onStateRef.current(name)
            })
          },
        }).addTo(map)
        if (!disposed && layer.getLayers().length > 0) {
          setBoundariesReady(true)
          setBoundaryError(null)
        }
      } catch (error) {
        if (!disposed) setBoundaryError(error instanceof Error ? error.message : 'Could not load state boundaries')
      }
    }
    void loadStateBoundaries()
    const resizeTimer = window.setTimeout(() => { if (!disposed) map.invalidateSize() }, 180)
    return () => {
      disposed = true
      window.clearTimeout(resizeTimer)
      map.remove()
      mapRef.current = null
      hotspotGroupRef.current = null
      stateLayersRef.current.clear()
    }
  }, [])

  useEffect(() => {
    const group = hotspotGroupRef.current
    if (!ready || !group) return
    group.clearLayers()
    for (const item of features) {
      const [lon, lat] = item.geometry.coordinates
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
      const aod = item.properties.mean_aod
      const color = legend?.clusters.find((c) => c.name === item.properties.cluster_name)?.color ?? '#F59E0B'
      // Higher historical AOD gives a larger halo, but never represents real-time AQI.
      const factor = typeof aod === 'number' && Number.isFinite(aod) ? Math.max(0.7, Math.min(2, aod)) : 0.8
      const halo = L.circleMarker([lat, lon], {
        radius: 15 + factor * 6, color, fillColor: color, fillOpacity: 0.10,
        opacity: 0, weight: 0, className: 'as-hotspot-halo', pane: 'aeroscope-hotspots',
        interactive: false,
      }).addTo(group)
      halo.bringToBack()
      const core = L.circleMarker([lat, lon], {
        radius: 5 + factor * 1.5, color: '#ffffff', weight: 1.2,
        fillColor: color, fillOpacity: 0.98, bubblingMouseEvents: false,
        className: 'as-hotspot-core', pane: 'aeroscope-hotspots',
      }).addTo(group)
      const label = `${item.properties.cluster_name} · historical mean AOD: ${
        typeof aod === 'number' && Number.isFinite(aod) ? aod.toFixed(3) : 'unavailable'}`
      core.bindTooltip(label, { direction: 'top' })
      core.on('click', () => onHotspotRef.current(item))
    }
  }, [features, legend, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    selectionRef.current?.remove()
    selectionRef.current = null
    if (!selectedCoordinates) return
    const marker = L.circleMarker([selectedCoordinates.lat, selectedCoordinates.lon], {
      radius: 8, color: '#ffffff', weight: 2.5, fillColor: '#0D766D', fillOpacity: 1,
      bubblingMouseEvents: false, pane: 'aeroscope-hotspots',
    }).addTo(map)
    selectionRef.current = marker
    map.flyTo([selectedCoordinates.lat, selectedCoordinates.lon], Math.max(map.getZoom(), 7), { duration: 0.85 })
    return () => {
      marker.remove()
      if (selectionRef.current === marker) selectionRef.current = null
    }
  }, [selectedCoordinates, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    selectedStateRef.current = normalizeState(focusState)
    for (const [key, entry] of stateLayersRef.current) {
      entry.layer.setStyle(key === selectedStateRef.current ? selectedStyle : normalStyle)
    }
    if (!focusState.trim()) {
      setStateFocusError(null)
      if (focusRevision) map.flyToBounds(INDIA_BOUNDS, { padding: [18, 18], duration: 0.8 })
      return
    }
    if (!boundariesReady) return
    const entry = stateLayersRef.current.get(normalizeState(focusState))
    if (!entry) {
      setStateFocusError(`Could not find "${focusState}" in the state boundary layer.`)
      return
    }
    setStateFocusError(null)
    map.flyToBounds(entry.bounds, { padding: [55, 55], maxZoom: 7, duration: 1.1 })
  }, [focusState, focusRevision, ready, boundariesReady])

  return (
    <div className="relative h-[62vh] min-h-[450px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 lg:h-[680px]">
      <div ref={containerRef} aria-label="Interactive map of India with state boundaries and glowing historical aerosol hotspot centres" className="absolute inset-0 z-0 w-full h-full" />
      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-60 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs leading-5 text-slate-700 shadow-sm backdrop-blur">
        <strong className="block text-slate-900">Interactive historical aerosol atlas</strong>
        Hover a state to highlight it. Select a state to zoom in. Glowing points mark historical hotspot centres, not live pollution readings.
        {hoveredName && <div aria-live="polite" className="mt-2 rounded-md bg-teal-50 px-2 py-1 font-semibold text-teal-900">{hoveredName}</div>}
      </div>
      <div className="pointer-events-none absolute bottom-10 left-3 right-3 z-10 space-y-2">
        {tileError && <div role="alert" className="rounded-xl border border-rose-200 bg-white/95 p-3 text-sm text-rose-700">{tileError}</div>}
        {boundaryError && <div role="alert" className="rounded-xl border border-amber-200 bg-white/95 p-3 text-xs text-amber-900">State boundaries unavailable. Run <code>python tools/fetch_india_states.py</code> from the repository root. {boundaryError}</div>}
        {stateFocusError && <div role="alert" className="rounded-xl border border-amber-200 bg-white/95 p-3 text-xs text-amber-900">{stateFocusError}</div>}
      </div>
    </div>
  )
}
