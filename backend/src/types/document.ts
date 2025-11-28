/**
 * Document Types
 * 
 * Types for document upload and management system
 */

/**
 * Document categories for organizing uploads
 */
export type DocumentCategory =
  | 'certification'
  | 'employee_verification'
  | 'ownership'
  | 'contract'
  | 'compliance_report'
  | 'miscellaneous';

/**
 * Document status throughout lifecycle
 */
export type DocumentStatus =
  | 'pending'
  | 'uploaded'
  | 'processing'
  | 'verified'
  | 'rejected'
  | 'archived';

/**
 * Allowed file types for upload
 */
export type AllowedFileType =
  | 'pdf'
  | 'doc'
  | 'docx'
  | 'xls'
  | 'xlsx'
  | 'jpg'
  | 'jpeg'
  | 'png';

/**
 * MIME types mapping
 */
export const MIME_TYPE_MAP: Record<AllowedFileType, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Document metadata interface
 */
export interface DocumentMetadata {
  /** Related entity ID (employee, certification, etc.) */
  relatedEntityId?: string;
  /** Related entity type */
  relatedEntityType?: string;
  /** Document expiration date */
  expiresAt?: Date;
  /** Custom attributes */
  attributes?: Record<string, string | number | boolean>;
  /** Checksum/hash of the file */
  checksum?: string;
  /** Original upload source */
  source?: 'web' | 'api' | 'bulk_import';
}

/**
 * Main document entity
 */
export interface Document {
  id: string;
  userId: string;
  businessId?: string;
  category: DocumentCategory;
  filename: string;
  originalFilename: string;
  fileSize: number;
  fileType: AllowedFileType;
  mimeType: string;
  s3Bucket: string;
  s3Key: string;
  s3VersionId?: string;
  status: DocumentStatus;
  metadata: DocumentMetadata;
  description?: string;
  tags: string[];
  uploadedAt: Date;
  uploadedBy: string;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Document version for tracking changes
 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  s3Key: string;
  s3VersionId?: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
  changeNotes?: string;
}

/**
 * Document access log entry
 */
export interface DocumentAccessLog {
  id: string;
  documentId: string;
  userId: string;
  action: 'view' | 'download' | 'update' | 'delete';
  ipAddress?: string;
  userAgent?: string;
  accessedAt: Date;
}

/**
 * Data for uploading a new document
 */
export interface UploadDocumentData {
  category: DocumentCategory;
  originalFilename: string;
  fileSize: number;
  fileType: AllowedFileType;
  mimeType: string;
  businessId?: string;
  description?: string;
  tags?: string[];
  metadata?: DocumentMetadata;
}

/**
 * Data for updating document metadata
 */
export interface UpdateDocumentData {
  category?: DocumentCategory;
  description?: string;
  tags?: string[];
  status?: DocumentStatus;
  metadata?: Partial<DocumentMetadata>;
}

/**
 * Filters for querying documents
 */
export interface DocumentFilters {
  userId?: string;
  businessId?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  fileType?: AllowedFileType;
  tags?: string[];
  uploadedAfter?: Date;
  uploadedBefore?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'uploadedAt' | 'filename' | 'fileSize' | 'category';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

/**
 * Pre-signed URL response
 */
export interface SignedUrlResponse {
  uploadUrl?: string;
  downloadUrl?: string;
  expiresAt: Date;
  s3Key: string;
}

/**
 * Upload initiation response
 */
export interface UploadInitResponse {
  documentId: string;
  uploadUrl: string;
  s3Key: string;
  expiresAt: Date;
  maxFileSize: number;
}

/**
 * Document summary for lists
 */
export interface DocumentSummary {
  id: string;
  filename: string;
  originalFilename: string;
  category: DocumentCategory;
  fileType: AllowedFileType;
  fileSize: number;
  status: DocumentStatus;
  uploadedAt: Date;
  thumbnailUrl?: string;
}

/**
 * Category labels for display
 */
export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  certification: 'Certification Documents',
  employee_verification: 'Employee Verification',
  ownership: 'Ownership Documentation',
  contract: 'Contracts',
  compliance_report: 'Compliance Reports',
  miscellaneous: 'Miscellaneous',
};

/**
 * File type icons mapping
 */
export const FILE_TYPE_ICONS: Record<AllowedFileType, string> = {
  pdf: 'document-text',
  doc: 'document',
  docx: 'document',
  xls: 'table-cells',
  xlsx: 'table-cells',
  jpg: 'photo',
  jpeg: 'photo',
  png: 'photo',
};

/**
 * Check if a file type is an image
 */
export function isImageType(fileType: AllowedFileType): boolean {
  return ['jpg', 'jpeg', 'png'].includes(fileType);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Validate file type
 */
export function isAllowedFileType(extension: string): extension is AllowedFileType {
  const allowed: AllowedFileType[] = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];
  return allowed.includes(extension as AllowedFileType);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

