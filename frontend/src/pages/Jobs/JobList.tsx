import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { JobCard } from '../../components/Jobs/JobCard';
import jobService from '../../services/jobService';
import type { JobListItem, JobFilters, EmploymentType } from '../../types/job';
import { EMPLOYMENT_TYPE_OPTIONS } from '../../types/job';
import { useAuth } from '../../hooks/useAuth';

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

const SALARY_PRESETS = [
  { label: 'Any', min: 0, max: 0 },
  { label: '$30k - $50k', min: 30000, max: 50000 },
  { label: '$50k - $75k', min: 50000, max: 75000 },
  { label: '$75k - $100k', min: 75000, max: 100000 },
  { label: '$100k - $150k', min: 100000, max: 150000 },
  { label: '$150k+', min: 150000, max: 0 },
];

export default function JobList() {
  const { user } = useAuth();
  const isProfessional = user?.role === 'professional';

  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [hubzoneOnly, setHubzoneOnly] = useState(false);
  const [selectedEmploymentTypes, setSelectedEmploymentTypes] = useState<EmploymentType[]>([]);
  const [selectedState, setSelectedState] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [salaryPreset, setSalaryPreset] = useState(0);
  const [isRemote, setIsRemote] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'date' | 'salary' | 'match_score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Mobile filters
  const [showFilters, setShowFilters] = useState(false);

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const filters: JobFilters = {
      search: search || undefined,
      hubzoneOnly: hubzoneOnly || undefined,
      employmentType: selectedEmploymentTypes.length > 0 ? selectedEmploymentTypes : undefined,
      salaryMin: SALARY_PRESETS[salaryPreset].min || undefined,
      salaryMax: SALARY_PRESETS[salaryPreset].max || undefined,
      location: {
        state: selectedState || undefined,
        city: cityInput || undefined,
      },
      isRemote,
      sortBy,
      sortOrder,
      page,
      limit: 12,
    };

    try {
      const response = await jobService.getJobs(filters);
      if (response.success && response.data) {
        setJobs(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalJobs(response.data.pagination.total);
      } else {
        setError(response.error?.message || 'Failed to load jobs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [search, hubzoneOnly, selectedEmploymentTypes, selectedState, cityInput, salaryPreset, isRemote, sortBy, sortOrder, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleEmploymentTypeToggle = (type: EmploymentType) => {
    setSelectedEmploymentTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
    setPage(1);
  };

  const handleSaveJob = async (jobId: string) => {
    if (savedJobs.has(jobId)) {
      await jobService.unsaveJob(jobId);
      setSavedJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    } else {
      await jobService.saveJob(jobId);
      setSavedJobs((prev) => new Set(prev).add(jobId));
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setHubzoneOnly(false);
    setSelectedEmploymentTypes([]);
    setSelectedState('');
    setCityInput('');
    setSalaryPreset(0);
    setIsRemote(undefined);
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = search || hubzoneOnly || selectedEmploymentTypes.length > 0 || 
    selectedState || cityInput || salaryPreset > 0 || isRemote !== undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Job Opportunities
          </h1>
          <p className="text-gray-500 mt-1">
            Find HUBZone job opportunities that match your skills
          </p>
        </div>
        {user?.role === 'business_owner' && (
          <Link
            to="/jobs/post"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-hubzone-600 text-white font-medium rounded-xl hover:bg-hubzone-700 transition-colors shadow-lg shadow-hubzone-500/25"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Post a Job
          </Link>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search jobs by title, company, or keywords..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
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
          </form>

          {/* Quick Filters */}
          <div className="flex items-center gap-3">
            {/* HUBZone Toggle */}
            <button
              onClick={() => {
                setHubzoneOnly(!hubzoneOnly);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border font-medium transition-colors ${
                hubzoneOnly
                  ? 'bg-hubzone-100 border-hubzone-500 text-hubzone-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="hidden sm:inline">HUBZone Only</span>
            </button>

            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('-') as ['date' | 'salary' | 'match_score', 'asc' | 'desc'];
                setSortBy(by);
                setSortOrder(order);
                setPage(1);
              }}
              className="px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-hubzone-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="salary-desc">Highest Salary</option>
              <option value="salary-asc">Lowest Salary</option>
              {isProfessional && <option value="match_score-desc">Best Match</option>}
            </select>

            {/* More Filters Button (Mobile) */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden px-4 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-hubzone-500 rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        <div className={`${showFilters ? 'block' : 'hidden'} lg:block mt-4 pt-4 border-t border-gray-200`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Employment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employment Type</label>
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleEmploymentTypeToggle(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedEmploymentTypes.includes(opt.value)
                        ? 'bg-hubzone-100 text-hubzone-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <div className="space-y-2">
                <select
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                >
                  {usStates.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onBlur={() => setPage(1)}
                  placeholder="City"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                />
              </div>
            </div>

            {/* Salary Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Salary Range</label>
              <select
                value={salaryPreset}
                onChange={(e) => {
                  setSalaryPreset(parseInt(e.target.value));
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-hubzone-500"
              >
                {SALARY_PRESETS.map((preset, idx) => (
                  <option key={idx} value={idx}>{preset.label}</option>
                ))}
              </select>
            </div>

            {/* Remote */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Work Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsRemote(undefined);
                    setPage(1);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isRemote === undefined
                      ? 'bg-hubzone-100 text-hubzone-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setIsRemote(false);
                    setPage(1);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isRemote === false
                      ? 'bg-hubzone-100 text-hubzone-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  On-site
                </button>
                <button
                  onClick={() => {
                    setIsRemote(true);
                    setPage(1);
                  }}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isRemote === true
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Remote
                </button>
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {isLoading ? 'Loading...' : `${totalJobs} jobs found`}
          {hasActiveFilters && ' (filtered)'}
        </p>
      </div>

      {/* Job Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="flex gap-2">
                  <div className="h-6 bg-gray-200 rounded w-16" />
                  <div className="h-6 bg-gray-200 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-lg font-semibold text-red-900">Failed to Load Jobs</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button
            onClick={fetchJobs}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Jobs Found</h3>
          <p className="mt-2 text-gray-500">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results'
              : 'Check back later for new opportunities'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                showMatchScore={isProfessional}
                showDistance={isProfessional}
                onSave={isProfessional ? handleSaveJob : undefined}
                isSaved={savedJobs.has(job.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, idx) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = idx + 1;
                  } else if (page <= 3) {
                    pageNum = idx + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = page - 2 + idx;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium ${
                        page === pageNum
                          ? 'bg-hubzone-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { JobList };

