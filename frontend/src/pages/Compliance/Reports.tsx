import { useState, useEffect, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { ReportPreview } from '../../components/Compliance';
import {
  generateReport,
  downloadReport,
  emailReport,
  getReportHistory,
  getSavedConfigs,
  saveReportConfig,
  scheduleReport,
  reportTypes,
  type ReportType,
  type ExportFormat,
  type DateRange,
  type GeneratedReport,
  type ReportConfig,
  type ReportHistoryEntry,
} from '../../services/reportService';

type ViewMode = 'configure' | 'preview';

export default function ReportsPage() {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('configure');
  const [selectedType, setSelectedType] = useState<ReportType>('current_compliance');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [reportHistory, setReportHistory] = useState<ReportHistoryEntry[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<ReportConfig[]>([]);
  
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [configName, setConfigName] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [scheduleRecipients, setScheduleRecipients] = useState('');
  
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf');
  const [successMessage, setSuccessMessage] = useState('');
  
  const reportPreviewRef = useRef<HTMLDivElement>(null);

  const typeInfo = reportTypes[selectedType];

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [historyData, configsData] = await Promise.all([
          getReportHistory(),
          getSavedConfigs(),
        ]);
        setReportHistory(historyData);
        setSavedConfigs(configsData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  // Generate report
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const report = await generateReport(
        selectedType,
        typeInfo.requiresDateRange ? dateRange : undefined,
        { includeCharts, includeRecommendations }
      );
      setGeneratedReport(report);
      setViewMode('preview');
      
      // Refresh history
      const historyData = await getReportHistory();
      setReportHistory(historyData);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedType, dateRange, typeInfo.requiresDateRange, includeCharts, includeRecommendations]);

  // Download report
  const handleDownload = useCallback(async () => {
    if (!generatedReport) return;
    
    setIsDownloading(true);
    try {
      const blob = await downloadReport(generatedReport.id, exportFormat);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedReport.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setSuccessMessage('Report downloaded successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to download report:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [generatedReport, exportFormat]);

  // Email report
  const handleEmail = useCallback(async () => {
    if (!generatedReport || !emailAddress) return;
    
    setIsEmailing(true);
    try {
      await emailReport(generatedReport.id, emailAddress, exportFormat);
      setShowEmailModal(false);
      setEmailAddress('');
      setSuccessMessage(`Report sent to ${emailAddress}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to email report:', error);
    } finally {
      setIsEmailing(false);
    }
  }, [generatedReport, emailAddress, exportFormat]);

  // Save config
  const handleSaveConfig = useCallback(async () => {
    if (!configName) return;
    
    setIsSavingConfig(true);
    try {
      const config = await saveReportConfig({
        name: configName,
        type: selectedType,
        dateRange: typeInfo.requiresDateRange ? dateRange : undefined,
        includeCharts,
        includeRecommendations,
      });
      setSavedConfigs(prev => [...prev, config]);
      setShowSaveModal(false);
      setConfigName('');
      setSuccessMessage('Configuration saved');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setIsSavingConfig(false);
    }
  }, [configName, selectedType, dateRange, typeInfo.requiresDateRange, includeCharts, includeRecommendations]);

  // Load saved config
  const handleLoadConfig = (config: ReportConfig) => {
    setSelectedType(config.type);
    if (config.dateRange) {
      setDateRange(config.dateRange);
    }
    setIncludeCharts(config.includeCharts);
    setIncludeRecommendations(config.includeRecommendations);
  };

  // Schedule report
  const handleSchedule = useCallback(async () => {
    const recipients = scheduleRecipients.split(',').map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0) return;
    
    try {
      await scheduleReport(
        {
          name: `Scheduled ${reportTypes[selectedType].label}`,
          type: selectedType,
          dateRange: typeInfo.requiresDateRange ? dateRange : undefined,
          includeCharts,
          includeRecommendations,
        },
        scheduleFrequency,
        recipients
      );
      setShowScheduleModal(false);
      setScheduleRecipients('');
      setSuccessMessage('Report scheduled successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to schedule report:', error);
    }
  }, [selectedType, dateRange, typeInfo.requiresDateRange, includeCharts, includeRecommendations, scheduleFrequency, scheduleRecipients]);

  // Print report
  const handlePrint = () => {
    window.print();
  };

  // Get icon for report type
  const getTypeIcon = (icon: string) => {
    switch (icon) {
      case 'shield':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'chart':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'users':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'clipboard':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'calendar':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Compliance Reports</h1>
          <p className="text-gray-500 mt-1">Generate, download, and share compliance reports</p>
        </div>
        {viewMode === 'preview' && (
          <button
            onClick={() => setViewMode('configure')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Configuration
          </button>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
          <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-emerald-700">{successMessage}</span>
        </div>
      )}

      {viewMode === 'configure' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Type Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Report Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.entries(reportTypes) as [ReportType, typeof reportTypes[ReportType]][]).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={clsx(
                      'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                      selectedType === type
                        ? 'border-hubzone-500 bg-hubzone-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      selectedType === type ? 'bg-hubzone-100 text-hubzone-600' : 'bg-gray-100 text-gray-500'
                    )}>
                      {getTypeIcon(info.icon)}
                    </div>
                    <div>
                      <p className={clsx(
                        'text-sm font-semibold',
                        selectedType === type ? 'text-hubzone-700' : 'text-gray-900'
                      )}>
                        {info.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            {typeInfo.requiresDateRange && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Period</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                    />
                  </div>
                </div>
                {/* Quick date presets */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {[
                    { label: 'Last 30 Days', days: 30 },
                    { label: 'Last 90 Days', days: 90 },
                    { label: 'Last Year', days: 365 },
                    { label: 'YTD', ytd: true },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => {
                        const end = new Date();
                        const start = preset.ytd
                          ? new Date(end.getFullYear(), 0, 1)
                          : new Date(end.getTime() - (preset.days || 30) * 24 * 60 * 60 * 1000);
                        setDateRange({
                          startDate: start.toISOString().split('T')[0],
                          endDate: end.toISOString().split('T')[0],
                        });
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Report Options */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Options</h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCharts}
                    onChange={(e) => setIncludeCharts(e.target.checked)}
                    className="w-5 h-5 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Include Charts & Graphs</p>
                    <p className="text-xs text-gray-500">Visual representation of compliance data</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRecommendations}
                    onChange={(e) => setIncludeRecommendations(e.target.checked)}
                    className="w-5 h-5 text-hubzone-600 border-gray-300 rounded focus:ring-hubzone-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Include Recommendations</p>
                    <p className="text-xs text-gray-500">Actionable suggestions based on findings</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={clsx(
                  'flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-semibold transition-colors',
                  'bg-hubzone-600 text-white hover:bg-hubzone-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isGenerating ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating Report...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </>
                )}
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="p-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                title="Save Configuration"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
              </button>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="p-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                title="Schedule Report"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Saved Configurations */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Saved Configurations</h3>
              {savedConfigs.length === 0 ? (
                <p className="text-sm text-gray-500">No saved configurations</p>
              ) : (
                <div className="space-y-2">
                  {savedConfigs.map((config) => (
                    <button
                      key={config.id}
                      onClick={() => handleLoadConfig(config)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-hubzone-100 text-hubzone-600 flex items-center justify-center flex-shrink-0">
                        {getTypeIcon(reportTypes[config.type].icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{config.name}</p>
                        <p className="text-xs text-gray-500">{reportTypes[config.type].label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Report History */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Reports</h3>
              {reportHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No reports generated yet</p>
              ) : (
                <div className="space-y-2">
                  {reportHistory.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg border border-gray-100 bg-gray-50"
                    >
                      <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(entry.generatedAt).toLocaleDateString()} by {entry.generatedBy}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Report Preview Mode */
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Export Format:</span>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-hubzone-500"
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {isDownloading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                Download {exportFormat.toUpperCase()}
              </button>
              <button
                onClick={() => setShowEmailModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-hubzone-600 text-white hover:bg-hubzone-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Report
              </button>
            </div>
          </div>

          {/* Report Preview */}
          <div 
            ref={reportPreviewRef}
            className="bg-white rounded-xl border border-gray-200 p-8 print:border-0 print:p-0"
          >
            {generatedReport && <ReportPreview report={generatedReport} />}
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowEmailModal(false)}>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <div 
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Report</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="recipient@example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmail}
                  disabled={!emailAddress || isEmailing}
                  className="px-4 py-2 text-sm font-medium bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700 disabled:opacity-50"
                >
                  {isEmailing ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Config Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowSaveModal(false)}>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <div 
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Configuration</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Configuration Name</label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  placeholder="e.g., Monthly Compliance Review"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={!configName || isSavingConfig}
                  className="px-4 py-2 text-sm font-medium bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700 disabled:opacity-50"
                >
                  {isSavingConfig ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowScheduleModal(false)}>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
            <div 
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule Automated Report</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select
                    value={scheduleFrequency}
                    onChange={(e) => setScheduleFrequency(e.target.value as typeof scheduleFrequency)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipients (comma-separated)</label>
                  <input
                    type="text"
                    value={scheduleRecipients}
                    onChange={(e) => setScheduleRecipients(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-hubzone-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSchedule}
                  disabled={!scheduleRecipients}
                  className="px-4 py-2 text-sm font-medium bg-hubzone-600 text-white rounded-lg hover:bg-hubzone-700 disabled:opacity-50"
                >
                  Schedule Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

