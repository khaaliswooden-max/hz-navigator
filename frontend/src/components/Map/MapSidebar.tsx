/**
 * Map Sidebar Component
 *
 * Sidebar for the HUBZone map with search, layer controls, legend, and statistics
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';

// ===== Types =====

export interface LayerConfig {
  id: string;
  type: string;
  label: string;
  color: string;
  visible: boolean;
}

export interface AddressSearchResult {
  address: string;
  standardizedAddress: string;
  isInHubzone: boolean;
  censusTract: string | null;
  designationType: string | null;
  coordinates: {
    lat: number;
    lng: number;
  };
  matchingZones: Array<{
    name: string;
    type: string;
    status: string;
    designationDate?: string;
    expirationDate?: string;
  }>;
}

export interface MapStatistics {
  totalTracts: number;
  designatedTracts: number;
  activeTracts: number;
  lastUpdate: string | null;
  nextUpdate: string | null;
  byType: {
    qct: number;
    nmc: number;
    indianLands: number;
    brac: number;
    redesignated: number;
    dda: number;
  };
}

export interface MapSidebarProps {
  /** Layer configurations */
  layers: LayerConfig[];
  /** Callback when layer visibility is toggled */
  onLayerToggle: (layerId: string) => void;
  /** Callback to show all layers */
  onShowAllLayers: () => void;
  /** Callback to hide all layers */
  onHideAllLayers: () => void;
  /** Callback when address is searched */
  onAddressSearch: (result: AddressSearchResult) => void;
  /** Map statistics */
  statistics?: MapStatistics | null;
  /** Whether the sidebar is collapsed (mobile) */
  isCollapsed?: boolean;
  /** Callback to toggle sidebar collapse */
  onToggleCollapse?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Callback to open export modal */
  onExportClick?: () => void;
  /** Callback to share map link */
  onShareClick?: () => void;
  /** Current search result for radius search */
  searchResult?: AddressSearchResult | null;
  /** Callback when radius search is triggered */
  onRadiusSearch?: (center: { lat: number; lng: number }, radiusMiles: number) => void;
  /** Callback to clear search */
  onClearSearch?: () => void;
}

// ===== Default Layer Configurations =====

export const DEFAULT_LAYERS: LayerConfig[] = [
  {
    id: 'hubzone-qct',
    type: 'qct',
    label: 'Qualified Census Tracts',
    color: '#10B981',
    visible: true,
  },
  {
    id: 'hubzone-redesignated',
    type: 'redesignated',
    label: 'Redesignated Areas',
    color: '#F59E0B',
    visible: true,
  },
  {
    id: 'hubzone-indian-lands',
    type: 'indian_lands',
    label: 'Indian Lands',
    color: '#8B5CF6',
    visible: true,
  },
  {
    id: 'hubzone-brac',
    type: 'brac',
    label: 'Base Closure Areas',
    color: '#EF4444',
    visible: true,
  },
  {
    id: 'hubzone-nmc',
    type: 'nmc',
    label: 'Non-Metro Counties',
    color: '#3B82F6',
    visible: true,
  },
  {
    id: 'hubzone-dda',
    type: 'dda',
    label: 'Difficult Development Areas',
    color: '#EC4899',
    visible: true,
  },
];

// ===== Component =====

