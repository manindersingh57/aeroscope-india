import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowUpRight, CheckCircle2, Info, Layers3, LockKeyhole, ShieldCheck } from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { aeroscopeApi, type Model } from '../lib/aeroscopeApi'
import type { EvaluationRow, ModelMetricsResponse } from '../lib/modelTypes'
import '../styles/aeroscope-evaluation.css'

type GalleryProps = {
  selectedModel: Model
  selectedMetrics: ModelMetricsResponse | null
  canAccessApi: boolean
  apiLoading: boolean
  unavailableReason: string
}

type View = 'selected' | 'compare'
type MetricName = 'wcss' | 'silhouette' | 'davies_bouldin' | 'calinski_harabasz'
const METRICS: Array<{
  key: MetricName; label: string; short: string; meaning: string; direction: string; tint: string
}> = [
  { key: 'wcss', label: 'Within-Cluster Sum of Squares', short: 'WCSS · Elbow', meaning: 'Measures how tightly points group inside their clusters.', direction: 'Look for an elbow', tint: '#16a894' },
  { key: 'silhouette', label: 'Silhouette Score', short: 'Silhouette', meaning: 'Measures separation between clusters.', direction: 'Higher is better', tint: '#7285d7' },
  { key: 'davies_bouldin', label: 'Davies–Bouldin Index', short: 'Davies–Bouldin', meaning: 'Measures overlap and within-cluster dispersion.', direction: 'Lower is better', tint: '#ec9b63' },
  { key: 'calinski_harabasz', label: 'Calinski–Harabasz Index', short: 'Calinski–Harabasz', meaning: 'Compares between-cluster separation with within-cluster compactness.', direction: 'Higher is better', tint: '#aa78c5' },
]
const LABEL: Record<Model, string> = { model_a: 'Model A', model_b: 'Model B' }
const K_DEFAULT: Record<Model, number> = { model_a: 4, model_b: 5 }
const GRID_MODELS: Model[] = ['model_a', 'model_b']
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const readable = (value: number | null | undefined, digits = 3) =>
  isFiniteNumber(value) ? value.toLocaleString('en-IN', { maximumFractionDigits: digits }) : '—'

function sortedRows(source: ModelMetricsResponse | null): EvaluationRow[] {
  return [...(source?.evaluation ?? [])]
    .filter(row => Number.isInteger(row.k) && row.k > 0)
    .sort((a, b) => a.k - b.k)
}

function MetricChart({ metric, report, model }: {
  metric: typeof METRICS[number]; report: ModelMetricsResponse; model: Model
}) {
  const rows = sortedRows(report)
  const hasValues = rows.some(row => isFiniteNumber(row[metric.key]))
  const selected = rows.find(r => r.k === report.selected_k)
  const selectedValue = selected?.[metric.key]
  const possible = rows.filter(r => isFiniteNumber(r[metric.key]))
  const best = metric.key === 'wcss' || !possible.length ? null : possible.reduce((a, b) => {
    const av = a[metric.key] as number, bv = b[metric.key] as number
    return metric.key === 'davies_bouldin' ? (av <= bv ? a : b) : (av >= bv ? a : b)
  })
  return <article className="al-eval-plot" aria-label={`${LABEL[model]} ${metric.label}`}>
    <div className="al-eval-plot-head">
      <div><span className="al-eval-plot-kicker">{metric.short}</span><h4>{metric.label}</h4></div>
      <span className="al-eval-direction" style={{ color: metric.tint, backgroundColor: `${metric.tint}12` }}>{metric.direction}</span>
    </div>
    <p className="al-eval-plot-desc">{metric.meaning}</p>
    {hasValues ? (
      <div className="al-eval-plot-chart" role="img" aria-label={`${metric.label} measured at K=${rows.map(r => r.k).join(', ')}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: 9, bottom: 1, left: -17 }}>
            <CartesianGrid stroke="#ebf2ee" strokeDasharray="3 5" vertical={false}/>
            <XAxis dataKey="k" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false}
              tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#8aa69c' }} tickCount={rows.length} />
            <YAxis dataKey={metric.key} tickLine={false} axisLine={false} width={55}
              tick={{ fontSize: 10, fill: '#8aa69c' }} domain={['auto','auto']}
              tickFormatter={(n: number) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${Number(n.toFixed(n < 1 ? 2 : 1))}`}/>
            <Tooltip
              contentStyle={{ borderRadius: 13, background: '#fff', border: '1px solid #e6eee8', boxShadow: '0 10px 25px #27674b16', fontSize: 11 }}
              labelFormatter={label => `K = ${label}`}
              formatter={(value) => [readable(Number(value), 4), metric.short]}/>
            <ReferenceLine x={report.selected_k} stroke="#9ab6aa" strokeDasharray="4 4" strokeWidth={1.5}/>
            <Line type="monotone" dataKey={metric.key} name={metric.short} stroke={metric.tint} strokeWidth={2.6}
              connectNulls={false} isAnimationActive animationDuration={650}
              dot={{ r: 3.4, stroke: metric.tint, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 5.7 }}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    ) : <div className="al-eval-no-chart"><LockKeyhole size={17}/><span>No verified values for this metric</span></div>}
    <div className="al-eval-plot-footer">
      <div><span>At selected K={report.selected_k}</span><strong>{readable(selectedValue, metric.key === 'wcss' || metric.key === 'calinski_harabasz' ? 1 : 4)}</strong></div>
      <div>{best ? <><span>Best evaluated K</span><strong>K = {best.k}</strong></> : <><span>Method</span><strong>Elbow inspection</strong></>}</div>
    </div>
  </article>
}

