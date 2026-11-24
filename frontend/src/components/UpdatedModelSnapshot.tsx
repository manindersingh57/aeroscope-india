import { useEffect, useState } from 'react'
import { Database, Layers3, ShieldAlert } from 'lucide-react'
import { API_BASE } from '../lib/aeroscopeApi'
import '../styles/aeroscope-model-revision.css'

type Cluster = { rank: number; name: string; color: string; cells: number; percentage: number }
type ModelInfo = { selected_k: number; best_silhouette_k: number; eligible_cells: number; feature_count: number;
  features: string[]; silhouette: number; davies_bouldin: number; clusters: Cluster[] }
type Revision = { schema: string; study: { india_grid_cells: number; observation_days: number;
  satellite_files: number; scientific_note: string }; models: { model_a: ModelInfo; model_b: ModelInfo };
  warnings: string[] }
const fmt = (n: number) => Number.isFinite(n) ? n.toLocaleString('en-IN') : '—'

/** Shows only validated, locally synchronized model revisions. Does not guess data on public hosting. */
export default function UpdatedModelSnapshot() {
  const [revision, setRevision] = useState<Revision | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_BASE}/models/study-revision`, { signal: controller.signal })
      .then(async response => response.ok ? response.json() as Promise<Revision> : null)
      .then(data => {
        if (!controller.signal.aborted && data?.schema === 'aeroscope-model-revision-v1') setRevision(data)
      })
      .catch(() => { /* Hide entirely when research data is restricted or not synchronized. */ })
    return () => controller.abort()
  }, [])
  if (!revision) return null
  return <section className="amr-revision" aria-label="Updated, verified model specifications">
    <div className="amr-head">
      <div><span className="amr-eyebrow"><Database size={13}/> UPDATED RESEARCH SNAPSHOT</span>
        <h2>Two models. Two complementary views.</h2>
        <p>Specifications loaded from the latest verified local Colab exports, not demo data.</p></div>
      <span className="amr-study">{fmt(revision.study.india_grid_cells)} India grid cells</span>
    </div>
    <div className="amr-grid">
      {([['model_a','Model A · Broad patterns'],['model_b','Model B · Seasonal patterns']] as const).map(([key,label]) => {
        const model = revision.models[key]
        return <article className="amr-model" key={key}>
          <div className="amr-model-title"><Layers3 size={16}/><strong>{label}</strong><span>K = {model.selected_k}</span></div>
          <div className="amr-stats">
            <div><b>{fmt(model.eligible_cells)}</b><span>eligible cells</span></div>
            <div><b>{model.feature_count}</b><span>features</span></div>
            <div><b>{model.silhouette.toFixed(4)}</b><span>silhouette at selected K</span></div>
          </div>
          <div className="amr-features">{model.features.map(feature=><span key={feature}>{feature.replaceAll('_',' ')}</span>)}</div>
          <div className="amr-distribution" aria-label={`${label} cluster proportions`}>
            {model.clusters.map(c=><div key={c.rank} style={{ flex: c.cells, backgroundColor: /^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : undefined }} title={`${c.name}: ${fmt(c.cells)} cells · ${c.percentage}%`}/>)}</div>
          <p className="amr-coverage">{(100*model.eligible_cells/revision.study.india_grid_cells).toFixed(1)}% of India study grid represented · Best Silhouette: K={model.best_silhouette_k}</p>
        </article>
      })}
    </div>
    <div className="amr-caution"><ShieldAlert size={16}/>
      <span>Missing Model B assignments are expected for cells without four-season coverage. {revision.study.scientific_note}.</span>
    </div>
  </section>
}
