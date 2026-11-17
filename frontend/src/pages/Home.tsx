import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import StateCard from '../components/StateCard'
import { aeroscopeApi, API_BASE, type Capabilities, type Health } from '../lib/aeroscopeApi'

type Connection =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'connected'; health: Health; capabilities: Capabilities }

const futureModules = [
  { number: '01', name: 'Explore India', detail: 'Model layers and regional patterns' },
  { number: '02', name: 'Location Intelligence', detail: 'Historical grid-cell profiles' },
  { number: '03', name: 'Compare States', detail: 'Regional aerosol comparison' },
  { number: '04', name: 'Hotspot Explorer', detail: 'Browse historical aerosol-pattern regions' },
  { number: '05', name: 'Model Laboratory', detail: 'K-Means metrics and PCA summaries' },
]

export default function App() {
  const [connection, setConnection] = useState<Connection>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setConnection({ state: 'loading' })

    Promise.all([
      aeroscopeApi.health(controller.signal),
      aeroscopeApi.capabilities(controller.signal),
    ])
      .then(([health, capabilities]) => {
        if (active) setConnection({ state: 'connected', health, capabilities })
      })
      .catch((error: unknown) => {
        if (!active) return
        setConnection({
          state: 'error',
          message: error instanceof Error ? error.message : 'Unable to connect to Flask',
        })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [attempt])

  const capabilities = connection.state === 'connected' ? connection.capabilities : null
  const apiConnected = connection.state === 'connected'

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-[#122b36]">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-[#123d48] text-xl text-white">◎</span>
            <div>
              <div className="text-lg font-bold tracking-tight">AeroScope <span className="text-[#1f8979]">India</span></div>
              <div className="text-xs tracking-[0.17em] text-slate-500">SATELLITE RESEARCH PLATFORM</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3"><Link to="/models" className="rounded-full border border-teal-300 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">Model Laboratory →</Link><Link to="/hotspots" className="rounded-full border border-teal-300 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">Hotspot Explorer →</Link><Link to="/compare" className="rounded-full border border-teal-300 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50">Compare states →</Link><Link to="/explore" className="rounded-full bg-[#123d48] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1b5360]">Explore India Atlas →</Link><div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm">
            <span aria-hidden="true" className={`size-2 rounded-full ${apiConnected ? 'bg-emerald-500' : connection.state === 'loading' ? 'bg-amber-400' : 'bg-rose-500'}`} />
            {connection.state === 'loading' ? 'Checking Flask connection' : apiConnected ? 'Flask API connected' : 'Backend unavailable'}
          </div></div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-14">
        <section className="max-w-3xl">
          <div className="mb-5 inline-block rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold tracking-wider text-teal-800">AEROSCOPE INDIA · RESEARCH PORTAL</div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Explore historical aerosol patterns across India.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
            A research interface for INSAT-3D observations and unsupervised clustering.
            Explore our interactive hotspot-centre atlas, with historical location analysis and model interpretation. The fully animated visual design will follow after the core functions are stable.
          </p>
          <p className="mt-3 text-sm font-medium text-slate-500">Observation window: 23 Aug 2022 to 5 Jun 2024 · Not real-time AQI</p>
        </section>

        <section aria-labelledby="connection-heading" className="mt-11 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="connection-heading" className="text-xl font-semibold">API connection check</h2>
              <p className="mt-1 text-sm text-slate-500">Requests: GET /health and GET /capabilities</p>
            </div>
            <button
              type="button"
              onClick={() => setAttempt((current) => current + 1)}
              disabled={connection.state === 'loading'}
              className="rounded-full bg-[#123d48] px-5 py-2 text-sm font-medium text-white hover:bg-[#1b5360] disabled:cursor-wait disabled:opacity-60"
            >
              {connection.state === 'loading' ? 'Connecting…' : 'Retry connection'}
            </button>
          </div>

          {connection.state === 'error' && (
            <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <strong>Connection failed:</strong> {connection.message}
              <p className="mt-2">Check that Flask is running at {API_BASE} and that your local CORS origin allows http://localhost:5173.</p>
            </div>
          )}

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <StateCard
              label="Flask server"
              value={connection.state === 'loading' ? 'Checking…' : apiConnected ? 'Connected' : 'Unavailable'}
              note={apiConnected ? connection.health.service : 'Start Flask in a separate terminal'}
            />
            <StateCard
              label="Research data"
              value={capabilities ? capabilities.research_data_loaded ? 'Installed' : 'Not installed' : 'Not checked'}
              note="Reports whether the backend found the research artifacts"
            />
            <StateCard
              label="Public results"
              value={capabilities ? capabilities.research_results_available ? 'Enabled' : 'Restricted' : 'Not checked'}
              note="A restriction is expected on public hosting before permission is confirmed"
            />
          </div>

          <p className="mt-5 break-all text-xs text-slate-500">
            API base: <code className="rounded bg-slate-100 px-2 py-1">{API_BASE}</code>
          </p>
          <a className="mt-4 inline-block text-sm font-semibold text-teal-800 underline underline-offset-4 hover:text-teal-600" href={`${API_BASE}/openapi.json`} target="_blank" rel="noreferrer">Open Flask API specification</a>
        </section>

        <section aria-labelledby="modules-heading" className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="modules-heading" className="text-2xl font-semibold tracking-tight">Explore AeroScope modules</h2>
            <p className="text-sm text-slate-500">Atlas, state comparison, and historical hotspot region exploration</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3"><Link to="/explore" className="inline-block rounded-full bg-teal-800 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700">Open interactive atlas →</Link><Link to="/hotspots" className="inline-block rounded-full border border-teal-300 px-5 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">Browse hotspots →</Link><Link to="/models" className="inline-block rounded-full border border-teal-300 px-5 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">Model Laboratory →</Link><Link to="/compare" className="inline-block rounded-full border border-teal-300 px-5 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50">Compare states →</Link></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {futureModules.map((module) => (
              <article key={module.number} className="min-h-36 rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold tracking-[0.2em] text-[#1f8979]">{module.number}</p>
                <h3 className="mt-4 text-lg font-semibold">{module.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{module.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="mt-14 border-t border-slate-200 pt-6 text-sm leading-6 text-slate-500">
          Scientific interpretation only. AOD is not equivalent to surface PM2.5 or AQI. Public access to detailed MOSDAC-derived results remains restricted pending the relevant publication permissions.
        </footer>
      </main>
    </div>
  )
}
