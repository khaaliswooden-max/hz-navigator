/**
 * HUBZone Map Component
 *
 * Interactive Mapbox GL map showing HUBZone designations across the United States
 * with vector tile layers, popups, and responsive controls.
 */

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ===== Types =====

export interface HUBZoneFeatureProperties {
  census_tract: string;
  hubzone_type: HubzoneType;
  status: string;
  designation_date: string;
  expiration_date: string | null;
  is_redesignated: boolean;
  grace_period_end_date: string | null;
  state: string;
  county: string;
  name: string;
  poverty_rate?: number;
  median_income?: number;
}

export type HubzoneType =
  | 'qct'
  | 'qualified_census_tract'
  | 'nmc'
  | 'qualified_non_metro_county'
  | 'indian_lands'
  | 'brac'
  | 'base_closure_area'
  | 'redesignated'
  | 'governor_designated'
  | 'dda';

export interface LayerConfig {
  id: string;
  type: HubzoneType;
  label: string;
  color: string;
  visible: boolean;
}

export interface HUBZoneMapProps {
  /** Initial center latitude */
  centerLat?: number;
  /** Initial center longitude */
  centerLng?: number;
  /** Initial zoom level */
  zoom?: number;
  /** Height of the map container */
  height?: string;
  /** Callback when a HUBZone is clicked */
  onZoneClick?: (properties: HUBZoneFeatureProperties) => void;
  /** Show layer controls */
  showLayerControls?: boolean;
  /** Show coordinates display */
  showCoordinates?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when layers change */
  onLayersChange?: (layers: LayerConfig[]) => void;
  /** Callback when map is ready */
  onMapReady?: () => void;
}

/**
 * Ref handle exposed by HUBZoneMap for external control
 */
export interface HUBZoneMapRef {
  /** Fly to a specific location */
  flyTo: (lng: number, lat: number, zoom?: number) => void;
  /** Add a marker at a specific location */
  addMarker: (lng: number, lat: number, options?: MarkerOptions) => void;
  /** Remove the current marker */
  removeMarker: () => void;
  /** Toggle a specific layer's visibility */
  toggleLayer: (layerId: string) => void;
  /** Show all layers */
  showAllLayers: () => void;
  /** Hide all layers */
  hideAllLayers: () => void;
  /** Get current layers state */
  getLayers: () => LayerConfig[];
  /** Reset view to default */
  resetView: () => void;
  /** Draw a radius circle on the map */
  drawRadiusCircle: (lng: number, lat: number, radiusMiles: number) => void;
  /** Remove the radius circle */
  removeRadiusCircle: () => void;
  /** Get permalink URL for current map state */
  getPermalink: () => string;
  /** Get the map instance (for advanced usage) */
  getMap: () => mapboxgl.Map | null;
}

export interface MarkerOptions {
  /** Marker color (hex or CSS color) */
  color?: string;
  /** Whether to show a popup */
  popup?: boolean;
  /** Popup content (HTML string) */
  popupContent?: string;
}

// ===== Constants =====

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';
const TILE_URL = '/api/v1/map/tiles/{z}/{x}/{y}.pbf';

// Default map center: Continental US
const DEFAULT_CENTER: [number, number] = [-98.5795, 39.8283];
const DEFAULT_ZOOM = 4;

// Layer configurations with colors matching the requirements
const LAYER_CONFIGS: LayerConfig[] = [
  {
    id: 'hubzone-qct',
    type: 'qct',
    label: 'Qualified Census Tract',
    color: '#10B981',
    visible: true,
  },
  {
    id: 'hubzone-redesignated',
    type: 'redesignated',
    label: 'Redesignated Area',
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
    label: 'Base Closure Area (BRAC)',
    color: '#EF4444',
    visible: true,
  },
  {
    id: 'hubzone-nmc',
    type: 'nmc',
    label: 'Non-Metro County',
    color: '#3B82F6',
    visible: true,
  },
  {
    id: 'hubzone-dda',
    type: 'dda',
    label: 'Difficult Development Area',
    color: '#EC4899',
    visible: true,
  },
];

