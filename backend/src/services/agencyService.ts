import { db } from './database.js';
import { complianceMonitoringService } from './complianceMonitoring.js';
import { v4 as uuidv4 } from 'uuid';

import type {
  ContractorVerification,
  BulkVerificationRequest,
  BulkVerificationResult,
  BulkVerificationItem,
  VerificationHistoryRecord,
  VerificationReport,
  VerificationFilters,
  VerificationStatus,
  ComplianceBreakdown,
  ContractorSearchParams,
} from '../types/agency.js';
import type { RiskLevel } from '../types/compliance.js';

/**
 * Agency Service
 * 
 * Handles contractor verification for government agencies
 */
export class AgencyService {
  /**
   * Search for contractors by various criteria
   */
  async searchContractors(params: ContractorSearchParams): Promise<{
    id: string;
    legalName: string;
    dbaName?: string;
    ueiNumber: string;
    cageCode?: string;
    state: string;
    certificationStatus: string;
  }[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.legalName) {
      conditions.push(`LOWER(b.legal_name) LIKE LOWER($${paramIndex})`);
      values.push(`%${params.legalName}%`);
      paramIndex++;
    }

    if (params.ueiNumber) {
      conditions.push(`UPPER(b.uei_number) = UPPER($${paramIndex})`);
      values.push(params.ueiNumber);
      paramIndex++;
    }

    if (params.cageCode) {
      conditions.push(`UPPER(b.cage_code) = UPPER($${paramIndex})`);
      values.push(params.cageCode);
      paramIndex++;
    }

    if (conditions.length === 0) {
      return [];
    }

    const query = `
      SELECT 
        b.id,
        b.legal_name,
        b.dba_name,
        b.uei_number,
        b.cage_code,
        b.state,
        COALESCE(c.status, 'not_started') as certification_status
      FROM businesses b
      LEFT JOIN certifications c ON c.business_id = b.id 
        AND c.status IN ('approved', 'pending', 'under_review')
      WHERE ${conditions.join(' OR ')}
      ORDER BY b.legal_name ASC
      LIMIT 50
    `;

    const result = await db.query<{
      id: string;
      legal_name: string;
      dba_name: string | null;
      uei_number: string;
      cage_code: string | null;
      state: string;
      certification_status: string;
    }>(query, values);

