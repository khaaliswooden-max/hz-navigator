import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';

import type {
  AgencyMetrics,
  ContractorStats,
  GeographicDistribution,
  ContractorDirectoryEntry,
  ContractorDirectoryFilters,
  ReportConfig,
  GeneratedReport,
  ReportData,
  AnalyticsDashboard,
  DateRange,
  StateContractorCount,
  NaicsContractorCount,
  StateDistribution,
  TimeSeriesData,
  ChartDataPoint,
  TopContractorStat,
} from '../types/analytics.js';
import type { RiskLevel } from '../types/compliance.js';

/**
 * Analytics Service
 * 
 * Handles agency analytics, metrics, and report generation
 */
export class AnalyticsService {
  private readonly US_STATES: Record<string, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'District of Columbia', PR: 'Puerto Rico', VI: 'Virgin Islands', GU: 'Guam',
  };

  /**
   * Get agency metrics for a date range
   */
  async getAgencyMetrics(
    agencyId: string,
    dateRange: DateRange
  ): Promise<AgencyMetrics> {
    // Get agency name
    const agencyQuery = `SELECT name FROM agencies WHERE id = $1`;
    const agencyResult = await db.query<{ name: string }>(agencyQuery, [agencyId]);
    const agencyName = agencyResult.rows[0]?.name ?? 'Unknown Agency';

    // Get business metrics
    const businessQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE c.status = 'approved' AND c.expiration_date > NOW()) as active_hubzone,
        COUNT(*) FILTER (WHERE c.status = 'approved') as total_certified,
        COUNT(*) FILTER (WHERE c.status = 'approved' AND c.certification_date >= DATE_TRUNC('year', NOW())) as new_this_year,
        COUNT(*) FILTER (WHERE c.status IN ('pending', 'under_review')) as pending_review,
        COUNT(*) FILTER (WHERE c.status = 'approved' AND c.expiration_date <= NOW() + INTERVAL '30 days') as expiring_30days
      FROM businesses b
      LEFT JOIN certifications c ON c.business_id = b.id
      WHERE b.is_active = true
    `;
    const businessResult = await db.query<{
      active_hubzone: string;
      total_certified: string;
      new_this_year: string;
      pending_review: string;
      expiring_30days: string;
    }>(businessQuery, []);
    const bizMetrics = businessResult.rows[0];

    // Get contract metrics
    const contractQuery = `
      SELECT 
        COUNT(*) as total_contracts,
        COUNT(*) FILTER (WHERE is_hubzone_contractor = true) as hubzone_contracts,
        COALESCE(SUM(award_value), 0) as total_value,
        COALESCE(SUM(award_value) FILTER (WHERE is_hubzone_contractor = true), 0) as hubzone_value,
        COALESCE(AVG(award_value), 0) as avg_value,
        COALESCE(AVG(award_value) FILTER (WHERE is_hubzone_contractor = true), 0) as avg_hubzone_value
      FROM contracts
      WHERE agency_id = $1
        AND award_date >= $2
        AND award_date <= $3
    `;
    const contractResult = await db.query<{
      total_contracts: string;
      hubzone_contracts: string;
      total_value: string;
      hubzone_value: string;
      avg_value: string;
      avg_hubzone_value: string;
    }>(contractQuery, [agencyId, dateRange.startDate, dateRange.endDate]);
    const contractMetrics = contractResult.rows[0];

    // Get verification metrics
    const verifyQuery = `
      SELECT 
        COUNT(*) as total_verifications,
        COUNT(*) FILTER (WHERE verification_status = 'valid') as compliant,
        COUNT(*) FILTER (WHERE verification_status IN ('non_compliant', 'expired')) as non_compliant
      FROM verification_history
      WHERE agency_id = $1
        AND verified_at >= $2
        AND verified_at <= $3
    `;
    const verifyResult = await db.query<{
      total_verifications: string;
      compliant: string;
      non_compliant: string;
    }>(verifyQuery, [agencyId, dateRange.startDate, dateRange.endDate]);
    const verifyMetrics = verifyResult.rows[0];

    // Get goal metrics
    const fiscalYear = this.getFiscalYear(new Date());
    const goalQuery = `
      SELECT goal_percentage, total_contracting_goal
      FROM fiscal_year_goals
      WHERE agency_id = $1 AND fiscal_year = $2
    `;
    const goalResult = await db.query<{
      goal_percentage: string;
      total_contracting_goal: string;
    }>(goalQuery, [agencyId, fiscalYear]);
    const goalData = goalResult.rows[0];
    const goalPercentage = parseFloat(goalData?.goal_percentage ?? '3');
    
    const totalValue = parseFloat(contractMetrics?.total_value ?? '0');
    const hubzoneValue = parseFloat(contractMetrics?.hubzone_value ?? '0');
    const achievedPercentage = totalValue > 0 ? (hubzoneValue / totalValue) * 100 : 0;
    
    let goalStatus: 'on_track' | 'at_risk' | 'behind';
    if (achievedPercentage >= goalPercentage * 0.9) {
      goalStatus = 'on_track';
    } else if (achievedPercentage >= goalPercentage * 0.7) {
      goalStatus = 'at_risk';
    } else {
      goalStatus = 'behind';
    }

    return {
      agencyId,
      agencyName,
      dateRange,
      generatedAt: new Date(),
      activeHubzoneBusinesses: parseInt(bizMetrics?.active_hubzone ?? '0', 10),
      totalCertifiedBusinesses: parseInt(bizMetrics?.total_certified ?? '0', 10),
      newCertificationsThisYear: parseInt(bizMetrics?.new_this_year ?? '0', 10),
      certificationsPendingReview: parseInt(bizMetrics?.pending_review ?? '0', 10),
      expiringCertifications30Days: parseInt(bizMetrics?.expiring_30days ?? '0', 10),
      totalContractsAwarded: parseInt(contractMetrics?.total_contracts ?? '0', 10),
      hubzoneContractsAwarded: parseInt(contractMetrics?.hubzone_contracts ?? '0', 10),
      totalContractValue: totalValue,
      hubzoneContractValue: hubzoneValue,
      averageContractValue: parseFloat(contractMetrics?.avg_value ?? '0'),
      averageHubzoneContractValue: parseFloat(contractMetrics?.avg_hubzone_value ?? '0'),
      verificationsPerformed: parseInt(verifyMetrics?.total_verifications ?? '0', 10),
      compliantVerifications: parseInt(verifyMetrics?.compliant ?? '0', 10),
      nonCompliantVerifications: parseInt(verifyMetrics?.non_compliant ?? '0', 10),
      currentGoalPercentage: goalPercentage,
      currentAchievedPercentage: Math.round(achievedPercentage * 100) / 100,
      goalStatus,
    };
  }

  /**
   * Get contractor statistics
   */
  async getContractorStats(
    agencyId: string,
    dateRange: DateRange
  ): Promise<ContractorStats> {
    // Get total contractors
    const totalQuery = `
      SELECT COUNT(DISTINCT contractor_uei) as total
      FROM contracts
      WHERE agency_id = $1
        AND award_date >= $2
        AND award_date <= $3
        AND is_hubzone_contractor = true
    `;
    const totalResult = await db.query<{ total: string }>(totalQuery, [
      agencyId, dateRange.startDate, dateRange.endDate
    ]);
    const totalContractors = parseInt(totalResult.rows[0]?.total ?? '0', 10);

    // Get by state
    const stateQuery = `
      SELECT 
        COALESCE(b.state, 'Unknown') as state,
        COUNT(DISTINCT c.contractor_uei) as count,
        COALESCE(SUM(c.award_value), 0) as total_value
      FROM contracts c
      LEFT JOIN businesses b ON UPPER(b.uei_number) = UPPER(c.contractor_uei)
      WHERE c.agency_id = $1
        AND c.award_date >= $2
        AND c.award_date <= $3
        AND c.is_hubzone_contractor = true
      GROUP BY b.state
      ORDER BY count DESC
    `;
    const stateResult = await db.query<{
      state: string;
      count: string;
      total_value: string;
    }>(stateQuery, [agencyId, dateRange.startDate, dateRange.endDate]);

    const byState: StateContractorCount[] = stateResult.rows.map(row => ({
      state: row.state,
      stateName: this.US_STATES[row.state] ?? row.state,
      count: parseInt(row.count, 10),
      percentage: totalContractors > 0 ? (parseInt(row.count, 10) / totalContractors) * 100 : 0,
      totalContractValue: parseFloat(row.total_value),
    }));

    // Get by NAICS
    const naicsQuery = `
      SELECT 
        naics_code,
        COUNT(DISTINCT contractor_uei) as count
      FROM contracts,
        LATERAL jsonb_array_elements(naics_codes) as naics_obj,
        LATERAL (SELECT naics_obj->>'code' as naics_code) nc
      WHERE agency_id = $1
        AND award_date >= $2
        AND award_date <= $3
        AND is_hubzone_contractor = true
      GROUP BY naics_code
      ORDER BY count DESC
      LIMIT 10
    `;
    let byNaics: NaicsContractorCount[] = [];
    try {
      const naicsResult = await db.query<{ naics_code: string; count: string }>(
        naicsQuery, [agencyId, dateRange.startDate, dateRange.endDate]
      );
      byNaics = naicsResult.rows.map(row => ({
        code: row.naics_code,
        title: this.getNaicsTitle(row.naics_code),
        count: parseInt(row.count, 10),
        percentage: totalContractors > 0 ? (parseInt(row.count, 10) / totalContractors) * 100 : 0,
      }));
    } catch {
      // NAICS query may fail if no NAICS data
    }

    // Get top contractors
    const topQuery = `
      SELECT 
        c.contractor_uei as uei_number,
        c.contractor_name as business_name,
        b.state,
        COUNT(*) as contract_count,
        SUM(c.award_value) as total_value
      FROM contracts c
      LEFT JOIN businesses b ON UPPER(b.uei_number) = UPPER(c.contractor_uei)
      WHERE c.agency_id = $1
        AND c.award_date >= $2
        AND c.award_date <= $3
        AND c.is_hubzone_contractor = true
      GROUP BY c.contractor_uei, c.contractor_name, b.state
      ORDER BY total_value DESC
      LIMIT 10
    `;
    const topResult = await db.query<{
      uei_number: string;
      business_name: string;
      state: string;
      contract_count: string;
      total_value: string;
    }>(topQuery, [agencyId, dateRange.startDate, dateRange.endDate]);

    const topContractors: TopContractorStat[] = topResult.rows.map(row => ({
      businessId: '',
      businessName: row.business_name,
      ueiNumber: row.uei_number,
      state: row.state ?? 'Unknown',
      contractCount: parseInt(row.contract_count, 10),
      totalValue: parseFloat(row.total_value),
      certificationStatus: 'approved',
      riskLevel: 'low' as RiskLevel,
    }));

    return {
      totalContractors,
      byState,
      byNaics,
      byCertificationStatus: [],
      byRiskLevel: [],
      topContractors,
    };
  }

  /**
   * Get geographic distribution
   */
  async getGeographicDistribution(
    agencyId: string,
    dateRange: DateRange
  ): Promise<GeographicDistribution> {
    // Get state distribution
    const stateQuery = `
      SELECT 
        COALESCE(b.state, 'Unknown') as state,
        COUNT(DISTINCT b.id) as business_count,
        COUNT(DISTINCT c.id) as contract_count,
        COALESCE(SUM(c.award_value), 0) as contract_value
      FROM businesses b
      LEFT JOIN contracts c ON UPPER(c.contractor_uei) = UPPER(b.uei_number)
        AND c.agency_id = $1
        AND c.award_date >= $2
        AND c.award_date <= $3
      WHERE b.is_active = true
      GROUP BY b.state
      ORDER BY business_count DESC
    `;
    const stateResult = await db.query<{
      state: string;
      business_count: string;
      contract_count: string;
      contract_value: string;
    }>(stateQuery, [agencyId, dateRange.startDate, dateRange.endDate]);

    const byState: StateDistribution[] = stateResult.rows.map(row => ({
      state: row.state,
      stateName: this.US_STATES[row.state] ?? row.state,
      businessCount: parseInt(row.business_count, 10),
      contractCount: parseInt(row.contract_count, 10),
      contractValue: parseFloat(row.contract_value),
      hubzoneTracts: 0,
      coordinates: this.getStateCoordinates(row.state),
    }));

    // Get region distribution
    const regions: Record<string, string[]> = {
      Northeast: ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT'],
      Southeast: ['AL', 'AR', 'FL', 'GA', 'KY', 'LA', 'MS', 'NC', 'SC', 'TN', 'VA', 'WV'],
      Midwest: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
      Southwest: ['AZ', 'NM', 'OK', 'TX'],
      West: ['AK', 'CA', 'CO', 'HI', 'ID', 'MT', 'NV', 'OR', 'UT', 'WA', 'WY'],
      Territories: ['DC', 'PR', 'VI', 'GU'],
    };

    const totalBusinesses = byState.reduce((sum, s) => sum + s.businessCount, 0);
    const byRegion = Object.entries(regions).map(([region, states]) => {
      const regionStates = byState.filter(s => states.includes(s.state));
      const businessCount = regionStates.reduce((sum, s) => sum + s.businessCount, 0);
      const contractCount = regionStates.reduce((sum, s) => sum + s.contractCount, 0);
      const contractValue = regionStates.reduce((sum, s) => sum + s.contractValue, 0);
      
      return {
        region,
        states,
        businessCount,
        contractCount,
        contractValue,
        percentageOfTotal: totalBusinesses > 0 ? (businessCount / totalBusinesses) * 100 : 0,
      };
    });

    // Identify concentration areas
    const concentrationAreas = byState
      .filter(s => s.businessCount > 50)
      .slice(0, 5)
      .map(s => ({
        name: s.stateName,
        type: 'state' as const,
        businessCount: s.businessCount,
        contractValue: s.contractValue,
      }));

    // Identify underserved areas
    const underservedAreas = byState
      .filter(s => s.businessCount < 10 && s.state !== 'Unknown')
      .map(s => s.stateName);

    return {
      byState,
      byRegion,
      concentrationAreas,
      underservedAreas,
    };
  }

  /**
   * Get contractor directory with filters
   */
  async getContractorDirectory(
    filters: ContractorDirectoryFilters
  ): Promise<{ contractors: ContractorDirectoryEntry[]; total: number }> {
    const conditions: string[] = ['b.is_active = true'];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (filters.search) {
      conditions.push(`(
        LOWER(b.legal_name) LIKE LOWER($${paramIndex}) OR
        LOWER(b.uei_number) LIKE LOWER($${paramIndex}) OR
        LOWER(b.dba_name) LIKE LOWER($${paramIndex})
      )`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.state) {
      conditions.push(`b.state = $${paramIndex}`);
      values.push(filters.state);
      paramIndex++;
    }

    if (filters.certificationStatus) {
      conditions.push(`c.status = $${paramIndex}`);
      values.push(filters.certificationStatus);
      paramIndex++;
    }

    // Count query
    const countQuery = `
      SELECT COUNT(DISTINCT b.id) as total
      FROM businesses b
      LEFT JOIN certifications c ON c.business_id = b.id
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await db.query<{ total: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

    // Sort
    const sortColumn = {
      businessName: 'b.legal_name',
      state: 'b.state',
      certificationDate: 'c.certification_date',
      contractValue: 'contract_value',
      riskLevel: 'risk_level',
    }[filters.sortBy ?? 'businessName'] ?? 'b.legal_name';
    const sortOrder = filters.sortOrder === 'desc' ? 'DESC' : 'ASC';

    // Pagination
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        b.id,
        b.legal_name,
        b.dba_name,
        b.uei_number,
        b.cage_code,
        b.state,
        b.city,
        COALESCE(b.principal_office_address->>'street1', '') as address,
        b.naics_codes,
        c.status as certification_status,
        c.certification_date,
        c.expiration_date,
        COALESCE(cs.compliance_score, 0) as compliance_score,
        COALESCE(cs.risk_level, 'low') as risk_level,
        COALESCE(contract_stats.contract_count, 0) as contract_count,
        COALESCE(contract_stats.total_value, 0) as contract_value,
        contract_stats.last_award_date
      FROM businesses b
      LEFT JOIN certifications c ON c.business_id = b.id
      LEFT JOIN LATERAL (
        SELECT 
          compliance_score,
          risk_level
        FROM compliance_snapshots
        WHERE business_id = b.id
        ORDER BY snapshot_date DESC
        LIMIT 1
      ) cs ON true
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(*) as contract_count,
          SUM(award_value) as total_value,
          MAX(award_date) as last_award_date
        FROM contracts
        WHERE contractor_uei = b.uei_number
      ) contract_stats ON true
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const result = await db.query(query, [...values, limit, offset]);

    const contractors: ContractorDirectoryEntry[] = result.rows.map(row => ({
      businessId: row['id'] as string,
      businessName: row['legal_name'] as string,
      dbaName: row['dba_name'] as string | undefined,
      ueiNumber: row['uei_number'] as string,
      cageCode: row['cage_code'] as string | undefined,
      state: row['state'] as string ?? 'Unknown',
      city: row['city'] as string ?? '',
      address: row['address'] as string,
      naicsCodes: this.parseNaicsCodes(row['naics_codes']),
      certificationStatus: row['certification_status'] as string ?? 'unknown',
      certificationDate: row['certification_date'] ? new Date(row['certification_date'] as string) : undefined,
      expirationDate: row['expiration_date'] ? new Date(row['expiration_date'] as string) : undefined,
      complianceScore: parseInt(row['compliance_score'] as string ?? '0', 10),
      riskLevel: row['risk_level'] as RiskLevel ?? 'low',
      contractCount: parseInt(row['contract_count'] as string ?? '0', 10),
      totalContractValue: parseFloat(row['contract_value'] as string ?? '0'),
      lastAwardDate: row['last_award_date'] ? new Date(row['last_award_date'] as string) : undefined,
    }));

    return { contractors, total };
  }

  /**
   * Export contractor directory
   */
  async exportContractorDirectory(
    agencyId: string,
    format: 'csv' | 'excel'
  ): Promise<string> {
    const { contractors } = await this.getContractorDirectory({ limit: 10000 });

    const headers = [
      'Business Name',
      'DBA Name',
      'UEI Number',
      'CAGE Code',
      'State',
      'City',
      'Address',
      'Primary NAICS',
      'Certification Status',
      'Certification Date',
      'Expiration Date',
      'Compliance Score',
      'Risk Level',
      'Contract Count',
      'Total Contract Value',
    ];

    const rows = contractors.map(c => [
      c.businessName,
      c.dbaName ?? '',
      c.ueiNumber,
      c.cageCode ?? '',
      c.state,
      c.city,
      c.address,
      c.naicsCodes.find(n => n.isPrimary)?.code ?? c.naicsCodes[0]?.code ?? '',
      c.certificationStatus,
      c.certificationDate?.toISOString().split('T')[0] ?? '',
      c.expirationDate?.toISOString().split('T')[0] ?? '',
      String(c.complianceScore),
      c.riskLevel,
      String(c.contractCount),
      c.totalContractValue.toFixed(2),
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }

  /**
   * Generate report
   */
  async generateReport(config: ReportConfig): Promise<GeneratedReport> {
    const reportId = uuidv4();
    
    // Get agency name
    const agencyQuery = `SELECT name FROM agencies WHERE id = $1`;
    const agencyResult = await db.query<{ name: string }>(agencyQuery, [config.agencyId]);
    const agencyName = agencyResult.rows[0]?.name ?? 'Unknown Agency';

    const reportTitles: Record<string, { title: string; description: string }> = {
      hubzone_goal_achievement: {
        title: 'HUBZone Goal Achievement Report',
        description: 'Analysis of HUBZone contracting goal progress and achievement metrics',
      },
      contractor_directory: {
        title: 'HUBZone Contractor Directory',
        description: 'Comprehensive listing of HUBZone certified contractors',
      },
      verification_history: {
        title: 'Contractor Verification History Report',
        description: 'Summary of contractor verification activities and outcomes',
      },
      contract_awards_summary: {
        title: 'Contract Awards Summary Report',
        description: 'Analysis of contract awards and HUBZone participation',
      },
      geographic_distribution: {
        title: 'Geographic Distribution Report',
        description: 'Analysis of HUBZone contractor geographic distribution',
      },
    };

    const { title, description } = reportTitles[config.reportType] ?? {
      title: 'Agency Report',
      description: 'Custom agency report',
    };

    // Generate report data based on type
    let data: ReportData;
    switch (config.reportType) {
      case 'hubzone_goal_achievement':
        data = await this.generateGoalAchievementReport(config);
        break;
      case 'contractor_directory':
        data = await this.generateContractorDirectoryReport(config);
        break;
      case 'verification_history':
        data = await this.generateVerificationHistoryReport(config);
        break;
      case 'contract_awards_summary':
        data = await this.generateContractAwardsReport(config);
        break;
      case 'geographic_distribution':
        data = await this.generateGeographicReport(config);
        break;
      default:
        throw new Error(`Unsupported report type: ${config.reportType}`);
    }

    return {
      reportId,
      reportType: config.reportType,
      title,
      description,
      agencyId: config.agencyId,
      agencyName,
      generatedAt: new Date(),
      dateRange: config.dateRange,
      format: config.format,
      data,
    };
  }

  /**
   * Get analytics dashboard data
   */
  async getAnalyticsDashboard(
    agencyId: string,
    dateRange: DateRange
  ): Promise<AnalyticsDashboard> {
    const [metrics, contractorStats, geoDistribution] = await Promise.all([
      this.getAgencyMetrics(agencyId, dateRange),
      this.getContractorStats(agencyId, dateRange),
      this.getGeographicDistribution(agencyId, dateRange),
    ]);

    // Get contracts over time
    const timeSeriesQuery = `
      SELECT 
        DATE_TRUNC('month', award_date) as month,
        COUNT(*) as total_contracts,
        COUNT(*) FILTER (WHERE is_hubzone_contractor = true) as hubzone_contracts,
        COALESCE(SUM(award_value), 0) as total_value,
        COALESCE(SUM(award_value) FILTER (WHERE is_hubzone_contractor = true), 0) as hubzone_value
      FROM contracts
      WHERE agency_id = $1
        AND award_date >= $2
        AND award_date <= $3
      GROUP BY DATE_TRUNC('month', award_date)
      ORDER BY month
    `;
    const timeSeriesResult = await db.query<{
      month: Date;
      total_contracts: string;
      hubzone_contracts: string;
      total_value: string;
      hubzone_value: string;
    }>(timeSeriesQuery, [agencyId, dateRange.startDate, dateRange.endDate]);

    const contractsOverTime: TimeSeriesData[] = [
      {
        label: 'Total Contracts',
        data: timeSeriesResult.rows.map(row => ({
          date: new Date(row.month),
          value: parseInt(row.total_contracts, 10),
        })),
      },
      {
        label: 'HUBZone Contracts',
        data: timeSeriesResult.rows.map(row => ({
          date: new Date(row.month),
          value: parseInt(row.hubzone_contracts, 10),
        })),
      },
    ];

    // Goal achievement trend
    const goalTrendQuery = `
      SELECT 
        DATE_TRUNC('month', award_date) as month,
        CASE 
          WHEN SUM(award_value) > 0 
          THEN (SUM(award_value) FILTER (WHERE is_hubzone_contractor = true) / SUM(award_value)) * 100
          ELSE 0 
        END as percentage
      FROM contracts
      WHERE agency_id = $1
        AND award_date >= $2
        AND award_date <= $3
      GROUP BY DATE_TRUNC('month', award_date)
      ORDER BY month
    `;
    const goalTrendResult = await db.query<{
      month: Date;
      percentage: string;
    }>(goalTrendQuery, [agencyId, dateRange.startDate, dateRange.endDate]);

    const goalAchievementTrend: ChartDataPoint[] = goalTrendResult.rows.map(row => ({
      label: new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      value: parseFloat(row.percentage),
      date: new Date(row.month),
    }));

    // Contract type breakdown
    const contractTypeQuery = `
      SELECT 
        contract_type,
        COUNT(*) as count,
        COALESCE(SUM(award_value), 0) as value
      FROM contracts
      WHERE agency_id = $1
        AND award_date >= $2
        AND award_date <= $3
      GROUP BY contract_type
    `;
    const contractTypeResult = await db.query<{
      contract_type: string;
      count: string;
      value: string;
    }>(contractTypeQuery, [agencyId, dateRange.startDate, dateRange.endDate]);

    const contractTypeLabels: Record<string, string> = {
      hubzone_set_aside: 'HUBZone Set-Aside',
      hubzone_sole_source: 'HUBZone Sole Source',
      price_preference: 'Price Preference',
      full_open: 'Full & Open',
      small_business: 'Small Business',
      other: 'Other',
    };

    const contractTypeBreakdown: ChartDataPoint[] = contractTypeResult.rows.map(row => ({
      label: contractTypeLabels[row.contract_type] ?? row.contract_type,
      value: parseFloat(row.value),
      category: row.contract_type,
    }));

    // NAICS distribution
    const naicsDistribution: ChartDataPoint[] = contractorStats.byNaics.slice(0, 10).map(n => ({
      label: n.code,
      value: n.count,
      category: n.title,
    }));

    return {
      agencyId,
      agencyName: metrics.agencyName,
      generatedAt: new Date(),
      dateRange,
      metrics,
      contractsOverTime,
      goalAchievementTrend,
      geographicHeatmap: geoDistribution.byState,
      naicsDistribution,
      contractTypeBreakdown,
      topStates: contractorStats.byState.slice(0, 10),
      topContractors: contractorStats.topContractors,
      topNaicsCodes: contractorStats.byNaics.slice(0, 10),
    };
  }

  // Private helper methods

  private async generateGoalAchievementReport(config: ReportConfig) {
    const metrics = await this.getAgencyMetrics(config.agencyId, config.dateRange);
    
    // Monthly progress
    const monthlyQuery = `
      SELECT 
        DATE_TRUNC('month', award_date) as month,
        COUNT(*) as contracts_awarded,
        COALESCE(SUM(award_value), 0) as contract_value,
        CASE 
          WHEN SUM(award_value) > 0 
          THEN (SUM(award_value) FILTER (WHERE is_hubzone_contractor = true) / SUM(award_value)) * 100
          ELSE 0 
        END as actual_percentage
      FROM contracts
      WHERE agency_id = $1
        AND award_date >= $2
        AND award_date <= $3
      GROUP BY DATE_TRUNC('month', award_date)
      ORDER BY month
    `;
    const monthlyResult = await db.query<{
      month: Date;
      contracts_awarded: string;
      contract_value: string;
      actual_percentage: string;
    }>(monthlyQuery, [config.agencyId, config.dateRange.startDate, config.dateRange.endDate]);

    const monthlyProgress = monthlyResult.rows.map((row, idx) => ({
      month: new Date(row.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      targetPercentage: ((idx + 1) / 12) * metrics.currentGoalPercentage,
      actualPercentage: parseFloat(row.actual_percentage),
      contractsAwarded: parseInt(row.contracts_awarded, 10),
      contractValue: parseFloat(row.contract_value),
    }));

    return {
      type: 'hubzone_goal_achievement' as const,
      metrics,
      monthlyProgress,
      quarterlyComparison: [],
      yearOverYearComparison: [],
      recommendations: this.generateRecommendations(metrics),
    };
  }

  private async generateContractorDirectoryReport(config: ReportConfig) {
    const { contractors, total } = await this.getContractorDirectory({
      limit: 1000,
      ...config.filters as ContractorDirectoryFilters,
    });

    const stats = await this.getContractorStats(config.agencyId, config.dateRange);

    return {
      type: 'contractor_directory' as const,
      totalCount: total,
      contractors,
      summary: {
        byState: stats.byState,
        byNaics: stats.byNaics,
        byCertificationStatus: stats.byCertificationStatus,
      },
    };
  }

  private async generateVerificationHistoryReport(config: ReportConfig) {
    const query = `
      SELECT 
        id, business_name, uei_number, verified_at,
        verification_status, compliance_score, risk_level, verified_by
      FROM verification_history
      WHERE agency_id = $1
        AND verified_at >= $2
        AND verified_at <= $3
      ORDER BY verified_at DESC
      LIMIT 1000
    `;
    const result = await db.query<{
      id: string;
      business_name: string;
      uei_number: string;
      verified_at: Date;
      verification_status: string;
      compliance_score: number;
      risk_level: RiskLevel;
      verified_by: string;
    }>(query, [config.agencyId, config.dateRange.startDate, config.dateRange.endDate]);

    const summaryQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE verification_status = 'valid') as compliant,
        COUNT(*) FILTER (WHERE verification_status = 'non_compliant') as non_compliant,
        COUNT(*) FILTER (WHERE verification_status = 'expired') as expired,
        COUNT(*) FILTER (WHERE verification_status = 'not_found') as not_found
      FROM verification_history
      WHERE agency_id = $1
        AND verified_at >= $2
        AND verified_at <= $3
    `;
    const summaryResult = await db.query<{
      compliant: string;
      non_compliant: string;
      expired: string;
      not_found: string;
    }>(summaryQuery, [config.agencyId, config.dateRange.startDate, config.dateRange.endDate]);
    const summary = summaryResult.rows[0];

    return {
      type: 'verification_history' as const,
      totalVerifications: result.rows.length,
      verifications: result.rows.map(row => ({
        id: row.id,
        businessName: row.business_name,
        ueiNumber: row.uei_number,
        verifiedAt: new Date(row.verified_at),
        status: row.verification_status as any,
        complianceScore: row.compliance_score,
        riskLevel: row.risk_level,
        verifiedBy: row.verified_by,
      })),
      summary: {
        compliant: parseInt(summary?.compliant ?? '0', 10),
        nonCompliant: parseInt(summary?.non_compliant ?? '0', 10),
        expired: parseInt(summary?.expired ?? '0', 10),
        notFound: parseInt(summary?.not_found ?? '0', 10),
      },
      byMonth: [],
    };
  }

  private async generateContractAwardsReport(config: ReportConfig) {
    const query = `
      SELECT 
        contract_number, title, contractor_name, contractor_uei,
        is_hubzone_contractor, award_date, award_value, contract_type
      FROM contracts
      WHERE agency_id = $1
        AND award_date >= $2
        AND award_date <= $3
      ORDER BY award_date DESC
      LIMIT 1000
    `;
    const result = await db.query<{
      contract_number: string;
      title: string;
      contractor_name: string;
      contractor_uei: string;
      is_hubzone_contractor: boolean;
      award_date: Date;
      award_value: string;
      contract_type: string;
    }>(query, [config.agencyId, config.dateRange.startDate, config.dateRange.endDate]);

    const stats = await this.getContractorStats(config.agencyId, config.dateRange);

    const totalValue = result.rows.reduce((sum, r) => sum + parseFloat(r.award_value), 0);
    const hubzoneRows = result.rows.filter(r => r.is_hubzone_contractor);
    const hubzoneValue = hubzoneRows.reduce((sum, r) => sum + parseFloat(r.award_value), 0);

    return {
      type: 'contract_awards_summary' as const,
      totalContracts: result.rows.length,
      totalValue,
      hubzoneContracts: hubzoneRows.length,
      hubzoneValue,
      contracts: result.rows.map(row => ({
        contractNumber: row.contract_number,
        title: row.title,
        contractorName: row.contractor_name,
        contractorUei: row.contractor_uei,
        isHubzone: row.is_hubzone_contractor,
        awardDate: new Date(row.award_date),
        awardValue: parseFloat(row.award_value),
        contractType: row.contract_type as any,
      })),
      byContractType: [],
      byQuarter: [],
      topContractors: stats.topContractors,
    };
  }

  private async generateGeographicReport(config: ReportConfig) {
    const distribution = await this.getGeographicDistribution(config.agencyId, config.dateRange);

    const heatmapData = distribution.byState.map(s => ({
      state: s.state,
      value: s.businessCount,
      type: 'businesses' as const,
    }));

    const insights = [
      {
        title: 'Highest Concentration',
        description: `${distribution.concentrationAreas[0]?.name ?? 'N/A'} has the most HUBZone contractors`,
        metric: `${distribution.concentrationAreas[0]?.businessCount ?? 0} businesses`,
      },
      {
        title: 'Underserved Areas',
        description: `${distribution.underservedAreas.length} states have fewer than 10 HUBZone contractors`,
        metric: distribution.underservedAreas.slice(0, 3).join(', '),
      },
    ];

    return {
      type: 'geographic_distribution' as const,
      distribution,
      heatmapData,
      insights,
    };
  }

  private generateRecommendations(metrics: AgencyMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.goalStatus === 'behind') {
      recommendations.push('Increase outreach to HUBZone certified contractors');
      recommendations.push('Review upcoming procurements for HUBZone set-aside opportunities');
    }

    if (metrics.expiringCertifications30Days > 0) {
      recommendations.push(`${metrics.expiringCertifications30Days} certifications expiring - consider re-verification`);
    }

    if (metrics.hubzoneContractsAwarded < metrics.totalContractsAwarded * 0.1) {
      recommendations.push('Consider implementing HUBZone price preference evaluation factor');
    }

    return recommendations;
  }

  private getFiscalYear(date: Date): number {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return month >= 10 ? year + 1 : year;
  }

  private getStateCoordinates(state: string): { latitude: number; longitude: number } {
    const coords: Record<string, { latitude: number; longitude: number }> = {
      AL: { latitude: 32.806671, longitude: -86.791130 },
      AK: { latitude: 61.370716, longitude: -152.404419 },
      AZ: { latitude: 33.729759, longitude: -111.431221 },
      AR: { latitude: 34.969704, longitude: -92.373123 },
      CA: { latitude: 36.116203, longitude: -119.681564 },
      CO: { latitude: 39.059811, longitude: -105.311104 },
      CT: { latitude: 41.597782, longitude: -72.755371 },
      DE: { latitude: 39.318523, longitude: -75.507141 },
      FL: { latitude: 27.766279, longitude: -81.686783 },
      GA: { latitude: 33.040619, longitude: -83.643074 },
      HI: { latitude: 21.094318, longitude: -157.498337 },
      ID: { latitude: 44.240459, longitude: -114.478828 },
      IL: { latitude: 40.349457, longitude: -88.986137 },
      IN: { latitude: 39.849426, longitude: -86.258278 },
      IA: { latitude: 42.011539, longitude: -93.210526 },
      KS: { latitude: 38.526600, longitude: -96.726486 },
      KY: { latitude: 37.668140, longitude: -84.670067 },
      LA: { latitude: 31.169546, longitude: -91.867805 },
      ME: { latitude: 44.693947, longitude: -69.381927 },
      MD: { latitude: 39.063946, longitude: -76.802101 },
      MA: { latitude: 42.230171, longitude: -71.530106 },
      MI: { latitude: 43.326618, longitude: -84.536095 },
      MN: { latitude: 45.694454, longitude: -93.900192 },
      MS: { latitude: 32.741646, longitude: -89.678696 },
      MO: { latitude: 38.456085, longitude: -92.288368 },
      MT: { latitude: 46.921925, longitude: -110.454353 },
      NE: { latitude: 41.125370, longitude: -98.268082 },
      NV: { latitude: 38.313515, longitude: -117.055374 },
      NH: { latitude: 43.452492, longitude: -71.563896 },
      NJ: { latitude: 40.298904, longitude: -74.521011 },
      NM: { latitude: 34.840515, longitude: -106.248482 },
      NY: { latitude: 42.165726, longitude: -74.948051 },
      NC: { latitude: 35.630066, longitude: -79.806419 },
      ND: { latitude: 47.528912, longitude: -99.784012 },
      OH: { latitude: 40.388783, longitude: -82.764915 },
      OK: { latitude: 35.565342, longitude: -96.928917 },
      OR: { latitude: 44.572021, longitude: -122.070938 },
      PA: { latitude: 40.590752, longitude: -77.209755 },
      RI: { latitude: 41.680893, longitude: -71.511780 },
      SC: { latitude: 33.856892, longitude: -80.945007 },
      SD: { latitude: 44.299782, longitude: -99.438828 },
      TN: { latitude: 35.747845, longitude: -86.692345 },
      TX: { latitude: 31.054487, longitude: -97.563461 },
      UT: { latitude: 40.150032, longitude: -111.862434 },
      VT: { latitude: 44.045876, longitude: -72.710686 },
      VA: { latitude: 37.769337, longitude: -78.169968 },
      WA: { latitude: 47.400902, longitude: -121.490494 },
      WV: { latitude: 38.491226, longitude: -80.954453 },
      WI: { latitude: 44.268543, longitude: -89.616508 },
      WY: { latitude: 42.755966, longitude: -107.302490 },
      DC: { latitude: 38.897438, longitude: -77.026817 },
      PR: { latitude: 18.220833, longitude: -66.590149 },
    };
    return coords[state] ?? { latitude: 39.8283, longitude: -98.5795 }; // US center
  }

  private getNaicsTitle(code: string): string {
    const titles: Record<string, string> = {
      '541511': 'Custom Computer Programming Services',
      '541512': 'Computer Systems Design Services',
      '541611': 'Administrative Management Consulting',
      '541613': 'Marketing Consulting Services',
      '541618': 'Other Management Consulting',
      '541690': 'Other Scientific and Technical Consulting',
      '561210': 'Facilities Support Services',
      '561320': 'Temporary Help Services',
      '561612': 'Security Guards and Patrol Services',
      '236220': 'Commercial Building Construction',
    };
    return titles[code] ?? `NAICS ${code}`;
  }

  private parseNaicsCodes(value: unknown): { code: string; title: string; isPrimary: boolean }[] {
    if (!value) return [];
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) return value;
    return [];
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

