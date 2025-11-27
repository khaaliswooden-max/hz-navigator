/**
 * Export Modal Component
 *
 * Modal for exporting HUBZone data in various formats
 */

import { useState, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';

// ===== Types =====

export interface ExportOptions {
  format: 'geojson' | 'csv';
  state?: string;
  county?: string;
  zoneTypes?: string[];
}

export interface ExportModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when export is submitted */
  onExport: (options: ExportOptions) => Promise<void>;
}

interface StateOption {
  state: string;
  tractCount: number;
}

interface CountyOption {
  county: string;
  tractCount: number;
}

// ===== Zone Types =====

const ZONE_TYPES = [
  { id: 'qualified_census_tract', label: 'Qualified Census Tracts' },
  { id: 'qualified_non_metro_county', label: 'Non-Metro Counties' },
  { id: 'indian_lands', label: 'Indian Lands' },
  { id: 'base_closure_area', label: 'Base Closure Areas' },
  { id: 'redesignated', label: 'Redesignated Areas' },
];

// ===== Component =====

function ExportModal({ isOpen, onClose, onExport }: ExportModalProps) {
  // State
  const [format, setFormat] = useState<'geojson' | 'csv'>('geojson');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCounty, setSelectedCounty] = useState<string>('');
  const [selectedZoneTypes, setSelectedZoneTypes] = useState<string[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [counties, setCounties] = useState<CountyOption[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingCounties, setIsLoadingCounties] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch states list
   */
  useEffect(() => {
    if (!isOpen) return;

    const fetchStates = async () => {
      setIsLoadingStates(true);
      try {
        const response = await fetch('/api/v1/hubzone/states');
        if (response.ok) {
          const data = await response.json();
          setStates(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch states:', err);
        // Mock data for demo
        setStates([
          { state: 'California', tractCount: 1200 },
          { state: 'Texas', tractCount: 980 },
          { state: 'Florida', tractCount: 750 },
          { state: 'New York', tractCount: 680 },
          { state: 'Pennsylvania', tractCount: 520 },
        ]);
      } finally {
        setIsLoadingStates(false);
      }
    };

    fetchStates();
  }, [isOpen]);

  /**
   * Fetch counties for selected state
   */
  useEffect(() => {
    if (!selectedState) {
      setCounties([]);
      setSelectedCounty('');
      return;
    }

    const fetchCounties = async () => {
      setIsLoadingCounties(true);
      try {
        const response = await fetch(`/api/v1/hubzone/counties/${encodeURIComponent(selectedState)}`);
        if (response.ok) {
          const data = await response.json();
          setCounties(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch counties:', err);
        setCounties([]);
      } finally {
        setIsLoadingCounties(false);
      }
    };

    fetchCounties();
  }, [selectedState]);

  /**
   * Handle zone type toggle
   */
  const toggleZoneType = useCallback((typeId: string) => {
    setSelectedZoneTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  }, []);

  /**
   * Handle export
   */
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      await onExport({
        format,
        state: selectedState || undefined,
        county: selectedCounty || undefined,
        zoneTypes: selectedZoneTypes.length > 0 ? selectedZoneTypes : undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [format, selectedState, selectedCounty, selectedZoneTypes, onExport, onClose]);

  /**
   * Reset form when modal closes
   */
  useEffect(() => {
    if (!isOpen) {
      setFormat('geojson');
      setSelectedState('');
      setSelectedCounty('');
      setSelectedZoneTypes([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-hubzone-100 rounded-lg flex items-center justify-center">
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Export HUBZone Data</h2>
                <p className="text-xs text-gray-500">Download data for analysis</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
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

          {/* Body */}
          <div className="p-4 space-y-4">
            {/* Format Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat('geojson')}
                  className={clsx(
                    'p-3 rounded-lg border-2 transition-all text-left',
                    format === 'geojson'
                      ? 'border-hubzone-500 bg-hubzone-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={clsx(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                        format === 'geojson' ? 'border-hubzone-500' : 'border-gray-300'
                      )}
                    >
                      {format === 'geojson' && (
                        <div className="w-2 h-2 rounded-full bg-hubzone-500" />
                      )}
                    </div>
                    <span className="font-medium text-gray-900">GeoJSON</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Includes geometry data for mapping
                  </p>
                </button>

                <button
                  onClick={() => setFormat('csv')}
                  className={clsx(
                    'p-3 rounded-lg border-2 transition-all text-left',
                    format === 'csv'
                      ? 'border-hubzone-500 bg-hubzone-50'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={clsx(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                        format === 'csv' ? 'border-hubzone-500' : 'border-gray-300'
                      )}
                    >
                      {format === 'csv' && (
                        <div className="w-2 h-2 rounded-full bg-hubzone-500" />
                      )}
                    </div>
                    <span className="font-medium text-gray-900">CSV</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    Spreadsheet compatible format
                  </p>
                </button>
              </div>
            </div>

            {/* Region Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Region Filter <span className="text-gray-400 font-normal">(optional)</span>
              </label>

              {/* State Selector */}
              <div className="space-y-2">
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  disabled={isLoadingStates}
                  className="input text-sm"
                >
                  <option value="">All States</option>
                  {states.map((s) => (
                    <option key={s.state} value={s.state}>
                      {s.state} ({s.tractCount.toLocaleString()} tracts)
                    </option>
                  ))}
                </select>

                {/* County Selector */}
                {selectedState && (
                  <select
                    value={selectedCounty}
                    onChange={(e) => setSelectedCounty(e.target.value)}
                    disabled={isLoadingCounties}
                    className="input text-sm"
                  >
                    <option value="">All Counties in {selectedState}</option>
                    {counties.map((c) => (
                      <option key={c.county} value={c.county}>
                        {c.county} ({c.tractCount.toLocaleString()} tracts)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Zone Type Filter */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Zone Types <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <div className="space-y-2">
                {ZONE_TYPES.map((type) => (
                  <label
                    key={type.id}
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedZoneTypes.includes(type.id)}
                      onChange={() => toggleZoneType(type.id)}
                      className="w-4 h-4 rounded border-gray-300 text-hubzone-600 focus:ring-hubzone-500"
                    />
                    <span className="text-sm text-gray-700">{type.label}</span>
                  </label>
                ))}
              </div>
              {selectedZoneTypes.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to export all zone types
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="btn-ghost text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={clsx(
                'btn-primary text-sm min-w-[120px]',
                isExporting && 'opacity-75'
              )}
            >
              {isExporting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                  Exporting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
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
                  Export {format.toUpperCase()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;

