import { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { Button } from '../Common/Button';
import { ProgressBar } from '../Common/ProgressBar';
import { LoadingSpinner } from '../Common/LoadingSpinner';

import {
  getOCRResult,
  updateExtractedData,
  approveExtraction,
  rejectExtraction,
  processDocument,
  pollForResult,
  getAutoPopulateSuggestion,
} from '../../services/ocrService';
import { getDownloadUrl } from '../../services/documentService';

import type { Document } from '../../types/document';
import type {
  OCRResult,
  ExtractedField,
  W9Data,
  LicenseData,
  OCRStatus,
  DetectedDocumentType,
} from '../../types/ocr';

import {
  getConfidenceLevel,
  getConfidenceColor,
  getConfidenceBgColor,
  OCR_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  W9_FIELD_LABELS,
  LICENSE_FIELD_LABELS,
  CONFIDENCE_THRESHOLDS,
} from '../../types/ocr';

interface DocumentReviewProps {
  /** Document to review */
  document: Document;
  /** Callback when review is complete */
  onComplete?: (approved: boolean, data?: Record<string, unknown>) => void;
  /** Callback when auto-populate is requested */
  onAutoPopulate?: (type: 'business' | 'employee', data: Record<string, unknown>) => void;
  /** Show document preview */
  showPreview?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * DocumentReview - OCR extraction review and editing component
 * 
 * Features:
 * - Side-by-side document view and extracted data
 * - Editable extracted fields
 * - Confidence indicators
 * - Approve/Reject actions
 * - Auto-populate suggestions
 */
export function DocumentReview({
  document,
  onComplete,
  onAutoPopulate,
  showPreview = true,
  className,
}: DocumentReviewProps) {
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'extracted' | 'raw' | 'fields'>('extracted');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Load OCR result and document preview
  useEffect(() => {
    loadData();
  }, [document.id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get OCR result
      const result = await getOCRResult(document.id);
      setOcrResult(result);

      // Initialize edited data from structured data
      if (result?.structuredData) {
        const data: Record<string, string> = {};
        for (const [key, value] of Object.entries(result.structuredData)) {
          if (value !== undefined && value !== null) {
            data[key] = String(value);
          }
        }
        setEditedData(data);
      }

      // Get document preview URL
      if (showPreview) {
        const { downloadUrl } = await getDownloadUrl(document.id);
        setPreviewUrl(downloadUrl ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start OCR processing
   */
  const handleStartProcessing = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Start async processing
      await processDocument(document.id, true);

      // Poll for result
      const result = await pollForResult(document.id, {
        maxAttempts: 60,
        intervalMs: 2000,
        onProgress: (attempt, status) => {
          // Progress callback
        },
      });

      if (result) {
        setOcrResult(result);
        if (result.structuredData) {
          const data: Record<string, string> = {};
          for (const [key, value] of Object.entries(result.structuredData)) {
            if (value !== undefined && value !== null) {
              data[key] = String(value);
            }
          }
          setEditedData(data);
        }
      } else {
        setError('Processing timed out. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Handle field edit
   */
  const handleFieldChange = useCallback((key: string, value: string) => {
    setEditedData(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Save edited data
   */
  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateExtractedData(document.id, editedData);
      setOcrResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Approve extraction
   */
  const handleApprove = async () => {
    setSaving(true);
    try {
      // Save any edits first
      if (Object.keys(editedData).length > 0) {
        await updateExtractedData(document.id, editedData);
      }

      await approveExtraction(document.id);
      onComplete?.(true, editedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reject extraction
   */
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      return;
    }

    setSaving(true);
    try {
      await rejectExtraction(document.id, rejectReason);
      setShowRejectModal(false);
      onComplete?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle auto-populate
   */
  const handleAutoPopulate = async () => {
    try {
      const suggestion = await getAutoPopulateSuggestion(document.id);

      if (suggestion.canPopulate !== 'none') {
        onAutoPopulate?.(suggestion.canPopulate, suggestion.fields);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get auto-populate data');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={clsx('flex items-center justify-center p-12', className)}>
        <LoadingSpinner />
      </div>
    );
  }

  // No OCR result - offer to process
  if (!ocrResult) {
    return (
      <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-hubzone-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-hubzone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Document Not Processed
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            This document hasn't been processed yet. Start OCR processing to extract data automatically.
          </p>
          <Button
            variant="primary"
            onClick={handleStartProcessing}
            loading={processing}
            loadingText="Processing..."
          >
            Start OCR Processing
          </Button>
        </div>
      </div>
    );
  }

  // Processing state
  if (processing || ocrResult.status === 'processing') {
    return (
      <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
        <div className="p-8 text-center">
          <LoadingSpinner className="mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Processing Document
          </h3>
          <p className="text-gray-600 mb-4">
            Extracting text and data from your document...
          </p>
          <ProgressBar value={50} indeterminate color="primary" className="max-w-xs mx-auto" />
        </div>
      </div>
    );
  }

  // Failed state
  if (ocrResult.status === 'failed') {
    return (
      <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Processing Failed
          </h3>
          <p className="text-gray-600 mb-4">
            {ocrResult.errors?.[0] ?? 'We couldn\'t process this document. Please try uploading a clearer version.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => onComplete?.(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleStartProcessing}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Document Review
            </h2>
            <StatusBadge status={ocrResult.status} />
          </div>
          <div className="flex items-center gap-3">
            <ConfidenceBadge confidence={ocrResult.overallConfidence} />
            {ocrResult.documentType && (
              <span className="text-sm text-gray-500">
                {DOCUMENT_TYPE_LABELS[ocrResult.documentType]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-6 py-3 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Main content - Side by side layout */}
      <div className="flex flex-col lg:flex-row">
        {/* Document Preview */}
        {showPreview && previewUrl && (
          <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-200">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Original Document</h3>
              <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ height: '600px' }}>
                {document.fileType === 'pdf' ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title="Document preview"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={document.originalFilename}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Extracted Data */}
        <div className={clsx('flex-1', showPreview && previewUrl ? '' : 'w-full')}>
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {(['extracted', 'fields', 'raw'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab
                      ? 'border-hubzone-600 text-hubzone-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {tab === 'extracted' && 'Extracted Data'}
                  {tab === 'fields' && 'All Fields'}
                  {tab === 'raw' && 'Raw Text'}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-4 overflow-y-auto" style={{ maxHeight: '540px' }}>
            {activeTab === 'extracted' && (
              <StructuredDataEditor
                documentType={ocrResult.documentType}
                data={editedData}
                fields={ocrResult.fields}
                onChange={handleFieldChange}
              />
            )}

            {activeTab === 'fields' && (
              <FieldsList fields={ocrResult.fields} />
            )}

            {activeTab === 'raw' && (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {ocrResult.rawText || 'No raw text available'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onAutoPopulate && ocrResult.documentType && ocrResult.documentType !== 'unknown' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoPopulate}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Auto-fill Form
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              loading={saving}
              disabled={Object.keys(editedData).length === 0}
            >
              Save Changes
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowRejectModal(true)}
              disabled={saving}
            >
              Reject
            </Button>
            <Button
              variant="success"
              onClick={handleApprove}
              loading={saving}
              loadingText="Approving..."
            >
              Approve & Continue
            </Button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Document
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this document extraction.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="input w-full mb-4"
              rows={3}
              placeholder="Enter rejection reason..."
            />
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                loading={saving}
                disabled={!rejectReason.trim()}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: OCRStatus }) {
  const colors = {
    pending: 'bg-gray-100 text-gray-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-verified-100 text-verified-700',
    failed: 'bg-red-100 text-red-700',
    requires_review: 'bg-amber-100 text-amber-700',
  };

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      colors[status]
    )}>
      {OCR_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Confidence Badge Component
 */
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = getConfidenceLevel(confidence);

  return (
    <div className={clsx(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      getConfidenceBgColor(confidence),
      getConfidenceColor(confidence)
    )}>
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        {level === 'high' && (
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        )}
        {level === 'medium' && (
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        )}
        {level === 'low' && (
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        )}
      </svg>
      {confidence}% confidence
    </div>
  );
}

/**
 * Structured Data Editor Component
 */
function StructuredDataEditor({
  documentType,
  data,
  fields,
  onChange,
}: {
  documentType?: DetectedDocumentType;
  data: Record<string, string>;
  fields: ExtractedField[];
  onChange: (key: string, value: string) => void;
}) {
  // Get appropriate labels based on document type
  const labels = documentType === 'w9'
    ? W9_FIELD_LABELS
    : documentType === 'license'
      ? LICENSE_FIELD_LABELS
      : {};

  // Create field confidence map
  const confidenceMap = new Map<string, number>();
  for (const field of fields) {
    const normalizedKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, '');
    confidenceMap.set(normalizedKey, field.confidence);
  }

  // Get confidence for a field
  const getFieldConfidence = (key: string): number | undefined => {
    const normalizedKey = key.toLowerCase();
    return confidenceMap.get(normalizedKey);
  };

  // Render fields in groups
  const fieldGroups = documentType === 'w9'
    ? [
      { title: 'Business Information', keys: ['businessName', 'businessType', 'ein'] },
      { title: 'Address', keys: ['address', 'city', 'state', 'zipCode'] },
      { title: 'Tax Information', keys: ['exemptPayeeCode', 'fatcaExemptionCode', 'accountNumbers'] },
    ]
    : documentType === 'license'
      ? [
        { title: 'Personal Information', keys: ['firstName', 'lastName', 'middleName', 'dateOfBirth'] },
        { title: 'Document Details', keys: ['idNumber', 'issueDate', 'expirationDate', 'licenseClass'] },
        { title: 'Address', keys: ['address', 'city', 'state', 'zipCode'] },
      ]
      : [{ title: 'Extracted Fields', keys: Object.keys(data) }];

  return (
    <div className="space-y-6">
      {fieldGroups.map((group) => (
        <div key={group.title}>
          <h4 className="text-sm font-medium text-gray-700 mb-3">{group.title}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {group.keys.map((key) => {
              const value = data[key] ?? '';
              const label = (labels as Record<string, string>)[key] ?? key;
              const confidence = getFieldConfidence(key);

              return (
                <div key={key}>
                  <label className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-600">{label}</span>
                    {confidence !== undefined && (
                      <span className={clsx(
                        'text-xs',
                        getConfidenceColor(confidence)
                      )}>
                        {confidence}%
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(key, e.target.value)}
                    className={clsx(
                      'input w-full text-sm',
                      confidence !== undefined && confidence < CONFIDENCE_THRESHOLDS.MEDIUM && 'border-amber-300 bg-amber-50'
                    )}
                    placeholder={`Enter ${label.toLowerCase()}`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Fields List Component - Shows all extracted fields
 */
function FieldsList({ fields }: { fields: ExtractedField[] }) {
  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No fields were extracted from this document.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <div
          key={`${field.key}-${index}`}
          className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700">{field.key}</p>
            <p className="text-sm text-gray-900 mt-0.5">{field.value || '—'}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className={clsx(
              'text-xs font-medium',
              getConfidenceColor(field.confidence)
            )}>
              {field.confidence}%
            </span>
            {field.pageNumber && (
              <span className="text-xs text-gray-400">
                Page {field.pageNumber}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default DocumentReview;

