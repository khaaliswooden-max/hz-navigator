/**
 * Agency Verification Types (Frontend)
 */

/**
 * Verification status types
 */
export type VerificationStatus = 
  | 'valid'
  | 'expired' 
  | 'non_compliant'
  | 'pending'
  | 'not_found';

/**
 * Risk level types
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Contractor search result
 */
export interface ContractorSearchResult {
  id: string;
  legalName: string;
  dbaName?: string;
  ueiNumber: string;
  cageCode?: string;
  state: string;
  certificationStatus: string;
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
 * Full contractor verification result
 */
export interface ContractorVerification {
  id: string;
  businessId: string;
  businessName: string;
  dbaName?: string;
  ueiNumber: string;
  cageCode?: string;
  
  certificationStatus: VerificationStatus;
  certificationDate?: string;
  expirationDate?: string;
  isActive: boolean;
  
  compliance: ComplianceBreakdown;
  
  riskLevel: RiskLevel;
  riskScore: number;
  
  verifiedAt: string;
  verifiedBy?: string;
  verificationId: string;
}

/**
 * Bulk verification item
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
 * Bulk verification summary
 */
export interface BulkVerificationSummary {
  compliant: number;
  nonCompliant: number;
  expired: number;
  notFound: number;
  errors: number;
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
  startedAt: string;
  completedAt?: string;
  summary: BulkVerificationSummary;
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
  verifiedAt: string;
  verifiedBy?: string;
  method: 'single' | 'bulk';
}

/**
 * Verification report for PDF generation
 */
export interface VerificationReport {
  reportId: string;
  generatedAt: string;
  validUntil: string;
  
  agencyName: string;
  agencyId: string;
  verifierName?: string;
  
  businessName: string;
  dbaName?: string;
  ueiNumber: string;
  cageCode?: string;
  principalOfficeAddress: string;
  
  certificationStatus: VerificationStatus;
  certificationNumber?: string;
  certificationDate?: string;
  expirationDate?: string;
  
  compliance: ComplianceBreakdown;
  complianceScore: number;
  riskLevel: RiskLevel;
  
  qrCodeUrl: string;
  verificationUrl: string;
}

/**
 * Search parameters
 */
export interface ContractorSearchParams {
  legalName?: string;
  ueiNumber?: string;
  cageCode?: string;
}

/**
 * Verification history filters
 */
export interface VerificationHistoryFilters {
  status?: VerificationStatus;
  riskLevel?: RiskLevel;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