    return result.rows.map((row) => ({
      id: row.id,
      legalName: row.legal_name,
      dbaName: row.dba_name ?? undefined,
      ueiNumber: row.uei_number,
      cageCode: row.cage_code ?? undefined,
      state: row.state,
      certificationStatus: row.certification_status,
    }));
  }

  /**
   * Verify a single contractor by UEI number
   */
  async verifyContractor(
    ueiNumber: string,
    agencyId?: string,
    verifiedBy?: string
  ): Promise<ContractorVerification | null> {
    // Find business by UEI
    const businessQuery = `
      SELECT 
        b.id,
        b.legal_name,
        b.dba_name,
        b.uei_number,
        b.cage_code,
        b.principal_office_address,
        c.id as certification_id,
        c.status as certification_status,
        c.certification_date,
        c.expiration_date
      FROM businesses b
      LEFT JOIN certifications c ON c.business_id = b.id 
        AND c.status IN ('approved', 'pending', 'under_review', 'expired')
      WHERE UPPER(b.uei_number) = UPPER($1)
      ORDER BY c.certification_date DESC NULLS LAST
      LIMIT 1
    `;

    const businessResult = await db.query<{
      id: string;
      legal_name: string;
      dba_name: string | null;
      uei_number: string;
      cage_code: string | null;
      principal_office_address: Record<string, string> | null;
      certification_id: string | null;
      certification_status: string | null;
      certification_date: Date | null;
      expiration_date: Date | null;
    }>(businessQuery, [ueiNumber]);

    if (businessResult.rows.length === 0) {
      // Record not found verification attempt
      if (agencyId) {
        await this.recordVerificationHistory({
          agencyId,
          businessId: 'not_found',
          businessName: 'Not Found',
          ueiNumber,
          verificationStatus: 'not_found',
          complianceScore: 0,
          riskLevel: 'critical',
          verifiedBy,
          method: 'single',
        });
      }
      return null;
    }

    const business = businessResult.rows[0];
    
    // Get compliance data
    const compliance = await this.getComplianceBreakdown(business.id);
    
    // Determine verification status
    const verificationStatus = this.determineVerificationStatus(
      business.certification_status,
      business.expiration_date,
      compliance
    );

    // Calculate risk level
    const { riskLevel, riskScore } = this.calculateRiskAssessment(compliance, verificationStatus);

    const verificationId = uuidv4();
    const verification: ContractorVerification = {
      id: business.id,
      businessId: business.id,
      businessName: business.legal_name,
      dbaName: business.dba_name ?? undefined,
      ueiNumber: business.uei_number,
      cageCode: business.cage_code ?? undefined,
      certificationStatus: verificationStatus,
      certificationDate: business.certification_date ?? undefined,
      expirationDate: business.expiration_date ?? undefined,
      isActive: verificationStatus === 'valid',
      compliance,
      riskLevel,
      riskScore,
      verifiedAt: new Date(),
      verifiedBy,
      verificationId,
    };

    // Record verification in history
    if (agencyId) {
      await this.recordVerificationHistory({
        agencyId,
        businessId: business.id,
        businessName: business.legal_name,
        ueiNumber: business.uei_number,
        verificationStatus,
        complianceScore: this.calculateComplianceScore(compliance),
        riskLevel,
        verifiedBy,
        method: 'single',
      });
    }

    return verification;
  }

  /**
   * Bulk verify contractors from a list of UEI numbers
   */
  async bulkVerifyContractors(
    request: BulkVerificationRequest
  ): Promise<BulkVerificationResult> {
    const jobId = uuidv4();
    const startedAt = new Date();
    
    const results: BulkVerificationItem[] = [];
    const summary = {
      compliant: 0,
      nonCompliant: 0,
      expired: 0,
      notFound: 0,
      errors: 0,
    };

    // Process each UEI number
    for (const ueiNumber of request.ueiNumbers) {
      try {
        const verification = await this.verifyContractor(
          ueiNumber,
          request.agencyId,
          request.requestedBy
        );

        if (!verification) {
          results.push({
            ueiNumber,
            status: 'not_found',
            isCompliant: false,
            errorMessage: 'Business not found with this UEI number',
          });
          summary.notFound++;
          continue;
        }

        const isCompliant = verification.certificationStatus === 'valid' &&
          verification.compliance.employeeResidency.isCompliant &&
          verification.compliance.principalOffice.isCompliant &&
          verification.compliance.ownership.isCompliant;

        results.push({
          ueiNumber,
          status: verification.certificationStatus,
          businessName: verification.businessName,
          certificationStatus: verification.certificationStatus,
          isCompliant,
          riskLevel: verification.riskLevel,
        });

        // Update summary
        if (verification.certificationStatus === 'expired') {
          summary.expired++;
        } else if (isCompliant) {
          summary.compliant++;
        } else {
          summary.nonCompliant++;
        }
      } catch (error) {
        results.push({
          ueiNumber,
          status: 'not_found',
          isCompliant: false,
          errorMessage: (error as Error).message,
        });
        summary.errors++;
      }
    }

    // Record bulk verification job
    await this.recordBulkVerificationJob(jobId, request, results, summary, startedAt);

    return {
      jobId,
      status: 'completed',
      totalRequested: request.ueiNumbers.length,
      processed: results.length,
      results,
      startedAt,
      completedAt: new Date(),
      summary,
    };
  }

  /**
   * Get verification history for an agency
   */
  async getVerificationHistory(
    filters: VerificationFilters
  ): Promise<{ records: VerificationHistoryRecord[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.agencyId) {
      conditions.push(`vh.agency_id = $${paramIndex}`);
      values.push(filters.agencyId);
      paramIndex++;
    }

    if (filters.businessId) {
      conditions.push(`vh.business_id = $${paramIndex}`);
      values.push(filters.businessId);
      paramIndex++;
    }

    if (filters.ueiNumber) {
      conditions.push(`UPPER(vh.uei_number) = UPPER($${paramIndex})`);
      values.push(filters.ueiNumber);
      paramIndex++;
    }

    if (filters.status) {
      conditions.push(`vh.verification_status = $${paramIndex}`);
      values.push(filters.status);
      paramIndex++;
    }

    if (filters.riskLevel) {
      conditions.push(`vh.risk_level = $${paramIndex}`);
      values.push(filters.riskLevel);
      paramIndex++;
    }

    if (filters.startDate) {
      conditions.push(`vh.verified_at >= $${paramIndex}`);
      values.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      conditions.push(`vh.verified_at <= $${paramIndex}`);
      values.push(filters.endDate);
      paramIndex++;
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM verification_history vh
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await db.query<{ total: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    // Get records
    const query = `
      SELECT 
        vh.id,
        vh.agency_id,
        a.name as agency_name,
        vh.business_id,
        vh.business_name,
        vh.uei_number,
        vh.verification_status,
        vh.compliance_score,
        vh.risk_level,
        vh.verified_at,
        vh.verified_by,
        vh.method,
        vh.ip_address,
        vh.user_agent
      FROM verification_history vh
      LEFT JOIN agencies a ON a.id = vh.agency_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY vh.verified_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query<{
      id: string;
      agency_id: string;
      agency_name: string | null;
      business_id: string;
      business_name: string;
      uei_number: string;
      verification_status: VerificationStatus;
      compliance_score: number;
      risk_level: RiskLevel;
      verified_at: Date;
      verified_by: string | null;
      method: 'single' | 'bulk';
      ip_address: string | null;
      user_agent: string | null;
    }>(query, [...values, limit, offset]);

    return {
      records: result.rows.map((row) => ({
        id: row.id,
        agencyId: row.agency_id,
        agencyName: row.agency_name ?? undefined,
        businessId: row.business_id,
        businessName: row.business_name,
        ueiNumber: row.uei_number,
        verificationStatus: row.verification_status,
        complianceScore: row.compliance_score,
        riskLevel: row.risk_level,
        verifiedAt: row.verified_at,
        verifiedBy: row.verified_by ?? undefined,
        method: row.method,
        ipAddress: row.ip_address ?? undefined,
        userAgent: row.user_agent ?? undefined,
      })),
      total,
    };
  }

  /**
   * Generate a verification report for PDF
   */
  async generateVerificationReport(
    businessId: string,
    agencyId: string,
    verifierName?: string
  ): Promise<VerificationReport | null> {
    const businessQuery = `
      SELECT 
        b.id,
        b.legal_name,
        b.dba_name,
        b.uei_number,
        b.cage_code,
        b.principal_office_address,
        c.id as certification_id,
        c.certification_number,
        c.status as certification_status,
        c.certification_date,
        c.expiration_date
      FROM businesses b
      LEFT JOIN certifications c ON c.business_id = b.id 
        AND c.status IN ('approved', 'pending', 'under_review', 'expired')
      WHERE b.id = $1
      ORDER BY c.certification_date DESC NULLS LAST
      LIMIT 1
    `;

    const businessResult = await db.query<{
      id: string;
      legal_name: string;
      dba_name: string | null;
      uei_number: string;
      cage_code: string | null;
      principal_office_address: Record<string, string> | null;
      certification_id: string | null;
      certification_number: string | null;
      certification_status: string | null;
      certification_date: Date | null;
      expiration_date: Date | null;
    }>(businessQuery, [businessId]);

    if (businessResult.rows.length === 0) {
      return null;
    }

    const business = businessResult.rows[0];

    // Get agency info
    const agencyQuery = `SELECT name FROM agencies WHERE id = $1`;
    const agencyResult = await db.query<{ name: string }>(agencyQuery, [agencyId]);
    const agencyName = agencyResult.rows[0]?.name ?? 'Unknown Agency';

    // Get compliance data
    const compliance = await this.getComplianceBreakdown(business.id);

    // Determine verification status
    const certificationStatus = this.determineVerificationStatus(
      business.certification_status,
      business.expiration_date,
      compliance
    );

    const { riskLevel } = this.calculateRiskAssessment(compliance, certificationStatus);
    const complianceScore = this.calculateComplianceScore(compliance);

    // Format address
    const address = business.principal_office_address;
    const principalOfficeAddress = address
      ? `${address.street1}${address.street2 ? ', ' + address.street2 : ''}, ${address.city}, ${address.state} ${address.zipCode}`
      : 'Address not available';

    const reportId = uuidv4();
    const generatedAt = new Date();
    const validUntil = new Date(generatedAt);
    validUntil.setDate(validUntil.getDate() + 30); // Valid for 30 days

    const verificationUrl = `${process.env['APP_URL'] ?? 'https://hubzone.gov'}/verify/${reportId}`;

    return {
      reportId,
      generatedAt,
      validUntil,
      agencyName,
      agencyId,
      verifierName,
      businessName: business.legal_name,
      dbaName: business.dba_name ?? undefined,
      ueiNumber: business.uei_number,
      cageCode: business.cage_code ?? undefined,
      principalOfficeAddress,
      certificationStatus,
      certificationNumber: business.certification_number ?? undefined,
      certificationDate: business.certification_date ?? undefined,
      expirationDate: business.expiration_date ?? undefined,
      compliance,
      complianceScore,
      riskLevel,
      qrCodeUrl: verificationUrl,
      verificationUrl,
    };
  }

  /**
   * Get compliance breakdown for a business
   */
  private async getComplianceBreakdown(businessId: string): Promise<ComplianceBreakdown> {
    try {
      const compliance = await complianceMonitoringService.calculateCompliance(businessId);
      
      return {
        employeeResidency: {
          percentage: compliance.residency.percentage,
          isCompliant: compliance.residency.isCompliant,
          totalEmployees: compliance.residency.totalEmployees,
          hubzoneResidents: compliance.residency.hubzoneResidents,
        },
        principalOffice: {
          isCompliant: compliance.principalOffice.isCompliant,
          address: compliance.principalOffice.address ?? '',
          inHubzone: compliance.principalOffice.inHubzone,
          isRedesignated: compliance.principalOffice.isRedesignated,
          gracePeriodDaysRemaining: compliance.principalOffice.gracePeriodDaysRemaining ?? undefined,
        },
        ownership: {
          isCompliant: compliance.ownership.isCompliant,
          percentage: compliance.ownership.ownershipPercentage,
          citizenOwned: compliance.ownership.isCitizenOwned,
        },
        certification: {
          isValid: !compliance.certification.isExpired,
          daysUntilExpiration: compliance.certification.daysUntilExpiration ?? undefined,
          requiresRecertification: compliance.certification.isExpiringSoon,
        },
      };
    } catch {
      // Return default values if compliance service fails
      return {
        employeeResidency: {
          percentage: 0,
          isCompliant: false,
          totalEmployees: 0,
          hubzoneResidents: 0,
        },
        principalOffice: {
          isCompliant: false,
          address: '',
          inHubzone: false,
          isRedesignated: false,
        },
        ownership: {
          isCompliant: false,
          percentage: 0,
          citizenOwned: false,
        },
        certification: {
          isValid: false,
          requiresRecertification: true,
        },
      };
    }
  }

  /**
   * Determine verification status based on certification and compliance
   */
  private determineVerificationStatus(
    certStatus: string | null,
    expirationDate: Date | null,
    compliance: ComplianceBreakdown
  ): VerificationStatus {
    if (!certStatus || certStatus === 'denied' || certStatus === 'withdrawn') {
      return 'non_compliant';
    }

    if (certStatus === 'pending' || certStatus === 'under_review') {
      return 'pending';
    }

    if (certStatus === 'expired') {
      return 'expired';
    }

    if (expirationDate && new Date(expirationDate) < new Date()) {
      return 'expired';
    }

    // Check compliance requirements
    if (!compliance.employeeResidency.isCompliant ||
        !compliance.principalOffice.isCompliant ||
        !compliance.ownership.isCompliant) {
      return 'non_compliant';
    }

    return 'valid';
  }

  /**
   * Calculate risk assessment
   */
  private calculateRiskAssessment(
    compliance: ComplianceBreakdown,
    status: VerificationStatus
  ): { riskLevel: RiskLevel; riskScore: number } {
    let riskScore = 0;

    // Status-based risk
    if (status === 'expired' || status === 'non_compliant') {
      riskScore += 40;
    } else if (status === 'pending') {
      riskScore += 20;
    }

    // Residency risk
    if (!compliance.employeeResidency.isCompliant) {
      riskScore += 25;
    } else if (compliance.employeeResidency.percentage < 40) {
      riskScore += 15;
    } else if (compliance.employeeResidency.percentage < 45) {
      riskScore += 10;
    }

    // Principal office risk
    if (!compliance.principalOffice.isCompliant) {
      riskScore += 20;
    } else if (compliance.principalOffice.isRedesignated) {
      const daysRemaining = compliance.principalOffice.gracePeriodDaysRemaining ?? 0;
      if (daysRemaining < 180) riskScore += 15;
      else if (daysRemaining < 365) riskScore += 10;
    }

    // Ownership risk
    if (!compliance.ownership.isCompliant) {
      riskScore += 15;
    }

    // Certification expiration risk
    if (compliance.certification.daysUntilExpiration !== undefined) {
      if (compliance.certification.daysUntilExpiration < 30) riskScore += 15;
      else if (compliance.certification.daysUntilExpiration < 60) riskScore += 10;
      else if (compliance.certification.daysUntilExpiration < 90) riskScore += 5;
    }

    // Determine risk level
    let riskLevel: RiskLevel;
    if (riskScore >= 60) {
      riskLevel = 'critical';
    } else if (riskScore >= 40) {
      riskLevel = 'high';
    } else if (riskScore >= 20) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return { riskLevel, riskScore };
  }

  /**
   * Calculate compliance score (0-100)
   */
  private calculateComplianceScore(compliance: ComplianceBreakdown): number {
    let score = 100;

    // Residency (40 points)
    if (!compliance.employeeResidency.isCompliant) {
      score -= 40;
    } else {
      const buffer = compliance.employeeResidency.percentage - 35;
      if (buffer < 2) score -= 15;
      else if (buffer < 5) score -= 10;
      else if (buffer < 10) score -= 5;
    }

    // Principal office (25 points)
    if (!compliance.principalOffice.isCompliant) {
      score -= 25;
    } else if (compliance.principalOffice.isRedesignated) {
      const days = compliance.principalOffice.gracePeriodDaysRemaining ?? 0;
      if (days < 180) score -= 15;
      else if (days < 365) score -= 10;
    }

    // Certification (20 points)
    if (!compliance.certification.isValid) {
      score -= 20;
    } else if (compliance.certification.daysUntilExpiration !== undefined) {
      if (compliance.certification.daysUntilExpiration < 30) score -= 15;
      else if (compliance.certification.daysUntilExpiration < 60) score -= 10;
      else if (compliance.certification.daysUntilExpiration < 90) score -= 5;
    }

    // Ownership (15 points)
    if (!compliance.ownership.isCompliant) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  /**
   * Record verification in history
   */
  private async recordVerificationHistory(data: {
    agencyId: string;
    businessId: string;
    businessName: string;
    ueiNumber: string;
    verificationStatus: VerificationStatus;
    complianceScore: number;
    riskLevel: RiskLevel;
    verifiedBy?: string;
    method: 'single' | 'bulk';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const query = `
      INSERT INTO verification_history (
        id, agency_id, business_id, business_name, uei_number,
        verification_status, compliance_score, risk_level,
        verified_at, verified_by, method, ip_address, user_agent
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, $12
      )
    `;

    await db.query(query, [
      uuidv4(),
      data.agencyId,
      data.businessId,
      data.businessName,
      data.ueiNumber,
      data.verificationStatus,
      data.complianceScore,
      data.riskLevel,
      data.verifiedBy,
      data.method,
      data.ipAddress,
      data.userAgent,
    ]);
  }

  /**
   * Record bulk verification job
   */
  private async recordBulkVerificationJob(
    jobId: string,
    request: BulkVerificationRequest,
    results: BulkVerificationItem[],
    summary: { compliant: number; nonCompliant: number; expired: number; notFound: number; errors: number },
    startedAt: Date
  ): Promise<void> {
    const query = `
      INSERT INTO bulk_verification_jobs (
        id, agency_id, requested_by, total_requested,
        processed, started_at, completed_at, status,
        summary, results
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), 'completed', $7, $8
      )
    `;

    await db.query(query, [
      jobId,
      request.agencyId,
      request.requestedBy,
      request.ueiNumbers.length,
      results.length,
      startedAt,
      JSON.stringify(summary),
      JSON.stringify(results),
    ]);
  }
}

// Export singleton instance
export const agencyService = new AgencyService();

