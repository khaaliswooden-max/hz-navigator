/**
 * OCR Service
 * 
 * Frontend service for document OCR processing
 */

import { apiClient } from './api';

import type {
  OCRResult,
  W9Data,
  LicenseData,
  AutoPopulateSuggestion,
  ProcessingJobStatus,
} from '../types/ocr';

/**
 * Process a document with OCR
 */
export async function processDocument(
  documentId: string,
  async: boolean = false
): Promise<OCRResult | { status: string; message: string; documentId: string }> {
  const response = await apiClient.post<{ data: OCRResult | { status: string; message: string; documentId: string } }>(
    `/ocr/process/${documentId}`,
    { async }
  );
  return response.data;
}

/**
 * Get OCR result for a document
 */
export async function getOCRResult(documentId: string): Promise<OCRResult | null> {
  try {
    const response = await apiClient.get<{ data: OCRResult }>(`/ocr/result/${documentId}`);
    return response.data;
  } catch (error) {
    // Return null if not found
    if ((error as { response?: { status: number } }).response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Update extracted data after review
 */
export async function updateExtractedData(
  documentId: string,
  updates: Partial<W9Data | LicenseData>
): Promise<OCRResult> {
  const response = await apiClient.put<{ data: OCRResult }>(
    `/ocr/result/${documentId}`,
    { updates }
  );
  return response.data;
}

/**
 * Approve extracted data
 */
export async function approveExtraction(documentId: string): Promise<void> {
  await apiClient.post(`/ocr/approve/${documentId}`);
}

/**
 * Reject extracted data
 */
export async function rejectExtraction(
  documentId: string,
  reason: string
): Promise<void> {
  await apiClient.post(`/ocr/reject/${documentId}`, { reason });
}

/**
 * Get W-9 extracted data
 */
export async function getW9Data(documentId: string): Promise<W9Data> {
  const response = await apiClient.get<{ data: W9Data }>(`/ocr/w9/${documentId}`);
  return response.data;
}

/**
 * Get license extracted data
 */
export async function getLicenseData(documentId: string): Promise<LicenseData> {
  const response = await apiClient.get<{ data: LicenseData }>(`/ocr/license/${documentId}`);
  return response.data;
}

/**
 * Get auto-populate suggestions
 */
export async function getAutoPopulateSuggestion(
  documentId: string
): Promise<AutoPopulateSuggestion> {
  const response = await apiClient.get<{ data: AutoPopulateSuggestion }>(
    `/ocr/auto-populate/${documentId}`
  );
  return response.data;
}

/**
 * Apply auto-populate to business
 */
export async function autoPopulateBusiness(
  documentId: string,
  businessId: string
): Promise<Record<string, unknown>> {
  const response = await apiClient.post<{ data: Record<string, unknown> }>(
    '/ocr/auto-populate/business',
    { documentId, businessId }
  );
  return response.data;
}

/**
 * Apply auto-populate to employee
 */
export async function autoPopulateEmployee(
  documentId: string,
  employeeId?: string
): Promise<Record<string, unknown>> {
  const response = await apiClient.post<{ data: Record<string, unknown> }>(
    '/ocr/auto-populate/employee',
    { documentId, employeeId }
  );
  return response.data;
}

/**
 * Get processing job status
 */
export async function getProcessingStatus(): Promise<ProcessingJobStatus> {
  const response = await apiClient.get<{ data: ProcessingJobStatus }>('/ocr/status');
  return response.data;
}

/**
 * Trigger processing manually (admin)
 */
export async function triggerProcessing(): Promise<void> {
  await apiClient.post('/ocr/trigger-processing');
}

/**
 * Poll for OCR result until complete or timeout
 */
export async function pollForResult(
  documentId: string,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    onProgress?: (attempt: number, status: string) => void;
  } = {}
): Promise<OCRResult | null> {
  const { maxAttempts = 30, intervalMs = 2000, onProgress } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await getOCRResult(documentId);

    if (result) {
      onProgress?.(attempt, result.status);

      if (result.status === 'completed' || result.status === 'requires_review' || result.status === 'failed') {
        return result;
      }
    } else {
      onProgress?.(attempt, 'pending');
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return null;
}

export default {
  processDocument,
  getOCRResult,
  updateExtractedData,
  approveExtraction,
  rejectExtraction,
  getW9Data,
  getLicenseData,
  getAutoPopulateSuggestion,
  autoPopulateBusiness,
  autoPopulateEmployee,
  getProcessingStatus,
  triggerProcessing,
  pollForResult,
};

