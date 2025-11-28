import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import jobService from '../../services/jobService';
import type { Job, JobApplication, ApplicationStatus } from '../../types/job';
import { APPLICATION_STATUS_STYLES } from '../../types/job';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const STATUS_ACTIONS: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'reviewed', label: 'Mark as Reviewed', color: 'bg-blue-600 hover:bg-blue-700' },
  { value: 'shortlisted', label: 'Shortlist', color: 'bg-purple-600 hover:bg-purple-700' },
  { value: 'interviewing', label: 'Schedule Interview', color: 'bg-amber-600 hover:bg-amber-700' },
  { value: 'offered', label: 'Extend Offer', color: 'bg-emerald-600 hover:bg-emerald-700' },
  { value: 'hired', label: 'Mark as Hired', color: 'bg-verified-600 hover:bg-verified-700' },
  { value: 'rejected', label: 'Reject', color: 'bg-red-600 hover:bg-red-700' },
];

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

const getMatchScoreColor = (score: number): string => {
  if (score >= 80) return 'text-verified-600 bg-verified-100';
  if (score >= 60) return 'text-hubzone-600 bg-hubzone-100';
  if (score >= 40) return 'text-amber-600 bg-amber-100';
  return 'text-gray-600 bg-gray-100';
};

export default function JobApplications() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalApplications, setTotalApplications] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  // Filter from URL
  const statusFilter = searchParams.get('status') as ApplicationStatus | null;
  const sortBy = searchParams.get('sortBy') || 'matchScore';

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

  // Fetch job details
  const fetchJob = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await jobService.getJob(jobId);
      if (response.success && response.data) {
        setJob(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch job:', err);
    }
  }, [jobId]);

  // Fetch applications
  const fetchApplications = useCallback(async () => {
    if (!jobId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await jobService.getJobApplications(jobId, {
        status: statusFilter || undefined,
        sortBy,
        page,
        limit: 12,
      });

      if (response.success && response.data) {
        setApplications(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        setTotalApplications(response.data.pagination.total);
      } else {
        setError(response.error?.message || 'Failed to load applications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [jobId, statusFilter, sortBy, page]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleStatusUpdate = async (status: ApplicationStatus) => {
    if (!selectedApplication) return;

    setUpdatingId(selectedApplication.id);
    try {
      const response = await jobService.updateApplicationStatus(
        selectedApplication.id,
        status,
        statusNote || undefined
      );

      if (response.success) {
        showToast('success', `Application ${APPLICATION_STATUS_STYLES[status].label.toLowerCase()}`);
        setShowStatusModal(false);
        setSelectedApplication(null);
        setStatusNote('');
        fetchApplications();
      } else {
        showToast('error', response.error?.message || 'Failed to update status');
      }
    } catch (err) {
      showToast('error', 'An unexpected error occurred');
    } finally {
      setUpdatingId(null);
    }
  };

  const openStatusModal = (app: JobApplication) => {
    setSelectedApplication(app);
    setShowStatusModal(true);
  };

  const setFilter = (status: ApplicationStatus | null) => {
    if (status) {
      searchParams.set('status', status);
    } else {
      searchParams.delete('status');
    }
    setSearchParams(searchParams);
    setPage(1);
  };

  const setSort = (sort: string) => {
    searchParams.set('sortBy', sort);
    setSearchParams(searchParams);
    setPage(1);
  };

  // Group applications by status for stats
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!jobId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Job ID not provided</p>
      </div>
    );
  }

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
            <button onClick={() => removeToast(toast.id)}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/jobs/manage" className="hover:text-gray-700">My Job Postings</Link>
          <span>/</span>
          <span className="text-gray-700">Applications</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">
              {job?.title || 'Job Applications'}
            </h1>
            <p className="text-gray-500 mt-1">
              {totalApplications} application{totalApplications !== 1 ? 's' : ''} received
            </p>
          </div>
          <Link
            to={`/jobs/${jobId}`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Job Posting
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <button
          onClick={() => setFilter(null)}
          className={`bg-white rounded-xl border p-4 text-left transition-colors ${
            !statusFilter ? 'border-hubzone-500 ring-2 ring-hubzone-100' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl font-bold text-gray-900">{totalApplications}</div>
          <div className="text-sm text-gray-500">Total</div>
        </button>
        <button
          onClick={() => setFilter('applied')}
          className={`bg-white rounded-xl border p-4 text-left transition-colors ${
            statusFilter === 'applied' ? 'border-gray-500 ring-2 ring-gray-100' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl font-bold text-gray-600">{statusCounts['applied'] || 0}</div>
          <div className="text-sm text-gray-500">New</div>
        </button>
        <button
          onClick={() => setFilter('shortlisted')}
          className={`bg-white rounded-xl border p-4 text-left transition-colors ${
            statusFilter === 'shortlisted' ? 'border-purple-500 ring-2 ring-purple-100' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl font-bold text-purple-600">{statusCounts['shortlisted'] || 0}</div>
          <div className="text-sm text-gray-500">Shortlisted</div>
        </button>
        <button
          onClick={() => setFilter('interviewing')}
          className={`bg-white rounded-xl border p-4 text-left transition-colors ${
            statusFilter === 'interviewing' ? 'border-amber-500 ring-2 ring-amber-100' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl font-bold text-amber-600">{statusCounts['interviewing'] || 0}</div>
          <div className="text-sm text-gray-500">Interviewing</div>
        </button>
        <button
          onClick={() => setFilter('hired')}
          className={`bg-white rounded-xl border p-4 text-left transition-colors ${
            statusFilter === 'hired' ? 'border-verified-500 ring-2 ring-verified-100' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl font-bold text-verified-600">{statusCounts['hired'] || 0}</div>
          <div className="text-sm text-gray-500">Hired</div>
        </button>
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-hubzone-500"
          >
            <option value="matchScore">Match Score</option>
            <option value="appliedAt">Application Date</option>
            <option value="status">Status</option>
          </select>
        </div>
        {statusFilter && (
          <button
            onClick={() => setFilter(null)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Applications Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">No Applications Yet</h3>
          <p className="mt-2 text-gray-500">
            {statusFilter
              ? `No applications with status "${APPLICATION_STATUS_STYLES[statusFilter].label}"`
              : 'No one has applied to this job yet'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {applications.map((app) => {
              const statusStyle = APPLICATION_STATUS_STYLES[app.status];
              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all overflow-hidden"
                >
                  <div className="p-5">
                    {/* Applicant Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-hubzone-400 to-hubzone-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                        {app.applicantName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{app.applicantName}</h3>
                        <a
                          href={`mailto:${app.applicantEmail}`}
                          className="text-sm text-gray-500 hover:text-hubzone-600 truncate block"
                        >
                          {app.applicantEmail}
                        </a>
                        {app.applicantPhone && (
                          <a
                            href={`tel:${app.applicantPhone}`}
                            className="text-sm text-gray-500 hover:text-hubzone-600"
                          >
                            {app.applicantPhone}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Match Score & HUBZone Status */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getMatchScoreColor(app.matchScore)}`}>
                        {app.matchScore}% Match
                      </span>
                      {app.hubzoneScore === 100 ? (
                        <span className="px-2 py-1 bg-verified-100 text-verified-700 text-xs font-medium rounded-lg flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          HUBZone Verified
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">
                          Non-HUBZone
                        </span>
                      )}
                    </div>

                    {/* Score Breakdown */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Skills</span>
                        <span className="font-medium text-gray-700">{app.skillsMatchScore}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-violet-500 h-1.5 rounded-full"
                          style={{ width: `${app.skillsMatchScore}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Experience</span>
                        <span className="font-medium text-gray-700">{app.experienceScore}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${app.experienceScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-3 mb-4">
                      {app.resumeUrl && (
                        <a
                          href={app.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-hubzone-600 hover:text-hubzone-700"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Resume
                        </a>
                      )}
                      {app.portfolioUrl && (
                        <a
                          href={app.portfolioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-hubzone-600 hover:text-hubzone-700"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Portfolio
                        </a>
                      )}
                      <Link
                        to={`/professionals/${app.professionalId}`}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Profile
                      </Link>
                    </div>

                    {/* Cover Letter Preview */}
                    {app.coverLetter && (
                      <details className="mb-4 group">
                        <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-1">
                          <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Cover Letter
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 max-h-32 overflow-y-auto">
                          {app.coverLetter}
                        </div>
                      </details>
                    )}

                    {/* Status & Date */}
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2.5 py-1 rounded-full font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                        {statusStyle.label}
                      </span>
                      <span className="text-gray-500">Applied {getTimeAgo(app.appliedAt)}</span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <a
                        href={`mailto:${app.applicantEmail}`}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title="Send email"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </a>
                      {app.applicantPhone && (
                        <a
                          href={`tel:${app.applicantPhone}`}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                          title="Call"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => openStatusModal(app)}
                      className="px-3 py-1.5 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

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
        </>
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedApplication && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowStatusModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-1">Update Application Status</h2>
              <p className="text-gray-500 mb-6">{selectedApplication.applicantName}</p>

              <div className="space-y-3 mb-6">
                {STATUS_ACTIONS.filter((action) => action.value !== selectedApplication.status).map((action) => (
                  <button
                    key={action.value}
                    onClick={() => handleStatusUpdate(action.value)}
                    disabled={updatingId === selectedApplication.id}
                    className={`w-full py-3 text-white font-medium rounded-xl ${action.color} disabled:opacity-50 transition-colors`}
                  >
                    {updatingId === selectedApplication.id ? 'Updating...' : action.label}
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Add a note (optional)
                </label>
                <textarea
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about this status change..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 resize-none"
                />
              </div>

              <button
                onClick={() => setShowStatusModal(false)}
                className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { JobApplications };

