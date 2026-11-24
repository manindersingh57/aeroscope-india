import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, ScanLine, Satellite } from 'lucide-react'
import '../styles/aeroscope-hero.css'
import '../styles/aeroscope-hero-motion.css'

/**
 * Decorative Whisk artwork, supplied by the project owner.
 * The image depicts a conceptual observation scene, NOT a live satellite feed.
 * Stationary geographic artwork; isolated satellite and clouds animate independently.
 */
export default function AtmosphereHero() {
  return (
    <section className="as-hero" aria-labelledby="as-hero-title">
      <div className="as-hero__artwork" aria-hidden="true">
        <img
          className="as-hero__image"
          src="/images/aeroscope-atmosphere-clean.webp"
          alt=""
          width={1678}
          height={937}
          decoding="async"
        />
        <img
          className="as-hero__satellite"
          src="/images/aeroscope-satellite-floating.png"
          alt=""
          width={1678}
          height={937}
          decoding="async"
        />
      </div>
      <div className="as-hero__wash" aria-hidden="true" />
      <div className="as-hero__cloud as-hero__cloud--one" aria-hidden="true" />
      <div className="as-hero__cloud as-hero__cloud--two" aria-hidden="true" />
      <div className="as-hero__cloud as-hero__cloud--three" aria-hidden="true" />
      <div className="as-hero__cloud as-hero__cloud--four" aria-hidden="true" />
      <div className="as-hero__orbital-glow" aria-hidden="true" />

      <div className="as-hero__content">
        <span className="as-hero__eyebrow">
          <span className="as-hero__eyebrow-icon"><Satellite size={14} strokeWidth={1.8} /></span>
          SATELLITE-POWERED ATMOSPHERIC INTELLIGENCE
        </span>

        <div className="as-hero__brand">AEROSCOPE <span>INDIA</span></div>
        <h1 id="as-hero-title">See India’s<br />Atmosphere <em>Differently.</em></h1>
        <p className="as-hero__description">
          Explore India’s historical aerosol landscape through INSAT-3D satellite observations
          and unsupervised machine learning. Discover patterns, compare regions, and understand
          the science behind the atmosphere.
        </p>

        <div className="as-hero__actions">
          <Link className="as-hero__button as-hero__button--primary" to="/explore">
            Explore Geo Explorer <ArrowUpRight size={17} strokeWidth={1.9} />
          </Link>
          <Link className="as-hero__button as-hero__button--secondary" to="/research">
            Discover our research <ArrowRight size={16} strokeWidth={1.9} />
          </Link>
        </div>

        <div className="as-hero__facts" aria-label="Research highlights">
          <span><strong>INSAT-3D</strong> <small>Earth observation</small></span>
          <span className="as-hero__facts-rule" aria-hidden="true" />
          <span><strong>2022–2024</strong> <small>Historical study</small></span>
          <span className="as-hero__facts-rule" aria-hidden="true" />
          <span><strong>02 models</strong> <small>Unsupervised learning</small></span>
        </div>
        <p className="as-hero__note"><ScanLine size={12} strokeWidth={1.8} /> Conceptual visualization · historical AOD, not live AQI</p>
      </div>
    </section>
  )
}
