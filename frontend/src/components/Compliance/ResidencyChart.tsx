import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { clsx } from 'clsx';

export interface ResidencyDataPoint {
  date: string;
  percentage: number;
  totalEmployees?: number;
  hubzoneEmployees?: number;
}

interface ResidencyChartProps {
  data: ResidencyDataPoint[];
  threshold?: number;
  greenZone?: number;
  yellowZone?: number;
  showTrend?: boolean;
  height?: number;
}

type TrendDirection = 'up' | 'down' | 'stable';

function calculateTrend(data: ResidencyDataPoint[]): { direction: TrendDirection; change: number } {
  if (data.length < 2) {
    return { direction: 'stable', change: 0 };
  }
  
  // Compare last 7 days average to previous 7 days average
  const recentData = data.slice(-7);
  const previousData = data.slice(-14, -7);
  
  if (previousData.length === 0) {
    return { direction: 'stable', change: 0 };
  }
  
  const recentAvg = recentData.reduce((sum, d) => sum + d.percentage, 0) / recentData.length;
  const previousAvg = previousData.reduce((sum, d) => sum + d.percentage, 0) / previousData.length;
  
  const change = recentAvg - previousAvg;
  
  if (Math.abs(change) < 0.5) {
    return { direction: 'stable', change: 0 };
  }
  
  return {
    direction: change > 0 ? 'up' : 'down',
    change: Math.abs(change),
  };
}

function getStatusColor(percentage: number, greenZone: number, threshold: number): string {
  if (percentage >= greenZone) return '#10b981'; // emerald-500
  if (percentage >= threshold) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

const CustomTooltip = ({ 
  active, 
  payload, 
  threshold,
  greenZone,
}: {
  active?: boolean;
  payload?: Array<{ payload: ResidencyDataPoint }>;
  threshold: number;
  greenZone: number;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  
  const data = payload[0].payload;
  const color = getStatusColor(data.percentage, greenZone, threshold);
  
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg p-3 min-w-[180px]">
      <p className="text-xs text-gray-500 mb-2">{data.date}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-600">Residency</span>
        <span 
          className="text-lg font-bold"
          style={{ color }}
        >
          {data.percentage.toFixed(1)}%
        </span>
      </div>
      {data.hubzoneEmployees !== undefined && data.totalEmployees !== undefined && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>HUBZone Employees</span>
            <span className="font-medium">{data.hubzoneEmployees} / {data.totalEmployees}</span>
          </div>
        </div>
      )}
      <div className="mt-2 text-xs">
        {data.percentage >= greenZone && (
          <span className="text-emerald-600 font-medium">✓ Above safe zone</span>
        )}
        {data.percentage >= threshold && data.percentage < greenZone && (
          <span className="text-amber-600 font-medium">⚠ In warning zone</span>
        )}
        {data.percentage < threshold && (
          <span className="text-red-600 font-medium">✕ Below required threshold</span>
        )}
      </div>
    </div>
  );
};

export default function ResidencyChart({
  data,
  threshold = 35,
  greenZone = 40,
  yellowZone = 35,
  showTrend = true,
  height = 280,
}: ResidencyChartProps) {
  const trend = useMemo(() => calculateTrend(data), [data]);
  
  const currentPercentage = data.length > 0 ? data[data.length - 1].percentage : 0;
  const currentColor = getStatusColor(currentPercentage, greenZone, threshold);
  
  // Calculate y-axis domain with some padding
  const percentages = data.map(d => d.percentage);
  const minPercentage = Math.min(...percentages, threshold - 5);
  const maxPercentage = Math.max(...percentages, greenZone + 10);
  const yMin = Math.floor(minPercentage / 5) * 5;
  const yMax = Math.ceil(maxPercentage / 5) * 5;

  return (
    <div className="space-y-4">
      {/* Header with current value and trend */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span 
              className="text-3xl font-bold"
              style={{ color: currentColor }}
            >
              {currentPercentage.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-500">current</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Required: ≥{threshold}% | Target: ≥{greenZone}%
          </p>
        </div>
        
        {showTrend && (
          <div className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            trend.direction === 'up' && 'bg-emerald-50',
            trend.direction === 'down' && 'bg-red-50',
            trend.direction === 'stable' && 'bg-gray-50'
          )}>
            {trend.direction === 'up' && (
              <>
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="text-sm font-semibold text-emerald-700">
                  +{trend.change.toFixed(1)}%
                </span>
              </>
            )}
            {trend.direction === 'down' && (
              <>
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="text-sm font-semibold text-red-700">
                  -{trend.change.toFixed(1)}%
                </span>
              </>
            )}
            {trend.direction === 'stable' && (
              <>
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                </svg>
                <span className="text-sm font-semibold text-gray-600">
                  Stable
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            {/* Color zones */}
            <ReferenceArea
              y1={greenZone}
              y2={yMax}
              fill="#10b981"
              fillOpacity={0.08}
            />
            <ReferenceArea
              y1={yellowZone}
              y2={greenZone}
              fill="#f59e0b"
              fillOpacity={0.08}
            />
            <ReferenceArea
              y1={yMin}
              y2={yellowZone}
              fill="#ef4444"
              fillOpacity={0.08}
            />
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e5e7eb" 
              vertical={false}
            />
            
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tick={{ fill: '#6b7280' }}
              interval="preserveStartEnd"
            />
            
            <YAxis
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#6b7280' }}
              domain={[yMin, yMax]}
              tickFormatter={(value) => `${value}%`}
            />
            
            <Tooltip 
              content={<CustomTooltip threshold={threshold} greenZone={greenZone} />}
            />
            
            {/* Threshold line */}
            <ReferenceLine
              y={threshold}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="8 4"
              label={{
                value: `${threshold}% minimum`,
                position: 'right',
                fill: '#ef4444',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            
            {/* Green zone line */}
            <ReferenceLine
              y={greenZone}
              stroke="#10b981"
              strokeWidth={1}
              strokeDasharray="4 4"
              label={{
                value: `${greenZone}% target`,
                position: 'right',
                fill: '#10b981',
                fontSize: 10,
              }}
            />
            
            {/* Main data line */}
            <Line
              type="monotone"
              dataKey="percentage"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: '#3b82f6',
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-gray-600">Safe Zone (≥{greenZone}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-gray-600">Warning ({threshold}-{greenZone}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-600">Critical (&lt;{threshold}%)</span>
        </div>
      </div>
    </div>
  );
}

export { ResidencyChart };

