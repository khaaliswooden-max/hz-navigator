import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Owner, OwnershipSummary } from '../../types/ownership';

interface OwnershipChartProps {
  owners: Owner[];
  summary: OwnershipSummary;
  showLegend?: boolean;
  showCompliance?: boolean;
  height?: number;
}

// Colors for the pie chart
const COLORS = {
  usCitizen: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b'],
  nonCitizen: ['#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937'],
};

interface CustomLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}

const RADIAN = Math.PI / 180;

function renderCustomizedLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: CustomLabelProps) {
  if (percent < 0.05) return null; // Don't show label for very small slices
  
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
}

export default function OwnershipChart({
  owners,
  summary,
  showLegend = true,
  showCompliance = true,
  height = 300,
}: OwnershipChartProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    return owners.map((owner, index) => ({
      name: owner.ownerName,
      value: owner.ownershipPercentage,
      isUsCitizen: owner.isUsCitizen,
      color: owner.isUsCitizen 
        ? COLORS.usCitizen[index % COLORS.usCitizen.length]
        : COLORS.nonCitizen[index % COLORS.nonCitizen.length],
    }));
  }, [owners]);

  // If remaining percentage, add placeholder
  const chartDataWithRemaining = useMemo(() => {
    if (summary.remainingPercentage > 0.01) {
      return [
        ...chartData,
        {
          name: 'Unallocated',
          value: summary.remainingPercentage,
          isUsCitizen: false,
          color: '#e5e7eb',
        },
      ];
    }
    return chartData;
  }, [chartData, summary.remainingPercentage]);

  // Summary data for stacked bar
  const summaryData = useMemo(() => [
    { name: 'US Citizens', value: summary.usCitizenOwnershipPercentage, color: '#10b981' },
    { name: 'Non-Citizens', value: summary.nonCitizenOwnershipPercentage, color: '#9ca3af' },
    ...(summary.remainingPercentage > 0.01 
      ? [{ name: 'Unallocated', value: summary.remainingPercentage, color: '#e5e7eb' }]
      : []
    ),
  ], [summary]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload: { isUsCitizen: boolean } }[] }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value.toFixed(2)}%
            {data.payload.isUsCitizen !== undefined && (
              <span className={`ml-2 ${data.payload.isUsCitizen ? 'text-verified-600' : 'text-gray-500'}`}>
                ({data.payload.isUsCitizen ? 'US Citizen' : 'Non-Citizen'})
              </span>
            )}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Compliance Indicator */}
      {showCompliance && (
        <div className={`p-4 rounded-xl border ${
          summary.isCompliant && summary.isValid
            ? 'bg-verified-50 border-verified-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                summary.isCompliant && summary.isValid
                  ? 'bg-verified-100'
                  : 'bg-amber-100'
              }`}>
                {summary.isCompliant && summary.isValid ? (
                  <svg className="w-5 h-5 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <p className={`font-semibold ${
                  summary.isCompliant && summary.isValid
                    ? 'text-verified-800'
                    : 'text-amber-800'
                }`}>
                  {summary.isCompliant && summary.isValid
                    ? 'Ownership Compliant'
                    : summary.usCitizenOwnershipPercentage < 51
                    ? 'US Citizen Ownership Below 51%'
                    : 'Ownership Not Complete'
                  }
                </p>
                <p className={`text-sm ${
                  summary.isCompliant && summary.isValid
                    ? 'text-verified-600'
                    : 'text-amber-600'
                }`}>
                  US Citizens: {summary.usCitizenOwnershipPercentage.toFixed(1)}% 
                  (required: ≥51%)
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {summary.usCitizenOwnershipPercentage.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">US Citizen Owned</p>
            </div>
          </div>

          {/* Progress bar showing US citizen percentage */}
          <div className="mt-4">
            <div className="h-3 bg-white/50 rounded-full overflow-hidden relative">
              {/* 51% marker */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                style={{ left: '51%' }}
              />
              {/* US Citizen bar */}
              <div
                className={`h-full transition-all duration-500 ${
                  summary.usCitizenOwnershipPercentage >= 51 ? 'bg-verified-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(summary.usCitizenOwnershipPercentage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span className="font-medium">51% min</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

      {/* Pie Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartDataWithRemaining}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={height / 3}
              innerRadius={height / 6}
              dataKey="value"
              stroke="white"
              strokeWidth={2}
            >
              {chartDataWithRemaining.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {showLegend && chartData.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-verified-500" />
              <span className="text-gray-600">US Citizen</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-400" />
              <span className="text-gray-600">Non-Citizen</span>
            </div>
            {summary.remainingPercentage > 0.01 && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-200" />
                <span className="text-gray-600">Unallocated</span>
              </div>
            )}
          </div>

          {/* Owner list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {chartData.map((owner, index) => (
              <div 
                key={index}
                className="flex items-center gap-2 p-2 rounded-lg bg-gray-50"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: owner.color }}
                />
                <span className="text-sm text-gray-700 truncate flex-1">{owner.name}</span>
                <span className="text-sm font-medium text-gray-900">{owner.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.ownerCount}</p>
          <p className="text-xs text-gray-500">Total Owners</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-verified-600">{summary.usCitizenCount}</p>
          <p className="text-xs text-gray-500">US Citizens</p>
        </div>
        <div className="text-center">
          <p className={`text-2xl font-bold ${
            summary.totalOwnershipPercentage === 100 ? 'text-verified-600' : 'text-amber-600'
          }`}>
            {summary.totalOwnershipPercentage.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">Total Allocated</p>
        </div>
      </div>
    </div>
  );
}

export { OwnershipChart };

