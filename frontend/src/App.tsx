import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import ExploreIndia from './pages/ExploreIndia'
import CompareRegions from './pages/CompareRegions'
import HotspotExplorer from './pages/HotspotExplorer'
import ModelLaboratory from './pages/ModelLaboratory'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<ExploreIndia />} />
        <Route path="/compare" element={<CompareRegions />} />
        <Route path="/hotspots" element={<HotspotExplorer />} />
        <Route path="/models" element={<ModelLaboratory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
