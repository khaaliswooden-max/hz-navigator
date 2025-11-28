-- Migration: Security Enhancements
-- Created: 2024-11-28
-- Description: Adds Row-Level Security, enhanced audit logging, and security tables

-- Up Migration
-- ============

-- ===== 1. Enhanced Audit Logs Table =====

-- Add new columns to audit_logs if they don't exist
DO $$ 
BEGIN
  -- Add session_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'session_id') THEN
    ALTER TABLE audit_logs ADD COLUMN session_id UUID;
  END IF;

  -- Add description column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'description') THEN
    ALTER TABLE audit_logs ADD COLUMN description TEXT;
  END IF;

  -- Add metadata column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
    ALTER TABLE audit_logs ADD COLUMN metadata JSONB;
  END IF;

  -- Add request_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'request_id') THEN
    ALTER TABLE audit_logs ADD COLUMN request_id VARCHAR(100);
  END IF;

  -- Add request_method column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'request_method') THEN
    ALTER TABLE audit_logs ADD COLUMN request_method VARCHAR(10);
  END IF;

  -- Add request_path column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'request_path') THEN
    ALTER TABLE audit_logs ADD COLUMN request_path VARCHAR(500);
  END IF;

  -- Add response_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'response_status') THEN
    ALTER TABLE audit_logs ADD COLUMN response_status INTEGER;
  END IF;

  -- Add severity column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'severity') THEN
    ALTER TABLE audit_logs ADD COLUMN severity VARCHAR(20) DEFAULT 'medium';
  END IF;
END $$;

-- Create index on severity for quick filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs(request_id);

-- ===== 2. Failed Login Attempts Table =====

CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT,
  reason VARCHAR(100),
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_logins_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_logins_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_logins_time ON failed_login_attempts(attempted_at);

-- ===== 3. Security Events Table =====

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  user_id UUID REFERENCES users(id),
  ip_address INET,
  description TEXT NOT NULL,
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

-- ===== 4. API Keys Table (for external integrations) =====

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(10) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  rate_limit INTEGER DEFAULT 100,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);

-- ===== 5. Session Management Table =====

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- ===== 6. Row-Level Security (RLS) Policies =====

-- Enable RLS on sensitive tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create application role for RLS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hz_app_user') THEN
    CREATE ROLE hz_app_user;
  END IF;
END $$;

-- Businesses: Users can only see their own businesses
DROP POLICY IF EXISTS businesses_isolation ON businesses;
CREATE POLICY businesses_isolation ON businesses
  FOR ALL
  USING (
    user_id = current_setting('app.current_user_id', true)::UUID
    OR current_setting('app.current_user_role', true) IN ('admin', 'reviewer')
  );

-- Certifications: Users can only see certifications for their businesses
DROP POLICY IF EXISTS certifications_isolation ON certifications;
CREATE POLICY certifications_isolation ON certifications
  FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses 
      WHERE user_id = current_setting('app.current_user_id', true)::UUID
    )
    OR current_setting('app.current_user_role', true) IN ('admin', 'reviewer')
  );

-- Documents: Users can only see documents for their certifications
DROP POLICY IF EXISTS documents_isolation ON documents;
CREATE POLICY documents_isolation ON documents
  FOR ALL
  USING (
    certification_id IN (
      SELECT c.id FROM certifications c
      JOIN businesses b ON c.business_id = b.id
      WHERE b.user_id = current_setting('app.current_user_id', true)::UUID
    )
    OR uploaded_by = current_setting('app.current_user_id', true)::UUID
    OR current_setting('app.current_user_role', true) IN ('admin', 'reviewer')
  );

-- ===== 7. Encrypted Fields Tracking =====

CREATE TABLE IF NOT EXISTS encrypted_field_registry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  column_name VARCHAR(100) NOT NULL,
  encryption_version INTEGER NOT NULL DEFAULT 1,
  last_rotated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(table_name, column_name)
);

-- Register encrypted fields
INSERT INTO encrypted_field_registry (table_name, column_name, encryption_version)
VALUES 
  ('businesses', 'ein', 1),
  ('users', 'ssn', 1)
ON CONFLICT (table_name, column_name) DO NOTHING;

-- ===== 8. Secrets Rotation Tracking =====

CREATE TABLE IF NOT EXISTS secret_rotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  secret_name VARCHAR(100) NOT NULL,
  rotated_by UUID REFERENCES users(id),
  rotation_reason VARCHAR(255),
  previous_version INTEGER,
  new_version INTEGER NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secret_rotations_name ON secret_rotations(secret_name);
CREATE INDEX IF NOT EXISTS idx_secret_rotations_time ON secret_rotations(rotated_at);

-- ===== 9. Audit Log Cleanup Function =====

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO audit_logs (action, entity_type, metadata, created_at)
  VALUES (
    'ADMIN_SYSTEM_MODIFIED',
    'system',
    jsonb_build_object(
      'operation', 'audit_log_cleanup',
      'deleted_count', deleted_count,
      'retention_days', retention_days
    ),
    NOW()
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===== 10. Function to Set RLS Context =====

CREATE OR REPLACE FUNCTION set_rls_context(user_id UUID, user_role VARCHAR)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, true);
  PERFORM set_config('app.current_user_role', user_role, true);
END;
$$ LANGUAGE plpgsql;

-- ===== 11. Failed Login Cleanup (keep last 30 days) =====

CREATE OR REPLACE FUNCTION cleanup_failed_logins()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM failed_login_attempts
  WHERE attempted_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===== 12. Session Cleanup Function =====

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  UPDATE user_sessions
  SET is_active = false
  WHERE expires_at < NOW() AND is_active = true;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===== 13. Grant Permissions to Application Role =====

GRANT SELECT, INSERT, UPDATE, DELETE ON businesses TO hz_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON certifications TO hz_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO hz_app_user;
GRANT SELECT ON hubzones TO hz_app_user;
GRANT SELECT, INSERT ON audit_logs TO hz_app_user;
GRANT SELECT, INSERT ON failed_login_attempts TO hz_app_user;
GRANT SELECT, INSERT, UPDATE ON user_sessions TO hz_app_user;

-- Down Migration (commented out for safety)
-- =====================================
-- DROP FUNCTION IF EXISTS cleanup_expired_sessions();
-- DROP FUNCTION IF EXISTS cleanup_failed_logins();
-- DROP FUNCTION IF EXISTS set_rls_context(UUID, VARCHAR);
-- DROP FUNCTION IF EXISTS cleanup_old_audit_logs(INTEGER);
-- DROP TABLE IF EXISTS secret_rotations;
-- DROP TABLE IF EXISTS encrypted_field_registry;
-- DROP TABLE IF EXISTS user_sessions;
-- DROP TABLE IF EXISTS api_keys;
-- DROP TABLE IF EXISTS security_events;
-- DROP TABLE IF EXISTS failed_login_attempts;
-- DROP POLICY IF EXISTS documents_isolation ON documents;
-- DROP POLICY IF EXISTS certifications_isolation ON certifications;
-- DROP POLICY IF EXISTS businesses_isolation ON businesses;
-- ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE certifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
-- DROP ROLE IF EXISTS hz_app_user;

