/**
 * Document Types for Frontend
 */

/**
 * Document categories
 */
export type DocumentCategory =
  | 'certification'
  | 'employee_verification'
  | 'ownership'
  | 'contract'
  | 'compliance_report'
  | 'miscellaneous';

/**
 * Document status
 */
export type DocumentStatus =
  | 'pending'
  | 'uploaded'
  | 'processing'
  | 'verified'
  | 'rejected'
  | 'archived';

/**
 * Allowed file types
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
 * Extension to MIME type mapping
 */
export const EXTENSION_TO_MIME: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

/**
 * Allowed MIME types for validation
 */
export const ALLOWED_MIME_TYPES = Object.values(MIME_TYPE_MAP);

/**
 * Allowed file extensions
 */
export const ALLOWED_EXTENSIONS: AllowedFileType[] = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'
];

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Document metadata
 */
export interface DocumentMetadata {
  relatedEntityId?: string;
  relatedEntityType?: string;
  expiresAt?: string;
  attributes?: Record<string, string | number | boolean>;
  checksum?: string;
  source?: 'web' | 'api' | 'bulk_import';
}

/**
 * Main document interface
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
  uploadedAt: string;
  uploadedBy: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Document version
 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  s3Key: string;
  s3VersionId?: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  changeNotes?: string;
}

/**
 * Upload initialization response
 */
export interface UploadInitResponse {
  documentId: string;
  uploadUrl: string;
  s3Key: string;
  expiresAt: string;
  maxFileSize: number;
}

/**
 * Signed URL response
 */
export interface SignedUrlResponse {
  uploadUrl?: string;
  downloadUrl?: string;
  expiresAt: string;
  s3Key: string;
}

/**
 * Upload data for initializing upload
 */
export interface InitUploadData {
  originalFilename: string;
  fileSize: number;
  category: DocumentCategory;
  businessId?: string;
  description?: string;
  tags?: string[];
  metadata?: DocumentMetadata;
}

/**
 * Update document data
 */
export interface UpdateDocumentData {
  category?: DocumentCategory;
  description?: string;
  tags?: string[];
  status?: DocumentStatus;
  metadata?: Partial<DocumentMetadata>;
}

/**
 * Document filters
 */
export interface DocumentFilters {
  userId?: string;
  businessId?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  fileType?: AllowedFileType;
  tags?: string[];
  uploadedAfter?: string;
  uploadedBefore?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'uploadedAt' | 'filename' | 'fileSize' | 'category';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Document stats
 */
export interface DocumentStats {
  totalDocuments: number;
  totalSize: number;
  byCategory: Record<DocumentCategory, number>;
  byStatus: Record<DocumentStatus, number>;
}

/**
 * Category labels
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
 * Category descriptions
 */
export const CATEGORY_DESCRIPTIONS: Record<DocumentCategory, string> = {
  certification: 'HUBZone certification applications and supporting documents',
  employee_verification: 'Employee residency and employment verification documents',
  ownership: 'Business ownership and structure documentation',
  contract: 'Government contracts and related documents',
  compliance_report: 'Annual compliance reports and recertification documents',
  miscellaneous: 'Other supporting documents',
};

/**
 * Status colors for badges
 */
export const STATUS_COLORS: Record<DocumentStatus, 'gray' | 'blue' | 'yellow' | 'green' | 'red' | 'purple'> = {
  pending: 'yellow',
  uploaded: 'blue',
  processing: 'blue',
  verified: 'green',
  rejected: 'red',
  archived: 'gray',
};

/**
 * Status labels
 */
export const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Pending Upload',
  uploaded: 'Uploaded',
  processing: 'Processing',
  verified: 'Verified',
  rejected: 'Rejected',
  archived: 'Archived',
};

/**
 * File type icons (Heroicons names)
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
 * Check if file type is an image
 */
export function isImageType(fileType: AllowedFileType | string): boolean {
  return ['jpg', 'jpeg', 'png'].includes(fileType.toLowerCase());
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Check if file type is allowed
 */
export function isAllowedFileType(extension: string): extension is AllowedFileType {
  return ALLOWED_EXTENSIONS.includes(extension.toLowerCase() as AllowedFileType);
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

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds ${formatFileSize(MAX_FILE_SIZE)} limit`,
    };
  }

  // Check file type
  const extension = getFileExtension(file.name);
  if (!isAllowedFileType(extension)) {
    return {
      valid: false,
      error: `File type .${extension} is not allowed. Accepted: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG`,
    };
  }

  return { valid: true };
}

/**
 * Get accept string for file input
 */
export function getAcceptString(): string {
  return Object.keys(EXTENSION_TO_MIME).join(',');
}

/**
 * Upload file state for tracking progress
 */
export interface UploadFileState {
  id: string;
  file: File;
  progress: number;
  status: 'queued' | 'uploading' | 'complete' | 'error' | 'cancelled';
  error?: string;
  documentId?: string;
  uploadUrl?: string;
  previewUrl?: string;
}

/**
 * Create upload file state from file
 */
export function createUploadFileState(file: File): UploadFileState {
  const isImage = isImageType(getFileExtension(file.name));
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    file,
    progress: 0,
    status: 'queued',
    previewUrl: isImage ? URL.createObjectURL(file) : undefined,
  };
}

