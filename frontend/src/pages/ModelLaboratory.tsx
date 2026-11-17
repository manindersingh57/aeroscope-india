import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowLeft, BarChart3, BookOpen, Database, FlaskConical,
  Info, RefreshCw, ShieldAlert,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart,
  ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip,
  XAxis, YAxis,
} from 'recharts'
import { aeroscopeApi, API_BASE, type Capabilities, type Model } from '../lib/aeroscopeApi'
import type {
  ClusterProfile, ModelMetricsResponse, ModelProfilesResponse,
  ModelComparisonsResponse, ModelRobustnessResponse, ModelPCAResponse,
} from '../lib/modelTypes'

type LabData = {
  metrics: ModelMetricsResponse | null
  profiles: ModelProfilesResponse | null
  comparisons: ModelComparisonsResponse | null
  robustness: ModelRobustnessResponse | null
  pca: ModelPCAResponse | null
}
type DataKey = keyof LabData
const DATA_KEYS: DataKey[] = ['metrics', 'profiles', 'comparisons', 'robustness', 'pca']
const EMPTY_DATA: LabData = {
  metrics: null, profiles: null, comparisons: null, robustness: null, pca: null,
}
const MODEL_INFO: Record<Model, { name: string; description: string; features: string }> = {
  model_a: {
    name: 'Broad Aerosol Loading',
    description: 'Historical loading intensity and variation across the Indian study grid.',
    features: 'Overall AOD statistics and high-AOD frequency',
  },
  model_b: {
    name: 'Seasonal Aerosol Behaviour',
    description: 'Historical differences between seasonal aerosol profiles.',
    features: 'Overall AOD features and seasonal contrasts',
  },
}

const format = (value: number | null | undefined, digits = 3) =>
  typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('en-IN', { maximumFractionDigits: digits })
    : 'Not available'
const percentage = (value: number | null | undefined, digits = 1) =>
  typeof value === 'number' && Number.isFinite(value) ? `${format(value, digits)}%` : 'Not available'
