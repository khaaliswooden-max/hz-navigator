/**
 * Document Service
 * 
 * Frontend service for document upload and management
 */

import { apiClient } from './api';

import type {
  Document,
  DocumentCategory,
  DocumentFilters,
  DocumentStats,
  DocumentVersion,
  InitUploadData,
  SignedUrlResponse,
  UpdateDocumentData,
  UploadInitResponse,
} from '../types/document';

import type { ApiResponse, PaginatedResponse } from '../types';

/**
 * Initialize document upload to get pre-signed S3 URL
 */
export async function initializeUpload(
  data: InitUploadData
): Promise<UploadInitResponse> {
  return apiClient.post<UploadInitResponse>('/documents/init-upload', data);
}

/**
 * Upload file directly to S3 using pre-signed URL
 */
export async function uploadToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = Math.round((e.loaded / e.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

/**
 * Confirm upload completion
 */
export async function confirmUpload(
  documentId: string,
  s3VersionId?: string
): Promise<Document> {
  const response = await apiClient.post<{ data: Document }>(
    `/documents/${documentId}/confirm`,
    { s3VersionId }
  );
  return response.data;
}

/**
 * Get user documents with filters
 */
export async function getDocuments(
  filters?: DocumentFilters
): Promise<PaginatedResponse<Document>> {
  const params = new URLSearchParams();
  
  if (filters) {
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.businessId) params.append('businessId', filters.businessId);
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.fileType) params.append('fileType', filters.fileType);
    if (filters.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters.uploadedAfter) params.append('uploadedAfter', filters.uploadedAfter);
    if (filters.uploadedBefore) params.append('uploadedBefore', filters.uploadedBefore);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  }

  const queryString = params.toString();
  const url = queryString ? `/documents?${queryString}` : '/documents';
  
  const response = await apiClient.get<{ data: Document[]; pagination: PaginatedResponse<Document>['pagination'] }>(url);
  return {
    data: response.data,
    pagination: response.pagination,
  };
}

/**
 * Get single document by ID
 */
export async function getDocument(documentId: string): Promise<Document> {
  const response = await apiClient.get<{ data: Document }>(`/documents/${documentId}`);
  return response.data;
}

/**
 * Get documents by category
 */
export async function getDocumentsByCategory(
  category: DocumentCategory,
  userId?: string
): Promise<Document[]> {
  const params = userId ? `?userId=${userId}` : '';
  const response = await apiClient.get<{ data: Document[] }>(
    `/documents/category/${category}${params}`
  );
  return response.data;
}

/**
 * Get signed download URL
 */
export async function getDownloadUrl(documentId: string): Promise<SignedUrlResponse> {
  const response = await apiClient.get<{ data: SignedUrlResponse }>(
    `/documents/${documentId}/download`
  );
  return response.data;
}

/**
 * Download document
 */
export async function downloadDocument(document: Document): Promise<void> {
  const { downloadUrl } = await getDownloadUrl(document.id);
  
  if (downloadUrl) {
    // Create temporary link and trigger download
    const link = window.document.createElement('a');
    link.href = downloadUrl;
    link.download = document.originalFilename;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  }
}

/**
 * Update document metadata
 */
export async function updateDocument(
  documentId: string,
  updates: UpdateDocumentData
): Promise<Document> {
  const response = await apiClient.put<{ data: Document }>(
    `/documents/${documentId}`,
    updates
  );
  return response.data;
}

/**
 * Delete document (soft delete)
 */
export async function deleteDocument(documentId: string): Promise<void> {
  await apiClient.delete(`/documents/${documentId}`);
}

/**
 * Get document versions
 */
export async function getDocumentVersions(
  documentId: string
): Promise<DocumentVersion[]> {
  const response = await apiClient.get<{ data: DocumentVersion[] }>(
    `/documents/${documentId}/versions`
  );
  return response.data;
}

/**
 * Get document statistics
 */
export async function getDocumentStats(userId?: string): Promise<DocumentStats> {
  const params = userId ? `?userId=${userId}` : '';
  const response = await apiClient.get<{ data: DocumentStats }>(
    `/documents/user/stats${params}`
  );
  return response.data;
}

/**
 * Get document categories metadata
 */
export async function getCategories(): Promise<{
  categories: Record<DocumentCategory, string>;
  allowedFileTypes: string[];
  maxFileSize: number;
  maxFileSizeMB: number;
}> {
  const response = await apiClient.get<{ data: {
    categories: Record<DocumentCategory, string>;
    allowedFileTypes: string[];
    maxFileSize: number;
    maxFileSizeMB: number;
  } }>('/documents/meta/categories');
  return response.data;
}

/**
 * Full upload flow: initialize, upload to S3, confirm
 */
