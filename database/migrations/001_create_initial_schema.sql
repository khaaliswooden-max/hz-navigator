-- Migration: Create initial schema for HZ Navigator
-- Created: 2024-01-01

-- Up Migration
-- ============

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'reviewer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    duns_number VARCHAR(13),
    ein VARCHAR(10),
    primary_address JSONB NOT NULL,
    principal_office_address JSONB,
    website VARCHAR(255),
    phone VARCHAR(20),
    naics_codes VARCHAR(10)[] DEFAULT ARRAY[]::VARCHAR[],
    employee_count INTEGER,
    annual_revenue DECIMAL(15,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_businesses_duns ON businesses(duns_number);
CREATE INDEX idx_businesses_name ON businesses USING gin(name gin_trgm_ops);

-- HUBZones table with PostGIS geometry
CREATE TABLE IF NOT EXISTS hubzones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    zone_type VARCHAR(50) NOT NULL CHECK (zone_type IN (
        'qualified_census_tract',
        'qualified_non_metro_county',
        'indian_lands',
        'base_closure_area',
        'governor_designated',
        'redesignated'
    )),
    state CHAR(2) NOT NULL,
    county VARCHAR(100),
    fips_code VARCHAR(15),
    designation_date DATE NOT NULL,
    expiration_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending', 'redesignated')),
    geometry GEOMETRY(MultiPolygon, 4326) NOT NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_hubzones_state ON hubzones(state);
CREATE INDEX idx_hubzones_zone_type ON hubzones(zone_type);
CREATE INDEX idx_hubzones_status ON hubzones(status);
CREATE INDEX idx_hubzones_geometry ON hubzones USING GIST(geometry);
CREATE INDEX idx_hubzones_name ON hubzones USING gin(name gin_trgm_ops);

-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    application_number VARCHAR(20) UNIQUE NOT NULL,
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'under_review', 'approved', 'denied', 'expired', 'withdrawn'
    )),
    hubzone_id UUID REFERENCES hubzones(id),
    primary_address JSONB NOT NULL,
    employee_count INTEGER NOT NULL,
    hubzone_employees_count INTEGER NOT NULL,
    hubzone_employees_percentage DECIMAL(5,2) NOT NULL,
    principal_office_in_hubzone BOOLEAN NOT NULL DEFAULT false,
    reviewer_id UUID REFERENCES users(id),
    review_started_at TIMESTAMPTZ,
    review_completed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    expires_at DATE,
    denial_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_certifications_business_id ON certifications(business_id);
CREATE INDEX idx_certifications_status ON certifications(status);
CREATE INDEX idx_certifications_reviewer ON certifications(reviewer_id);
CREATE INDEX idx_certifications_application_number ON certifications(application_number);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_certification_id ON documents(certification_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Update trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_hubzones_updated_at
    BEFORE UPDATE ON hubzones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_certifications_updated_at
    BEFORE UPDATE ON certifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Down Migration
-- ==============
-- DROP TRIGGER IF EXISTS update_certifications_updated_at ON certifications;
-- DROP TRIGGER IF EXISTS update_hubzones_updated_at ON hubzones;
-- DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
-- DROP TRIGGER IF EXISTS update_users_updated_at ON users;
-- DROP FUNCTION IF EXISTS update_updated_at();
-- DROP TABLE IF EXISTS audit_logs;
-- DROP TABLE IF EXISTS documents;
-- DROP TABLE IF EXISTS certifications;
-- DROP TABLE IF EXISTS hubzones;
-- DROP TABLE IF EXISTS businesses;
-- DROP TABLE IF EXISTS users;

