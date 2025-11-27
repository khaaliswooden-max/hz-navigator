/**
 * Radius Search Component
 *
 * Displays radius search options and results for nearby HUBZone tracts
 */

import { useState, useCallback } from 'react';
import { clsx } from 'clsx';

// ===== Types =====

export interface RadiusSearchResult {
  id: string;
  geoid: string;
  name: string;
  zoneType: string;
  status: string;
  state: string;
  county: string;
  distanceMiles: number;
  designationDate: string;
  expirationDate: string | null;
  isRedesignated: boolean;
}

export interface RadiusSearchProps {
  /** Center coordinates for the search */
  center: { lat: number; lng: number } | null;
  /** Address label for the center point */
  addressLabel?: string;
  /** Callback when radius is selected */
  onRadiusSelect: (radiusMiles: number) => void;
  /** Callback when a tract result is clicked */
  onTractClick: (result: RadiusSearchResult) => void;
  /** Current search results */
  results: RadiusSearchResult[];
  /** Whether search is in progress */
  isSearching: boolean;
  /** Error message */
  error?: string | null;
  /** Currently selected radius */
  selectedRadius: number | null;
  /** Clear search */
  onClear: () => void;
}

// ===== Constants =====

const RADIUS_OPTIONS = [
  { value: 5, label: '5 mi' },
  { value: 10, label: '10 mi' },
  { value: 25, label: '25 mi' },
  { value: 50, label: '50 mi' },
];

// ===== Component =====

function RadiusSearch({
  center,
  addressLabel,
  onRadiusSelect,
  onTractClick,
  results,
  isSearching,
  error,
  selectedRadius,
  onClear,
}: RadiusSearchProps) {
  const [expandedTract, setExpandedTract] = useState<string | null>(null);

  /**
   * Handle tract click to expand details
   */
  const handleTractExpand = useCallback((tractId: string) => {
    setExpandedTract((prev) => (prev === tractId ? null : tractId));
  }, []);

  /**
   * Get zone type label
   */
  const getZoneTypeLabel = (type: string): string => {
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
  };

  /**
   * Get zone type color
   */
  const getZoneTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      qct: '#10B981',
      qualified_census_tract: '#10B981',
      nmc: '#3B82F6',
      qualified_non_metro_county: '#3B82F6',
      indian_lands: '#8B5CF6',
      brac: '#EF4444',
      base_closure_area: '#EF4444',
      redesignated: '#F59E0B',
      governor_designated: '#F59E0B',
      dda: '#EC4899',
    };
    return colors[type] || '#6B7280';
  };

  if (!center) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        <svg
          className="w-10 h-10 mx-auto mb-2 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p>Search for an address first to enable radius search</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Center Point Info */}
      <div className="bg-hubzone-50 rounded-lg p-3 border border-hubzone-100">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-hubzone-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-hubzone-900 truncate">
              {addressLabel || 'Selected Location'}
            </p>
            <p className="text-xs text-hubzone-600">
              {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
            </p>
          </div>
          <button
            onClick={onClear}
            className="text-hubzone-400 hover:text-hubzone-600 transition-colors"
            title="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Radius Selection */}
      <div>
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          Search Radius
        </label>
        <div className="flex gap-2">
          {RADIUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onRadiusSelect(option.value)}
              disabled={isSearching}
              className={clsx(
                'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all',
                'border focus:outline-none focus:ring-2 focus:ring-hubzone-500 focus:ring-offset-1',
                selectedRadius === option.value
                  ? 'bg-hubzone-600 text-white border-hubzone-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-hubzone-300 hover:bg-hubzone-50',
                isSearching && 'opacity-50 cursor-not-allowed'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 animate-spin text-hubzone-600" fill="none" viewBox="0 0 24 24">
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
            <span className="text-sm text-gray-600">Searching nearby tracts...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {!isSearching && selectedRadius && results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              Nearby HUBZone Tracts
            </h4>
            <span className="text-xs text-gray-500">
              {results.length} found within {selectedRadius} mi
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.map((result) => (
              <div
                key={result.id}
                className={clsx(
                  'bg-white rounded-lg border transition-all cursor-pointer',
                  expandedTract === result.id
                    ? 'border-hubzone-300 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                {/* Summary Row */}
                <button
                  onClick={() => handleTractExpand(result.id)}
                  className="w-full p-3 flex items-center gap-3 text-left"
                >
                  {/* Distance Badge */}
                  <div className="flex-shrink-0 w-14 text-center">
                    <span className="text-lg font-bold text-gray-900">
                      {result.distanceMiles.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500 block">mi</span>
                  </div>

                  {/* Tract Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.name || `Tract ${result.geoid}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {result.county}, {result.state}
                    </p>
                  </div>

                  {/* Type Badge */}
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: getZoneTypeColor(result.zoneType) }}
                  >
                    {getZoneTypeLabel(result.zoneType)}
                  </span>

                  {/* Expand Icon */}
                  <svg
                    className={clsx(
                      'w-4 h-4 text-gray-400 transition-transform',
                      expandedTract === result.id && 'rotate-180'
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Expanded Details */}
                {expandedTract === result.id && (
                  <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                      <div>
                        <span className="text-gray-500">GEOID:</span>
                        <span className="font-mono ml-1 text-gray-900">{result.geoid}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span
                          className={clsx(
                            'ml-1 font-medium',
                            result.status === 'active' ? 'text-verified-600' : 'text-amber-600'
                          )}
                        >
                          {result.status}
                        </span>
                      </div>
                      {result.designationDate && (
                        <div>
                          <span className="text-gray-500">Designated:</span>
                          <span className="ml-1 text-gray-900">
                            {new Date(result.designationDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {result.expirationDate && (
                        <div>
                          <span className="text-gray-500">Expires:</span>
                          <span className="ml-1 text-gray-900">
                            {new Date(result.expirationDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTractClick(result);
                      }}
                      className="mt-3 w-full py-1.5 px-3 bg-hubzone-600 text-white text-xs font-medium rounded-md hover:bg-hubzone-700 transition-colors"
                    >
                      View Full Details
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!isSearching && selectedRadius && results.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          <svg
            className="w-10 h-10 mx-auto mb-2 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p>No HUBZone tracts found within {selectedRadius} miles</p>
          <p className="text-xs mt-1">Try increasing the search radius</p>
        </div>
      )}
    </div>
  );
}

export default RadiusSearch;

