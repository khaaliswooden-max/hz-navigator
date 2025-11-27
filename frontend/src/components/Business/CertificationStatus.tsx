import { useMemo } from 'react';
import type { BusinessCertificationStatus } from '../../types/business';

interface CertificationStatusProps {
  status: BusinessCertificationStatus;
  certificationDate?: string;
  expirationDate?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const statusConfigs: Record<BusinessCertificationStatus, StatusConfig> = {
  not_started: {
    label: 'Not Started',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: (
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  pending_review: {
    label: 'Pending Review',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  approved: {
    label: 'Approved',
    color: 'text-verified-700',
    bgColor: 'bg-verified-50',
    borderColor: 'border-verified-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  denied: {
    label: 'Denied',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  expired: {
    label: 'Expired',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  withdrawn: {
    label: 'Withdrawn',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDaysUntilExpiration(expirationDate: string): number {
  const now = new Date();
  const expiration = new Date(expirationDate);
  const diffTime = expiration.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getExpirationWarning(daysUntil: number): { level: 'critical' | 'warning' | 'info' | null; message: string } {
  if (daysUntil < 0) {
    return { level: 'critical', message: 'Expired' };
  }
  if (daysUntil <= 30) {
    return { level: 'critical', message: `Expires in ${daysUntil} days` };
  }
  if (daysUntil <= 90) {
    return { level: 'warning', message: `Expires in ${daysUntil} days` };
  }
  if (daysUntil <= 180) {
    return { level: 'info', message: `Expires in ${daysUntil} days` };
  }
  return { level: null, message: `${daysUntil} days remaining` };
}

export default function CertificationStatus({
  status,
  certificationDate,
  expirationDate,
  showDetails = false,
  size = 'md',
}: CertificationStatusProps) {
  const config = statusConfigs[status];

  const expirationInfo = useMemo(() => {
    if (!expirationDate) return null;
    const daysUntil = getDaysUntilExpiration(expirationDate);
    return {
      daysUntil,
      ...getExpirationWarning(daysUntil),
    };
  }, [expirationDate]);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  // Badge only view
  if (!showDetails) {
    return (
      <span
        className={`inline-flex items-center rounded-full font-medium border ${config.bgColor} ${config.color} ${config.borderColor} ${sizeClasses[size]}`}
      >
        <span className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  }

  // Detailed view with dates and expiration
  return (
    <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.bgColor} border ${config.borderColor}`}>
            <span className={`${config.color} w-5 h-5`}>{config.icon}</span>
          </div>
          <div>
            <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
            <p className="text-sm text-gray-500">HUBZone Certification</p>
          </div>
        </div>

        {status === 'approved' && expirationInfo && (
          <div className={`text-right ${
            expirationInfo.level === 'critical' ? 'text-red-600' :
            expirationInfo.level === 'warning' ? 'text-amber-600' :
            expirationInfo.level === 'info' ? 'text-blue-600' :
            'text-gray-600'
          }`}>
            <p className="font-semibold text-lg">{expirationInfo.daysUntil}</p>
            <p className="text-xs">days left</p>
          </div>
        )}
      </div>

      {(certificationDate || expirationDate) && (
        <div className="mt-4 pt-4 border-t border-gray-200/50 grid grid-cols-2 gap-4">
          {certificationDate && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Certified On</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(certificationDate)}</p>
            </div>
          )}
          {expirationDate && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Expires On</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(expirationDate)}</p>
            </div>
          )}
        </div>
      )}

      {expirationInfo && expirationInfo.level && (
        <div className={`mt-3 p-2 rounded-lg text-sm font-medium ${
          expirationInfo.level === 'critical' ? 'bg-red-100 text-red-700' :
          expirationInfo.level === 'warning' ? 'bg-amber-100 text-amber-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{expirationInfo.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export { CertificationStatus };

