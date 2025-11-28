-- Migration: Performance Optimization
-- Created: 2024-11-28
-- Description: Adds performance indexes, materialized views, and query optimizations

-- Up Migration
-- ============

-- ===== 1. Additional Indexes for Common Queries =====

-- Businesses: Composite index for listing with filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_user_status 
  ON businesses(user_id, created_at DESC);

-- Businesses: Full-text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_businesses_name_search 
  ON businesses USING gin(to_tsvector('english', name));

-- Certifications: Composite index for status and expiration queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certifications_status_expiry 
  ON certifications(status, expires_at) 
  WHERE status IN ('approved', 'pending', 'under_review');

-- Certifications: Index for compliance monitoring queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certifications_business_status 
  ON certifications(business_id, status, created_at DESC);

-- HUBZones: Improved spatial index with clustering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hubzones_status_geometry 
  ON hubzones(status) WHERE status = 'active';

-- Cluster hubzones by geometry for better spatial query performance
-- Note: Run during maintenance window as it locks the table
-- CLUSTER hubzones USING idx_hubzones_geometry;

-- Documents: Index for category and user queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_category_user 
  ON documents(certification_id, document_type, created_at DESC);

-- Audit logs: Partition-ready index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_date_action 
  ON audit_logs(created_at DESC, action);

