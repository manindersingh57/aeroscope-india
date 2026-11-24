import UpdatedModelSnapshot from '../components/UpdatedModelSnapshot'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Activity, ArrowRight, BarChart3, CircleAlert, Compass, Database,
  Layers3, LockKeyhole, MapPinned, RefreshCw, ShieldCheck, SlidersHorizontal,
  TrendingUp,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { aeroscopeApi, API_BASE, type Capabilities, type Model } from '../lib/aeroscopeApi'
import type { ClusterProfile, ModelProfilesResponse } from '../lib/modelTypes'
import type { StateSummary } from '../lib/regionalTypes'
import type { HotspotRegionPage, HotspotSummary } from '../lib/hotspotTypes'
import type { HotspotFeature, LayerCatalogue } from '../lib/mapTypes'
import IndiaFeaturedMap from '../components/IndiaFeaturedMap'
import CompareRegions from './CompareRegions'
import HotspotExplorer from './HotspotExplorer'
import '../styles/aeroscope-insights.css'
import ClusterScatterGallery from '../components/ClusterScatterGallery'

type InsightsData = {
  states: StateSummary[] | null
  profiles: ModelProfilesResponse | null
  summary: HotspotSummary | null
  regions: HotspotRegionPage | null
  centers: HotspotFeature[] | null
  layers: LayerCatalogue | null
}
type InsightsTab = 'comparison' | 'hotspots'
const EMPTY: InsightsData = {
  states: null, profiles: null, summary: null, regions: null, centers: null, layers: null,
}
const PALETTE = ['#2ec6a5', '#f5bd69', '#fb8e7a', '#9d91e8', '#62b2d3', '#778a80', '#f2afcb']
const SEASONS = [
  { key: 'winter_mean' as const, label: 'Winter' },
  { key: 'premonsoon_mean' as const, label: 'Pre-monsoon' },
  { key: 'monsoon_mean' as const, label: 'Monsoon' },
  { key: 'postmonsoon_mean' as const, label: 'Post-monsoon' },
]
const chartTooltipStyle = {
  border: '1px solid #e6eee9', borderRadius: 13, background: '#fff',
  boxShadow: '0 10px 25px #315c4b1a', fontSize: 11,
}
const pretty = (value: number | null | undefined, digits = 2) =>
  value == null || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString('en-IN', { maximumFractionDigits: digits })
const getError = (value: unknown) => value instanceof Error ? value.message : 'Research API is unavailable.'
const clusterColor = (profile: ClusterProfile, index: number) =>
  /^#[a-fA-F0-9]{6}$/.test(profile.cluster_color) ? profile.cluster_color : PALETTE[index % PALETTE.length]

function Panel({ index, title, subtitle, children, action, className = '' }: {
  index: string; title: string; subtitle: string; children: ReactNode;
  action?: ReactNode; className?: string
}) {
  return <section className={`al-ci-card ${className}`}>
    <header className="al-ci-card-header">
      <div><span className="al-ci-index">{index}</span><h2>{title}</h2><p>{subtitle}</p></div>
      {action && <div className="al-ci-card-action">{action}</div>}
    </header>
    {children}
  </section>
}

function DataEmpty({ kind = 'restricted', detail }: { kind?: 'restricted' | 'loading' | 'missing'; detail?: string }) {
  return <div className="al-ci-empty" role="status">
    <div className="al-ci-empty-grid" aria-hidden="true" />
    <div className="al-ci-empty-label">
      {kind === 'restricted' ? <LockKeyhole size={21} /> : kind === 'loading' ? <RefreshCw size={21} /> : <CircleAlert size={21} />}
      <strong>{kind === 'restricted' ? 'Research results restricted' : kind === 'loading' ? 'Loading verified results' : 'No saved results for this view'}</strong>
      <span>{detail ?? (kind === 'restricted'
        ? 'The local approved research API can populate this chart. Public deployments do not expose restricted data.'
        : kind === 'loading' ? 'Retrieving precomputed INSAT-3D research results…' : 'Try a different model or check the saved analytics outputs.')}</span>
    </div>
  </div>
}

function KPI({ eyebrow, value, note, icon, variant }: {
  eyebrow: string; value: string; note: string; icon: ReactNode; variant: 'teal'|'orange'|'blue'|'violet'
}) {
  return <div className={`al-ci-kpi al-ci-kpi-${variant}`}>
    <div className="al-ci-kpi-top"><span>{eyebrow}</span><div className="al-ci-kpi-icon">{icon}</div></div>
    <strong title={value}>{value}</strong><small>{note}</small>
  </div>
}

