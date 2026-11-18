import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ArrowUpRight, Menu, Radar, X } from 'lucide-react'

const navigation = [
  { label: 'Home', path: '/' },
  { label: 'Atlas', path: '/explore' },
  { label: 'Compare', path: '/compare' },
  { label: 'Hotspots', path: '/hotspots' },
  { label: 'Model Lab', path: '/models' },
  { label: 'Research', path: '/research' },
]

export default function SiteHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setOpen(false) }, [location.pathname])

  return (
    <header className="as-header">
      <div className="as-header-inner">
        <NavLink to="/" className="as-brand" aria-label="AeroScope India home">
          <span className="as-brand-icon"><Radar size={23} strokeWidth={1.7} aria-hidden="true" /></span>
          <span className="as-brand-wordmark">AeroScope<span>India</span><small>SATELLITE RESEARCH PLATFORM</small></span>
        </NavLink>
        <nav className="as-desktop-nav" aria-label="Primary navigation">
          {navigation.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `as-nav-link${isActive ? ' is-active' : ''}`}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <NavLink className="as-header-cta" to="/explore">Explore <ArrowUpRight size={16} aria-hidden="true" /></NavLink>
        <button className="as-menu-toggle" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="as-mobile-menu" onClick={() => setOpen(previous => !previous)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav id="as-mobile-menu" className="as-mobile-nav" aria-label="Mobile navigation">
          {navigation.map(item => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => `as-mobile-link${isActive ? ' is-active' : ''}`}>
              {item.label} <ArrowUpRight size={15} aria-hidden="true" />
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
