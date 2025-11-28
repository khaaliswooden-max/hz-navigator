/**
 * Business Management Page
 * List businesses, approve/deny certifications, compliance overrides, audit logs, bulk operations
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AdminBusiness, CertificationStatus, BusinessFilters } from '../../types/admin';

// Mock data
const mockBusinesses: AdminBusiness[] = [
  {
    id: '1',
    name: 'ABC Federal Solutions',
    ueiNumber: 'ABC123456789',
    ein: '12-3456789',
    ownerName: 'John Smith',
    ownerEmail: 'john@abcfederal.com',
    certificationStatus: 'approved',
    certificationDate: '2023-06-15T00:00:00Z',
    expirationDate: '2026-06-15T00:00:00Z',
    complianceScore: 92,
    riskLevel: 'low',
    employeeCount: 45,
    hubzoneResidencyRate: 42,
    createdAt: '2023-01-10T10:00:00Z',
    lastUpdated: '2024-01-15T14:30:00Z',
  },
  {
    id: '2',
    name: 'XYZ Consulting LLC',
    ueiNumber: 'XYZ987654321',
    ein: '98-7654321',
    ownerName: 'Jane Doe',
    ownerEmail: 'jane@xyzconsulting.com',
    certificationStatus: 'pending',
    certificationDate: null,
    expirationDate: null,
    complianceScore: 75,
    riskLevel: 'medium',
    employeeCount: 28,
    hubzoneResidencyRate: 38,
    createdAt: '2024-01-05T09:00:00Z',
    lastUpdated: '2024-01-20T11:00:00Z',
  },
  {
    id: '3',
    name: 'Tech Solutions Inc',
    ueiNumber: 'TECH123456789',
    ein: '11-1111111',
    ownerName: 'Bob Wilson',
    ownerEmail: 'bob@techsolutions.com',
    certificationStatus: 'suspended',
    certificationDate: '2022-03-01T00:00:00Z',
    expirationDate: '2025-03-01T00:00:00Z',
    complianceScore: 45,
    riskLevel: 'high',
    employeeCount: 65,
    hubzoneResidencyRate: 28,
    createdAt: '2022-01-15T08:00:00Z',
    lastUpdated: '2024-01-18T16:45:00Z',
  },
  {
    id: '4',
    name: 'Green Energy Corp',
    ueiNumber: 'GREEN987654',
    ein: '22-2222222',
    ownerName: 'Sarah Miller',
    ownerEmail: 'sarah@greenenergy.com',
    certificationStatus: 'expired',
    certificationDate: '2021-01-01T00:00:00Z',
    expirationDate: '2024-01-01T00:00:00Z',
    complianceScore: 88,
    riskLevel: 'low',
    employeeCount: 120,
    hubzoneResidencyRate: 48,
    createdAt: '2020-06-20T12:00:00Z',
    lastUpdated: '2024-01-10T09:30:00Z',
  },
  {
    id: '5',
    name: 'Defense Contractors Pro',
    ueiNumber: 'DEF456789012',
    ein: '33-3333333',
    ownerName: 'Mike Roberts',
    ownerEmail: 'mike@defcon.com',
    certificationStatus: 'denied',
    certificationDate: null,
    expirationDate: null,
    complianceScore: 32,
    riskLevel: 'critical',
    employeeCount: 15,
    hubzoneResidencyRate: 22,
    createdAt: '2023-11-01T14:00:00Z',
    lastUpdated: '2024-01-12T10:15:00Z',
  },
];

const certificationStatusColors: Record<CertificationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  denied: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
  suspended: 'bg-orange-100 text-orange-800',
};

const riskColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
};

export default function BusinessManagement() {
  const [businesses, setBusinesses] = useState<AdminBusiness[]>(mockBusinesses);
  const [filters, setFilters] = useState<BusinessFilters>({
    search: '',
    certificationStatus: 'all',
    riskLevel: 'all',
    page: 1,
    limit: 10,
  });
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'deny' | 'suspend' | 'reinstate' | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<AdminBusiness | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Filtered businesses
  const filteredBusinesses = businesses.filter((business) => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (
        !business.name.toLowerCase().includes(search) &&
        !business.ueiNumber.toLowerCase().includes(search) &&
        !business.ownerName.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    if (filters.certificationStatus && filters.certificationStatus !== 'all' && business.certificationStatus !== filters.certificationStatus) {
      return false;
    }
    if (filters.riskLevel && filters.riskLevel !== 'all' && business.riskLevel !== filters.riskLevel) {
      return false;
    }
    return true;
  });

  const handleSelectAll = () => {
    if (selectedBusinesses.length === filteredBusinesses.length) {
      setSelectedBusinesses([]);
    } else {
      setSelectedBusinesses(filteredBusinesses.map((b) => b.id));
    }
  };

  const handleSelectBusiness = (businessId: string) => {
    setSelectedBusinesses((prev) =>
      prev.includes(businessId) ? prev.filter((id) => id !== businessId) : [...prev, businessId]
    );
  };

  const openActionModal = (business: AdminBusiness, action: 'approve' | 'deny' | 'suspend' | 'reinstate') => {
    setSelectedBusiness(business);
    setActionType(action);
    setActionReason('');
    setShowActionModal(true);
  };

  const handleCertificationAction = async () => {
    if (!selectedBusiness || !actionType) return;

    const statusMap: Record<string, CertificationStatus> = {
      approve: 'approved',
      deny: 'denied',
      suspend: 'suspended',
      reinstate: 'approved',
    };

    setBusinesses((prev) =>
      prev.map((b) =>
        b.id === selectedBusiness.id
          ? {
              ...b,
              certificationStatus: statusMap[actionType],
              certificationDate: actionType === 'approve' ? new Date().toISOString() : b.certificationDate,
              expirationDate: actionType === 'approve'
                ? new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString()
                : b.expirationDate,
            }
          : b
      )
    );

    setShowActionModal(false);
    setSelectedBusiness(null);
    setActionType(null);
    setActionReason('');
  };

  const handleBulkAction = async (action: string) => {
    if (selectedBusinesses.length === 0) return;
    if (!confirm(`Apply ${action} to ${selectedBusinesses.length} businesses?`)) return;

    const statusMap: Record<string, CertificationStatus> = {
      approve: 'approved',
      deny: 'denied',
      suspend: 'suspended',
    };

    if (statusMap[action]) {
      setBusinesses((prev) =>
        prev.map((b) =>
          selectedBusinesses.includes(b.id)
            ? { ...b, certificationStatus: statusMap[action] }
            : b
        )
      );
    }

    setSelectedBusinesses([]);
  };

  const getComplianceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Business Management</h1>
          <p className="text-gray-500 mt-1">Manage HUBZone certifications and compliance</p>
        </div>
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Businesses</p>
          <p className="text-2xl font-bold text-gray-900">{businesses.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">
            {businesses.filter((b) => b.certificationStatus === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">
            {businesses.filter((b) => b.certificationStatus === 'approved').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Suspended</p>
          <p className="text-2xl font-bold text-orange-600">
            {businesses.filter((b) => b.certificationStatus === 'suspended').length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-500">High Risk</p>
          <p className="text-2xl font-bold text-red-600">
            {businesses.filter((b) => b.riskLevel === 'high' || b.riskLevel === 'critical').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, UEI, or owner..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
              />
            </div>
          </div>

          <select
            value={filters.certificationStatus}
            onChange={(e) => setFilters({ ...filters, certificationStatus: e.target.value as CertificationStatus | 'all' })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="denied">Denied</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedBusinesses.length > 0 && (
          <div className="mt-4 flex items-center gap-4 p-3 bg-hubzone-50 rounded-lg">
            <span className="text-sm font-medium text-hubzone-700">
              {selectedBusinesses.length} businesses selected
            </span>
            <button
              onClick={() => handleBulkAction('approve')}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Approve All
            </button>
            <button
              onClick={() => handleBulkAction('deny')}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Deny All
            </button>
            <button
              onClick={() => handleBulkAction('suspend')}
              className="px-3 py-1 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700"
            >
              Suspend All
            </button>
            <button
              onClick={() => setSelectedBusinesses([])}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Business Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedBusinesses.length === filteredBusinesses.length && filteredBusinesses.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-hubzone-600 focus:ring-hubzone-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Business</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Risk</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Compliance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">HUBZone %</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBusinesses.map((business) => (
                <tr key={business.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedBusinesses.includes(business.id)}
                      onChange={() => handleSelectBusiness(business.id)}
                      className="rounded border-gray-300 text-hubzone-600 focus:ring-hubzone-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{business.name}</p>
                      <p className="text-xs text-gray-500">UEI: {business.ueiNumber}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-gray-900">{business.ownerName}</p>
                      <p className="text-xs text-gray-500">{business.ownerEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${certificationStatusColors[business.certificationStatus]}`}>
                      {business.certificationStatus.charAt(0).toUpperCase() + business.certificationStatus.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${riskColors[business.riskLevel]}`}>
                      {business.riskLevel.charAt(0).toUpperCase() + business.riskLevel.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${business.complianceScore >= 80 ? 'bg-green-500' : business.complianceScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${business.complianceScore}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getComplianceColor(business.complianceScore)}`}>
                        {business.complianceScore}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${business.hubzoneResidencyRate >= 35 ? 'text-green-600' : 'text-red-600'}`}>
                      {business.hubzoneResidencyRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {business.certificationStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => openActionModal(business, 'approve')}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Approve"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openActionModal(business, 'deny')}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Deny"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                      {business.certificationStatus === 'approved' && (
                        <button
                          onClick={() => openActionModal(business, 'suspend')}
                          className="p-1 text-orange-600 hover:text-orange-800"
                          title="Suspend"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                      {business.certificationStatus === 'suspended' && (
                        <button
                          onClick={() => openActionModal(business, 'reinstate')}
                          className="p-1 text-green-600 hover:text-green-800"
                          title="Reinstate"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedBusiness(business);
                          setShowAuditModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="View audit log"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <Link
                        to={`/businesses/${business.id}`}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="View details"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {filteredBusinesses.length} of {businesses.length} businesses
          </p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Previous</button>
            <span className="text-sm text-gray-600">Page 1 of 1</span>
            <button className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>

      {/* Certification Action Modal */}
      {showActionModal && selectedBusiness && actionType && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowActionModal(false)} />
            <div className="relative inline-block w-full max-w-lg p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {actionType === 'approve' && 'Approve Certification'}
                  {actionType === 'deny' && 'Deny Certification'}
                  {actionType === 'suspend' && 'Suspend Certification'}
                  {actionType === 'reinstate' && 'Reinstate Certification'}
                </h3>
                <button onClick={() => setShowActionModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{selectedBusiness.name}</p>
                  <p className="text-sm text-gray-500">UEI: {selectedBusiness.ueiNumber}</p>
                  <p className="text-sm text-gray-500">Owner: {selectedBusiness.ownerName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason {actionType !== 'approve' && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter reason for this action..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                </div>

                {actionType === 'approve' && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      This will approve the HUBZone certification for 3 years, expiring on{' '}
                      {new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
                    </p>
                  </div>
                )}

                {actionType === 'deny' && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">
                      This action will deny the certification application. The business owner will be notified via email.
                    </p>
                  </div>
                )}

                {actionType === 'suspend' && (
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-800">
                      Suspending this certification will immediately remove the business from active HUBZone status.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setShowActionModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancel
                </button>
                <button
                  onClick={handleCertificationAction}
                  disabled={actionType !== 'approve' && !actionReason.trim()}
                  className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${
                    actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                    actionType === 'deny' ? 'bg-red-600 hover:bg-red-700' :
                    actionType === 'suspend' ? 'bg-orange-600 hover:bg-orange-700' :
                    'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {actionType === 'approve' && 'Approve Certification'}
                  {actionType === 'deny' && 'Deny Certification'}
                  {actionType === 'suspend' && 'Suspend Certification'}
                  {actionType === 'reinstate' && 'Reinstate Certification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Modal */}
      {showAuditModal && selectedBusiness && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowAuditModal(false)} />
            <div className="relative inline-block w-full max-w-2xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Audit Log - {selectedBusiness.name}</h3>
                <button onClick={() => setShowAuditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {[
                  { action: 'Compliance score updated', user: 'System', timestamp: '2024-01-20T14:30:00Z', details: 'Score changed from 88% to 92%' },
                  { action: 'Employee verification completed', user: 'mike.r@agency.gov', timestamp: '2024-01-18T11:00:00Z', details: '45 employees verified' },
                  { action: 'Document uploaded', user: 'john@abcfederal.com', timestamp: '2024-01-15T09:00:00Z', details: 'Annual report 2023.pdf' },
                  { action: 'Certification renewed', user: 'sarah.m@agency.gov', timestamp: '2023-06-15T10:00:00Z', details: 'Valid until 2026-06-15' },
                  { action: 'Business profile updated', user: 'john@abcfederal.com', timestamp: '2023-06-10T14:00:00Z', details: 'Address updated' },
                ].map((log, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{log.action}</p>
                      <p className="text-xs text-gray-500">{log.details}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {log.user} • {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <Link
                  to={`/admin/audit-logs?businessId=${selectedBusiness.id}`}
                  className="px-4 py-2 text-sm text-hubzone-600 hover:text-hubzone-700"
                >
                  View Full History →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

