/**
 * Map Explorer Page
 *
 * Interactive HUBZone map exploration page with sidebar controls
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  HUBZoneMap,
  MapSidebar,
  ExportModal,
  DEFAULT_LAYERS,
  type HUBZoneMapRef,
  type HUBZoneFeatureProperties,
  type AddressSearchResult,
  type MapStatistics,
  type LayerConfig,
  type ExportOptions,
  type RadiusSearchResult,
} from '../components/Map';

function MapExplorer() {
  // Hooks
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Refs
  const mapRef = useRef<HUBZoneMapRef>(null);

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layers, setLayers] = useState<LayerConfig[]>(DEFAULT_LAYERS);
  const [statistics, setStatistics] = useState<MapStatistics | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedZone, setSelectedZone] = useState<HUBZoneFeatureProperties | null>(null);
  const [searchResult, setSearchResult] = useState<AddressSearchResult | null>(null);
  const [radiusResults, setRadiusResults] = useState<RadiusSearchResult[]>([]);
   
  const [_isRadiusSearching, setIsRadiusSearching] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  // Initial map position from URL params
  const initialLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined;
  const initialLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined;
  const initialZoom = searchParams.get('z') ? parseFloat(searchParams.get('z')!) : undefined;
  const initialLayers = searchParams.get('layers');

  /**
   * Parse URL params on map ready
   */
  useEffect(() => {
    if (!isMapReady || !mapRef.current) return;

    // Apply initial position from URL
    if (initialLat && initialLng) {
      mapRef.current.flyTo(initialLng, initialLat, initialZoom || 10);
    }

    // Apply initial layer visibility from URL
    if (initialLayers) {
      const visibleLayerIds = initialLayers.split(',');
      layers.forEach((layer: LayerConfig) => {
        const shouldBeVisible = visibleLayerIds.includes(layer.id);
        if (layer.visible !== shouldBeVisible) {
          mapRef.current?.toggleLayer(layer.id);
        }
      });
    }
  }, [isMapReady, initialLat, initialLng, initialZoom, initialLayers]);

  /**
   * Fetch map statistics from API
   */
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch('/api/v1/hubzone/statistics');
        if (response.ok) {
          const data = await response.json();
          setStatistics({
            totalTracts: data.data?.totalTracts || 0,
            designatedTracts: data.data?.designatedTracts || 0,
            activeTracts: data.data?.activeTracts || 0,
            lastUpdate: data.data?.lastUpdateDate || null,
            nextUpdate: data.data?.nextScheduledUpdate || null,
            byType: {
              qct: data.data?.byType?.qualifiedCensusTracts || 0,
              nmc: data.data?.byType?.qualifiedNonMetroCounties || 0,
              indianLands: data.data?.byType?.indianLands || 0,
              brac: data.data?.byType?.baseClosureAreas || 0,
              redesignated: data.data?.byType?.redesignated || 0,
              dda: data.data?.byType?.difficultDevelopmentAreas || 0,
            },
          });
        }
      } catch (err) {
        console.error('Failed to fetch statistics:', err);
        // Set mock statistics for demo
        setStatistics({
          totalTracts: 73000,
          designatedTracts: 8500,
          activeTracts: 8200,
          lastUpdate: new Date().toISOString(),
          nextUpdate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          byType: {
            qct: 6800,
            nmc: 950,
            indianLands: 574,
            brac: 45,
            redesignated: 120,
            dda: 11,
          },
        });
      }
    };

    fetchStatistics();
  }, []);

  /**
   * Handle layer toggle from sidebar
   */
  const handleLayerToggle = useCallback((layerId: string) => {
    if (mapRef.current && isMapReady) {
      mapRef.current.toggleLayer(layerId);
    }
  }, [isMapReady]);

  /**
   * Handle show all layers
   */
  const handleShowAllLayers = useCallback(() => {
    if (mapRef.current && isMapReady) {
      mapRef.current.showAllLayers();
    }
  }, [isMapReady]);

  /**
   * Handle hide all layers
   */
  const handleHideAllLayers = useCallback(() => {
    if (mapRef.current && isMapReady) {
      mapRef.current.hideAllLayers();
    }
  }, [isMapReady]);

  /**
   * Handle address search from sidebar
   */
  const handleAddressSearch = useCallback((result: AddressSearchResult) => {
    if (!mapRef.current || !isMapReady) return;

    setSearchResult(result);
    setRadiusResults([]); // Clear radius results

    // Fly to the searched location
    mapRef.current.flyTo(result.coordinates.lng, result.coordinates.lat, 14);

    // Remove any existing radius circle
    mapRef.current.removeRadiusCircle();

    // Add a marker at the location
    const popupContent = `
      <div style="padding: 8px; min-width: 200px;">
        <p style="font-weight: 600; margin: 0 0 8px 0; color: #111827;">
          ${result.standardizedAddress}
        </p>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="
            width: 24px; 
            height: 24px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-size: 14px;
            background: ${result.isInHubzone ? '#D1FAE5' : '#F3F4F6'};
            color: ${result.isInHubzone ? '#059669' : '#6B7280'};
          ">
            ${result.isInHubzone ? '✓' : '✗'}
          </span>
          <span style="font-size: 14px; color: ${result.isInHubzone ? '#059669' : '#6B7280'}; font-weight: 500;">
            ${result.isInHubzone ? 'In HUBZone' : 'Not in HUBZone'}
          </span>
        </div>
        ${result.isInHubzone && result.censusTract ? `
          <div style="font-size: 12px; color: #6B7280;">
            <p>Census Tract: <strong style="color: #111827;">${result.censusTract}</strong></p>
            ${result.designationType ? `<p>Type: <strong style="color: #111827;">${result.designationType}</strong></p>` : ''}
          </div>
        ` : ''}
      </div>
    `;

    mapRef.current.addMarker(result.coordinates.lng, result.coordinates.lat, {
      color: result.isInHubzone ? '#059669' : '#6B7280',
      popup: true,
      popupContent,
    });
  }, [isMapReady]);

  /**
   * Handle radius search
   */
  const handleRadiusSearch = useCallback(async (center: { lat: number; lng: number }, radiusMiles: number) => {
    if (!mapRef.current || !isMapReady) return;

    setIsRadiusSearching(true);

    try {
      // Draw radius circle on map
      mapRef.current.drawRadiusCircle(center.lng, center.lat, radiusMiles);

      // Call API for radius search
      const response = await fetch('/api/v1/hubzone/radius-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: center.lat,
          longitude: center.lng,
          radius_miles: radiusMiles,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRadiusResults(data.data?.results || []);
      } else {
        console.error('Radius search failed');
        setRadiusResults([]);
      }
    } catch (err) {
      console.error('Radius search error:', err);
      // Mock results for demo
      setRadiusResults([
        {
          id: '1',
          geoid: '06037100100',
          name: 'Census Tract 1001',
          zoneType: 'qualified_census_tract',
          status: 'active',
          state: 'California',
          county: 'Los Angeles',
          distanceMiles: 1.2,
          designationDate: '2020-01-01',
          expirationDate: '2025-12-31',
          isRedesignated: false,
        },
        {
          id: '2',
          geoid: '06037100200',
          name: 'Census Tract 1002',
          zoneType: 'qualified_census_tract',
          status: 'active',
          state: 'California',
          county: 'Los Angeles',
          distanceMiles: 2.5,
          designationDate: '2019-06-15',
          expirationDate: '2024-06-15',
          isRedesignated: false,
        },
      ]);
    } finally {
      setIsRadiusSearching(false);
    }
  }, [isMapReady]);

  /**
   * Handle clear search
   */
  const handleClearSearch = useCallback(() => {
    setSearchResult(null);
    setRadiusResults([]);
    if (mapRef.current) {
      mapRef.current.removeMarker();
      mapRef.current.removeRadiusCircle();
    }
  }, []);

  /**
   * Handle layers change from map
   */
  const handleLayersChange = useCallback((newLayers: LayerConfig[]) => {
    setLayers(newLayers);
  }, []);

  /**
   * Handle zone click from map
   */
  const handleZoneClick = useCallback((properties: HUBZoneFeatureProperties) => {
    setSelectedZone(properties);
  }, []);

  /**
   * Handle tract click from radius results
   */
  const handleTractClick = useCallback((result: RadiusSearchResult) => {
    navigate(`/hubzone/tract/${result.geoid}`);
  }, [navigate]);

  /**
   * Handle map ready
   */
  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
    // Sync layers state when map is ready
    if (mapRef.current) {
      const currentLayers = mapRef.current.getLayers();
      if (currentLayers) {
        setLayers(currentLayers);
      }
    }
  }, []);

  /**
   * Toggle sidebar collapse (mobile)
   */
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev: boolean) => !prev);
  }, []);

  /**
   * Handle export
   */
  const handleExport = useCallback(async (options: ExportOptions) => {
    try {
      const response = await fetch('/api/v1/hubzone/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: options.format,
          state: options.state,
          county: options.county,
          zone_types: options.zoneTypes,
        }),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `hubzones_${new Date().toISOString().split('T')[0]}.${options.format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      // Download file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      throw err;
    }
  }, []);

  /**
   * Handle share
   */
  const handleShare = useCallback(() => {
    if (!mapRef.current) return;

    const permalink = mapRef.current.getPermalink();
    navigator.clipboard.writeText(permalink).then(() => {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    });
  }, []);

  return (
    <div className="space-y-4 animate-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            HUBZone Map Explorer
          </h1>
          <p className="text-gray-600 text-sm">
            Interactive map of HUBZone designated areas across the United States
          </p>
        </div>

        {/* Mobile sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden btn-secondary text-sm"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          Map Controls
        </button>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 relative">
        {/* Sidebar */}
        <div
          className={`
            ${sidebarCollapsed ? 'hidden' : 'fixed inset-0 z-50 bg-black/50 lg:bg-transparent lg:relative lg:inset-auto'}
            lg:block lg:flex-shrink-0
          `}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            // Close sidebar when clicking backdrop (mobile)
            if (e.target === e.currentTarget) {
              setSidebarCollapsed(true);
            }
          }}
        >
          <MapSidebar
            layers={layers}
            onLayerToggle={handleLayerToggle}
            onShowAllLayers={handleShowAllLayers}
            onHideAllLayers={handleHideAllLayers}
            onAddressSearch={handleAddressSearch}
            statistics={statistics}
            isCollapsed={false}
            onToggleCollapse={toggleSidebar}
            className="lg:sticky lg:top-4"
            onExportClick={() => setShowExportModal(true)}
            onShareClick={handleShare}
            searchResult={searchResult}
            onRadiusSearch={handleRadiusSearch}
            onClearSearch={handleClearSearch}
          />
        </div>

        {/* Map Container */}
        <div className="flex-1 min-w-0">
          <HUBZoneMap
            ref={mapRef}
            centerLat={initialLat}
            centerLng={initialLng}
            zoom={initialZoom}
            height="h-[calc(100vh-12rem)]"
            onZoneClick={handleZoneClick}
            onLayersChange={handleLayersChange}
            onMapReady={handleMapReady}
            showLayerControls={false}
            showCoordinates={true}
            className="min-h-[500px]"
          />

          {/* Radius Search Results */}
          {radiusResults.length > 0 && (
            <div className="mt-4 card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
                  Nearby HUBZone Tracts
                </h3>
                <span className="text-sm text-gray-500">
                  {radiusResults.length} found
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {radiusResults.map((result: RadiusSearchResult) => (
                  <button
                    key={result.id}
                    onClick={() => handleTractClick(result)}
                    className="w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{result.name}</p>
                      <p className="text-xs text-gray-500">
                        {result.county}, {result.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-hubzone-600">
                        {result.distanceMiles.toFixed(1)} mi
                      </p>
                      <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                        {getZoneTypeLabel(result.zoneType)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Zone Info (shows below map on smaller screens) */}
          {selectedZone && (
            <div className="mt-4 lg:hidden card border-2 border-hubzone-200 bg-hubzone-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">
                    {selectedZone.name || 'Census Tract'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {selectedZone.county}, {selectedZone.state}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="badge-info text-xs">
                      {getZoneTypeLabel(selectedZone.hubzone_type)}
                    </span>
                    {selectedZone.is_redesignated && (
                      <span className="badge-warning text-xs">Redesignated</span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/hubzone/tract/${selectedZone.census_tract}`)}
                    className="mt-3 text-sm text-hubzone-600 hover:text-hubzone-700 font-medium"
                  >
                    View Details →
                  </button>
                </div>
                <button
                  onClick={() => setSelectedZone(null)}
                  className="p-1 hover:bg-hubzone-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <svg className="w-5 h-5 text-verified-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Link copied to clipboard!
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get human-readable zone type label
 */
function getZoneTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    qct: 'QCT',
    qualified_census_tract: 'QCT',
    nmc: 'NMC',
    qualified_non_metro_county: 'NMC',
    indian_lands: 'Indian Lands',
    brac: 'BRAC',
    base_closure_area: 'BRAC',
    redesignated: 'Redesignated',
    governor_designated: 'Gov. Designated',
    dda: 'DDA',
  };
  return labels[type] || type;
}

export default MapExplorer;
