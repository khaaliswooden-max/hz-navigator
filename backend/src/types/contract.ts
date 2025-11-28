/**
 * Contract and Goal Tracking Types
 * 
 * Types for agency HUBZone contracting goals and contract management
 */

/**
 * Contract status
 */
export type ContractStatus = 
  | 'active'
  | 'completed'
  | 'terminated'
  | 'pending'
  | 'cancelled';

/**
 * Contract type for HUBZone set-aside
 */
export type ContractType = 
  | 'hubzone_set_aside'
  | 'hubzone_sole_source'
  | 'price_preference'
  | 'full_open'
  | 'small_business'
  | 'other';

/**
 * Contract award type
 */
export type AwardType = 
  | 'firm_fixed_price'
  | 'cost_reimbursement'
  | 'time_materials'
  | 'labor_hour'
  | 'indefinite_delivery'
  | 'other';

/**
 * NAICS code for contract
 */
export interface ContractNAICS {
  code: string;
  title: string;
  isPrimary: boolean;
}

/**
 * Contract entity
 */
export interface Contract {
  id: string;
  agencyId: string;
  
  // Contract identification
  contractNumber: string;
  title: string;
  description?: string;
  
  // Contractor info
  contractorName: string;
  contractorUei: string;
  contractorCageCode?: string;
  isHubzoneContractor: boolean;
  
  // Award details
  awardDate: Date;
  awardValue: number;
  currentValue: number;
  obligatedAmount: number;
  
  // Contract classification
  contractType: ContractType;
  awardType: AwardType;
  naicsCodes: ContractNAICS[];
  psc?: string; // Product Service Code
  
  // Performance
  periodOfPerformanceStart: Date;
  periodOfPerformanceEnd: Date;
  
  // Status
  status: ContractStatus;
  
  // Fiscal year
  fiscalYear: number;
  fiscalQuarter: number;
  
  // SAM.gov integration
  samContractId?: string;
  fpdsReported: boolean;
  lastSyncedAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Contract creation data
 */
export interface CreateContractData {
  contractNumber: string;
  title: string;
  description?: string;
  contractorName: string;
  contractorUei: string;
  contractorCageCode?: string;
  isHubzoneContractor: boolean;
  awardDate: Date;
  awardValue: number;
  contractType: ContractType;
  awardType: AwardType;
  naicsCodes: ContractNAICS[];
  psc?: string;
  periodOfPerformanceStart: Date;
  periodOfPerformanceEnd: Date;
  status?: ContractStatus;
}

/**
 * Contract update data
 */
export interface UpdateContractData {
  title?: string;
  description?: string;
  currentValue?: number;
  obligatedAmount?: number;
  status?: ContractStatus;
  periodOfPerformanceEnd?: Date;
}

/**
 * Fiscal year goal
 */
export interface FiscalYearGoal {
  id: string;
  agencyId: string;
  fiscalYear: number;
  goalPercentage: number;
  totalContractingGoal: number; // Total expected contracting dollars
  hubzoneGoalAmount: number; // Calculated from percentage
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Goal progress tracking
 */
export interface GoalProgress {
  fiscalYear: number;
  agencyId: string;
  agencyName?: string;
  
  // Goal
  goalPercentage: number;
  goalAmount: number;
  
  // Actuals
  totalContractsAwarded: number;
  totalContractValue: number;
  hubzoneContractsAwarded: number;
  hubzoneContractValue: number;
  
  // Calculated
  currentPercentage: number;
  percentageOfGoal: number;
  amountRemaining: number;
  contractsNeeded: number;
  averageHubzoneContractValue: number;
  
  // Status
  isOnTrack: boolean;
  projectedYearEnd: number;
  
  // Monthly breakdown
  monthlyProgress: MonthlyProgress[];
}

/**
 * Monthly progress data
 */
export interface MonthlyProgress {
  month: number;
  monthName: string;
  totalContracts: number;
  totalValue: number;
  hubzoneContracts: number;
  hubzoneValue: number;
  cumulativePercentage: number;
  goalPercentage: number; // Monthly target
}

/**
 * Contract summary for reporting
 */
export interface ContractSummary {
  totalCount: number;
  totalValue: number;
  hubzoneCount: number;
  hubzoneValue: number;
  byContractType: {
    type: ContractType;
    count: number;
    value: number;
  }[];
  byQuarter: {
    quarter: number;
    count: number;
    value: number;
    hubzoneCount: number;
    hubzoneValue: number;
  }[];
}

/**
 * Top HUBZone contractor
 */
export interface TopContractor {
  contractorName: string;
  contractorUei: string;
  contractCount: number;
  totalValue: number;
  averageValue: number;
  latestAwardDate: Date;
}

/**
 * Fiscal year report
 */
export interface FiscalYearReport {
  reportId: string;
  generatedAt: Date;
  agencyId: string;
  agencyName: string;
  fiscalYear: number;
  
  // Goal progress
  progress: GoalProgress;
  
  // Contract summary
  summary: ContractSummary;
  
  // Year over year comparison
  yearOverYear: {
    previousYear: number;
    previousYearPercentage: number;
    previousYearValue: number;
    percentageChange: number;
    valueChange: number;
  };
  
  // Top contractors
  topContractors: TopContractor[];
  
  // Breakdown by type
  byContractType: {
    type: ContractType;
    label: string;
    count: number;
    value: number;
    percentage: number;
  }[];
  
  // FPDS-NG export data
  fpdsExportReady: boolean;
}

/**
 * Contract filters
 */
export interface ContractFilters {
  agencyId?: string;
  fiscalYear?: number;
  fiscalQuarter?: number;
  status?: ContractStatus;
  contractType?: ContractType;
  isHubzoneContractor?: boolean;
  contractorUei?: string;
  startDate?: Date;
  endDate?: Date;
  minValue?: number;
  maxValue?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'awardDate' | 'awardValue' | 'contractorName' | 'contractNumber';
  sortOrder?: 'asc' | 'desc';
}

/**
 * SAM.gov contract validation result
 */
export interface SamValidationResult {
  isValid: boolean;
  samContractId?: string;
  contractData?: {
    contractNumber: string;
    title: string;
    contractorName: string;
    contractorUei: string;
    awardDate: Date;
    awardValue: number;
  };
  errors?: string[];
}