-- Employees (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_business_resident 
      ON employees(business_id, is_hubzone_resident)';
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_address_verification 
      ON employees(business_id, address_verified_at DESC)';
  END IF;
END $$;


-- ===== 2. Materialized Views for Complex Queries =====

-- Compliance summary materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_compliance_summary AS
SELECT 
  b.id as business_id,
  b.name as business_name,
  b.user_id,
  c.id as certification_id,
  c.status as certification_status,
  c.expires_at as certification_expires_at,
  c.hubzone_employees_percentage,
  c.principal_office_in_hubzone,
  c.employee_count,
  c.hubzone_employees_count,
  CASE 
    WHEN c.status = 'approved' AND c.expires_at > NOW() THEN true 
    ELSE false 
  END as is_active_certified,
  CASE 
    WHEN c.hubzone_employees_percentage >= 35 THEN true 
    ELSE false 
  END as meets_residency_requirement,
  CASE 
    WHEN c.expires_at IS NOT NULL THEN 
      EXTRACT(DAY FROM c.expires_at - NOW())
    ELSE NULL 
  END as days_until_expiration,
  NOW() as last_updated
FROM businesses b
LEFT JOIN LATERAL (
  SELECT * FROM certifications 
  WHERE business_id = b.id 
  ORDER BY created_at DESC 
  LIMIT 1
) c ON true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_compliance_summary_business 
  ON mv_compliance_summary(business_id);
CREATE INDEX IF NOT EXISTS idx_mv_compliance_summary_user 
  ON mv_compliance_summary(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_compliance_summary_status 
  ON mv_compliance_summary(certification_status);


-- HUBZone statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hubzone_stats AS
SELECT 
  state,
  zone_type,
  status,
  COUNT(*) as zone_count,
  NOW() as last_updated
FROM hubzones
GROUP BY state, zone_type, status;

CREATE INDEX IF NOT EXISTS idx_mv_hubzone_stats_state 
  ON mv_hubzone_stats(state);


-- Dashboard statistics materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_stats AS
SELECT 
  'global' as scope,
  COUNT(DISTINCT b.id) as total_businesses,
  COUNT(DISTINCT CASE WHEN c.status = 'approved' AND c.expires_at > NOW() THEN b.id END) as active_certifications,
  COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN b.id END) as pending_applications,
  COUNT(DISTINCT CASE WHEN c.status = 'approved' AND c.expires_at <= NOW() + INTERVAL '90 days' THEN b.id END) as expiring_soon,
  AVG(CASE WHEN c.hubzone_employees_percentage IS NOT NULL THEN c.hubzone_employees_percentage END) as avg_residency_percentage,
  NOW() as last_updated
FROM businesses b
LEFT JOIN certifications c ON c.business_id = b.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_stats_scope 
  ON mv_dashboard_stats(scope);


-- ===== 3. Function to Refresh Materialized Views =====

CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_compliance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_hubzone_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
  
  -- Log refresh
  INSERT INTO audit_logs (action, entity_type, metadata, created_at)
  VALUES (
    'ADMIN_SYSTEM_MODIFIED',
    'system',
    jsonb_build_object('operation', 'refresh_materialized_views'),
    NOW()
  );
END;
$$ LANGUAGE plpgsql;


-- ===== 4. Optimized Query Functions =====

-- Fast HUBZone location check using index
CREATE OR REPLACE FUNCTION check_hubzone_location(
  p_longitude DOUBLE PRECISION,
  p_latitude DOUBLE PRECISION
) RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  zone_type VARCHAR(50),
  state CHAR(2),
  county VARCHAR(100),
  status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.id,
    h.name,
    h.zone_type,
    h.state,
    h.county,
    h.status
  FROM hubzones h
  WHERE h.status = 'active'
    AND ST_Contains(
      h.geometry, 
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
    );
END;
$$ LANGUAGE plpgsql STABLE;


-- Efficient compliance check function
CREATE OR REPLACE FUNCTION get_business_compliance(p_business_id UUID)
RETURNS TABLE (
  business_name VARCHAR(255),
  certification_status VARCHAR(20),
  hubzone_employees_percentage NUMERIC,
  days_until_expiration INTEGER,
  is_compliant BOOLEAN,
  risk_level VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mv.business_name,
    mv.certification_status,
    mv.hubzone_employees_percentage,
    mv.days_until_expiration::INTEGER,
    (mv.is_active_certified AND mv.meets_residency_requirement AND mv.principal_office_in_hubzone) as is_compliant,
    CASE 
      WHEN NOT mv.is_active_certified THEN 'critical'
      WHEN mv.days_until_expiration < 30 THEN 'high'
      WHEN mv.hubzone_employees_percentage < 40 THEN 'medium'
      ELSE 'low'
    END as risk_level
  FROM mv_compliance_summary mv
  WHERE mv.business_id = p_business_id;
END;
$$ LANGUAGE plpgsql STABLE;


-- ===== 5. Query Performance Logging Table =====

CREATE TABLE IF NOT EXISTS query_performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_hash VARCHAR(64) NOT NULL,
  query_template TEXT,
  execution_time_ms NUMERIC NOT NULL,
  rows_returned INTEGER,
  called_from VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_perf_hash 
  ON query_performance_logs(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_perf_time 
  ON query_performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_perf_slow 
  ON query_performance_logs(execution_time_ms DESC) 
  WHERE execution_time_ms > 100;


-- Function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query(
  p_query_hash VARCHAR(64),
  p_query_template TEXT,
  p_execution_time_ms NUMERIC,
  p_rows_returned INTEGER,
  p_called_from VARCHAR(255)
) RETURNS void AS $$
BEGIN
  -- Only log queries slower than 50ms
  IF p_execution_time_ms > 50 THEN
    INSERT INTO query_performance_logs 
      (query_hash, query_template, execution_time_ms, rows_returned, called_from)
    VALUES 
      (p_query_hash, p_query_template, p_execution_time_ms, p_rows_returned, p_called_from);
  END IF;
END;
$$ LANGUAGE plpgsql;


-- ===== 6. Connection Pool Configuration (for reference) =====
-- These are typically set in postgresql.conf or via environment variables

-- Recommended settings for production:
-- max_connections = 200
-- shared_buffers = 256MB (25% of RAM up to 8GB)
-- effective_cache_size = 768MB (75% of RAM)
-- maintenance_work_mem = 128MB
-- checkpoint_completion_target = 0.9
-- wal_buffers = 16MB
-- default_statistics_target = 100
-- random_page_cost = 1.1 (for SSD)
-- effective_io_concurrency = 200 (for SSD)
-- work_mem = 4MB
-- min_wal_size = 1GB
-- max_wal_size = 4GB


-- ===== 7. Analyze Tables for Query Optimization =====

ANALYZE businesses;
ANALYZE certifications;
ANALYZE hubzones;
ANALYZE documents;
ANALYZE users;
ANALYZE audit_logs;


-- Down Migration (commented out for safety)
-- =====================================
-- DROP FUNCTION IF EXISTS log_slow_query(VARCHAR, TEXT, NUMERIC, INTEGER, VARCHAR);
-- DROP FUNCTION IF EXISTS get_business_compliance(UUID);
-- DROP FUNCTION IF EXISTS check_hubzone_location(DOUBLE PRECISION, DOUBLE PRECISION);
-- DROP FUNCTION IF EXISTS refresh_materialized_views();
-- DROP TABLE IF EXISTS query_performance_logs;
-- DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_stats;
-- DROP MATERIALIZED VIEW IF EXISTS mv_hubzone_stats;
-- DROP MATERIALIZED VIEW IF EXISTS mv_compliance_summary;
-- DROP INDEX IF EXISTS idx_audit_logs_date_action;
-- DROP INDEX IF EXISTS idx_documents_category_user;
-- DROP INDEX IF EXISTS idx_hubzones_status_geometry;
-- DROP INDEX IF EXISTS idx_certifications_business_status;
-- DROP INDEX IF EXISTS idx_certifications_status_expiry;
-- DROP INDEX IF EXISTS idx_businesses_name_search;
-- DROP INDEX IF EXISTS idx_businesses_user_status;

