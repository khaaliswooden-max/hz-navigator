import { useState, useCallback, useRef } from 'react';
import employeeService from '../../services/employeeService';
import type { BulkImportResult } from '../../types/employee';

interface BulkImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportStatus = 'idle' | 'uploading' | 'processing' | 'complete' | 'error';

export default function BulkImport({
  isOpen,
  onClose,
  onSuccess,
}: BulkImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);
    setStatus('idle');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleDownloadTemplate = useCallback(async () => {
    try {
      const blob = await employeeService.getImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      // Create a basic template manually
      const template = [
        'first_name,last_name,email,phone,job_title,department,employment_date,street1,street2,city,state,zip_code',
        'John,Doe,john.doe@example.com,(555) 555-5555,Software Engineer,Engineering,2024-01-15,123 Main St,Apt 4B,Washington,DC,20001',
        'Jane,Smith,jane.smith@example.com,(555) 555-5556,Project Manager,Operations,2024-02-01,456 Oak Ave,,Baltimore,MD,21201',
      ].join('\n');
      
      const blob = new Blob([template], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee_import_template.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setStatus('uploading');
    setProgress(0);
    setError(null);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      setStatus('processing');
      const response = await employeeService.bulkImport(file);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (response.success && response.data) {
        setResult(response.data);
        setStatus('complete');
        if (response.data.successCount > 0) {
          onSuccess();
        }
      } else {
        setError(response.error?.message || 'Import failed');
        setStatus('error');
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Import failed');
      setStatus('error');
    }
  }, [file, onSuccess]);

  const handleReset = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bulk Import Employees</h2>
              <p className="text-sm text-gray-500">Upload a CSV file to import multiple employees</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {status === 'complete' && result ? (
              /* Results */
              <div className="space-y-4">
                {/* Summary */}
                <div className={`p-4 rounded-xl ${
                  result.failureCount === 0 
                    ? 'bg-verified-50 border border-verified-200'
                    : result.successCount === 0
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center gap-4">
                    {result.failureCount === 0 ? (
                      <div className="w-12 h-12 rounded-full bg-verified-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : result.successCount === 0 ? (
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3 className={`font-semibold ${
                        result.failureCount === 0 ? 'text-verified-900' :
                        result.successCount === 0 ? 'text-red-900' : 'text-amber-900'
                      }`}>
                        {result.failureCount === 0 ? 'Import Successful' :
                         result.successCount === 0 ? 'Import Failed' : 'Import Completed with Errors'}
                      </h3>
                      <p className={`text-sm ${
                        result.failureCount === 0 ? 'text-verified-700' :
                        result.successCount === 0 ? 'text-red-700' : 'text-amber-700'
                      }`}>
                        {result.successCount} of {result.totalRows} employees imported successfully
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-gray-900">{result.totalRows}</p>
                    <p className="text-sm text-gray-500">Total Rows</p>
                  </div>
                  <div className="p-4 bg-verified-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-verified-600">{result.successCount}</p>
                    <p className="text-sm text-verified-700">Imported</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl text-center">
                    <p className="text-2xl font-bold text-red-600">{result.failureCount}</p>
                    <p className="text-sm text-red-700">Failed</p>
                  </div>
                </div>

                {/* Error Details */}
                {result.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900">Error Details</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {result.errors.map((err, idx) => (
                        <div 
                          key={idx}
                          className="p-3 bg-red-50 border border-red-200 rounded-lg"
                        >
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-red-800">
                                Row {err.row}{err.field && ` - ${err.field}`}
                              </p>
                              <p className="text-xs text-red-600">{err.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Import More
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Upload Form */
              <div className="space-y-4">
                {/* Template Download */}
                <div className="flex items-center justify-between p-4 bg-hubzone-50 rounded-xl border border-hubzone-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-hubzone-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-hubzone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-hubzone-900">Download Template</p>
                      <p className="text-xs text-hubzone-600">Get the CSV template with required fields</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-4 py-2 bg-white text-hubzone-700 font-medium rounded-lg border border-hubzone-300 hover:bg-hubzone-50 transition-colors"
                  >
                    Download
                  </button>
                </div>

                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative p-8 rounded-xl border-2 border-dashed transition-colors ${
                    dragOver
                      ? 'border-hubzone-500 bg-hubzone-50'
                      : file
                      ? 'border-verified-300 bg-verified-50'
                      : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  <div className="text-center">
                    {file ? (
                      <>
                        <div className="w-12 h-12 mx-auto rounded-full bg-verified-100 flex items-center justify-center mb-3">
                          <svg className="w-6 h-6 text-verified-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReset();
                          }}
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
                          Drop your CSV file here, or{' '}
                          <span className="text-hubzone-600">browse</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">CSV files up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Progress */}
                {(status === 'uploading' || status === 'processing') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {status === 'uploading' ? 'Uploading...' : 'Processing...'}
                      </span>
                      <span className="font-medium text-gray-900">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-hubzone-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Required Fields Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Required Fields</h4>
                  <div className="flex flex-wrap gap-2">
                    {['first_name', 'last_name', 'employment_date', 'street1', 'city', 'state', 'zip_code'].map(field => (
                      <span key={field} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 font-mono">
                        {field}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Optional: email, phone, job_title, department, street2
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!file || status === 'uploading' || status === 'processing'}
                    className="px-4 py-2 bg-hubzone-600 text-white font-medium rounded-lg hover:bg-hubzone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {status === 'uploading' || status === 'processing' ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Import Employees'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { BulkImport };

