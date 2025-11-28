import { Link } from 'react-router-dom';
import type { JobListItem, EmploymentType } from '../../types/job';

interface JobCardProps {
  job: JobListItem;
  showMatchScore?: boolean;
  showDistance?: boolean;
  onSave?: (jobId: string) => void;
  isSaved?: boolean;
  variant?: 'default' | 'compact';
}

const employmentTypeLabels: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  temporary: 'Temporary',
  internship: 'Internship',
};

const formatSalary = (min: number, max: number, type: 'hourly' | 'annual'): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  if (type === 'hourly') {
    return `${formatter.format(min)} - ${formatter.format(max)}/hr`;
  }
  return `${formatter.format(min)} - ${formatter.format(max)}/yr`;
};

const formatPostedDate = (dateString: string): string => {
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
  if (score >= 80) return 'text-verified-600';
  if (score >= 60) return 'text-hubzone-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-gray-500';
};

const getMatchScoreBg = (score: number): string => {
  if (score >= 80) return 'bg-verified-50 border-verified-200';
  if (score >= 60) return 'bg-hubzone-50 border-hubzone-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-gray-50 border-gray-200';
};

export default function JobCard({
  job,
  showMatchScore = true,
  showDistance = true,
  onSave,
  isSaved = false,
  variant = 'default',
}: JobCardProps) {
  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(job.id);
  };

  if (variant === 'compact') {
    return (
      <Link
        to={`/jobs/${job.id}`}
        className="block p-4 bg-white rounded-xl border border-gray-200 hover:border-hubzone-300 hover:shadow-md transition-all group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 group-hover:text-hubzone-600 truncate">
                {job.title}
              </h3>
              {job.hubzoneResidentRequired && (
                <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-hubzone-100 text-hubzone-700 rounded">
                  HZ
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 truncate">{job.businessName}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>{job.location.city}, {job.location.state}</span>
              <span>{formatPostedDate(job.postedAt)}</span>
            </div>
          </div>
          {showMatchScore && job.matchScore !== undefined && (
            <div className={`text-right ${getMatchScoreColor(job.matchScore)}`}>
              <div className="text-xl font-bold">{job.matchScore}%</div>
              <div className="text-xs">match</div>
            </div>
          )}
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-hubzone-300 hover:shadow-lg transition-all overflow-hidden group">
      <Link to={`/jobs/${job.id}`} className="block p-5">
        {/* Header with company info */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            {/* Company Logo */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hubzone-100 to-hubzone-200 flex items-center justify-center flex-shrink-0">
              {job.businessLogo ? (
                <img
                  src={job.businessLogo}
                  alt={job.businessName}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-hubzone-600">
                  {job.businessName.charAt(0)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 group-hover:text-hubzone-600 transition-colors line-clamp-1">
                {job.title}
              </h3>
              <p className="text-sm text-gray-600">{job.businessName}</p>
            </div>
          </div>

          {/* Match Score */}
          {showMatchScore && job.matchScore !== undefined && (
            <div className={`flex-shrink-0 px-3 py-2 rounded-xl border ${getMatchScoreBg(job.matchScore)}`}>
              <div className={`text-2xl font-bold ${getMatchScoreColor(job.matchScore)}`}>
                {job.matchScore}%
              </div>
              <div className="text-xs text-gray-500 text-center">match</div>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {job.hubzoneResidentRequired && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-hubzone-100 text-hubzone-700 text-xs font-medium rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              HUBZone Required
            </span>
          )}
          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
            {employmentTypeLabels[job.employmentType]}
          </span>
          {job.isRemote && (
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">
              Remote
            </span>
          )}
        </div>

        {/* Salary */}
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-semibold text-gray-900">
            {formatSalary(job.salaryRange.min, job.salaryRange.max, job.salaryRange.type)}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm text-gray-600">
            {job.location.city}, {job.location.state}
          </span>
          {showDistance && job.distanceMiles !== undefined && job.distanceMiles > 0 && (
            <span className="text-xs text-gray-400">
              ({job.distanceMiles.toFixed(1)} mi away)
            </span>
          )}
        </div>

        {/* Skills */}
        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.skills.slice(0, 4).map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-md"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md">
                +{job.skills.length - 4} more
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          Posted {formatPostedDate(job.postedAt)}
        </span>
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={handleSaveClick}
              className={`p-2 rounded-lg transition-colors ${
                isSaved
                  ? 'bg-hubzone-100 text-hubzone-600'
                  : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save job'}
            >
              <svg
                className="w-5 h-5"
                fill={isSaved ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </button>
          )}
          <Link
            to={`/jobs/${job.id}`}
            className="px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

export { JobCard };

