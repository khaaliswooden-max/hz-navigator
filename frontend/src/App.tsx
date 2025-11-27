import { Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import HubzoneCheck from './pages/HubzoneCheck';
import MapExplorer from './pages/MapExplorer';
import Certifications from './pages/Certifications';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="check" element={<HubzoneCheck />} />
        <Route path="map" element={<MapExplorer />} />
        <Route path="certifications" element={<Certifications />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;

