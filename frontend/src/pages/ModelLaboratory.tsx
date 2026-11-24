import UpdatedModelSnapshot from '../components/UpdatedModelSnapshot'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3, BookOpen, CircleAlert,
  Database, FlaskConical, Info, Layers3, LockKeyhole, RefreshCw,
  ShieldAlert, SlidersHorizontal, Sparkles,
} from 'lucide-react'
import {
  CartesianGrid, Cell, LabelList, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { aeroscopeApi, API_BASE, type Capabilities, type Model } from '../lib/aeroscopeApi'
import type {
  ClusterProfile, ModelMetricsResponse, ModelProfilesResponse,
  ModelComparisonsResponse, ModelRobustnessResponse, ModelPCAResponse,
} from '../lib/modelTypes'
import '../styles/aeroscope-lab.css'
import ModelEvaluationGallery from '../components/ModelEvaluationGallery'

type LabData = {
  metrics: ModelMetricsResponse | null
  profiles: ModelProfilesResponse | null
  comparisons: ModelComparisonsResponse | null
  robustness: ModelRobustnessResponse | null
  pca: ModelPCAResponse | null
}
type DataKey = keyof LabData
type ScoreMode = 'silhouette' | 'davies_bouldin'
const DATA_KEYS: DataKey[] = ['metrics', 'profiles', 'comparisons', 'robustness', 'pca']
const EMPTY_DATA: LabData = { metrics: null, profiles: null, comparisons: null, robustness: null, pca: null }
const MODEL_INFO: Record<Model, { title: string; tag: string; intro: string; feature: string; configuredK: number }> = {
  model_a: {
    title: 'Broad Aerosol Loading', tag: 'GLOBAL INTENSITY',
    intro: 'Explore the distribution and variability of historical aerosol loading.',
    feature: 'Overall AOD statistics · high-AOD frequency', configuredK: 4,
  },
  model_b: {
    title: 'Seasonal Aerosol Behaviour', tag: 'SEASONAL SIGNATURES',
    intro: 'Explore differences in seasonal aerosol characteristics across the study grid.',
    feature: 'AOD features · seasonal contrasts', configuredK: 5,
  },
}
const format = (value: number | null | undefined, digits = 3) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-IN', { maximumFractionDigits: digits })
    : '—'
const percent = (value: number | null | undefined, digits = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? `${format(value, digits)}%` : '—'
const errorText = (value: unknown) => value instanceof Error ? value.message : 'Unable to retrieve these results.'
const profileColor = (profile: ClusterProfile) =>
  /^#[\da-fA-F]{6}$/.test(profile.cluster_color) ? profile.cluster_color : '#22b7a5'
const tooltipStyle = { borderRadius: 13, border: '1px solid #e7efeb', background: '#fff', boxShadow: '0 10px 30px #294d4022', fontSize: 12 }

function LabCard({ index, title, description, action, className = '', children }: {
  index: string; title: string; description?: string; action?: ReactNode; className?: string; children: ReactNode
}) {
  return <section className={`al-lab-card ${className}`}>
    <div className="al-lab-card-head">
      <div><span className="al-lab-card-index">{index}</span><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action && <div className="al-lab-card-action">{action}</div>}
    </div>
    {children}
  </section>
}
function EmptyChart({ title = 'Scientific results unavailable', description }: { title?: string; description?: string }) {
  return <div className="al-lab-chart-empty" role="status">
    <div className="al-lab-empty-grid" aria-hidden="true" />
    <div className="al-lab-empty-content"><LockKeyhole size={19} strokeWidth={1.65}/>
      <strong>{title}</strong>
      <span>{description ?? 'The chart will use verified values from the local research API when available.'}</span>
    </div>
  </div>
}
function StatCard({ icon, eyebrow, value, note, tone = 'teal' }: {
  icon: ReactNode; eyebrow: string; value: string; note: string; tone?: 'teal' | 'amber' | 'violet' | 'blue'
}) {
  return <article className={`al-lab-stat al-lab-stat-${tone}`}>
    <div className="al-lab-stat-header"><span>{eyebrow}</span><div className="al-lab-stat-icon">{icon}</div></div>
    <strong>{value}</strong><small>{note}</small>
  </article>
}
function Donut({ profiles }: { profiles: ClusterProfile[] }) {
  const radius = 63, circumference = 2 * Math.PI * radius
  const total = profiles.reduce((sum, profile) => sum + Math.max(0, profile.percentage), 0)
  let offset = 0
  return <div className="al-lab-donut" role="img" aria-label={profiles.length ? 'Cluster shares from the selected model profiles' : 'Cluster proportions not available'}>
    <svg viewBox="0 0 180 180" aria-hidden="true">
      <circle cx="90" cy="90" r={radius} stroke="#eaf2ee" strokeWidth="15" fill="none" />
      {profiles.map((profile, i) => {
        const share = total > 0 ? Math.max(0, profile.percentage) / total : 0
        const length = share * circumference
        const result = <circle key={`${profile.cluster_id}-${i}`} cx="90" cy="90" r={radius}
          stroke={profileColor(profile)} strokeWidth="15" fill="none"
          strokeDasharray={`${Math.max(0, length - 3)} ${circumference}`}
          strokeDashoffset={-offset} transform="rotate(-90 90 90)" strokeLinecap="round" />
        offset += length
        return result
      })}
    </svg>
    <div className="al-lab-donut-centre"><strong>{profiles.length ? format(profiles.length, 0) : '—'}</strong><span>identified<br/>clusters</span></div>
  </div>
}

export default function ModelLaboratory() {
  const [model, setModel] = useState<Model>('model_a')
  const [attempt, setAttempt] = useState(0)
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [data, setData] = useState<LabData>(EMPTY_DATA)
  const [errors, setErrors] = useState<Partial<Record<DataKey, string>>>({})
  const [loading, setLoading] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [scoreMode, setScoreMode] = useState<ScoreMode>('silhouette')
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setSetupError(null)
      setCapabilities(null)
      setData(EMPTY_DATA)
      setErrors({})
      try {
        const caps = await aeroscopeApi.capabilities(controller.signal)
        if (controller.signal.aborted) return
        setCapabilities(caps)
        // Research-only endpoints are deliberately disabled in the public deployment.
        if (!caps.research_data_loaded || !caps.research_results_available) return
        const settled = await Promise.allSettled([
          aeroscopeApi.modelMetrics(model, controller.signal),
          aeroscopeApi.modelProfiles(model, controller.signal),
          aeroscopeApi.modelComparisons(model, controller.signal),
          aeroscopeApi.modelRobustness(model, controller.signal),
          aeroscopeApi.modelPCA(model, controller.signal),
        ] as const)
        if (controller.signal.aborted) return
        setData({
          metrics: settled[0].status === 'fulfilled' ? settled[0].value : null,
          profiles: settled[1].status === 'fulfilled' ? settled[1].value : null,
          comparisons: settled[2].status === 'fulfilled' ? settled[2].value : null,
          robustness: settled[3].status === 'fulfilled' ? settled[3].value : null,
          pca: settled[4].status === 'fulfilled' ? settled[4].value : null,
        })
        const failed: Partial<Record<DataKey, string>> = {}
        settled.forEach((entry, i) => { if (entry.status === 'rejected') failed[DATA_KEYS[i]] = errorText(entry.reason) })
        setErrors(failed)
      } catch (error: unknown) {
        if (!controller.signal.aborted) setSetupError(errorText(error))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [model, attempt])

  const allowed = Boolean(capabilities?.research_data_loaded && capabilities?.research_results_available)
  const info = MODEL_INFO[model]
  const selectedRow = useMemo(() => data.metrics?.evaluation.find(row => row.k === data.metrics?.selected_k), [data.metrics])
  const evalRows = useMemo(() => [...(data.metrics?.evaluation ?? [])].sort((a, b) => a.k - b.k), [data.metrics])
  const profiles = data.profiles?.profiles ?? []
  const pcaPoints = data.pca?.centroids ?? []
  const clusterColors = new Map(profiles.map(profile => [profile.cluster_id, profileColor(profile)]))
  const selectedProfile = profiles.find(profile => profile.cluster_id === selectedCluster) ?? profiles[0]
  const scoreText = scoreMode === 'silhouette' ? 'Silhouette coefficient' : 'Davies–Bouldin index'
  const scoreColour = scoreMode === 'silhouette' ? '#14afa5' : '#f29355'
  const k = data.metrics?.selected_k ?? info.configuredK

  const status = loading ? 'Checking research API…'
    : setupError ? 'API unavailable'
      : allowed ? 'Research output accessible' : 'Research output restricted'
  const unavailableDetail = setupError
    ? `Unable to reach the analytics service: ${setupError}`
    : !capabilities?.research_data_loaded
      ? 'This deployment does not include restricted research outputs. Connect the local approved backend to view results.'
      : !capabilities?.research_results_available
        ? 'Publication of detailed MOSDAC-derived results is restricted on this deployment.'
        : 'No saved result was returned for this panel.'

  return <div className="al-lab">
    <div className="al-lab-pagehead">
      <div className="al-lab-heading">
        <div className="al-lab-eyebrow"><span className="al-lab-pulse"/> MODEL INTELLIGENCE / UNSUPERVISED LEARNING</div>
        <h1>Model <em>Laboratory.</em></h1>
        <p>Where satellite observations become patterns. Explore K-Means experiments, validation and interpretable aerosol clusters.</p>
      </div>
      <div className="al-lab-headright">
        <div className="al-lab-switch" role="group" aria-label="Select research model">
          {(['model_a','model_b'] as const).map(option => <button key={option} type="button"
            aria-pressed={model === option} className={model === option ? 'is-active' : ''}
            onClick={() => { setModel(option); setSelectedCluster(null) }}>
            <span className="al-lab-button-dot"/> Model {option === 'model_a' ? 'A' : 'B'}
          </button>)}
        </div>
        <button className="al-lab-refresh" type="button" disabled={loading} onClick={() => setAttempt(v => v + 1)} title="Refresh verified results"><RefreshCw size={16}/><span>Refresh</span></button>
      </div>
    </div>

    <div className="al-lab-model-strip">
      <div className="al-lab-model-symbol"><FlaskConical size={24}/></div>
      <div className="al-lab-model-details"><span>{info.tag} · SELECTED RESEARCH EXPERIMENT</span><strong>{info.title}</strong><p>{info.intro}</p></div>
      <div className="al-lab-model-feature"><SlidersHorizontal size={15}/><span>{info.feature}</span></div>
    </div>

    <div className="al-lab-stat-grid">
      <StatCard icon={<Layers3 size={20}/>} eyebrow="SELECTED CLUSTER COUNT" value={`K = ${k}`} note={data.metrics ? 'Verified selected configuration' : 'Configured research model'} tone="teal"/>
      <StatCard icon={<Activity size={20}/>} eyebrow="SILHOUETTE SCORE" value={format(selectedRow?.silhouette, 4)} note="Higher suggests better separation" tone="violet"/>
      <StatCard icon={<BarChart3 size={20}/>} eyebrow="DAVIES–BOULDIN" value={format(selectedRow?.davies_bouldin, 4)} note="Lower generally indicates better clustering" tone="amber"/>
      <StatCard icon={<Sparkles size={20}/>} eyebrow="PCA EXPLAINED VARIANCE" value={data.pca ? percent(data.pca.total_explained_variance * 100) : '—'} note="First two principal components" tone="blue"/>
    </div>

    <div role="status" className={`al-lab-status ${allowed ? 'is-available' : ''} ${setupError ? 'is-error' : ''}`}>
      <div className="al-lab-status-icon">{allowed ? <Activity size={17}/> : setupError ? <CircleAlert size={17}/> : <LockKeyhole size={17}/>}</div>
      <div><strong>{status}</strong><span>{allowed ? 'Panels below use only precomputed results returned by the existing Flask API.' : unavailableDetail}</span></div>
      <span className="al-lab-status-pill">HISTORICAL · 2022–2024</span>
    </div>

    <ModelEvaluationGallery
      selectedModel={model}
      selectedMetrics={data.metrics}
      canAccessApi={allowed}
      apiLoading={loading}
      unavailableReason={errors.metrics ?? unavailableDetail}
    />

    <div className="al-lab-two-cols al-lab-primary-row">
      <LabCard index="01 / CLUSTER ANATOMY" title="Inside the clusters" description="Relative share of model-eligible satellite grid cells." className="al-lab-composition">
        <div className="al-lab-composition-body">
          <Donut profiles={profiles}/>
          <div className="al-lab-composition-side">
            {profiles.length > 0 ? <div className="al-lab-profile-picks">
              {profiles.map(profile => <button type="button" key={profile.cluster_id}
                aria-pressed={selectedProfile?.cluster_id === profile.cluster_id}
                onClick={() => setSelectedCluster(profile.cluster_id)} className={`al-lab-cluster-pick ${selectedProfile?.cluster_id === profile.cluster_id ? 'is-selected' : ''}`}>
                <span className="al-lab-cluster-dot" style={{ backgroundColor: profileColor(profile) }}/>
                <span className="al-lab-cluster-name">{profile.cluster_name}</span>
                <strong>{percent(profile.percentage)}</strong>
              </button>)}
            </div> : <div className="al-lab-muted-legend">
              <span><i className="al-lab-key al-lab-key-teal"/> Cluster profiles</span><span><i className="al-lab-key al-lab-key-amber"/> AOD variability</span><span><i className="al-lab-key al-lab-key-coral"/> Regional patterns</span>
              <p>{loading ? 'Loading verified profiles…' : 'Cluster proportions appear when research results are accessible.'}</p>
            </div>}
          </div>
        </div>
        <div className="al-lab-comp-footer">
          {selectedProfile ? <><strong>{selectedProfile.cluster_name}</strong><span>Mean AOD {format(selectedProfile.mean_aod)} · {format(selectedProfile.cells, 0)} grid cells</span></> : <><strong>Model-dependent cluster composition</strong><span>No simulated proportions or assignments</span></>}
        </div>
      </LabCard>

      <LabCard index="02 / MODEL SELECTION" title="Clustering performance" description="Explore separation and compactness across evaluated K values."
        action={<div className="al-lab-chart-tabs" role="group" aria-label="Select clustering quality metric">
          <button type="button" aria-pressed={scoreMode === 'silhouette'} className={scoreMode === 'silhouette' ? 'is-active' : ''} onClick={() => setScoreMode('silhouette')}>Silhouette</button>
          <button type="button" aria-pressed={scoreMode === 'davies_bouldin'} className={scoreMode === 'davies_bouldin' ? 'is-active' : ''} onClick={() => setScoreMode('davies_bouldin')}>DBI</button>
        </div>}>
        {data.metrics ? <div className="al-lab-chart-wrap" role="img" aria-label={`${scoreText} by cluster count, from verified research outputs`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evalRows} margin={{ top: 14, right: 24, left: -9, bottom: 7 }}>
              <CartesianGrid strokeDasharray="4 5" stroke="#e8efec" vertical={false}/>
              <XAxis dataKey="k" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#819891' }} tickFormatter={value => `K${value}`}/>
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#819891' }} width={45}/>
              <Tooltip contentStyle={tooltipStyle}/>
              <ReferenceLine x={data.metrics.selected_k} stroke="#c4b3e8" strokeDasharray="4 4"/>
              <Line name={scoreText} type="monotone" dataKey={scoreMode} connectNulls={false} stroke={scoreColour} strokeWidth={3.5}
                dot={{ r: 4, fill: '#fff', strokeWidth: 2.5 }} activeDot={{ r: 6 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div> : <EmptyChart title={loading ? 'Preparing evaluation curves' : 'Performance metrics are restricted'} description={errors.metrics ?? unavailableDetail}/>}
        <div className="al-lab-chart-caption"><span className="al-lab-colorbar" style={{ background: scoreColour }}/>{scoreText}<span className="al-lab-caption-right">{data.metrics ? `Best Silhouette: K = ${data.metrics.best_silhouette_k}` : 'No unverified scores displayed'}</span></div>
      </LabCard>
    </div>

    <div className="al-lab-two-cols">
      <LabCard index="03 / OPTIMIZATION" title="Elbow · within-cluster error" description="WCSS across K. A decreasing curve alone does not prove an optimal solution.">
        {data.metrics ? <div className="al-lab-chart-wrap" role="img" aria-label="Within-cluster sum of squares by K">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={evalRows} margin={{ top: 14, right: 24, left: -9, bottom: 7 }}>
            <CartesianGrid strokeDasharray="4 5" stroke="#e8efec" vertical={false}/>
            <XAxis dataKey="k" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#819891' }} tickFormatter={value => `K${value}`}/>
            <YAxis tickLine={false} axisLine={false} width={54} tick={{ fontSize: 10, fill: '#819891' }} tickFormatter={v => Number(v).toLocaleString('en-IN', { notation: 'compact' })}/>
            <Tooltip contentStyle={tooltipStyle}/><ReferenceLine x={data.metrics.selected_k} stroke="#d7b76d" strokeDasharray="4 4"/>
            <Line type="monotone" dataKey="wcss" name="Within-cluster sum of squares" stroke="#ec9b65" strokeWidth={3.3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}/>
          </LineChart></ResponsiveContainer>
        </div> : <EmptyChart title={loading ? 'Loading optimization results' : 'WCSS results unavailable'} description={errors.metrics ?? unavailableDetail}/>}
        <div className="al-lab-card-footnote"><Info size={14}/> WCSS magnitudes should not be compared directly across different model feature spaces.</div>
      </LabCard>

      <LabCard index="04 / DIMENSIONALITY REDUCTION" title="PCA · cluster centroids" description="PC1 and PC2 coordinates of the four or five cluster centers. Individual grid-cell PCA scatter plots are in Cluster Insights.">
        {data.pca && pcaPoints.length > 0 ? <div className="al-lab-chart-wrap" role="img" aria-label="PCA projection of saved cluster centroids">
          <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 15, right: 20, bottom: 16, left: 2 }}>
            <CartesianGrid strokeDasharray="4 5" stroke="#e8efec"/>
            <XAxis type="number" dataKey="PC1" name="PC1" tickLine={false} axisLine={false} domain={['auto','auto']} tick={{ fontSize: 11, fill: '#819891' }} label={{ value: 'PC1', position: 'insideBottom', offset: -12, fontSize: 11 }}/>
            <YAxis type="number" dataKey="PC2" name="PC2" tickLine={false} axisLine={false} domain={['auto','auto']} tick={{ fontSize: 11, fill: '#819891' }} label={{ value: 'PC2', angle: -90, position: 'insideLeft', fontSize: 11 }}/>
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }}/>
            <Scatter data={pcaPoints} name="Cluster centroids" fill="#2bc4ad">
              {pcaPoints.map(point => <Cell key={point.cluster_id} fill={clusterColors.get(point.cluster_id) ?? '#2bc4ad'}/>)}
              <LabelList dataKey="cluster_id" position="top"/>
            </Scatter>
          </ScatterChart></ResponsiveContainer>
        </div> : <EmptyChart title={loading ? 'Loading PCA projection' : 'PCA centroids unavailable'} description={errors.pca ?? unavailableDetail}/>}
        <div className="al-lab-chart-caption"><span>PC1 + PC2 explained variance</span><strong>{data.pca ? percent(data.pca.total_explained_variance * 100) : '—'}</strong><span className="al-lab-caption-right">Two principal components</span></div>
      </LabCard>
    </div>

    <div className="al-lab-two-cols al-lab-detail-row">
      <LabCard index="05 / INTERPRETATION" title="Cluster profile library" description="Click a cluster in the composition panel to explore its original-unit features."
        action={<Link className="al-lab-link" to="/cluster-insights?tab=profiles">All insights <ArrowUpRight size={15}/></Link>}>
        {selectedProfile ? <div className="al-lab-profile-focus">
          <div className="al-lab-profile-name"><span className="al-lab-large-dot" style={{ backgroundColor: profileColor(selectedProfile) }}/><div><strong>{selectedProfile.cluster_name}</strong><p>{selectedProfile.description}</p></div></div>
          <div className="al-lab-feature-grid">
            <div><span>Mean AOD</span><strong>{format(selectedProfile.mean_aod)}</strong></div>
            <div><span>AOD variability</span><strong>{format(selectedProfile.std_aod)}</strong></div>
            <div><span>High-AOD frequency</span><strong>{percent(selectedProfile.high_aod_percentage)}</strong></div>
            <div><span>Median valid days</span><strong>{format(selectedProfile.median_valid_days, 0)}</strong></div>
          </div>
          {model === 'model_b' && <div className="al-lab-season-row">
            {([['Winter', selectedProfile.winter_mean], ['Pre-monsoon', selectedProfile.premonsoon_mean], ['Monsoon', selectedProfile.monsoon_mean], ['Post-monsoon', selectedProfile.postmonsoon_mean]] as const)
              .map(([label, value]) => <div key={label}><span>{label}</span><strong>{format(value)}</strong></div>)}
          </div>}
        </div> : <EmptyChart title={loading ? 'Loading interpreted clusters' : 'Cluster profiles are unavailable'} description={errors.profiles ?? unavailableDetail}/>}
        <div className="al-lab-card-footnote"><Info size={14}/> Cluster names summarize relative historical AOD characteristics, not surface PM2.5 exposure or health risk.</div>
      </LabCard>

      <LabCard index="06 / METHOD COMPARISON" title="Algorithm comparison" description="Saved clustering comparisons for the selected model, with distance-aware evaluation.">
        {data.comparisons ? <div className="al-lab-table-wrap"><table className="al-lab-table">
          <thead><tr><th>Algorithm</th><th>Silh. L2</th><th>Silh. L1</th><th>DBI</th><th>ARI vs K-Means</th></tr></thead>
          <tbody>{data.comparisons.algorithms.map((row, i) => <tr key={`${row.algorithm}-${i}`}>
            <td><span className="al-lab-method-dot"/>{row.algorithm.replaceAll('_', ' ')}</td>
            <td>{format(row.silhouette_euclidean, 3)}</td><td>{format(row.silhouette_manhattan, 3)}</td><td>{format(row.davies_bouldin, 3)}</td><td>{format(row.ari_vs_kmeans, 3)}</td>
          </tr>)}</tbody>
        </table></div> : <EmptyChart title={loading ? 'Loading method comparisons' : 'Algorithm comparisons restricted'} description={errors.comparisons ?? unavailableDetail}/>}
        <div className="al-lab-card-footnote"><Info size={14}/> ARI compares assignments, not predictive accuracy. L1 and L2 are evaluated separately.</div>
      </LabCard>
    </div>

    <div className="al-lab-two-cols al-lab-bottom-row">
      <LabCard index="07 / STABILITY CHECKS" title="Experiment robustness" description="Stability of assignments across seeds, feature removal and subsampling.">
        <div className="al-lab-robust-grid">
          {([
            ['Seed mean ARI', data.robustness?.summary.seed_mean_ari],
            ['Seed minimum ARI', data.robustness?.summary.seed_min_ari],
            ['Feature removal ARI', data.robustness?.summary.feature_removal_ari],
            ['Subsample mean ARI', data.robustness?.summary.subsample_mean_ari],
          ] as const).map(([label, value]) => <div key={label}><span>{label}</span><strong>{format(value, 4)}</strong></div>)}
        </div>
        <div className="al-lab-card-footnote"><Info size={14}/>{data.robustness?.notes ?? errors.robustness ?? 'Computed robustness values appear only when the research API makes them available.'}</div>
      </LabCard>
      <LabCard index="08 / RESEARCH CONTEXT" title="Read the results responsibly" description="Validation is evidence about statistical structure, not direct environmental truth.">
        <div className="al-lab-explainers">
          <div><span className="al-lab-explainer-icon"><BarChart3 size={17}/></span><p>Silhouette and Davies–Bouldin summarize clustering structure within the chosen feature space.</p></div>
          <div><span className="al-lab-explainer-icon coral"><Layers3 size={17}/></span><p>Model A and B use different feature sets, so raw WCSS values should not be compared.</p></div>
          <div><span className="al-lab-explainer-icon lilac"><ShieldAlert size={17}/></span><p>INSAT-3D AOD is column-integrated historical aerosol information, not real-time AQI.</p></div>
        </div>
        <Link className="al-lab-methodology" to="/research">Review methodology and limitations <ArrowRight size={16}/></Link>
      </LabCard>
    </div>

    <UpdatedModelSnapshot />
    <footer className="al-lab-footer">
      <span><Database size={14}/> INSAT-3D · 23 Aug 2022–5 Jun 2024 · MOSDAC / SAC / ISRO</span>
      <span>Historical AOD · no live pollution readings</span>
      <a href={`${API_BASE}/openapi.json`} target="_blank" rel="noreferrer">API contract <ArrowUpRight size={14}/></a>
      <Link to="/research"><BookOpen size={14}/> Research methodology</Link>
    </footer>
  </div>
}
