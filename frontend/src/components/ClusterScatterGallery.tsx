/** Actual saved PCA cluster scatter plots served by the local, permission-aware Flask API. */
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CircleHelp, Database, Layers3, LockKeyhole, MousePointer2, ShieldCheck } from 'lucide-react'
import { API_BASE } from '../lib/aeroscopeApi'
import '../styles/aeroscope-cluster-scatter.css'

type ModelKey = 'model_a' | 'model_b'
type Point = { x: number; y: number; rank: number; aod: number | null; state: string | null }
type Dataset = { points: Point[]; counts: number[]; total: number; source: string; minX: number; maxX: number; minY: number; maxY: number }
type HoverPoint = { point: Point; left: number; top: number } | null

const DETAILS: Record<ModelKey, { label: string; count: number; names: string[]; colors: string[] }> = {
  model_a: {
    label: 'Model A · Broad aerosol loading', count: 4,
    names: ['Lower Aerosol Loading', 'Moderate Aerosol Loading', 'Elevated and Variable Loading', 'Frequent Elevated Loading'],
    colors: ['#2A9D8F', '#E9C46A', '#F4A261', '#D62828'],
  },
  model_b: {
    label: 'Model B · Seasonal behaviour', count: 5,
    names: ['Lower Seasonal Loading', 'Moderate Pre-monsoon Leaning', 'Monsoon-Dominant Loading', 'Strong Pre-monsoon Peak', 'Elevated Across Seasons'],
    colors: ['#2A9D8F', '#E9C46A', '#457B9D', '#E76F51', '#9D174D'],
  },
}
function parsePcaResponse(value: unknown, model: ModelKey): Dataset {
  const raw = value as Record<string, unknown>
  const count = DETAILS[model].count
  if (!raw || raw.model !== model || !Array.isArray(raw.counts) ||
      raw.counts.length !== count || !Array.isArray(raw.points) ||
      !raw.extent || typeof raw.extent !== 'object') {
    throw new Error('Unexpected PCA response from Flask.')
  }
  const counts = raw.counts as number[]
  if (counts.some(n => !Number.isInteger(n) || n <= 0)) throw new Error('Incomplete final-model cluster counts.')
  const bounds = raw.extent as Record<string, number>
  if (['minX','maxX','minY','maxY'].some(key => !Number.isFinite(bounds[key]))) throw new Error('Invalid PCA coordinate ranges.')
  const points = (raw.points as Point[]).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
    Number.isInteger(p.rank) && p.rank >= 0 && p.rank < count)
  if (!points.length) throw new Error('No PCA scatter points received.')
  return { points, counts, total: counts.reduce((a,b)=>a+b,0), source: 'Private Flask API',
    minX:bounds.minX, maxX:bounds.maxX, minY:bounds.minY, maxY:bounds.maxY }
}
function renderSample(data: Dataset, model: ModelKey): Point[] {
  const groups = DETAILS[model].names.map(() => [] as Point[])
  data.points.forEach(point => groups[point.rank].push(point))
  return groups.flatMap(group => {
    const budget = 1100
    if (group.length <= budget) return group
    const step = group.length / budget
    return Array.from({ length: budget }, (_, i) => group[Math.floor((i + 0.5) * step)])
  })
}
const formatCount = (n: number) => n.toLocaleString('en-IN')
const formatScore = (n: number, precision = 2) => n.toFixed(precision)

