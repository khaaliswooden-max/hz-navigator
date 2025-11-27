/**
 * Tract Detail Page
 *
 * Detailed view of a HUBZone census tract with map, demographics, and history
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ===== Types =====

interface TractDetails {
  id: string;
  geoid: string;
  name: string;
  zoneType: string;
  status: string;
  state: string;
  county: string;
  designationDate: string;
  expirationDate: string | null;
  isRedesignated: boolean;
  gracePeriodEndDate: string | null;
  geometry: GeoJSON.Feature | null;
  areaSquareMiles: number;
  businessCount: number;
  populationEstimate: number | null;
  designationHistory: DesignationHistory[];
}

interface DesignationHistory {
  id: string;
  zoneType: string;
  status: string;
  effectiveDate: string;
  endDate: string | null;
  reason: string | null;
}

interface Business {
  id: string;
  name: string;
  address: string;
  certificationStatus: string;
}

// ===== Constants =====

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// ===== Component =====

function TractDetail() {
  const { tractId } = useParams<{ tractId: string }>();
  const navigate = useNavigate();

  // Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  // State
  const [tract, setTract] = useState<TractDetails | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'businesses'>('overview');

  /**
   * Fetch tract details
   */
  useEffect(() => {
    const fetchTract = async () => {
      if (!tractId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/v1/hubzone/tract/${tractId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Tract not found');
          }
          throw new Error('Failed to load tract details');
        }

        const data = await response.json();
        setTract(data.data);
      } catch (err) {
        console.error('Failed to fetch tract:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tract details');

        // Mock data for demo
        setTract({
          id: tractId || '',
          geoid: tractId || '',
          name: `Census Tract ${tractId}`,
          zoneType: 'qualified_census_tract',
          status: 'active',
          state: 'California',
          county: 'Los Angeles',
          designationDate: '2020-01-01',
          expirationDate: '2025-12-31',
          isRedesignated: false,
          gracePeriodEndDate: null,
          geometry: null,
          areaSquareMiles: 2.5,
          businessCount: 12,
          populationEstimate: 4500,
          designationHistory: [
            {
              id: '1',
              zoneType: 'qualified_census_tract',
              status: 'active',
              effectiveDate: '2020-01-01',
              endDate: null,
              reason: 'Initial designation',
            },
          ],
        });
        setError(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTract();
  }, [tractId]);

  /**
   * Initialize map when tract data is loaded
   */
  useEffect(() => {
    if (!tract || !mapContainer.current || map.current) return;
    if (!MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Create map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283],
      zoom: 10,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      if (!map.current || !tract.geometry) return;

      // Add tract boundary
      map.current.addSource('tract-boundary', {
        type: 'geojson',
        data: tract.geometry,
      });

      // Fill layer
      map.current.addLayer({
        id: 'tract-fill',
        type: 'fill',
        source: 'tract-boundary',
        paint: {
          'fill-color': getZoneTypeColor(tract.zoneType),
          'fill-opacity': 0.3,
        },
      });

      // Stroke layer
      map.current.addLayer({
        id: 'tract-stroke',
        type: 'line',
        source: 'tract-boundary',
        paint: {
          'line-color': getZoneTypeColor(tract.zoneType),
          'line-width': 3,
        },
      });

      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      const coords = tract.geometry.geometry as GeoJSON.Polygon;
      if (coords.coordinates) {
        coords.coordinates[0].forEach((coord: number[]) => {
          bounds.extend([coord[0], coord[1]]);
        });
        map.current?.fitBounds(bounds, { padding: 50 });
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [tract]);

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
      dda: '#EC4899',
    };
    return colors[type] || '#6B7280';
  };

  /**
   * Get zone type label
   */
  const getZoneTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      qct: 'Qualified Census Tract',
      qualified_census_tract: 'Qualified Census Tract',
      nmc: 'Non-Metro County',
      qualified_non_metro_county: 'Non-Metro County',
      indian_lands: 'Indian Lands',
      brac: 'Base Closure Area',
      base_closure_area: 'Base Closure Area',
      redesignated: 'Redesignated Area',
      dda: 'Difficult Development Area',
    };
    return labels[type] || type;
  };

  /**
   * Format date
   */
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-in">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-hubzone-200 border-t-hubzone-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading tract details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !tract) {
    return (
      <div className="animate-in">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Tract</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={() => navigate('/map')} className="btn-primary">
              Return to Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tract) return null;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/map" className="hover:text-hubzone-600 transition-colors">
              Map Explorer
            </Link>
            <span>/</span>
            <span className="text-gray-900">Tract Details</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {tract.name || `Census Tract ${tract.geoid}`}
          </h1>
          <p className="text-gray-600 mt-1">
            {tract.county}, {tract.state}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: getZoneTypeColor(tract.zoneType) }}
          >
            {getZoneTypeLabel(tract.zoneType)}
          </span>
          <span
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              tract.status === 'active'
                ? 'bg-verified-100 text-verified-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {tract.status.charAt(0).toUpperCase() + tract.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="card p-0 overflow-hidden">
            <div ref={mapContainer} className="h-[400px] w-full">
              {!MAPBOX_TOKEN && (
                <div className="h-full flex items-center justify-center bg-gray-100">
                  <p className="text-gray-500">Map requires Mapbox token</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="space-y-4">
          {/* GEOID Card */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Census Tract ID</h3>
            <p className="text-2xl font-mono font-bold text-gray-900">{tract.geoid}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card bg-hubzone-50">
              <p className="text-2xl font-bold text-hubzone-600">
                {tract.areaSquareMiles.toFixed(1)}
              </p>
              <p className="text-xs text-hubzone-700">sq miles</p>
            </div>
            <div className="card bg-verified-50">
              <p className="text-2xl font-bold text-verified-600">{tract.businessCount}</p>
              <p className="text-xs text-verified-700">businesses</p>
            </div>
          </div>

          {/* Dates */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Designation Dates</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Designated:</span>
                <span className="font-medium text-gray-900">
                  {formatDate(tract.designationDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expires:</span>
                <span className="font-medium text-gray-900">
                  {formatDate(tract.expirationDate)}
                </span>
              </div>
              {tract.isRedesignated && tract.gracePeriodEndDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Grace Period Ends:</span>
                  <span className="font-medium text-amber-600">
                    {formatDate(tract.gracePeriodEndDate)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'history', label: 'Designation History' },
            { id: 'businesses', label: `Businesses (${tract.businessCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-hubzone-600 text-hubzone-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Details</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500">State</dt>
                  <dd className="font-medium text-gray-900">{tract.state}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">County</dt>
                  <dd className="font-medium text-gray-900">{tract.county}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Tract Name</dt>
                  <dd className="font-medium text-gray-900">{tract.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">GEOID</dt>
                  <dd className="font-mono font-medium text-gray-900">{tract.geoid}</dd>
                </div>
              </dl>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demographics</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Population (Est.)</dt>
                  <dd className="font-medium text-gray-900">
                    {tract.populationEstimate?.toLocaleString() || 'N/A'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Area</dt>
                  <dd className="font-medium text-gray-900">
                    {tract.areaSquareMiles.toFixed(2)} sq mi
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Density</dt>
                  <dd className="font-medium text-gray-900">
                    {tract.populationEstimate
                      ? Math.round(tract.populationEstimate / tract.areaSquareMiles).toLocaleString()
                      : 'N/A'}{' '}
                    per sq mi
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card md:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Designation Status</h3>
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${getZoneTypeColor(tract.zoneType)}20` }}
                >
                  <svg
                    className="w-6 h-6"
                    style={{ color: getZoneTypeColor(tract.zoneType) }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{getZoneTypeLabel(tract.zoneType)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    This tract has been designated as a HUBZone since{' '}
                    {formatDate(tract.designationDate)}. Businesses with their principal office
                    in this tract may qualify for the HUBZone program.
                  </p>
                  {tract.isRedesignated && (
                    <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <p className="text-sm text-amber-800">
                        <strong>Note:</strong> This tract has been redesignated and is in a
                        3-year transition period ending {formatDate(tract.gracePeriodEndDate)}.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Designation History</h3>
            {tract.designationHistory.length > 0 ? (
              <div className="space-y-4">
                {tract.designationHistory.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className={`flex gap-4 ${
                      idx !== tract.designationHistory.length - 1 ? 'pb-4 border-b' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getZoneTypeColor(entry.zoneType) }}
                      />
                      {idx !== tract.designationHistory.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-200 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="font-medium text-gray-900">
                        {getZoneTypeLabel(entry.zoneType)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(entry.effectiveDate)}
                        {entry.endDate && ` - ${formatDate(entry.endDate)}`}
                      </p>
                      {entry.reason && (
                        <p className="text-sm text-gray-600 mt-1">{entry.reason}</p>
                      )}
                      <span
                        className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                          entry.status === 'active'
                            ? 'bg-verified-100 text-verified-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No designation history available</p>
            )}
          </div>
        )}

        {/* Businesses Tab */}
        {activeTab === 'businesses' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Businesses in This Tract
            </h3>
            {tract.businessCount > 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <p className="mb-2">{tract.businessCount} certified businesses in this tract</p>
                <p className="text-sm">Business details are available with appropriate permissions</p>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No certified businesses currently in this tract
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/map')} className="btn-secondary">
          ← Back to Map
        </button>
        <button
          onClick={() => {
            const url = `${window.location.origin}/hubzone/tract/${tractId}`;
            navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
          }}
          className="btn-ghost"
        >
          <svg
            className="w-4 h-4 mr-2"
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
      </div>
    </div>
  );
}

export default TractDetail;