// Mapping from API type names to our layer types
const TYPE_MAPPING: Record<string, HubzoneType> = {
  qualified_census_tract: 'qct',
  qualified_non_metro_county: 'nmc',
  indian_lands: 'indian_lands',
  base_closure_area: 'brac',
  governor_designated: 'redesignated',
  redesignated: 'redesignated',
  dda: 'dda',
};

// ===== Helper Functions =====

function formatDate(dateStr: string | null): string {
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
}

function formatCurrency(amount: number | undefined): string {
  if (amount === undefined || amount === null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function getHubzoneTypeLabel(type: string): string {
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
}

function normalizeHubzoneType(type: string): HubzoneType {
  return TYPE_MAPPING[type] || (type as HubzoneType);
}

// ===== Component =====

const HUBZoneMap = forwardRef<HUBZoneMapRef, HUBZoneMapProps>(function HUBZoneMap(
  {
    centerLat = DEFAULT_CENTER[1],
    centerLng = DEFAULT_CENTER[0],
    zoom = DEFAULT_ZOOM,
    height = 'h-[600px]',
    onZoneClick,
    showLayerControls = true,
    showCoordinates = true,
    className = '',
    onLayersChange,
    onMapReady,
  },
  ref
) {
  // Refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const hoveredFeatureId = useRef<string | number | null>(null);

  // State
  const [isLoaded, setIsLoaded] = useState(false);
  const [coordinates, setCoordinates] = useState({
    lng: centerLng,
    lat: centerLat,
    zoom: zoom,
  });
  const [layers, setLayers] = useState<LayerConfig[]>(LAYER_CONFIGS);
   
  const [_selectedZone, setSelectedZone] = useState<HUBZoneFeatureProperties | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Set Mapbox access token
  if (MAPBOX_TOKEN) {
    mapboxgl.accessToken = MAPBOX_TOKEN;
  }

  /**
   * Fly to a specific location
   */
  const flyToLocation = useCallback((lng: number, lat: number, zoomLevel?: number) => {
    if (!map.current) return;
    map.current.flyTo({
      center: [lng, lat],
      zoom: zoomLevel || 14,
      duration: 1500,
      essential: true,
    });
  }, []);

  /**
   * Add a marker at a specific location
   */
  const addMarkerToMap = useCallback((lng: number, lat: number, options?: MarkerOptions) => {
    if (!map.current) return;

    // Remove existing marker
    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }

    // Create new marker
    const markerElement = document.createElement('div');
    markerElement.className = 'hubzone-marker';
    markerElement.innerHTML = `
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.164 0 0 7.164 0 16c0 12 16 24 16 24s16-12 16-24c0-8.836-7.164-16-16-16z" fill="${options?.color || '#0E4F8B'}"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `;
    markerElement.style.cursor = 'pointer';

    marker.current = new mapboxgl.Marker({
      element: markerElement,
      anchor: 'bottom',
    })
      .setLngLat([lng, lat])
      .addTo(map.current);

    // Add popup if requested
    if (options?.popup && options?.popupContent) {
      const markerPopup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false,
        className: 'hubzone-map-popup',
      }).setHTML(options.popupContent);

      marker.current.setPopup(markerPopup);
    }
  }, []);

  /**
   * Remove the current marker
   */
  const removeMarkerFromMap = useCallback(() => {
    if (marker.current) {
      marker.current.remove();
      marker.current = null;
    }
  }, []);

  /**
   * Toggle layer visibility
   */
  const toggleLayerVisibility = useCallback((layerId: string) => {
    if (!map.current || !isLoaded) return;

    setLayers((prev: LayerConfig[]) => {
      const newLayers = prev.map((layer: LayerConfig) => {
        if (layer.id === layerId) {
          const newVisibility = !layer.visible;
          const visibility = newVisibility ? 'visible' : 'none';

          map.current?.setLayoutProperty(`${layerId}-fill`, 'visibility', visibility);
          map.current?.setLayoutProperty(`${layerId}-stroke`, 'visibility', visibility);

          return { ...layer, visible: newVisibility };
        }
        return layer;
      });

      // Call onLayersChange callback
      if (onLayersChange) {
        onLayersChange(newLayers);
      }

      return newLayers;
    });
  }, [isLoaded, onLayersChange]);

  /**
   * Show all layers
   */
  const showAllLayersHandler = useCallback(() => {
    if (!map.current || !isLoaded) return;

    setLayers((prev: LayerConfig[]) => {
      const newLayers = prev.map((layer: LayerConfig) => {
        map.current?.setLayoutProperty(`${layer.id}-fill`, 'visibility', 'visible');
        map.current?.setLayoutProperty(`${layer.id}-stroke`, 'visibility', 'visible');
        return { ...layer, visible: true };
      });

      if (onLayersChange) {
        onLayersChange(newLayers);
      }

      return newLayers;
    });
  }, [isLoaded, onLayersChange]);

  /**
   * Hide all layers
   */
  const hideAllLayersHandler = useCallback(() => {
    if (!map.current || !isLoaded) return;

    setLayers((prev: LayerConfig[]) => {
      const newLayers = prev.map((layer: LayerConfig) => {
        map.current?.setLayoutProperty(`${layer.id}-fill`, 'visibility', 'none');
        map.current?.setLayoutProperty(`${layer.id}-stroke`, 'visibility', 'none');
        return { ...layer, visible: false };
      });

      if (onLayersChange) {
        onLayersChange(newLayers);
      }

      return newLayers;
    });
  }, [isLoaded, onLayersChange]);

  /**
   * Reset view to default
   */
  const resetViewHandler = useCallback(() => {
    if (!map.current) return;
    map.current.flyTo({
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      duration: 1500,
    });
  }, []);

  /**
   * Get current layers state
   */
  const getLayersState = useCallback(() => {
    return layers;
  }, [layers]);

  /**
   * Draw a radius circle on the map
   */
  const drawRadiusCircleOnMap = useCallback((lng: number, lat: number, radiusMiles: number) => {
    if (!map.current || !isLoaded) return;

    // Remove existing circle
    if (map.current.getLayer('radius-circle-fill')) {
      map.current.removeLayer('radius-circle-fill');
    }
    if (map.current.getLayer('radius-circle-stroke')) {
      map.current.removeLayer('radius-circle-stroke');
    }
    if (map.current.getSource('radius-circle')) {
      map.current.removeSource('radius-circle');
    }

    // Create circle GeoJSON (approximation using 64 points)
    const radiusKm = radiusMiles * 1.60934;
    const points = 64;
    const coordinates: number[][] = [];

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = radiusKm * Math.cos(angle);
      const dy = radiusKm * Math.sin(angle);

      // Convert to lat/lng (rough approximation)
      const dLng = dx / (111.32 * Math.cos((lat * Math.PI) / 180));
      const dLat = dy / 110.574;

      coordinates.push([lng + dLng, lat + dLat]);
    }
    coordinates.push(coordinates[0]); // Close the polygon

    // Add source
    map.current.addSource('radius-circle', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      },
    });

    // Add fill layer
    map.current.addLayer({
      id: 'radius-circle-fill',
      type: 'fill',
      source: 'radius-circle',
      paint: {
        'fill-color': '#0E4F8B',
        'fill-opacity': 0.1,
      },
    });

    // Add stroke layer
    map.current.addLayer({
      id: 'radius-circle-stroke',
      type: 'line',
      source: 'radius-circle',
      paint: {
        'line-color': '#0E4F8B',
        'line-width': 2,
        'line-dasharray': [3, 2],
      },
    });
  }, [isLoaded]);

  /**
   * Remove radius circle from map
   */
  const removeRadiusCircleFromMap = useCallback(() => {
    if (!map.current) return;

    if (map.current.getLayer('radius-circle-fill')) {
      map.current.removeLayer('radius-circle-fill');
    }
    if (map.current.getLayer('radius-circle-stroke')) {
      map.current.removeLayer('radius-circle-stroke');
    }
    if (map.current.getSource('radius-circle')) {
      map.current.removeSource('radius-circle');
    }
  }, []);

  /**
   * Get permalink URL for current map state
   */
  const getPermalinkUrl = useCallback(() => {
    if (!map.current) return window.location.href;

    const center = map.current.getCenter();
    const zoom = map.current.getZoom();
    const visibleLayers = layers
      .filter((l) => l.visible)
      .map((l) => l.id)
      .join(',');

    const params = new URLSearchParams();
    params.set('lat', center.lat.toFixed(4));
    params.set('lng', center.lng.toFixed(4));
    params.set('z', zoom.toFixed(1));
    if (visibleLayers) {
      params.set('layers', visibleLayers);
    }

    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?${params.toString()}`;
  }, [layers]);

  /**
   * Get map instance
   */
  const getMapInstance = useCallback(() => {
    return map.current;
  }, []);

  /**
   * Expose methods via ref
   */
  useImperativeHandle(ref, () => ({
    flyTo: flyToLocation,
    addMarker: addMarkerToMap,
    removeMarker: removeMarkerFromMap,
    toggleLayer: toggleLayerVisibility,
    showAllLayers: showAllLayersHandler,
    hideAllLayers: hideAllLayersHandler,
    getLayers: getLayersState,
    resetView: resetViewHandler,
    drawRadiusCircle: drawRadiusCircleOnMap,
    removeRadiusCircle: removeRadiusCircleFromMap,
    getPermalink: getPermalinkUrl,
    getMap: getMapInstance,
  }), [
    flyToLocation,
    addMarkerToMap,
    removeMarkerFromMap,
    toggleLayerVisibility,
    showAllLayersHandler,
    hideAllLayersHandler,
    getLayersState,
    resetViewHandler,
    drawRadiusCircleOnMap,
    removeRadiusCircleFromMap,
    getPermalinkUrl,
    getMapInstance,
  ]);

  /**
   * Create popup content HTML
   */
  const createPopupContent = useCallback((props: HUBZoneFeatureProperties): string => {
    const typeLabel = getHubzoneTypeLabel(props.hubzone_type);
    const typeColor = LAYER_CONFIGS.find(
      (l) => l.type === normalizeHubzoneType(props.hubzone_type)
    )?.color || '#6B7280';

    return `
      <div class="hubzone-popup" style="min-width: 280px; max-width: 320px;">
        <div style="border-bottom: 1px solid #E5E7EB; padding-bottom: 12px; margin-bottom: 12px;">
          <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin: 0 0 4px 0;">
            ${props.name || 'Census Tract'}
          </h3>
          <p style="font-size: 13px; color: #6B7280; margin: 0;">
            ${props.county || ''}, ${props.state || ''}
          </p>
        </div>
        
        <div style="display: grid; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span 
              style="width: 10px; height: 10px; border-radius: 2px; background: ${typeColor}; flex-shrink: 0;"
            ></span>
            <span style="font-size: 13px; font-weight: 500; color: #374151;">
              ${typeLabel}
            </span>
            ${props.is_redesignated ? `
              <span style="
                background: #FEF3C7; 
                color: #92400E; 
                font-size: 11px; 
                padding: 2px 6px; 
                border-radius: 9999px;
                font-weight: 500;
              ">Redesignated</span>
            ` : ''}
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
            <div>
              <span style="color: #6B7280;">Census Tract:</span>
              <span style="font-weight: 500; color: #111827; display: block;">
                ${props.census_tract || 'N/A'}
              </span>
            </div>
            <div>
              <span style="color: #6B7280;">Status:</span>
              <span style="
                font-weight: 500; 
                display: block;
                color: ${props.status === 'active' ? '#059669' : props.status === 'redesignated' ? '#D97706' : '#6B7280'};
              ">
                ${props.status ? props.status.charAt(0).toUpperCase() + props.status.slice(1) : 'N/A'}
              </span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">
            <div>
              <span style="color: #6B7280;">Designated:</span>
              <span style="font-weight: 500; color: #111827; display: block;">
                ${formatDate(props.designation_date)}
              </span>
            </div>
            <div>
              <span style="color: #6B7280;">Expires:</span>
              <span style="font-weight: 500; color: #111827; display: block;">
                ${formatDate(props.expiration_date)}
              </span>
            </div>
          </div>

          ${props.poverty_rate !== undefined || props.median_income !== undefined ? `
            <div style="
              background: #F9FAFB; 
              padding: 8px; 
              border-radius: 6px; 
              margin-top: 4px;
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 8px; 
              font-size: 13px;
            ">
              <div>
                <span style="color: #6B7280;">Poverty Rate:</span>
                <span style="font-weight: 600; color: #111827; display: block;">
                  ${formatPercentage(props.poverty_rate)}
                </span>
              </div>
              <div>
                <span style="color: #6B7280;">Median Income:</span>
                <span style="font-weight: 600; color: #111827; display: block;">
                  ${formatCurrency(props.median_income)}
                </span>
              </div>
            </div>
          ` : ''}

          ${props.grace_period_end_date ? `
            <div style="
              background: #FEF3C7; 
              padding: 8px; 
              border-radius: 6px; 
              font-size: 12px;
              color: #92400E;
            ">
              <strong>Grace Period:</strong> Ends ${formatDate(props.grace_period_end_date)}
            </div>
          ` : ''}
        </div>

        <button 
          onclick="window.dispatchEvent(new CustomEvent('hubzone-view-details', { detail: '${props.census_tract}' }))"
          style="
            width: 100%;
            margin-top: 12px;
            padding: 8px 16px;
            background: #0E4F8B;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s;
          "
          onmouseover="this.style.background='#0D4276'"
          onmouseout="this.style.background='#0E4F8B'"
        >
          View Details
        </button>
      </div>
    `;
  }, []);

  /**
   * Add vector tile source and layers to map
   */
  const addSourceAndLayers = useCallback((mapInstance: mapboxgl.Map) => {
    // Add vector tile source
    mapInstance.addSource('hubzones', {
      type: 'vector',
      tiles: [window.location.origin + TILE_URL],
      minzoom: 0,
      maxzoom: 14,
    });

    // Add fill and line layers for each HUBZone type
    LAYER_CONFIGS.forEach((config) => {
      const filterType = config.type === 'qct' 
        ? ['any', ['==', ['get', 'hubzone_type'], 'qct'], ['==', ['get', 'hubzone_type'], 'qualified_census_tract']]
        : config.type === 'nmc'
        ? ['any', ['==', ['get', 'hubzone_type'], 'nmc'], ['==', ['get', 'hubzone_type'], 'qualified_non_metro_county']]
        : config.type === 'brac'
        ? ['any', ['==', ['get', 'hubzone_type'], 'brac'], ['==', ['get', 'hubzone_type'], 'base_closure_area']]
        : config.type === 'redesignated'
        ? ['any', ['==', ['get', 'hubzone_type'], 'redesignated'], ['==', ['get', 'hubzone_type'], 'governor_designated']]
        : ['==', ['get', 'hubzone_type'], config.type];

      // Fill layer
      mapInstance.addLayer({
        id: `${config.id}-fill`,
        type: 'fill',
        source: 'hubzones',
        'source-layer': 'hubzone_designations',
        filter: filterType,
        paint: {
          'fill-color': config.color,
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.6,
            0.4,
          ],
        },
        layout: {
          visibility: config.visible ? 'visible' : 'none',
        },
      });

      // Stroke layer
      mapInstance.addLayer({
        id: `${config.id}-stroke`,
        type: 'line',
        source: 'hubzones',
        'source-layer': 'hubzone_designations',
        filter: filterType,
        paint: {
          'line-color': config.color,
          'line-opacity': 0.8,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            4, 0.5,
            8, 1,
            12, 2,
          ],
        },
        layout: {
          visibility: config.visible ? 'visible' : 'none',
        },
      });
    });
  }, []);

  /**
   * Setup event handlers for interactivity
   */
  const setupEventHandlers = useCallback((mapInstance: mapboxgl.Map) => {
    // Get all fill layer IDs
    const fillLayerIds = LAYER_CONFIGS.map((c) => `${c.id}-fill`);

    // Mouse move handler for hover effects
    mapInstance.on('mousemove', (e: mapboxgl.MapMouseEvent) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: fillLayerIds,
      });

      // Change cursor
      mapInstance.getCanvas().style.cursor = features.length > 0 ? 'pointer' : '';

      // Handle hover state
      if (features.length > 0) {
        const feature = features[0];
        if (feature && feature.id !== undefined) {
          // Clear previous hover
          if (hoveredFeatureId.current !== null && hoveredFeatureId.current !== feature.id) {
            mapInstance.setFeatureState(
              {
                source: 'hubzones',
                sourceLayer: 'hubzone_designations',
                id: hoveredFeatureId.current,
              },
              { hover: false }
            );
          }

          // Set new hover
          hoveredFeatureId.current = feature.id;
          mapInstance.setFeatureState(
            {
              source: 'hubzones',
              sourceLayer: 'hubzone_designations',
              id: feature.id,
            },
            { hover: true }
          );
        }
      } else {
        // Clear hover when not over any feature
        if (hoveredFeatureId.current !== null) {
          mapInstance.setFeatureState(
            {
              source: 'hubzones',
              sourceLayer: 'hubzone_designations',
              id: hoveredFeatureId.current,
            },
            { hover: false }
          );
          hoveredFeatureId.current = null;
        }
      }
    });

    // Mouse leave handler
    mapInstance.on('mouseleave', () => {
      mapInstance.getCanvas().style.cursor = '';
      if (hoveredFeatureId.current !== null) {
        mapInstance.setFeatureState(
          {
            source: 'hubzones',
            sourceLayer: 'hubzone_designations',
            id: hoveredFeatureId.current,
          },
          { hover: false }
        );
        hoveredFeatureId.current = null;
      }
    });

    // Click handler for popups
    mapInstance.on('click', (e: mapboxgl.MapMouseEvent) => {
      const features = mapInstance.queryRenderedFeatures(e.point, {
        layers: fillLayerIds,
      });

      if (features.length > 0) {
        const feature = features[0];
        if (feature && feature.properties) {
          const properties = feature.properties as HUBZoneFeatureProperties;
          
          // Update selected zone state
          setSelectedZone(properties);

          // Call external callback if provided
          if (onZoneClick) {
            onZoneClick(properties);
          }

          // Close existing popup
          if (popup.current) {
            popup.current.remove();
          }

          // Create new popup
          popup.current = new mapboxgl.Popup({
            closeButton: true,
            closeOnClick: true,
            maxWidth: '340px',
            className: 'hubzone-map-popup',
          })
            .setLngLat(e.lngLat)
            .setHTML(createPopupContent(properties))
            .addTo(mapInstance);
        }
      }
    });

    // Track map movement
    mapInstance.on('move', () => {
      const center = mapInstance.getCenter();
      setCoordinates({
        lng: parseFloat(center.lng.toFixed(4)),
        lat: parseFloat(center.lat.toFixed(4)),
        zoom: parseFloat(mapInstance.getZoom().toFixed(2)),
      });
    });
  }, [createPopupContent, onZoneClick]);

  /**
   * Initialize map
   */
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Check for access token
    if (!MAPBOX_TOKEN) {
      setError('Mapbox access token not configured. Set VITE_MAPBOX_ACCESS_TOKEN in your environment.');
      return;
    }

    try {
      // Create map instance
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [centerLng, centerLat],
        zoom: zoom,
        attributionControl: true,
        // Touch-friendly settings for mobile
        touchZoomRotate: true,
        touchPitch: true,
        dragRotate: false,
      });

      // Add navigation controls (zoom, rotation)
      map.current.addControl(
        new mapboxgl.NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: false,
        }),
        'top-right'
      );

      // Add scale control
      map.current.addControl(
        new mapboxgl.ScaleControl({
          maxWidth: 150,
          unit: 'imperial',
        }),
        'bottom-left'
      );

      // Add fullscreen control
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

      // Add geolocate control for mobile
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: false,
          showUserHeading: false,
        }),
        'top-right'
      );

      // Handle map load
      map.current.on('load', () => {
        if (!map.current) return;

        addSourceAndLayers(map.current);
        setupEventHandlers(map.current);
        setIsLoaded(true);
        
        // Notify parent that map is ready
        if (onMapReady) {
          onMapReady();
        }
      });

      // Handle errors
      map.current.on('error', (e: mapboxgl.ErrorEvent) => {
        console.error('Mapbox error:', e);
        setError('Error loading map. Please try again.');
      });
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map.');
    }

    // Cleanup
    return () => {
      if (popup.current) {
        popup.current.remove();
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [centerLat, centerLng, zoom, addSourceAndLayers, setupEventHandlers]);

  // Use the handlers defined above for internal layer control
  const toggleLayer = toggleLayerVisibility;
  const resetView = resetViewHandler;
  const showAllLayers = showAllLayersHandler;
  const hideAllLayers = hideAllLayersHandler;

  // Render error state
  if (error) {
    return (
      <div className={`${height} ${className} relative`}>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-xl">
          <div className="text-center p-8 max-w-md">
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Map Error</h3>
            <p className="text-gray-600 text-sm">{error}</p>
            <p className="text-gray-500 text-xs mt-2">
              Add <code className="bg-gray-200 px-1 py-0.5 rounded">VITE_MAPBOX_ACCESS_TOKEN</code> to
              your .env file
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div className={`${height} rounded-xl overflow-hidden shadow-lg relative`}>
        <div ref={mapContainer} className="w-full h-full" />

        {/* Loading overlay */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-hubzone-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Loading map...</p>
            </div>
          </div>
        )}

        {/* Coordinates Display */}
        {showCoordinates && isLoaded && (
          <div className="absolute bottom-8 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md text-xs font-mono text-gray-700 z-10">
            <span>
              {coordinates.lat.toFixed(4)}°, {coordinates.lng.toFixed(4)}° | Z{coordinates.zoom}
            </span>
          </div>
        )}

        {/* Reset View Button */}
        {isLoaded && (
          <button
            onClick={resetView}
            className="absolute bottom-8 left-4 bg-white rounded-lg px-3 py-2 shadow-md hover:bg-gray-50 transition-colors z-10 text-sm font-medium text-gray-700 flex items-center gap-2"
            title="Reset to default view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="hidden sm:inline">Reset View</span>
          </button>
        )}
      </div>

      {/* Layer Controls */}
      {showLayerControls && isLoaded && (
        <div className="mt-4 bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">HUBZone Layers</h3>
            <div className="flex gap-2">
              <button
                onClick={showAllLayers}
                className="text-xs text-hubzone-600 hover:text-hubzone-700 font-medium"
              >
                Show All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={hideAllLayers}
                className="text-xs text-hubzone-600 hover:text-hubzone-700 font-medium"
              >
                Hide All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {layers.map((layer: LayerConfig) => (
              <label
                key={layer.id}
                className="flex items-center gap-2 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={layer.visible}
                  onChange={() => toggleLayer(layer.id)}
                  className="w-4 h-4 rounded border-gray-300 text-hubzone-600 focus:ring-hubzone-500 focus:ring-offset-0 transition-colors"
                />
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="text-xs text-gray-700 group-hover:text-gray-900 truncate">
                  {layer.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 bg-white rounded-xl shadow-md p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Legend & Instructions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {LAYER_CONFIGS.map((config) => (
            <div key={config.id} className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded-sm border border-gray-200"
                style={{
                  backgroundColor: config.color,
                  opacity: 0.4,
                }}
              />
              <span
                className="w-4 h-0.5 -ml-2"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-gray-700 text-xs ml-1">{config.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
          <p>• Click on a zone to view detailed information</p>
          <p>• Use scroll or pinch to zoom in/out</p>
          <p>• Drag to pan the map</p>
        </div>
      </div>
    </div>
  );
});

export default HUBZoneMap;

