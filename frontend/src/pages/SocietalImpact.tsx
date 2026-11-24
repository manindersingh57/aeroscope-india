import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, BarChart3, BookOpen, CalendarDays, CheckCircle2,
  ChevronDown, CloudSun, Database, Download, FileDown,
  FileText, Info, Landmark, MapPin, Printer, Search, ShieldCheck,
  TriangleAlert, Users, Waves,
} from 'lucide-react'
import { aeroscopeApi, type Capabilities } from '../lib/aeroscopeApi'
import type { ClusterShare, SeasonKey, StateProfile, StateSummary } from '../lib/regionalTypes'
import '../styles/aeroscope-impact.css'

type Status = 'checking' | 'restricted' | 'available' | 'offline'
const seasonLabels: Record<SeasonKey, string> = {
  winter: 'Winter', pre_monsoon: 'Pre-monsoon', monsoon: 'Monsoon', post_monsoon: 'Post-monsoon',
}
const seasonOrder: SeasonKey[] = ['winter', 'pre_monsoon', 'monsoon', 'post_monsoon']
const number = (value: number | null | undefined, digits = 3) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'Not available'
const integer = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-IN') : 'Not available'
const pct = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : 'Not available'
const message = (error: unknown) => error instanceof Error ? error.message : 'Unable to load this result.'

function seasonSnapshot(profile: StateProfile | null) {
  const matched = profile?.seasonal_matched
  if (!matched || matched.matched_cells < 1) return []
  return seasonOrder.map(key => ({ key, label: seasonLabels[key], value: matched.seasons[key]?.mean_aod ?? null }))
    .filter((row): row is { key: SeasonKey; label: string; value: number } =>
      typeof row.value === 'number' && Number.isFinite(row.value))
}

function topCluster(items: ClusterShare[]) {
  return [...items].sort((a, b) => b.cells - a.cells)[0] ?? null
}

type Comparison = { rank: number; total: number; percentile: number; topQuartile: boolean } | null
function stateComparison(selectedState: string, summaries: StateSummary[]): Comparison {
  // Exploratory peer comparison. A coverage floor avoids ranking states with very sparse retrievals.
  const eligible = summaries.filter(s => s.mean_aod !== null && Number.isFinite(s.mean_aod) &&
    s.valid_aod_cells >= 30 && s.valid_aod_percent >= 50)
    .sort((a, b) => (b.mean_aod ?? -1) - (a.mean_aod ?? -1))
  const rank = eligible.findIndex(s => s.state === selectedState)
  if (rank < 0 || eligible.length < 8) return null
  return { rank: rank + 1, total: eligible.length,
    percentile: Math.round(100 * (eligible.length - rank) / eligible.length),
    topQuartile: rank < Math.ceil(eligible.length / 4) }
}

function interpret(profile: StateProfile, comparison: Comparison, seasons: ReturnType<typeof seasonSnapshot>) {
  const result: string[] = []
  if (profile.aerosol.mean_aod !== null) {
    result.push(`The available satellite grid cells in ${profile.state} have a historical mean AOD of ${number(profile.aerosol.mean_aod)}. AOD describes aerosol loading through the atmospheric column, not ground-level PM₂.₅.`)
  }
  if (comparison) {
    result.push(`${profile.state} ranks ${comparison.rank} of ${comparison.total} states/territories meeting the exploratory coverage filter (at least 30 valid cells and 50% spatial coverage) when ranked by historical mean AOD. This is not a public-health or air-quality ranking.`)
  }
  if (seasons.length === 4 && profile.seasonal_matched.matched_cells > 0) {
    const peak = [...seasons].sort((a, b) => b.value - a.value)[0]
    result.push(`Among ${integer(profile.seasonal_matched.matched_cells)} cells matched across all four seasons, ${peak.label.toLowerCase()} has the highest historical mean AOD (${number(peak.value)}). This is a retrospective pattern, not a future forecast.`)
  }
  if (profile.coverage.valid_aod_percent < 50) {
    result.push('Fewer than half of the state grid cells have valid overall AOD summaries; interpretation should be especially cautious.')
  }
  return result
}

