import AtmosphereHero from '../components/AtmosphereHero'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, ChevronRight, CircleAlert,
  FlaskConical, Layers3, MapPinned, RefreshCw, Satellite, ScanLine,
} from 'lucide-react'
import IndiaFeaturedMap from '../components/IndiaFeaturedMap'
import SatelliteVisual from '../components/SatelliteVisual'
import { aeroscopeApi, type Capabilities, type Health, type Model } from '../lib/aeroscopeApi'
import type { HotspotFeature, LayerCatalogue } from '../lib/mapTypes'
import type { ModelMetricsResponse } from '../lib/modelTypes'

type Status = { kind: 'loading' } | { kind: 'error'; message: string } | {
  kind: 'ready'; capabilities: Capabilities; health: Health
}
const links = [
  { to: '/explore', label: 'Geo Explorer', description: 'Interactive India atlas', icon: MapPinned, tone: 'mint' },
  { to: '/models', label: 'ML Laboratory', description: 'Clustering validation', icon: FlaskConical, tone: 'purple' },
  { to: '/cluster-insights', label: 'Cluster Insights', description: 'Regional discoveries', icon: Layers3, tone: 'peach' },
  { to: '/research', label: 'Methodology', description: 'How the research works', icon: BookOpen, tone: 'blue' },
]
function SilhouetteChart({ metrics }: { metrics: ModelMetricsResponse }) {
  const rows = metrics.evaluation.filter(row => typeof row.silhouette === 'number' && Number.isFinite(row.silhouette))
    .sort((a, b) => a.k - b.k)
  if (rows.length < 2) return <p className="al-empty-chart">Not enough evaluated configurations to plot the silhouette comparison.</p>
  const width = 360, height = 90, left = 24, right = 18, top = 9, bottom = 20
  const min = Math.min(...rows.map(x => x.silhouette as number), 0)
  const max = Math.max(...rows.map(x => x.silhouette as number), 0.1)
  const spread = Math.max(max - min, 0.01)
  const x = (index: number) => left + index * ((width - left - right) / (rows.length - 1))
  const y = (n: number) => top + (1 - (n - min) / spread) * (height - top - bottom)
  const points = rows.map((r, i) => `${x(i).toFixed(1)},${y(r.silhouette as number).toFixed(1)}`).join(' ')
  return <div className="al-chart-real">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Silhouette scores by number of K-Means clusters from stored research results">
      {[0, 1, 2].map(n => <line key={n} x1={left} x2={width - right} y1={top + n * 25} y2={top + n * 25} stroke="#e6efec" strokeWidth="1"/>)}
      <polyline fill="none" stroke="#e58c4c" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" points={points}/>
      {rows.map((r, i) => <g key={`${r.k}-${i}`}>
        <circle cx={x(i)} cy={y(r.silhouette as number)} r="3.6" fill="#fff" stroke="#e58c4c" strokeWidth="2.3"/>
        <text x={x(i)} y={height - 4} textAnchor="middle" fill="#718580" fontSize="9">K{r.k}</text>
      </g>)}
    </svg>
    <p>Measured silhouette scores from the existing Flask research API · {metrics.model.replace('_', ' ').toUpperCase()}</p>
  </div>
}

