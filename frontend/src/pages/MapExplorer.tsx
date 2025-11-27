import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

// Set access token from environment variable
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

const zoneTypes = [
  { id: 'qct', label: 'Qualified Census Tract', color: '#0073c7', checked: true },
  { id: 'qnmc', label: 'Non-Metro County', color: '#36acf8', checked: true },
  { id: 'indian', label: 'Indian Lands', color: '#7cc8fc', checked: true },
  { id: 'brac', label: 'Base Closure Area', color: '#10b981', checked: false },
  { id: 'gov', label: 'Governor Designated', color: '#f59e0b', checked: false },
];

function MapExplorer() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [lng, setLng] = useState(-98.5795);
  const [lat, setLat] = useState(39.8283);
  const [zoom, setZoom] = useState(3.5);
  const [layers, setLayers] = useState(zoneTypes);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [lng, lat],
      zoom: zoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    map.current.on('move', () => {
      if (!map.current) return;
      setLng(Number(map.current.getCenter().lng.toFixed(4)));
      setLat(Number(map.current.getCenter().lat.toFixed(4)));
      setZoom(Number(map.current.getZoom().toFixed(2)));
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  const toggleLayer = (id: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, checked: !layer.checked } : layer
      )
    );
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex gap-6 animate-in">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 space-y-4">
        {/* Search */}
        <div className="card">
          <label htmlFor="map-search" className="label">
            Search Location
          </label>
          <div className="relative">
            <input
              id="map-search"
              type="text"
              placeholder="Address, city, or ZIP..."
              className="input pr-10"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              🔍
            </button>
          </div>
        </div>

        {/* Layers */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">HUBZone Layers</h3>
          <div className="space-y-3">
            {layers.map((layer) => (
              <label
                key={layer.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={layer.checked}
                  onChange={() => toggleLayer(layer.id)}
                  className="w-4 h-4 rounded border-gray-300 text-hubzone-600 
                           focus:ring-hubzone-500 transition-colors"
                />
                <span
                  className="w-4 h-4 rounded-sm"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  {layer.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Coordinates */}
        <div className="card bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-2">Current View</h3>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Lng:</span>
              <span className="ml-1 font-mono">{lng}</span>
            </div>
            <div>
              <span className="text-gray-500">Lat:</span>
              <span className="ml-1 font-mono">{lat}</span>
            </div>
            <div>
              <span className="text-gray-500">Zoom:</span>
              <span className="ml-1 font-mono">{zoom}</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Legend</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>Click on a zone to view details</p>
            <p>Use scroll to zoom in/out</p>
            <p>Drag to pan the map</p>
          </div>
        </div>
      </div>

      {/* Map container */}
      <div className="flex-1 card p-0 overflow-hidden">
        {!mapboxgl.accessToken && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center p-8">
              <p className="text-gray-600 mb-2">
                Mapbox access token not configured
              </p>
              <p className="text-sm text-gray-500">
                Add VITE_MAPBOX_ACCESS_TOKEN to your .env file
              </p>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full" />
      </div>
    </div>
  );
}

export default MapExplorer;

