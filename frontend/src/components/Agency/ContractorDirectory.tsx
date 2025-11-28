import { useState, useCallback, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  MapPin,
  Table,
  ChevronUp,
  ChevronDown,
  Building2,
  FileCheck,
  AlertTriangle,
  ExternalLink,
  X,
} from 'lucide-react';
import type {
  ContractorDirectoryEntry,
  ContractorDirectoryFilters,
} from '../../types/analytics';
import { US_STATES } from '../../types/analytics';
import { analyticsService, formatCurrency, getDefaultAgencyId } from '../../services/analyticsService';

interface ContractorDirectoryProps {
  onSelectContractor?: (contractor: ContractorDirectoryEntry) => void;
  showMapToggle?: boolean;
  defaultView?: 'table' | 'map';
}

const CERTIFICATION_STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'expired', label: 'Expired' },
  { value: 'denied', label: 'Denied' },
];

const RISK_LEVELS = [
  { value: '', label: 'All Risk Levels' },
  { value: 'low', label: 'Low Risk' },
  { value: 'medium', label: 'Medium Risk' },
  { value: 'high', label: 'High Risk' },
  { value: 'critical', label: 'Critical' },
];

export function ContractorDirectory({
  onSelectContractor,
  showMapToggle = true,
  defaultView = 'table',
}: ContractorDirectoryProps): JSX.Element {
  const [contractors, setContractors] = useState<ContractorDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'map'>(defaultView);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<ContractorDirectoryEntry | null>(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 25;
  
  // Filters
  const [filters, setFilters] = useState<ContractorDirectoryFilters>({
    search: '',
    state: '',
    certificationStatus: '',
    riskLevel: undefined,
    sortBy: 'businessName',
    sortOrder: 'asc',
  });

  // Debounced search
  const [searchInput, setSearchInput] = useState('');

  const fetchContractors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsService.getContractorDirectory({
        ...filters,
        page,
        limit,
      });
      setContractors(result.contractors);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.total);
    } catch (err) {
      setError('Failed to load contractor directory');
      console.error('Error loading contractors:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchInput }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (column: ContractorDirectoryFilters['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleExport = async () => {
    try {
      const blob = await analyticsService.exportContractorDirectory(getDefaultAgencyId(), 'csv');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contractor-directory-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting directory:', err);
    }
  };

  const handleSelectContractor = (contractor: ContractorDirectoryEntry) => {
    setSelectedContractor(contractor);
    onSelectContractor?.(contractor);
  };

  const renderSortIcon = (column: ContractorDirectoryFilters['sortBy']) => {
    if (filters.sortBy !== column) return null;
    return filters.sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const getRiskBadgeClass = (risk: string) => {
    const classes: Record<string, string> = {
      low: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return classes[risk] ?? classes.low;
  };

  const getStatusBadgeClass = (status: string) => {
    const classes: Record<string, string> = {
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
      pending: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      under_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-400',
      denied: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return classes[status] ?? classes.pending;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            Contractor Directory
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {total.toLocaleString()} HUBZone contractors found
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showMapToggle && (
            <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  viewMode === 'table'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Table className="w-4 h-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${
                  viewMode === 'map'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <MapPin className="w-4 h-4" />
                Map
              </button>
            </div>
          )}
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, UEI, or DBA..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg border transition-colors flex items-center gap-2 ${
              showFilters
                ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {(filters.state || filters.certificationStatus || filters.riskLevel) && (
              <span className="bg-teal-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {[filters.state, filters.certificationStatus, filters.riskLevel].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State
              </label>
              <select
                value={filters.state ?? ''}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, state: e.target.value }));
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All States</option>
                {US_STATES.map((state) => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Certification Status
              </label>
              <select
                value={filters.certificationStatus ?? ''}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, certificationStatus: e.target.value }));
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {CERTIFICATION_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Risk Level
              </label>
              <select
                value={filters.riskLevel ?? ''}
                onChange={(e) => {
                  setFilters(prev => ({ 
                    ...prev, 
                    riskLevel: e.target.value ? e.target.value as any : undefined 
                  }));
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {RISK_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchContractors}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-teal-600 dark:hover:text-teal-400"
                    onClick={() => handleSort('businessName')}
                  >
                    <div className="flex items-center gap-1">
                      Business Name
                      {renderSortIcon('businessName')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    UEI
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-teal-600 dark:hover:text-teal-400"
                    onClick={() => handleSort('state')}
                  >
                    <div className="flex items-center gap-1">
                      Location
                      {renderSortIcon('state')}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    NAICS
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-teal-600 dark:hover:text-teal-400"
                    onClick={() => handleSort('riskLevel')}
                  >
                    <div className="flex items-center gap-1">
                      Risk
                      {renderSortIcon('riskLevel')}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-teal-600 dark:hover:text-teal-400"
                    onClick={() => handleSort('contractValue')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      Contract Value
                      {renderSortIcon('contractValue')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto"></div>
                      </td>
                    </tr>
                  ))
                ) : contractors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No contractors found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Try adjusting your search or filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  contractors.map((contractor) => (
                    <tr
                      key={contractor.businessId}
                      onClick={() => handleSelectContractor(contractor)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {contractor.businessName}
                          </p>
                          {contractor.dbaName && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              DBA: {contractor.dbaName}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <code className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded">
                          {contractor.ueiNumber}
                        </code>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {contractor.city}, {contractor.state}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {contractor.naicsCodes[0]?.code ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(contractor.certificationStatus)}`}>
                          <FileCheck className="w-3 h-3" />
                          {contractor.certificationStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRiskBadgeClass(contractor.riskLevel)}`}>
                          {contractor.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(contractor.totalContractValue)}
                        </span>
                        {contractor.contractCount > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {contractor.contractCount} contract{contractor.contractCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total.toLocaleString()} contractors
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Map View */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="h-[500px] bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Map view showing {total.toLocaleString()} contractor locations
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Interactive map integration available
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contractor Detail Modal */}
      {selectedContractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Contractor Details
              </h3>
              <button
                onClick={() => setSelectedContractor(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Business Info */}
              <div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedContractor.businessName}
                </h4>
                {selectedContractor.dbaName && (
                  <p className="text-gray-500 dark:text-gray-400">
                    DBA: {selectedContractor.dbaName}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">UEI Number</p>
                  <p className="font-mono text-gray-900 dark:text-white">{selectedContractor.ueiNumber}</p>
                </div>
                {selectedContractor.cageCode && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">CAGE Code</p>
                    <p className="font-mono text-gray-900 dark:text-white">{selectedContractor.cageCode}</p>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  Location
                </h5>
                <p className="text-gray-700 dark:text-gray-300">{selectedContractor.address}</p>
                <p className="text-gray-700 dark:text-gray-300">
                  {selectedContractor.city}, {selectedContractor.state}
                </p>
              </div>

              {/* NAICS Codes */}
              {selectedContractor.naicsCodes.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2">NAICS Codes</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedContractor.naicsCodes.map((naics, i) => (
                      <span
                        key={i}
                        className={`px-2.5 py-1 rounded-full text-sm ${
                          naics.isPrimary
                            ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {naics.code}
                        {naics.isPrimary && ' (Primary)'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Certification & Compliance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Certification Status</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(selectedContractor.certificationStatus)}`}>
                    <FileCheck className="w-3 h-3" />
                    {selectedContractor.certificationStatus.replace('_', ' ')}
                  </span>
                  {selectedContractor.expirationDate && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Expires: {new Date(selectedContractor.expirationDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Risk Assessment</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${getRiskBadgeClass(selectedContractor.riskLevel)}`}>
                    {selectedContractor.riskLevel}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Compliance Score: {selectedContractor.complianceScore}/100
                  </p>
                </div>
              </div>

              {/* Contract History */}
              <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4">
                <h5 className="font-medium text-teal-900 dark:text-teal-400 mb-2">Contract History</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                      {selectedContractor.contractCount}
                    </p>
                    <p className="text-sm text-teal-600 dark:text-teal-400">Total Contracts</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                      {formatCurrency(selectedContractor.totalContractValue)}
                    </p>
                    <p className="text-sm text-teal-600 dark:text-teal-400">Total Value</p>
                  </div>
                </div>
                {selectedContractor.lastAwardDate && (
                  <p className="text-sm text-teal-600 dark:text-teal-400 mt-2">
                    Last Award: {new Date(selectedContractor.lastAwardDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  Verify Contractor
                </button>
                <button className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View in SAM.gov
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractorDirectory;

