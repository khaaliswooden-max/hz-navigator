import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmployeeForm } from '../../components/Employees/EmployeeForm';
import { EmployeeDetail } from '../../components/Employees/EmployeeDetail';
import { BulkImport } from '../../components/Employees/BulkImport';
import employeeService from '../../services/employeeService';
import type { 
  Employee, 
  EmployeeListItem, 
  EmployeeFilters, 
  EmployeeComplianceMetrics,
  EmployeeFormData,
  HubzoneResidenceStatus 
} from '../../types/employee';
import type { Pagination } from '../../types';

type ToastType = 'success' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

const hubzoneStatusOptions: { value: HubzoneResidenceStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'resident', label: 'HUBZone Resident' },
  { value: 'non_resident', label: 'Non-HUBZone' },
  { value: 'pending_verification', label: 'Pending Verification' },
];

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'employmentDate', label: 'Employment Date' },
  { value: 'hubzoneStatus', label: 'HUBZone Status' },
  { value: 'address', label: 'Address' },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getHubzoneStatusBadge(status: HubzoneResidenceStatus) {
  switch (status) {
    case 'resident':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-verified-100 text-verified-700 border border-verified-200">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          HUBZone
        </span>
      );
    case 'non_resident':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
          Non-HUBZone
        </span>
      );
    case 'pending_verification':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Pending
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Unknown
        </span>
      );
  }
}