const getError = (value: unknown) => value instanceof Error ? value.message : 'Unable to retrieve results'
const profileColor = (profile: ClusterProfile) =>
  /^#[\da-fA-F]{6}$/.test(profile.cluster_color) ? profile.cluster_color : '#147d82'

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-[#12333b]">{title}</h2>
      {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}
function Unavailable({ message }: { message?: string }) {
  return <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{message || 'This saved analysis is not available from the current backend.'}</p>
}
function Metric({ label, value, footnote }: { label: string; value: string; footnote?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-[#f8fafb] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#123943]">{value}</p>
      {footnote && <p className="mt-1 text-xs text-slate-500">{footnote}</p>}
    </div>
  )
}

export default function ModelLaboratory() {
  const [model, setModel] = useState<Model>('model_a')
  const [retry, setRetry] = useState(0)
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [data, setData] = useState<LabData>(EMPTY_DATA)
  const [errors, setErrors] = useState<Partial<Record<DataKey, string>>>({})
  const [loading, setLoading] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)

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
        // Never query protected scientific endpoints when Render reports no public access.
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
        const nextErrors: Partial<Record<DataKey, string>> = {}
        settled.forEach((entry, index) => {
          if (entry.status === 'rejected') nextErrors[DATA_KEYS[index]] = getError(entry.reason)
        })
        setErrors(nextErrors)
      } catch (error: unknown) {
        if (!controller.signal.aborted) setSetupError(getError(error))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [model, retry])

  const allowed = Boolean(capabilities?.research_data_loaded && capabilities?.research_results_available)
  const selectedRow = useMemo(() => data.metrics?.evaluation.find(row => row.k === data.metrics?.selected_k), [data.metrics])
  const evaluationRows = data.metrics?.evaluation ?? []
  const profiles = data.profiles?.profiles ?? []
  const pcaPoints = data.pca?.centroids ?? []
  const colourById = new Map(profiles.map(p => [p.cluster_id, profileColor(p)]))
  const modelInfo = MODEL_INFO[model]

  return (
    <div className="min-h-screen bg-[#f3f6f7] text-[#12313a]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-[#113e48] text-xl text-white">◎</span>
            <span><strong className="block text-lg tracking-tight">AeroScope <span className="text-[#1f8979]">India</span></strong><span className="block text-[10px] tracking-[0.19em] text-slate-500">SATELLITE RESEARCH PLATFORM</span></span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Research navigation">
            <Link to="/explore" className="rounded-full border border-teal-200 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">India Atlas</Link>
            <Link to="/compare" className="rounded-full border border-teal-200 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">Compare States</Link>
            <Link to="/hotspots" className="rounded-full border border-teal-200 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">Hotspots</Link>
            <Link to="/" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50"><ArrowLeft size={15}/> Home</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-teal-700">Research workspace · Phase 13</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Model Laboratory</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Examine the saved K-Means evaluation, interpreted clusters, PCA summaries, algorithm comparisons and robustness checks behind AeroScope India.</p>
          </div>
          <button type="button" disabled={loading} onClick={() => setRetry(current => current + 1)} className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:opacity-50"><RefreshCw size={15}/> Refresh results</button>
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Select clustering model">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Select research model</p>
              <h2 className="mt-1 text-lg font-semibold">{modelInfo.name}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">{modelInfo.description} Features: {modelInfo.features}.</p>
            </div>
            <div className="flex gap-2" role="group" aria-label="Clustering model">
              {(['model_a', 'model_b'] as const).map(option => (
                <button type="button" key={option} aria-pressed={model === option} onClick={() => setModel(option)} className={`rounded-full px-5 py-2.5 text-sm font-semibold ${model === option ? 'bg-[#12424a] text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  Model {option === 'model_a' ? 'A' : 'B'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {loading && <div role="status" className="mt-6 rounded-xl bg-white p-5 text-sm text-slate-600">Checking the Flask backend and saved analysis…</div>}
        {setupError && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">Cannot reach the Flask analytics service: {setupError}. Check the API base <code className="break-all">{API_BASE}</code> and CORS configuration.</div>}
        {!loading && !setupError && !allowed && (
          <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <ShieldAlert className="mt-0.5 shrink-0" size={22}/>
            <div>
              <h2 className="font-semibold">Scientific results are not available on this deployment</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6">{capabilities?.research_data_loaded
                ? 'This backend has the research files, but public access is disabled pending the applicable MOSDAC redistribution review.'
                : 'The public backend does not have the research analysis files installed. The page will not generate placeholder metrics.'}</p>
              <p className="mt-2 text-sm leading-6">The Model Laboratory can be explored locally using your approved, installed research artifacts. Model definitions remain visible here.</p>
            </div>
          </div>
        )}

        {!loading && allowed && <>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Selected cluster count" value={data.metrics ? `K = ${data.metrics.selected_k}` : 'N/A'} footnote="Selected for research interpretation"/>
            <Metric label="Silhouette at selected K" value={format(selectedRow?.silhouette, 4)} footnote="Higher generally indicates separation"/>
            <Metric label="Davies–Bouldin at selected K" value={format(selectedRow?.davies_bouldin, 4)} footnote="Lower generally indicates separation"/>
            <Metric label="PCA variance explained" value={data.pca ? percentage(data.pca.total_explained_variance * 100, 1) : 'N/A'} footnote="First two principal components"/>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            <Panel title="K-Means evaluation · K = 2–8" description="Silhouette score from the 3,000-point sampling procedure in the research notebook. Higher is generally better.">
              {data.metrics ? <>
                <div className="h-64 w-full" role="img" aria-label="Silhouette score by K with selected K marked">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evaluationRows} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                      <XAxis dataKey="k" tick={{fontSize:12}}/>
                      <YAxis tick={{fontSize:12}} domain={['auto', 'auto']}/>
                      <Tooltip/>
                      <ReferenceLine x={data.metrics.selected_k} stroke="#e09a31" strokeDasharray="5 4" label={{value:'Selected K', position:'insideTopRight', fontSize:11}}/>
                      <Line name="Silhouette" type="monotone" dataKey="silhouette" stroke="#138a7d" strokeWidth={3} dot={{r:4}} connectNulls={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">Highest Silhouette was at K = {data.metrics.best_silhouette_k}; the selected K also reflects interpretability and application needs.</p>
              </> : <Unavailable message={errors.metrics}/>}
            </Panel>

            <Panel title="Davies–Bouldin index" description="Lower values generally indicate more separated, compact groups; compare only within a model's feature space.">
              {data.metrics ? <div className="h-64 w-full" role="img" aria-label="Davies Bouldin index by cluster count">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evaluationRows} margin={{ top: 12, right: 18, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis dataKey="k" tick={{fontSize:12}}/>
                    <YAxis tick={{fontSize:12}} domain={['auto', 'auto']}/>
                    <Tooltip/>
                    <ReferenceLine x={data.metrics.selected_k} stroke="#e09a31" strokeDasharray="5 4"/>
                    <Line name="Davies–Bouldin" type="monotone" dataKey="davies_bouldin" stroke="#2563a4" strokeWidth={3} dot={{r:4}} connectNulls={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div> : <Unavailable message={errors.metrics}/>}
            </Panel>

            <Panel title="Within-cluster sum of squares" description="WCSS decreases as K rises. Do not compare WCSS magnitudes between Models A and B because the feature spaces differ.">
              {data.metrics ? <div className="h-64 w-full" role="img" aria-label="Within-cluster sum of squares by cluster count">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evaluationRows} margin={{ top: 12, right: 22, left: 4, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis dataKey="k" tick={{fontSize:12}}/>
                    <YAxis width={66} tick={{fontSize:11}} tickFormatter={v => Number(v).toLocaleString('en-IN', {notation: 'compact'})}/>
                    <Tooltip/>
                    <ReferenceLine x={data.metrics.selected_k} stroke="#e09a31" strokeDasharray="5 4"/>
                    <Line name="WCSS" type="monotone" dataKey="wcss" stroke="#8058a5" strokeWidth={3} dot={{r:4}} connectNulls={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div> : <Unavailable message={errors.metrics}/>}
            </Panel>

            <Panel title="Cluster size distribution" description="Percentage of model-eligible satellite grid cells assigned to each final cluster.">
              {data.profiles ? <div className="h-64 w-full" role="img" aria-label="Percentage of eligible cells by final cluster ID">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profiles} margin={{ top: 12, right: 12, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis dataKey="cluster_id" tick={{fontSize:12}}/>
                    <YAxis tick={{fontSize:12}} unit="%"/>
                    <Tooltip/>
                    <Bar dataKey="percentage" name="Share of cells (%)" radius={[5,5,0,0]}>
                      {profiles.map(p => <Cell key={p.cluster_id} fill={profileColor(p)}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div> : <Unavailable message={errors.profiles}/>}
            </Panel>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel title="Final cluster profiles" description="Derived descriptors of the model's classified cells. The original satellite data is not included in this page.">
              {data.profiles ? <div className="space-y-3">
                {profiles.map(profile => <article key={profile.cluster_id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold"><span className="size-3 rounded-full" style={{backgroundColor:profileColor(profile)}}/> {profile.cluster_name}</h3>
                    <span className="text-xs font-medium text-slate-500">{format(profile.cells, 0)} cells · {percentage(profile.percentage)}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">{profile.description}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">Mean AOD</p><strong className="mt-1 block">{format(profile.mean_aod)}</strong></div>
                    <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">AOD variability</p><strong className="mt-1 block">{format(profile.std_aod)}</strong></div>
                    <div className="rounded-lg bg-slate-50 p-2"><p className="text-slate-500">High-AOD frequency</p><strong className="mt-1 block">{percentage(profile.high_aod_percentage)}</strong></div>
                  </div>
                </article>)}
                <p className="text-xs leading-5 text-slate-500">Cluster IDs are model-specific. The labels describe satellite AOD characteristics, not directly measured ground-level PM2.5.</p>
              </div> : <Unavailable message={errors.profiles}/>}
            </Panel>

            <Panel title="PCA · cluster centroid projection" description="Only the mean PC1/PC2 position of each cluster is plotted. This is not a scatterplot of individual locations.">
              {data.pca ? <>
                <div className="h-72 w-full" role="img" aria-label="PCA scatter of final cluster centroids, not individual observations">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{top:16,right:25,bottom:12,left:4}}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3"/>
                      <XAxis type="number" dataKey="PC1" name="PC1" tick={{fontSize:11}} domain={['auto','auto']} label={{value:'PC1',position:'insideBottom',offset:-6,fontSize:11}}/>
                      <YAxis type="number" dataKey="PC2" name="PC2" tick={{fontSize:11}} domain={['auto','auto']} label={{value:'PC2',angle:-90,position:'insideLeft',fontSize:11}}/>
                      <Tooltip cursor={{ strokeDasharray: '3 3' }}/>
                      <Scatter name="Cluster centroids" data={pcaPoints} fill="#168375">
                        {pcaPoints.map(point => <Cell key={point.cluster_id} fill={colourById.get(point.cluster_id) ?? '#168375'}/>)}
                        <LabelList dataKey="cluster_id" position="top"/>
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">Explained variance: PC1 {percentage((data.pca.explained_variance_ratio[0] ?? 0)*100)} · PC2 {percentage((data.pca.explained_variance_ratio[1] ?? 0)*100)}. Labels are cluster IDs.</p>
                <div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead><tr className="border-b text-slate-500"><th className="py-2 pr-3">Cluster</th><th className="py-2 pr-3">PC1</th><th className="py-2 pr-3">PC2</th><th className="py-2">Cells</th></tr></thead><tbody>{pcaPoints.map(point => <tr className="border-b last:border-0" key={point.cluster_id}><td className="py-2 pr-3">{point.cluster_id}</td><td className="py-2 pr-3">{format(point.PC1)}</td><td className="py-2 pr-3">{format(point.PC2)}</td><td className="py-2">{format(point.cells, 0)}</td></tr>)}</tbody></table></div>
              </> : <Unavailable message={errors.pca}/>}
            </Panel>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel title="Alternative clustering algorithms" description="Saved K-Means, GMM and Manhattan K-Medians comparisons for the selected model.">
              {data.comparisons ? <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead><tr className="border-b border-slate-200 text-slate-500"><th className="py-3 pr-4">Algorithm</th><th className="py-3 pr-4">Silhouette (Eucl.)</th><th className="py-3 pr-4">Silhouette (Manh.)</th><th className="py-3 pr-4">DB</th><th className="py-3">ARI vs K-Means</th></tr></thead>
                  <tbody>{data.comparisons.algorithms.map((row,index) => <tr key={`${row.algorithm}-${index}`} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-4 font-semibold">{row.algorithm.replaceAll('_',' ')}</td><td className="py-3 pr-4">{format(row.silhouette_euclidean,4)}</td><td className="py-3 pr-4">{format(row.silhouette_manhattan,4)}</td><td className="py-3 pr-4">{format(row.davies_bouldin,4)}</td><td className="py-3">{format(row.ari_vs_kmeans,4)}</td></tr>)}</tbody>
                </table>
                <p className="mt-3 text-xs leading-5 text-slate-500">ARI and AMI measure assignment agreement relative to the K-Means solution. They do not measure prediction accuracy.</p>
              </div> : <Unavailable message={errors.comparisons}/>}
            </Panel>
            <Panel title="Clustering robustness" description="Adjusted Rand Index (ARI) under repeat fitting, feature removal and subsampling.">
              {data.robustness ? <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric label="Seed mean ARI" value={format(data.robustness.summary.seed_mean_ari,4)}/>
                  <Metric label="Seed min ARI" value={format(data.robustness.summary.seed_min_ari,4)}/>
                  <Metric label="Feature removal ARI" value={format(data.robustness.summary.feature_removal_ari,4)}/>
                  <Metric label="Subsample mean ARI" value={format(data.robustness.summary.subsample_mean_ari,4)}/>
                  <Metric label="Subsample min ARI" value={format(data.robustness.summary.subsample_min_ari,4)}/>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{data.robustness.notes}</p>
              </> : <Unavailable message={errors.robustness}/>}
            </Panel>
          </div>
        </>}

        <section className="mt-6 rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm leading-6 text-teal-950">
          <h2 className="flex items-center gap-2 font-semibold"><BookOpen size={17}/> How to interpret this laboratory</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <p className="flex items-start gap-2"><BarChart3 className="mt-1 shrink-0" size={17}/> Clustering metrics evaluate internal structure, not environmental truth or causal sources.</p>
            <p className="flex items-start gap-2"><FlaskConical className="mt-1 shrink-0" size={17}/> Different feature spaces mean Model A and B metric values are not always directly comparable.</p>
            <p className="flex items-start gap-2"><Info className="mt-1 shrink-0" size={17}/> Satellite AOD is not real-time AQI or a direct measurement of surface PM2.5.</p>
          </div>
        </section>
        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500">
          <p className="flex items-center gap-2"><Database size={14}/> Historical INSAT-3D research · 23 Aug 2022 to 5 Jun 2024 · MOSDAC/SAC/ISRO attribution</p>
          <a className="inline-flex items-center gap-1 text-teal-800 underline underline-offset-4" href={`${API_BASE}/openapi.json`} target="_blank" rel="noreferrer"><Activity size={14}/> API specification</a>
        </footer>
      </main>
    </div>
  )
}
