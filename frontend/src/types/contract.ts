/**
 * Contract and Goal Tracking Types (Frontend)
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
  contractNumber: string;
  title: string;
  description?: string;
  contractorName: string;
  contractorUei: string;
  contractorCageCode?: string;
  isHubzoneContractor: boolean;
  awardDate: string;
  awardValue: number;
  currentValue: number;
  obligatedAmount: number;
  contractType: ContractType;
  awardType: AwardType;
  naicsCodes: ContractNAICS[];
  psc?: string;
  periodOfPerformanceStart: string;
  periodOfPerformanceEnd: string;
  status: ContractStatus;
  fiscalYear: number;
  fiscalQuarter: number;
  samContractId?: string;
  fpdsReported: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  awardDate: string;
  awardValue: number;
  contractType: ContractType;
  awardType: AwardType;
  naicsCodes?: ContractNAICS[];
  psc?: string;
  periodOfPerformanceStart: string;
  periodOfPerformanceEnd: string;
  status?: ContractStatus;
}

/**
 * Fiscal year goal
 */
export interface FiscalYearGoal {
  id: string;
  agencyId: string;
  fiscalYear: number;
  goalPercentage: number;
  totalContractingGoal: number;
  hubzoneGoalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Goal progress tracking
 */
export interface GoalProgress {
  fiscalYear: number;
  agencyId: string;
  agencyName?: string;
  goalPercentage: number;
  goalAmount: number;
  totalContractsAwarded: number;
  totalContractValue: number;
  hubzoneContractsAwarded: number;
  hubzoneContractValue: number;
  currentPercentage: number;
  percentageOfGoal: number;
  amountRemaining: number;
  contractsNeeded: number;
  averageHubzoneContractValue: number;
  isOnTrack: boolean;
  projectedYearEnd: number;
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
  goalPercentage: number;
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
  latestAwardDate: string;
}

/**
 * Fiscal year report
 */
export interface FiscalYearReport {
  reportId: string;
  generatedAt: string;
  agencyId: string;
  agencyName: string;
  fiscalYear: number;
  progress: GoalProgress;
  summary: ContractSummary;
  yearOverYear: {
    previousYear: number;
    previousYearPercentage: number;
    previousYearValue: number;
    percentageChange: number;
    valueChange: number;
  };
  topContractors: TopContractor[];
  byContractType: {
    type: ContractType;
    label: string;
    count: number;
    value: number;
    percentage: number;
  }[];
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
  startDate?: string;
  endDate?: string;
  minValue?: number;
  maxValue?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'awardDate' | 'awardValue' | 'contractorName' | 'contractNumber';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Contract type display labels
 */
export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  hubzone_set_aside: 'HUBZone Set-Aside',
  hubzone_sole_source: 'HUBZone Sole Source',
  price_preference: 'Price Preference',
  full_open: 'Full & Open Competition',
  small_business: 'Small Business Set-Aside',
  other: 'Other',
};

/**
 * Award type display labels
 */
export const AWARD_TYPE_LABELS: Record<AwardType, string> = {
  firm_fixed_price: 'Firm Fixed Price',
  cost_reimbursement: 'Cost Reimbursement',
  time_materials: 'Time & Materials',
  labor_hour: 'Labor Hour',
  indefinite_delivery: 'Indefinite Delivery',
  other: 'Other',
};

/**
 * Contract status display labels
 */
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  terminated: 'Terminated',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

