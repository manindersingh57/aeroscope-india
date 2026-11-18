import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, ArrowUpRight, BookOpenText, CheckCircle2,
  ChevronRight, CircleAlert, FlaskConical, Layers3, MapPinned,
  Radar, RefreshCw, ScanSearch, ShieldCheck, Wind,
} from 'lucide-react'
import OrbitalScene from '../components/OrbitalScene'
import { aeroscopeApi, API_BASE, type Capabilities, type Health } from '../lib/aeroscopeApi'

type Connection =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'connected'; health: Health; capabilities: Capabilities }

const modules = [
  { path: '/explore', number: '01', name: 'India Atlas', subtitle: 'Explore the geography', description: 'Investigate historical aerosol hotspots, layers, and grid-cell characteristics.', icon: MapPinned, tone: 'aqua' },
  { path: '/compare', number: '02', name: 'Regional Comparison', subtitle: 'Find the contrasts', description: 'Compare Indian states through seasonality, AOD statistics and coverage.', icon: Activity, tone: 'amber' },
  { path: '/hotspots', number: '03', name: 'Hotspot Explorer', subtitle: 'Examine the clusters', description: 'Filter and investigate elevated-loading regions identified in the analysis.', icon: ScanSearch, tone: 'mint' },
  { path: '/models', number: '04', name: 'Model Laboratory', subtitle: 'Inspect the evidence', description: 'Examine K-Means metrics, profiles, algorithm comparisons and PCA.', icon: FlaskConical, tone: 'violet' },
  { path: '/research', number: '05', name: 'Research Notes', subtitle: 'Understand the method', description: 'Explore data provenance, scientific assumptions, limitations and reproducibility.', icon: BookOpenText, tone: 'coral' },
]

