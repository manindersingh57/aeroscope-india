import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Database, RefreshCw,
  ShieldAlert, SlidersHorizontal, X,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { aeroscopeApi, API_BASE, type Capabilities, type Model } from '../lib/aeroscopeApi'
import type { SeasonKey, StateComparison, StateSummary } from '../lib/regionalTypes'

const MAX_STATES = 4
const COLORS = ['#0f766e', '#d97706', '#2563eb', '#9333ea']
const CLUSTER_COLORS = ['#0f766e', '#4d89a8', '#a8556e', '#d58d46', '#8b5cf6', '#64748b', '#b45309']
const SEASONS: { key: SeasonKey; label: string }[] = [
  { key: 'winter', label: 'Winter' },
  { key: 'pre_monsoon', label: 'Pre-monsoon' },
  { key: 'monsoon', label: 'Monsoon' },
  { key: 'post_monsoon', label: 'Post-monsoon' },
]

function numeric(value: number | null | undefined, digits = 3): string {
  return value == null || !Number.isFinite(value) ? 'Not available' : value.toFixed(digits)
}
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load comparison results'
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-[#123844]">{value}</div>
      {note && <p className="mt-1 text-xs leading-5 text-slate-500">{note}</p>}
    </div>
  )
}

export default function CompareRegions() {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [states, setStates] = useState<string[]>([])
  const [summaries, setSummaries] = useState<StateSummary[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [pickedState, setPickedState] = useState('')
  const [model, setModel] = useState<Model>('model_a')
  const [retry, setRetry] = useState(0)
  const [loadingSetup, setLoadingSetup] = useState(true)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [comparison, setComparison] = useState<StateComparison | null>(null)
  const [loadingComparison, setLoadingComparison] = useState(false)
  const [comparisonError, setComparisonError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoadingSetup(true)
    setSetupError(null)
    setCapabilities(null)
    setStates([])
    setSummaries([])
    async function prepare() {
      try {
        const caps = await aeroscopeApi.capabilities(controller.signal)
        if (controller.signal.aborted) return
        setCapabilities(caps)
        if (!caps.research_data_loaded || !caps.research_results_available) return
        const [names, table] = await Promise.all([
          aeroscopeApi.states(controller.signal),
          aeroscopeApi.stateSummaries(controller.signal),
        ])
        if (controller.signal.aborted) return
        setStates(names)
        setSummaries(table)
        setSelected(previous => {
          const retained = previous.filter(name => names.includes(name))
          if (retained.length) return retained
          const preferred = ['Punjab', 'Haryana'].filter(name => names.includes(name))
          return preferred.length === 2 ? preferred : names.slice(0, 2)
        })
      } catch (error: unknown) {
        if (!controller.signal.aborted) setSetupError(errorMessage(error))
      } finally {
        if (!controller.signal.aborted) setLoadingSetup(false)
      }
    }
    void prepare()
    return () => controller.abort()
  }, [retry])

  const allowed = Boolean(capabilities?.research_data_loaded && capabilities?.research_results_available)
  const selectedKey = selected.join('\u0001')
  useEffect(() => {
    const controller = new AbortController()
    setComparison(null)
    setComparisonError(null)
    if (!allowed || selected.length < 2) {
      setLoadingComparison(false)
      return () => controller.abort()
    }
    setLoadingComparison(true)
    aeroscopeApi.compareStates(selected, controller.signal)
      .then(result => { if (!controller.signal.aborted) setComparison(result) })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setComparisonError(errorMessage(error))
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingComparison(false) })
    return () => controller.abort()
    // selectedKey changes only when state names or their order change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, selectedKey])

  const availableToAdd = useMemo(() => states.filter(name => !selected.includes(name)), [states, selected])
  const profiles = comparison?.states ?? []
  const summaryByState = useMemo(() => new Map(summaries.map(item => [item.state, item])), [summaries])
  const aerosolChart = profiles.map(item => ({ state: item.state, 'Mean AOD': item.aerosol.mean_aod }))
  const seasonsChart = SEASONS.map(season => {
    const record: Record<string, string | number | null> = { season: season.label }
    for (const item of profiles) record[item.state] = item.seasonal_matched.seasons[season.key]?.mean_aod ?? null
    return record
  })
  const validSeasonalSeries = profiles.filter(item => item.seasonal_matched.matched_cells > 0)
  const allClusterNames = Array.from(new Set(profiles.flatMap(item =>
    (model === 'model_a' ? item.model_a_distribution : item.model_b_distribution).map(cluster => cluster.cluster),
  ))).sort()

  function addState() {
    if (pickedState && !selected.includes(pickedState) && selected.length < MAX_STATES) {
      setSelected(previous => [...previous, pickedState])
      setPickedState('')
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f6f7] text-[#112f38]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-[#113e48] text-xl text-white">◎</span>
            <div><div className="text-lg font-bold tracking-tight">AeroScope <span className="text-[#1f8979]">India</span></div><div className="text-[10px] tracking-[0.19em] text-slate-500">SATELLITE RESEARCH PLATFORM</div></div>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link to="/explore" className="inline-flex items-center gap-1 rounded-full border border-teal-200 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">Explore atlas <ArrowRight size={15}/></Link>
            <Link to="/" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50"><ArrowLeft size={15}/> Home</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-9 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Research workspace · Regional comparison</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Compare historical aerosol patterns</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Select 2 to 4 Indian states or UTs. Inspect satellite AOD, data coverage, matched seasonal variation and cluster distributions using the actual Flask research results.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Activity size={14} className="text-teal-700"/> 23 Aug 2022 to 5 Jun 2024</div>
        </div>

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="State selection">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold"><SlidersHorizontal size={18} className="text-teal-700"/> Select states to compare</h2>
            <button type="button" onClick={() => setRetry(n => n + 1)} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:underline"><RefreshCw size={15}/> Retry data</button>
          </div>
          {loadingSetup && <p role="status" className="mt-4 text-sm text-slate-500">Connecting to Flask and loading available states…</p>}
          {setupError && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Unable to reach the Flask API: {setupError}. Make sure Flask is running at <code>{API_BASE}</code>.</div>}
          {!loadingSetup && !setupError && !allowed && (
            <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <ShieldAlert size={18} className="mt-0.5 shrink-0"/>
              <p>{!capabilities?.research_data_loaded ? 'The server is online but research data has not been installed.' : 'Detailed regional results are disabled in this environment until the relevant publication permissions are confirmed.'}</p>
            </div>
          )}
          {allowed && (
            <>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {selected.map((name, index) => (
                  <span key={name} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1 text-sm font-semibold">
                    <span className="size-2.5 rounded-full" style={{ background: COLORS[index] }}/>{name}
                    <button type="button" aria-label={`Remove ${name}`} onClick={() => setSelected(previous => previous.filter(item => item !== name))} className="rounded-full p-1.5 hover:bg-slate-200"><X size={14}/></button>
                  </span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <label htmlFor="state-add" className="sr-only">Choose a state</label>
                <select id="state-add" value={pickedState} onChange={event => setPickedState(event.target.value)} disabled={selected.length >= MAX_STATES} className="min-w-[220px] flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:opacity-50">
                  <option value="">Choose a state or UT…</option>
                  {availableToAdd.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <button type="button" disabled={!pickedState || selected.length >= MAX_STATES} onClick={addState} className="rounded-xl bg-[#113e48] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#195461] disabled:opacity-40">Add state</button>
              </div>
              <p className="mt-2 text-xs text-slate-500">{selected.length}/{MAX_STATES} selected. Comparisons update automatically. Select at least two states.</p>
            </>
          )}
        </section>

        {!loadingSetup && allowed && selected.length < 2 && <p role="status" className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Select at least two states to show comparison charts.</p>}
        {loadingComparison && <p role="status" className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading historical regional statistics…</p>}
        {comparisonError && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">State comparison API: {comparisonError}</p>}

        {comparison && profiles.length >= 2 && (
          <div className="mt-6 space-y-6">
            <section aria-label="Regional coverage" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {profiles.map((item, index) => (
                <div key={item.state} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: COLORS[index] }}/><h2 className="font-semibold">{item.state}</h2></div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <Metric label="Historical mean AOD" value={numeric(item.aerosol.mean_aod)} />
                    <Metric label="Valid AOD grid cells" value={`${numeric(item.coverage.valid_aod_percent, 1)}%`} note={`${item.coverage.valid_aod_cells.toLocaleString()} of ${item.coverage.total_grid_cells.toLocaleString()} cells`} />
                  </div>
                </div>
              ))}
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><BarChart3 size={18} className="text-teal-700"/><h2 className="font-semibold">Historical mean AOD by state</h2></div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Unweighted means of available satellite grid-cell summaries. Higher values indicate greater column aerosol optical depth, not surface AQI.</p>
                <div className="mt-5 h-72" role="img" aria-label="Bar chart comparing mean historical AOD across selected states">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={aerosolChart} margin={{ top: 5, right: 6, left: -18, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                      <XAxis dataKey="state" tick={{ fontSize: 11 }} interval={0}/>
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']}/>
                      <Tooltip/>
                      <Bar dataKey="Mean AOD" fill="#0f766e" radius={[5, 5, 0, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><Activity size={18} className="text-teal-700"/><h2 className="font-semibold">Matched-cell seasonal AOD</h2></div>
                <p className="mt-2 text-xs leading-5 text-slate-500">Each state's seasonal points use its own cells with data in all four seasons. Comparison groups can have different geographical samples.</p>
                {validSeasonalSeries.length ? (
                  <div className="mt-5 h-72" role="img" aria-label="Line chart comparing seasonal mean AOD for selected states">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={seasonsChart} margin={{ top: 5, right: 7, left: -18, bottom: 6 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                        <XAxis dataKey="season" tick={{ fontSize: 10 }} interval={0}/>
                        <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']}/>
                        <Tooltip/>
                        <Legend wrapperStyle={{ fontSize: 12 }}/>
                        {profiles.map((item, index) => (
                          <Line key={item.state} type="monotone" dataKey={item.state} name={item.state}
                            stroke={COLORS[index]} strokeWidth={2.5} dot={{ r: 4 }} connectNulls={false}/>
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p role="status" className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">No states in this comparison have complete matched-cell seasonal data.</p>}
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-semibold">Cluster distribution by state</h2><p className="mt-1 text-xs leading-5 text-slate-500">Percentages are of eligible grid cells within each selected state and model.</p></div>
                <div className="flex gap-2" role="group" aria-label="Select clustering model">
                  {(['model_a', 'model_b'] as const).map(id => <button type="button" key={id} aria-pressed={model === id} onClick={() => setModel(id)} className={`rounded-full px-4 py-2 text-xs font-semibold ${model === id ? 'bg-teal-800 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{id === 'model_a' ? 'Model A' : 'Model B'}</button>)}
                </div>
              </div>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                {profiles.map(item => {
                  const entries = model === 'model_a' ? item.model_a_distribution : item.model_b_distribution
                  const eligible = model === 'model_a' ? item.coverage.model_a_cells : item.coverage.model_b_cells
                  const pct = model === 'model_a' ? item.coverage.model_a_percent : item.coverage.model_b_percent
                  return (
                    <div key={`${model}-${item.state}`} className="rounded-xl bg-slate-50 p-4">
                      <h3 className="font-semibold">{item.state}</h3>
                      <p className="mt-1 text-xs text-slate-500">{eligible.toLocaleString()} eligible cells · {numeric(pct, 1)}% of state grid</p>
                      {entries.length === 0 ? <p className="mt-4 text-sm text-slate-500">No eligible cluster assignments for this model.</p> : (
                        <div className="mt-4 space-y-3">
                          {entries.map(entry => {
                            const colorIndex = allClusterNames.indexOf(entry.cluster)
                            return <div key={entry.cluster}>
                              <div className="mb-1 flex items-start justify-between gap-3 text-xs"><span className="font-medium">{entry.cluster}</span><span className="shrink-0 text-slate-600">{numeric(entry.percent_of_eligible, 1)}%</span></div>
                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, entry.percent_of_eligible))}%`, background: CLUSTER_COLORS[colorIndex % CLUSTER_COLORS.length] }}/></div>
                            </div>
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-semibold"><Database size={18} className="text-teal-700"/> Coverage and sampling details</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead><tr className="border-b border-slate-200 text-xs text-slate-500"><th className="py-3 pr-4">State / UT</th><th className="py-3 pr-4">Grid cells</th><th className="py-3 pr-4">Valid AOD</th><th className="py-3 pr-4">Model A</th><th className="py-3 pr-4">Model B</th><th className="py-3 pr-4">Matched seasonal cells</th></tr></thead>
                  <tbody>
                    {profiles.map(item => (
                      <tr key={item.state} className="border-b border-slate-100">
                        <th scope="row" className="py-3 pr-4 font-semibold">{item.state}</th>
                        <td className="py-3 pr-4">{item.coverage.total_grid_cells.toLocaleString()}</td>
                        <td className="py-3 pr-4">{numeric(item.coverage.valid_aod_percent, 1)}%</td>
                        <td className="py-3 pr-4">{numeric(item.coverage.model_a_percent, 1)}%</td>
                        <td className="py-3 pr-4">{numeric(item.coverage.model_b_percent, 1)}%</td>
                        <td className="py-3 pr-4">{item.seasonal_matched.matched_cells.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">State summaries are precomputed from grid cells. Missing values are not converted to zero. {summaryByState.size > 0 ? `${summaryByState.size} state summaries loaded.` : ''}</p>
            </section>

            <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              <h2 className="flex items-center gap-2 font-semibold"><ShieldAlert size={18}/> How to interpret this comparison</h2>
              <p className="mt-2">{comparison.comparison_note}</p>
              <p className="mt-2">AOD measures atmospheric column aerosol extinction. It is not a direct measurement of ground-level PM2.5, air quality index, health exposure, or emissions. Results are historical and should not be interpreted as real-time conditions.</p>
            </aside>
          </div>
        )}
        <footer className="mt-10 border-t border-slate-200 pt-5 text-xs leading-6 text-slate-500">AeroScope India · Historical INSAT-3D AOD · Research demonstration · MOSDAC/SAC/ISRO acknowledgement required · Public distribution of detailed research outputs remains subject to authorization.</footer>
      </main>
    </div>
  )
}
