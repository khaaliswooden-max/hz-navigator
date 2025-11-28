-- =============================================================================
-- HZ Navigator - PostGIS Extension Setup
-- =============================================================================
-- Run this script after the RDS instance is created to enable PostGIS
-- Connect to the database as the master user and execute these commands
-- =============================================================================

-- Enable PostGIS core extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable PostGIS topology support
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Enable fuzzy string matching (useful for address matching)
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Enable PostGIS Tiger geocoder (US address geocoding)
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- Enable PostGIS raster support (optional, for raster data)
CREATE EXTENSION IF NOT EXISTS postgis_raster;

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verify extensions are installed
SELECT 
    extname AS extension_name,
    extversion AS version
FROM 
    pg_extension 
WHERE 
    extname IN (
        'postgis', 
        'postgis_topology', 
        'fuzzystrmatch', 
        'postgis_tiger_geocoder',
        'postgis_raster',
        'pg_stat_statements',
        'uuid-ossp',
        'pgcrypto'
    );

-- Verify PostGIS version
SELECT PostGIS_Full_Version();

-- Grant necessary permissions to the application user
-- Replace 'hz_app_user' with your actual application user if different
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hz_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hz_app_user;
-- GRANT USAGE ON SCHEMA topology TO hz_app_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA topology TO hz_app_user;

-- Create spatial indexes example (run on your actual tables)
-- CREATE INDEX idx_your_table_geom ON your_table USING GIST (geom);

-- =============================================================================
-- HubZone-specific spatial functions
-- =============================================================================

-- Function to check if a point is within any HubZone
CREATE OR REPLACE FUNCTION is_in_hubzone(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
) RETURNS BOOLEAN AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM hubzones 
        WHERE ST_Contains(geometry, ST_SetSRID(ST_Point(lon, lat), 4326))
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get all HubZones containing a point
CREATE OR REPLACE FUNCTION get_hubzones_at_point(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
) RETURNS TABLE (
    hubzone_id INTEGER,
    hubzone_type VARCHAR,
    hubzone_name VARCHAR,
    effective_date DATE,
    expiration_date DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.type,
        h.name,
        h.effective_date,
        h.expiration_date
    FROM hubzones h
    WHERE ST_Contains(h.geometry, ST_SetSRID(ST_Point(lon, lat), 4326));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate distance to nearest HubZone
CREATE OR REPLACE FUNCTION distance_to_nearest_hubzone(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    distance DOUBLE PRECISION;
BEGIN
    SELECT MIN(ST_Distance(
        ST_SetSRID(ST_Point(lon, lat), 4326)::geography,
        h.geometry::geography
    )) INTO distance
    FROM hubzones h;
    RETURN distance;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Performance optimization for spatial queries
-- =============================================================================

-- Analyze tables for query optimization
ANALYZE;

-- Set statistics target for geometry columns (improves query planning)
-- ALTER TABLE hubzones ALTER COLUMN geometry SET STATISTICS 1000;

-- =============================================================================
-- Maintenance functions
-- =============================================================================

-- Function to vacuum and analyze spatial tables
CREATE OR REPLACE FUNCTION maintenance_spatial_tables()
RETURNS void AS $$
BEGIN
    VACUUM ANALYZE hubzones;
    -- Add other spatial tables as needed
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION maintenance_spatial_tables() IS 
    'Run this periodically to maintain optimal performance for spatial queries';

-- =============================================================================
-- Verification
-- =============================================================================

-- Test PostGIS functions
SELECT ST_AsText(ST_Point(-77.0364, 38.8951)) AS test_point;
SELECT ST_AsText(ST_Buffer(ST_Point(-77.0364, 38.8951), 0.01)) AS test_buffer;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'PostGIS setup completed successfully!';
    RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
END $$;

