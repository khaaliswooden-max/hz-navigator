-- Migration: Create verification history tables
-- Description: Tables for storing agency contractor verification history and audit trail

-- Create agencies table if not exists
CREATE TABLE IF NOT EXISTS agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    type VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verification history table
CREATE TABLE IF NOT EXISTS verification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
    business_id VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    uei_number VARCHAR(12) NOT NULL,
    verification_status VARCHAR(50) NOT NULL,
    compliance_score INTEGER NOT NULL DEFAULT 0,
    risk_level VARCHAR(20) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_by VARCHAR(255),
    method VARCHAR(20) NOT NULL DEFAULT 'single',
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bulk verification jobs table
CREATE TABLE IF NOT EXISTS bulk_verification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
    requested_by VARCHAR(255),
    total_requested INTEGER NOT NULL DEFAULT 0,
    processed INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'processing',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    summary JSONB,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verification reports table (for generated PDF reports)
CREATE TABLE IF NOT EXISTS verification_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id VARCHAR(100) UNIQUE NOT NULL,
    agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
    business_id UUID,
    business_name VARCHAR(255) NOT NULL,
    uei_number VARCHAR(12) NOT NULL,
    verification_status VARCHAR(50) NOT NULL,
    compliance_score INTEGER NOT NULL DEFAULT 0,
    risk_level VARCHAR(20) NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    generated_by VARCHAR(255),
    report_data JSONB,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add certification_number column to certifications if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'certifications' AND column_name = 'certification_number'
    ) THEN
        ALTER TABLE certifications ADD COLUMN certification_number VARCHAR(50);
    END IF;
END $$;

-- Create indexes for verification_history
CREATE INDEX IF NOT EXISTS idx_verification_history_agency ON verification_history(agency_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_business ON verification_history(business_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_uei ON verification_history(uei_number);
CREATE INDEX IF NOT EXISTS idx_verification_history_status ON verification_history(verification_status);
CREATE INDEX IF NOT EXISTS idx_verification_history_date ON verification_history(verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_history_risk ON verification_history(risk_level);

-- Create indexes for bulk_verification_jobs
CREATE INDEX IF NOT EXISTS idx_bulk_jobs_agency ON bulk_verification_jobs(agency_id);
CREATE INDEX IF NOT EXISTS idx_bulk_jobs_status ON bulk_verification_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_jobs_date ON bulk_verification_jobs(started_at DESC);

-- Create indexes for verification_reports
CREATE INDEX IF NOT EXISTS idx_reports_report_id ON verification_reports(report_id);
CREATE INDEX IF NOT EXISTS idx_reports_agency ON verification_reports(agency_id);
CREATE INDEX IF NOT EXISTS idx_reports_uei ON verification_reports(uei_number);
CREATE INDEX IF NOT EXISTS idx_reports_valid ON verification_reports(valid_until);

-- Insert some sample agencies
INSERT INTO agencies (id, name, code, type, is_active) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Small Business Administration', 'SBA', 'Federal', true),
    ('a1000000-0000-0000-0000-000000000002', 'General Services Administration', 'GSA', 'Federal', true),
    ('a1000000-0000-0000-0000-000000000003', 'Department of Defense', 'DOD', 'Federal', true),
    ('a1000000-0000-0000-0000-000000000004', 'Department of Veterans Affairs', 'VA', 'Federal', true),
    ('a1000000-0000-0000-0000-000000000005', 'Department of Health and Human Services', 'HHS', 'Federal', true)
ON CONFLICT (code) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE verification_history IS 'Audit trail of all contractor verifications performed by agencies';
COMMENT ON TABLE bulk_verification_jobs IS 'Tracking for bulk verification batch jobs';
COMMENT ON TABLE verification_reports IS 'Generated verification report certificates';
COMMENT ON TABLE agencies IS 'Government agencies using the verification system';

