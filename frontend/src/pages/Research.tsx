import UpdatedModelSnapshot from '../components/UpdatedModelSnapshot'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, ArrowUpRight, BarChart3,
  BookOpen, CalendarDays, Check, ChevronDown, ChevronRight,
  CircleHelp, ClipboardCheck, CloudSun, Database,
  ExternalLink, FileText, FlaskConical, Globe2, Layers3,
  Map, MapPinned, Microscope, Orbit, ScanLine, ShieldAlert,
  ShieldCheck, SlidersHorizontal, Sparkles, TableProperties,
  Waves, Workflow,
} from 'lucide-react'
import '../styles/aeroscope-research.css'

type MethodIcon = typeof Database

type Step = {
  number: string
  label: string
  title: string
  description: string
  icon: MethodIcon
  detail: string
}

// All facts below follow the existing public-safe Research page and project methodology.
// Workflow graphics describe *methods*, not fabricated measured time series or scores.
const workflow: Step[] = [
  {
    number: '01', label: 'ACQUIRE', title: 'Catalogue observations', icon: Database,
    description: 'Read acquisition timestamps and identify duplicates across source GeoTIFFs.',
    detail: 'INSAT-3D scene timestamps are parsed from downloaded GeoTIFF filenames. The catalogue checks the available observation window, duplicated acquisitions and missing dates before raster analysis.',
  },
  {
    number: '02', label: 'VALIDATE', title: 'Validate raster data', icon: ScanLine,
    description: 'Check shape, CRS, transform and AOD validity.',
    detail: 'Verify the raster grid, coordinate reference system, transform and bands. Mask NoData values, non-finite pixels and physically invalid negative AOD rather than treating them as genuine measurements.',
  },
  {
    number: '03', label: 'AGGREGATE', title: 'Aggregate over time', icon: CalendarDays,
    description: 'Create daily and seasonal summaries with coverage counts.',
    detail: 'Generate daily summaries, then construct overall and seasonal grid-cell profiles. Valid observations and valid-day counts are retained for coverage assessment rather than being hidden by a global imputation.',
  },
  {
    number: '04', label: 'LOCATE', title: 'Define India study grid', icon: MapPinned,
    description: 'Filter cell centres to India and associate states/UTs.',
    detail: 'Use exploratory Natural Earth administrative boundaries to retain grid-cell centres inside India. State and UT assignments are approximate near boundaries and some cells may remain unassigned.',
  },
  {
    number: '05', label: 'ENGINEER', title: 'Engineer & scale features', icon: SlidersHorizontal,
    description: 'Calculate AOD descriptors and standardized model inputs.',
    detail: 'Compute overall AOD summary features and seasonal contrasts. Coverage rules create separate eligible subsets for Models A and B, and input features are standardized before K-Means fitting.',
  },
  {
    number: '06', label: 'EVALUATE', title: 'Cluster & evaluate', icon: FlaskConical,
    description: 'Test K=2–8, PCA, internal indices and robustness.',
    detail: 'K-Means candidate counts from 2 through 8 are assessed with inertia/WCSS, Silhouette and Davies–Bouldin. PCA, alternate algorithms and repeatability checks complement numerical model selection.',
  },
  {
    number: '07', label: 'INTERPRET', title: 'Interpret regions', icon: Globe2,
    description: 'Describe cluster profiles and map connected AOD regions.',
    detail: 'Interpret clusters in original AOD units, compare geographic and state composition, and identify connected elevated-loading regions for exploratory map presentation without claiming source attribution.',
  },
]

