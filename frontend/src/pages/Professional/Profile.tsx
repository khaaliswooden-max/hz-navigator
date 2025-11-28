import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ProfileForm } from '../../components/Professional/ProfileForm';
import { ResidencyVerification } from '../../components/Professional/ResidencyVerification';
import professionalService from '../../services/professionalService';
import type { Professional, ProfessionalFormData } from '../../types/professional';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export default function Profile() {
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'verification'>('profile');

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

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await professionalService.getMyProfile();

      if (response.success && response.data) {
        setProfessional(response.data);
      } else {
        // If no profile exists, allow creation
        if (response.error?.code === 'NOT_FOUND') {
          setProfessional(null);
          setIsEditMode(true);
        } else {
          setError(response.error?.message || 'Failed to load profile');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle form submission
  const handleSubmit = async (data: ProfessionalFormData) => {
    setIsSaving(true);

    try {
      const response = await professionalService.updateProfile(data);

      if (response.success && response.data) {
        setProfessional(response.data);
        setIsEditMode(false);
        showToast('success', 'Profile updated successfully');
      } else {
        showToast('error', response.error?.message || 'Failed to update profile');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle resume upload
  const handleResumeUpload = async (file: File) => {
    const response = await professionalService.uploadResume(file);
    if (response.success && response.data) {
      setProfessional((prev) =>
        prev ? { ...prev, resumeUrl: response.data!.resumeUrl } : null
      );
      showToast('success', 'Resume uploaded successfully');
    } else {
      showToast('error', response.error?.message || 'Failed to upload resume');
    }
  };

  // Handle resume delete
  const handleResumeDelete = async () => {
    const response = await professionalService.deleteResume();
    if (response.success) {
      setProfessional((prev) => (prev ? { ...prev, resumeUrl: undefined } : null));
      showToast('success', 'Resume deleted');
    } else {
      showToast('error', response.error?.message || 'Failed to delete resume');
    }
  };

  // Handle verification
  const handleVerify = async () => {
    const response = await professionalService.verifyResidency();
    if (response.success && response.data) {
      // Refresh profile to get updated verification status
      await fetchProfile();
      showToast(
        response.data.isInHubzone ? 'success' : 'error',
        response.data.isInHubzone
          ? 'Address verified as HUBZone resident!'
          : 'Address is not within a HUBZone'
      );
    } else {
      showToast('error', response.error?.message || 'Verification failed');
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  // Calculate profile completion
  const calculateCompletion = (): number => {
    if (!professional) return 0;

    const fields = [
      professional.firstName,
      professional.lastName,
      professional.email,
      professional.phone,
      professional.headline,
      professional.summary,
      professional.currentAddress.street1,
      professional.currentAddress.city,
      professional.currentAddress.state,
      professional.currentAddress.zipCode,
      professional.skills.length > 0,
      professional.certifications.length > 0,
      professional.resumeUrl,
      professional.linkedinUrl,
      professional.verificationStatus === 'verified',
    ];

    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Profile</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchProfile}
                className="mt-3 text-sm font-medium text-red-600 hover:text-red-700"
              >
                Try again →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const profileCompletion = calculateCompletion();

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
            } animate-fade-in`}
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
            <span
              className={`text-sm font-medium ${
                toast.type === 'success' ? 'text-verified-800' : 'text-red-800'
              }`}
            >
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              className={`ml-2 ${
                toast.type === 'success'
                  ? 'text-verified-600 hover:text-verified-800'
                  : 'text-red-600 hover:text-red-800'
              }`}
            >
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
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/dashboard" className="hover:text-gray-700">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-gray-700">My Profile</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {professional
              ? `${professional.firstName} ${professional.lastName}`
              : 'Create Your Profile'}
          </h1>
          {professional?.headline && (
            <p className="text-gray-500 mt-1">{professional.headline}</p>
          )}
        </div>
        {professional && !isEditMode && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditMode(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation (only in view mode) */}
      {professional && !isEditMode && (
        <div className="border-b border-gray-200">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-hubzone-600 text-hubzone-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('verification')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'verification'
                  ? 'border-hubzone-600 text-hubzone-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              HUBZone Verification
              {professional.verificationStatus === 'verified' && (
                <span className="w-2 h-2 bg-verified-500 rounded-full" />
              )}
            </button>
          </nav>
        </div>
      )}

      {/* Content */}
      {isEditMode ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              {professional ? 'Edit Profile' : 'Create Profile'}
            </h2>
            <span className="text-sm text-gray-500">Make changes and save</span>
          </div>
          <ProfileForm
            initialData={
              professional
                ? {
                    firstName: professional.firstName,
                    lastName: professional.lastName,
                    email: professional.email,
                    phone: professional.phone || '',
                    headline: professional.headline || '',
                    summary: professional.summary || '',
                    linkedinUrl: professional.linkedinUrl || '',
                    currentAddress: professional.currentAddress,
                    skills: professional.skills,
                    certifications: professional.certifications,
                    isPublic: professional.isPublic,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            onCancel={professional ? handleCancel : undefined}
            isLoading={isSaving}
            resumeUrl={professional?.resumeUrl}
            onResumeUpload={handleResumeUpload}
            onResumeDelete={handleResumeDelete}
          />
        </div>
      ) : professional ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'profile' ? (
              <>
                {/* Personal Information */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Personal Information</h3>
                  </div>
                  <div className="p-6">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                        <dd className="mt-1 text-gray-900">
                          {professional.firstName} {professional.lastName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Email</dt>
                        <dd className="mt-1 text-gray-900">{professional.email}</dd>
                      </div>
                      {professional.phone && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Phone</dt>
                          <dd className="mt-1 text-gray-900">{professional.phone}</dd>
                        </div>
                      )}
                      {professional.linkedinUrl && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">LinkedIn</dt>
                          <dd className="mt-1">
                            <a
                              href={professional.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-hubzone-600 hover:text-hubzone-700 flex items-center gap-1"
                            >
                              View Profile
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                    {professional.summary && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <dt className="text-sm font-medium text-gray-500 mb-2">Summary</dt>
                        <dd className="text-gray-700 whitespace-pre-wrap">{professional.summary}</dd>
                      </div>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Current Address</h3>
                  </div>
                  <div className="p-6">
                    <address className="not-italic text-gray-900">
                      <p>{professional.currentAddress.street1}</p>
                      {professional.currentAddress.street2 && (
                        <p>{professional.currentAddress.street2}</p>
                      )}
                      <p>
                        {professional.currentAddress.city}, {professional.currentAddress.state}{' '}
                        {professional.currentAddress.zipCode}
                      </p>
                    </address>
                  </div>
                </div>

                {/* Skills */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Skills</h3>
                  </div>
                  <div className="p-6">
                    {professional.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {professional.skills.map((skill) => (
                          <span
                            key={skill.id}
                            className="px-3 py-1.5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 text-violet-800 rounded-lg text-sm font-medium"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No skills added yet</p>
                    )}
                  </div>
                </div>

                {/* Certifications */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Certifications</h3>
                  </div>
                  <div className="p-6">
                    {professional.certifications.length > 0 ? (
                      <div className="space-y-4">
                        {professional.certifications.map((cert) => (
                          <div
                            key={cert.id}
                            className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl"
                          >
                            <h4 className="font-medium text-gray-900">{cert.name}</h4>
                            <p className="text-sm text-gray-600">{cert.issuingOrganization}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>
                                Issued: {new Date(cert.issueDate).toLocaleDateString()}
                              </span>
                              {cert.expirationDate && (
                                <span>
                                  Expires: {new Date(cert.expirationDate).toLocaleDateString()}
                                </span>
                              )}
                              {cert.credentialId && <span>ID: {cert.credentialId}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No certifications added yet</p>
                    )}
                  </div>
                </div>

                {/* Resume */}
                {professional.resumeUrl && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                      <h3 className="font-semibold text-gray-900">Resume</h3>
                    </div>
                    <div className="p-6">
                      <a
                        href={professional.resumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Resume
                      </a>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <ResidencyVerification
                address={professional.currentAddress}
                verificationStatus={professional.verificationStatus}
                hubzoneType={professional.hubzoneType}
                lastVerifiedAt={professional.lastVerifiedAt}
                nextVerificationDue={professional.nextVerificationDue}
                certificate={professional.verificationCertificate}
                onVerify={handleVerify}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Completion */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Profile Completion</h3>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm font-semibold text-gray-900">{profileCompletion}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      profileCompletion === 100
                        ? 'bg-verified-500'
                        : profileCompletion >= 75
                        ? 'bg-hubzone-500'
                        : profileCompletion >= 50
                        ? 'bg-amber-500'
                        : 'bg-gray-400'
                    }`}
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                {profileCompletion < 100 && (
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="mt-3 text-sm text-hubzone-600 hover:text-hubzone-700 font-medium"
                  >
                    Complete your profile →
                  </button>
                )}
              </div>
            </div>

            {/* Verification Status Card */}
            <div className={`rounded-xl border shadow-sm overflow-hidden ${
              professional.verificationStatus === 'verified'
                ? 'bg-verified-50 border-verified-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  {professional.verificationStatus === 'verified' ? (
                    <div className="w-10 h-10 rounded-full bg-verified-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <h4 className={`font-semibold ${
                      professional.verificationStatus === 'verified' ? 'text-verified-900' : 'text-amber-900'
                    }`}>
                      {professional.verificationStatus === 'verified'
                        ? 'HUBZone Verified'
                        : 'Not Verified'}
                    </h4>
                    {professional.hubzoneType && (
                      <p className={`text-sm ${
                        professional.verificationStatus === 'verified' ? 'text-verified-700' : 'text-amber-700'
                      }`}>
                        {professional.hubzoneType}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('verification')}
                  className={`w-full py-2 rounded-lg text-sm font-medium ${
                    professional.verificationStatus === 'verified'
                      ? 'bg-verified-600 text-white hover:bg-verified-700'
                      : 'bg-amber-600 text-white hover:bg-amber-700'
                  }`}
                >
                  {professional.verificationStatus === 'verified' ? 'View Certificate' : 'Verify Now'}
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => setIsEditMode(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-sm font-medium">Edit Profile</span>
                </button>
                <Link
                  to="/check"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span className="text-sm font-medium">HUBZone Map</span>
                </Link>
                <Link
                  to="/jobs"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium">Browse Jobs</span>
                </Link>
              </div>
            </div>

            {/* Profile Visibility */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Profile Visibility</p>
              <p className="text-sm font-medium text-gray-700 mt-1">
                {professional.isPublic ? (
                  <span className="flex items-center justify-center gap-1">
                    <svg className="w-4 h-4 text-verified-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Public (Visible to businesses)
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    Private
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {professional.profileViewCount} profile views
              </p>
            </div>

            {/* Last Updated */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Last updated</p>
              <p className="text-sm font-medium text-gray-700">
                {new Date(professional.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { Profile };

