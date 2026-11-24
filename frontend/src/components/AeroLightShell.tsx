import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  ArrowUpRight, BookOpen, ChartNoAxesCombined, FlaskConical,
  LayoutDashboard, MapPinned, Menu, Orbit, Users, X,
} from 'lucide-react'

const navigation = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/explore', label: 'Geo Explorer', icon: MapPinned },
  { path: '/models', label: 'ML Laboratory', icon: FlaskConical },
  { path: '/cluster-insights', label: 'Cluster Insights', icon: ChartNoAxesCombined },
  { path: '/research', label: 'Methodology', icon: BookOpen },
  { path: '/impact', label: 'Social Impact', icon: Users },
]

export default function AeroLightShell({ children }: { children: ReactNode }) {
  const [mobileMenu, setMobileMenu] = useState(false)
  const location = useLocation()
  useEffect(() => setMobileMenu(false), [location.pathname])

  return (
    <div className="al-app">
      <div className="al-frame">
        <aside className="al-sidebar" aria-label="Primary navigation">
          <NavLink className="al-sidebrand" to="/" aria-label="AeroScope India home" title="AeroScope India">
            <Orbit size={24} strokeWidth={2.3} />
          </NavLink>
          <nav className="al-sidenav">
            {navigation.map(({ path, label, icon: Icon }) => (
              <NavLink key={path} to={path} end={path === '/'} title={label} aria-label={label}
                className={({ isActive }) => `al-navicon${isActive ? ' is-active' : ''}`}>
                <Icon size={20} strokeWidth={1.9} />
                <span className="al-tooltip">{label}</span>
              </NavLink>
            ))}
          </nav>
          <span className="al-sidebar-end" title="Historical satellite research">IN</span>
        </aside>
        <div className="al-maincolumn">
          <header className="al-topbar">
            <NavLink to="/" className="al-brand" aria-label="AeroScope India home">
              <span>AeroScope<span>India</span></span>
              <small>ATMOSPHERIC INTELLIGENCE</small>
            </NavLink>
            <div className="al-header-right">
              <span className="al-era"><span className="al-era-dot" /> HISTORICAL RESEARCH · 2022–2024</span>
              <NavLink className="al-explorelink" to="/explore">Explore atlas <ArrowUpRight size={16}/></NavLink>
              <button type="button" className="al-menu" aria-label={mobileMenu ? 'Close navigation' : 'Open navigation'}
                aria-controls="al-mobile-nav" aria-expanded={mobileMenu} onClick={() => setMobileMenu(v => !v)}>
                {mobileMenu ? <X size={21}/> : <Menu size={21}/>}
              </button>
            </div>
          </header>
          {mobileMenu && (
            <nav id="al-mobile-nav" aria-label="Mobile navigation" className="al-mobile-nav">
              {navigation.map(({ path, label }) => <NavLink key={path} to={path} end={path === '/'}>{label}</NavLink>)}
            </nav>
          )}
          <div className="al-content">{children}</div>
        </div>
      </div>
    </div>
  )
}