export async function uploadDocument(
  file: File,
  data: Omit<InitUploadData, 'originalFilename' | 'fileSize'>,
  onProgress?: (progress: number) => void
): Promise<Document> {
  // Initialize upload
  const initData: InitUploadData = {
    ...data,
    originalFilename: file.name,
    fileSize: file.size,
  };

  const initResponse = await initializeUpload(initData);

  // Upload to S3
  await uploadToS3(initResponse.uploadUrl, file, onProgress);

  // Confirm upload
  const document = await confirmUpload(initResponse.documentId);

  return document;
}

/**
 * Upload multiple documents
 */
export async function uploadDocuments(
  files: File[],
  data: Omit<InitUploadData, 'originalFilename' | 'fileSize'>,
  onFileProgress?: (fileIndex: number, progress: number) => void,
  onFileComplete?: (fileIndex: number, document: Document) => void,
  onFileError?: (fileIndex: number, error: Error) => void
): Promise<Document[]> {
  const results: Document[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const document = await uploadDocument(
        files[i],
        data,
        (progress) => onFileProgress?.(i, progress)
      );
      results.push(document);
      onFileComplete?.(i, document);
    } catch (error) {
      onFileError?.(i, error instanceof Error ? error : new Error('Upload failed'));
    }
  }

  return results;
}

/**
 * Search documents by filename and OCR content
 */
export async function searchDocuments(
  query: string,
  filters?: DocumentFilters
): Promise<PaginatedResponse<Document>> {
  const params = new URLSearchParams();
  params.append('q', query);
  
  if (filters) {
    if (filters.category) params.append('category', filters.category);
    if (filters.fileType) params.append('fileType', filters.fileType);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
  }

  const response = await apiClient.get<{ data: Document[]; pagination: PaginatedResponse<Document>['pagination'] }>(
    `/documents/search?${params.toString()}`
  );
  return {
    data: response.data,
    pagination: response.pagination,
  };
}

/**
 * Generate shareable link for a document
 */
export async function generateShareLink(
  documentId: string,
  expiryMinutes: number = 60
): Promise<{ shareUrl: string; expiresAt: string }> {
  const response = await apiClient.post<{ data: { shareUrl: string; expiresAt: string } }>(
    `/documents/${documentId}/share`,
    { expiryMinutes }
  );
  return response.data;
}

/**
 * Bulk download documents as ZIP
 */
export async function bulkDownload(documentIds: string[]): Promise<void> {
  const response = await apiClient.post<{ data: { downloadUrl: string } }>(
    '/documents/bulk/download',
    { documentIds }
  );
  
  // Trigger download
  const link = window.document.createElement('a');
  link.href = response.data.downloadUrl;
  link.download = 'documents.zip';
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
}

/**
 * Bulk delete documents
 */
export async function bulkDelete(documentIds: string[]): Promise<void> {
  await apiClient.post('/documents/bulk/delete', { documentIds });
}

/**
 * Bulk update category for documents
 */
export async function bulkUpdateCategory(
  documentIds: string[],
  category: DocumentCategory
): Promise<void> {
  await apiClient.post('/documents/bulk/category', { documentIds, category });
}

/**
 * Set document expiration date
 */
export async function setDocumentExpiration(
  documentId: string,
  expiresAt: string | null
): Promise<Document> {
  const response = await apiClient.put<{ data: Document }>(
    `/documents/${documentId}`,
    { metadata: { expiresAt } }
  );
  return response.data;
}

/**
 * Get expiring documents
 */
export async function getExpiringDocuments(
  daysUntilExpiry: number = 30
): Promise<Document[]> {
  const response = await apiClient.get<{ data: Document[] }>(
    `/documents/expiring?days=${daysUntilExpiry}`
  );
  return response.data;
}

/**
 * Renew document (extend expiration)
 */
export async function renewDocument(
  documentId: string,
  newExpiryDate: string
): Promise<Document> {
  return setDocumentExpiration(documentId, newExpiryDate);
}

/**
 * Archive document
 */
export async function archiveDocument(documentId: string): Promise<void> {
  await apiClient.post(`/documents/${documentId}/archive`);
}

export default {
  initializeUpload,
  uploadToS3,
  confirmUpload,
  getDocuments,
  getDocument,
  getDocumentsByCategory,
  getDownloadUrl,
  downloadDocument,
  updateDocument,
  deleteDocument,
  getDocumentVersions,
  getDocumentStats,
  getCategories,
  uploadDocument,
  uploadDocuments,
  searchDocuments,
  generateShareLink,
  bulkDownload,
  bulkDelete,
  bulkUpdateCategory,
  setDocumentExpiration,
  getExpiringDocuments,
  renewDocument,
  archiveDocument,
};