const limitations = [
  { title: 'AOD is not AQI or PM2.5', icon: Waves, body: 'Satellite aerosol optical depth describes aerosol extinction through an atmospheric column. It is not a direct surface PM2.5 concentration, health-risk score or regulatory AQI classification.' },
  { title: 'Historical, uneven coverage', icon: CloudSun, body: 'Availability varies across space and time because of cloud cover and retrieval conditions. Model B requires complete seasonal coverage, which reduces the eligible cell set. Comparisons may reflect sampling differences.' },
  { title: 'Patterns are not emission sources', icon: Map, body: 'Elevated historical AOD at a location does not prove that emissions originate there. Transport, meteorology, retrieval assumptions and viewing geometry may influence the observed pattern.' },
  { title: 'Clusters are relative descriptions', icon: Layers3, body: 'A cluster label is specific to the selected dataset, feature engineering and distance geometry. PCA position, clustering scores and centroid distances are not probabilities or independently verified health categories.' },
  { title: 'Geographical boundaries are approximate', icon: Globe2, body: 'Country and state allocations are derived from exploratory boundary files and grid-cell centre positions. Border cells may be ambiguous or unassigned, and raster cells are not exact administrative polygons.' },
  { title: 'Responsible publication and sharing', icon: ShieldAlert, body: 'The public website may describe its methodology without redistributing original MOSDAC products or detailed derived grid results. Data publication must be checked against applicable permissions before release.' },
]

const metrics = [
  { title: 'WCSS / INERTIA', subtitle: 'Within-cluster dispersion', note: 'Review the elbow within each model’s own standardized feature space.', icon: BarChart3, tone: 'green' },
  { title: 'SILHOUETTE', subtitle: 'Cohesion and separation', note: 'Computed on a reproducible 3,000-cell sample where available.', icon: Activity, tone: 'orange' },
  { title: 'DAVIES–BOULDIN', subtitle: 'Scatter versus separation', note: 'Lower values are preferred; interpret with other diagnostics.', icon: Microscope, tone: 'purple' },
  { title: 'PCA', subtitle: '2D interpretive projection', note: 'Visualizes standardized feature patterns and cluster-centroid positions.', icon: Orbit, tone: 'blue' },
  { title: 'ROBUSTNESS', subtitle: 'Repeated-run agreement', note: 'Includes random seeds, subsampling and alternative feature weightings.', icon: ShieldCheck, tone: 'green' },
  { title: 'COMPARISON', subtitle: 'Alternative algorithms', note: 'Includes Gaussian Mixture Models and Manhattan K-Medians as separately defined comparisons.', icon: Layers3, tone: 'orange' },
] as const

const sections = [
  { id: 'source', label: 'Data source', short: '01' },
  { id: 'pipeline', label: 'Research pipeline', short: '02' },
  { id: 'features', label: 'Feature engineering', short: '03' },
  { id: 'models', label: 'Model architecture', short: '04' },
  { id: 'validation', label: 'Validation', short: '05' },
  { id: 'limitations', label: 'Limitations & ethics', short: '06' },
  { id: 'reproducibility', label: 'Reproducibility', short: '07' },
] as const

function SectionHeading({ number, title, sub, id, action }: { number: string; title: string; sub?: string; id: string; action?: ReactNode }) {
  return <div id={id} className="al-r-sectionhead">
    <div><div className="al-r-eyebrow"><span>{number}</span> RESEARCH METHODS</div>
      <h2 id={`${id}-heading`}>{title}</h2>{sub && <p>{sub}</p>}
    </div>{action && <div className="al-r-sectionaction">{action}</div>}
  </div>
}

function IconBadge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'orange' | 'purple' | 'blue' }) {
  return <span className={`al-r-iconbadge al-r-iconbadge-${tone}`}>{children}</span>
}

function SeasonStrip() {
  const months = [
    ['Dec', 'winter'], ['Jan', 'winter'], ['Feb', 'winter'],
    ['Mar', 'pre'], ['Apr', 'pre'], ['May', 'pre'],
    ['Jun', 'monsoon'], ['Jul', 'monsoon'], ['Aug', 'monsoon'], ['Sep', 'monsoon'],
    ['Oct', 'post'], ['Nov', 'post'],
  ] as const
  return <div className="al-r-seasonline" aria-label="The four methodological season definitions">
    {months.map(([month, season]) => <div key={month} className={`al-r-month al-r-month-${season}`}><span>{month}</span><i /></div>)}
  </div>
}

