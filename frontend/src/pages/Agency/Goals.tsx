import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { GoalDashboard } from '../../components/Agency/GoalDashboard';
import contractService from '../../services/contractService';
import type { GoalProgress, FiscalYearGoal, TopContractor, FiscalYearReport } from '../../types/contract';

// Sample agency ID - in production this would come from auth context
const SAMPLE_AGENCY_ID = 'a1000000-0000-0000-0000-000000000001';

export default function Goals() {
  const [fiscalYear, setFiscalYear] = useState(contractService.getCurrentFiscalYear());
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [goal, setGoal] = useState<FiscalYearGoal | null>(null);
  const [topContractors, setTopContractors] = useState<TopContractor[]>([]);
  const [report, setReport] = useState<FiscalYearReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  
  // Form state
  const [goalPercentage, setGoalPercentage] = useState(3.0);
  const [totalContractingGoal, setTotalContractingGoal] = useState(50000000);
  const [notes, setNotes] = useState('');

  const fiscalYearOptions = contractService.getFiscalYearOptions();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load all data in parallel
      const [progressRes, goalRes, contractorsRes, reportRes] = await Promise.all([
        contractService.getGoalProgress(SAMPLE_AGENCY_ID, fiscalYear),
        contractService.getFiscalYearGoal(SAMPLE_AGENCY_ID, fiscalYear),
        contractService.getTopContractors(SAMPLE_AGENCY_ID, fiscalYear, 5),
        contractService.generateFiscalYearReport(SAMPLE_AGENCY_ID, fiscalYear),
      ]);

      if (progressRes.success && progressRes.data) {
        setProgress(progressRes.data);
      }
      
      if (goalRes.success && goalRes.data) {
        setGoal(goalRes.data);
        setGoalPercentage(goalRes.data.goalPercentage);
        setTotalContractingGoal(goalRes.data.totalContractingGoal);
        setNotes(goalRes.data.notes ?? '');
      }

      if (contractorsRes.success && contractorsRes.data) {
        setTopContractors(contractorsRes.data);
      }

      if (reportRes.success && reportRes.data) {
        setReport(reportRes.data);
      }
    } catch (error) {
      console.error('Error loading goal data:', error);
      // Create mock data for demo
      setProgress(createMockProgress(fiscalYear));
    } finally {
      setIsLoading(false);
    }
  }, [fiscalYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveGoal = async () => {
    setIsSaving(true);
    try {
      const response = await contractService.setFiscalYearGoal(
        SAMPLE_AGENCY_ID,
        fiscalYear,
        goalPercentage,
        totalContractingGoal,
        notes
      );

      if (response.success) {
        setGoal(response.data);
        setShowGoalForm(false);
        await loadData(); // Reload to get updated progress
      }
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportFPDS = async () => {
    try {
      const blob = await contractService.exportForFPDS(SAMPLE_AGENCY_ID, fiscalYear);
      contractService.downloadFPDSExport(blob, fiscalYear);
    } catch (error) {
      console.error('Error exporting FPDS:', error);
    }
  };

  // Mock progress data for demo when API is not available
  function createMockProgress(fy: number): GoalProgress {
    return {
      fiscalYear: fy,
      agencyId: SAMPLE_AGENCY_ID,
      agencyName: 'Small Business Administration',
      goalPercentage: 3.0,
      goalAmount: 1500000,
      totalContractsAwarded: 156,
      totalContractValue: 48500000,
      hubzoneContractsAwarded: 23,
      hubzoneContractValue: 1250000,
      currentPercentage: 2.58,
      percentageOfGoal: 86,
      amountRemaining: 250000,
      contractsNeeded: 5,
      averageHubzoneContractValue: 54348,
      isOnTrack: true,
      projectedYearEnd: 2.9,
      monthlyProgress: [
        { month: 10, monthName: 'October', totalContracts: 12, totalValue: 4200000, hubzoneContracts: 2, hubzoneValue: 120000, cumulativePercentage: 2.86, goalPercentage: 0.25 },
        { month: 11, monthName: 'November', totalContracts: 15, totalValue: 5100000, hubzoneContracts: 3, hubzoneValue: 180000, cumulativePercentage: 3.23, goalPercentage: 0.50 },
        { month: 12, monthName: 'December', totalContracts: 10, totalValue: 3800000, hubzoneContracts: 1, hubzoneValue: 85000, cumulativePercentage: 2.94, goalPercentage: 0.75 },
        { month: 1, monthName: 'January', totalContracts: 18, totalValue: 6200000, hubzoneContracts: 4, hubzoneValue: 210000, cumulativePercentage: 3.08, goalPercentage: 1.00 },
        { month: 2, monthName: 'February', totalContracts: 14, totalValue: 4800000, hubzoneContracts: 2, hubzoneValue: 145000, cumulativePercentage: 3.07, goalPercentage: 1.25 },
        { month: 3, monthName: 'March', totalContracts: 16, totalValue: 5500000, hubzoneContracts: 3, hubzoneValue: 165000, cumulativePercentage: 3.04, goalPercentage: 1.50 },
        { month: 4, monthName: 'April', totalContracts: 13, totalValue: 4500000, hubzoneContracts: 2, hubzoneValue: 125000, cumulativePercentage: 2.95, goalPercentage: 1.75 },
        { month: 5, monthName: 'May', totalContracts: 17, totalValue: 5800000, hubzoneContracts: 3, hubzoneValue: 155000, cumulativePercentage: 2.86, goalPercentage: 2.00 },
        { month: 6, monthName: 'June', totalContracts: 0, totalValue: 0, hubzoneContracts: 0, hubzoneValue: 0, cumulativePercentage: 2.58, goalPercentage: 2.25 },
        { month: 7, monthName: 'July', totalContracts: 0, totalValue: 0, hubzoneContracts: 0, hubzoneValue: 0, cumulativePercentage: 0, goalPercentage: 2.50 },
        { month: 8, monthName: 'August', totalContracts: 0, totalValue: 0, hubzoneContracts: 0, hubzoneValue: 0, cumulativePercentage: 0, goalPercentage: 2.75 },
        { month: 9, monthName: 'September', totalContracts: 0, totalValue: 0, hubzoneContracts: 0, hubzoneValue: 0, cumulativePercentage: 0, goalPercentage: 3.00 },
      ],
    };
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-hubzone-600" />
      </div>
    );
  }

  const displayProgress = progress ?? createMockProgress(fiscalYear);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            HUBZone Contracting Goals
          </h1>
          <p className="text-gray-500 mt-1">
            Track and manage your agency's HUBZone contracting targets
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(parseInt(e.target.value, 10))}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 text-sm font-medium focus:ring-2 focus:ring-hubzone-500"
          >
            {fiscalYearOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowGoalForm(true)}
            className="px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
          >
            Set Goal
          </button>
          <button
            onClick={handleExportFPDS}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Export FPDS
          </button>
        </div>
      </div>

      {/* Goal Dashboard */}
      <GoalDashboard progress={displayProgress} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Progress Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Progress</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayProgress.monthlyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="monthName" 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, displayProgress.goalPercentage + 1]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(2)}%`,
                    name === 'cumulativePercentage' ? 'Actual' : 'Target',
                  ]}
                />
                <Legend />
                <ReferenceLine 
                  y={displayProgress.goalPercentage} 
                  stroke="#dc2626" 
                  strokeDasharray="5 5"
                  label={{ value: `Goal: ${displayProgress.goalPercentage}%`, position: 'right', fill: '#dc2626', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="goalPercentage"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Target"
                />
                <Line
                  type="monotone"
                  dataKey="cumulativePercentage"
                  stroke="#0073c7"
                  strokeWidth={2}
                  dot={{ fill: '#0073c7', strokeWidth: 2 }}
                  name="Actual"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Contract Value by Month */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Awards by Month</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayProgress.monthlyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="monthName" 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickFormatter={(value) => contractService.formatCompactCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => contractService.formatCurrency(value)}
                />
                <Legend />
                <Bar 
                  dataKey="totalValue" 
                  fill="#e5e7eb" 
                  name="Total Contracts"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="hubzoneValue" 
                  fill="#0073c7" 
                  name="HUBZone Contracts"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Year Over Year Comparison */}
        {report && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Year Over Year</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">FY{report.yearOverYear.previousYear}</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {report.yearOverYear.previousYearPercentage.toFixed(2)}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {contractService.formatCompactCurrency(report.yearOverYear.previousYearValue)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">FY{fiscalYear}</span>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {displayProgress.currentPercentage.toFixed(2)}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {contractService.formatCompactCurrency(displayProgress.hubzoneContractValue)}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Change</span>
                  <span className={`font-semibold ${
                    report.yearOverYear.percentageChange >= 0 ? 'text-verified-600' : 'text-red-600'
                  }`}>
                    {report.yearOverYear.percentageChange >= 0 ? '+' : ''}
                    {report.yearOverYear.percentageChange.toFixed(2)}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-600">Value Change</span>
                  <span className={`font-semibold ${
                    report.yearOverYear.valueChange >= 0 ? 'text-verified-600' : 'text-red-600'
                  }`}>
                    {report.yearOverYear.valueChange >= 0 ? '+' : ''}
                    {contractService.formatCompactCurrency(report.yearOverYear.valueChange)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top HUBZone Contractors */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top HUBZone Contractors</h3>
            <a href="/agency/contracts?hubzone=true" className="text-sm text-hubzone-600 hover:text-hubzone-700">
              View all →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="pb-3">Contractor</th>
                  <th className="pb-3 text-right">Contracts</th>
                  <th className="pb-3 text-right">Total Value</th>
                  <th className="pb-3 text-right">Avg Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(topContractors.length > 0 ? topContractors : [
                  { contractorName: 'Federal IT Partners LLC', contractorUei: 'ABC123456789', contractCount: 5, totalValue: 450000, averageValue: 90000, latestAwardDate: '2024-12-15' },
                  { contractorName: 'Capitol Construction Inc', contractorUei: 'DEF234567890', contractCount: 4, totalValue: 380000, averageValue: 95000, latestAwardDate: '2024-11-20' },
                  { contractorName: 'Metro Services Group', contractorUei: 'GHI345678901', contractCount: 3, totalValue: 250000, averageValue: 83333, latestAwardDate: '2024-10-30' },
                ]).map((contractor, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="py-3">
                      <p className="font-medium text-gray-900">{contractor.contractorName}</p>
                      <p className="text-xs text-gray-500">{contractor.contractorUei}</p>
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900">
                      {contractor.contractCount}
                    </td>
                    <td className="py-3 text-right font-semibold text-gray-900">
                      {contractService.formatCompactCurrency(contractor.totalValue)}
                    </td>
                    <td className="py-3 text-right text-gray-600">
                      {contractService.formatCompactCurrency(contractor.averageValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Goal Settings Modal */}
      {showGoalForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowGoalForm(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Set FY{fiscalYear} Goal</h2>
                <button
                  onClick={() => setShowGoalForm(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Goal Percentage
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={goalPercentage}
                      onChange={(e) => setGoalPercentage(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hubzone-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Default federal goal is 3%</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Contracting Budget
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={totalContractingGoal}
                      onChange={(e) => setTotalContractingGoal(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="100000"
                      className="w-full px-4 py-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hubzone-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    HUBZone target: {contractService.formatCurrency(totalContractingGoal * (goalPercentage / 100))}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hubzone-500"
                    placeholder="Add any notes about this goal..."
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  onClick={() => setShowGoalForm(false)}
                  className="px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGoal}
                  disabled={isSaving}
                  className="px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Goal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { Goals };

