import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import jobService from '../../services/jobService';
import type { Job, ApplicationFormData, MatchScoreBreakdown } from '../../types/job';
import { applicationFormSchema, EMPLOYMENT_TYPE_OPTIONS, REMOTE_POLICY_OPTIONS } from '../../types/job';
import { useAuth } from '../../hooks/useAuth';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

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

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isProfessional = user?.role === 'professional';

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [matchScore, setMatchScore] = useState<MatchScoreBreakdown | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Application form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      coverLetter: '',
      resumeUrl: '',
      portfolioUrl: '',
      phone: '',
    },
  });

  // Toast helper
  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  // Fetch job data
  const fetchJob = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await jobService.getJob(id);
      if (response.success && response.data) {
        setJob(response.data);

        // Check if user has applied and if job is saved
        if (isProfessional) {
          const [appliedStatus, savedStatus, matchScoreData] = await Promise.all([
            jobService.hasApplied(id),
            jobService.isSaved(id),
            jobService.getMatchScore(id),
          ]);
          setHasApplied(appliedStatus);
          setIsSaved(savedStatus);
          if (matchScoreData.success && matchScoreData.data) {
            setMatchScore(matchScoreData.data);
          }
        }
      } else {
        setError(response.error?.message || 'Failed to load job');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [id, isProfessional]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleSaveJob = async () => {
    if (!id) return;

    if (isSaved) {
      await jobService.unsaveJob(id);
      setIsSaved(false);
      showToast('success', 'Job removed from saved');
    } else {
      await jobService.saveJob(id);
      setIsSaved(true);
      showToast('success', 'Job saved');
    }
  };

  const handleApply = async (data: ApplicationFormData) => {
    if (!id) return;

    setIsSubmitting(true);
    try {
      const response = await jobService.applyForJob(id, data);
      if (response.success) {
        setHasApplied(true);
        setShowApplicationForm(false);
        reset();
        showToast('success', 'Application submitted successfully!');
      } else {
        showToast('error', response.error?.message || 'Failed to submit application');
      }
    } catch (err) {
      showToast('error', 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMatchScoreColor = (score: number): string => {
    if (score >= 80) return 'text-verified-600';
    if (score >= 60) return 'text-hubzone-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-gray-500';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="mt-2 text-lg font-semibold text-red-900">Failed to Load Job</h3>
        <p className="mt-1 text-sm text-red-700">{error || 'Job not found'}</p>
        <Link
          to="/jobs"
          className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Back to Jobs
        </Link>
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
            <button onClick={() => removeToast(toast.id)} className={toast.type === 'success' ? 'text-verified-600' : 'text-red-600'}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link to="/jobs" className="hover:text-gray-700">Jobs</Link>
            <span>/</span>
            <span className="text-gray-700 truncate">{job.title}</span>
          </div>
          <div className="flex items-start gap-4">
            {/* Company Logo */}
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-hubzone-100 to-hubzone-200 flex items-center justify-center flex-shrink-0">
              {job.businessLogo ? (
                <img src={job.businessLogo} alt={job.businessName} className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <span className="text-2xl font-bold text-hubzone-600">{job.businessName.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900">{job.title}</h1>
              <p className="text-lg text-gray-600">{job.businessName}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  {job.location.city}, {job.location.state}
                </span>
                <span>•</span>
                <span>{EMPLOYMENT_TYPE_OPTIONS.find((e) => e.value === job.employmentType)?.label}</span>
                {job.isRemote && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600">
                      {REMOTE_POLICY_OPTIONS.find((r) => r.value === job.remotePolicy)?.label || 'Remote'}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>Posted {formatDate(job.postedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isProfessional && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveJob}
              className={`p-3 rounded-xl border transition-colors ${
                isSaved
                  ? 'bg-hubzone-100 border-hubzone-500 text-hubzone-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save job'}
            >
              <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            {hasApplied ? (
              <span className="px-5 py-3 bg-verified-100 text-verified-700 font-medium rounded-xl flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Applied
              </span>
            ) : (
              <button
                onClick={() => setShowApplicationForm(true)}
                className="px-5 py-3 bg-hubzone-600 text-white font-medium rounded-xl hover:bg-hubzone-700 transition-colors shadow-lg shadow-hubzone-500/25"
              >
                Apply Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {job.hubzoneResidentRequired && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-hubzone-100 text-hubzone-700 text-sm font-medium rounded-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                HUBZone Residency Required
              </span>
            )}
            <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-lg">
              {formatSalary(job.salaryRange.min, job.salaryRange.max, job.salaryRange.type)}
            </span>
            {job.experienceYears && (
              <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg">
                {job.experienceYears}+ years experience
              </span>
            )}
          </div>

          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Job Description</h2>
            </div>
            <div className="p-6">
              <div className="prose prose-gray max-w-none whitespace-pre-wrap">
                {job.description}
              </div>
            </div>
          </div>

          {/* Responsibilities */}
          {job.responsibilities && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Responsibilities</h2>
              </div>
              <div className="p-6">
                <div className="prose prose-gray max-w-none whitespace-pre-wrap">
                  {job.responsibilities}
                </div>
              </div>
            </div>
          )}

          {/* Qualifications */}
          {job.qualifications && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Qualifications</h2>
              </div>
              <div className="p-6">
                <div className="prose prose-gray max-w-none whitespace-pre-wrap">
                  {job.qualifications}
                </div>
              </div>
            </div>
          )}

          {/* Skills */}
          {job.skills.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Required Skills</h2>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span
                      key={skill.id}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        skill.required
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {skill.name}
                      {!skill.required && <span className="ml-1 text-xs opacity-75">(preferred)</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900">Benefits</h2>
              </div>
              <div className="p-6">
                <div className="prose prose-gray max-w-none whitespace-pre-wrap">
                  {job.benefits}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Match Score (Professionals only) */}
          {isProfessional && matchScore && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-hubzone-50 to-verified-50">
                <h3 className="font-semibold text-gray-900">Your Match Score</h3>
              </div>
              <div className="p-5">
                <div className="text-center mb-6">
                  <div className={`text-5xl font-bold ${getMatchScoreColor(matchScore.total)}`}>
                    {matchScore.total}%
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Overall Match</p>
                </div>

                <div className="space-y-4">
                  {/* Skills */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Skills ({matchScore.skills.weight}%)</span>
                      <span className="font-medium">{matchScore.skills.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-violet-500 h-2 rounded-full"
                        style={{ width: `${matchScore.skills.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Experience */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Experience ({matchScore.experience.weight}%)</span>
                      <span className="font-medium">{matchScore.experience.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${matchScore.experience.score}%` }}
                      />
                    </div>
                  </div>

                  {/* HUBZone */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">HUBZone ({matchScore.hubzone.weight}%)</span>
                      <span className="font-medium">{matchScore.hubzone.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${matchScore.hubzone.isResident ? 'bg-verified-500' : 'bg-amber-500'}`}
                        style={{ width: `${matchScore.hubzone.score}%` }}
                      />
                    </div>
                    {matchScore.hubzone.isRequired && !matchScore.hubzone.isResident && (
                      <p className="text-xs text-amber-600 mt-1">
                        HUBZone residency required for this position
                      </p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Location ({matchScore.location.weight}%)</span>
                      <span className="font-medium">{matchScore.location.score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full"
                        style={{ width: `${matchScore.location.score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Company Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">About the Company</h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hubzone-100 to-hubzone-200 flex items-center justify-center">
                  {job.businessLogo ? (
                    <img src={job.businessLogo} alt={job.businessName} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-hubzone-600">{job.businessName.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{job.businessName}</h4>
                  <p className="text-sm text-gray-500">Federal Contractor</p>
                </div>
              </div>
              <Link
                to={`/businesses/${job.businessId}`}
                className="block w-full text-center py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                View Company Profile
              </Link>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Work Location</h3>
            </div>
            <div className="p-5">
              <address className="not-italic text-gray-700 text-sm">
                <p>{job.location.street1}</p>
                {job.location.street2 && <p>{job.location.street2}</p>}
                <p>{job.location.city}, {job.location.state} {job.location.zipCode}</p>
              </address>
              {job.isRemote && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {REMOTE_POLICY_OPTIONS.find((r) => r.value === job.remotePolicy)?.label || 'Remote work available'}
                </div>
              )}
              <Link
                to={`/check?address=${encodeURIComponent(`${job.location.street1}, ${job.location.city}, ${job.location.state} ${job.location.zipCode}`)}`}
                className="mt-4 block w-full text-center py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                View on HUBZone Map
              </Link>
            </div>
          </div>

          {/* Job Stats */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{job.applicationCount}</p>
                <p className="text-xs text-gray-500">Applications</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{job.viewCount}</p>
                <p className="text-xs text-gray-500">Views</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowApplicationForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
              <button
                onClick={() => setShowApplicationForm(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <h2 className="text-xl font-bold text-gray-900 mb-1">Apply for {job.title}</h2>
              <p className="text-gray-500 mb-6">at {job.businessName}</p>

              {job.hubzoneResidentRequired && (
                <div className="mb-6 p-4 bg-hubzone-50 border border-hubzone-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-hubzone-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-hubzone-800">HUBZone Residency Required</p>
                      <p className="text-sm text-hubzone-700">This position requires verified HUBZone residency.</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit(handleApply)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cover Letter
                  </label>
                  <textarea
                    {...register('coverLetter')}
                    rows={5}
                    placeholder="Tell the employer why you're a great fit for this role..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 resize-none"
                  />
                  {errors.coverLetter && (
                    <p className="mt-1 text-sm text-red-600">{errors.coverLetter.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resume URL
                  </label>
                  <input
                    {...register('resumeUrl')}
                    type="url"
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                  {errors.resumeUrl && (
                    <p className="mt-1 text-sm text-red-600">{errors.resumeUrl.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Link to your resume (Google Drive, Dropbox, etc.)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio URL <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    {...register('portfolioUrl')}
                    type="url"
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    placeholder="(555) 555-5555"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowApplicationForm(false)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-hubzone-600 text-white font-medium rounded-xl hover:bg-hubzone-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { JobDetail };