function PointCanvas({ data, model, selectedRank }: { data: Dataset; model: ModelKey; selectedRank: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const positioned = useRef<{ px: number; py: number; point: Point }[]>([])
  const [hover, setHover] = useState<HoverPoint>(null)
  const points = useMemo(() => renderSample(data, model), [data, model])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const draw = () => {
      const bounds = canvas.getBoundingClientRect()
      const w = Math.max(250, bounds.width), h = Math.max(250, bounds.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const left = 56, right = 16, top = 18, bottom = 44
      const cw = w - left - right, ch = h - top - bottom
      const xMargin = Math.max((data.maxX - data.minX) * 0.045, 0.15)
      const yMargin = Math.max((data.maxY - data.minY) * 0.05, 0.15)
      const xmin = data.minX - xMargin, xmax = data.maxX + xMargin
      const ymin = data.minY - yMargin, ymax = data.maxY + yMargin
      const xPx = (x: number) => left + (x - xmin) / (xmax - xmin) * cw
      const yPx = (y: number) => top + ch - (y - ymin) / (ymax - ymin) * ch
      ctx.font = '11px Inter, system-ui, sans-serif'
      for (let i = 0; i <= 4; i++) {
        const x = left + cw * i / 4, y = top + ch * i / 4
        ctx.beginPath(); ctx.strokeStyle = '#e8eeed'; ctx.lineWidth = 1
        ctx.moveTo(x, top); ctx.lineTo(x, top + ch)
        ctx.moveTo(left, y); ctx.lineTo(left + cw, y); ctx.stroke()
        ctx.fillStyle = '#7a8c8b'; ctx.textAlign = 'center'
        ctx.fillText(formatScore(xmin + (xmax - xmin) * i / 4, 1), x, top + ch + 20)
        ctx.textAlign = 'right'
        ctx.fillText(formatScore(ymax - (ymax - ymin) * i / 4, 1), left - 10, y + 4)
      }
      ctx.fillStyle = '#506b6a'; ctx.font = '12px Inter, system-ui, sans-serif'; ctx.textAlign = 'center'
      ctx.fillText('Principal Component 1', left + cw / 2, h - 8)
      ctx.save(); ctx.translate(15, top + ch / 2); ctx.rotate(-Math.PI / 2)
      ctx.fillText('Principal Component 2', 0, 0); ctx.restore()
      const hit: typeof positioned.current = []
      const colors = DETAILS[model].colors
      // Draw muted clusters first so the selected cluster stays visible.
      const order = selectedRank === null ? points : [
        ...points.filter(p => p.rank !== selectedRank), ...points.filter(p => p.rank === selectedRank),
      ]
      for (const point of order) {
        const px = xPx(point.x), py = yPx(point.y)
        ctx.beginPath(); ctx.arc(px, py, selectedRank === point.rank ? 2.4 : 2, 0, Math.PI * 2)
        ctx.fillStyle = colors[point.rank]
        ctx.globalAlpha = selectedRank === null ? 0.54 : selectedRank === point.rank ? 0.78 : 0.11
        ctx.fill()
        hit.push({ px, py, point })
      }
      ctx.globalAlpha = 1
      positioned.current = hit
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [points, data, model, selectedRank])

  const onMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left, py = event.clientY - rect.top
    let winner: (typeof positioned.current)[number] | null = null
    let dist = 100
    for (const item of positioned.current) {
      if (selectedRank !== null && item.point.rank !== selectedRank) continue
      const d = (item.px - px) ** 2 + (item.py - py) ** 2
      if (d < dist) { dist = d; winner = item }
    }
    setHover(winner ? { point: winner.point, left: Math.min(px + 12, rect.width - 200), top: Math.max(4, py - 70) } : null)
  }
  return <div className="al-cg-canvas-frame">
    <canvas ref={canvasRef} className="al-cg-canvas" onPointerMove={onMove} onPointerLeave={() => setHover(null)}
      role="img" aria-label={`${DETAILS[model].label}: scatter of ${formatCount(data.total)} real observation cells, colored by cluster rank. Axes are principal components.`}/>
    {hover && <div className="al-cg-tooltip" style={{ left: hover.left, top: hover.top }}>
      <strong>{DETAILS[model].names[hover.point.rank]}</strong>
      <span>PC1: {formatScore(hover.point.x, 3)} · PC2: {formatScore(hover.point.y, 3)}</span>
      {hover.point.aod !== null && <span>Mean AOD: {formatScore(hover.point.aod, 3)}</span>}
      {hover.point.state && <span>{hover.point.state}</span>}
    </div>}
  </div>
}


type LoadState = { data: Dataset | null; loading: boolean; error: string }

function ModelPanel({model, state}: {model: ModelKey; state: LoadState}) {
  const [selectedRank, setSelectedRank] = useState<number | null>(null)
  const def = DETAILS[model]
  const data = state.data
  const total = data?.total ?? 0
  return <article className="al-cg-panel">
    <div className="al-cg-panel-head">
      <div className="al-cg-panel-title">
        <span className="al-cg-model-tag">{model === 'model_a' ? 'MODEL A' : 'MODEL B'} · K = {def.count}</span>
        <h3>{model === 'model_a' ? 'Broad aerosol patterns' : 'Seasonal aerosol patterns'}</h3>
        <p>Real PCA distribution of eligible grid cells</p>
      </div>
    </div>
    {data ? <>
      <div className="al-cg-summary">
        <span><Layers3 size={14}/> {formatCount(total)} classified cells</span>
        <span><MousePointer2 size={14}/> Hover for cell details</span>
      </div>
      <PointCanvas data={data} model={model} selectedRank={selectedRank}/>
      <div className="al-cg-legends" aria-label="Highlight a cluster">
        {def.names.map((name, rank) => <button key={rank} type="button"
          className={selectedRank === rank ? 'is-selected' : ''}
          onClick={() => setSelectedRank(prev => prev === rank ? null : rank)}
          aria-pressed={selectedRank === rank}>
          <span className="al-cg-dot" style={{backgroundColor:def.colors[rank]}}/>
          <span className="al-cg-legend-text">{name}</span>
          <small>{formatScore(data.counts[rank] / total * 100, 1)}%</small>
        </button>)}
      </div>
      <div className="al-cg-source">
        <ShieldCheck size={14}/>
        Automatically loaded from local Flask · Sampled points for performance · Percentages from all valid cells
      </div>
    </> : <div className="al-cg-empty" role="status">
      <LockKeyhole size={22}/>
      <strong>{state.loading ? 'Loading saved PCA clusters…' : 'Cluster scatter unavailable'}</strong>
      <p>{state.loading ? 'Retrieving precomputed coordinates from Flask.' : state.error}</p>
    </div>}
  </article>
}

export default function ClusterScatterGallery() {
  const [datasets, setDatasets] = useState<Record<ModelKey, LoadState>>({
    model_a: {data:null,loading:true,error:''},
    model_b: {data:null,loading:true,error:''},
  })
  useEffect(() => {
    const controller = new AbortController()
    ;(['model_a','model_b'] as const).forEach(async model => {
      try {
        const response = await fetch(`${API_BASE}/models/${model}/pca-points`, {signal:controller.signal})
        if (!response.ok) {
          const message = response.status === 403
            ? 'Public research results are restricted. Use your authorized local backend.'
            : response.status === 503
              ? 'PCA exports not installed. Copy your saved model PCA CSVs into backend/data/pca.'
              : response.status === 404
                ? 'PCA endpoint missing. Apply the backend upgrade and restart Flask.'
                : `Unable to retrieve PCA points (HTTP ${response.status}).`
          throw new Error(message)
        }
        const data = parsePcaResponse(await response.json(), model)
        if (!controller.signal.aborted) setDatasets(prev => ({...prev,[model]:{data,loading:false,error:''}}))
      } catch (error) {
        if (!controller.signal.aborted) setDatasets(prev => ({
          ...prev,[model]:{data:null,loading:false,error:error instanceof Error ? error.message : 'PCA research API unavailable.'}
        }))
      }
    })
    return () => controller.abort()
  }, [])
  return <section className="al-cg-gallery" aria-labelledby="al-cg-title">
    <div className="al-cg-section-head">
      <div>
        <span className="al-cg-eyebrow"><Database size={14}/> CLUSTER INSIGHTS / PCA VISUALIZATION</span>
        <h2 id="al-cg-title">See the <em>clusters.</em></h2>
        <p>Final Model A and Model B cluster scatter plots. Each point represents an eligible historical satellite grid cell.</p>
      </div>
      <div className="al-cg-private"><ShieldCheck size={17}/>
        <span>RESEARCH DATA<br/><strong>Automatic local backend loading</strong></span>
      </div>
    </div>
    <div className="al-cg-grid">
      <ModelPanel model="model_a" state={datasets.model_a}/>
      <ModelPanel model="model_b" state={datasets.model_b}/>
    </div>
    <div className="al-cg-note"><CircleHelp size={17}/>
      <span>These are PCA coordinates from separate model-specific feature spaces, not geographic latitude/longitude.
      Neither graph is a live AQI map or a PM2.5 measurement.
      To keep the dashboard fast, Flask sends a representative sample of points while retaining exact cluster totals.</span>
    </div>
  </section>
}
