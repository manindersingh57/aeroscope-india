import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import SiteHeader from './components/SiteHeader'
import Home from './pages/Home'
import ExploreIndia from './pages/ExploreIndia'
import CompareRegions from './pages/CompareRegions'
import HotspotExplorer from './pages/HotspotExplorer'
import ModelLaboratory from './pages/ModelLaboratory'
import Research from './pages/Research'

/** Shared header lives outside routes; old page headers are visually suppressed
 * by scoped Phase 15 CSS. Research/data logic in each page is left untouched. */
export default function App() {
  return (
    <BrowserRouter>
      <div className="as-app-shell">
        <SiteHeader />
        <div className="as-route-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<ExploreIndia />} />
            <Route path="/compare" element={<CompareRegions />} />
            <Route path="/hotspots" element={<HotspotExplorer />} />
            <Route path="/models" element={<ModelLaboratory />} />
            <Route path="/research" element={<Research />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
