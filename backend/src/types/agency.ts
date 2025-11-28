/**
 * Agency Verification Types
 * 
 * Types for agency contractor verification system
 */

import type { RiskLevel } from './compliance.js';

/**
 * Verification status
 */
export type VerificationStatus = 
  | 'valid'
  | 'expired' 
  | 'non_compliant'
  | 'pending'
  | 'not_found';

/**
 * Contractor verification result
 */
export interface ContractorVerification {
  id: string;
  businessId: string;
  businessName: string;
  dbaName?: string;
  ueiNumber: string;
  cageCode?: string;
  
  // Certification info
  certificationStatus: VerificationStatus;
  certificationDate?: Date;
  expirationDate?: Date;
  isActive: boolean;
  
  // Compliance details
  compliance: ComplianceBreakdown;
  
  // Risk assessment
  riskLevel: RiskLevel;
  riskScore: number;
  
  // Verification metadata
  verifiedAt: Date;
  verifiedBy?: string;
  verificationId: string;
}

/**
 * Compliance breakdown for verification
 */
export interface ComplianceBreakdown {
  employeeResidency: {
    percentage: number;
    isCompliant: boolean;
    totalEmployees: number;
    hubzoneResidents: number;
  };
  principalOffice: {
    isCompliant: boolean;
    address: string;
    inHubzone: boolean;
    isRedesignated: boolean;
    gracePeriodDaysRemaining?: number;
  };
  ownership: {
    isCompliant: boolean;
    percentage: number;
    citizenOwned: boolean;
  };
  certification: {
    isValid: boolean;
    daysUntilExpiration?: number;
    requiresRecertification: boolean;
  };
}

/**
 * Bulk verification request
 */
export interface BulkVerificationRequest {
  ueiNumbers: string[];
  agencyId: string;
  requestedBy: string;
}

/**
 * Bulk verification result
 */
export interface BulkVerificationResult {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  totalRequested: number;
  processed: number;
  results: BulkVerificationItem[];
  startedAt: Date;
  completedAt?: Date;
  summary: BulkVerificationSummary;
}

/**
 * Individual item in bulk verification
 */
export interface BulkVerificationItem {
  ueiNumber: string;
  status: VerificationStatus;
  businessName?: string;
  certificationStatus?: string;
  isCompliant: boolean;
  riskLevel?: RiskLevel;
  errorMessage?: string;
}

/**
 * Summary of bulk verification
 */
export interface BulkVerificationSummary {
  compliant: number;
  nonCompliant: number;
  expired: number;
  notFound: number;
  errors: number;
}

/**
 * Verification history record
 */
export interface VerificationHistoryRecord {
  id: string;
  agencyId: string;
  agencyName?: string;
  businessId: string;
  businessName: string;
  ueiNumber: string;
  verificationStatus: VerificationStatus;
  complianceScore: number;
  riskLevel: RiskLevel;
  verifiedAt: Date;
  verifiedBy?: string;
  method: 'single' | 'bulk';
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Verification report for PDF generation
 */
export interface VerificationReport {
  // Header
  reportId: string;
  generatedAt: Date;
  validUntil: Date;
  
  // Agency info
  agencyName: string;
  agencyId: string;
  verifierName?: string;
  
  // Business info
  businessName: string;
  dbaName?: string;
  ueiNumber: string;
  cageCode?: string;
  principalOfficeAddress: string;
  
  // Certification
  certificationStatus: VerificationStatus;
  certificationNumber?: string;
  certificationDate?: Date;
  expirationDate?: Date;
  
  // Compliance
  compliance: ComplianceBreakdown;
  complianceScore: number;
  riskLevel: RiskLevel;
  
  // QR code verification URL
  qrCodeUrl: string;
  verificationUrl: string;
}

/**
 * Agency verification filters
 */
export interface VerificationFilters {
  agencyId?: string;
  businessId?: string;
  ueiNumber?: string;
  status?: VerificationStatus;
  riskLevel?: RiskLevel;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Search parameters for contractor lookup
 */
export interface ContractorSearchParams {
  legalName?: string;
  ueiNumber?: string;
  cageCode?: string;
}

