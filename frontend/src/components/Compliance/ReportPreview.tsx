import { useMemo } from 'react';
import { clsx } from 'clsx';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { GeneratedReport, ReportFinding } from '../../services/reportService';

interface ReportPreviewProps {
  report: GeneratedReport;
  className?: string;
}

const severityColors: Record<ReportFinding['severity'], { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  high: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  low: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  info: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const severityLabels: Record<ReportFinding['severity'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ReportPreview({ report, className }: ReportPreviewProps) {
  const { metrics, findings, recommendations, history, executiveSummary } = report;

  // Prepare chart data
  const complianceBreakdownData = useMemo(() => [
    { name: 'HUBZone Residents', value: metrics.employeeResidency.hubzoneCount, color: '#10b981' },
    { name: 'Non-HUBZone', value: metrics.employeeResidency.totalCount - metrics.employeeResidency.hubzoneCount, color: '#f59e0b' },
  ], [metrics]);

  const metricsBarData = useMemo(() => [
    { 
      name: 'Employee\nResidency', 
      value: metrics.employeeResidency.percentage, 
      target: metrics.employeeResidency.target,
      fill: metrics.employeeResidency.percentage >= metrics.employeeResidency.target ? '#10b981' : '#ef4444',
    },
    { 
      name: 'US Citizen\nOwnership', 
      value: metrics.ownership.usCitizenPercentage, 
      target: metrics.ownership.target,
      fill: metrics.ownership.usCitizenPercentage >= metrics.ownership.target ? '#10b981' : '#ef4444',
    },
    { 
      name: 'Overall\nCompliance', 
      value: metrics.overallCompliance, 
      target: 85,
      fill: metrics.overallCompliance >= 85 ? '#10b981' : '#f59e0b',
    },
  ], [metrics]);

  return (
    <div className={clsx('bg-white', className)}>
      {/* Print-friendly styles */}
      <style>{`
        @media print {
          .report-preview {
            font-size: 11pt;
            line-height: 1.4;
          }
          .report-preview h1 { font-size: 18pt; }
          .report-preview h2 { font-size: 14pt; page-break-after: avoid; }
          .report-preview h3 { font-size: 12pt; page-break-after: avoid; }
          .report-section { page-break-inside: avoid; }
          .no-print { display: none !important; }
          .chart-container { max-height: 200px; }
        }
      `}</style>

      <div className="report-preview max-w-4xl mx-auto">
        {/* Report Header */}
        <div className="border-b-4 border-federal-600 pb-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-federal-600 rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
                  <p className="text-sm text-gray-500">HUBZone Compliance Report</p>
                </div>
              </div>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold text-gray-900">Report ID: {report.id}</p>
              <p className="text-gray-500">Generated: {formatDateTime(report.generatedAt)}</p>
            </div>
          </div>
          
          <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-gray-500">Business Name</p>
              <p className="font-semibold text-gray-900">{report.businessName}</p>
            </div>
            {report.dateRange && (
              <div>
                <p className="text-gray-500">Report Period</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(report.dateRange.startDate)} — {formatDate(report.dateRange.endDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Executive Summary */}
        <section className="report-section mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Executive Summary
          </h2>
          <div className="bg-federal-50 rounded-lg p-5 border border-federal-100">
            <p className="text-gray-700 leading-relaxed">{executiveSummary}</p>
          </div>
        </section>

        {/* Compliance Score Card */}
        <section className="report-section mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Compliance Overview
          </h2>
          
          <div className="grid grid-cols-4 gap-4 mb-6">
            {/* Overall Compliance */}
            <div className={clsx(
              'rounded-xl p-4 text-center border-2',
              metrics.overallCompliance >= 85 
                ? 'bg-emerald-50 border-emerald-200' 
                : metrics.overallCompliance >= 70 
                  ? 'bg-amber-50 border-amber-200' 
                  : 'bg-red-50 border-red-200'
            )}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Overall Score
              </p>
              <p className={clsx(
                'text-3xl font-bold',
                metrics.overallCompliance >= 85 ? 'text-emerald-600' : 
                metrics.overallCompliance >= 70 ? 'text-amber-600' : 'text-red-600'
              )}>
                {metrics.overallCompliance}%
              </p>
            </div>

            {/* Employee Residency */}
            <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Employee Residency
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.employeeResidency.percentage}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Target: {metrics.employeeResidency.target}%
              </p>
            </div>

            {/* US Citizen Ownership */}
            <div className="bg-white rounded-xl p-4 text-center border border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                US Citizen Ownership
              </p>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.ownership.usCitizenPercentage}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Target: {metrics.ownership.target}%
              </p>
            </div>

            {/* Certification Status */}
            <div className={clsx(
              'rounded-xl p-4 text-center border-2',
              metrics.certification.daysRemaining > 60 
                ? 'bg-emerald-50 border-emerald-200' 
                : metrics.certification.daysRemaining > 30 
                  ? 'bg-amber-50 border-amber-200' 
                  : 'bg-red-50 border-red-200'
            )}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Days to Renewal
              </p>
              <p className={clsx(
                'text-3xl font-bold',
                metrics.certification.daysRemaining > 60 ? 'text-emerald-600' :
                metrics.certification.daysRemaining > 30 ? 'text-amber-600' : 'text-red-600'
              )}>
                {metrics.certification.daysRemaining}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Expires: {formatDate(metrics.certification.expirationDate)}
              </p>
            </div>
          </div>
        </section>

        {/* Charts Section */}
        <section className="report-section mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Compliance Metrics
          </h2>
          
          <div className="grid grid-cols-2 gap-6">
            {/* Employee Distribution Pie Chart */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Employee Distribution</h3>
              <div className="chart-container h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={complianceBreakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${value}`}
                      labelLine={false}
                    >
                      {complianceBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-xs">
                {complianceBreakdownData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }} 
                    />
                    <span className="text-gray-600">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Metrics Bar Chart */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Requirements vs Targets</h3>
              <div className="chart-container h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metricsBarData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 10 }} 
                      width={80}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Current']}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {metricsBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Historical Trend Chart */}
          {history && history.length > 0 && (
            <div className="mt-6 bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Employee Residency Trend
              </h3>
              <div className="chart-container h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis 
                      domain={[30, 50]} 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Residency']}
                      labelFormatter={(label) => formatDate(label)}
                    />
                    <ReferenceLine 
                      y={35} 
                      stroke="#ef4444" 
                      strokeDasharray="5 5"
                      label={{ value: '35% min', position: 'right', fontSize: 10 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="employeeResidency" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        {/* Detailed Metrics */}
        <section className="report-section mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Detailed Compliance Data
          </h2>
          
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Requirement
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Employee HUBZone Residency</p>
                      <p className="text-xs text-gray-500">
                        {metrics.employeeResidency.hubzoneCount} of {metrics.employeeResidency.totalCount} employees
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    {metrics.employeeResidency.percentage}%
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    ≥{metrics.employeeResidency.target}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx(
                      'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                      metrics.employeeResidency.percentage >= metrics.employeeResidency.target
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {metrics.employeeResidency.percentage >= metrics.employeeResidency.target ? 'Compliant' : 'Non-Compliant'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">US Citizen Ownership</p>
                      <p className="text-xs text-gray-500">Unconditional ownership requirement</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    {metrics.ownership.usCitizenPercentage}%
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    ≥{metrics.ownership.target}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx(
                      'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                      metrics.ownership.usCitizenPercentage >= metrics.ownership.target
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {metrics.ownership.usCitizenPercentage >= metrics.ownership.target ? 'Compliant' : 'Non-Compliant'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Principal Office Location</p>
                      <p className="text-xs text-gray-500">{metrics.principalOffice.address}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    {metrics.principalOffice.verified ? 'Verified' : 'Pending'}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    Verified
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx(
                      'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                      metrics.principalOffice.verified
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    )}>
                      {metrics.principalOffice.verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">HUBZone Certification</p>
                      <p className="text-xs text-gray-500">
                        Expires: {formatDate(metrics.certification.expirationDate)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                    {metrics.certification.status}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    Active
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx(
                      'inline-flex px-2 py-1 text-xs font-semibold rounded-full',
                      metrics.certification.status === 'Active'
                        ? metrics.certification.daysRemaining > 60
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {metrics.certification.status === 'Active' 
                        ? metrics.certification.daysRemaining > 60 ? 'Active' : 'Renewal Due'
                        : metrics.certification.status}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Findings Section */}
        <section className="report-section mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Findings
          </h2>
          
          <div className="space-y-3">
            {findings.map((finding) => {
              const colors = severityColors[finding.severity];
              return (
                <div 
                  key={finding.id}
                  className={clsx(
                    'rounded-xl p-4 border',
                    colors.bg,
                    colors.border
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-semibold',
                      colors.bg,
                      colors.text,
                      'border',
                      colors.border
                    )}>
                      {severityLabels[finding.severity]}
                    </span>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-gray-900">{finding.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
                      {finding.recommendation && (
                        <p className="text-sm text-gray-700 mt-2 italic">
                          <strong>Recommendation:</strong> {finding.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recommendations Section */}
        <section className="report-section mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Recommendations
          </h2>
          
          <div className="bg-hubzone-50 rounded-xl p-5 border border-hubzone-100">
            <ol className="space-y-3">
              {recommendations.map((rec, index) => (
                <li key={index} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-hubzone-100 text-hubzone-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-sm text-gray-700">{rec}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t-2 border-gray-200 pt-6 mt-8">
          <div className="flex items-start justify-between text-xs text-gray-500">
            <div>
              <p className="font-semibold text-gray-700">Disclaimer</p>
              <p className="mt-1 max-w-md">
                This report is generated based on data provided and should be verified for accuracy. 
                This report does not constitute legal advice and should not be used as the sole basis 
                for compliance decisions. Consult with SBA officials for official certification status.
              </p>
            </div>
            <div className="text-right">
              <p>HZ Navigator</p>
              <p>Report generated: {formatDateTime(report.generatedAt)}</p>
              <p>Page 1 of 1</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export { ReportPreview };

