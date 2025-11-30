/**
 * Compliance Types
 */

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending' | 'expired';

export interface ComplianceCheck {
  id: string;
  type: string;
  status: ComplianceStatus;
  checkedAt: string;
  expiresAt?: string;
  details?: Record<string, unknown>;
}

export interface ComplianceReport {
  id: string;
  businessId: string;
  generatedAt: string;
  status: ComplianceStatus;
  checks: ComplianceCheck[];
  summary?: string;
}

export interface ComplianceAlert {
  id: string;
  businessId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: string;
  resolvedAt?: string;
}

