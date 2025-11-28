import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import jobService from '../../services/jobService';
import type { JobApplication, JobListItem, ApplicationStatus } from '../../types/job';
import { APPLICATION_STATUS_STYLES, EMPLOYMENT_TYPE_OPTIONS } from '../../types/job';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ApplicationWithJob extends JobApplication {
  job: JobListItem;
}

const STATUS_FILTERS: { value: ApplicationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Applications' },
  { value: 'applied', label: 'Applied' },
  { value: 'reviewed', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'offered', label: 'Offer Received' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Not Selected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatSalary = (min: number, max: number, type: 'hourly' | 'annual'): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
  return type === 'hourly'
    ? `${formatter.format(min)} - ${formatter.format(max)}/hr`
    : `${formatter.format(min)} - ${formatter.format(max)}/yr`;
};

const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

export default function Applications() {
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  // Toast helper
  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await jobService.getMyApplications({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit: 10,
      });

      if (response.success && response.data) {
        setApplications(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
      } else {
        setError(response.error?.message || 'Failed to load applications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleWithdraw = async (applicationId: string) => {
    if (!confirm('Are you sure you want to withdraw this application?')) return;

    setWithdrawingId(applicationId);
    try {
      const response = await jobService.withdrawApplication(applicationId);
      if (response.success) {
        showToast('success', 'Application withdrawn');
        fetchApplications();
      } else {
        showToast('error', response.error?.message || 'Failed to withdraw application');
      }
    } catch (err) {
      showToast('error', 'An unexpected error occurred');
    } finally {
      setWithdrawingId(null);
    }
  };

  // Count applications by status
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
              toast.type === 'success'
                ? 'bg-verified-50 border border-verified-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-5 h-5 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className={`text-sm font-medium ${toast.type === 'success' ? 'text-verified-800' : 'text-red-800'}`}>
              {toast.message}
            </span>
            <button onClick={() => removeToast(toast.id)} className={toast.type === 'success' ? 'text-verified-600' : 'text-red-600'}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-500 mt-1">Track and manage your job applications</p>
        </div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-hubzone-600 text-white font-medium rounded-xl hover:bg-hubzone-700 transition-colors shadow-lg shadow-hubzone-500/25"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Find More Jobs
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{applications.length}</div>
          <div className="text-sm text-gray-500">Total Applications</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-amber-600">
            {(statusCounts['reviewed'] || 0) + (statusCounts['shortlisted'] || 0)}
          </div>
          <div className="text-sm text-gray-500">In Review</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-hubzone-600">{statusCounts['interviewing'] || 0}</div>
          <div className="text-sm text-gray-500">Interviewing</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-2xl font-bold text-verified-600">
            {(statusCounts['offered'] || 0) + (statusCounts['hired'] || 0)}
          </div>
          <div className="text-sm text-gray-500">Offers/Hired</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => {
                setStatusFilter(filter.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === filter.value
                  ? 'bg-hubzone-100 text-hubzone-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-200" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="mt-2 text-lg font-semibold text-red-900">Failed to Load Applications</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
          <button
            onClick={fetchApplications}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      ) : applications.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Applications Yet</h3>
          <p className="mt-2 text-gray-500">
            {statusFilter !== 'all'
              ? `No applications with status "${STATUS_FILTERS.find(f => f.value === statusFilter)?.label}"`
              : "You haven't applied to any jobs yet"}
          </p>
          <Link
            to="/jobs"
            className="mt-4 inline-block px-4 py-2 bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700"
          >
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const statusStyle = APPLICATION_STATUS_STYLES[app.status];
            return (
              <div
                key={app.id}
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    {/* Company Logo */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-hubzone-100 to-hubzone-200 flex items-center justify-center flex-shrink-0">
                      {app.job.businessLogo ? (
                        <img src={app.job.businessLogo} alt={app.job.businessName} className="w-12 h-12 rounded-lg object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-hubzone-600">{app.job.businessName.charAt(0)}</span>
                      )}
                    </div>

                    {/* Job Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <Link
                            to={`/jobs/${app.jobId}`}
                            className="text-lg font-semibold text-gray-900 hover:text-hubzone-600 transition-colors"
                          >
                            {app.job.title}
                          </Link>
                          <p className="text-gray-600">{app.job.businessName}</p>
                        </div>
                        <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                          {statusStyle.label}
                        </span>
                      </div>

                      {/* Job Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {app.job.location.city}, {app.job.location.state}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatSalary(app.job.salaryRange.min, app.job.salaryRange.max, app.job.salaryRange.type)}
                        </span>
                        <span className="text-gray-400">
                          {EMPLOYMENT_TYPE_OPTIONS.find(e => e.value === app.job.employmentType)?.label}
                        </span>
                        {app.job.hubzoneResidentRequired && (
                          <span className="px-2 py-0.5 bg-hubzone-100 text-hubzone-700 text-xs font-medium rounded">
                            HUBZone
                          </span>
                        )}
                      </div>

                      {/* Application Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm">
                        <span className="text-gray-500">
                          Applied {getTimeAgo(app.appliedAt)}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500">
                          Match Score: <span className="font-semibold text-hubzone-600">{app.matchScore}%</span>
                        </span>
                        {app.statusHistory.length > 1 && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-500">
                              Last updated {getTimeAgo(app.statusHistory[app.statusHistory.length - 1].date)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Timeline (collapsed) */}
                  {app.statusHistory.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <details className="group">
                        <summary className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                          <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          View application history ({app.statusHistory.length} updates)
                        </summary>
                        <div className="mt-3 ml-6 space-y-2">
                          {app.statusHistory.map((entry, idx) => {
                            const entryStyle = APPLICATION_STATUS_STYLES[entry.status];
                            return (
                              <div key={idx} className="flex items-center gap-3 text-sm">
                                <div className={`w-2 h-2 rounded-full ${entryStyle.bg.replace('100', '500')}`} />
                                <span className={`font-medium ${entryStyle.text}`}>{entryStyle.label}</span>
                                <span className="text-gray-400">{formatDate(entry.date)}</span>
                                {entry.note && (
                                  <span className="text-gray-500 italic">"{entry.note}"</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Application ID: {app.id.slice(0, 8)}...
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/jobs/${app.jobId}`}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
                    >
                      View Job
                    </Link>
                    {['applied', 'reviewed', 'shortlisted'].includes(app.status) && (
                      <button
                        onClick={() => handleWithdraw(app.id)}
                        disabled={withdrawingId === app.id}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {withdrawingId === app.id ? 'Withdrawing...' : 'Withdraw'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { Applications };