export default function Home() {
  const [connection, setConnection] = useState<Connection>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setConnection({ state: 'loading' })
    Promise.all([aeroscopeApi.health(controller.signal), aeroscopeApi.capabilities(controller.signal)])
      .then(([health, capabilities]) => {
        if (!controller.signal.aborted) setConnection({ state: 'connected', health, capabilities })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setConnection({
          state: 'error', message: error instanceof Error ? error.message : 'Unable to reach the Flask API',
        })
      })
    return () => controller.abort()
  }, [attempt])

  const capabilities = connection.state === 'connected' ? connection.capabilities : null

  return (
    <main className="as-home">
      <section className="as-hero">
        <div className="as-hero-grid" aria-hidden="true" />
        <div className="as-container as-hero-layout">
          <div className="as-hero-copy">
            <p className="as-eyebrow"><span className="as-eyebrow-dot" /> EARTH OBSERVATION / INDIA</p>
            <h1>Seeing patterns<br />beyond the <span>surface.</span></h1>
            <p className="as-lead">An interactive research experience uncovering historical aerosol-loading patterns across India, using INSAT-3D observations and unsupervised learning.</p>
            <div className="as-hero-actions">
              <Link to="/explore" className="as-button as-button-primary">Explore the atlas <ArrowUpRight size={19} aria-hidden="true" /></Link>
              <Link to="/research" className="as-button as-button-secondary">Our methodology <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
            <p className="as-hero-disclaimer"><ShieldCheck size={16} aria-hidden="true" /> Historical research (2022–2024), not real-time AQI or surface PM2.5</p>
          </div>
          <div className="as-hero-visual">
            <OrbitalScene />
            <p className="as-visual-caption">ORBITAL STUDY / CONCEPTUAL VISUALIZATION</p>
          </div>
        </div>
        <div className="as-container as-metric-row" aria-label="Research snapshot">
          <div><strong>643</strong><span>observation dates</span></div>
          <div><strong>02</strong><span>clustering models</span></div>
          <div><strong>K = 4 / 5</strong><span>selected cluster counts</span></div>
          <div><strong>INSAT-3D</strong><span>satellite data source</span></div>
        </div>
      </section>

      <section className="as-light-section" id="discover">
        <div className="as-container">
          <div className="as-section-heading">
            <div><p className="as-kicker">THE PLATFORM</p><h2>Explore the research<br /><em>from every angle.</em></h2></div>
            <p>From a country-wide view to individual cluster profiles, each module examines a different dimension of the same historical satellite record.</p>
          </div>
          <div className="as-module-grid">
            {modules.map(({ path, number, name, subtitle, description, icon: Icon, tone }, index) => (
              <Link key={path} to={path} className={`as-module-card as-module-${tone}${index === 0 ? ' as-featured-card' : ''}`}>
                <div className="as-module-top"><span>{number} / RESEARCH TOOL</span><ArrowUpRight size={20} aria-hidden="true" /></div>
                <div className="as-module-icon"><Icon size={26} strokeWidth={1.6} aria-hidden="true" /></div>
                <p className="as-module-subtitle">{subtitle}</p>
                <h3>{name}</h3>
                <p className="as-module-description">{description}</p>
                <span className="as-module-link">Open module <ChevronRight size={18} aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="as-data-section">
        <div className="as-container as-data-layout">
          <div className="as-data-intro">
            <p className="as-kicker">TRANSPARENT BY DESIGN</p>
            <h2>Data with context.<br /><em>Not just colour.</em></h2>
            <p>AeroScope presents exploratory patterns with methodology, observation coverage and model limitations. Elevated AOD is not direct evidence of an emission source or an air quality forecast.</p>
            <Link to="/research" className="as-inline-link">Read the research approach <ArrowUpRight size={18} /></Link>
            <div className="as-data-tags"><span><Layers3 size={15} /> Clustering</span><span><Wind size={15} /> Aerosol optical depth</span><span><Radar size={15} /> Remote sensing</span></div>
          </div>
          <div className="as-status-card">
            <div className="as-status-heading">
              <div><p className="as-status-eyebrow">SYSTEM STATUS</p><h3>Research API</h3></div>
              <span className={`as-status-pill ${connection.state === 'connected' ? 'is-online' : connection.state === 'loading' ? 'is-loading' : 'is-offline'}`}>
                <span className="as-status-indicator" /> {connection.state === 'connected' ? 'Online' : connection.state === 'loading' ? 'Checking' : 'Unavailable'}
              </span>
            </div>
            <div className="as-status-body">
              <div className="as-status-line"><span>Flask connection</span><strong>{connection.state === 'connected' ? <><CheckCircle2 size={16}/> Connected</> : connection.state === 'loading' ? 'Checking…' : <><CircleAlert size={16}/> Not connected</>}</strong></div>
              <div className="as-status-line"><span>Local research artifacts</span><strong>{capabilities ? capabilities.research_data_loaded ? 'Available on server' : 'Not installed' : 'Not checked'}</strong></div>
              <div className="as-status-line"><span>Public results access</span><strong>{capabilities ? capabilities.research_results_available ? 'Enabled' : 'Restricted' : 'Not checked'}</strong></div>
            </div>
            {connection.state === 'error' && <div role="alert" className="as-status-error">{connection.message}. Verify your deployed API URL and CORS origin.</div>}
            <div className="as-status-footer">
              <button type="button" className="as-refresh-button" disabled={connection.state === 'loading'} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={15} aria-hidden="true"/> Retry connection</button>
              <a href={`${API_BASE}/openapi.json`} target="_blank" rel="noreferrer" className="as-api-link">API specification <ArrowUpRight size={15} aria-hidden="true" /></a>
            </div>
            <p className="as-api-base">API base: <code>{API_BASE}</code></p>
          </div>
        </div>
      </section>
      <footer className="as-home-footer"><div className="as-container as-footer-content"><span>© AeroScope India / Historical satellite research</span><span>Data source: MOSDAC / SAC / ISRO · Detailed data publication subject to permission</span></div></footer>
    </main>
  )
}
