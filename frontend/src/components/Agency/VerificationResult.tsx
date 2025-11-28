import { useState } from 'react';
import type { ContractorVerification, VerificationReport, RiskLevel, VerificationStatus } from '../../types/agency';

interface VerificationResultProps {
  verification: ContractorVerification;
  report?: VerificationReport;
  onDownloadPDF?: () => void;
  onNewSearch?: () => void;
  isLoadingReport?: boolean;
}

const statusConfig: Record<VerificationStatus, { label: string; color: string; bgColor: string; icon: JSX.Element }> = {
  valid: {
    label: 'Active & Compliant',
    color: 'text-verified-700',
    bgColor: 'bg-verified-100',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  expired: {
    label: 'Certification Expired',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  non_compliant: {
    label: 'Non-Compliant',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  pending: {
    label: 'Pending Review',
    color: 'text-hubzone-700',
    bgColor: 'bg-hubzone-100',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  not_found: {
    label: 'Not Found',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

const riskConfig: Record<RiskLevel, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low Risk', color: 'text-verified-700', bgColor: 'bg-verified-100' },
  medium: { label: 'Medium Risk', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  high: { label: 'High Risk', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  critical: { label: 'Critical Risk', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export default function VerificationResult({
  verification,
  report,
  onDownloadPDF,
  onNewSearch,
  isLoadingReport,
}: VerificationResultProps) {
  const [showDetails, setShowDetails] = useState(true);
  
  const status = statusConfig[verification.certificationStatus];
  const risk = riskConfig[verification.riskLevel];
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6 animate-in">
      {/* Status Banner */}
      <div className={`rounded-xl p-6 ${status.bgColor}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              verification.certificationStatus === 'valid' ? 'bg-verified-200' :
              verification.certificationStatus === 'expired' ? 'bg-amber-200' :
              verification.certificationStatus === 'non_compliant' ? 'bg-red-200' :
              'bg-gray-200'
            }`}>
              <span className={status.color}>{status.icon}</span>
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-gray-900">
                {verification.businessName}
              </h2>
              {verification.dbaName && (
                <p className="text-sm text-gray-600">DBA: {verification.dbaName}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}>
                  {status.icon}
                  {status.label}
                </span>
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${risk.bgColor} ${risk.color}`}>
                  {risk.label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-500">Verification ID</p>
            <p className="text-sm font-mono text-gray-700">{verification.verificationId.slice(0, 8)}...</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDate(verification.verifiedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Business Information */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">UEI Number</p>
              <p className="text-base font-semibold text-gray-900 font-mono">{verification.ueiNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">CAGE Code</p>
              <p className="text-base font-semibold text-gray-900 font-mono">{verification.cageCode || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Certification Date</p>
              <p className="text-base font-semibold text-gray-900">{formatDate(verification.certificationDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Expiration Date</p>
              <p className={`text-base font-semibold ${
                verification.certificationStatus === 'expired' ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatDate(verification.expirationDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Status Breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <h3 className="text-lg font-semibold text-gray-900">Compliance Status Breakdown</h3>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${showDetails ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {showDetails && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Residency */}
              <div className={`p-4 rounded-xl border ${
                verification.compliance.employeeResidency.isCompliant
                  ? 'bg-verified-50 border-verified-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Employee Residency</h4>
                  {verification.compliance.employeeResidency.isCompliant ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-verified-100 text-verified-700 text-xs font-medium rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Compliant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Non-Compliant
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">HUBZone Resident %</span>
                    <span className="font-semibold text-gray-900">
                      {formatPercentage(verification.compliance.employeeResidency.percentage)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        verification.compliance.employeeResidency.isCompliant ? 'bg-verified-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(verification.compliance.employeeResidency.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{verification.compliance.employeeResidency.hubzoneResidents} HUBZone residents</span>
                    <span>{verification.compliance.employeeResidency.totalEmployees} total employees</span>
                  </div>
                </div>
              </div>

              {/* Principal Office */}
              <div className={`p-4 rounded-xl border ${
                verification.compliance.principalOffice.isCompliant
                  ? 'bg-verified-50 border-verified-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Principal Office</h4>
                  {verification.compliance.principalOffice.isCompliant ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-verified-100 text-verified-700 text-xs font-medium rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Not Verified
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-700">{verification.compliance.principalOffice.address || 'Address not available'}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex items-center gap-1 text-xs ${
                      verification.compliance.principalOffice.inHubzone ? 'text-verified-600' : 'text-red-600'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        verification.compliance.principalOffice.inHubzone ? 'bg-verified-500' : 'bg-red-500'
                      }`} />
                      {verification.compliance.principalOffice.inHubzone ? 'In HUBZone' : 'Not in HUBZone'}
                    </span>
                    {verification.compliance.principalOffice.isRedesignated && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Redesignated ({verification.compliance.principalOffice.gracePeriodDaysRemaining} days grace)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ownership */}
              <div className={`p-4 rounded-xl border ${
                verification.compliance.ownership.isCompliant
                  ? 'bg-verified-50 border-verified-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Ownership</h4>
                  {verification.compliance.ownership.isCompliant ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-verified-100 text-verified-700 text-xs font-medium rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Compliant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Non-Compliant
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Qualifying Ownership</span>
                    <span className="font-semibold text-gray-900">
                      {formatPercentage(verification.compliance.ownership.percentage)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs ${
                      verification.compliance.ownership.citizenOwned ? 'text-verified-600' : 'text-red-600'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        verification.compliance.ownership.citizenOwned ? 'bg-verified-500' : 'bg-red-500'
                      }`} />
                      {verification.compliance.ownership.citizenOwned ? 'U.S. Citizen Owned' : 'Ownership requirements not met'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Certification Status */}
              <div className={`p-4 rounded-xl border ${
                verification.compliance.certification.isValid
                  ? 'bg-verified-50 border-verified-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Certification</h4>
                  {verification.compliance.certification.isValid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-verified-100 text-verified-700 text-xs font-medium rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Valid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Invalid
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  {verification.compliance.certification.daysUntilExpiration !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Days Until Expiration</span>
                      <span className={`font-semibold ${
                        verification.compliance.certification.daysUntilExpiration < 30 ? 'text-red-600' :
                        verification.compliance.certification.daysUntilExpiration < 90 ? 'text-amber-600' : 'text-gray-900'
                      }`}>
                        {verification.compliance.certification.daysUntilExpiration} days
                      </span>
                    </div>
                  )}
                  {verification.compliance.certification.requiresRecertification && (
                    <div className="p-2 bg-amber-100 border border-amber-200 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-700 text-xs">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Recertification Required
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Risk Level Indicator */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Risk Assessment</h3>
            <p className="text-sm text-gray-500">
              Based on compliance metrics, certification status, and historical data
            </p>
          </div>
          <div className="text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${risk.bgColor}`}>
              <span className={`text-2xl font-bold ${risk.color}`}>
                {verification.riskScore}
              </span>
            </div>
            <p className={`text-sm font-medium mt-2 ${risk.color}`}>{risk.label}</p>
          </div>
        </div>
        
        {/* Risk meter */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
            <span>Critical</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full flex">
              <div className="bg-verified-500" style={{ width: '25%' }} />
              <div className="bg-amber-500" style={{ width: '25%' }} />
              <div className="bg-orange-500" style={{ width: '25%' }} />
              <div className="bg-red-500" style={{ width: '25%' }} />
            </div>
          </div>
          <div 
            className="w-3 h-3 bg-gray-900 rounded-full transform -translate-y-3 transition-all"
            style={{ marginLeft: `${Math.min(verification.riskScore, 100)}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl">
        <div className="text-sm text-gray-500">
          Verified at {new Date(verification.verifiedAt).toLocaleString()}
          {verification.verifiedBy && ` by ${verification.verifiedBy}`}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onNewSearch}
            className="px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            New Search
          </button>
          <button
            onClick={onDownloadPDF}
            disabled={isLoadingReport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingReport ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Certificate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export { VerificationResult };

