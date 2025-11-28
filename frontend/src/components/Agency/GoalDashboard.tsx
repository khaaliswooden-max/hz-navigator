import { useMemo } from 'react';
import type { GoalProgress } from '../../types/contract';
import contractService from '../../services/contractService';

interface GoalDashboardProps {
  progress: GoalProgress;
  compact?: boolean;
}

export default function GoalDashboard({ progress, compact = false }: GoalDashboardProps) {
  const {
    goalPercentage,
    currentPercentage,
    percentageOfGoal,
    totalContractsAwarded,
    totalContractValue,
    hubzoneContractsAwarded,
    hubzoneContractValue,
    amountRemaining,
    contractsNeeded,
    averageHubzoneContractValue,
    isOnTrack,
    projectedYearEnd,
  } = progress;

  // Calculate progress ring values
  const circumference = 2 * Math.PI * 90; // radius = 90
  const progressOffset = circumference - (Math.min(percentageOfGoal, 100) / 100) * circumference;
  
  // Determine color based on progress
  const getProgressColor = useMemo(() => {
    if (percentageOfGoal >= 100) return { stroke: '#059669', bg: 'bg-verified-50', text: 'text-verified-700' };
    if (percentageOfGoal >= 75) return { stroke: '#10b981', bg: 'bg-verified-50', text: 'text-verified-600' };
    if (percentageOfGoal >= 50) return { stroke: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600' };
    return { stroke: '#ef4444', bg: 'bg-red-50', text: 'text-red-600' };
  }, [percentageOfGoal]);

  if (compact) {
    return (
      <div className={`rounded-xl p-6 ${getProgressColor.bg}`}>
        <div className="flex items-center gap-6">
          {/* Compact progress ring */}
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={getProgressColor.stroke}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42}
                strokeDashoffset={2 * Math.PI * 42 - (Math.min(percentageOfGoal, 100) / 100) * 2 * Math.PI * 42}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${getProgressColor.text}`}>
                {currentPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">HUBZone Progress</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                isOnTrack ? 'bg-verified-100 text-verified-700' : 'bg-red-100 text-red-700'
              }`}>
                {isOnTrack ? 'On Track' : 'Behind'}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              {contractService.formatCompactCurrency(hubzoneContractValue)} of {contractService.formatCompactCurrency(progress.goalAmount)} goal
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-gray-500">
                <span className="font-semibold text-gray-900">{hubzoneContractsAwarded}</span> HUBZone contracts
              </span>
              <span className="text-gray-500">
                Goal: <span className="font-semibold text-gray-900">{goalPercentage}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">HUBZone Goal Progress</h3>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
            isOnTrack 
              ? 'bg-verified-100 text-verified-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {isOnTrack ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            {isOnTrack ? 'On Track' : 'Behind Target'}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Large Progress Ring */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="relative w-52 h-52">
              <svg className="w-52 h-52 transform -rotate-90" viewBox="0 0 200 200">
                {/* Background circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="12"
                />
                {/* Goal indicator (dashed line at goal percentage) */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeDashoffset={circumference - (goalPercentage / 100) * circumference * (100 / goalPercentage)}
                  opacity="0.5"
                />
                {/* Progress circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="90"
                  fill="none"
                  stroke={getProgressColor.stroke}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${getProgressColor.text}`}>
                  {currentPercentage.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 mt-1">
                  of {goalPercentage}% goal
                </span>
              </div>
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getProgressColor.stroke }} />
                <span className="text-gray-600">Current</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-300" />
                <span className="text-gray-600">Goal</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            {/* Goal vs Actual */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Goal Amount</p>
              <p className="text-xl font-bold text-gray-900">
                {contractService.formatCompactCurrency(progress.goalAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{goalPercentage}% of total contracting</p>
            </div>
            
            <div className={`p-4 rounded-xl ${getProgressColor.bg}`}>
              <p className="text-sm text-gray-500 mb-1">HUBZone Awarded</p>
              <p className={`text-xl font-bold ${getProgressColor.text}`}>
                {contractService.formatCompactCurrency(hubzoneContractValue)}
              </p>
              <p className="text-xs text-gray-400 mt-1">{percentageOfGoal.toFixed(1)}% of goal</p>
            </div>

            {/* Contracts Awarded */}
            <div className="p-4 bg-hubzone-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">HUBZone Contracts</p>
              <p className="text-xl font-bold text-hubzone-700">{hubzoneContractsAwarded}</p>
              <p className="text-xs text-gray-400 mt-1">of {totalContractsAwarded} total</p>
            </div>

            {/* Average Value */}
            <div className="p-4 bg-federal-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Avg HUBZone Contract</p>
              <p className="text-xl font-bold text-federal-700">
                {contractService.formatCompactCurrency(averageHubzoneContractValue)}
              </p>
            </div>

            {/* Amount Remaining */}
            <div className="p-4 bg-amber-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Remaining to Goal</p>
              <p className="text-xl font-bold text-amber-700">
                {contractService.formatCompactCurrency(amountRemaining)}
              </p>
            </div>

            {/* Contracts Needed */}
            <div className="p-4 bg-purple-50 rounded-xl">
              <p className="text-sm text-gray-500 mb-1">Est. Contracts Needed</p>
              <p className="text-xl font-bold text-purple-700">{contractsNeeded}</p>
              <p className="text-xs text-gray-400 mt-1">at current avg value</p>
            </div>
          </div>
        </div>

        {/* Projection Bar */}
        <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-hubzone-50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Year-End Projection</span>
            <span className={`text-sm font-semibold ${
              projectedYearEnd >= goalPercentage ? 'text-verified-600' : 'text-amber-600'
            }`}>
              {projectedYearEnd.toFixed(1)}% projected
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
            {/* Goal marker */}
            <div 
              className="absolute h-full w-0.5 bg-gray-500 z-10"
              style={{ left: `${Math.min((goalPercentage / goalPercentage) * 100, 100)}%` }}
            />
            {/* Projected */}
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                projectedYearEnd >= goalPercentage ? 'bg-verified-500' : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min((projectedYearEnd / goalPercentage) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>0%</span>
            <span>Goal: {goalPercentage}%</span>
          </div>
        </div>

        {/* Total Contracting Context */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total Contracting Value (FY{progress.fiscalYear})</span>
            <span className="font-semibold text-gray-900">
              {contractService.formatCurrency(totalContractValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { GoalDashboard };

