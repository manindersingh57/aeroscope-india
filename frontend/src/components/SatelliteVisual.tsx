/** Conceptual INSAT-inspired illustration. It does not depict live tracking or scanning data. */
export default function SatelliteVisual() {
  return (
    <div className="al-satellite-wrap" aria-hidden="true">
      <svg className="al-satellite-svg" viewBox="0 0 240 175" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="alsolar" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a2d8eb"/><stop offset=".56" stopColor="#337da1"/><stop offset="1" stopColor="#163f60"/></linearGradient>
          <linearGradient id="albody" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fcfff5"/><stop offset=".54" stopColor="#a2b9ba"/><stop offset="1" stopColor="#5e777e"/></linearGradient>
          <linearGradient id="albeam" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#76e5db" stopOpacity=".45"/><stop offset="1" stopColor="#76e5db" stopOpacity="0"/></linearGradient>
          <filter id="alshadow"><feGaussianBlur stdDeviation="5"/></filter>
        </defs>
        <ellipse cx="128" cy="138" rx="54" ry="8" fill="#4aa5a0" opacity=".12" filter="url(#alshadow)"/>
        <g className="al-satellite-motion">
          <path className="al-scan-pulse" d="M121 70 L72 159 L181 159 Z" fill="url(#albeam)"/>
          <g transform="translate(124 67) rotate(-19)">
            <path d="M-102 -23 H-27 V19 H-102 Z" fill="url(#alsolar)" stroke="#c6eaf0" strokeWidth="2"/>
            <path d="M27 -23 H102 V19 H27 Z" fill="url(#alsolar)" stroke="#c6eaf0" strokeWidth="2"/>
            {[-84,-64,-46,45,64,84].map(x => <path key={x} d={`M${x} -23 V19`} stroke="#d8f0f0" strokeOpacity=".75" strokeWidth="1.4"/>)}
            <path d="M-102 -2 H-27 M27 -2 H102" stroke="#d8f0f0" strokeWidth="1.5"/>
            <path d="M-27 0 H-17 M17 0 H27" stroke="#4b7e83" strokeWidth="4"/>
            <rect x="-19" y="-19" width="38" height="38" rx="7" fill="url(#albody)" stroke="#edf8f3" strokeWidth="2"/>
            <path d="M-19 -8 H19 M-19 5 H19" stroke="#748e92" strokeOpacity=".7" strokeWidth="1.5"/>
            <rect x="-11" y="-11" width="22" height="22" rx="4" fill="#d2e9df" stroke="#6ca5a3"/>
            <path d="M0 -19 V-38 M-13 -38 Q0 -22 13 -38" stroke="#527c86" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="0" cy="-39" r="3.2" fill="#7ad8d0"/>
          </g>
        </g>
      </svg>
      <span className="al-satellite-caption">INSAT-inspired visual</span>
    </div>
  )
}
