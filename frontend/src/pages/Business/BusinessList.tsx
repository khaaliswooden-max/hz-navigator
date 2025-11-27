import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CertificationStatus } from '../../components/Business/CertificationStatus';
import businessService from '../../services/businessService';
import type { BusinessListItem, BusinessFilters, BusinessCertificationStatus } from '../../types/business';
import type { Pagination } from '../../types';

const statusOptions: { value: BusinessCertificationStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'expired', label: 'Expired' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const usStates = [
  { value: '', label: 'All States' },
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' }, { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' }, { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' }, { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' }, { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' }, { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' }, { value: 'PR', label: 'Puerto Rico' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'VI', label: 'Virgin Islands' }, { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' }, { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const PAGE_SIZES = [10, 25, 50, 100];

export default function BusinessList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [businesses, setBusinesses] = useState<BusinessListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states from URL params
  const filters: BusinessFilters = useMemo(() => ({
    status: (searchParams.get('status') as BusinessCertificationStatus) || undefined,
    state: searchParams.get('state') || undefined,
    search: searchParams.get('search') || undefined,
    certificationDateFrom: searchParams.get('dateFrom') || undefined,
    certificationDateTo: searchParams.get('dateTo') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
  }), [searchParams]);
  
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Fetch businesses
  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await businessService.getBusinesses(filters);
      setBusinesses(response.data);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load businesses');
      setBusinesses([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        updateFilters({ search: searchInput || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update URL params with filters
  const updateFilters = (newFilters: Partial<BusinessFilters>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 1) {
        params.delete(key === 'certificationDateFrom' ? 'dateFrom' : 
                     key === 'certificationDateTo' ? 'dateTo' : key);
      } else {
        params.set(
          key === 'certificationDateFrom' ? 'dateFrom' : 
          key === 'certificationDateTo' ? 'dateTo' : key,
          String(value)
        );
      }
    });
    
    setSearchParams(params);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  // Handle row click
  const handleRowClick = (businessId: string) => {
    navigate(`/businesses/${businessId}`);
  };

  // Pagination controls
  const goToPage = (page: number) => {
    updateFilters({ page });
  };

  // Check if any filters are active
  const hasActiveFilters = filters.status || filters.state || filters.search || 
    filters.certificationDateFrom || filters.certificationDateTo;

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Businesses
          </h1>
          <p className="text-gray-500 mt-1">
            Manage and review registered businesses
          </p>
        </div>
        <Link
          to="/businesses/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Business
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          {/* Search */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                id="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or UEI..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-48">
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="statusFilter"
              value={filters.status || ''}
              onChange={(e) => updateFilters({ status: e.target.value as BusinessCertificationStatus || undefined, page: 1 })}
              className="w-full py-2.5 px-3 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 bg-white transition-colors"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* State Filter */}
          <div className="w-full lg:w-48">
            <label htmlFor="stateFilter" className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              id="stateFilter"
              value={filters.state || ''}
              onChange={(e) => updateFilters({ state: e.target.value || undefined, page: 1 })}
              className="w-full py-2.5 px-3 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 bg-white transition-colors"
            >
              {usStates.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex gap-2">
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Certified From
              </label>
              <input
                type="date"
                id="dateFrom"
                value={filters.certificationDateFrom || ''}
                onChange={(e) => updateFilters({ certificationDateFrom: e.target.value || undefined, page: 1 })}
                className="w-full py-2.5 px-3 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <input
                type="date"
                id="dateTo"
                value={filters.certificationDateTo || ''}
                onChange={(e) => updateFilters({ certificationDateTo: e.target.value || undefined, page: 1 })}
                className="w-full py-2.5 px-3 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {pagination.total > 0 ? (
              <>
                Showing <span className="font-medium text-gray-700">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                <span className="font-medium text-gray-700">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-medium text-gray-700">{pagination.total.toLocaleString()}</span> businesses
              </>
            ) : (
              'No businesses found'
            )}
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="pageSize" className="text-sm text-gray-500">Show:</label>
            <select
              id="pageSize"
              value={filters.limit || 10}
              onChange={(e) => updateFilters({ limit: parseInt(e.target.value), page: 1 })}
              className="py-1.5 px-2 text-sm rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 bg-white"
            >
              {PAGE_SIZES.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/6" />
                  <div className="h-4 bg-gray-200 rounded w-1/6" />
                  <div className="h-4 bg-gray-200 rounded w-1/6" />
                  <div className="h-4 bg-gray-200 rounded w-1/6" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Error Loading Businesses</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchBusinesses}
              className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
            >
              Try again →
            </button>
          </div>
        ) : businesses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No Businesses Found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {hasActiveFilters 
                ? 'Try adjusting your filters or search terms'
                : 'No businesses have been registered yet'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Business Name
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    UEI
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Certified Date
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {businesses.map((business) => (
                  <tr
                    key={business.id}
                    onClick={() => handleRowClick(business.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{business.legalName}</p>
                        {business.dbaName && (
                          <p className="text-sm text-gray-500">DBA: {business.dbaName}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600">{business.ueiNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600">{business.state}</span>
                    </td>
                    <td className="px-6 py-4">
                      <CertificationStatus status={business.certificationStatus} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{formatDate(business.certificationDate)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{formatDate(business.expirationDate)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="flex items-center gap-1">
            {/* Page numbers */}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(page => 
                page === 1 || 
                page === pagination.totalPages || 
                Math.abs(page - pagination.page) <= 1
              )
              .map((page, idx, arr) => (
                <span key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="px-2 text-gray-400">...</span>
                  )}
                  <button
                    onClick={() => goToPage(page)}
                    className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                      page === pagination.page
                        ? 'bg-hubzone-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                </span>
              ))}
          </div>

          <button
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export { BusinessList };

