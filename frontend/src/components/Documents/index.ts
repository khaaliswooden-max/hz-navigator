/**
 * Documents Components
 * 
 * Components for document upload and management
 */

export { FileUpload } from './FileUpload';
export { default as FileUploadDefault } from './FileUpload';
export { DocumentReview } from './DocumentReview';
export { default as DocumentReviewDefault } from './DocumentReview';
export { DocumentCard, FileTypeIcon, CategoryBadge } from './DocumentCard';
export { default as DocumentCardDefault } from './DocumentCard';
export { DocumentViewer, DocumentPreview } from './DocumentViewer';
export { default as DocumentViewerDefault } from './DocumentViewer';

// Re-export document types
export type {
  DocumentCategory,
  DocumentStatus,
  AllowedFileType,
  Document,
  DocumentVersion,
  DocumentMetadata,
  DocumentFilters,
  DocumentStats,
  UploadFileState,
  InitUploadData,
  UpdateDocumentData,
} from '../../types/document';

// Re-export OCR types
export type {
  OCRStatus,
  OCRResult,
  ExtractedField,
  ExtractedTable,
  W9Data,
  LicenseData,
  CertificateData,
  DetectedDocumentType,
  AutoPopulateSuggestion,
} from '../../types/ocr';

// Re-export document utilities
export {
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  STATUS_COLORS,
  STATUS_LABELS,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  formatFileSize,
  validateFile,
  isImageType,
  getFileExtension,
  isAllowedFileType,
  getAcceptString,
} from '../../types/document';

// Re-export OCR utilities
export {
  CONFIDENCE_THRESHOLDS,
  OCR_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  W9_FIELD_LABELS,
  LICENSE_FIELD_LABELS,
  getConfidenceLevel,
  getConfidenceColor,
  getConfidenceBgColor,
} from '../../types/ocr';

