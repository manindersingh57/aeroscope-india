import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, BookOpenText, CheckCircle2, Database, ExternalLink,
  FlaskConical, Globe2, Layers3, MapPinned, Microscope, ShieldAlert,
  Sparkles, TableProperties,
} from 'lucide-react'

/**
 * Public-safe, static methodology for AeroScope India.
 * Scientific details: INSAT-3D notebook chunks 15-24 and INT396 project brief.
 * No protected research-data requests are made on this page.
 */
const sections = [
  { id: 'source', name: 'Dataset & provenance' },
  { id: 'workflow', name: 'Processing workflow' },
  { id: 'features', name: 'Feature engineering' },
  { id: 'models', name: 'Clustering models' },
  { id: 'evaluation', name: 'Validation' },
  { id: 'limits', name: 'Limitations & ethics' },
  { id: 'reproduce', name: 'Reproducibility' },
]

const pipeline = [
  {
    number: '01', title: 'Catalogue observations',
    description: 'Identify acquisition timestamps from INSAT-3D GeoTIFF filenames, check time coverage and flag duplicate acquisitions.',
  },
  {
    number: '02', title: 'Validate raster data',
    description: 'Check raster grid shape, CRS, geographic transform and band count. Mask NoData, non-finite and invalid negative AOD readings.',
  },
  {
    number: '03', title: 'Aggregate over time',
    description: 'Construct daily summaries and monthly/seasonal profiles while tracking observation counts and valid-day coverage.',
  },
  {
    number: '04', title: 'Limit to the India study grid',
    description: 'Use exploratory Natural Earth boundaries to retain grid-cell centres inside India and associate cells with states/UTs where unambiguous.',
  },
  {
    number: '05', title: 'Engineer and scale features',
    description: 'Compute overall and seasonal statistics, apply coverage criteria and standardize model-input features separately for each model.',
  },
  {
    number: '06', title: 'Cluster and evaluate',
    description: 'Test K-Means with K=2 through K=8, review cluster profiles, PCA projections, validation scores and stability experiments.',
  },
  {
    number: '07', title: 'Interpret geographical patterns',
    description: 'Name and compare clusters, examine state composition, and identify connected elevated-loading regions for exploratory mapping.',
  },
]

const limitations = [
  {
    heading: 'AOD is not AQI or PM2.5',
    text: 'Satellite aerosol optical depth represents aerosol loading through an atmospheric column. It is not a direct ground-level PM2.5 measurement, health-risk score, or regulatory AQI category.',
  },
  {
    heading: 'Historical, uneven coverage',
    text: 'Observation availability varies with time and place. Cells with insufficient valid observations may be excluded, especially from the complete seasonal model. Missingness can affect geographic comparisons.',
  },
  {
    heading: 'Patterns are not emission sources',
    text: 'A region with elevated historical AOD is not proof that emissions originate there. Transport, weather, retrieval limitations and other processes can influence the observed patterns.',
  },
  {
    heading: 'Clusters are relative descriptions',
    text: 'Cluster labels summarize this study dataset and feature space. K-Means partitions, PCA positions and centroid-distance diagnostics do not constitute calibrated probabilities or externally validated pollution classifications.',
  },
  {
    heading: 'Maps have boundary uncertainty',
    text: 'State and country boundaries are used for exploratory aggregation. Some grid-cell centres near borders can be ambiguous or unassigned, and cell centres are not precise administrative boundaries.',
  },
  {
    heading: 'Responsible publication',
    text: 'The public website documents methods without publishing the original satellite products or detailed grid-level research data. Any release of derived data should be checked against applicable MOSDAC permissions.',
  },
]

