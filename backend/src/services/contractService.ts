import { db } from './database.js';
import { v4 as uuidv4 } from 'uuid';

import type {
  Contract,
  CreateContractData,
  UpdateContractData,
  FiscalYearGoal,
  GoalProgress,
  MonthlyProgress,
  ContractSummary,
  TopContractor,
  FiscalYearReport,
  ContractFilters,
  ContractType,
  SamValidationResult,
} from '../types/contract.js';

/**
 * Contract Service
 * 
 * Handles contract management and HUBZone goal tracking
 */
export class ContractService {
  private readonly MONTH_NAMES = [
    'October', 'November', 'December', 'January', 'February', 'March',
    'April', 'May', 'June', 'July', 'August', 'September'
  ];

  /**
   * Create a new contract
   */
  async createContract(
    agencyId: string,
    data: CreateContractData,
    createdBy?: string
  ): Promise<Contract> {
    const id = uuidv4();
    const now = new Date();
    
    // Calculate fiscal year and quarter from award date
    const { fiscalYear, fiscalQuarter } = this.getFiscalPeriod(data.awardDate);
    
    const query = `
      INSERT INTO contracts (
        id, agency_id, contract_number, title, description,
        contractor_name, contractor_uei, contractor_cage_code, is_hubzone_contractor,
        award_date, award_value, current_value, obligated_amount,
        contract_type, award_type, naics_codes, psc,
        period_of_performance_start, period_of_performance_end,
        status, fiscal_year, fiscal_quarter,
        fpds_reported, created_at, updated_at, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
      )
      RETURNING *
    `;
    
    const result = await db.query<Record<string, unknown>>(query, [
      id,
      agencyId,
      data.contractNumber,
      data.title,
      data.description,
      data.contractorName,
      data.contractorUei,
      data.contractorCageCode,
      data.isHubzoneContractor,
      data.awardDate,
      data.awardValue,
      data.awardValue, // current_value starts as award_value
      data.awardValue, // obligated starts as award_value
      data.contractType,
      data.awardType,
      JSON.stringify(data.naicsCodes),
      data.psc,
      data.periodOfPerformanceStart,
      data.periodOfPerformanceEnd,
      data.status ?? 'active',
      fiscalYear,
      fiscalQuarter,
      false,
      now,
      now,
      createdBy,
    ]);
    
    return this.mapContractRow(result.rows[0]);
  }

