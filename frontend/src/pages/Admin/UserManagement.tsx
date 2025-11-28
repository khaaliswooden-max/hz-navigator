/**
 * User Management Page
 * List, search, filter, edit users, manage roles, suspend/activate accounts
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { AdminUser, UserRole, UserStatus, UserFilters } from '../../types/admin';

// Mock data
const mockUsers: AdminUser[] = [
  { id: '1', email: 'john.doe@example.com', firstName: 'John', lastName: 'Doe', role: 'user', status: 'active', createdAt: '2024-01-15T10:30:00Z', lastLoginAt: '2024-01-20T14:20:00Z', emailVerified: true, twoFactorEnabled: false, businessCount: 2 },
  { id: '2', email: 'sarah.admin@example.com', firstName: 'Sarah', lastName: 'Miller', role: 'admin', status: 'active', createdAt: '2023-06-10T08:00:00Z', lastLoginAt: '2024-01-21T09:15:00Z', emailVerified: true, twoFactorEnabled: true, businessCount: 0 },
  { id: '3', email: 'mike.reviewer@agency.gov', firstName: 'Mike', lastName: 'Roberts', role: 'reviewer', status: 'active', createdAt: '2023-09-20T12:00:00Z', lastLoginAt: '2024-01-19T16:45:00Z', emailVerified: true, twoFactorEnabled: true, businessCount: 0 },
  { id: '4', email: 'jane.smith@business.com', firstName: 'Jane', lastName: 'Smith', role: 'user', status: 'suspended', createdAt: '2024-01-05T09:00:00Z', lastLoginAt: '2024-01-10T11:30:00Z', emailVerified: true, twoFactorEnabled: false, businessCount: 1 },
  { id: '5', email: 'bob.wilson@company.net', firstName: 'Bob', lastName: 'Wilson', role: 'user', status: 'pending', createdAt: '2024-01-20T15:00:00Z', lastLoginAt: null, emailVerified: false, twoFactorEnabled: false, businessCount: 0 },
  { id: '6', email: 'lisa.agency@sba.gov', firstName: 'Lisa', lastName: 'Anderson', role: 'agency', status: 'active', createdAt: '2023-12-01T10:00:00Z', lastLoginAt: '2024-01-21T08:00:00Z', emailVerified: true, twoFactorEnabled: true, businessCount: 0 },
];

const roleColors: Record<UserRole, string> = {
  user: 'bg-gray-100 text-gray-800',
  admin: 'bg-red-100 text-red-800',
  reviewer: 'bg-blue-100 text-blue-800',
  agency: 'bg-purple-100 text-purple-800',
};

const statusColors: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  disabled: 'bg-gray-100 text-gray-800',
};

export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>(mockUsers);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    status: 'all',
    page: 1,
    limit: 10,
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filtered users
  const filteredUsers = users.filter((user) => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (
        !user.email.toLowerCase().includes(search) &&
        !user.firstName.toLowerCase().includes(search) &&
        !user.lastName.toLowerCase().includes(search)
      ) {
        return false;
      }
    }
    if (filters.role && filters.role !== 'all' && user.role !== filters.role) {
      return false;
    }
    if (filters.status && filters.status !== 'all' && user.status !== filters.status) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredUsers.length / (filters.limit || 10));

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSuspendUser = async (userId: string) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'suspended' as UserStatus } : u))
    );
  };

  const handleActivateUser = async (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: 'active' as UserStatus } : u))
    );
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm('Send password reset email to this user?')) return;
    alert('Password reset email sent!');
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    setEditingUser(null);
    setShowUserModal(false);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;
    if (!confirm(`Apply ${action} to ${selectedUsers.length} users?`)) return;

    if (action === 'suspend') {
      setUsers((prev) =>
        prev.map((u) =>
          selectedUsers.includes(u.id) ? { ...u, status: 'suspended' as UserStatus } : u
        )
      );
    } else if (action === 'activate') {
      setUsers((prev) =>
        prev.map((u) =>
          selectedUsers.includes(u.id) ? { ...u, status: 'active' as UserStatus } : u
        )
      );
    }
    setSelectedUsers([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1">Manage user accounts, roles, and permissions</p>
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

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value as UserRole | 'all' })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="reviewer">Reviewer</option>
            <option value="agency">Agency</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as UserStatus | 'all' })}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="mt-4 flex items-center gap-4 p-3 bg-hubzone-50 rounded-lg">
            <span className="text-sm font-medium text-hubzone-700">
              {selectedUsers.length} users selected
            </span>
            <button
              onClick={() => handleBulkAction('suspend')}
              className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Suspend All
            </button>
            <button
              onClick={() => handleBulkAction('activate')}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Activate All
            </button>
            <button
              onClick={() => setSelectedUsers([])}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-hubzone-600 focus:ring-hubzone-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Security
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-gray-300 text-hubzone-600 focus:ring-hubzone-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${roleColors[user.role]}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[user.status]}`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Email
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Email
                        </span>
                      )}
                      {user.twoFactorEnabled ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          2FA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          2FA
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setShowUserModal(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Edit user"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleSuspendUser(user.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Suspend user"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivateUser(user.id)}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="Activate user"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        className="p-1 text-gray-400 hover:text-amber-600"
                        title="Reset password"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
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
            Showing {filteredUsers.length} of {users.length} users
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={filters.page === 1}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {filters.page} of {totalPages || 1}
            </span>
            <button
              disabled={filters.page === totalPages}
              onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              className="px-3 py-1 text-sm border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      {showUserModal && editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setShowUserModal(false)}
            />
            <div className="relative inline-block w-full max-w-lg p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-lg font-medium text-gray-600">
                      {editingUser.firstName[0]}{editingUser.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {editingUser.firstName} {editingUser.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{editingUser.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  >
                    <option value="user">User</option>
                    <option value="reviewer">Reviewer</option>
                    <option value="agency">Agency</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as UserStatus })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <strong>Warning:</strong> Changing user roles affects their permissions across the platform.
                    Admin role grants full system access.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateRole(editingUser.id, editingUser.role)}
                  className="px-4 py-2 text-sm bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