function riskNotes(profile: StateProfile, comparison: Comparison, seasons: ReturnType<typeof seasonSnapshot>) {
  const notes: Array<{ label: string; detail: string; kind: 'highlight' | 'neutral' | 'caution' }> = []
  if (comparison?.topQuartile) notes.push({ label: 'Relative AOD review candidate', kind: 'highlight',
    detail: 'This state appears in the upper quarter of eligible states by historical mean AOD. Consider independent ground-monitoring comparisons before making policy decisions.' })
  else if (comparison) notes.push({ label: 'Peer comparison available', kind: 'neutral',
    detail: 'The historical mean AOD can be compared with other states meeting the same minimum data-coverage filter.' })
  else notes.push({ label: 'Ranking withheld', kind: 'caution',
    detail: 'Insufficient comparable coverage or too few eligible states for the exploratory comparison. No priority label is assigned.' })

  if (seasons.length === 4 && profile.seasonal_matched.matched_cells > 0) {
    const peak = [...seasons].sort((a, b) => b.value - a.value)[0]
    notes.push({ label: `${peak.label} observation window`, kind: 'neutral',
      detail: `Historically the highest matched-cell seasonal mean AOD. Investigate this season for additional monitoring; do not interpret as a forecast or public health alert.` })
  } else notes.push({ label: 'Seasonal evidence insufficient', kind: 'caution',
    detail: 'Model B matched-season data is unavailable. A preferred monitoring season cannot be identified responsibly.' })

  if (profile.coverage.valid_aod_percent < 50) notes.push({ label: 'Data-coverage gap', kind: 'caution',
    detail: 'Prioritize checking satellite retrieval quality and ground-station availability before drawing regional conclusions.' })
  else notes.push({ label: 'Coverage documented', kind: 'neutral',
    detail: `${pct(profile.coverage.valid_aod_percent)} of state grid cells have historical mean AOD summaries. Coverage does not guarantee equal observation dates or absence of retrieval bias.` })
  return notes
}

function reportContent(profile: StateProfile, comparison: Comparison, seasons: ReturnType<typeof seasonSnapshot>) {
  const lines = [
    'AEROSCOPE INDIA | REGIONAL ENVIRONMENTAL RESEARCH BRIEF',
    `Region: ${profile.state}`,
    'Source: INSAT-3D / MOSDAC historical AOD | Study window: Aug 2022–Jun 2024',
    'Purpose: Exploratory environmental monitoring and public education',
    '',
    '1. HISTORICAL AEROSOL PROFILE',
    `Mean AOD (unweighted grid-cell mean): ${number(profile.aerosol.mean_aod)}`,
    `Median grid-cell mean AOD: ${number(profile.aerosol.median_cell_mean_aod)}`,
    `Standard deviation of grid-cell means: ${number(profile.aerosol.std_of_cell_mean_aod)}`,
    `Valid grid cells: ${integer(profile.coverage.valid_aod_cells)} / ${integer(profile.coverage.total_grid_cells)}`,
    `Coverage of grid cells: ${pct(profile.coverage.valid_aod_percent)}`,
    `Relative eligible-state position: ${comparison ? `${comparison.rank} of ${comparison.total}` : 'Not defensibly available'}`,
    '', '2. SEASONAL PATTERNS (SAME MATCHED GRID CELLS)',
    `Matched cells: ${integer(profile.seasonal_matched.matched_cells)}`,
    ...seasonOrder.map(key => `${seasonLabels[key]} mean AOD: ${number(profile.seasonal_matched.seasons[key]?.mean_aod)}`),
    '', '3. MODEL A / BROAD AEROSOL CLUSTERS',
    ...(profile.model_a_distribution.length ? profile.model_a_distribution.map(d => `${d.cluster}: ${integer(d.cells)} cells (${pct(d.percent_of_eligible)} of Model A eligible)`) : ['No Model A distribution available']),
    '', '4. MODEL B / SEASONAL AEROSOL CLUSTERS',
    ...(profile.model_b_distribution.length ? profile.model_b_distribution.map(d => `${d.cluster}: ${integer(d.cells)} cells (${pct(d.percent_of_eligible)} of Model B eligible)`) : ['No Model B distribution available']),
    '', '5. PLAIN-LANGUAGE INTERPRETATION',
    ...interpret(profile, comparison, seasons),
    '', '6. EXPLORATORY FOLLOW-UP SIGNALS',
    ...riskNotes(profile, comparison, seasons).map(item => `${item.label}: ${item.detail}`),
    '', 'DATA AND USE LIMITATIONS',
    'Historical satellite AOD is not live AQI, exposure, surface PM2.5, a medical warning, or a forecast.',
    'State means are unweighted averages of available cell summaries; spatial and temporal sampling can differ.',
    'Monitoring candidates are qualitative screening suggestions, NOT validated public-policy priority rankings.',
    'Check MOSDAC and other data-provider licensing before publishing or redistributing derived results.',
    'Use official CPCB air quality monitoring for current ground-level information.',
    'CPCB AQI: https://app.cpcbccr.com/AQIIndia',
    '', 'Report produced locally in the browser from research API data. No additional research calculation or external data upload.',
  ]
  return lines.join('\n')
}