function Donut({ profiles, selectedId, onSelect }: {
  profiles: ClusterProfile[]; selectedId: number | null; onSelect: (id: number) => void
}) {
  const circumference = 2 * Math.PI * 69
  const total = profiles.reduce((sum, item) => sum + Math.max(0, item.percentage), 0)
  let position = 0
  return <div className="al-ci-donut" role="group" aria-label="Cluster distribution. Select a cluster from the legend for details.">
    <div className="al-ci-donut-graphic">
      <svg viewBox="0 0 190 190" aria-hidden="true">
        <circle cx="95" cy="95" r="69" fill="none" stroke="#edf3ef" strokeWidth="17" />
        {profiles.map((profile, index) => {
          const fraction = total ? Math.max(0, profile.percentage) / total : 0
          const length = fraction * circumference
          const circle = <circle key={profile.cluster_id} cx="95" cy="95" r="69" fill="none"
            stroke={clusterColor(profile, index)} strokeWidth={selectedId === profile.cluster_id ? 20 : 17}
            strokeDasharray={`${Math.max(0, length - 3)} ${circumference}`}
            strokeDashoffset={-position} strokeLinecap="round" transform="rotate(-90 95 95)" />
          position += length
          return circle
        })}
      </svg>
      <div className="al-ci-donut-center"><strong>{pretty(profiles.length, 0)}</strong><span>cluster groups</span></div>
    </div>
    <div className="al-ci-donut-list">
      {profiles.map((item, index) => <button key={item.cluster_id} type="button"
        aria-pressed={selectedId === item.cluster_id}
        className={`al-ci-cluster-row ${selectedId === item.cluster_id ? 'is-active' : ''}`}
        onClick={() => onSelect(item.cluster_id)}>
        <i style={{ backgroundColor: clusterColor(item, index) }}/>
        <span title={item.cluster_name}>{item.cluster_name}</span>
        <strong>{pretty(item.percentage, 1)}%</strong>
      </button>)}
    </div>
  </div>
}

