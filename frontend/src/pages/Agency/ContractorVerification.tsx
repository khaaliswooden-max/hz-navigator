import { useState, useCallback, useRef } from 'react';
import { VerificationResult } from '../../components/Agency';
import agencyService from '../../services/agencyService';
import type {
  ContractorSearchResult,
  ContractorVerification as ContractorVerificationType,
  BulkVerificationResult,
  VerificationReport,
  RiskLevel,
} from '../../types/agency';

type ViewMode = 'search' | 'result' | 'bulk' | 'bulk-results' | 'history';
type SearchType = 'name' | 'uei' | 'cage';

const riskBadgeStyles: Record<RiskLevel, string> = {
  low: 'bg-verified-100 text-verified-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

export default function ContractorVerification() {
  // Search state
  const [viewMode, setViewMode] = useState<ViewMode>('search');
  const [searchType, setSearchType] = useState<SearchType>('name');
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<ContractorSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Verification state
  const [verification, setVerification] = useState<ContractorVerificationType | null>(null);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  
  // Bulk verification state
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUEIs, setBulkUEIs] = useState<string[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkVerificationResult | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search handlers
  const handleSearch = useCallback(async () => {
    if (!searchValue.trim()) {
      setSearchError('Please enter a search value');
      return;
    }
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    
    try {
      const params: Record<string, string> = {};
      if (searchType === 'name') params.legalName = searchValue;
      if (searchType === 'uei') params.ueiNumber = searchValue;
      if (searchType === 'cage') params.cageCode = searchValue;
      
      const response = await agencyService.searchContractors(params);
      
      if (response.success && response.data) {
        setSearchResults(response.data);
        if (response.data.length === 0) {
          setSearchError('No contractors found matching your search criteria');
        }
      } else {
        setSearchError('Failed to search contractors');
      }
    } catch {
      setSearchError('An error occurred while searching');
    } finally {
      setIsSearching(false);
    }
  }, [searchType, searchValue]);

  const handleQuickVerify = useCallback(async (ueiNumber: string) => {
    setIsVerifying(true);
    setSearchError(null);
    
    try {
      const response = await agencyService.verifyContractor(ueiNumber);
      
      if (response.success && response.data) {
        setVerification(response.data);
        setViewMode('result');
      } else {
        setSearchError('Failed to verify contractor');
      }
    } catch {
      setSearchError('An error occurred during verification');
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const handleDirectVerify = useCallback(async () => {
    if (searchType === 'uei' && searchValue.trim()) {
      await handleQuickVerify(searchValue.trim());
    }
  }, [searchType, searchValue, handleQuickVerify]);

  // PDF generation
  const handleDownloadPDF = useCallback(async () => {
    if (!verification) return;
    
    setIsLoadingReport(true);
    
    try {
      const response = await agencyService.generateVerificationReport(verification.businessId);
      
      if (response.success && response.data) {
        setReport(response.data);
        // Generate and download PDF
        generateVerificationPDF(response.data);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsLoadingReport(false);
    }
  }, [verification]);

  // Bulk verification handlers
  const handleFileSelect = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      setSearchError('Please select a CSV file');
      return;
    }
    
    setBulkFile(file);
    setSearchError(null);
    
    // Read and parse the file
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const ueis = agencyService.parseCSVForUEIs(content);
      setBulkUEIs(ueis);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleBulkVerify = useCallback(async () => {
    if (bulkUEIs.length === 0) return;
    
    setIsBulkProcessing(true);
    setBulkProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setBulkProgress((prev) => Math.min(prev + 10, 90));
      }, 300);
      
      const response = await agencyService.bulkVerifyContractors(bulkUEIs);
      
      clearInterval(progressInterval);
      setBulkProgress(100);
      
      if (response.success && response.data) {
        setBulkResults(response.data);
        setViewMode('bulk-results');
      }
    } catch (error) {
      setSearchError('Bulk verification failed');
    } finally {
      setIsBulkProcessing(false);
    }
  }, [bulkUEIs]);

  const handleDownloadResults = useCallback(() => {
    if (!bulkResults) return;
    
    const csv = agencyService.generateResultsCSV(bulkResults);
    agencyService.downloadCSV(csv, `verification_results_${bulkResults.jobId}.csv`);
  }, [bulkResults]);

  const handleDownloadTemplate = useCallback(() => {
    const template = agencyService.getBulkVerificationTemplate();
    agencyService.downloadCSV(template, 'bulk_verification_template.csv');
  }, []);

  const resetBulk = useCallback(() => {
    setBulkFile(null);
    setBulkUEIs([]);
    setBulkResults(null);
    setBulkProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleNewSearch = useCallback(() => {
    setViewMode('search');
    setVerification(null);
    setReport(null);
    setSearchResults([]);
    setSearchValue('');
    resetBulk();
  }, [resetBulk]);

  // Generate PDF (simplified - in production use a proper PDF library)
  const generateVerificationPDF = (reportData: VerificationReport) => {
    // Create a printable HTML document
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const statusColors: Record<string, string> = {
      valid: '#059669',
      expired: '#D97706',
      non_compliant: '#DC2626',
      pending: '#0073c7',
      not_found: '#6B7280',
    };
    
    const statusColor = statusColors[reportData.certificationStatus] || '#6B7280';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>HUBZone Verification Certificate - ${reportData.businessName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Georgia', serif; 
            background: white;
            color: #1f2937;
            line-height: 1.6;
          }
          .certificate {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            border: 3px solid #002e6d;
            position: relative;
          }
          .header {
            text-align: center;
            padding-bottom: 30px;
            border-bottom: 2px solid #e5e7eb;
            margin-bottom: 30px;
          }
          .seal {
            width: 100px;
            height: 100px;
            margin: 0 auto 20px;
            border: 4px solid #002e6d;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            color: #002e6d;
            background: linear-gradient(135deg, #f0f7ff 0%, #e0effe 100%);
          }
          .title {
            font-size: 28px;
            color: #002e6d;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 16px;
            color: #6b7280;
          }
          .status-badge {
            display: inline-block;
            padding: 8px 24px;
            border-radius: 999px;
            font-size: 18px;
            font-weight: bold;
            color: white;
            background: ${statusColor};
            margin: 20px 0;
          }
          .business-name {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin: 20px 0 10px;
          }
          .section {
            margin: 30px 0;
          }
          .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #002e6d;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }
          .info-item {
            padding: 10px 0;
          }
          .info-label {
            font-size: 12px;
            color: #6b7280;
            text-transform: uppercase;
          }
          .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
          }
          .compliance-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #f3f4f6;
          }
          .compliance-status {
            padding: 4px 12px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 600;
          }
          .compliant { background: #d1fae5; color: #065f46; }
          .non-compliant { background: #fee2e2; color: #991b1b; }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
          .qr-placeholder {
            width: 100px;
            height: 100px;
            border: 2px dashed #d1d5db;
            margin: 20px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #9ca3af;
          }
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 120px;
            font-weight: bold;
            color: rgba(0, 46, 109, 0.03);
            white-space: nowrap;
            pointer-events: none;
          }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .certificate { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="watermark">HUBZONE</div>
          
          <div class="header">
            <div class="seal">
              SBA<br/>HUBZone
            </div>
            <h1 class="title">HUBZone Certification Verification</h1>
            <p class="subtitle">U.S. Small Business Administration</p>
            <div class="status-badge">${reportData.certificationStatus.toUpperCase().replace('_', ' ')}</div>
          </div>
          
          <div class="business-name">${reportData.businessName}</div>
          ${reportData.dbaName ? `<p style="color: #6b7280;">DBA: ${reportData.dbaName}</p>` : ''}
          
          <div class="section">
            <h3 class="section-title">Business Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">UEI Number</div>
                <div class="info-value">${reportData.ueiNumber}</div>
              </div>
              <div class="info-item">
                <div class="info-label">CAGE Code</div>
                <div class="info-value">${reportData.cageCode || 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Principal Office</div>
                <div class="info-value">${reportData.principalOfficeAddress}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Compliance Score</div>
                <div class="info-value">${reportData.complianceScore}/100</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h3 class="section-title">Certification Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Certification Date</div>
                <div class="info-value">${reportData.certificationDate ? new Date(reportData.certificationDate).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Expiration Date</div>
                <div class="info-value">${reportData.expirationDate ? new Date(reportData.expirationDate).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h3 class="section-title">Compliance Status</h3>
            <div class="compliance-item">
              <span>Employee Residency (${reportData.compliance.employeeResidency.percentage.toFixed(1)}%)</span>
              <span class="compliance-status ${reportData.compliance.employeeResidency.isCompliant ? 'compliant' : 'non-compliant'}">
                ${reportData.compliance.employeeResidency.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
              </span>
            </div>
            <div class="compliance-item">
              <span>Principal Office</span>
              <span class="compliance-status ${reportData.compliance.principalOffice.isCompliant ? 'compliant' : 'non-compliant'}">
                ${reportData.compliance.principalOffice.isCompliant ? 'VERIFIED' : 'NOT VERIFIED'}
              </span>
            </div>
            <div class="compliance-item">
              <span>Ownership (${reportData.compliance.ownership.percentage.toFixed(1)}%)</span>
              <span class="compliance-status ${reportData.compliance.ownership.isCompliant ? 'compliant' : 'non-compliant'}">
                ${reportData.compliance.ownership.isCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
              </span>
            </div>
          </div>
          
          <div class="qr-placeholder">
            QR Code<br/>Verify Online
          </div>
          
          <div class="footer">
            <p><strong>Report ID:</strong> ${reportData.reportId}</p>
            <p><strong>Generated:</strong> ${new Date(reportData.generatedAt).toLocaleString()}</p>
            <p><strong>Valid Until:</strong> ${new Date(reportData.validUntil).toLocaleDateString()}</p>
            <p style="margin-top: 15px;">
              Verify this certificate at: ${reportData.verificationUrl}
            </p>
            <p style="margin-top: 15px; font-size: 10px;">
              This verification certificate is issued by the U.S. Small Business Administration HUBZone Program.
              For questions, contact the HUBZone Program Office.
            </p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">
            Contractor Verification
          </h1>
          <p className="text-gray-500 mt-1">
            Verify HUBZone certification status for government contractors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setViewMode('search'); resetBulk(); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'search' || viewMode === 'result'
                ? 'bg-hubzone-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Single Verification
          </button>
          <button
            onClick={() => { setViewMode('bulk'); setSearchResults([]); setVerification(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              viewMode === 'bulk' || viewMode === 'bulk-results'
                ? 'bg-hubzone-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Bulk Verification
          </button>
        </div>
      </div>

      {/* Search View */}
      {(viewMode === 'search' || (viewMode === 'result' && !verification)) && (
        <div className="space-y-6">
          {/* Search Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Search for Business</h2>
            
            {/* Search Type Tabs */}
            <div className="flex border-b border-gray-200 mb-6">
              {[
                { id: 'name' as SearchType, label: 'Legal Name', icon: '🏢' },
                { id: 'uei' as SearchType, label: 'UEI Number', icon: '🔢' },
                { id: 'cage' as SearchType, label: 'CAGE Code', icon: '📋' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setSearchType(tab.id); setSearchValue(''); setSearchResults([]); setSearchError(null); }}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    searchType === tab.id
                      ? 'border-hubzone-600 text-hubzone-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
            
            {/* Search Input */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={
                    searchType === 'name' ? 'Enter business legal name...' :
                    searchType === 'uei' ? 'Enter 12-character UEI number...' :
                    'Enter 5-character CAGE code...'
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-hubzone-500 focus:border-hubzone-500 transition-colors"
                />
                {searchValue && (
                  <button
                    onClick={() => setSearchValue('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchValue.trim()}
                className="px-6 py-3 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSearching ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  'Search'
                )}
              </button>
              {searchType === 'uei' && (
                <button
                  onClick={handleDirectVerify}
                  disabled={isVerifying || !searchValue.trim()}
                  className="px-6 py-3 bg-verified-600 text-white font-medium rounded-lg hover:bg-verified-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isVerifying ? 'Verifying...' : 'Verify Now'}
                </button>
              )}
            </div>
            
            {/* Search tips */}
            <div className="mt-4 p-4 bg-hubzone-50 rounded-lg">
              <h4 className="text-sm font-medium text-hubzone-900 mb-2">Search Tips</h4>
              <ul className="text-sm text-hubzone-700 space-y-1">
                {searchType === 'name' && (
                  <>
                    <li>• Enter the business's legal name as registered</li>
                    <li>• Partial names are supported (e.g., "Federal" for "Federal Solutions LLC")</li>
                  </>
                )}
                {searchType === 'uei' && (
                  <>
                    <li>• UEI numbers are 12 alphanumeric characters</li>
                    <li>• Example: ABC123456789</li>
                    <li>• Use "Verify Now" for instant verification</li>
                  </>
                )}
                {searchType === 'cage' && (
                  <>
                    <li>• CAGE codes are 5 alphanumeric characters</li>
                    <li>• Example: 1ABC2</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Error Display */}
          {searchError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700">{searchError}</p>
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900">
                  Search Results ({searchResults.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-gray-900 truncate">
                        {result.legalName}
                      </h4>
                      {result.dbaName && (
                        <p className="text-sm text-gray-500">DBA: {result.dbaName}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>UEI: {result.ueiNumber}</span>
                        {result.cageCode && <span>CAGE: {result.cageCode}</span>}
                        <span>{result.state}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        result.certificationStatus === 'approved' ? 'bg-verified-100 text-verified-700' :
                        result.certificationStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                        result.certificationStatus === 'expired' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {result.certificationStatus.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => handleQuickVerify(result.ueiNumber)}
                        disabled={isVerifying}
                        className="px-4 py-2 bg-hubzone-600 text-white text-sm font-medium rounded-lg hover:bg-hubzone-700 disabled:opacity-50 transition-colors"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verification Result View */}
      {viewMode === 'result' && verification && (
        <VerificationResult
          verification={verification}
          report={report ?? undefined}
          onDownloadPDF={handleDownloadPDF}
          onNewSearch={handleNewSearch}
          isLoadingReport={isLoadingReport}
        />
      )}

      {/* Bulk Verification View */}
      {viewMode === 'bulk' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bulk Verification</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Upload a CSV file with UEI numbers to verify multiple contractors at once
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 text-hubzone-600 font-medium text-sm border border-hubzone-300 rounded-lg hover:bg-hubzone-50 transition-colors"
              >
                Download Template
              </button>
            </div>

            {/* File Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
              className={`relative p-8 rounded-xl border-2 border-dashed transition-colors ${
                dragOver ? 'border-hubzone-500 bg-hubzone-50' :
                bulkFile ? 'border-verified-300 bg-verified-50' :
                'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="text-center">
                {bulkFile ? (
                  <>
                    <div className="w-12 h-12 mx-auto rounded-full bg-verified-100 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{bulkFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {bulkUEIs.length} valid UEI numbers found
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); resetBulk(); }}
                      className="mt-2 text-sm text-red-600 hover:text-red-700"
                    >
                      Remove file
                    </button>
                  </>
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">
                      Drop your CSV file here, or <span className="text-hubzone-600">browse</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">CSV files only • Max 500 UEI numbers</p>
                  </>
                )}
              </div>
            </div>

            {/* Preview */}
            {bulkUEIs.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  UEI Numbers to Verify ({bulkUEIs.length})
                </h4>
                <div className="max-h-40 overflow-y-auto p-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-wrap gap-2">
                    {bulkUEIs.slice(0, 20).map((uei, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-white border border-gray-200 rounded text-xs font-mono text-gray-700"
                      >
                        {uei}
                      </span>
                    ))}
                    {bulkUEIs.length > 20 && (
                      <span className="px-2 py-1 text-xs text-gray-500">
                        +{bulkUEIs.length - 20} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress */}
            {isBulkProcessing && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Processing verifications...</span>
                  <span className="font-medium text-gray-900">{bulkProgress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-hubzone-600 transition-all duration-300"
                    style={{ width: `${bulkProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={resetBulk}
                className="px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleBulkVerify}
                disabled={bulkUEIs.length === 0 || isBulkProcessing}
                className="px-6 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isBulkProcessing ? 'Processing...' : `Verify ${bulkUEIs.length} Contractors`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Results View */}
      {viewMode === 'bulk-results' && bulkResults && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bulk Verification Results</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Job ID: {bulkResults.jobId}
                </p>
              </div>
              <button
                onClick={handleDownloadResults}
                className="inline-flex items-center gap-2 px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-gray-900">{bulkResults.totalRequested}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
              <div className="p-4 bg-verified-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-verified-600">{bulkResults.summary.compliant}</p>
                <p className="text-sm text-verified-700">Compliant</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-red-600">{bulkResults.summary.nonCompliant}</p>
                <p className="text-sm text-red-700">Non-Compliant</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-amber-600">{bulkResults.summary.expired}</p>
                <p className="text-sm text-amber-700">Expired</p>
              </div>
              <div className="p-4 bg-gray-100 rounded-xl text-center">
                <p className="text-2xl font-bold text-gray-600">{bulkResults.summary.notFound}</p>
                <p className="text-sm text-gray-500">Not Found</p>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Detailed Results</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">UEI Number</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Business Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Compliant</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bulkResults.results.map((result, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-gray-50 ${!result.isCompliant ? 'bg-red-50/50' : ''}`}
                    >
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{result.ueiNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {result.businessName || <span className="text-gray-400 italic">Not found</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          result.status === 'valid' ? 'bg-verified-100 text-verified-700' :
                          result.status === 'expired' ? 'bg-amber-100 text-amber-700' :
                          result.status === 'non_compliant' ? 'bg-red-100 text-red-700' :
                          result.status === 'pending' ? 'bg-hubzone-100 text-hubzone-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {result.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {result.isCompliant ? (
                          <span className="inline-flex items-center gap-1 text-verified-600 text-sm">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {result.riskLevel ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${riskBadgeStyles[result.riskLevel]}`}>
                            {result.riskLevel}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-500">
              Completed at {bulkResults.completedAt ? new Date(bulkResults.completedAt).toLocaleString() : 'N/A'}
            </p>
            <button
              onClick={() => { setViewMode('bulk'); resetBulk(); }}
              className="px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
            >
              New Bulk Verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { ContractorVerification };

