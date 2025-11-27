import { useState, useCallback } from 'react';
import type { Employee, HubzoneResidenceStatus, EmploymentStatus } from '../../types/employee';
import { AddressHistory } from './AddressHistory';

interface EmployeeDetailProps {
  employee: Employee;
  onEdit: () => void;
  onTerminate: (terminationDate: string, notes?: string) => Promise<void>;
  onClose: () => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getHubzoneStatusConfig(status: HubzoneResidenceStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'resident':
      return { label: 'HUBZone Resident', color: 'text-verified-700', bgColor: 'bg-verified-100' };
    case 'non_resident':
      return { label: 'Non-HUBZone', color: 'text-amber-700', bgColor: 'bg-amber-100' };
    case 'pending_verification':
      return { label: 'Pending Verification', color: 'text-blue-700', bgColor: 'bg-blue-100' };
    default:
      return { label: 'Unknown', color: 'text-gray-700', bgColor: 'bg-gray-100' };
  }
}

function getEmploymentStatusConfig(status: EmploymentStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'active':
      return { label: 'Active', color: 'text-verified-700', bgColor: 'bg-verified-100' };
    case 'on_leave':
      return { label: 'On Leave', color: 'text-amber-700', bgColor: 'bg-amber-100' };
    case 'terminated':
      return { label: 'Terminated', color: 'text-red-700', bgColor: 'bg-red-100' };
    default:
      return { label: 'Unknown', color: 'text-gray-700', bgColor: 'bg-gray-100' };
  }
}

export default function EmployeeDetail({
  employee,
  onEdit,
  onTerminate,
  onClose,
}: EmployeeDetailProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminationDate, setTerminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [terminationNotes, setTerminationNotes] = useState('');
  const [isTerminating, setIsTerminating] = useState(false);

  const hubzoneConfig = getHubzoneStatusConfig(employee.hubzoneStatus);
  const employmentConfig = getEmploymentStatusConfig(employee.employmentStatus);

  const handleTerminate = useCallback(async () => {
    setIsTerminating(true);
    try {
      await onTerminate(terminationDate, terminationNotes || undefined);
      setShowTerminateModal(false);
    } catch (error) {
      console.error('Failed to terminate employee:', error);
    } finally {
      setIsTerminating(false);
    }
  }, [terminationDate, terminationNotes, onTerminate]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-hubzone-600 to-hubzone-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {employee.firstName} {employee.lastName}
              </h2>
              {employee.jobTitle && (
                <p className="text-hubzone-100">{employee.jobTitle}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${hubzoneConfig.bgColor} ${hubzoneConfig.color}`}>
                  {hubzoneConfig.label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${employmentConfig.bgColor} ${employmentConfig.color}`}>
                  {employmentConfig.label}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-hubzone-600 text-hubzone-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-hubzone-600 text-hubzone-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Address History
            {employee.addressHistory.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                {employee.addressHistory.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'details' ? (
          <div className="space-y-6">
            {/* Contact Information */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {employee.email && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</dt>
                    <dd className="mt-1">
                      <a href={`mailto:${employee.email}`} className="text-hubzone-600 hover:text-hubzone-700">
                        {employee.email}
                      </a>
                    </dd>
                  </div>
                )}
                {employee.phone && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</dt>
                    <dd className="mt-1 text-gray-900">{employee.phone}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Employment Details */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Employment Details</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Employment Date</dt>
                  <dd className="mt-1 text-gray-900">{formatDate(employee.employmentDate)}</dd>
                </div>
                {employee.department && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Department</dt>
                    <dd className="mt-1 text-gray-900">{employee.department}</dd>
                  </div>
                )}
                {employee.terminationDate && (
                  <div>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">Termination Date</dt>
                    <dd className="mt-1 text-red-600">{formatDate(employee.terminationDate)}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Current Address */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Address</h3>
              <div className={`p-4 rounded-xl border ${
                employee.hubzoneStatus === 'resident' 
                  ? 'bg-verified-50 border-verified-200'
                  : employee.hubzoneStatus === 'non_resident'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <address className="not-italic text-gray-900">
                      <p className="font-medium">{employee.currentAddress.street1}</p>
                      {employee.currentAddress.street2 && (
                        <p>{employee.currentAddress.street2}</p>
                      )}
                      <p>
                        {employee.currentAddress.city}, {employee.currentAddress.state} {employee.currentAddress.zipCode}
                      </p>
                    </address>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${hubzoneConfig.bgColor} ${hubzoneConfig.color}`}>
                        {employee.hubzoneStatus === 'resident' && (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {hubzoneConfig.label}
                      </span>
                      {employee.hubzoneType && (
                        <span className="text-xs text-gray-500">
                          {employee.hubzoneType}
                        </span>
                      )}
                    </div>

                    {employee.lastVerifiedAt && (
                      <p className="mt-2 text-xs text-gray-500">
                        <svg className="inline-block w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Last verified {formatDate(employee.lastVerifiedAt)}
                      </p>
                    )}
                  </div>

                  {/* Map placeholder */}
                  <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </section>

            {/* Metadata */}
            <section className="pt-4 border-t border-gray-200">
              <dl className="flex items-center gap-6 text-xs text-gray-500">
                <div>
                  <dt className="inline">Created:</dt>
                  <dd className="inline ml-1">{formatDate(employee.createdAt)}</dd>
                </div>
                <div>
                  <dt className="inline">Updated:</dt>
                  <dd className="inline ml-1">{formatDate(employee.updatedAt)}</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : (
          <AddressHistory history={employee.addressHistory} showComplianceNotes />
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div>
          {employee.employmentStatus === 'active' && (
            <button
              onClick={() => setShowTerminateModal(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Terminate Employment
            </button>
          )}
        </div>
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-2 px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Employee
        </button>
      </div>

      {/* Terminate Modal */}
      {showTerminateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowTerminateModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Terminate Employment</h3>
                  <p className="text-sm text-gray-500">
                    {employee.firstName} {employee.lastName}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to terminate this employee? This action will affect your HUBZone compliance calculations.
              </p>

              {employee.hubzoneStatus === 'resident' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-amber-800">
                      <strong>Compliance Warning:</strong> This employee is a HUBZone resident. 
                      Terminating them may negatively impact your compliance percentage.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="terminationDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Termination Date
                  </label>
                  <input
                    type="date"
                    id="terminationDate"
                    value={terminationDate}
                    onChange={(e) => setTerminationDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="terminationNotes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    id="terminationNotes"
                    rows={3}
                    value={terminationNotes}
                    onChange={(e) => setTerminationNotes(e.target.value)}
                    placeholder="Reason for termination..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowTerminateModal(false)}
                  disabled={isTerminating}
                  className="px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTerminate}
                  disabled={isTerminating}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isTerminating ? 'Processing...' : 'Terminate Employee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { EmployeeDetail };

