import { db } from './database.js';

import {
  DEFAULT_COMPLIANCE_CONFIG,
  type ComplianceStatus,
  type ResidencyStatus,
  type PrincipalOfficeStatus,
  type CertificationComplianceStatus,
  type OwnershipStatus,
  type RiskAssessment,
  type RiskFactor,
  type RiskLevel,
  type TrendDirection,
  type ComplianceHistoryEntry,
  type BusinessComplianceData,
  type ComplianceConfig,
} from '../types/compliance.js';

import type { Address } from '../types/hubzone.js';

/**
 * Real-time Compliance Monitoring Service
 * 
 * Monitors HUBZone certification compliance in real-time including:
 * - Employee residency percentage (must be >= 35%)
 * - Principal office location verification
 * - Certification expiration tracking
 * - Ownership compliance
 * - Overall risk scoring
 */
export class ComplianceMonitoringService {
  private config: ComplianceConfig;

  constructor(config: Partial<ComplianceConfig> = {}) {
    this.config = { ...DEFAULT_COMPLIANCE_CONFIG, ...config };
  }

  /**
   * Calculate complete compliance status for a business
   * Main entry point for compliance monitoring
   */
  async calculateCompliance(businessId: string): Promise<ComplianceStatus> {
    // Fetch business data
    const business = await this.getBusinessData(businessId);
    
    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    // Calculate all compliance components in parallel
    const [
      residency,
      principalOffice,
      certification,
      ownership,
      complianceHistory,
    ] = await Promise.all([
      this.calculateResidencyPercentage(businessId),
      this.checkPrincipalOffice(businessId, business.principalOfficeAddress),
      this.checkCertificationExpiration(businessId),
      this.checkOwnershipCompliance(businessId, business.ownershipPercentage),
      this.getComplianceHistory(businessId),
    ]);

    // Assess overall risk based on all factors
    const riskAssessment = this.assessRisk(
      residency,
      principalOffice,
      certification,
      ownership,
      complianceHistory
    );

    // Determine if fully compliant
    const isFullyCompliant =
      residency.isCompliant &&
      principalOffice.isCompliant &&
      !certification.isExpired &&
      ownership.isCompliant;

    // Calculate next review date (30 days from now or sooner if issues)
    const nextReviewDate = this.calculateNextReviewDate(riskAssessment.riskLevel);

    return {
      businessId,
      businessName: business.name,
      calculatedAt: new Date(),
      overallRiskLevel: riskAssessment.riskLevel,
      isFullyCompliant,
      residency,
      principalOffice,
      certification,
      ownership,
      riskAssessment,
      complianceHistory,
      nextReviewDate,
    };
  }

