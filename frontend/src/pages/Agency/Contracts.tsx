import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import contractService from '../../services/contractService';
import type { 
  Contract, 
  ContractFilters, 
  ContractType, 
  ContractStatus,
  CreateContractData 
} from '../../types/contract';
import { CONTRACT_TYPE_LABELS, AWARD_TYPE_LABELS, CONTRACT_STATUS_LABELS } from '../../types/contract';

// Sample agency ID - in production this would come from auth context
const SAMPLE_AGENCY_ID = 'a1000000-0000-0000-0000-000000000001';

const statusColors: Record<ContractStatus, string> = {
  active: 'bg-verified-100 text-verified-700',
  completed: 'bg-gray-100 text-gray-700',
  terminated: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function Contracts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  
  // Filters
  const [fiscalYear, setFiscalYear] = useState(
    parseInt(searchParams.get('fy') ?? '') || contractService.getCurrentFiscalYear()
  );
  const [hubzoneOnly, setHubzoneOnly] = useState(searchParams.get('hubzone') === 'true');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>(
    (searchParams.get('status') as ContractStatus) || ''
  );
  const [contractTypeFilter, setContractTypeFilter] = useState<ContractType | ''>(
    (searchParams.get('type') as ContractType) || ''
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') ?? '1'));
  const [sortBy, setSortBy] = useState<ContractFilters['sortBy']>('awardDate');
  const [sortOrder, setSortOrder] = useState<ContractFilters['sortOrder']>('desc');

  const fiscalYearOptions = contractService.getFiscalYearOptions();
  const limit = 20;

  const loadContracts = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: ContractFilters = {
        agencyId: SAMPLE_AGENCY_ID,
        fiscalYear,
        page,
        limit,
        sortBy,
        sortOrder,
      };

      if (hubzoneOnly) filters.isHubzoneContractor = true;
      if (statusFilter) filters.status = statusFilter;
      if (contractTypeFilter) filters.contractType = contractTypeFilter;
      if (searchQuery) filters.search = searchQuery;

      const response = await contractService.getContracts(filters);
      
      if (response.data) {
        setContracts(response.data);
        setTotal(response.pagination.total);
      }
    } catch (error) {
      console.error('Error loading contracts:', error);
      // Use mock data for demo
      setContracts(createMockContracts());
      setTotal(15);
    } finally {
      setIsLoading(false);
    }
  }, [fiscalYear, hubzoneOnly, statusFilter, contractTypeFilter, searchQuery, page, sortBy, sortOrder]);

  useEffect(() => {
    loadContracts();
    
    // Update URL params
    const params = new URLSearchParams();
    params.set('fy', String(fiscalYear));
    if (hubzoneOnly) params.set('hubzone', 'true');
    if (statusFilter) params.set('status', statusFilter);
    if (contractTypeFilter) params.set('type', contractTypeFilter);
    if (searchQuery) params.set('search', searchQuery);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [loadContracts, fiscalYear, hubzoneOnly, statusFilter, contractTypeFilter, searchQuery, page, setSearchParams]);

  const handleSort = (column: ContractFilters['sortBy']) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleAddContract = async (data: CreateContractData) => {
    try {
      const response = await contractService.createContract(data, SAMPLE_AGENCY_ID);
      if (response.success) {
        setShowAddModal(false);
        loadContracts();
      }
    } catch (error) {
      console.error('Error creating contract:', error);
    }
  };

  // Mock data for demo
  function createMockContracts(): Contract[] {
    return [
      {
        id: '1',
        agencyId: SAMPLE_AGENCY_ID,
        contractNumber: 'W912HQ-25-C-0001',
        title: 'IT Infrastructure Modernization',
        contractorName: 'Federal IT Partners LLC',
        contractorUei: 'ABC123456789',
        contractorCageCode: '1ABC2',
        isHubzoneContractor: true,
        awardDate: '2024-10-15',
        awardValue: 850000,
        currentValue: 850000,
        obligatedAmount: 425000,
        contractType: 'hubzone_set_aside',
        awardType: 'firm_fixed_price',
        naicsCodes: [{ code: '541511', title: 'Custom Computer Programming Services', isPrimary: true }],
        periodOfPerformanceStart: '2024-10-15',
        periodOfPerformanceEnd: '2025-10-14',
        status: 'active',
        fiscalYear: 2025,
        fiscalQuarter: 1,
        fpdsReported: true,
        createdAt: '2024-10-15',
        updatedAt: '2024-10-15',
      },
      {
        id: '2',
        agencyId: SAMPLE_AGENCY_ID,
        contractNumber: 'W912HQ-25-C-0002',
        title: 'Professional Services Support',
        contractorName: 'Capitol Construction Inc',
        contractorUei: 'DEF234567890',
        isHubzoneContractor: true,
        awardDate: '2024-11-01',
        awardValue: 425000,
        currentValue: 425000,
        obligatedAmount: 425000,
        contractType: 'hubzone_sole_source',
        awardType: 'firm_fixed_price',
        naicsCodes: [{ code: '541611', title: 'Administrative Management Consulting', isPrimary: true }],
        periodOfPerformanceStart: '2024-11-01',
        periodOfPerformanceEnd: '2025-04-30',
        status: 'active',
        fiscalYear: 2025,
        fiscalQuarter: 1,
        fpdsReported: true,
        createdAt: '2024-11-01',
        updatedAt: '2024-11-01',
      },
      {
        id: '3',
        agencyId: SAMPLE_AGENCY_ID,
        contractNumber: 'W912HQ-25-C-0003',
        title: 'Facilities Management Services',
        contractorName: 'Tech Solutions Corp',
        contractorUei: 'JKL456789012',
        isHubzoneContractor: false,
        awardDate: '2024-11-15',
        awardValue: 1200000,
        currentValue: 1200000,
        obligatedAmount: 600000,
        contractType: 'full_open',
        awardType: 'indefinite_delivery',
        naicsCodes: [{ code: '561210', title: 'Facilities Support Services', isPrimary: true }],
        periodOfPerformanceStart: '2024-11-15',
        periodOfPerformanceEnd: '2025-11-14',
        status: 'active',
        fiscalYear: 2025,
        fiscalQuarter: 1,
        fpdsReported: true,
        createdAt: '2024-11-15',
        updatedAt: '2024-11-15',
      },
      {
        id: '4',
        agencyId: SAMPLE_AGENCY_ID,
        contractNumber: 'W912HQ-25-C-0004',
        title: 'Software Development',
        contractorName: 'Metro Services Group',
        contractorUei: 'GHI345678901',
        isHubzoneContractor: true,
        awardDate: '2024-12-01',
        awardValue: 650000,
        currentValue: 650000,
        obligatedAmount: 325000,
        contractType: 'price_preference',
        awardType: 'time_materials',
        naicsCodes: [{ code: '541512', title: 'Computer Systems Design Services', isPrimary: true }],
        periodOfPerformanceStart: '2024-12-01',
        periodOfPerformanceEnd: '2025-05-31',
        status: 'active',
        fiscalYear: 2025,
        fiscalQuarter: 1,
        fpdsReported: false,
        createdAt: '2024-12-01',
        updatedAt: '2024-12-01',
      },
    ];
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Agency Contracts
          </h1>
          <p className="text-gray-500 mt-1">
            Manage and track contract awards for FY{fiscalYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={fiscalYear}
            onChange={(e) => { setFiscalYear(parseInt(e.target.value, 10)); setPage(1); }}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm font-medium focus:ring-2 focus:ring-hubzone-500"
          >
            {fiscalYearOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
          >
            Add Contract
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by contract number, title, or contractor..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hubzone-500"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setHubzoneOnly(!hubzoneOnly); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                hubzoneOnly
                  ? 'bg-hubzone-600 text-white border-hubzone-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              HUBZone Only
            </button>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as ContractStatus | ''); setPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:ring-2 focus:ring-hubzone-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <select
              value={contractTypeFilter}
              onChange={(e) => { setContractTypeFilter(e.target.value as ContractType | ''); setPage(1); }}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm focus:ring-2 focus:ring-hubzone-500"
            >
              <option value="">All Types</option>
              {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hubzone-600" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No contracts found</h3>
            <p className="text-gray-500">Try adjusting your filters or add a new contract.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('contractNumber')}
                    >
                      <div className="flex items-center gap-1">
                        Contract
                        {sortBy === 'contractNumber' && (
                          <svg className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('contractorName')}
                    >
                      <div className="flex items-center gap-1">
                        Contractor
                        {sortBy === 'contractorName' && (
                          <svg className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('awardDate')}
                    >
                      <div className="flex items-center gap-1">
                        Award Date
                        {sortBy === 'awardDate' && (
                          <svg className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('awardValue')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Value
                        {sortBy === 'awardValue' && (
                          <svg className={`w-4 h-4 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{contract.contractNumber}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">{contract.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {contract.isHubzoneContractor && (
                            <span className="inline-flex items-center justify-center w-5 h-5 bg-hubzone-100 text-hubzone-700 rounded-full text-xs font-bold" title="HUBZone Contractor">
                              H
                            </span>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{contract.contractorName}</p>
                            <p className="text-xs text-gray-500">{contract.contractorUei}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          contract.contractType.includes('hubzone')
                            ? 'bg-hubzone-100 text-hubzone-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {CONTRACT_TYPE_LABELS[contract.contractType]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(contract.awardDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {contractService.formatCurrency(contract.awardValue)}
                        </p>
                        {contract.currentValue !== contract.awardValue && (
                          <p className="text-xs text-gray-500">
                            Current: {contractService.formatCompactCurrency(contract.currentValue)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[contract.status]}`}>
                          {CONTRACT_STATUS_LABELS[contract.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedContract(contract)}
                          className="text-hubzone-600 hover:text-hubzone-700 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} contracts
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Contract Detail Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedContract(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedContract.contractNumber}</h2>
                  <p className="text-sm text-gray-500">{selectedContract.title}</p>
                </div>
                <button
                  onClick={() => setSelectedContract(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Contract Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Contractor</p>
                    <p className="font-semibold text-gray-900">{selectedContract.contractorName}</p>
                    <p className="text-sm text-gray-500">UEI: {selectedContract.contractorUei}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[selectedContract.status]}`}>
                        {CONTRACT_STATUS_LABELS[selectedContract.status]}
                      </span>
                      {selectedContract.isHubzoneContractor && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-hubzone-100 text-hubzone-700">
                          HUBZone
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Details */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm text-gray-500">Award Value</p>
                    <p className="text-lg font-bold text-gray-900">{contractService.formatCurrency(selectedContract.awardValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Current Value</p>
                    <p className="text-lg font-bold text-gray-900">{contractService.formatCurrency(selectedContract.currentValue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Obligated</p>
                    <p className="text-lg font-bold text-gray-900">{contractService.formatCurrency(selectedContract.obligatedAmount)}</p>
                  </div>
                </div>

                {/* Contract Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Contract Type</p>
                    <p className="font-medium text-gray-900">{CONTRACT_TYPE_LABELS[selectedContract.contractType]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Award Type</p>
                    <p className="font-medium text-gray-900">{AWARD_TYPE_LABELS[selectedContract.awardType]}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Award Date</p>
                    <p className="font-medium text-gray-900">{new Date(selectedContract.awardDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fiscal Year/Quarter</p>
                    <p className="font-medium text-gray-900">FY{selectedContract.fiscalYear} Q{selectedContract.fiscalQuarter}</p>
                  </div>
                </div>

                {/* Performance Period */}
                <div className="p-4 bg-hubzone-50 rounded-xl">
                  <p className="text-sm font-medium text-hubzone-900 mb-2">Period of Performance</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Start: </span>
                      <span className="font-medium text-gray-900">{new Date(selectedContract.periodOfPerformanceStart).toLocaleDateString()}</span>
                    </div>
                    <span className="text-gray-400">→</span>
                    <div>
                      <span className="text-gray-500">End: </span>
                      <span className="font-medium text-gray-900">{new Date(selectedContract.periodOfPerformanceEnd).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* NAICS Codes */}
                {selectedContract.naicsCodes.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">NAICS Codes</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedContract.naicsCodes.map((code, idx) => (
                        <span key={idx} className="inline-flex px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                          {code.code} - {code.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* FPDS Status */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${selectedContract.fpdsReported ? 'bg-verified-500' : 'bg-amber-500'}`} />
                    <span className="text-sm text-gray-600">
                      {selectedContract.fpdsReported ? 'Reported to FPDS-NG' : 'Pending FPDS-NG reporting'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Last updated: {new Date(selectedContract.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { Contracts };