function MapSidebar({
  layers,
  onLayerToggle,
  onShowAllLayers,
  onHideAllLayers,
  onAddressSearch,
  statistics,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
  onExportClick,
  onShareClick,
  searchResult: externalSearchResult,
  onRadiusSearch,
  onClearSearch,
}: MapSidebarProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<AddressSearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    radius: false,
    layers: true,
    legend: false,
    statistics: false,
  });

  // Use external search result if provided
  const currentSearchResult = externalSearchResult ?? searchResult;

  /**
   * Toggle section expand/collapse
   */
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  /**
   * Handle address search
   */
  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;

      setIsSearching(true);
      setSearchError(null);
      setSearchResult(null);

      try {
        // Call the address verification API
        const response = await fetch('/api/v1/hubzone/verify-address', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: searchQuery.trim(),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to verify address');
        }

        const data = await response.json();

        // Transform API response to our format
        const result: AddressSearchResult = {
          address: searchQuery,
          standardizedAddress: data.data?.standardizedAddress || data.data?.address || searchQuery,
          isInHubzone: data.data?.isInHubzone ?? false,
          censusTract: data.data?.censusTract || data.data?.census_tract || null,
          designationType: data.data?.designationType || data.data?.zone_type || null,
          coordinates: {
            lat: data.data?.coordinates?.latitude || data.data?.lat || 39.8283,
            lng: data.data?.coordinates?.longitude || data.data?.lng || -98.5795,
          },
          matchingZones: data.data?.matchingZones || [],
        };

        setSearchResult(result);
        onAddressSearch(result);
      } catch (err) {
        console.error('Address search error:', err);
        setSearchError(
          err instanceof Error ? err.message : 'Failed to search address. Please try again.'
        );

        // For demo purposes, create a mock result if API fails
        // This can be removed in production
        const mockResult: AddressSearchResult = {
          address: searchQuery,
          standardizedAddress: searchQuery,
          isInHubzone: false,
          censusTract: null,
          designationType: null,
          coordinates: {
            lat: 39.8283,
            lng: -98.5795,
          },
          matchingZones: [],
        };

        // Try geocoding as fallback
        try {
          const geocodeResponse = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}&country=US&limit=1`
          );
          
          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            if (geocodeData.features && geocodeData.features.length > 0) {
              const feature = geocodeData.features[0];
              mockResult.coordinates = {
                lng: feature.center[0],
                lat: feature.center[1],
              };
              mockResult.standardizedAddress = feature.place_name;
              setSearchResult(mockResult);
              onAddressSearch(mockResult);
              setSearchError(null);
            }
          }
        } catch (geocodeErr) {
          console.error('Geocoding fallback failed:', geocodeErr);
        }
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery, onAddressSearch]
  );

  /**
   * Clear search result
   */
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResult(null);
    setSearchError(null);
  }, []);

  /**
   * Format date string
   */
  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  /**
   * Get designation type label
   */
  const getDesignationLabel = (type: string | null): string => {
    if (!type) return 'Unknown';
    const labels: Record<string, string> = {
      qct: 'Qualified Census Tract',
      qualified_census_tract: 'Qualified Census Tract',
      nmc: 'Non-Metro County',
      qualified_non_metro_county: 'Non-Metro County',
      indian_lands: 'Indian Lands',
      brac: 'Base Closure Area',
      base_closure_area: 'Base Closure Area',
      redesignated: 'Redesignated Area',
      governor_designated: 'Governor Designated',
      dda: 'Difficult Development Area',
    };
    return labels[type] || type;
  };

  // Collapsed state (mobile)
  if (isCollapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className={clsx(
          'fixed left-4 top-20 z-30 bg-white rounded-lg shadow-lg p-3',
          'hover:bg-gray-50 transition-colors',
          'lg:hidden',
          className
        )}
        aria-label="Open map sidebar"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      className={clsx(
        'w-80 flex-shrink-0 bg-white rounded-xl shadow-lg overflow-hidden',
        'flex flex-col max-h-[calc(100vh-10rem)]',
        'fixed lg:relative left-0 top-0 lg:top-auto z-40 lg:z-auto',
        'h-full lg:h-auto',
        className
      )}
    >
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Map Controls</h2>
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close sidebar"
        >
          <svg
            className="w-5 h-5 text-gray-500"
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ===== Address Search Section ===== */}
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('search')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-hubzone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="font-semibold text-gray-900">Address Search</span>
            </div>
            <svg
              className={clsx(
                'w-5 h-5 text-gray-400 transition-transform',
                expandedSections.search && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.search && (
            <div className="px-3 pb-3 space-y-3">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter address, city, or ZIP..."
                    className="input text-sm pr-10"
                    disabled={isSearching}
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchQuery.trim()}
                    className={clsx(
                      'absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md',
                      'text-gray-400 hover:text-hubzone-600 hover:bg-hubzone-50',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-colors'
                    )}
                  >
                    {isSearching ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </form>

              {/* Search Error */}
              {searchError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded-md">
                  {searchError}
                </div>
              )}

              {/* Search Result */}
              {currentSearchResult && (
                <div
                  className={clsx(
                    'rounded-lg border-2 p-3 space-y-2',
                    currentSearchResult.isInHubzone
                      ? 'bg-verified-50 border-verified-200'
                      : 'bg-gray-100 border-gray-200'
                  )}
                >
                  {/* Status Header */}
                  <div className="flex items-start gap-2">
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-lg',
                        currentSearchResult.isInHubzone
                          ? 'bg-verified-100 text-verified-600'
                          : 'bg-gray-200 text-gray-500'
                      )}
                    >
                      {currentSearchResult.isInHubzone ? '✓' : '✗'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={clsx(
                          'font-semibold text-sm',
                          currentSearchResult.isInHubzone ? 'text-verified-800' : 'text-gray-700'
                        )}
                      >
                        {currentSearchResult.isInHubzone ? 'In HUBZone' : 'Not in HUBZone'}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {currentSearchResult.standardizedAddress}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  {currentSearchResult.isInHubzone && (
                    <div className="space-y-1 pt-2 border-t border-gray-200/50 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Census Tract:</span>
                        <span className="font-mono font-medium text-gray-900">
                          {currentSearchResult.censusTract || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Designation:</span>
                        <span className="font-medium text-gray-900">
                          {getDesignationLabel(currentSearchResult.designationType)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Matching Zones */}
                  {currentSearchResult.matchingZones.length > 0 && (
                    <div className="pt-2 border-t border-gray-200/50 space-y-1">
                      <p className="text-xs font-medium text-gray-700">Matching Zones:</p>
                      {currentSearchResult.matchingZones.map((zone, idx) => (
                        <div
                          key={idx}
                          className="text-xs bg-white/50 rounded p-1.5 flex items-center justify-between"
                        >
                          <span className="text-gray-700">{zone.name}</span>
                          <span className="badge-success text-[10px]">{zone.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Radius Search Buttons */}
                  {onRadiusSearch && (
                    <div className="pt-2 border-t border-gray-200/50">
                      <p className="text-xs font-medium text-gray-700 mb-2">Search Radius:</p>
                      <div className="flex gap-1.5">
                        {[5, 10, 25, 50].map((radius) => (
                          <button
                            key={radius}
                            onClick={() => {
                              setSelectedRadius(radius);
                              onRadiusSearch(currentSearchResult.coordinates, radius);
                            }}
                            className={clsx(
                              'flex-1 py-1.5 text-xs font-medium rounded transition-colors',
                              selectedRadius === radius
                                ? 'bg-hubzone-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-200 hover:border-hubzone-300'
                            )}
                          >
                            {radius} mi
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clear Button */}
                  <button
                    onClick={() => {
                      clearSearch();
                      setSelectedRadius(null);
                      if (onClearSearch) onClearSearch();
                    }}
                    className="w-full text-xs text-gray-500 hover:text-gray-700 pt-1"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== Layer Toggles Section ===== */}
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('layers')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-hubzone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span className="font-semibold text-gray-900">HUBZone Layers</span>
            </div>
            <svg
              className={clsx(
                'w-5 h-5 text-gray-400 transition-transform',
                expandedSections.layers && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.layers && (
            <div className="px-3 pb-3 space-y-2">
              {/* Quick Actions */}
              <div className="flex gap-2 pb-2 border-b border-gray-200">
                <button
                  onClick={onShowAllLayers}
                  className="flex-1 text-xs text-hubzone-600 hover:text-hubzone-700 font-medium py-1 hover:bg-hubzone-50 rounded transition-colors"
                >
                  Show All
                </button>
                <button
                  onClick={onHideAllLayers}
                  className="flex-1 text-xs text-hubzone-600 hover:text-hubzone-700 font-medium py-1 hover:bg-hubzone-50 rounded transition-colors"
                >
                  Hide All
                </button>
              </div>

              {/* Layer Checkboxes */}
              <div className="space-y-1">
                {layers.map((layer) => (
                  <label
                    key={layer.id}
                    className={clsx(
                      'flex items-center gap-3 cursor-pointer group p-2 rounded-lg',
                      'hover:bg-white transition-colors'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={() => onLayerToggle(layer.id)}
                      className="w-4 h-4 rounded border-gray-300 text-hubzone-600 focus:ring-hubzone-500 focus:ring-offset-0"
                    />
                    <span
                      className="w-4 h-4 rounded-sm flex-shrink-0 border border-gray-200"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span
                      className={clsx(
                        'text-sm transition-colors',
                        layer.visible
                          ? 'text-gray-900'
                          : 'text-gray-400 group-hover:text-gray-600'
                      )}
                    >
                      {layer.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ===== Legend Section ===== */}
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('legend')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-hubzone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span className="font-semibold text-gray-900">Legend</span>
            </div>
            <svg
              className={clsx(
                'w-5 h-5 text-gray-400 transition-transform',
                expandedSections.legend && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.legend && (
            <div className="px-3 pb-3 space-y-3">
              {/* Color Legend */}
              <div className="space-y-2">
                {layers.map((layer) => (
                  <div key={layer.id} className="flex items-start gap-3">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span
                        className="w-5 h-5 rounded-sm border border-gray-200"
                        style={{
                          backgroundColor: layer.color,
                          opacity: 0.4,
                        }}
                      />
                      <span
                        className="w-3 h-0.5 -ml-1"
                        style={{ backgroundColor: layer.color }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900">{layer.label}</p>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        {getLegendDescription(layer.type)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Last Updated */}
              {statistics?.lastUpdate && (
                <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                  <span>Last updated: {formatDate(statistics.lastUpdate)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== Statistics Section ===== */}
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('statistics')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-hubzone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span className="font-semibold text-gray-900">Statistics</span>
            </div>
            <svg
              className={clsx(
                'w-5 h-5 text-gray-400 transition-transform',
                expandedSections.statistics && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedSections.statistics && (
            <div className="px-3 pb-3 space-y-3">
              {statistics ? (
                <>
                  {/* Main Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-hubzone-600">
                        {statistics.totalTracts.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-500">Total Tracts</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-verified-600">
                        {statistics.designatedTracts.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-gray-500">Designated</p>
                    </div>
                  </div>

                  {/* By Type */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-700">By Type:</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex justify-between px-2 py-1 bg-white rounded">
                        <span className="text-gray-500">QCT</span>
                        <span className="font-medium text-gray-900">
                          {statistics.byType.qct.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between px-2 py-1 bg-white rounded">
                        <span className="text-gray-500">NMC</span>
                        <span className="font-medium text-gray-900">
                          {statistics.byType.nmc.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between px-2 py-1 bg-white rounded">
                        <span className="text-gray-500">Indian</span>
                        <span className="font-medium text-gray-900">
                          {statistics.byType.indianLands.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between px-2 py-1 bg-white rounded">
                        <span className="text-gray-500">BRAC</span>
                        <span className="font-medium text-gray-900">
                          {statistics.byType.brac.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between px-2 py-1 bg-white rounded">
                        <span className="text-gray-500">Redesig.</span>
                        <span className="font-medium text-gray-900">
                          {statistics.byType.redesignated.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between px-2 py-1 bg-white rounded">
                        <span className="text-gray-500">DDA</span>
                        <span className="font-medium text-gray-900">
                          {statistics.byType.dda.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Update Info */}
                  <div className="pt-2 border-t border-gray-200 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Update:</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(statistics.lastUpdate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Next Update:</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(statistics.nextUpdate)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  <svg
                    className="w-8 h-8 mx-auto mb-2 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Loading statistics...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {onExportClick && (
            <button
              onClick={onExportClick}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export
            </button>
          )}
          {onShareClick && (
            <button
              onClick={onShareClick}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              Share
            </button>
          )}
        </div>
        <p className="text-center text-xs text-gray-500">Data from SBA HUBZone Program</p>
      </div>
    </div>
  );
}

/**
 * Get legend description for zone type
 */
function getLegendDescription(type: string): string {
  const descriptions: Record<string, string> = {
    qct: 'Census tracts with high poverty rates or low median incomes',
    nmc: 'Non-metropolitan counties with unemployment or low median income',
    indian_lands: 'Federally recognized Indian reservations and trust lands',
    brac: 'Military Base Realignment and Closure areas',
    redesignated: 'Areas in 3-year transition period after losing qualification',
    dda: 'Areas with high construction costs designated by HUD',
  };
  return descriptions[type] || 'HUBZone designated area';
}

export default MapSidebar;

