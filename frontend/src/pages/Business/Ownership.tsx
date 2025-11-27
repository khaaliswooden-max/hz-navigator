import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { OwnerForm } from '../../components/Business/OwnerForm';
import { OwnershipChart } from '../../components/Business/OwnershipChart';
import ownershipService from '../../services/ownershipService';
import { 
  calculateOwnershipSummary, 
  getComplianceRecommendations,
  type Owner, 
  type OwnerFormData,
  type OwnershipSummary,
  type ComplianceRecommendation,
} from '../../types/ownership';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

export default function Ownership() {
  const { id: businessId } = useParams<{ id: string }>();
  
  // Data states
  const [owners, setOwners] = useState<Owner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Calculate summary
  const summary: OwnershipSummary = useMemo(() => {
    return calculateOwnershipSummary(owners);
  }, [owners]);

  // Get recommendations
  const recommendations: ComplianceRecommendation[] = useMemo(() => {
    return getComplianceRecommendations(summary);
  }, [summary]);

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

  // Fetch owners
  const fetchOwners = useCallback(async () => {
    if (!businessId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await ownershipService.getOwners(businessId);
      if (response.success && response.data) {
        setOwners(response.data);
      } else {
        setError(response.error?.message || 'Failed to load ownership data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ownership data');
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  // Handle add owner
  const handleAddOwner = async (data: OwnerFormData) => {
    if (!businessId) return;
    
    setIsSubmitting(true);
    try {
      const response = await ownershipService.createOwner(businessId, data);
      if (response.success && response.data) {
        setOwners(prev => [...prev, response.data!]);
        setShowAddModal(false);
        showToast('success', 'Owner added successfully');
      } else {
        showToast('error', response.error?.message || 'Failed to add owner');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add owner');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit owner
  const handleEditOwner = async (data: OwnerFormData) => {
    if (!businessId || !editingOwner) return;
    
    setIsSubmitting(true);
    try {
      const response = await ownershipService.updateOwner(businessId, editingOwner.id, data);
      if (response.success && response.data) {
        setOwners(prev => prev.map(o => o.id === editingOwner.id ? response.data! : o));
        setShowEditModal(false);
        setEditingOwner(null);
        showToast('success', 'Owner updated successfully');
      } else {
        showToast('error', response.error?.message || 'Failed to update owner');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update owner');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete owner
  const handleDeleteOwner = async (ownerId: string) => {
    if (!businessId) return;
    
    try {
      const response = await ownershipService.deleteOwner(businessId, ownerId);
      if (response.success) {
        setOwners(prev => prev.filter(o => o.id !== ownerId));
        setShowDeleteConfirm(null);
        showToast('success', 'Owner removed successfully');
      } else {
        showToast('error', response.error?.message || 'Failed to remove owner');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to remove owner');
    }
  };

  // Open edit modal
  const openEditModal = (owner: Owner) => {
    setEditingOwner(owner);
    setShowEditModal(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-64 bg-gray-200 rounded" />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded" />
              ))}
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
              <h3 className="font-semibold text-red-900">Error Loading Ownership Data</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchOwners}
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
            <span className={`text-sm font-medium ${toast.type === 'success' ? 'text-verified-800' : 'text-red-800'}`}>
              {toast.message}
            </span>
            <button onClick={() => removeToast(toast.id)} className="ml-2 text-gray-400 hover:text-gray-600">
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
            <Link to={`/businesses/${businessId}`} className="hover:text-gray-700">Business Profile</Link>
            <span>/</span>
            <span className="text-gray-700">Ownership</span>
          </div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Ownership Structure
          </h1>
          <p className="text-gray-500 mt-1">
            Manage business ownership and verify HUBZone eligibility requirements
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          disabled={summary.totalOwnershipPercentage >= 100}
          className="inline-flex items-center gap-2 px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Owner
        </button>
      </div>

      {/* Validation Warning Banner */}
      {(!summary.isValid || !summary.isCompliant) && owners.length > 0 && (
        <div className={`p-4 rounded-xl border ${
          summary.totalOwnershipPercentage > 100
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start gap-3">
            <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              summary.totalOwnershipPercentage > 100 ? 'text-red-600' : 'text-amber-600'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className={`font-semibold ${
                summary.totalOwnershipPercentage > 100 ? 'text-red-800' : 'text-amber-800'
              }`}>
                {summary.totalOwnershipPercentage > 100
                  ? 'Total Ownership Exceeds 100%'
                  : !summary.isValid
                  ? 'Ownership Structure Incomplete'
                  : 'US Citizen Ownership Below Requirement'
                }
              </h3>
              <p className={`text-sm mt-1 ${
                summary.totalOwnershipPercentage > 100 ? 'text-red-700' : 'text-amber-700'
              }`}>
                {summary.totalOwnershipPercentage > 100
                  ? `Current total is ${summary.totalOwnershipPercentage.toFixed(2)}%. Reduce ownership to equal 100%.`
                  : !summary.isValid
                  ? `Current total is ${summary.totalOwnershipPercentage.toFixed(2)}%. Add ${summary.remainingPercentage.toFixed(2)}% more to reach 100%.`
                  : `US citizen ownership is ${summary.usCitizenOwnershipPercentage.toFixed(2)}%. Increase to at least 51% for HUBZone eligibility.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ownership Distribution</h2>
          {owners.length > 0 ? (
            <OwnershipChart 
              owners={owners} 
              summary={summary}
              showCompliance
              showLegend
              height={280}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">No Owners Added</h3>
              <p className="text-sm text-gray-500 mb-4">Add business owners to track ownership structure</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add First Owner
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Owners List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Owners ({owners.length})</h2>
            {summary.remainingPercentage > 0 && (
              <span className="text-sm text-amber-600">
                {summary.remainingPercentage.toFixed(2)}% remaining
              </span>
            )}
          </div>
          
          {owners.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {owners.map(owner => (
                <div key={owner.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        owner.isUsCitizen ? 'bg-verified-100' : 'bg-gray-100'
                      }`}>
                        <span className={`text-lg font-bold ${
                          owner.isUsCitizen ? 'text-verified-700' : 'text-gray-500'
                        }`}>
                          {owner.ownerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{owner.ownerName}</p>
                          {owner.isControlPerson && (
                            <span className="px-2 py-0.5 bg-hubzone-100 text-hubzone-700 text-xs font-medium rounded-full">
                              Control Person
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            owner.isUsCitizen 
                              ? 'bg-verified-100 text-verified-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {owner.isUsCitizen ? (
                              <>
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                US Citizen
                              </>
                            ) : (
                              'Non-Citizen'
                            )}
                          </span>
                          {owner.title && (
                            <span className="text-xs text-gray-500">{owner.title}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">
                          {owner.ownershipPercentage.toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500">ownership</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(owner)}
                          className="p-2 text-gray-400 hover:text-hubzone-600 hover:bg-hubzone-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(owner.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No owners added yet
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status & Recommendations</h2>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-xl border ${
                  rec.type === 'success' 
                    ? 'bg-verified-50 border-verified-200'
                    : rec.type === 'error'
                    ? 'bg-red-50 border-red-200'
                    : rec.type === 'warning'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {rec.type === 'success' ? (
                    <svg className="w-5 h-5 text-verified-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : rec.type === 'error' ? (
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : rec.type === 'warning' ? (
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <div>
                    <h4 className={`font-semibold ${
                      rec.type === 'success' ? 'text-verified-800' :
                      rec.type === 'error' ? 'text-red-800' :
                      rec.type === 'warning' ? 'text-amber-800' :
                      'text-blue-800'
                    }`}>
                      {rec.title}
                    </h4>
                    <p className={`text-sm mt-1 ${
                      rec.type === 'success' ? 'text-verified-700' :
                      rec.type === 'error' ? 'text-red-700' :
                      rec.type === 'warning' ? 'text-amber-700' :
                      'text-blue-700'
                    }`}>
                      {rec.message}
                    </p>
                    {rec.action && (
                      <p className={`text-sm mt-2 font-medium ${
                        rec.type === 'success' ? 'text-verified-600' :
                        rec.type === 'error' ? 'text-red-600' :
                        rec.type === 'warning' ? 'text-amber-600' :
                        'text-blue-600'
                      }`}>
                        💡 {rec.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HUBZone Requirements Info */}
      <div className="bg-hubzone-50 rounded-xl border border-hubzone-200 p-6">
        <h2 className="text-lg font-semibold text-hubzone-900 mb-3">HUBZone Ownership Requirements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-hubzone-800 mb-2">US Citizen Ownership</h3>
            <p className="text-sm text-hubzone-700">
              At least 51% of the business must be unconditionally and directly owned by US citizens. 
              This is a fundamental requirement for HUBZone certification.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-hubzone-800 mb-2">Control Requirements</h3>
            <p className="text-sm text-hubzone-700">
              The business must be controlled by US citizens. Management and daily operations 
              must be controlled by one or more US citizen owners.
            </p>
          </div>
        </div>
      </div>

      {/* Add Owner Modal */}
      <OwnerForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddOwner}
        currentOwners={owners}
        mode="create"
        isLoading={isSubmitting}
      />

      {/* Edit Owner Modal */}
      {editingOwner && (
        <OwnerForm
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingOwner(null);
          }}
          onSubmit={handleEditOwner}
          initialData={{
            ownerName: editingOwner.ownerName,
            ownershipPercentage: editingOwner.ownershipPercentage,
            isUsCitizen: editingOwner.isUsCitizen,
            isControlPerson: editingOwner.isControlPerson,
            title: editingOwner.title || '',
            email: editingOwner.email || '',
            phone: editingOwner.phone || '',
          }}
          editingOwner={editingOwner}
          currentOwners={owners}
          mode="edit"
          isLoading={isSubmitting}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Remove Owner</h3>
                  <p className="text-sm text-gray-500">
                    {owners.find(o => o.id === showDeleteConfirm)?.ownerName}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to remove this owner? This action will affect your ownership structure and may impact compliance.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteOwner(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remove Owner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { Ownership };