function SectionTitle({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 max-w-3xl">
      <p className="text-xs font-bold uppercase tracking-[0.19em] text-teal-700">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-semibold tracking-tight text-[#12323d] sm:text-3xl">{title}</h2>
      {children && <p className="mt-3 leading-7 text-slate-600">{children}</p>}
    </div>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-900">{children}</span>
}

export default function Research() {
  return (
    <div className="min-h-screen bg-[#f5f7f8] text-[#12323d]">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link to="/" className="flex items-center gap-3 text-inherit no-underline">
            <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-[#123d48] text-xl text-white">◎</span>
            <div>
              <div className="text-lg font-bold tracking-tight">AeroScope <span className="text-[#1f8979]">India</span></div>
              <div className="text-xs tracking-[0.17em] text-slate-500">SATELLITE RESEARCH PLATFORM</div>
            </div>
          </Link>
          <nav aria-label="Explore AeroScope" className="flex flex-wrap items-center gap-2 text-sm">
            <Link to="/explore" className="rounded-full border border-teal-200 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">India Atlas</Link>
            <Link to="/compare" className="rounded-full border border-teal-200 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">Compare States</Link>
            <Link to="/models" className="rounded-full border border-teal-200 px-4 py-2 font-semibold text-teal-800 hover:bg-teal-50">Model Laboratory</Link>
            <Link to="/" className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50"><ArrowLeft size={15} /> Home</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pb-20 pt-12">
        <div className="grid items-start gap-10 lg:grid-cols-[225px_minmax(0,1fr)]">
          <aside className="hidden lg:sticky lg:top-6 lg:block" aria-label="Research page contents">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.19em] text-slate-500">On this page</p>
            <nav className="space-y-1">
              {sections.map(section => (
                <a key={section.id} href={`#${section.id}`} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-teal-800">{section.name}</a>
              ))}
            </nav>
            <div className="mt-7 rounded-2xl border border-teal-100 bg-teal-50 p-4 text-xs leading-6 text-teal-900">
              <ShieldAlert size={18} className="mb-2" />
              Methodology is public. Detailed model outputs remain subject to applicable data-sharing permissions.
            </div>
          </aside>

          <div className="min-w-0 space-y-12">
            <section aria-labelledby="research-title" className="overflow-hidden rounded-3xl bg-[#123d48] p-7 text-white sm:p-10">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.17em] text-teal-200"><BookOpenText size={16}/> Scientific methodology</div>
              <h1 id="research-title" className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">Understanding the research behind AeroScope India.</h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200">How historical INSAT-3D aerosol observations become interpretable spatial and seasonal patterns through documented preprocessing, K-Means clustering and validation.</p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Tag>Unsupervised learning</Tag><Tag>Historical satellite AOD</Tag><Tag>India study grid</Tag><Tag>Exploratory interpretation</Tag>
              </div>
            </section>

            <section id="source" aria-labelledby="source-heading" className="scroll-mt-8">
              <SectionTitle id="source-heading" eyebrow="01 · provenance" title="Dataset & study scope">
                Our source is the INSAT-3D L2G aerosol optical depth (AOD) product accessed through MOSDAC. The analysis describes historical aerosol optical properties, not real-time air quality.
              </SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ['Observation window', '23 Aug 2022 – 5 Jun 2024'],
                  ['Unique observation dates', '643'],
                  ['India grid cells', '27,937'],
                  ['Satellite data product', '3DIMG_L2G_AOD V02R00'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="mt-3 text-lg font-semibold tracking-tight">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
                <div className="flex items-start gap-3"><Database size={21} className="mt-0.5 shrink-0 text-teal-700"/><p>Satellite scenes are aggregated into daily and monthly representations. Grid-cell observations are retained only when they meet the relevant quality and coverage checks. The India boundary filter is exploratory and uses grid-cell centres.</p></div>
                <p className="mt-4"><strong className="text-slate-800">Data provider:</strong> MOSDAC / Space Applications Centre / ISRO. <a className="font-semibold text-teal-800 underline underline-offset-4" href="https://mosdac.gov.in/doi/127/" target="_blank" rel="noopener noreferrer">INSAT-3D AOD product page <ExternalLink size={13} className="inline"/></a></p>
                <p><strong className="text-slate-800">Product DOI:</strong> <span className="break-all">10.19038/SAC/10/3DIMG_L2G_AOD</span></p>
              </div>
            </section>

            <section id="workflow" aria-labelledby="workflow-heading" className="scroll-mt-8">
              <SectionTitle id="workflow-heading" eyebrow="02 · pipeline" title="From satellite grids to interpretable patterns">
                The workflow processes the original observations offline. Website API calls use saved outputs; they do not retrain the clustering models.
              </SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                {pipeline.map(step => (
                  <article key={step.number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-sm font-bold text-teal-800">{step.number}</span><h3 className="font-semibold">{step.title}</h3></div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{step.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section id="features" aria-labelledby="features-heading" className="scroll-mt-8">
              <SectionTitle id="features-heading" eyebrow="03 · input design" title="Feature engineering and coverage criteria">
                The notebook maintains two distinct eligibility sets: broader overall AOD coverage for Model A, and complete seasonal coverage for Model B.
              </SectionTitle>
              <div className="grid gap-4 md:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-teal-800"><Layers3 size={19}/> Model A input</div>
                  <h3 className="mt-2 text-xl font-semibold">Overall aerosol patterns</h3>
                  <div className="mt-4 flex flex-wrap gap-2"><Tag>mean_aod</Tag><Tag>std_aod</Tag><Tag>high_aod_frequency</Tag></div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">At least 65 valid observation days and finite feature values. Each feature is standardized using StandardScaler.</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-teal-800"><Globe2 size={19}/> Model B input</div>
                  <h3 className="mt-2 text-xl font-semibold">Seasonal aerosol behaviour</h3>
                  <div className="mt-4 flex flex-wrap gap-2"><Tag>3 overall features</Tag><Tag>winter_contrast</Tag><Tag>premonsoon_contrast</Tag><Tag>monsoon_contrast</Tag></div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">Requires all four seasonal profiles, with the notebook's seasonal coverage checks. Overall and seasonal feature groups each receive half of the total feature-group weight.</p>
                </article>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold">How seasonal contrasts are defined</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">The seasonal mean for each season is compared against the equally weighted average of the four seasonal means. Three contrasts are used because all four sum to zero. The seasons are winter (Dec–Feb), pre-monsoon (Mar–May), monsoon (Jun–Sep), and post-monsoon (Oct–Nov).</p>
                <p className="mt-2 text-sm leading-7 text-slate-600">The notebook uses AOD 0.8 as its high-observation threshold for the <code className="rounded bg-slate-100 px-1">high_aod_frequency</code> feature. This is a research feature threshold, not an AQI category or health standard.</p>
              </div>
            </section>

            <section id="models" aria-labelledby="models-heading" className="scroll-mt-8">
              <SectionTitle id="models-heading" eyebrow="04 · methods" title="Two models, complementary perspectives">
                These are application-selected clustering configurations based on model diagnostics and interpretability, not supervised prediction models.
              </SectionTitle>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { name: 'Model A', title: 'Broad Aerosol Loading', k: 'K = 4', coverage: '25,465 eligible cells', desc: 'Groups India grid cells by relative overall AOD magnitude, temporal variability and high-AOD frequency.' },
                  { name: 'Model B', title: 'Seasonal Aerosol Behaviour', k: 'K = 5', coverage: '13,506 eligible cells', desc: 'Groups the complete-season subset by overall AOD behaviour together with seasonal deviations.' },
                ].map(model => (
                  <article key={model.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex justify-between gap-3"><span className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">{model.name}</span><span className="text-xl font-semibold">{model.k}</span></div>
                    <h3 className="mt-4 text-xl font-semibold">{model.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{model.desc}</p>
                    <p className="mt-4 text-sm font-semibold text-slate-500">{model.coverage}</p>
                  </article>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">The notebook also compares Gaussian Mixture Models and Manhattan K-Medians as alternatives. They are comparisons of clustering approaches, not interchangeable predictions or externally verified air-quality labels.</p>
              <Link to="/models" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#123d48] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1b5360]">Explore model evaluation charts <ArrowRight size={16}/></Link>
            </section>

            <section id="evaluation" aria-labelledby="evaluation-heading" className="scroll-mt-8">
              <SectionTitle id="evaluation-heading" eyebrow="05 · validation" title="How the grouping was evaluated">
                The course requires K-Means comparisons, PCA visualisation, quantitative validation and responsible interpretation. These are recorded as repeatable offline experiments.
              </SectionTitle>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ['K-Means candidates', 'K=2–8 for each model, with a fixed random seed and multiple initializations.'],
                  ['WCSS / inertia', 'Measures within-cluster dispersion; useful within a fixed feature space, not directly between Models A and B.'],
                  ['Silhouette score', 'Measures relative separation/cohesion. The notebook evaluates it on a fixed 3,000-cell sample where available.'],
                  ['Davies–Bouldin index', 'Provides another internal compactness/separation diagnostic; lower values are preferred.'],
                  ['Principal component analysis', 'Projects standardized feature patterns into two dimensions for interpretation; the website Model Laboratory presents cluster-centroid summaries.'],
                  ['Robustness and comparisons', 'Random-seed and subsample stability, correlated-feature sensitivity, seasonal weighting sensitivity, and alternative algorithm comparisons.'],
                ].map(([name, info]) => (
                  <article key={name} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex gap-2"><CheckCircle2 size={17} className="mt-1 shrink-0 text-teal-700"/><h3 className="font-semibold">{name}</h3></div>
                    <p className="mt-2 pl-6 text-sm leading-7 text-slate-600">{info}</p>
                  </article>
                ))}
              </div>
              <p className="mt-4 text-sm text-slate-600">Additional diagnostics in the notebook include Calinski–Harabasz scores, cluster-size balance and Adjusted Rand Index (ARI) agreement across configurations. ARI is agreement between assignments, not pollution-prediction accuracy.</p>
            </section>

            <section id="limits" aria-labelledby="limits-heading" className="scroll-mt-8">
              <SectionTitle id="limits-heading" eyebrow="06 · responsible use" title="Limitations and ethical interpretation">
                Visual appeal must not overpower scientific precision. These caveats are central to interpreting the maps and cluster descriptions.
              </SectionTitle>
              <div className="space-y-3">
                {limitations.map(item => (
                  <details key={item.heading} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm">
                    <summary className="cursor-pointer text-base font-semibold marker:text-teal-700">{item.heading}</summary>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                  </details>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
                <div className="flex items-center gap-2 font-bold"><ShieldAlert size={18}/> Interpretation boundary</div>
                <p className="mt-2">AeroScope India is a historical research demonstration. It must not be used for personal exposure decisions, health advice, regulatory enforcement, real-time air-quality reporting or source-attribution claims.</p>
              </div>
            </section>

            <section id="reproduce" aria-labelledby="reproduce-heading" className="scroll-mt-8">
              <SectionTitle id="reproduce-heading" eyebrow="07 · reproducibility" title="Research artifacts, references and acknowledgements">
                The processing and validation pipeline is documented in the research notebook. The deployed React site is a visualization layer over saved results served through a separate Flask application.
              </SectionTitle>
              <div className="grid gap-4 md:grid-cols-2">
                <article className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-2 font-semibold"><FlaskConical size={19} className="text-teal-700"/> Reproducible experiment stages</div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">Catalogue → validate and aggregate → engineer features → standardize → fit candidate models → evaluate → test robustness → interpret and export selected outcomes.</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">Actual re-execution requires authorized access to source datasets and the documented Colab processing environment.</p>
                </article>
                <article className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div className="flex items-center gap-2 font-semibold"><TableProperties size={19} className="text-teal-700"/> Reproducibility pointers</div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">Notebook sections 15–24 cover temporal and spatial feature engineering, model selection, PCA, alternative algorithms, robustness and hotspot regions. The INT396 brief defines the project outcomes and required evaluation criteria.</p>
                  <p className="mt-3 text-sm leading-7 text-slate-600">The public repository should contain only redistributable code, documentation and permitted derived artifacts.</p>
                </article>
              </div>
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="font-semibold">Attribution and project references</h3>
                <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                  <li><strong className="text-slate-800">Satellite data:</strong> MOSDAC / SAC / ISRO, INSAT-3D L2G AOD, DOI 10.19038/SAC/10/3DIMG_L2G_AOD. <a className="font-semibold text-teal-800 underline underline-offset-4" href="https://mosdac.gov.in/doi/127/" target="_blank" rel="noopener noreferrer">Source information <ExternalLink size={13} className="inline"/></a></li>
                  <li><strong className="text-slate-800">Study boundaries:</strong> Natural Earth 1:10m exploratory geographical boundary data as recorded in the notebook.</li>
                  <li><strong className="text-slate-800">Academic specification:</strong> INT396 Unsupervised Project, “Regional Pollution Hotspot Pattern Grouping from Satellite Data” (source ID SIH26078).</li>
                  <li><strong className="text-slate-800">Implementation:</strong> Python/Colab scientific pipeline, Flask REST API, React + TypeScript frontend.</li>
                </ul>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/models" className="inline-flex items-center gap-2 rounded-full bg-[#123d48] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1b5360]"><Microscope size={16}/> Open Model Laboratory <ArrowRight size={16}/></Link>
                <Link to="/explore" className="inline-flex items-center gap-2 rounded-full border border-teal-300 bg-white px-5 py-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"><MapPinned size={16}/> Explore India Atlas</Link>
              </div>
            </section>
          </div>
        </div>
      </main>
      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-xs leading-6 text-slate-500">
        AeroScope India · Historical AOD research · Scientific methodology is public; redistribution of satellite-derived measurements remains subject to applicable permissions. <Sparkles size={13} className="inline"/>
      </footer>
    </div>
  )
}