  /**
   * Update an existing contract
   */
  async updateContract(
    contractId: string,
    updates: UpdateContractData
  ): Promise<Contract | null> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.currentValue !== undefined) {
      setClauses.push(`current_value = $${paramIndex++}`);
      values.push(updates.currentValue);
    }
    if (updates.obligatedAmount !== undefined) {
      setClauses.push(`obligated_amount = $${paramIndex++}`);
      values.push(updates.obligatedAmount);
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.periodOfPerformanceEnd !== undefined) {
      setClauses.push(`period_of_performance_end = $${paramIndex++}`);
      values.push(updates.periodOfPerformanceEnd);
    }
    
    values.push(contractId);
    
    const query = `
      UPDATE contracts
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await db.query<Record<string, unknown>>(query, values);
    
    if (result.rows.length === 0) return null;
    return this.mapContractRow(result.rows[0]!);
  }

  /**
   * Get a single contract by ID
   */
  async getContract(contractId: string): Promise<Contract | null> {
    const query = `SELECT * FROM contracts WHERE id = $1`;
    const result = await db.query(query, [contractId]);
    
    if (result.rows.length === 0) return null;
    return this.mapContractRow(result.rows[0]);
  }

  /**
   * Get contracts for an agency with filters
   */
  async getAgencyContracts(
    filters: ContractFilters
  ): Promise<{ contracts: Contract[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (filters.agencyId) {
      conditions.push(`agency_id = $${paramIndex++}`);
      values.push(filters.agencyId);
    }
    if (filters.fiscalYear) {
      conditions.push(`fiscal_year = $${paramIndex++}`);
      values.push(filters.fiscalYear);
    }
    if (filters.fiscalQuarter) {
      conditions.push(`fiscal_quarter = $${paramIndex++}`);
      values.push(filters.fiscalQuarter);
    }
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters.contractType) {
      conditions.push(`contract_type = $${paramIndex++}`);
      values.push(filters.contractType);
    }
    if (filters.isHubzoneContractor !== undefined) {
      conditions.push(`is_hubzone_contractor = $${paramIndex++}`);
      values.push(filters.isHubzoneContractor);
    }
    if (filters.contractorUei) {
      conditions.push(`contractor_uei = $${paramIndex++}`);
      values.push(filters.contractorUei);
    }
    if (filters.startDate) {
      conditions.push(`award_date >= $${paramIndex++}`);
      values.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push(`award_date <= $${paramIndex++}`);
      values.push(filters.endDate);
    }
    if (filters.minValue) {
      conditions.push(`award_value >= $${paramIndex++}`);
      values.push(filters.minValue);
    }
    if (filters.maxValue) {
      conditions.push(`award_value <= $${paramIndex++}`);
      values.push(filters.maxValue);
    }
    if (filters.search) {
      conditions.push(`(
        LOWER(title) LIKE LOWER($${paramIndex}) OR
        LOWER(contractor_name) LIKE LOWER($${paramIndex}) OR
        LOWER(contract_number) LIKE LOWER($${paramIndex})
      )`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    // Count query
    const countQuery = `
      SELECT COUNT(*) as total FROM contracts WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await db.query<{ total: string }>(countQuery, values);
    const total = parseInt(countResult.rows[0]?.total ?? '0', 10);
    
    // Sort
    const sortColumn = {
      awardDate: 'award_date',
      awardValue: 'award_value',
      contractorName: 'contractor_name',
      contractNumber: 'contract_number',
    }[filters.sortBy ?? 'awardDate'] ?? 'award_date';
    
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    // Pagination
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT * FROM contracts
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const result = await db.query(query, [...values, limit, offset]);
    
    return {
      contracts: result.rows.map(row => this.mapContractRow(row)),
      total,
    };
  }

  /**
   * Set or update fiscal year goal
   */
  async setFiscalYearGoal(
    agencyId: string,
    fiscalYear: number,
    goalPercentage: number,
    totalContractingGoal: number,
    notes?: string
  ): Promise<FiscalYearGoal> {
    const hubzoneGoalAmount = (goalPercentage / 100) * totalContractingGoal;
    
    const query = `
      INSERT INTO fiscal_year_goals (
        id, agency_id, fiscal_year, goal_percentage,
        total_contracting_goal, hubzone_goal_amount, notes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
      )
      ON CONFLICT (agency_id, fiscal_year)
      DO UPDATE SET
        goal_percentage = EXCLUDED.goal_percentage,
        total_contracting_goal = EXCLUDED.total_contracting_goal,
        hubzone_goal_amount = EXCLUDED.hubzone_goal_amount,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await db.query<Record<string, unknown>>(query, [
      uuidv4(),
      agencyId,
      fiscalYear,
      goalPercentage,
      totalContractingGoal,
      hubzoneGoalAmount,
      notes,
    ]);
    
    return this.mapGoalRow(result.rows[0]!);
  }

  /**
   * Get fiscal year goal
   */
  async getFiscalYearGoal(
    agencyId: string,
    fiscalYear: number
  ): Promise<FiscalYearGoal | null> {
    const query = `
      SELECT * FROM fiscal_year_goals
      WHERE agency_id = $1 AND fiscal_year = $2
    `;
    
    const result = await db.query(query, [agencyId, fiscalYear]);
    
    if (result.rows.length === 0) return null;
    return this.mapGoalRow(result.rows[0]);
  }

  /**
   * Calculate goal progress for a fiscal year
   */
  async calculateGoalProgress(
    agencyId: string,
    fiscalYear: number
  ): Promise<GoalProgress> {
    // Get the goal
    let goal = await this.getFiscalYearGoal(agencyId, fiscalYear);
    
    // Default goal if not set
    if (!goal) {
      goal = {
        id: '',
        agencyId,
        fiscalYear,
        goalPercentage: 3.0,
        totalContractingGoal: 0,
        hubzoneGoalAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    
    // Get agency name
    const agencyQuery = `SELECT name FROM agencies WHERE id = $1`;
    const agencyResult = await db.query<{ name: string }>(agencyQuery, [agencyId]);
    const agencyName = agencyResult.rows[0]?.name;
    
    // Get contract totals
    const totalsQuery = `
      SELECT
        COUNT(*) as total_contracts,
        COALESCE(SUM(award_value), 0) as total_value,
        COUNT(*) FILTER (WHERE is_hubzone_contractor = true) as hubzone_contracts,
        COALESCE(SUM(award_value) FILTER (WHERE is_hubzone_contractor = true), 0) as hubzone_value
      FROM contracts
      WHERE agency_id = $1 AND fiscal_year = $2
    `;
    
    const totalsResult = await db.query<{
      total_contracts: string;
      total_value: string;
      hubzone_contracts: string;
      hubzone_value: string;
    }>(totalsQuery, [agencyId, fiscalYear]);
    
    const totals = totalsResult.rows[0];
    const totalContracts = parseInt(totals?.total_contracts ?? '0', 10);
    const totalValue = parseFloat(totals?.total_value ?? '0');
    const hubzoneContracts = parseInt(totals?.hubzone_contracts ?? '0', 10);
    const hubzoneValue = parseFloat(totals?.hubzone_value ?? '0');
    
    // Calculate percentages
    const currentPercentage = totalValue > 0 ? (hubzoneValue / totalValue) * 100 : 0;
    const percentageOfGoal = goal.goalPercentage > 0 ? (currentPercentage / goal.goalPercentage) * 100 : 0;
    
    // Calculate amount remaining to reach goal
    const amountRemaining = Math.max(0, goal.hubzoneGoalAmount - hubzoneValue);
    
    // Average HUBZone contract value
    const averageHubzoneContractValue = hubzoneContracts > 0 ? hubzoneValue / hubzoneContracts : 0;
    
    // Contracts needed to meet goal
    const contractsNeeded = averageHubzoneContractValue > 0 
      ? Math.ceil(amountRemaining / averageHubzoneContractValue)
      : 0;
    
    // Get monthly progress
    const monthlyProgress = await this.getMonthlyProgress(agencyId, fiscalYear, goal.goalPercentage);
    
    // Project year end
    const projectedYearEnd = this.projectYearEnd(monthlyProgress, goal.goalPercentage);
    
    // Determine if on track
    const monthsElapsed = this.getMonthsElapsedInFY(fiscalYear);
    const expectedPercentage = (monthsElapsed / 12) * goal.goalPercentage;
    const isOnTrack = currentPercentage >= expectedPercentage * 0.9; // Within 10% of expected
    
    return {
      fiscalYear,
      agencyId,
      agencyName,
      goalPercentage: goal.goalPercentage,
      goalAmount: goal.hubzoneGoalAmount,
      totalContractsAwarded: totalContracts,
      totalContractValue: totalValue,
      hubzoneContractsAwarded: hubzoneContracts,
      hubzoneContractValue: hubzoneValue,
      currentPercentage: Math.round(currentPercentage * 100) / 100,
      percentageOfGoal: Math.round(percentageOfGoal * 100) / 100,
      amountRemaining,
      contractsNeeded,
      averageHubzoneContractValue: Math.round(averageHubzoneContractValue),
      isOnTrack,
      projectedYearEnd: Math.round(projectedYearEnd * 100) / 100,
      monthlyProgress,
    };
  }

  /**
   * Get monthly progress breakdown
   */
  private async getMonthlyProgress(
    agencyId: string,
    fiscalYear: number,
    goalPercentage: number
  ): Promise<MonthlyProgress[]> {
    const query = `
      SELECT
        EXTRACT(MONTH FROM award_date) as month,
        COUNT(*) as total_contracts,
        COALESCE(SUM(award_value), 0) as total_value,
        COUNT(*) FILTER (WHERE is_hubzone_contractor = true) as hubzone_contracts,
        COALESCE(SUM(award_value) FILTER (WHERE is_hubzone_contractor = true), 0) as hubzone_value
      FROM contracts
      WHERE agency_id = $1 AND fiscal_year = $2
      GROUP BY EXTRACT(MONTH FROM award_date)
      ORDER BY month
    `;
    
    const result = await db.query<{
      month: number;
      total_contracts: string;
      total_value: string;
      hubzone_contracts: string;
      hubzone_value: string;
    }>(query, [agencyId, fiscalYear]);
    
    // Map to fiscal year months (Oct-Sep)
    const monthData = new Map<number, {
      totalContracts: number;
      totalValue: number;
      hubzoneContracts: number;
      hubzoneValue: number;
    }>();
    
    for (const row of result.rows) {
      monthData.set(row.month, {
        totalContracts: parseInt(row.total_contracts, 10),
        totalValue: parseFloat(row.total_value),
        hubzoneContracts: parseInt(row.hubzone_contracts, 10),
        hubzoneValue: parseFloat(row.hubzone_value),
      });
    }
    
    // Build cumulative progress
    const progress: MonthlyProgress[] = [];
    let cumulativeTotal = 0;
    let cumulativeHubzone = 0;
    
    // Fiscal year months: Oct(10), Nov(11), Dec(12), Jan(1), Feb(2), ..., Sep(9)
    const fiscalMonths = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    for (let i = 0; i < 12; i++) {
      const month = fiscalMonths[i];
      const data = monthData.get(month) ?? {
        totalContracts: 0,
        totalValue: 0,
        hubzoneContracts: 0,
        hubzoneValue: 0,
      };
      
      cumulativeTotal += data.totalValue;
      cumulativeHubzone += data.hubzoneValue;
      
      const cumulativePercentage = cumulativeTotal > 0 
        ? (cumulativeHubzone / cumulativeTotal) * 100 
        : 0;
      
      // Monthly target (linear progression)
      const monthlyTarget = ((i + 1) / 12) * goalPercentage;
      
      progress.push({
        month,
        monthName: this.MONTH_NAMES[i],
        totalContracts: data.totalContracts,
        totalValue: data.totalValue,
        hubzoneContracts: data.hubzoneContracts,
        hubzoneValue: data.hubzoneValue,
        cumulativePercentage: Math.round(cumulativePercentage * 100) / 100,
        goalPercentage: Math.round(monthlyTarget * 100) / 100,
      });
    }
    
    return progress;
  }

  /**
   * Project year-end percentage based on trend
   */
  private projectYearEnd(
    monthlyProgress: MonthlyProgress[],
    goalPercentage: number
  ): number {
    const dataPoints = monthlyProgress.filter(m => m.totalContracts > 0);
    
    if (dataPoints.length === 0) return 0;
    if (dataPoints.length === 1) return dataPoints[0].cumulativePercentage;
    
    // Simple linear regression
    const n = dataPoints.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    dataPoints.forEach((point, index) => {
      sumX += index;
      sumY += point.cumulativePercentage;
      sumXY += index * point.cumulativePercentage;
      sumXX += index * index;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Project to month 12
    const projected = intercept + slope * 11;
    
    return Math.max(0, Math.min(projected, goalPercentage * 2));
  }

  /**
   * Get contract summary for reporting
   */
  async getContractSummary(
    agencyId: string,
    fiscalYear: number
  ): Promise<ContractSummary> {
    // Overall totals
    const totalsQuery = `
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(award_value), 0) as total_value,
        COUNT(*) FILTER (WHERE is_hubzone_contractor = true) as hubzone_count,
        COALESCE(SUM(award_value) FILTER (WHERE is_hubzone_contractor = true), 0) as hubzone_value
      FROM contracts
      WHERE agency_id = $1 AND fiscal_year = $2
    `;
    
    const totalsResult = await db.query<{
      total_count: string;
      total_value: string;
      hubzone_count: string;
      hubzone_value: string;
    }>(totalsQuery, [agencyId, fiscalYear]);
    
    const totals = totalsResult.rows[0];
    
    // By contract type
    const byTypeQuery = `
      SELECT
        contract_type as type,
        COUNT(*) as count,
        COALESCE(SUM(award_value), 0) as value
      FROM contracts
      WHERE agency_id = $1 AND fiscal_year = $2
      GROUP BY contract_type
    `;
    
    const byTypeResult = await db.query<{
      type: ContractType;
      count: string;
      value: string;
    }>(byTypeQuery, [agencyId, fiscalYear]);
    
    // By quarter
    const byQuarterQuery = `
      SELECT
        fiscal_quarter as quarter,
        COUNT(*) as count,
        COALESCE(SUM(award_value), 0) as value,
        COUNT(*) FILTER (WHERE is_hubzone_contractor = true) as hubzone_count,
        COALESCE(SUM(award_value) FILTER (WHERE is_hubzone_contractor = true), 0) as hubzone_value
      FROM contracts
      WHERE agency_id = $1 AND fiscal_year = $2
      GROUP BY fiscal_quarter
      ORDER BY fiscal_quarter
    `;
    
    const byQuarterResult = await db.query<{
      quarter: number;
      count: string;
      value: string;
      hubzone_count: string;
      hubzone_value: string;
    }>(byQuarterQuery, [agencyId, fiscalYear]);
    
    return {
      totalCount: parseInt(totals?.total_count ?? '0', 10),
      totalValue: parseFloat(totals?.total_value ?? '0'),
      hubzoneCount: parseInt(totals?.hubzone_count ?? '0', 10),
      hubzoneValue: parseFloat(totals?.hubzone_value ?? '0'),
      byContractType: byTypeResult.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count, 10),
        value: parseFloat(row.value),
      })),
      byQuarter: byQuarterResult.rows.map(row => ({
        quarter: row.quarter,
        count: parseInt(row.count, 10),
        value: parseFloat(row.value),
        hubzoneCount: parseInt(row.hubzone_count, 10),
        hubzoneValue: parseFloat(row.hubzone_value),
      })),
    };
  }

  /**
   * Get top HUBZone contractors
   */
  async getTopContractors(
    agencyId: string,
    fiscalYear: number,
    limit: number = 10
  ): Promise<TopContractor[]> {
    const query = `
      SELECT
        contractor_name,
        contractor_uei,
        COUNT(*) as contract_count,
        SUM(award_value) as total_value,
        AVG(award_value) as average_value,
        MAX(award_date) as latest_award_date
      FROM contracts
      WHERE agency_id = $1 
        AND fiscal_year = $2
        AND is_hubzone_contractor = true
      GROUP BY contractor_name, contractor_uei
      ORDER BY total_value DESC
      LIMIT $3
    `;
    
    const result = await db.query<{
      contractor_name: string;
      contractor_uei: string;
      contract_count: string;
      total_value: string;
      average_value: string;
      latest_award_date: Date;
    }>(query, [agencyId, fiscalYear, limit]);
    
    return result.rows.map(row => ({
      contractorName: row.contractor_name,
      contractorUei: row.contractor_uei,
      contractCount: parseInt(row.contract_count, 10),
      totalValue: parseFloat(row.total_value),
      averageValue: parseFloat(row.average_value),
      latestAwardDate: new Date(row.latest_award_date),
    }));
  }

  /**
   * Generate fiscal year report
   */
  async generateFiscalYearReport(
    agencyId: string,
    fiscalYear: number
  ): Promise<FiscalYearReport> {
    const [progress, summary, topContractors] = await Promise.all([
      this.calculateGoalProgress(agencyId, fiscalYear),
      this.getContractSummary(agencyId, fiscalYear),
      this.getTopContractors(agencyId, fiscalYear),
    ]);
    
    // Get previous year data for comparison
    const previousYearProgress = await this.calculateGoalProgress(agencyId, fiscalYear - 1);
    
    // Get agency name
    const agencyQuery = `SELECT name FROM agencies WHERE id = $1`;
    const agencyResult = await db.query<{ name: string }>(agencyQuery, [agencyId]);
    const agencyName = agencyResult.rows[0]?.name ?? 'Unknown Agency';
    
    // Contract type labels
    const contractTypeLabels: Record<ContractType, string> = {
      hubzone_set_aside: 'HUBZone Set-Aside',
      hubzone_sole_source: 'HUBZone Sole Source',
      price_preference: 'Price Preference',
      full_open: 'Full & Open Competition',
      small_business: 'Small Business Set-Aside',
      other: 'Other',
    };
    
    return {
      reportId: uuidv4(),
      generatedAt: new Date(),
      agencyId,
      agencyName,
      fiscalYear,
      progress,
      summary,
      yearOverYear: {
        previousYear: fiscalYear - 1,
        previousYearPercentage: previousYearProgress.currentPercentage,
        previousYearValue: previousYearProgress.hubzoneContractValue,
        percentageChange: progress.currentPercentage - previousYearProgress.currentPercentage,
        valueChange: progress.hubzoneContractValue - previousYearProgress.hubzoneContractValue,
      },
      topContractors,
      byContractType: summary.byContractType.map(item => ({
        type: item.type,
        label: contractTypeLabels[item.type] ?? item.type,
        count: item.count,
        value: item.value,
        percentage: summary.totalValue > 0 ? (item.value / summary.totalValue) * 100 : 0,
      })),
      fpdsExportReady: true,
    };
  }

  /**
   * Validate contract with SAM.gov (simulated)
   */
  async validateWithSam(contractNumber: string): Promise<SamValidationResult> {
    // In production, this would call the actual SAM.gov API
    // For now, we simulate validation
    
    // Check if contract exists in our system
    const query = `SELECT * FROM contracts WHERE contract_number = $1 LIMIT 1`;
    const result = await db.query(query, [contractNumber]);
    
    if (result.rows.length === 0) {
      return {
        isValid: false,
        errors: ['Contract not found in SAM.gov database'],
      };
    }
    
    const contract = this.mapContractRow(result.rows[0]);
    
    return {
      isValid: true,
      samContractId: `SAM-${contract.id.slice(0, 8)}`,
      contractData: {
        contractNumber: contract.contractNumber,
        title: contract.title,
        contractorName: contract.contractorName,
        contractorUei: contract.contractorUei,
        awardDate: contract.awardDate,
        awardValue: contract.awardValue,
      },
    };
  }

  /**
   * Export contracts for FPDS-NG
   */
  async exportForFPDS(
    agencyId: string,
    fiscalYear: number
  ): Promise<string> {
    const { contracts } = await this.getAgencyContracts({
      agencyId,
      fiscalYear,
      limit: 10000, // Get all
    });
    
    // Generate FPDS-NG compatible CSV
    const headers = [
      'Contract Number',
      'Modification Number',
      'Transaction Number',
      'PIID',
      'Award Date',
      'Award Amount',
      'Current Contract Value',
      'Contractor Name',
      'Contractor UEI',
      'CAGE Code',
      'HUBZone Contractor',
      'Contract Type',
      'NAICS Code',
      'PSC',
      'Period of Performance Start',
      'Period of Performance End',
    ];
    
    const rows = contracts.map(c => [
      c.contractNumber,
      '', // Modification number
      '', // Transaction number
      c.contractNumber, // PIID
      c.awardDate.toISOString().split('T')[0],
      c.awardValue.toString(),
      c.currentValue.toString(),
      c.contractorName,
      c.contractorUei,
      c.contractorCageCode ?? '',
      c.isHubzoneContractor ? 'Y' : 'N',
      c.contractType,
      c.naicsCodes[0]?.code ?? '',
      c.psc ?? '',
      c.periodOfPerformanceStart.toISOString().split('T')[0],
      c.periodOfPerformanceEnd.toISOString().split('T')[0],
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }

  /**
   * Delete a contract
   */
  async deleteContract(contractId: string): Promise<boolean> {
    const query = `DELETE FROM contracts WHERE id = $1`;
    const result = await db.query(query, [contractId]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Get fiscal year and quarter from a date
   */
  private getFiscalPeriod(date: Date): { fiscalYear: number; fiscalQuarter: number } {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    // Federal fiscal year starts October 1
    const fiscalYear = month >= 10 ? year + 1 : year;
    
    // Q1: Oct-Dec, Q2: Jan-Mar, Q3: Apr-Jun, Q4: Jul-Sep
    let fiscalQuarter: number;
    if (month >= 10) fiscalQuarter = 1;
    else if (month >= 7) fiscalQuarter = 4;
    else if (month >= 4) fiscalQuarter = 3;
    else fiscalQuarter = 2;
    
    return { fiscalYear, fiscalQuarter };
  }

  /**
   * Get months elapsed in fiscal year
   */
  private getMonthsElapsedInFY(fiscalYear: number): number {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    // FY starts Oct 1 of previous calendar year
    const fyStartYear = fiscalYear - 1;
    
    if (currentYear < fyStartYear || (currentYear === fyStartYear && currentMonth < 10)) {
      return 0; // FY hasn't started
    }
    
    if (currentYear > fiscalYear || (currentYear === fiscalYear && currentMonth >= 10)) {
      return 12; // FY has ended
    }
    
    // Calculate months since Oct 1
    if (currentYear === fyStartYear) {
      return currentMonth - 9; // Oct=1, Nov=2, Dec=3
    } else {
      return currentMonth + 3; // Jan=4, Feb=5, ..., Sep=12
    }
  }

  /**
   * Map database row to Contract
   */
  private mapContractRow(row: Record<string, unknown>): Contract {
    return {
      id: row['id'] as string,
      agencyId: row['agency_id'] as string,
      contractNumber: row['contract_number'] as string,
      title: row['title'] as string,
      description: row['description'] as string | undefined,
      contractorName: row['contractor_name'] as string,
      contractorUei: row['contractor_uei'] as string,
      contractorCageCode: row['contractor_cage_code'] as string | undefined,
      isHubzoneContractor: row['is_hubzone_contractor'] as boolean,
      awardDate: new Date(row['award_date'] as string),
      awardValue: parseFloat(row['award_value'] as string),
      currentValue: parseFloat(row['current_value'] as string),
      obligatedAmount: parseFloat(row['obligated_amount'] as string),
      contractType: row['contract_type'] as ContractType,
      awardType: row['award_type'] as Contract['awardType'],
      naicsCodes: typeof row['naics_codes'] === 'string' 
        ? JSON.parse(row['naics_codes']) 
        : (row['naics_codes'] as Contract['naicsCodes'] ?? []),
      psc: row['psc'] as string | undefined,
      periodOfPerformanceStart: new Date(row['period_of_performance_start'] as string),
      periodOfPerformanceEnd: new Date(row['period_of_performance_end'] as string),
      status: row['status'] as Contract['status'],
      fiscalYear: row['fiscal_year'] as number,
      fiscalQuarter: row['fiscal_quarter'] as number,
      samContractId: row['sam_contract_id'] as string | undefined,
      fpdsReported: row['fpds_reported'] as boolean,
      lastSyncedAt: row['last_synced_at'] ? new Date(row['last_synced_at'] as string) : undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
      createdBy: row['created_by'] as string | undefined,
    };
  }

  /**
   * Map database row to FiscalYearGoal
   */
  private mapGoalRow(row: Record<string, unknown>): FiscalYearGoal {
    return {
      id: row['id'] as string,
      agencyId: row['agency_id'] as string,
      fiscalYear: row['fiscal_year'] as number,
      goalPercentage: parseFloat(row['goal_percentage'] as string),
      totalContractingGoal: parseFloat(row['total_contracting_goal'] as string),
      hubzoneGoalAmount: parseFloat(row['hubzone_goal_amount'] as string),
      notes: row['notes'] as string | undefined,
      createdAt: new Date(row['created_at'] as string),
      updatedAt: new Date(row['updated_at'] as string),
    };
  }
}

// Export singleton instance
export const contractService = new ContractService();