export default function Home() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [layers, setLayers] = useState<LayerCatalogue | null>(null)
  const [activeModel, setActiveModel] = useState<Model>('model_a')
  const [hotspots, setHotspots] = useState<HotspotFeature[]>([])
  const [hotspotsTotal, setHotspotsTotal] = useState<number | null>(null)
  const [hotspotError, setHotspotError] = useState('')
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<ModelMetricsResponse | null>(null)
  const [metricsError, setMetricsError] = useState('')

  const available = status.kind === 'ready' && status.capabilities.research_results_available
  useEffect(() => {
    const controller = new AbortController()
    setStatus({ kind: 'loading' })
    setLayers(null)
    Promise.all([aeroscopeApi.health(controller.signal), aeroscopeApi.capabilities(controller.signal)])
      .then(([health, capabilities]) => {
        if (!controller.signal.aborted) setStatus({ kind: 'ready', health, capabilities })
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setStatus({ kind: 'error', message: error instanceof Error ? error.message : 'API connection failed' })
      })
    aeroscopeApi.layers(controller.signal).then(catalogue => {
      if (!controller.signal.aborted) setLayers(catalogue)
    }).catch(() => { /* API status area handles outage; map remains navigable. */ })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => {
    const controller = new AbortController()
    setHotspots([])
    setHotspotsTotal(null)
    setHotspotError('')
    setMetrics(null)
    setMetricsError('')
    if (!available) return () => controller.abort()
    aeroscopeApi.hotspotCenters(activeModel, { limit: 120 }, controller.signal)
      .then(result => {
        if (!controller.signal.aborted) {
          setHotspots(result.features)
          setHotspotsTotal(result.pagination.total)
        }
      }).catch((error: unknown) => {
        if (!controller.signal.aborted) setHotspotError(error instanceof Error ? error.message : 'Hotspot results unavailable')
      })
    aeroscopeApi.modelMetrics(activeModel, controller.signal)
      .then(result => { if (!controller.signal.aborted) setMetrics(result) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setMetricsError(error instanceof Error ? error.message : 'Model evaluation unavailable')
      })
    return () => controller.abort()
  }, [activeModel, available])

  const modelLegend = useMemo(() => layers?.layers[activeModel] ?? null, [layers, activeModel])
  const accessStatus = status.kind === 'loading' ? 'Connecting to the research API'
    : status.kind === 'error' ? 'API temporarily unavailable'
      : available ? 'Local research results available' : 'Public research results restricted'

  return (
    <div className="al-overview">
      <AtmosphereHero />
      <div className="al-page-heading">
        <div>
          <span className="al-page-eyebrow"><span className="al-live-dot"/> INSAT-3D / ATMOSPHERIC RESEARCH</span>
          <h1>Atmosphere, <span>decoded.</span></h1>
          <p>See India’s historical aerosol patterns differently. Satellite observations, interpreted through unsupervised learning.</p>
        </div>
        <div className="al-headstats" aria-label="Study statistics">
          <div><strong>4,212</strong><span>GeoTIFF files</span></div>
          <div><strong>643</strong><span>Observation dates</span></div>
          <div><strong>02</strong><span>Research models</span></div>
        </div>
      </div>

      <div className="al-dashboard-grid">
        <section className="al-card al-model-card" aria-labelledby="al-models-title">
          <div className="al-card-heading">
            <div><span className="al-section-id">01 / EXPERIMENTAL DESIGN</span><h2 id="al-models-title">Research by model</h2></div>
            <Link to="/models" className="al-icon-action" aria-label="Open ML Laboratory" title="Open laboratory"><ArrowUpRight size={18}/></Link>
          </div>
          <div className="al-model-body">
            <div className="al-model-ring">
              <svg viewBox="0 0 180 180" aria-hidden="true">
                <defs><linearGradient id="al-model-gradient" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#72d9a1"/><stop offset=".44" stopColor="#f3dc6f"/><stop offset=".76" stopColor="#faad63"/><stop offset="1" stopColor="#ed6a5d"/></linearGradient></defs>
                <circle cx="90" cy="90" r="69" fill="none" stroke="#edf3f1" strokeWidth="8" />
                <circle cx="90" cy="90" r="69" fill="none" stroke="url(#al-model-gradient)" strokeWidth="8" strokeLinecap="round" strokeDasharray="326 434" transform="rotate(126 90 90)"/>
              </svg>
              <div><strong>02</strong><span>Clustering<br/>models</span></div>
            </div>
            <div className="al-model-list">
              <div className="al-model-row"><span className="al-model-dot teal"/><div><strong>Model A</strong><small>Broad aerosol loading</small></div><b>K = 4</b></div>
              <div className="al-model-row"><span className="al-model-dot coral"/><div><strong>Model B</strong><small>Seasonal behaviour</small></div><b>K = 5</b></div>
              <div className="al-model-note"><ScanLine size={15}/> Historical AOD, not live AQI</div>
            </div>
          </div>
          <div className="al-card-tail"><span>Unsupervised K-Means · INSAT-3D</span><Link to="/models">Explore experiments <ArrowRight size={14}/></Link></div>
        </section>

        <section className="al-card al-atlas-card" aria-labelledby="al-atlas-title">
          <div className="al-card-heading al-atlas-head">
            <div><span className="al-section-id">02 / INTERACTIVE GEOGRAPHY</span><h2 id="al-atlas-title">India atlas preview</h2></div>
            <div className="al-map-switch" role="group" aria-label="Select clustering model">
              <button type="button" aria-pressed={activeModel === 'model_a'} className={activeModel === 'model_a' ? 'is-active' : ''} onClick={() => setActiveModel('model_a')}>Model A</button>
              <button type="button" aria-pressed={activeModel === 'model_b'} className={activeModel === 'model_b' ? 'is-active' : ''} onClick={() => setActiveModel('model_b')}>Model B</button>
            </div>
          </div>
          <div className="al-atlas-view">
            <div className="al-map-visual">
              <IndiaFeaturedMap features={available ? hotspots : []} legend={modelLegend} selectedState={selectedState} onSelectState={setSelectedState}/>
            </div>
            <SatelliteVisual/>
            <div className="al-atlas-bottomline">
              <div><span className="al-map-key"/> {selectedState ? `Selected: ${selectedState}` : 'Select a state on the map'}</div>
              <Link to="/explore">Open Geo Explorer <ArrowUpRight size={15}/></Link>
            </div>
          </div>
          <div className="al-atlas-status">
            <span className={available ? 'al-status-dot live' : 'al-status-dot'}/>
            {hotspotError || accessStatus}
            {available && hotspotsTotal !== null && !hotspotError && <span> · {hotspots.length} of {hotspotsTotal.toLocaleString('en-IN')} hotspot centres displayed</span>}
          </div>
        </section>

        <section className="al-card al-pipeline-card" aria-labelledby="al-pipeline-title">
          <div className="al-card-heading"><div><span className="al-section-id">03 / RESEARCH PIPELINE</span><h2 id="al-pipeline-title">From orbit to insight</h2></div><Link to="/research" className="al-icon-action" aria-label="Read research methodology"><ArrowUpRight size={18}/></Link></div>
          <div className="al-flowgraphic" aria-hidden="true">
            <svg viewBox="0 0 450 115" preserveAspectRatio="none">
              <defs><linearGradient id="al-stream" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#8addbc"/><stop offset=".25" stopColor="#c8e783"/><stop offset=".5" stopColor="#f5dd79"/><stop offset=".75" stopColor="#ffa16b"/><stop offset="1" stopColor="#f16b65"/></linearGradient></defs>
              <path d="M0 56 C100 56 98 10 190 34 S316 80 450 22 L450 106 C300 47 280 82 190 78 S80 58 0 62 Z" fill="url(#al-stream)" opacity=".26"/>
              <path d="M0 52 C92 56 106 23 190 42 S325 76 450 39 L450 92 C330 50 290 76 190 66 S90 60 0 68 Z" fill="url(#al-stream)" opacity=".47"/>
              <path d="M0 57 C93 60 112 43 190 52 S317 68 450 57 L450 80 C319 61 295 68 190 59 S100 66 0 64 Z" fill="url(#al-stream)" opacity=".9"/>
              {[78,222,370].map((cx,i) => <g key={i}><line x1={cx} x2={cx} y1="6" y2="109" stroke="#668481" strokeWidth="1" strokeDasharray="2 4" opacity=".45"/><circle cx={cx} cy="58" r="5" fill="#fff" stroke="#56847f" strokeWidth="2"/></g>)}
            </svg>
          </div>
          <div className="al-pipeline-stats">
            <div><strong>4,212</strong><span>Raster files</span></div><ChevronRight size={16}/>
            <div><strong>643</strong><span>Unique dates</span></div><ChevronRight size={16}/>
            <div><strong>66,129</strong><span>Initial feature cells</span></div>
          </div>
        </section>

        <section className="al-card al-validation-card" aria-labelledby="al-validate-title">
          <div className="al-card-heading"><div><span className="al-section-id">04 / MACHINE LEARNING</span><h2 id="al-validate-title">Model evaluation</h2></div><Link to="/models" className="al-icon-action" aria-label="Open Model Laboratory"><ArrowUpRight size={18}/></Link></div>
          {metrics ? <SilhouetteChart metrics={metrics}/> : <div className="al-validation-empty">
            <div className="al-analysis-tags"><span>Silhouette</span><span>Davies–Bouldin</span><span>WCSS</span><span>PCA</span></div>
            <div className="al-validation-divider"><span className="al-small-orbit"><Satellite size={22}/></span><span className="al-validation-line"/><span className="al-small-orbit teal"><FlaskConical size={22}/></span><span className="al-validation-line"/><span className="al-small-orbit peach"><Layers3 size={22}/></span></div>
            <p>{available ? (metricsError || 'Loading verified evaluation metrics…') : 'Evaluation plots appear when permitted research results are available. No sample scores are shown.'}</p>
          </div>}
          <div className="al-validation-footer"><span>{metrics ? 'Verified experimental output' : 'Scientific results · Access dependent'}</span><Link to="/models">Open ML Laboratory <ArrowRight size={14}/></Link></div>
        </section>
      </div>

      <section className="al-modules" aria-labelledby="al-modules-heading">
        <div className="al-module-intro"><div><span className="al-section-id">RESEARCH WORKSPACES</span><h2 id="al-modules-heading">Explore the platform</h2></div><p>Four connected modules, one India-focused research workflow.</p></div>
        <div className="al-module-grid">{links.map(({ to, label, description, icon: Icon, tone }) => (
          <Link className={`al-module-tile ${tone}`} to={to} key={to}>
            <span className="al-module-icon"><Icon size={20}/></span><span><strong>{label}</strong><small>{description}</small></span><ArrowUpRight size={17}/>
          </Link>
        ))}</div>
      </section>
      <footer className="al-footer">
        <p><CheckCircle2 size={14}/> Research period: 23 Aug 2022–5 Jun 2024 · Satellite: INSAT-3D · Data: MOSDAC / SAC / ISRO</p>
        <div>{status.kind === 'error' && <CircleAlert size={14} />}{accessStatus}
          <button type="button" className="al-retry" title="Retry API connection" aria-label="Retry API connection" onClick={() => setAttempt(x => x + 1)}><RefreshCw size={13}/></button>
        </div>
        <p>Satellite AOD represents column aerosol loading, not live AQI, ground-level PM2.5 or pollution-source attribution.</p>
      </footer>
    </div>
  )
}
