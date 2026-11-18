/**
 * Abstract, CSS-driven 3D orbital object. Decorative only: not actual satellite imagery
 * or a geospatial representation of INSAT-3D measurements. No WebGL dependency.
 */
export default function OrbitalScene() {
  return (
    <div className="as-orbital-stage" aria-label="Abstract animated orbital visualization" role="img">
      <div className="as-orbital-aura" />
      <div className="as-orbit as-orbit-one" />
      <div className="as-orbit as-orbit-two" />
      <div className="as-orbit as-orbit-three" />
      <div className="as-orbital-sphere">
        <div className="as-sphere-shading" />
        <div className="as-meridian as-meridian-one" />
        <div className="as-meridian as-meridian-two" />
        <div className="as-meridian as-meridian-three" />
        <div className="as-latitude as-latitude-one" />
        <div className="as-latitude as-latitude-two" />
        <div className="as-latitude as-latitude-three" />
      </div>
      <div className="as-satellite-dot as-dot-one" />
      <div className="as-satellite-dot as-dot-two" />
      <div className="as-orbital-target as-target-one"><span>01</span> Northern plains</div>
      <div className="as-orbital-target as-target-two"><span>02</span> Seasonal patterns</div>
      <div className="as-orbital-ground" />
    </div>
  )
}
