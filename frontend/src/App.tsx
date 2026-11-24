import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AeroLightShell from './components/AeroLightShell'
import Home from './pages/Home'
import ExploreIndia from './pages/ExploreIndia'
import ModelLaboratory from './pages/ModelLaboratory'
import ClusterInsights from './pages/ClusterInsights'
import Research from './pages/Research'

function OldPathRedirect({ tab }: { tab: 'comparison' | 'hotspots' }) {
  const { search, hash } = useLocation()
  const params = new URLSearchParams(search)
  params.set('tab', tab)
  return <Navigate to={`/cluster-insights?${params.toString()}${hash}`} replace />
}

function DashboardRoutes() {
  return <AeroLightShell><Routes>
    <Route path="/" element={<Home/>}/>
    <Route path="/explore" element={<div className="al-legacy"><ExploreIndia/></div>}/>
    <Route path="/models" element={<div className="al-legacy"><ModelLaboratory/></div>}/>
    <Route path="/cluster-insights" element={<ClusterInsights/>}/>
    <Route path="/research" element={<div className="al-legacy"><Research/></div>}/>
    <Route path="/compare" element={<OldPathRedirect tab="comparison"/>}/>
    <Route path="/hotspots" element={<OldPathRedirect tab="hotspots"/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></AeroLightShell>
}

export default function App() { return <BrowserRouter><DashboardRoutes/></BrowserRouter> }
