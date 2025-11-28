import { useState } from 'react';
import type { VerificationCertificate, VerificationStatus } from '../../types/professional';
import type { Address } from '../../types';
import professionalService from '../../services/professionalService';

interface ResidencyVerificationProps {
  address: Address;
  verificationStatus: VerificationStatus;
  hubzoneType?: string;
  lastVerifiedAt?: string;
  nextVerificationDue?: string;
  certificate?: VerificationCertificate;
  onVerify?: () => Promise<void>;
}

const statusConfig = {
  verified: {
    label: 'Verified',
    bgColor: 'bg-verified-50',
    borderColor: 'border-verified-200',
    textColor: 'text-verified-700',
    iconBg: 'bg-verified-100',
    iconColor: 'text-verified-600',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  pending: {
    label: 'Verification Pending',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  expired: {
    label: 'Verification Expired',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  unverified: {
    label: 'Not Verified',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-700',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-500',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export default function ResidencyVerification({
  address,
  verificationStatus,
  hubzoneType,
  lastVerifiedAt,
  nextVerificationDue,
  certificate,
  onVerify,
}: ResidencyVerificationProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = statusConfig[verificationStatus];

  const handleVerify = async () => {
    if (!onVerify) return;
    
    setIsVerifying(true);
    setError(null);
    
    try {
      await onVerify();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownloadCertificate = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const blob = await professionalService.downloadCertificatePDF();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hubzone-certificate-${certificate?.certificateNumber || 'verification'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download certificate');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDaysUntilExpiration = () => {
    if (!nextVerificationDue) return null;
    const now = new Date();
    const expiration = new Date(nextVerificationDue);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiration = getDaysUntilExpiration();

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={`rounded-xl p-5 ${config.bgColor} border ${config.borderColor}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
            <span className={config.iconColor}>{config.icon}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold ${config.textColor}`}>
                HUBZone Residency: {config.label}
              </h3>
              {hubzoneType && verificationStatus === 'verified' && (
                <span className="px-2 py-0.5 text-xs font-medium bg-hubzone-100 text-hubzone-700 rounded-full">
                  {hubzoneType}
                </span>
              )}
            </div>
            
            {/* Address Display */}
            <div className="mt-2">
              <p className={`text-sm ${config.textColor.replace('700', '600')}`}>
                {address.street1}
                {address.street2 && `, ${address.street2}`}
              </p>
              <p className={`text-sm ${config.textColor.replace('700', '600')}`}>
                {address.city}, {address.state} {address.zipCode}
              </p>
            </div>

            {/* Verification Dates */}
            {verificationStatus === 'verified' && lastVerifiedAt && (
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                <span className={config.textColor.replace('700', '600')}>
                  Verified: {formatDate(lastVerifiedAt)}
                </span>
                {nextVerificationDue && (
                  <span className={`${
                    daysUntilExpiration && daysUntilExpiration <= 30
                      ? 'text-amber-600 font-medium'
                      : config.textColor.replace('700', '600')
                  }`}>
                    {daysUntilExpiration && daysUntilExpiration <= 0 
                      ? 'Expired' 
                      : `Expires: ${formatDate(nextVerificationDue)}`}
                    {daysUntilExpiration && daysUntilExpiration > 0 && daysUntilExpiration <= 30 && (
                      <span className="ml-1">({daysUntilExpiration} days remaining)</span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              verificationStatus === 'verified'
                ? 'bg-verified-600 text-white hover:bg-verified-700 disabled:bg-verified-400'
                : 'bg-hubzone-600 text-white hover:bg-hubzone-700 disabled:bg-hubzone-400'
            }`}
          >
            {isVerifying ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying...
              </>
            ) : verificationStatus === 'verified' ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-verify Address
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Verify Address
              </>
            )}
          </button>

          {verificationStatus === 'verified' && certificate && (
            <button
              onClick={handleDownloadCertificate}
              disabled={isDownloading}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Downloading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Certificate (PDF)
                </>
              )}
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Certificate Display */}
      {certificate && certificate.isValid && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-hubzone-50 to-verified-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-hubzone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              HUBZone Residency Verification Certificate
            </h3>
          </div>
          <div className="p-5">
            <div className="flex items-start gap-6">
              {/* Certificate Details */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Certificate Number</p>
                    <p className="font-mono text-gray-900">{certificate.certificateNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">HUBZone Type</p>
                    <p className="text-gray-900">{certificate.hubzoneType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Verification Date</p>
                    <p className="text-gray-900">{formatDate(certificate.verificationDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Valid Until</p>
                    <p className="text-gray-900">{formatDate(certificate.expirationDate)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Verified Address</p>
                  <p className="text-gray-900">
                    {certificate.address.street1}
                    {certificate.address.street2 && `, ${certificate.address.street2}`}
                    <br />
                    {certificate.address.city}, {certificate.address.state} {certificate.address.zipCode}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-verified-700 font-medium">Digitally Signed by HZ Navigator</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Scan the QR code to verify authenticity
                  </p>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-white border border-gray-200 rounded-lg p-2 flex items-center justify-center">
                  {certificate.qrCodeData ? (
                    <img
                      src={certificate.qrCodeData}
                      alt="Verification QR Code"
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="text-center">
                      <svg className="w-12 h-12 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h2M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <p className="text-xs text-gray-400 mt-1">QR Code</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Notice */}
      <div className="bg-hubzone-50 border border-hubzone-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-hubzone-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-hubzone-900">About HUBZone Residency Verification</h4>
            <ul className="mt-1 text-sm text-hubzone-700 space-y-1">
              <li>• Verification certificates are valid for <strong>90 days</strong></li>
              <li>• Your address is checked against official HUBZone boundaries</li>
              <li>• Businesses can verify your certificate using the QR code</li>
              <li>• Keep your address up to date to maintain verification status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export { ResidencyVerification };

