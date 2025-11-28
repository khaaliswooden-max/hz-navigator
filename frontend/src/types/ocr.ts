/**
 * OCR Types for Frontend
 */

/**
 * OCR Processing Status
 */
export type OCRStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'requires_review';

/**
 * Confidence thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 95,
  MEDIUM: 80,
  LOW: 60,
} as const;

/**
 * Bounding box for field location on document
 */
export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Extracted field with confidence score
 */
export interface ExtractedField {
  key: string;
  value: string;
  confidence: number;
  boundingBox?: BoundingBox;
  pageNumber?: number;
}

/**
 * Table cell
 */
export interface TableCell {
  rowIndex: number;
  columnIndex: number;
  text: string;
  confidence: number;
}

/**
 * Extracted table from document
 */
export interface ExtractedTable {
  pageNumber: number;
  rows: number;
  columns: number;
  cells: TableCell[];
  confidence: number;
}

/**
 * W-9 Form extracted data
 */
export interface W9Data {
  businessName?: string;
  businessType?: string;
  exemptPayeeCode?: string;
  fatcaExemptionCode?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  accountNumbers?: string;
  ein?: string;
  ssn?: string;
  certificationDate?: string;
  signature?: boolean;
}

/**
 * License/ID extracted data
 */
export interface LicenseData {
  documentType?: string;
  idNumber?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  fullName?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  issueDate?: string;
  expirationDate?: string;
  issuingAuthority?: string;
  licenseClass?: string;
  restrictions?: string;
  photo?: boolean;
}

/**
 * Certificate extracted data
 */
export interface CertificateData {
  certificateType?: string;
  certificateNumber?: string;
  businessName?: string;
  issueDate?: string;
  expirationDate?: string;
  issuingAgency?: string;
  status?: string;
}

/**
 * Document types that can be detected
 */
export type DetectedDocumentType = 'w9' | 'license' | 'certificate' | 'contract' | 'unknown';

/**
 * Complete OCR Result
 */
export interface OCRResult {
  status: OCRStatus;
  processedAt?: string;
  processingTime?: number;
  textractJobId?: string;
  rawText?: string;
  fields: ExtractedField[];
  tables: ExtractedTable[];
  documentType?: DetectedDocumentType;
  structuredData?: W9Data | LicenseData | CertificateData;
  overallConfidence: number;
  pageCount: number;
  errors?: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  approved?: boolean;
}

/**
 * Auto-populate suggestion
 */
export interface AutoPopulateSuggestion {
  documentType: string;
  canPopulate: 'business' | 'employee' | 'none';
  confidence: number;
  fields: Record<string, unknown>;
}

/**
 * Processing job status
 */
export interface ProcessingJobStatus {
  isRunning: boolean;
  isProcessing: boolean;
  queueLength: number;
  processedCount: number;
  errorCount: number;
}

/**
 * Get confidence level label
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return 'high';
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

/**
 * Get confidence color
 */
export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high':
      return 'text-verified-600';
    case 'medium':
      return 'text-amber-600';
    case 'low':
      return 'text-red-600';
  }
}

/**
 * Get confidence background color
 */
export function getConfidenceBgColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high':
      return 'bg-verified-100';
    case 'medium':
      return 'bg-amber-100';
    case 'low':
      return 'bg-red-100';
  }
}

/**
 * OCR Status labels
 */
export const OCR_STATUS_LABELS: Record<OCRStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
  requires_review: 'Needs Review',
};

/**
 * Document type labels
 */
export const DOCUMENT_TYPE_LABELS: Record<DetectedDocumentType, string> = {
  w9: 'W-9 Tax Form',
  license: 'Driver License / ID',
  certificate: 'Certificate',
  contract: 'Contract',
  unknown: 'Unknown Document',
};

/**
 * W-9 field labels
 */
export const W9_FIELD_LABELS: Record<keyof W9Data, string> = {
  businessName: 'Business Name',
  businessType: 'Business Type',
  exemptPayeeCode: 'Exempt Payee Code',
  fatcaExemptionCode: 'FATCA Exemption Code',
  address: 'Street Address',
  city: 'City',
  state: 'State',
  zipCode: 'ZIP Code',
  accountNumbers: 'Account Numbers',
  ein: 'Employer Identification Number (EIN)',
  ssn: 'Social Security Number',
  certificationDate: 'Certification Date',
  signature: 'Signature Present',
};

/**
 * License field labels
 */
export const LICENSE_FIELD_LABELS: Record<keyof LicenseData, string> = {
  documentType: 'Document Type',
  idNumber: 'ID Number',
  firstName: 'First Name',
  lastName: 'Last Name',
  middleName: 'Middle Name',
  fullName: 'Full Name',
  dateOfBirth: 'Date of Birth',
  address: 'Street Address',
  city: 'City',
  state: 'State',
  zipCode: 'ZIP Code',
  issueDate: 'Issue Date',
  expirationDate: 'Expiration Date',
  issuingAuthority: 'Issuing Authority',
  licenseClass: 'License Class',
  restrictions: 'Restrictions',
  photo: 'Photo Present',
};