export default function ClusterInsights() {
  const [params, setParams] = useSearchParams()
  const tab: InsightsTab = params.get('tab') === 'hotspots' ? 'hotspots' : 'comparison'
  const model: Model = params.get('model') === 'model_b' ? 'model_b' : 'model_a'
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [data, setData] = useState<InsightsData>(EMPTY)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mapState, setMapState] = useState<string | null>(null)

  function updateParam(key: 'model' | 'tab', value: string) {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next)
    if (key === 'tab') {
      // Detailed research workspace sits below the visualization dashboard.
      requestAnimationFrame(() => document.getElementById('al-ci-deepdive')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setSetupError(null)
      setErrors([])
      setData(EMPTY)
      setCapabilities(null)
      setSelectedId(null)
      setMapState(null)
      try {
        const caps = await aeroscopeApi.capabilities(controller.signal)
        if (controller.signal.aborted) return
        setCapabilities(caps)
        if (!caps.research_data_loaded || !caps.research_results_available) return
        const results = await Promise.allSettled([
          aeroscopeApi.stateSummaries(controller.signal),
          aeroscopeApi.modelProfiles(model, controller.signal),
          aeroscopeApi.hotspotSummary(model, controller.signal),
          aeroscopeApi.hotspotRegions(model, { limit: 30, minCells: 1 }, controller.signal),
          aeroscopeApi.hotspotCenters(model, { limit: 200, minCells: 1 }, controller.signal),
          aeroscopeApi.layers(controller.signal),
        ] as const)
        if (controller.signal.aborted) return
        setData({
          states: results[0].status === 'fulfilled' ? results[0].value : null,
          profiles: results[1].status === 'fulfilled' ? results[1].value : null,
          summary: results[2].status === 'fulfilled' ? results[2].value : null,
          regions: results[3].status === 'fulfilled' ? results[3].value : null,
          centers: results[4].status === 'fulfilled' ? results[4].value.features : null,
          layers: results[5].status === 'fulfilled' ? results[5].value : null,
        })
        setErrors(results.flatMap((entry, index) => entry.status === 'rejected'
          ? [`${['States', 'Cluster profiles', 'Hotspot summary', 'Regional hotspots', 'Map centers', 'Map legend'][index]}: ${getError(entry.reason)}`]
          : []))
      } catch (error: unknown) {
        if (!controller.signal.aborted) setSetupError(getError(error))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [model, retry])

  const available = Boolean(capabilities?.research_data_loaded && capabilities?.research_results_available)
  const profiles = data.profiles?.profiles ?? []
  const activeProfile = profiles.find(item => item.cluster_id === selectedId) ?? profiles[0]
  const selectedK = data.profiles?.cluster_count
  const eligibleCells = profiles.reduce((acc, profile) => acc + profile.cells, 0)
  const topStates = useMemo(() => [...(data.states ?? [])]
    .filter(item => item.mean_aod != null && Number.isFinite(item.mean_aod))
    .sort((a, b) => (b.mean_aod ?? 0) - (a.mean_aod ?? 0))
    .slice(0, 8)
    .map(item => ({ state: item.state, aod: item.mean_aod ?? 0, coverage: item.valid_aod_percent })), [data.states])
  const loadingByCluster = profiles.map((profile, index) => ({
    cluster: profile.cluster_name.length > 24 ? `${profile.cluster_name.slice(0, 23)}…` : profile.cluster_name,
    aod: profile.mean_aod,
    color: clusterColor(profile, index),
    cells: profile.cells,
  })).filter(item => item.aod != null && Number.isFinite(item.aod))
  const seasonData = SEASONS.map(season => {
    const values: Record<string, number | string | null> = { season: season.label }
    profiles.forEach(profile => { values[String(profile.cluster_id)] = profile[season.key] })
    return values
  })
  const hasSeason = profiles.some(profile => SEASONS.some(season => profile[season.key] != null))
  const regions = data.regions?.items ?? []
  const regionChart = regions.slice(0, 9).map(region => ({
    name: `#${region.region_rank}`,
    gridCells: region.grid_cells,
    meanAod: region.mean_aod,
    cluster: region.cluster_name,
  }))
  const mapLegend = data.layers?.layers[model] ?? null
  const chartEmptyKind = loading ? 'loading' : setupError ? 'missing' : available ? 'missing' : 'restricted'
  const status = loading ? 'Connecting to research API…' : setupError ? 'API unavailable'
    : available ? 'Approved research outputs available' : 'Restricted results · historical research'

  return <div className="al-ci">
    <div className="al-ci-pagehead">
      <div>
        <div className="al-ci-eyebrow"><span className="al-ci-pulse"/> AEROSCOPE / PATTERN INTELLIGENCE</div>
        <h1>Cluster <em>Insights.</em></h1>
        <p>Explore the structure behind India's historical aerosol patterns through geographic, seasonal and regional evidence.</p>
      </div>
      <div className="al-ci-head-controls">
        <span className="al-ci-control-label">RESEARCH MODEL</span>
        <div className="al-ci-model-switch" role="group" aria-label="Select clustering model for insight charts">
          {(['model_a', 'model_b'] as Model[]).map(id => <button key={id} type="button"
            aria-pressed={model === id} className={model === id ? 'is-active' : ''}
            onClick={() => updateParam('model', id)}>{id === 'model_a' ? 'Model A' : 'Model B'}</button>)}
        </div>
        <span className="al-ci-period">23 AUG 2022 – 05 JUN 2024</span>
      </div>
    </div>

    <div className="al-ci-model-intro">
      <span className="al-ci-model-badge"><Layers3 size={16}/>{model === 'model_a' ? 'BROAD AEROSOL LOADING' : 'SEASONAL AEROSOL BEHAVIOUR'}</span>
      <span className="al-ci-model-intro-text">{model === 'model_a'
        ? 'Regional structure in the historical magnitude and variability of aerosol optical depth.'
        : 'Regional structure in historical seasonal aerosol characteristics.'}</span>
      <button type="button" onClick={() => setRetry(n => n + 1)} title="Reload research data" aria-label="Refresh cluster insights"><RefreshCw size={16}/></button>
    </div>

    <div className="al-ci-kpi-grid">
      <KPI eyebrow="Cluster groups" value={data.profiles ? pretty(selectedK, 0) : '—'} note={model === 'model_a' ? 'Model A selected structure' : 'Model B selected structure'} icon={<Layers3 size={18}/>} variant="teal"/>
      <KPI eyebrow="Eligible grid cells" value={data.profiles ? pretty(eligibleCells, 0) : '—'} note="Included in the selected model profiles" icon={<Database size={18}/>} variant="violet"/>
      <KPI eyebrow="Historical regions" value={data.summary ? pretty(data.summary.qualifying_regions, 0) : '—'} note="Unfiltered connected hotspot regions" icon={<MapPinned size={18}/>} variant="orange"/>
      <KPI eyebrow="Regional coverage" value={data.states ? pretty(data.states.length, 0) : '—'} note="State / UT summaries accessible" icon={<Compass size={18}/>} variant="blue"/>
    </div>

    <div className={`al-ci-status ${!available ? 'is-muted' : ''}`} role="status">
      <span className="al-ci-status-dot"/>
      <span>{status}</span>
      <span className="al-ci-status-context">Historical INSAT-3D AOD · not live AQI or surface PM2.5</span>
    </div>
    {setupError && <div role="alert" className="al-ci-api-error">Unable to reach Flask: {setupError}. Check your backend at <code>{API_BASE}</code>.</div>}
    {errors.length > 0 && <div className="al-ci-api-error" role="alert">Some scientific panels could not load: {errors.join(' · ')}</div>}

    <div className="al-ci-main-grid">
      <Panel index="01 / CLUSTER STRUCTURE" title="Cluster composition" subtitle="Share of eligible grid cells for the selected clustering model.">
        {activeProfile ? <>
          <Donut profiles={profiles} selectedId={activeProfile?.cluster_id ?? null} onSelect={setSelectedId}/>
          <div className="al-ci-active-profile">
            <span className="al-ci-profile-dot" style={{ background: clusterColor(activeProfile, Math.max(0, profiles.indexOf(activeProfile))) }}/>
            <div><strong>{activeProfile.cluster_name}</strong><span>{pretty(activeProfile.cells, 0)} grid cells · mean AOD {pretty(activeProfile.mean_aod, 3)}</span></div>
            <b>{pretty(activeProfile.percentage, 1)}%</b>
          </div>
        </> : <DataEmpty kind={chartEmptyKind}/>}
      </Panel>

      <Panel index="02 / GEOSPATIAL VIEW" title="Regional hotspot atlas" subtitle="Actual connected hotspot centres over Indian state boundaries."
        action={<Link className="al-ci-panel-link" to="/explore">Open full atlas <ArrowRight size={14}/></Link>}
        className="al-ci-map-card">
        <div className="al-ci-map-surface">
          <IndiaFeaturedMap features={available ? data.centers ?? [] : []} legend={mapLegend}
            selectedState={mapState} onSelectState={setMapState}/>
          <div className="al-ci-map-counter">{!available ? 'Results restricted' : data.centers ? `${data.centers.length} displayed centres` : 'No centres available'}</div>
        </div>
        <div className="al-ci-map-footer"><span><MapPinned size={14}/>{mapState ? `${mapState} selected` : 'Select a state to highlight it'}</span><span>Conceptual hotspot centres · not emission sources</span></div>
      </Panel>

      <Panel index="03 / ATMOSPHERIC INTENSITY" title="Mean AOD by cluster" subtitle="Original-unit mean AOD for each cluster, not an AQI score." action={<TrendingUp size={17} className="al-ci-action-icon"/>}>
        {loadingByCluster.length ? <div className="al-ci-chart-wrap">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={loadingByCluster} layout="vertical" margin={{ top: 5, right: 26, left: 10, bottom: 2 }}>
            <CartesianGrid strokeDasharray="3 5" stroke="#edf2ed" horizontal={false}/>
            <XAxis type="number" tick={{ fontSize: 10, fill: '#849a90' }} axisLine={false} tickLine={false} domain={[0, 'auto']}/>
            <YAxis type="category" dataKey="cluster" width={132} tick={{ fontSize: 10, fill: '#60786c' }} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [pretty(Number(value), 3), 'Mean AOD']}/>
            <Bar dataKey="aod" radius={[0, 8, 8, 0]} maxBarSize={23}>{loadingByCluster.map((item, i) => <Cell key={i} fill={item.color}/>)}</Bar>
          </BarChart></ResponsiveContainer>
        </div> : <DataEmpty kind={chartEmptyKind}/>}
        <div className="al-ci-chart-foot"><ShieldCheck size={13}/> No causal pollution-source claims are made from these clusters.</div>
      </Panel>

      <Panel index="04 / REGIONAL RANKING" title="State-level aerosol profile" subtitle="Top accessible state/UT summaries ranked by historical mean AOD."
        action={<button className="al-ci-panel-link" type="button" onClick={() => updateParam('tab', 'comparison')}>Compare states <ArrowRight size={14}/></button>}>
        {topStates.length ? <div className="al-ci-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={topStates} layout="vertical" margin={{ top: 5, right: 24, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 5" stroke="#edf2ed" horizontal={false}/>
          <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#849a90' }} axisLine={false} tickLine={false}/>
          <YAxis type="category" dataKey="state" width={106} tick={{ fontSize: 10, fill: '#62766d' }} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [pretty(Number(value), 3), String(name)]}/>
          <Bar dataKey="aod" name="Mean AOD" fill="#28c6a7" radius={[0, 8, 8, 0]} maxBarSize={21}>
            {topStates.map((_, i) => <Cell key={i} fill={i < 2 ? '#f2a876' : i < 4 ? '#a8a0e4' : '#49c8aa'}/>)}</Bar>
        </BarChart></ResponsiveContainer></div> : <DataEmpty kind={chartEmptyKind}/>}
        <div className="al-ci-chart-foot"><Activity size={13}/> Ranks describe satellite AOD only; state grid coverage differs.</div>
      </Panel>

      <Panel index="05 / TEMPORAL FEATURES" title="Seasonal cluster signatures" subtitle="Mean AOD across four seasonal feature summaries, where available."
        action={<span className="al-ci-soft-chip">4 seasonal periods</span>}>
        {hasSeason ? <div className="al-ci-chart-wrap al-ci-season-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={seasonData} margin={{ top: 9, right: 18, left: -12, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 5" stroke="#edf2ed"/>
          <XAxis dataKey="season" tick={{ fontSize: 10, fill: '#80988b' }} axisLine={false} tickLine={false} interval={0}/>
          <YAxis domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#80988b' }} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [pretty(Number(value), 3), profiles.find(p => String(p.cluster_id) === String(name))?.cluster_name ?? String(name)]}/>
          {profiles.map((profile, index) => <Line key={profile.cluster_id} type="monotone" dataKey={String(profile.cluster_id)} name={String(profile.cluster_id)}
            stroke={clusterColor(profile, index)} strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 6 }} connectNulls={false}/>) }
        </LineChart></ResponsiveContainer></div> : <DataEmpty kind={chartEmptyKind}/>}
        {hasSeason && <div className="al-ci-chart-legend">{profiles.map((item, i) => <span key={item.cluster_id}><i style={{ background: clusterColor(item, i) }}/>{item.cluster_name}</span>)}</div>}
      </Panel>

      <Panel index="06 / CONNECTED REGIONS" title="Largest connected hotspots" subtitle="Grid-cell counts for the largest saved hotspot regions."
        action={<button className="al-ci-panel-link" type="button" onClick={() => updateParam('tab', 'hotspots')}>View hotspots <ArrowRight size={14}/></button>}>
        {regionChart.length ? <div className="al-ci-chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={regionChart} margin={{ top: 12, right: 15, left: -13, bottom: 6 }}>
          <CartesianGrid strokeDasharray="3 5" stroke="#edf2ed" vertical={false}/>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#80988b' }} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fontSize: 10, fill: '#80988b' }} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={chartTooltipStyle} formatter={(value) => [`${pretty(Number(value), 0)} cells`, 'Region size']}/>
          <Bar dataKey="gridCells" radius={[7, 7, 0, 0]} maxBarSize={34}>
            {regionChart.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}</Bar>
        </BarChart></ResponsiveContainer></div> : <DataEmpty kind={chartEmptyKind}/>}
        <div className="al-ci-chart-foot"><SlidersHorizontal size={13}/> Region size is in grid cells, not square kilometres.</div>
      </Panel>
    </div>

    <ClusterScatterGallery />

    <UpdatedModelSnapshot />
    <div className="al-ci-deepdive" id="al-ci-deepdive">
      <div className="al-ci-deepdive-head">
        <div><span className="al-ci-index">RESEARCH WORKSPACES</span><h2>Explore the evidence in depth.</h2><p>Existing regional comparison and hotspot tools remain intact beneath the new visualization dashboard.</p></div>
        <div className="al-ci-tab-switch" role="group" aria-label="Cluster Insights detail workspace">
          <button type="button" aria-pressed={tab === 'comparison'} className={tab === 'comparison' ? 'is-active' : ''} onClick={() => updateParam('tab', 'comparison')}><BarChart3 size={16}/> Regional comparison</button>
          <button type="button" aria-pressed={tab === 'hotspots'} className={tab === 'hotspots' ? 'is-active' : ''} onClick={() => updateParam('tab', 'hotspots')}><MapPinned size={16}/> Hotspot explorer</button>
        </div>
      </div>
      <div className="al-ci-legacy-area">{tab === 'comparison' ? <CompareRegions/> : <HotspotExplorer/>}</div>
    </div>
    <footer className="al-ci-footer"><span><ShieldCheck size={14}/> Historical observations only · not real-time AQI or PM2.5</span><span>INSAT-3D AOD · MOSDAC / SAC / ISRO · Public research results subject to permission</span><Link to="/research">Methodology <ArrowRight size={13}/></Link></footer>
  </div>
}
