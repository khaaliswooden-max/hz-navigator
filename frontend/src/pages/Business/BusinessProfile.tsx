import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BusinessForm } from '../../components/Business/BusinessForm';
import { CertificationStatus } from '../../components/Business/CertificationStatus';
import businessService from '../../services/businessService';
import type { BusinessProfile as BusinessProfileType, BusinessFormData } from '../../types/business';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export default function BusinessProfile() {
  const { id } = useParams<{ id: string }>();
  
  const [business, setBusiness] = useState<BusinessProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast helper
  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch business data
  const fetchBusiness = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = id 
        ? await businessService.getBusiness(id)
        : await businessService.getMyBusiness();
      
      if (response.success && response.data) {
        setBusiness(response.data);
      } else {
        setError(response.error?.message || 'Failed to load business profile');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  // Handle form submission with optimistic updates
  const handleSubmit = async (data: BusinessFormData) => {
    if (!business) return;

    const previousBusiness = { ...business };
    
    // Optimistic update
    setBusiness(prev => prev ? {
      ...prev,
      ...data,
    } : null);
    
    setIsSaving(true);

    try {
      const response = await businessService.updateBusiness(business.id, data);
      
      if (response.success && response.data) {
        setBusiness(response.data);
        setIsEditMode(false);
        showToast('success', 'Business profile updated successfully');
      } else {
        // Rollback on error
        setBusiness(previousBusiness);
        showToast('error', response.error?.message || 'Failed to update business profile');
      }
    } catch (err) {
      // Rollback on error
      setBusiness(previousBusiness);
      showToast('error', err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  // Format ownership type for display
  const formatOwnershipType = (type: string): string => {
    const types: Record<string, string> = {
      sole_proprietor: 'Sole Proprietor',
      partnership: 'Partnership',
      llc: 'LLC',
      corporation: 'Corporation',
      s_corporation: 'S Corporation',
      non_profit: 'Non-Profit',
      other: 'Other',
    };
    return types[type] || type;
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
              <h3 className="font-semibold text-red-900">Error Loading Business Profile</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchBusiness}
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

  // No business found
  if (!business) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Business Profile Found</h3>
          <p className="text-gray-500 mb-6">Get started by creating your business profile</p>
          <Link
            to="/businesses/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-hubzone-600 text-white font-medium rounded-xl hover:bg-hubzone-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Business Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
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
            <span className={`text-sm font-medium ${
              toast.type === 'success' ? 'text-verified-800' : 'text-red-800'
            }`}>
              {toast.message}
            </span>
            <button
              onClick={() => removeToast(toast.id)}
              className={`ml-2 ${
                toast.type === 'success' ? 'text-verified-600 hover:text-verified-800' : 'text-red-600 hover:text-red-800'
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
            <Link to="/businesses" className="hover:text-gray-700">Businesses</Link>
            <span>/</span>
            <span className="text-gray-700">Profile</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            {business.legalName}
          </h1>
          {business.dbaName && (
            <p className="text-gray-500 mt-1">DBA: {business.dbaName}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isEditMode && (
            <button
              onClick={() => setIsEditMode(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {isEditMode ? (
        /* Edit Mode - Show Form */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Edit Business Profile</h2>
            <span className="text-sm text-gray-500">Make changes and save</span>
          </div>
          <BusinessForm
            initialData={{
              legalName: business.legalName,
              dbaName: business.dbaName || '',
              ueiNumber: business.ueiNumber,
              cageCode: business.cageCode || '',
              phone: business.phone,
              email: business.email || '',
              website: business.website || '',
              principalOffice: business.principalOffice,
              ownershipType: business.ownershipType,
              dateEstablished: business.dateEstablished,
              employeeCount: business.employeeCount,
              naicsCodes: business.naicsCodes,
            }}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={isSaving}
            mode="edit"
          />
        </div>
      ) : (
        /* View Mode - Display Profile */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Basic Information</h3>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Legal Name</dt>
                    <dd className="mt-1 text-gray-900">{business.legalName}</dd>
                  </div>
                  {business.dbaName && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">DBA Name</dt>
                      <dd className="mt-1 text-gray-900">{business.dbaName}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">UEI Number</dt>
                    <dd className="mt-1 font-mono text-gray-900">{business.ueiNumber}</dd>
                  </div>
                  {business.cageCode && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">CAGE Code</dt>
                      <dd className="mt-1 font-mono text-gray-900">{business.cageCode}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-gray-900">{business.phone}</dd>
                  </div>
                  {business.email && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-gray-900">{business.email}</dd>
                    </div>
                  )}
                  {business.website && (
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Website</dt>
                      <dd className="mt-1">
                        <a 
                          href={business.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-hubzone-600 hover:text-hubzone-700"
                        >
                          {business.website}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Address */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Principal Office Address</h3>
              </div>
              <div className="p-6">
                <address className="not-italic text-gray-900">
                  <p>{business.principalOffice.street1}</p>
                  {business.principalOffice.street2 && (
                    <p>{business.principalOffice.street2}</p>
                  )}
                  <p>
                    {business.principalOffice.city}, {business.principalOffice.state} {business.principalOffice.zipCode}
                  </p>
                </address>
              </div>
            </div>

            {/* Ownership Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">Ownership Details</h3>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ownership Type</dt>
                    <dd className="mt-1 text-gray-900">{formatOwnershipType(business.ownershipType)}</dd>
                  </div>
                  {business.dateEstablished && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Date Established</dt>
                      <dd className="mt-1 text-gray-900">
                        {new Date(business.dateEstablished).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </dd>
                    </div>
                  )}
                  {business.employeeCount !== undefined && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Employees</dt>
                      <dd className="mt-1 text-gray-900">{business.employeeCount.toLocaleString()}</dd>
                    </div>
                  )}
                </dl>

                {/* Owners list */}
                {business.owners && business.owners.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">Business Owners</h4>
                    <div className="space-y-3">
                      {business.owners.map(owner => (
                        <div key={owner.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">
                              {owner.firstName} {owner.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{owner.title}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{owner.ownershipPercentage}%</p>
                            {owner.isControlPerson && (
                              <span className="text-xs text-hubzone-600">Control Person</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* NAICS Codes */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-semibold text-gray-900">NAICS Codes</h3>
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  {business.naicsCodes.map((code, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      {code.isPrimary && (
                        <span className="px-2 py-0.5 bg-hubzone-100 text-hubzone-700 text-xs font-medium rounded-full">
                          Primary
                        </span>
                      )}
                      <span className="font-mono text-sm text-hubzone-600">{code.code}</span>
                      <span className="text-sm text-gray-600">{code.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Certification Status */}
            <CertificationStatus
              status={business.certificationStatus}
              certificationDate={business.certificationDate}
              expirationDate={business.expirationDate}
              showDetails
            />

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
                  <span className="text-sm font-medium">Verify HUBZone Location</span>
                </Link>
                <Link
                  to="/certifications"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span className="text-sm font-medium">View Certification</span>
                </Link>
                <Link
                  to="/documents"
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium">Manage Documents</span>
                </Link>
              </div>
            </div>

            {/* Last Updated */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">Last updated</p>
              <p className="text-sm font-medium text-gray-700">
                {new Date(business.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { BusinessProfile };