function Stat({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <div className="ai-stat"><span>{title}</span><strong>{value}</strong><small>{detail}</small></div>
}

export default function SocietalImpact() {
  const [params, setParams] = useSearchParams()
  const requestedState = params.get('state') || ''
  const [status, setStatus] = useState<Status>('checking')
  const [statusMessage, setStatusMessage] = useState('')
  const [summaries, setSummaries] = useState<StateSummary[]>([])
  const [state, setState] = useState(requestedState)
  const [profile, setProfile] = useState<StateProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [reportNotice, setReportNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setStatus('checking')
    aeroscopeApi.capabilities(controller.signal)
      .then((caps: Capabilities) => {
        if (controller.signal.aborted) return
        if (!caps.research_data_loaded || !caps.research_results_available) {
          setStatus('restricted')
          setStatusMessage('The public research API does not release state-level results. Run the approved local Flask research backend to activate real insights.')
          return
        }
        aeroscopeApi.stateSummaries(controller.signal).then(rows => {
          if (controller.signal.aborted) return
          setSummaries(rows)
          setStatus('available')
          setStatusMessage('')
          setState(current => current || (rows.find(item => item.state === 'Punjab')?.state ?? rows[0]?.state ?? ''))
        }).catch(error => {
          if (!controller.signal.aborted) { setStatus('offline'); setStatusMessage(message(error)) }
        })
      })
      .catch(error => {
        if (!controller.signal.aborted) { setStatus('offline'); setStatusMessage(message(error)) }
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setProfile(null)
    setProfileError('')
    setReportNotice('')
    if (status !== 'available' || !state) return () => controller.abort()
    setProfileLoading(true)
    aeroscopeApi.stateProfile(state, controller.signal)
      .then(result => { if (!controller.signal.aborted) setProfile(result) })
      .catch(error => { if (!controller.signal.aborted) setProfileError(message(error)) })
      .finally(() => { if (!controller.signal.aborted) setProfileLoading(false) })
    return () => controller.abort()
  }, [state, status])

  function chooseState(next: string) {
    setState(next)
    setParams(p => { const nextParams = new URLSearchParams(p); if (next) nextParams.set('state', next); else nextParams.delete('state'); return nextParams }, { replace: true })
  }

  const comparison = useMemo(() => stateComparison(state, summaries), [state, summaries])
  const seasons = useMemo(() => seasonSnapshot(profile), [profile])
  const interpretation = useMemo(() => profile ? interpret(profile, comparison, seasons) : [], [profile, comparison, seasons])
  const monitoring = useMemo(() => profile ? riskNotes(profile, comparison, seasons) : [], [profile, comparison, seasons])
  const highestSeason = useMemo(() => seasons.length === 4 ? [...seasons].sort((a, b) => b.value - a.value)[0] : null, [seasons])
  const peakMean = Math.max(...seasons.map(s => s.value), 0.01)
  const topA = profile ? topCluster(profile.model_a_distribution) : null
  const topB = profile ? topCluster(profile.model_b_distribution) : null

  function downloadReport() {
    if (!profile) return
    const report = reportContent(profile, comparison, seasons)
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `AeroScope_Regional_Brief_${profile.state.replace(/[^A-Za-z0-9]+/g, '_')}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setReportNotice('Regional research brief downloaded as text. Review the data licence before redistributing it.')
  }

  return <div className="ai-page">
    <header className="ai-header">
      <div>
        <span className="ai-eyebrow"><Waves size={15}/> RESEARCH INTO REAL-WORLD UNDERSTANDING</span>
        <h1>From data to <em>public value.</em></h1>
        <p>Making historical satellite aerosol patterns easier to understand, compare and investigate, while being clear about what these observations can and cannot tell us.</p>
        <div className="ai-header-actions"><Link to="/explore" className="ai-action-primary">Explore India atlas <ArrowUpRight size={17}/></Link><Link to="/research" className="ai-action-secondary">Research methodology <ArrowRight size={16}/></Link></div>
      </div>
      <div className="ai-purpose-badge" aria-label="Public benefit research">
        <div className="ai-purpose-emblem"><Users size={31}/></div>
        <b>Research for people</b>
        <span>Citizens · Researchers · Monitoring teams</span>
        <div className="ai-purpose-sparks"><span/><span/><span/></div>
      </div>
    </header>

    <div className="ai-section-heading"><span>THE SOCIAL IMPACT WORKSPACE</span><strong>Three practical tools, one connected research story.</strong></div>
    <div className="ai-workspace">
      <aside className="ai-left-column">
        <section className="ai-card ai-selector">
          <div className="ai-card-heading"><span className="ai-index">01 / SELECT REGION</span><MapPin size={19}/></div>
          <h2>Know your region</h2>
          <p>Choose a state to explore its historical satellite aerosol profile.</p>
          <label htmlFor="ai-state">INDIAN STATE / UT</label>
          <div className="ai-select-wrap"><Search size={17}/><select id="ai-state" value={state} onChange={event => chooseState(event.target.value)} disabled={status !== 'available'}>
            {status !== 'available' && <option value="">Research data unavailable</option>}
            {status === 'available' && !state && <option value="">Select a state</option>}
            {summaries.map(s => <option key={s.state} value={s.state}>{s.state}</option>)}
          </select><ChevronDown size={15}/></div>
          <div className={`ai-source-state ai-source-${status}`}>
            <span className="ai-state-dot"/>{status === 'checking' ? 'Checking Flask research data…' : status === 'available' ? 'Local research data connected' : status === 'restricted' ? 'Public research access restricted' : 'Flask API unavailable'}
          </div>
          {statusMessage && <p className="ai-status-message" role="status">{statusMessage}</p>}
          {profileError && <p className="ai-status-message" role="alert">{profileError}</p>}
        </section>

        <section className="ai-card ai-coverage">
          <div className="ai-card-heading"><span className="ai-index">02 / EVIDENCE QUALITY</span><Database size={19}/></div>
          <h2>Data confidence</h2>
          <p>Research interpretations are only as useful as the observations supporting them.</p>
          <div className="ai-coverage-track"><span style={{ width: `${Math.max(0, Math.min(100, profile?.coverage.valid_aod_percent ?? 0))}%` }}/></div>
          <strong className="ai-coverage-figure">{profile ? pct(profile.coverage.valid_aod_percent) : '—'}</strong>
          <span className="ai-small-caption">Grid cells with available mean AOD</span>
          <div className="ai-divider"/>
          <div className="ai-aside-row"><span>Valid grid cells</span><b>{profile ? integer(profile.coverage.valid_aod_cells) : '—'}</b></div>
          <div className="ai-aside-row"><span>Matched seasonal cells</span><b>{profile ? integer(profile.seasonal_matched.matched_cells) : '—'}</b></div>
          <small className="ai-muted">This is spatial grid coverage, not temporal completeness or a statistical confidence interval.</small>
        </section>

        <section className="ai-card ai-why">
          <div className="ai-card-heading"><span className="ai-index">03 / WHO BENEFITS</span><Landmark size={19}/></div>
          <div className="ai-beneficiary"><Users size={17}/><span><b>Citizens & students</b><small>Clear, accessible regional explanations</small></span></div>
          <div className="ai-beneficiary"><Search size={17}/><span><b>Researchers</b><small>Candidate areas for validation studies</small></span></div>
          <div className="ai-beneficiary"><MapPin size={17}/><span><b>Monitoring teams</b><small>Evidence to inform follow-up observations</small></span></div>
        </section>
      </aside>

      <main className="ai-main-column">
        <section className="ai-card ai-region-detail">
          <div className="ai-card-heading"><span className="ai-index">01 / KNOW YOUR REGION</span><CloudSun size={20}/></div>
          <div className="ai-subhead"><div><h2>{profile?.state || state || 'India'} <span>· Historical aerosol portrait</span></h2><p>Satellite AOD summarised from the available research grid cells.</p></div><span className="ai-timeline-chip">2022–2024 · Historical</span></div>
          {profileLoading && <div className="ai-shimmer" role="status">Loading verified state data…</div>}
          {profile ? <>
            <div className="ai-stats-grid">
              <Stat title="MEAN AOD" value={number(profile.aerosol.mean_aod)} detail="Unitless · historical grid average"/>
              <Stat title="ELIGIBLE-STATE RANK" value={comparison ? `${comparison.rank} / ${comparison.total}` : '—'} detail="Coverage-filtered · not AQI"/>
              <Stat title="SEASONAL PEAK" value={highestSeason?.label || '—'} detail={highestSeason ? `Matched mean AOD ${number(highestSeason.value)}` : 'Insufficient matched data'}/>
            </div>
            <div className="ai-interpretation"><span><BookOpen size={16}/> WHAT THESE NUMBERS ACTUALLY MEAN</span>{interpretation.map(line => <p key={line}>{line}</p>)}</div>
            <div className="ai-cluster-grid">
              <div><span className="ai-tiny-label">MODEL A · BROAD LOADING</span><strong>{topA?.cluster || 'Not available'}</strong><small>{topA ? `${pct(topA.percent_of_eligible)} of Model A eligible cells` : 'No matched cluster profile'}</small></div>
              <div><span className="ai-tiny-label">MODEL B · SEASONAL BEHAVIOUR</span><strong>{topB?.cluster || 'Not available'}</strong><small>{topB ? `${pct(topB.percent_of_eligible)} of Model B eligible cells` : 'No matched cluster profile'}</small></div>
            </div>
          </> : <div className="ai-empty"><Info size={23}/><strong>{status === 'restricted' ? 'Research details are protected on the public site' : status === 'available' ? 'Choose a region to view real data' : 'Verified state measurements not loaded'}</strong><span>We never substitute invented pollution values, percentages or model clusters.</span></div>}
        </section>

        <section className="ai-card ai-monitoring">
          <div className="ai-card-heading"><span className="ai-index">02 / MONITORING PRIORITIES + SEASONAL INSIGHTS</span><BarChart3 size={20}/></div>
          <div className="ai-subhead"><div><h2>Where should we investigate further?</h2><p>Exploratory screening signals, not official risk classifications or health alerts.</p></div></div>
          {profile ? <>
            <div className="ai-monitoring-signals">{monitoring.map((signal, i) => <div className={`ai-signal ai-signal-${signal.kind}`} key={`${signal.label}-${i}`}>
              {signal.kind === 'caution' ? <TriangleAlert size={20}/> : signal.kind === 'highlight' ? <Search size={20}/> : <CheckCircle2 size={20}/>}
              <div><strong>{signal.label}</strong><p>{signal.detail}</p></div>
            </div>)}</div>
            <div className="ai-season-figure"><div className="ai-season-top"><h3><CalendarDays size={17}/> Matched-grid seasonal history</h3><span>{integer(profile.seasonal_matched.matched_cells)} matched cells</span></div>
              {seasons.length === 4 ? <div className="ai-season-rows">{seasons.map(s => <div key={s.key} className="ai-season-row">
                <span>{s.label}</span><div className="ai-season-bar"><span style={{width: `${Math.max(0, Math.min(100, (s.value / peakMean) * 100))}%`}}/></div><b>{number(s.value)}</b>
              </div>)}</div> : <div className="ai-season-empty">Matched four-season evidence is unavailable for this region. Seasonal comparisons are withheld.</div>}
              <small>Each bar uses the same eligible geographic cells in that state. Different states do not necessarily share the same observation footprints.</small>
            </div>
          </> : <div className="ai-empty ai-empty-short"><CalendarDays size={23}/><span>Select a state and connect the permitted research backend to view defensible monitoring signals.</span></div>}
        </section>

        <section className="ai-card ai-report" id="impact-report">
          <div className="ai-card-heading"><span className="ai-index">03 / SHAREABLE RESEARCH SUMMARY</span><FileText size={20}/></div>
          <div className="ai-report-layout"><div className="ai-report-art"><FileDown size={29}/><span>REGIONAL<br/>RESEARCH<br/>BRIEF</span></div>
            <div className="ai-report-copy"><h2>Turn findings into a useful report.</h2><p>Create a regional brief containing verified historical AOD, model cluster composition, seasonal observations, data quality and cautious monitoring suggestions.</p>
              <div className="ai-report-actions"><button className="ai-action-primary" type="button" disabled={!profile} onClick={downloadReport}><Download size={17}/> Download brief (.txt)</button><button className="ai-action-secondary ai-print-button" type="button" disabled={!profile} onClick={() => window.print()}><Printer size={17}/> Print / Save as PDF</button></div>
              {reportNotice && <p className="ai-report-feedback" role="status">{reportNotice}</p>}
              <small><ShieldCheck size={13}/> Generated in this browser. Respect MOSDAC redistribution restrictions before sharing.</small>
            </div>
          </div>
        </section>

        <footer className="ai-disclaimer"><Info size={18}/><p><strong>Scientific boundary:</strong> Aerosol optical depth measures atmospheric-column aerosol loading. It is not live AQI, surface PM₂.₅, personal exposure or a health warning. For current ground-level readings, consult the <a href="https://app.cpcbccr.com/AQIIndia" target="_blank" rel="noreferrer">official CPCB AQI dashboard <ArrowUpRight size={13}/></a>.</p></footer>
      </main>
    </div>

    <section className="ai-next">
      <div><span className="ai-index">NEXT STEP · INDEPENDENT EVIDENCE</span><h2>Close the loop with ground observations.</h2><p>The next scientifically valuable extension is comparing matched satellite observations with permitted CPCB station data, including dates, distances, bias and uncertainty. The platform does not claim this validation has already been performed.</p></div>
      <a href="https://airquality.cpcb.gov.in/AQI_India/" target="_blank" rel="noreferrer">Official air quality source <ArrowUpRight size={17}/></a>
    </section>
  </div>
}