  /**
   * Calculate employee residency percentage
   * Must be >= 35% for HUBZone compliance
   */
  async calculateResidencyPercentage(businessId: string): Promise<ResidencyStatus> {
    // Get employee counts
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as total_employees,
        COUNT(*) FILTER (WHERE is_active = true AND is_hubzone_resident = true) as hubzone_residents
      FROM employees
      WHERE business_id = $1
    `;

    const result = await db.query<{
      total_employees: string;
      hubzone_residents: string;
    }>(query, [businessId]);

    const totalEmployees = parseInt(result.rows[0]?.total_employees ?? '0', 10);
    const hubzoneResidents = parseInt(result.rows[0]?.hubzone_residents ?? '0', 10);

    // Handle edge case: 0 employees
    if (totalEmployees === 0) {
      return {
        totalEmployees: 0,
        hubzoneResidents: 0,
        percentage: 0,
        isCompliant: false,
        buffer: -this.config.residencyThreshold,
        minimumRequired: 0,
        shortfall: 0,
      };
    }

    const percentage = (hubzoneResidents / totalEmployees) * 100;
    const isCompliant = percentage >= this.config.residencyThreshold;
    const buffer = percentage - this.config.residencyThreshold;

    // Calculate minimum HUBZone residents required for compliance
    const minimumRequired = Math.ceil(totalEmployees * (this.config.residencyThreshold / 100));
    const shortfall = isCompliant ? 0 : minimumRequired - hubzoneResidents;

    return {
      totalEmployees,
      hubzoneResidents,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      isCompliant,
      buffer: Math.round(buffer * 100) / 100,
      minimumRequired,
      shortfall,
    };
  }

  /**
   * Check principal office location compliance
   * Verifies address is in current HUBZone and handles redesignated status
   */
  async checkPrincipalOffice(
    businessId: string,
    address: Address | null
  ): Promise<PrincipalOfficeStatus> {
    const issues: string[] = [];

    if (!address) {
      return {
        isCompliant: false,
        isInHubzone: false,
        isRedesignated: false,
        gracePeriodEndDate: null,
        gracePeriodDaysRemaining: null,
        address: null,
        hubzoneId: null,
        hubzoneName: null,
        issues: ['Principal office address not provided'],
      };
    }

    // Check if address is in a HUBZone
    const locationQuery = `
      SELECT 
        h.id,
        h.name,
        h.status,
        h.designation_date,
        h.expiration_date
      FROM hubzones h
      JOIN business_addresses ba ON ST_Contains(h.geometry, ba.location)
      WHERE ba.business_id = $1
        AND ba.address_type = 'principal_office'
        AND (h.status = 'active' OR h.status = 'redesignated')
      ORDER BY h.status = 'active' DESC
      LIMIT 1
    `;

    const result = await db.query<{
      id: string;
      name: string;
      status: string;
      designation_date: Date;
      expiration_date: Date | null;
    }>(locationQuery, [businessId]);

    const hubzone = result.rows[0];

    if (!hubzone) {
      return {
        isCompliant: false,
        isInHubzone: false,
        isRedesignated: false,
        gracePeriodEndDate: null,
        gracePeriodDaysRemaining: null,
        address,
        hubzoneId: null,
        hubzoneName: null,
        issues: ['Principal office is not located in a qualified HUBZone'],
      };
    }

    const isRedesignated = hubzone.status === 'redesignated';
    let gracePeriodEndDate: Date | null = null;
    let gracePeriodDaysRemaining: number | null = null;
    let isCompliant = true;

    // Handle redesignated HUBZone grace period
    if (isRedesignated && hubzone.expiration_date) {
      gracePeriodEndDate = new Date(hubzone.expiration_date);
      gracePeriodEndDate.setDate(
        gracePeriodEndDate.getDate() + this.config.gracePeriodDays
      );

      const now = new Date();
      gracePeriodDaysRemaining = Math.ceil(
        (gracePeriodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (gracePeriodDaysRemaining <= 0) {
        isCompliant = false;
        issues.push('Grace period for redesignated HUBZone has expired');
      } else if (gracePeriodDaysRemaining <= 180) {
        issues.push(
          `Grace period expires in ${gracePeriodDaysRemaining} days - plan relocation`
        );
      }
    }

    return {
      isCompliant,
      isInHubzone: true,
      isRedesignated,
      gracePeriodEndDate,
      gracePeriodDaysRemaining,
      address,
      hubzoneId: hubzone.id,
      hubzoneName: hubzone.name,
      issues,
    };
  }

  /**
   * Check certification expiration status
   */
  async checkCertificationExpiration(
    businessId: string
  ): Promise<CertificationComplianceStatus> {
    const query = `
      SELECT 
        id,
        status,
        expiration_date
      FROM certifications
      WHERE business_id = $1
        AND status IN ('approved', 'expired')
      ORDER BY expiration_date DESC
      LIMIT 1
    `;

    const result = await db.query<{
      id: string;
      status: string;
      expiration_date: Date;
    }>(query, [businessId]);

    const certification = result.rows[0];

    if (!certification) {
      return {
        certificationId: null,
        status: null,
        expirationDate: null,
        daysUntilExpiration: null,
        isExpiringSoon: false,
        isExpired: true, // No certification means not compliant
      };
    }

    const now = new Date();
    const expirationDate = new Date(certification.expiration_date);
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const isExpired = certification.status === 'expired' || daysUntilExpiration < 0;
    const isExpiringSoon =
      !isExpired && daysUntilExpiration <= this.config.certificationExpirationWarningDays;

    return {
      certificationId: certification.id,
      status: certification.status,
      expirationDate,
      daysUntilExpiration: isExpired ? 0 : daysUntilExpiration,
      isExpiringSoon,
      isExpired,
    };
  }

  /**
   * Check ownership compliance
   * At least 51% must be owned by US citizens
   */
  async checkOwnershipCompliance(
    businessId: string,
    ownershipPercentage: number
  ): Promise<OwnershipStatus> {
    const issues: string[] = [];
    const isCompliant = ownershipPercentage >= this.config.ownershipThreshold;

    if (!isCompliant) {
      issues.push(
        `Ownership by qualified individuals is ${ownershipPercentage}%, ` +
        `minimum required is ${this.config.ownershipThreshold}%`
      );
    }

    return {
      isCompliant,
      ownershipPercentage,
      requiredPercentage: this.config.ownershipThreshold,
      issues,
    };
  }

  /**
   * Assess overall risk based on all compliance factors
   * Uses weighted scoring algorithm
   */
  assessRisk(
    residency: ResidencyStatus,
    principalOffice: PrincipalOfficeStatus,
    certification: CertificationComplianceStatus,
    ownership: OwnershipStatus,
    history: ComplianceHistoryEntry[]
  ): RiskAssessment {
    const factors: RiskFactor[] = [];
    let riskScore = 0;

    // Residency risk factors
    if (!residency.isCompliant) {
      // Residency below 35% - critical
      factors.push({
        category: 'Residency',
        description: `HUBZone residency at ${residency.percentage}%, below required 35%`,
        points: 10,
        severity: 'critical',
      });
      riskScore += 10;
    } else if (residency.percentage < 37) {
      // Residency between 35-37% - high risk
      factors.push({
        category: 'Residency',
        description: `HUBZone residency at ${residency.percentage}%, close to minimum threshold`,
        points: 7,
        severity: 'high',
      });
      riskScore += 7;
    } else if (residency.percentage < 40) {
      // Residency between 37-40% - medium risk
      factors.push({
        category: 'Residency',
        description: `HUBZone residency at ${residency.percentage}%, limited buffer above threshold`,
        points: 3,
        severity: 'medium',
      });
      riskScore += 3;
    }

    // Trend analysis
    const trend = this.analyzeTrend(history);
    if (trend === 'declining') {
      factors.push({
        category: 'Trend',
        description: 'Residency percentage has been declining over recent periods',
        points: 5,
        severity: 'high',
      });
      riskScore += 5;
    }

    // Principal office risk factors
    if (!principalOffice.isCompliant) {
      factors.push({
        category: 'Principal Office',
        description: principalOffice.issues.join('; ') || 'Principal office not in HUBZone',
        points: 10,
        severity: 'critical',
      });
      riskScore += 10;
    } else if (principalOffice.isRedesignated) {
      const urgency = principalOffice.gracePeriodDaysRemaining ?? 0;
      if (urgency <= 180) {
        factors.push({
          category: 'Principal Office',
          description: `Office in redesignated HUBZone, grace period ends in ${urgency} days`,
          points: 6,
          severity: 'high',
        });
        riskScore += 6;
      } else {
        factors.push({
          category: 'Principal Office',
          description: 'Office in redesignated HUBZone (within grace period)',
          points: 2,
          severity: 'medium',
        });
        riskScore += 2;
      }
    }

    // Certification expiration risk factors
    if (certification.isExpired) {
      factors.push({
        category: 'Certification',
        description: 'HUBZone certification has expired',
        points: 10,
        severity: 'critical',
      });
      riskScore += 10;
    } else if (certification.isExpiringSoon) {
      const days = certification.daysUntilExpiration ?? 0;
      if (days <= 30) {
        factors.push({
          category: 'Certification',
          description: `Certification expires in ${days} days - immediate action required`,
          points: 7,
          severity: 'high',
        });
        riskScore += 7;
      } else {
        factors.push({
          category: 'Certification',
          description: `Certification expires in ${days} days`,
          points: 5,
          severity: 'medium',
        });
        riskScore += 5;
      }
    }

    // Ownership risk factors
    if (!ownership.isCompliant) {
      factors.push({
        category: 'Ownership',
        description: ownership.issues.join('; '),
        points: 10,
        severity: 'critical',
      });
      riskScore += 10;
    }

    // Determine overall risk level
    const riskLevel = this.calculateRiskLevel(riskScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(factors, riskLevel);

    return {
      riskLevel,
      riskScore,
      factors,
      trend,
      recommendations,
    };
  }

  /**
   * Calculate risk level from score
   * Score: >=10 critical, >=7 high, >=4 medium, <4 low
   */
  private calculateRiskLevel(score: number): RiskLevel {
    if (score >= 10) return 'critical';
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  /**
   * Analyze residency trend from historical data
   */
  private analyzeTrend(history: ComplianceHistoryEntry[]): TrendDirection {
    if (history.length < 3) {
      return 'stable';
    }

    // Get last 6 entries (or all if less)
    const recentHistory = history.slice(-6);
    
    // Calculate linear regression slope
    const n = recentHistory.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    recentHistory.forEach((entry, index) => {
      sumX += index;
      sumY += entry.residencyPercentage;
      sumXY += index * entry.residencyPercentage;
      sumXX += index * index;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Determine trend based on slope
    if (slope < -0.5) return 'declining';
    if (slope > 0.5) return 'increasing';
    return 'stable';
  }

  /**
   * Generate actionable recommendations based on risk factors
   */
  private generateRecommendations(
    factors: RiskFactor[],
    riskLevel: RiskLevel
  ): string[] {
    const recommendations: string[] = [];

    factors.forEach((factor) => {
      switch (factor.category) {
        case 'Residency':
          if (factor.severity === 'critical') {
            recommendations.push(
              'URGENT: Hire HUBZone residents immediately to reach 35% threshold'
            );
            recommendations.push(
              'Review current employee residency status for re-verification'
            );
          } else if (factor.severity === 'high') {
            recommendations.push(
              'Prioritize hiring HUBZone residents to increase buffer above threshold'
            );
          }
          break;

        case 'Trend':
          recommendations.push(
            'Implement retention strategies for HUBZone resident employees'
          );
          recommendations.push(
            'Review hiring practices to prioritize HUBZone candidates'
          );
          break;

        case 'Principal Office':
          if (factor.severity === 'critical') {
            recommendations.push(
              'URGENT: Relocate principal office to qualified HUBZone area'
            );
          } else {
            recommendations.push(
              'Plan relocation of principal office before grace period ends'
            );
            recommendations.push(
              'Research available commercial spaces in active HUBZone areas'
            );
          }
          break;

        case 'Certification':
          if (factor.severity === 'critical') {
            recommendations.push(
              'URGENT: Submit recertification application immediately'
            );
          } else {
            recommendations.push(
              'Begin recertification process - gather required documentation'
            );
          }
          break;

        case 'Ownership':
          recommendations.push(
            'URGENT: Review and restructure ownership to meet 51% threshold'
          );
          break;
      }
    });

    // Add general recommendations based on overall risk level
    if (riskLevel === 'critical') {
      recommendations.push(
        'Schedule immediate compliance review with legal counsel'
      );
    } else if (riskLevel === 'high') {
      recommendations.push(
        'Schedule compliance review within 30 days'
      );
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Get business data for compliance calculation
   */
  private async getBusinessData(
    businessId: string
  ): Promise<BusinessComplianceData | null> {
    const query = `
      SELECT 
        b.id,
        b.name,
        b.principal_office_address,
        c.id as certification_id,
        c.expiration_date as certification_expiration_date,
        c.status as certification_status,
        COALESCE(bo.qualified_ownership_percentage, 0) as ownership_percentage
      FROM businesses b
      LEFT JOIN certifications c ON c.business_id = b.id 
        AND c.status IN ('approved', 'expired')
      LEFT JOIN business_ownership bo ON bo.business_id = b.id
      WHERE b.id = $1
      ORDER BY c.expiration_date DESC
      LIMIT 1
    `;

    const result = await db.query<{
      id: string;
      name: string;
      principal_office_address: string;
      certification_id: string | null;
      certification_expiration_date: Date | null;
      certification_status: string | null;
      ownership_percentage: number;
    }>(query, [businessId]);

    const business = result.rows[0];

    if (!business) {
      return null;
    }

    // Parse principal office address JSON
    let principalOfficeAddress: Address | null = null;
    try {
      principalOfficeAddress = JSON.parse(business.principal_office_address);
    } catch {
      // Address stored as string, parse accordingly
      principalOfficeAddress = null;
    }

    return {
      id: business.id,
      name: business.name,
      principalOfficeAddress: principalOfficeAddress as Address,
      certificationId: business.certification_id,
      certificationExpirationDate: business.certification_expiration_date,
      certificationStatus: business.certification_status,
      ownershipPercentage: business.ownership_percentage,
    };
  }

  /**
   * Get historical compliance data for trend analysis
   */
  private async getComplianceHistory(
    businessId: string
  ): Promise<ComplianceHistoryEntry[]> {
    const query = `
      SELECT 
        recorded_at as date,
        residency_percentage,
        total_employees,
        hubzone_residents,
        risk_level
      FROM compliance_history
      WHERE business_id = $1
      ORDER BY recorded_at DESC
      LIMIT 12
    `;

    const result = await db.query<{
      date: Date;
      residency_percentage: number;
      total_employees: number;
      hubzone_residents: number;
      risk_level: RiskLevel;
    }>(query, [businessId]);

    return result.rows.map((row) => ({
      date: row.date,
      residencyPercentage: row.residency_percentage,
      totalEmployees: row.total_employees,
      hubzoneResidents: row.hubzone_residents,
      riskLevel: row.risk_level,
    }));
  }

  /**
   * Calculate next review date based on risk level
   */
  private calculateNextReviewDate(riskLevel: RiskLevel): Date {
    const now = new Date();
    let daysUntilReview: number;

    switch (riskLevel) {
      case 'critical':
        daysUntilReview = 7; // Weekly review for critical
        break;
      case 'high':
        daysUntilReview = 14; // Bi-weekly for high
        break;
      case 'medium':
        daysUntilReview = 30; // Monthly for medium
        break;
      default:
        daysUntilReview = 90; // Quarterly for low risk
    }

    now.setDate(now.getDate() + daysUntilReview);
    return now;
  }

  /**
   * Record current compliance status in history
   */
  async recordComplianceSnapshot(businessId: string): Promise<void> {
    const compliance = await this.calculateCompliance(businessId);

    const query = `
      INSERT INTO compliance_history (
        business_id,
        recorded_at,
        residency_percentage,
        total_employees,
        hubzone_residents,
        risk_level
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await db.query(query, [
      businessId,
      new Date(),
      compliance.residency.percentage,
      compliance.residency.totalEmployees,
      compliance.residency.hubzoneResidents,
      compliance.riskAssessment.riskLevel,
    ]);
  }

  /**
   * Get all businesses requiring immediate attention (critical/high risk)
   */
  async getHighRiskBusinesses(): Promise<ComplianceStatus[]> {
    const query = `
      SELECT DISTINCT business_id
      FROM compliance_history
      WHERE risk_level IN ('critical', 'high')
        AND recorded_at >= NOW() - INTERVAL '7 days'
    `;

    const result = await db.query<{ business_id: string }>(query, []);

    const complianceStatuses = await Promise.all(
      result.rows.map((row) => this.calculateCompliance(row.business_id))
    );

    return complianceStatuses.filter(
      (status) =>
        status.riskAssessment.riskLevel === 'critical' ||
        status.riskAssessment.riskLevel === 'high'
    );
  }

  /**
   * Verify individual employee HUBZone residency
   */
  async verifyEmployeeResidency(employeeId: string): Promise<boolean> {
    const query = `
      SELECT 
        e.id,
        e.residential_address,
        EXISTS (
          SELECT 1 FROM hubzones h
          WHERE ST_Contains(
            h.geometry,
            ST_SetSRID(ST_MakePoint(
              (e.residential_address->>'longitude')::float,
              (e.residential_address->>'latitude')::float
            ), 4326)
          )
          AND h.status = 'active'
        ) as is_in_hubzone
      FROM employees e
      WHERE e.id = $1
    `;

    const result = await db.query<{
      id: string;
      residential_address: string;
      is_in_hubzone: boolean;
    }>(query, [employeeId]);

    const employee = result.rows[0];

    if (!employee) {
      return false;
    }

    // Update employee record with verification
    if (employee.is_in_hubzone) {
      await db.query(
        `UPDATE employees 
         SET is_hubzone_resident = true, hubzone_verified_at = NOW() 
         WHERE id = $1`,
        [employeeId]
      );
    } else {
      await db.query(
        `UPDATE employees 
         SET is_hubzone_resident = false, hubzone_verified_at = NOW() 
         WHERE id = $1`,
        [employeeId]
      );
    }

    return employee.is_in_hubzone;
  }
}

// Export singleton instance
export const complianceMonitoringService = new ComplianceMonitoringService();

