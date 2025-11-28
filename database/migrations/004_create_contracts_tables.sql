-- Migration: Create contracts and fiscal year goals tables
-- Description: Tables for tracking HUBZone contracting goals and contracts

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    
    -- Contract identification
    contract_number VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    
    -- Contractor info
    contractor_name VARCHAR(255) NOT NULL,
    contractor_uei VARCHAR(12) NOT NULL,
    contractor_cage_code VARCHAR(5),
    is_hubzone_contractor BOOLEAN DEFAULT false,
    
    -- Award details
    award_date DATE NOT NULL,
    award_value DECIMAL(18, 2) NOT NULL,
    current_value DECIMAL(18, 2) NOT NULL,
    obligated_amount DECIMAL(18, 2) NOT NULL,
    
    -- Contract classification
    contract_type VARCHAR(50) NOT NULL,
    award_type VARCHAR(50) NOT NULL,
    naics_codes JSONB DEFAULT '[]',
    psc VARCHAR(10),
    
    -- Performance
    period_of_performance_start DATE NOT NULL,
    period_of_performance_end DATE NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active',
    
    -- Fiscal year
    fiscal_year INTEGER NOT NULL,
    fiscal_quarter INTEGER NOT NULL,
    
    -- SAM.gov integration
    sam_contract_id VARCHAR(100),
    fpds_reported BOOLEAN DEFAULT false,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    
    -- Constraints
    CONSTRAINT valid_fiscal_quarter CHECK (fiscal_quarter BETWEEN 1 AND 4),
    CONSTRAINT valid_values CHECK (award_value >= 0 AND current_value >= 0 AND obligated_amount >= 0)
);

-- Create fiscal year goals table
CREATE TABLE IF NOT EXISTS fiscal_year_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    goal_percentage DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
    total_contracting_goal DECIMAL(18, 2) NOT NULL DEFAULT 0,
    hubzone_goal_amount DECIMAL(18, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint for agency + fiscal year
    CONSTRAINT unique_agency_fiscal_year UNIQUE (agency_id, fiscal_year),
    CONSTRAINT valid_goal_percentage CHECK (goal_percentage >= 0 AND goal_percentage <= 100)
);

-- Create indexes for contracts
CREATE INDEX IF NOT EXISTS idx_contracts_agency ON contracts(agency_id);
CREATE INDEX IF NOT EXISTS idx_contracts_fiscal_year ON contracts(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_contracts_fiscal_quarter ON contracts(fiscal_quarter);
CREATE INDEX IF NOT EXISTS idx_contracts_contractor_uei ON contracts(contractor_uei);
CREATE INDEX IF NOT EXISTS idx_contracts_hubzone ON contracts(is_hubzone_contractor);
CREATE INDEX IF NOT EXISTS idx_contracts_award_date ON contracts(award_date);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(contract_number);

-- Create indexes for fiscal year goals
CREATE INDEX IF NOT EXISTS idx_goals_agency ON fiscal_year_goals(agency_id);
CREATE INDEX IF NOT EXISTS idx_goals_fiscal_year ON fiscal_year_goals(fiscal_year);

-- Add sample data for testing
-- Insert sample fiscal year goals for existing agencies
INSERT INTO fiscal_year_goals (id, agency_id, fiscal_year, goal_percentage, total_contracting_goal, hubzone_goal_amount, notes)
SELECT 
    gen_random_uuid(),
    id,
    2025,
    3.0,
    50000000,
    1500000,
    'FY2025 HUBZone contracting goal'
FROM agencies
WHERE is_active = true
ON CONFLICT (agency_id, fiscal_year) DO NOTHING;

-- Insert sample contracts
INSERT INTO contracts (
    id, agency_id, contract_number, title, contractor_name, contractor_uei,
    is_hubzone_contractor, award_date, award_value, current_value, obligated_amount,
    contract_type, award_type, fiscal_year, fiscal_quarter,
    period_of_performance_start, period_of_performance_end, status
)
SELECT
    gen_random_uuid(),
    a.id,
    'W912HQ-25-C-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
    CASE (ROW_NUMBER() OVER()) % 5
        WHEN 0 THEN 'IT Infrastructure Modernization'
        WHEN 1 THEN 'Professional Services Support'
        WHEN 2 THEN 'Facilities Management'
        WHEN 3 THEN 'Software Development Services'
        ELSE 'Construction Services'
    END,
    CASE (ROW_NUMBER() OVER()) % 4
        WHEN 0 THEN 'Federal IT Partners LLC'
        WHEN 1 THEN 'Capitol Construction Inc'
        WHEN 2 THEN 'Metro Services Group'
        ELSE 'Tech Solutions Corp'
    END,
    CASE (ROW_NUMBER() OVER()) % 4
        WHEN 0 THEN 'ABC123456789'
        WHEN 1 THEN 'DEF234567890'
        WHEN 2 THEN 'GHI345678901'
        ELSE 'JKL456789012'
    END,
    (ROW_NUMBER() OVER()) % 3 = 0, -- Every 3rd contract is HUBZone
    DATE '2024-10-01' + ((ROW_NUMBER() OVER()) * 5)::integer,
    (500000 + (RANDOM() * 2000000))::decimal(18,2),
    (500000 + (RANDOM() * 2000000))::decimal(18,2),
    (500000 + (RANDOM() * 2000000))::decimal(18,2),
    CASE (ROW_NUMBER() OVER()) % 3
        WHEN 0 THEN 'hubzone_set_aside'
        WHEN 1 THEN 'full_open'
        ELSE 'small_business'
    END,
    'firm_fixed_price',
    2025,
    CASE 
        WHEN (ROW_NUMBER() OVER()) <= 5 THEN 1
        WHEN (ROW_NUMBER() OVER()) <= 10 THEN 2
        ELSE 1
    END,
    DATE '2024-10-01' + ((ROW_NUMBER() OVER()) * 5)::integer,
    DATE '2025-09-30',
    'active'
FROM agencies a
CROSS JOIN generate_series(1, 3) s
WHERE a.is_active = true
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE contracts IS 'Agency contracts for HUBZone goal tracking';
COMMENT ON TABLE fiscal_year_goals IS 'Fiscal year HUBZone contracting goals by agency';
COMMENT ON COLUMN contracts.contract_type IS 'hubzone_set_aside, hubzone_sole_source, price_preference, full_open, small_business, other';
COMMENT ON COLUMN contracts.award_type IS 'firm_fixed_price, cost_reimbursement, time_materials, labor_hour, indefinite_delivery, other';
COMMENT ON COLUMN contracts.fiscal_year IS 'Federal fiscal year (Oct 1 - Sep 30)';
COMMENT ON COLUMN contracts.fiscal_quarter IS '1=Oct-Dec, 2=Jan-Mar, 3=Apr-Jun, 4=Jul-Sep';