export default function EmployeeList() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data states
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [complianceMetrics, setComplianceMetrics] = useState<EmployeeComplianceMetrics | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters from URL
  const filters: EmployeeFilters = useMemo(() => ({
    hubzoneStatus: (searchParams.get('hubzoneStatus') as HubzoneResidenceStatus) || undefined,
    search: searchParams.get('search') || undefined,
    sortBy: (searchParams.get('sortBy') as EmployeeFilters['sortBy']) || 'name',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '10'),
  }), [searchParams]);

  const [searchInput, setSearchInput] = useState(filters.search || '');

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

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [employeesRes, metricsRes] = await Promise.all([
        employeeService.getEmployees(filters),
        employeeService.getComplianceMetrics(),
      ]);
      
      setEmployees(employeesRes.data);
      setPagination(employeesRes.pagination);
      
      if (metricsRes.success && metricsRes.data) {
        setComplianceMetrics(metricsRes.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        updateFilters({ search: searchInput || undefined, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update URL filters
  const updateFilters = (newFilters: Partial<EmployeeFilters>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === '' || (key === 'page' && value === 1)) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    setSearchParams(params);
  };

  // Handle sort
  const handleSort = (column: EmployeeFilters['sortBy']) => {
    const newOrder = filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    updateFilters({ sortBy: column, sortOrder: newOrder, page: 1 });
  };

  // Clear filters
  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  // Handle employee selection
  const handleSelectEmployee = async (employeeId: string) => {
    try {
      const response = await employeeService.getEmployee(employeeId);
      if (response.success && response.data) {
        setSelectedEmployee(response.data);
        setShowDetailPanel(true);
      }
    } catch (err) {
      showToast('error', 'Failed to load employee details');
    }
  };

  // Handle add employee
  const handleAddEmployee = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      const response = await employeeService.createEmployee(data);
      if (response.success) {
        showToast('success', 'Employee added successfully');
        setShowAddModal(false);
        fetchEmployees();
      } else {
        showToast('error', response.error?.message || 'Failed to add employee');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit employee
  const handleEditEmployee = async (data: EmployeeFormData) => {
    if (!selectedEmployee) return;
    
    setIsSubmitting(true);
    try {
      const response = await employeeService.updateEmployee(selectedEmployee.id, data);
      if (response.success && response.data) {
        showToast('success', 'Employee updated successfully');
        setShowEditModal(false);
        setSelectedEmployee(response.data);
        fetchEmployees();
      } else {
        showToast('error', response.error?.message || 'Failed to update employee');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle terminate employee
  const handleTerminateEmployee = async (terminationDate: string, notes?: string) => {
    if (!selectedEmployee) return;
    
    try {
      const response = await employeeService.terminateEmployee(selectedEmployee.id, terminationDate, notes);
      if (response.success && response.data) {
        showToast('success', 'Employee terminated');
        setSelectedEmployee(response.data);
        fetchEmployees();
      } else {
        showToast('error', response.error?.message || 'Failed to terminate employee');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to terminate employee');
    }
  };

  // Sort icon
  const getSortIcon = (column: EmployeeFilters['sortBy']) => {
    if (filters.sortBy !== column) {
      return (
        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return filters.sortOrder === 'asc' ? (
      <svg className="w-4 h-4 text-hubzone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-hubzone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const hasActiveFilters = filters.hubzoneStatus || filters.search;

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
          <h1 className="text-2xl font-display font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500 mt-1">Manage your workforce and track HUBZone compliance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBulkImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import CSV
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Employee
          </button>
        </div>
      </div>

      {/* Compliance Metrics */}
      {complianceMetrics && (
        <div className={`rounded-xl p-5 ${
          complianceMetrics.isCompliant 
            ? 'bg-verified-50 border border-verified-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                complianceMetrics.isCompliant ? 'bg-verified-100' : 'bg-amber-100'
              }`}>
                {complianceMetrics.isCompliant ? (
                  <svg className="w-6 h-6 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className={`font-semibold ${
                  complianceMetrics.isCompliant ? 'text-verified-900' : 'text-amber-900'
                }`}>
                  {complianceMetrics.isCompliant ? 'HUBZone Compliant' : 'Compliance Action Needed'}
                </h3>
                <p className={`text-sm ${
                  complianceMetrics.isCompliant ? 'text-verified-700' : 'text-amber-700'
                }`}>
                  {complianceMetrics.compliancePercentage.toFixed(1)}% HUBZone residents 
                  (required: {complianceMetrics.requiredPercentage}%)
                  {!complianceMetrics.isCompliant && complianceMetrics.employeesNeededForCompliance > 0 && (
                    <> • Need {complianceMetrics.employeesNeededForCompliance} more HUBZone resident(s)</>
                  )}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-4 min-w-[300px]">
              <div className="flex-1">
                <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      complianceMetrics.isCompliant ? 'bg-verified-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(complianceMetrics.compliancePercentage, 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {complianceMetrics.hubzoneResidents}/{complianceMetrics.totalEmployees}
                </p>
                <p className="text-xs text-gray-500">HUBZone Residents</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 transition-colors"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* HUBZone Status Filter */}
          <div className="w-full lg:w-48">
            <select
              value={filters.hubzoneStatus || ''}
              onChange={(e) => updateFilters({ hubzoneStatus: e.target.value as HubzoneResidenceStatus || undefined, page: 1 })}
              className="w-full py-2.5 px-3 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 bg-white transition-colors"
            >
              {hubzoneStatusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="w-full lg:w-48">
            <select
              value={filters.sortBy || 'name'}
              onChange={(e) => updateFilters({ sortBy: e.target.value as EmployeeFilters['sortBy'], page: 1 })}
              className="w-full py-2.5 px-3 rounded-lg border border-gray-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-hubzone-500 bg-white transition-colors"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>Sort by {opt.label}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm font-medium text-gray-600 hover:text-gray-800 whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!isLoading && (
        <p className="text-sm text-gray-500">
          {pagination.total > 0 ? (
            <>
              Showing <span className="font-medium text-gray-700">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-medium text-gray-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>{' '}
              of <span className="font-medium text-gray-700">{pagination.total}</span> employees
            </>
          ) : 'No employees found'}
        </p>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Error Loading Employees</h3>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <button onClick={fetchEmployees} className="text-sm font-medium text-hubzone-600 hover:text-hubzone-700">
              Try again →
            </button>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No Employees Found</h3>
            <p className="text-sm text-gray-500 mb-4">
              {hasActiveFilters ? 'Try adjusting your filters' : 'Add your first employee to get started'}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Employee
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                    >
                      Name {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3">
                    <button
                      onClick={() => handleSort('address')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                    >
                      Address {getSortIcon('address')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3">
                    <button
                      onClick={() => handleSort('hubzoneStatus')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                    >
                      HUBZone Status {getSortIcon('hubzoneStatus')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3">
                    <button
                      onClick={() => handleSort('employmentDate')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                    >
                      Employment Date {getSortIcon('employmentDate')}
                    </button>
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((employee) => (
                  <tr
                    key={employee.id}
                    onClick={() => handleSelectEmployee(employee.id)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-hubzone-100 flex items-center justify-center text-hubzone-700 font-semibold">
                          {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {employee.firstName} {employee.lastName}
                          </p>
                          {employee.email && (
                            <p className="text-sm text-gray-500">{employee.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {employee.city}, {employee.state}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {getHubzoneStatusBadge(employee.hubzoneStatus)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{formatDate(employee.employmentDate)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => updateFilters({ page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter(page => page === 1 || page === pagination.totalPages || Math.abs(page - pagination.page) <= 1)
              .map((page, idx, arr) => (
                <span key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-2 text-gray-400">...</span>}
                  <button
                    onClick={() => updateFilters({ page })}
                    className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                      page === pagination.page ? 'bg-hubzone-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                </span>
              ))}
          </div>

          <button
            onClick={() => updateFilters({ page: pagination.page + 1 })}
            disabled={pagination.page === pagination.totalPages}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Add Employee Modal */}
      <EmployeeForm
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddEmployee}
        mode="create"
        isLoading={isSubmitting}
      />

      {/* Edit Employee Modal */}
      {selectedEmployee && (
        <EmployeeForm
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditEmployee}
          initialData={{
            firstName: selectedEmployee.firstName,
            lastName: selectedEmployee.lastName,
            email: selectedEmployee.email || '',
            phone: selectedEmployee.phone || '',
            jobTitle: selectedEmployee.jobTitle || '',
            department: selectedEmployee.department || '',
            employmentDate: selectedEmployee.employmentDate,
            currentAddress: selectedEmployee.currentAddress,
          }}
          mode="edit"
          isLoading={isSubmitting}
        />
      )}

      {/* Employee Detail Panel */}
      {showDetailPanel && selectedEmployee && (
        <div className="fixed inset-0 z-40 overflow-hidden">
          <div className="fixed inset-0 bg-black/30" onClick={() => setShowDetailPanel(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-xl">
            <EmployeeDetail
              employee={selectedEmployee}
              onEdit={() => {
                setShowDetailPanel(false);
                setShowEditModal(true);
              }}
              onTerminate={handleTerminateEmployee}
              onClose={() => setShowDetailPanel(false)}
            />
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImport
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onSuccess={fetchEmployees}
      />
    </div>
  );
}

export { EmployeeList };