export default function ModelEvaluationGallery({ selectedModel, selectedMetrics, canAccessApi, apiLoading, unavailableReason }: GalleryProps) {
  const [view, setView] = useState<View>('selected')
  const [secondReport, setSecondReport] = useState<{ model: Model; data: ModelMetricsResponse } | null>(null)
  const [secondError, setSecondError] = useState<string | null>(null)
  const [secondLoading, setSecondLoading] = useState(false)
  const alternative = selectedModel === 'model_a' ? 'model_b' : 'model_a'

  useEffect(() => {
    if (view !== 'compare' || !canAccessApi) return
    const controller = new AbortController()
    setSecondError(null)
    setSecondLoading(true)
    void aeroscopeApi.modelMetrics(alternative, controller.signal)
      .then(value => { if (!controller.signal.aborted) setSecondReport({ model: alternative, data: value }) })
      .catch((error: unknown) => { if (!controller.signal.aborted) setSecondError(error instanceof Error ? error.message : 'Other model metrics unavailable') })
      .finally(() => { if (!controller.signal.aborted) setSecondLoading(false) })
    return () => controller.abort()
  }, [view, selectedModel, alternative, canAccessApi])

  const reports = useMemo(() => {
    const result: Partial<Record<Model, ModelMetricsResponse>> = {}
    if (selectedMetrics) result[selectedModel] = selectedMetrics
    if (secondReport?.model === alternative) result[alternative] = secondReport.data
    return result
  }, [selectedMetrics, selectedModel, alternative, secondReport])
  const displayModels = view === 'compare' ? GRID_MODELS : [selectedModel]
  const dataSource = canAccessApi ? 'Saved Flask research results' : 'Research data restricted'

  return <section className="al-eval" aria-label="Enhanced K-Means model evaluation">
    <header className="al-eval-header">
      <div className="al-eval-header-text">
        <div className="al-eval-overline"><Activity size={14}/> MODEL VALIDATION / ENHANCED K-MEANS</div>
        <h2>Evaluation <em>curves.</em></h2>
        <p>Four scientific diagnostics for K=2–8, taken from the same experiments behind your notebook's eight-panel figure.</p>
      </div>
      <div className="al-eval-actions">
        <div className="al-eval-toggle" role="group" aria-label="Evaluation chart view">
          <button type="button" className={view === 'selected' ? 'is-active' : ''} aria-pressed={view === 'selected'} onClick={() => setView('selected')}>Selected model</button>
          <button type="button" className={view === 'compare' ? 'is-active' : ''} aria-pressed={view === 'compare'} onClick={() => setView('compare')}>Compare A + B</button>
        </div>
      </div>
    </header>
    <div className="al-eval-provenance"><ShieldCheck size={15}/><span>{dataSource}</span><span className="al-eval-provenance-right">Historical INSAT-3D AOD · not live AQI</span></div>
    {displayModels.map(model => {
      const metrics = reports[model]
      const loading = (model === selectedModel && apiLoading) ||
        (model === alternative && view === 'compare' && secondLoading)
      const missingMessage = (model === alternative && secondError) || unavailableReason
      return <div className="al-eval-model-block" key={model}>
        <div className="al-eval-model-heading">
          <div className={`al-eval-model-emblem ${model}`}><Layers3 size={19}/></div>
          <div><span>MODEL {model === 'model_a' ? 'A' : 'B'} · K-MEANS</span><h3>{model === 'model_a' ? 'Broad aerosol-loading patterns' : 'Seasonal aerosol behaviour'}</h3></div>
          <div className="al-eval-model-tags">
            <span>SELECTED K = {metrics?.selected_k ?? K_DEFAULT[model]}</span>
            {metrics && <span>BEST SILHOUETTE K = {metrics.best_silhouette_k}</span>}
          </div>
        </div>
        {metrics?.evaluation.length ? <div className="al-eval-chart-grid">
          {METRICS.map(item => <MetricChart metric={item} key={`${model}-${item.key}`} report={metrics} model={model}/>) }
        </div> : <div className="al-eval-empty">
          {loading ? <Activity size={20}/> : <LockKeyhole size={20}/>}
          <strong>{loading ? 'Loading verified K-Means experiments…' : `No available ${LABEL[model]} evaluation table`}</strong>
          <p>{loading ? 'Requesting evaluation rows from Flask.' : missingMessage}</p>
          <small>Curves load automatically from the local Flask research API when saved evaluation results are available.</small>
        </div>}
      </div>
    })}
    <div className="al-eval-footnote">
      <div><CheckCircle2 size={16}/><p><strong>Selected K is not necessarily the metric optimum.</strong> K=4 (A) and K=5 (B) are the chosen research configurations. The dashed marker indicates the configured K. Do not infer that it maximizes Silhouette or Calinski–Harabasz.</p></div>
      <div><Info size={16}/><p><strong>Compare trends within a model.</strong> A and B use different feature spaces. Their raw WCSS and Calinski–Harabasz magnitudes are not directly comparable; silhouette is sampled in the original notebook.</p></div>
    </div>
    <div className="al-eval-bottom-link"><span>Research evaluation · K-Means · K=2 through K=8</span><a href="/research">Read model methodology <ArrowUpRight size={14}/></a></div>
  </section>
}