export default function Research() {
  const [activeStep, setActiveStep] = useState(0)
  const [openAll, setOpenAll] = useState(false)
  return <div className="al-r" id="research-top">
    <div className="al-r-pagehead">
      <div>
        <div className="al-r-kicker"><span className="al-r-kicker-dot"/> AEROSCOPE INDIA <span className="al-r-kicker-slash">/</span> RESEARCH LIBRARY</div>
        <h1>Methodology<span className="al-r-head-em"> & Research.</span></h1>
        <p>The science behind every pattern. From INSAT-3D observations to interpretable aerosol clusters.</p>
      </div>
      <div className="al-r-head-right"><div className="al-r-period"><CalendarDays size={15}/> 23 Aug 2022 – 05 Jun 2024</div>
        <Link to="/models" className="al-r-head-link">Explore ML Lab <ArrowUpRight size={16}/></Link>
      </div>
    </div>

    <div className="al-r-topmetrics" aria-label="Research dataset facts">
      <div className="al-r-topmetric"><small>SCENE FILES</small><strong>4,212</strong><span>Source GeoTIFFs <Database size={16}/></span></div>
      <div className="al-r-topmetric"><small>OBSERVATION DATES</small><strong>643</strong><span>Unique historical days <CalendarDays size={16}/></span></div>
      <div className="al-r-topmetric"><small>INDIA STUDY GRID</small><strong>27,937</strong><span>Geographic cells <MapPinned size={16}/></span></div>
      <div className="al-r-topmetric"><small>SELECTED MODELS</small><strong>02</strong><span>Complementary feature sets <FlaskConical size={16}/></span></div>
    </div>

    <UpdatedModelSnapshot />
    <div className="al-r-intro-grid">
      <article className="al-r-intro-card">
        <div className="al-r-intro-copy"><span className="al-r-minilabel"><Sparkles size={14}/> RESEARCH AT A GLANCE</span>
          <h2>From space observations<br/>to <em>regional intelligence.</em></h2>
          <p>We transform historical aerosol optical depth (AOD) imagery into reproducible spatial and seasonal groupings, while tracking retrieval quality and uncertainty.</p>
          <div className="al-r-intro-tags"><span><Check size={13}/> Historical AOD</span><span><Check size={13}/> Unsupervised ML</span><span><Check size={13}/> India-wide study</span></div>
          <a href="#pipeline" className="al-r-intro-action">Explore the methodology <ArrowRight size={16}/></a>
        </div>
        <div className="al-r-intro-orbit" aria-hidden="true">
          <div className="al-r-intro-orbit-ring al-r-ring1"/><div className="al-r-intro-orbit-ring al-r-ring2"/><div className="al-r-intro-orbit-ring al-r-ring3"/>
          <div className="al-r-intro-planet"><Globe2 size={66} strokeWidth={1.15}/></div>
          <span className="al-r-intro-satellite"><Orbit size={20}/></span>
          <span className="al-r-intro-signal">AOD • L2G</span>
        </div>
      </article>
      <article className="al-r-source-card" id="source">
        <div className="al-r-cardtitle"><div><span className="al-r-sup">01 / DATA PROVENANCE</span><h2>Observation source</h2></div><span className="al-r-circlebutton"><Database size={16}/></span></div>
        <div className="al-r-source-label">INSAT-3D <span>GEOSTATIONARY SATELLITE</span></div>
        <div className="al-r-source-route">
          <div><span className="al-r-nodeicon"><Orbit size={18}/></span><strong>MOSDAC</strong><small>Data archive</small></div><span className="al-r-route-line"/><div><span className="al-r-nodeicon"><Layers3 size={18}/></span><strong>L2G AOD</strong><small>GeoTIFF product</small></div><span className="al-r-route-line"/><div><span className="al-r-nodeicon"><MapPinned size={18}/></span><strong>INDIA</strong><small>Study grid</small></div>
        </div>
        <div className="al-r-source-facts"><div><span>PRODUCT IDENTIFIER</span><strong>3DIMG_L2G_AOD V02R00</strong></div><div><span>DATA PROVIDER</span><strong>MOSDAC · SAC · ISRO</strong></div></div>
        <a className="al-r-plainlink" href="https://mosdac.gov.in/doi/127/" target="_blank" rel="noopener noreferrer">Product source information <ArrowUpRight size={15}/></a>
      </article>
    </div>

    <div className="al-r-main-grid">
      <aside className="al-r-toc" aria-label="Methodology sections">
        <div className="al-r-toc-heading"><BookOpen size={16}/><span>RESEARCH CONTENTS</span></div>
        {sections.map(s => <a key={s.id} href={`#${s.id}`} className="al-r-toc-link"><small>{s.short}</small><span>{s.label}</span><ChevronRight size={14}/></a>)}
        <div className="al-r-toc-note"><ShieldCheck size={21}/><strong>Scientific integrity</strong><span>Data are historical. AOD is not a live air-quality or health-risk measurement.</span></div>
      </aside>
      <div className="al-r-main-content">
        <section className="al-r-section" aria-labelledby="pipeline-heading">
          <SectionHeading id="pipeline" number="02" title="The seven-stage research pipeline" sub="Select any stage to learn what happens to each observation before it becomes a research result." action={<span className="al-r-softbadge"><Workflow size={14}/> 7 VERIFIED STAGES</span>}/>
          <div className="al-r-card al-r-pipeline-card">
            <div className="al-r-pipeline-grid" role="group" aria-label="Research processing stages">
              {workflow.map((step, index) => { const Icon = step.icon; return <button type="button" className={`al-r-stage ${activeStep === index ? 'is-current' : ''}`} onClick={() => setActiveStep(index)} aria-pressed={activeStep === index} key={step.number}>
                <span className="al-r-stage-number">{step.number}</span><span className="al-r-stage-icon"><Icon size={23} strokeWidth={1.7}/></span><span className="al-r-stage-label">{step.label}</span><ChevronRight className="al-r-stage-arrow" size={16}/>
              </button> })}
            </div>
            <div className="al-r-stage-detail" aria-live="polite">
              <div className="al-r-stage-detail-index">STEP {workflow[activeStep].number} <span> / 07</span></div>
              <div><h3>{workflow[activeStep].title}</h3><p>{workflow[activeStep].detail}</p></div>
              <span className="al-r-stage-check"><Check size={18}/></span>
            </div>
            <div className="al-r-pipeline-foot"><span><ShieldCheck size={14}/> Quality-screened historical observations</span><span>Offline analysis → saved research outputs → Flask API</span></div>
          </div>
        </section>

        <section className="al-r-section" aria-labelledby="features-heading">
          <SectionHeading id="features" number="03" title="Feature engineering & coverage" sub="Two eligibility sets, two complementary interpretations of the same satellite archive." />
          <div className="al-r-feature-layout">
            <article className="al-r-card al-r-feature-model" id="models">
              <div className="al-r-cardtitle"><div><span className="al-r-sup">04 / MODEL ARCHITECTURE</span><h2>Model A <span className="al-r-textmuted">·</span> Overall loading</h2></div><IconBadge tone="green"><Layers3 size={19}/></IconBadge></div>
              <div className="al-r-model-head"><strong>25,465</strong><span>eligible grid cells</span><b>K = 4</b></div>
              <div className="al-r-featurestack" role="img" aria-label="Model A uses mean AOD, AOD standard deviation, and high-AOD frequency">
                <div className="al-r-featurestack-row green"><span>01</span><strong>mean_aod</strong><i/></div>
                <div className="al-r-featurestack-row mint"><span>02</span><strong>std_aod</strong><i/></div>
                <div className="al-r-featurestack-row teal"><span>03</span><strong>high_aod_frequency</strong><i/></div>
              </div>
              <p>Overall aerosol magnitude, variability and high-observation frequency. Requires at least <strong>65 valid observation days</strong>, finite features and standardized inputs.</p>
            </article>
            <article className="al-r-card al-r-feature-model">
              <div className="al-r-cardtitle"><div><span className="al-r-sup">04 / MODEL ARCHITECTURE</span><h2>Model B <span className="al-r-textmuted">·</span> Seasonal behaviour</h2></div><IconBadge tone="purple"><CalendarDays size={19}/></IconBadge></div>
              <div className="al-r-model-head"><strong>13,506</strong><span>eligible grid cells</span><b className="purple">K = 5</b></div>
              <div className="al-r-featurestack" role="img" aria-label="Model B uses three overall features and three seasonal contrast features">
                <div className="al-r-featurestack-row violet"><span>01</span><strong>3 overall AOD features</strong><i/></div>
                <div className="al-r-featurestack-row lilac"><span>02</span><strong>winter_contrast</strong><i/></div>
                <div className="al-r-featurestack-row lilac"><span>03</span><strong>premonsoon_contrast</strong><i/></div>
                <div className="al-r-featurestack-row lilac"><span>04</span><strong>monsoon_contrast</strong><i/></div>
              </div>
              <p>Complete four-season profiles required. Overall and seasonal feature groups each contribute <strong>half the group weight</strong> before K-Means evaluation.</p>
            </article>
          </div>
          <div className="al-r-card al-r-seasons-card">
            <div className="al-r-cardtitle"><div><span className="al-r-sup">SEASONAL FRAMEWORK</span><h2>Four seasons. One comparable reference.</h2></div><IconBadge tone="orange"><CloudSun size={18}/></IconBadge></div>
            <SeasonStrip/>
            <div className="al-r-season-legend"><span><i className="winter"/> Winter · Dec–Feb</span><span><i className="pre"/> Pre-monsoon · Mar–May</span><span><i className="monsoon"/> Monsoon · Jun–Sep</span><span><i className="post"/> Post-monsoon · Oct–Nov</span></div>
            <p className="al-r-subnote">Each seasonal mean is compared against the equally weighted average of the four seasonal means. Three contrast features are sufficient because the four contrasts sum to zero. AOD 0.8 defines a notebook research feature threshold, not an AQI category or health standard.</p>
          </div>
        </section>

        <section className="al-r-section" aria-labelledby="validation-heading">
          <SectionHeading id="validation" number="05" title="How we validated the patterns" sub="Model quality is judged by several complementary diagnostics, not a single headline score." action={<Link className="al-r-outlinebutton" to="/models">View actual model scores <ArrowUpRight size={15}/></Link>}/>
          <div className="al-r-validation-grid">
            {metrics.map((metric, index) => { const Icon = metric.icon; return <article className="al-r-card al-r-validation-card" key={metric.title}>
              <div className="al-r-validation-head"><IconBadge tone={metric.tone}><Icon size={19}/></IconBadge><span>0{index + 1}</span></div>
              <div className="al-r-validation-symbol" aria-hidden="true"><span className={`al-r-vizbar al-r-vizbar-${metric.tone}`}/><span className={`al-r-vizbar al-r-vizbar-${metric.tone}`}/><span className={`al-r-vizbar al-r-vizbar-${metric.tone}`}/><span className={`al-r-vizbar al-r-vizbar-${metric.tone}`}/><span className={`al-r-vizbar al-r-vizbar-${metric.tone}`}/></div>
              <h3>{metric.title}</h3><strong>{metric.subtitle}</strong><p>{metric.note}</p>
            </article> })}
          </div>
          <div className="al-r-note"><CircleHelp size={17}/><p><strong>Interpretation note:</strong> WCSS is not directly comparable across Models A and B because their standardized feature spaces differ. ARI expresses agreement between cluster assignments, not pollution prediction accuracy. The notebook also evaluates Calinski–Harabasz and cluster-size balance.</p></div>
        </section>

        <section className="al-r-section" aria-labelledby="limitations-heading">
          <SectionHeading id="limitations" number="06" title="Scientific limitations & responsible use" sub="What the satellite observations and unsupervised clusters can, and cannot, tell us." action={<button type="button" className="al-r-outlinebutton" onClick={() => setOpenAll(v => !v)}>{openAll ? 'Collapse all' : 'Expand all'} <ChevronDown size={15}/></button>}/>
          <div className="al-r-limit-grid">
            {limitations.map((item, i) => { const Icon = item.icon; return <details key={`${item.title}-${openAll}`} open={openAll} className="al-r-limit-card">
              <summary><span className="al-r-limit-icon"><Icon size={18}/></span><span className="al-r-limit-content"><small>CAUTION 0{i + 1}</small><strong>{item.title}</strong></span><ChevronDown size={16} className="al-r-limit-arrow"/></summary>
              <p>{item.body}</p>
            </details> })}
          </div>
          <div className="al-r-ethical-alert"><ShieldAlert size={22}/><div><strong>Interpretation boundary</strong><p>AeroScope India is historical exploratory research. Do not use its clusters for personal exposure decisions, health advice, regulatory enforcement, real-time air-quality reporting, or emission-source attribution.</p></div></div>
        </section>

        <section className="al-r-section" aria-labelledby="reproducibility-heading">
          <SectionHeading id="reproducibility" number="07" title="Reproducibility & attribution" sub="Transparent methods and publication safeguards are part of the research design." />
          <div className="al-r-repro-grid">
            <article className="al-r-card al-r-repro-card"><div className="al-r-cardtitle"><div><span className="al-r-sup">RESEARCH ENVIRONMENT</span><h2>Reproduce the analysis</h2></div><IconBadge><ClipboardCheck size={18}/></IconBadge></div>
              <div className="al-r-repro-steps"><div><span>01</span><p>Use authorized INSAT-3D source imagery and verified acquisition metadata.</p></div><div><span>02</span><p>Re-run the documented Python/Colab preprocessing and clustering workflow.</p></div><div><span>03</span><p>Compare feature sets, model configurations, PCA, stability and maps.</p></div><div><span>04</span><p>Serve permitted saved results through Flask; visualize them in React.</p></div></div>
              <p className="al-r-subnote">Notebook sections 15–24 document temporal/spatial features, model selection, robustness and hotspot regions. Re-execution requires authorized access to the study data.</p>
            </article>
            <article className="al-r-card al-r-repro-card"><div className="al-r-cardtitle"><div><span className="al-r-sup">CITATION & PROVENANCE</span><h2>Research references</h2></div><IconBadge tone="blue"><BookOpen size={18}/></IconBadge></div>
              <div className="al-r-cite-list"><div><span><Database size={17}/></span><div><small>DATA PROVIDER</small><strong>MOSDAC · SAC · ISRO</strong><p>INSAT-3D 3DIMG_L2G_AOD</p></div></div><div><span><FileText size={17}/></span><div><small>PRODUCT DOI</small><strong className="al-r-doi">10.19038/SAC/10/3DIMG_L2G_AOD</strong></div></div><div><span><Map size={17}/></span><div><small>BOUNDARY DATA</small><strong>Natural Earth 1:10m</strong><p>Exploratory geographic boundaries as documented in the notebook</p></div></div><div><span><TableProperties size={17}/></span><div><small>ACADEMIC SPECIFICATION</small><strong>INT396 Unsupervised Project</strong><p>Regional Pollution Hotspot Pattern Grouping (SIH26078)</p></div></div></div>
              <a href="https://mosdac.gov.in/doi/127/" className="al-r-cite-link" target="_blank" rel="noopener noreferrer">View original satellite product <ExternalLink size={16}/></a>
            </article>
          </div>
        </section>
      </div>
    </div>

    <footer className="al-r-footer"><span><ShieldCheck size={16}/> Historical AOD research · Not live AQI or surface PM2.5</span><span>Original and derived dataset redistribution subject to permissions.</span><a href="#research-top">Back to top ↑</a></footer>
  </div>
}
