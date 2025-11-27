-- Enable required PostgreSQL extensions
-- This script runs automatically when the container is first created

-- PostGIS for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extensions are installed
SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'uuid-ossp', 'pg_trgm');

