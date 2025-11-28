import { useState, useCallback, useEffect } from 'react';
import {
  FileText,
  Calendar,
  Download,
  FileSpreadsheet,
  FileJson,
  File,
  Loader2,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Building2,
  Target,
  ClipboardCheck,
  MapPin,
  BarChart3,
  Eye,
  RefreshCcw,
} from 'lucide-react';
import type {
  ReportType,
  ReportTypeInfo,
  ExportFormat,
  DateRange,
  GeneratedReport,
} from '../../types/analytics';
import { REPORT_TYPE_LABELS, EXPORT_FORMAT_LABELS } from '../../types/analytics';
import {
  analyticsService,
  getDateRangePresets,
  downloadReport,
  formatCurrency,
  getDefaultAgencyId,
} from '../../services/analyticsService';

const REPORT_ICONS: Record<ReportType, React.ElementType> = {
  hubzone_goal_achievement: Target,
  contractor_directory: Building2,
  verification_history: ClipboardCheck,
  contract_awards_summary: BarChart3,
  geographic_distribution: MapPin,
};

const FORMAT_ICONS: Record<ExportFormat, React.ElementType> = {
  pdf: File,
  excel: FileSpreadsheet,
  csv: FileText,
  json: FileJson,
};

export function Reports(): JSX.Element {
  const [reportTypes, setReportTypes] = useState<ReportTypeInfo[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const presets = getDateRangePresets();
    return presets[0].range;
  });
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>([]);

  const datePresets = getDateRangePresets();

  useEffect(() => {
    // Load available report types
    analyticsService.getReportTypes().then(setReportTypes).catch(console.error);
  }, []);

  const handlePresetSelect = (index: number) => {
    setSelectedPreset(index);
    setDateRange(datePresets[index].range);
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: new Date(value) }));
    setSelectedPreset(-1); // Clear preset when manual date is selected
  };

  const handleGenerateReport = useCallback(async () => {
    if (!selectedReport) return;

    setGenerating(true);
    setError(null);
    setGeneratedReport(null);

    try {
      const report = await analyticsService.generateReport({
        reportType: selectedReport,
        agencyId: getDefaultAgencyId(),
        dateRange,
        format,
        includeCharts,
        includeSummary,
      });
      setGeneratedReport(report);
      setRecentReports(prev => [report, ...prev.slice(0, 4)]);
    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error('Error generating report:', err);
    } finally {
      setGenerating(false);
    }
  }, [selectedReport, dateRange, format, includeCharts, includeSummary]);

  const handleDownload = async (report: GeneratedReport, downloadFormat?: ExportFormat) => {
    try {
      await downloadReport(report, downloadFormat ?? report.format);
    } catch (err) {
      console.error('Error downloading report:', err);
    }
  };

  const currentReportType = reportTypes.find(r => r.id === selectedReport);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              Agency Reports
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Generate official reports for congressional and compliance requirements
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Type Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Select Report Type
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reportTypes.map((report) => {
                  const Icon = REPORT_ICONS[report.id as ReportType] ?? FileText;
                  const isSelected = selectedReport === report.id;
                  return (
                    <button
                      key={report.id}
                      onClick={() => setSelectedReport(report.id as ReportType)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 ring-2 ring-teal-500/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected
                            ? 'bg-teal-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-medium ${
                            isSelected ? 'text-teal-700 dark:text-teal-400' : 'text-gray-900 dark:text-white'
                          }`}>
                            {report.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {report.description}
                          </p>
                          <div className="flex gap-1 mt-2">
                            {report.formats.map((f) => {
                              const FormatIcon = FORMAT_ICONS[f as ExportFormat] ?? File;
                              return (
                                <span
                                  key={f}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400"
                                >
                                  <FormatIcon className="w-3 h-3" />
                                  {f.toUpperCase()}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600" />
                Date Range
              </h2>
              
              {/* Presets */}
              <div className="flex flex-wrap gap-2 mb-4">
                {datePresets.map((preset, index) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetSelect(index)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedPreset === index
                        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 ring-1 ring-teal-500'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={new Date(dateRange.startDate).toISOString().split('T')[0]}
                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={new Date(dateRange.endDate).toISOString().split('T')[0]}
                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Format & Options */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Output Format & Options
              </h2>
              
              <div className="space-y-4">
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Export Format
                  </label>
                  <div className="flex gap-3">
                    {(currentReportType?.formats ?? ['pdf', 'excel', 'csv']).map((f) => {
                      const FormatIcon = FORMAT_ICONS[f as ExportFormat] ?? File;
                      const isSelected = format === f;
                      return (
                        <button
                          key={f}
                          onClick={() => setFormat(f as ExportFormat)}
                          className={`flex-1 py-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                            isSelected
                              ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <FormatIcon className={`w-6 h-6 ${
                            isSelected ? 'text-teal-600' : 'text-gray-400'
                          }`} />
                          <span className={`text-sm font-medium ${
                            isSelected ? 'text-teal-700 dark:text-teal-400' : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {f.toUpperCase()}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Options */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCharts}
                      onChange={(e) => setIncludeCharts(e.target.checked)}
                      className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include Charts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSummary}
                      onChange={(e) => setIncludeSummary(e.target.checked)}
                      className="w-4 h-4 text-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Include Executive Summary</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateReport}
              disabled={!selectedReport || generating}
              className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-500/25"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate Report
                </>
              )}
            </button>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Report Preview / Recent Reports */}
          <div className="space-y-6">
            {/* Generated Report Preview */}
            {generatedReport && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-white" />
                    <h3 className="font-semibold text-white">Report Generated</h3>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {generatedReport.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {generatedReport.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Report ID</p>
                      <p className="text-sm font-mono text-gray-900 dark:text-white">
                        {generatedReport.reportId.slice(0, 8)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Generated</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {new Date(generatedReport.generatedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Quick Stats from Report Data */}
                  {'metrics' in generatedReport.data && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Key Metrics
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {generatedReport.data.metrics.activeHubzoneBusinesses.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">Active Businesses</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {generatedReport.data.metrics.currentAchievedPercentage.toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">Goal Achievement</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {'totalCount' in generatedReport.data && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {generatedReport.data.totalCount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">Contractors in Directory</p>
                    </div>
                  )}

                  {'totalContracts' in generatedReport.data && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Contracts</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {generatedReport.data.totalContracts}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Total Value</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(generatedReport.data.totalValue)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(generatedReport)}
                      className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDownload(generatedReport, 'json')}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Reports */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-teal-600" />
                Recent Reports
              </h3>
              {recentReports.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No reports generated yet
                </p>
              ) : (
                <div className="space-y-3">
                  {recentReports.map((report) => {
                    const Icon = REPORT_ICONS[report.reportType] ?? FileText;
                    return (
                      <button
                        key={report.reportId}
                        onClick={() => handleDownload(report)}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left flex items-center gap-3"
                      >
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                          <Icon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {REPORT_TYPE_LABELS[report.reportType]}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(report.generatedAt).toLocaleString()}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Congressional Reporting Notice */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-400 mb-2">
                Congressional Reporting
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                All reports generated through this system are formatted to meet federal
                congressional reporting requirements and include proper audit trails.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <CheckCircle className="w-4 h-4" />
                <span>FPDS-NG Compatible</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;

