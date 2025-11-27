import { z } from 'zod';

/**
 * Owner entity
 */
export interface Owner {
  id: string;
  businessId: string;
  ownerName: string;
  ownershipPercentage: number;
  isUsCitizen: boolean;
  isControlPerson: boolean;
  title?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Ownership summary metrics
 */
export interface OwnershipSummary {
  totalOwnershipPercentage: number;
  usCitizenOwnershipPercentage: number;
  nonCitizenOwnershipPercentage: number;
  ownerCount: number;
  usCitizenCount: number;
  nonCitizenCount: number;
  isValid: boolean;
  isCompliant: boolean;
  remainingPercentage: number;
  requiredUsCitizenPercentage: number;
}

/**
 * Ownership compliance status
 */
export type OwnershipComplianceStatus = 
  | 'compliant'
  | 'non_compliant_citizenship'
  | 'non_compliant_total'
  | 'incomplete';

/**
 * Compliance recommendation
 */
export interface ComplianceRecommendation {
  type: 'warning' | 'error' | 'success' | 'info';
  title: string;
  message: string;
  action?: string;
}

// Zod Schemas for validation

export const ownerFormSchema = z.object({
  ownerName: z.string().min(1, 'Owner name is required').max(200, 'Name too long'),
  ownershipPercentage: z.number()
    .min(0.01, 'Ownership must be at least 0.01%')
    .max(100, 'Ownership cannot exceed 100%'),
  isUsCitizen: z.boolean(),
  isControlPerson: z.boolean().default(false),
  title: z.string().optional().or(z.literal('')),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
});

export type OwnerFormData = z.infer<typeof ownerFormSchema>;

/**
 * Calculate ownership summary from owners list
 */
export function calculateOwnershipSummary(owners: Owner[]): OwnershipSummary {
  const totalOwnership = owners.reduce((sum, o) => sum + o.ownershipPercentage, 0);
  const usCitizenOwnership = owners
    .filter(o => o.isUsCitizen)
    .reduce((sum, o) => sum + o.ownershipPercentage, 0);
  const nonCitizenOwnership = owners
    .filter(o => !o.isUsCitizen)
    .reduce((sum, o) => sum + o.ownershipPercentage, 0);
  
  const usCitizenCount = owners.filter(o => o.isUsCitizen).length;
  const nonCitizenCount = owners.filter(o => !o.isUsCitizen).length;
  
  const requiredPercentage = 51;
  const isValid = Math.abs(totalOwnership - 100) < 0.01;
  const isCompliant = usCitizenOwnership >= requiredPercentage;
  
  return {
    totalOwnershipPercentage: totalOwnership,
    usCitizenOwnershipPercentage: usCitizenOwnership,
    nonCitizenOwnershipPercentage: nonCitizenOwnership,
    ownerCount: owners.length,
    usCitizenCount,
    nonCitizenCount,
    isValid,
    isCompliant,
    remainingPercentage: Math.max(0, 100 - totalOwnership),
    requiredUsCitizenPercentage: requiredPercentage,
  };
}

/**
 * Get compliance status
 */
export function getComplianceStatus(summary: OwnershipSummary): OwnershipComplianceStatus {
  if (!summary.isValid) {
    return summary.totalOwnershipPercentage > 100 ? 'non_compliant_total' : 'incomplete';
  }
  if (!summary.isCompliant) {
    return 'non_compliant_citizenship';
  }
  return 'compliant';
}

/**
 * Get compliance recommendations
 */
export function getComplianceRecommendations(summary: OwnershipSummary): ComplianceRecommendation[] {
  const recommendations: ComplianceRecommendation[] = [];
  
  // Total ownership checks
  if (summary.totalOwnershipPercentage < 100) {
    recommendations.push({
      type: 'warning',
      title: 'Incomplete Ownership',
      message: `Total ownership is ${summary.totalOwnershipPercentage.toFixed(2)}%. You need to allocate ${summary.remainingPercentage.toFixed(2)}% more.`,
      action: 'Add or increase ownership percentages to reach 100%',
    });
  } else if (summary.totalOwnershipPercentage > 100) {
    recommendations.push({
      type: 'error',
      title: 'Ownership Exceeds 100%',
      message: `Total ownership is ${summary.totalOwnershipPercentage.toFixed(2)}%, which exceeds 100%.`,
      action: 'Reduce ownership percentages to equal exactly 100%',
    });
  }
  
  // US citizen ownership checks
  if (summary.usCitizenOwnershipPercentage < 51) {
    const shortfall = 51 - summary.usCitizenOwnershipPercentage;
    recommendations.push({
      type: 'error',
      title: 'Insufficient US Citizen Ownership',
      message: `US citizen ownership is ${summary.usCitizenOwnershipPercentage.toFixed(2)}%, which is below the required 51%.`,
      action: `Increase US citizen ownership by at least ${shortfall.toFixed(2)}% to meet HUBZone requirements`,
    });
  } else if (summary.usCitizenOwnershipPercentage < 60) {
    recommendations.push({
      type: 'warning',
      title: 'US Citizen Ownership Near Minimum',
      message: `US citizen ownership is ${summary.usCitizenOwnershipPercentage.toFixed(2)}%, close to the 51% minimum.`,
      action: 'Consider increasing US citizen ownership for a safety buffer',
    });
  }
  
  // Success message
  if (summary.isValid && summary.isCompliant) {
    recommendations.push({
      type: 'success',
      title: 'Ownership Requirements Met',
      message: `Total ownership is 100% and US citizen ownership is ${summary.usCitizenOwnershipPercentage.toFixed(2)}% (≥51%).`,
    });
  }
  
  return recommendations;
}

/**
 * Validate if adding/updating owner would exceed limits
 */
export function validateOwnerChange(
  currentOwners: Owner[],
  newOwnerData: OwnerFormData,
  editingOwnerId?: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Calculate what the total would be
  const otherOwners = editingOwnerId 
    ? currentOwners.filter(o => o.id !== editingOwnerId)
    : currentOwners;
  
  const currentTotal = otherOwners.reduce((sum, o) => sum + o.ownershipPercentage, 0);
  const newTotal = currentTotal + newOwnerData.ownershipPercentage;
  
  if (newTotal > 100.01) { // Small tolerance for floating point
    errors.push(`Total ownership would be ${newTotal.toFixed(2)}%, which exceeds 100%`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

