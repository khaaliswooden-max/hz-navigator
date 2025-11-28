#!/bin/bash
# =============================================================================
# HZ-Navigator Database Initialization Script
# =============================================================================
# Usage: ./scripts/init-database.sh [environment]
# This script connects to RDS and initializes the database with extensions
# =============================================================================

set -e

ENVIRONMENT="${1:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "=== HZ-Navigator Database Initialization ==="
echo "Environment: ${ENVIRONMENT}"
echo ""

# Get database connection info from Secrets Manager
SECRET_NAME="hz-navigator-${ENVIRONMENT}-db-password"
echo "Fetching database credentials from Secrets Manager..."

DB_SECRET=$(aws secretsmanager get-secret-value \
    --secret-id ${SECRET_NAME} \
    --query SecretString \
    --output text \
    --region ${AWS_REGION})

DB_HOST=$(echo $DB_SECRET | jq -r '.host')
DB_PORT=$(echo $DB_SECRET | jq -r '.port')
DB_NAME=$(echo $DB_SECRET | jq -r '.dbname')
DB_USER=$(echo $DB_SECRET | jq -r '.username')
DB_PASSWORD=$(echo $DB_SECRET | jq -r '.password')

echo "Database Host: ${DB_HOST}"
echo "Database Name: ${DB_NAME}"
echo ""

# SQL to initialize extensions
SQL_INIT=$(cat <<'EOF'
-- Enable PostGIS and related extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- Enable other useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extensions
SELECT extname, extversion FROM pg_extension WHERE extname LIKE 'postgis%' OR extname IN ('uuid-ossp', 'pg_stat_statements', 'pg_trgm');

-- Create application schema if not exists
CREATE SCHEMA IF NOT EXISTS app;

-- Grant permissions
GRANT USAGE ON SCHEMA app TO PUBLIC;
GRANT CREATE ON SCHEMA app TO PUBLIC;

-- Show PostGIS version
SELECT PostGIS_Full_Version();
EOF
)

echo "=== Initializing Database Extensions ==="

# Note: You need psql installed locally or run this from a bastion host
# For production, consider using AWS SSM Session Manager or a bastion host

if command -v psql &> /dev/null; then
    PGPASSWORD="${DB_PASSWORD}" psql \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -c "${SQL_INIT}"
else
    echo "psql not found. Please install PostgreSQL client or run from a bastion host."
    echo ""
    echo "SQL to execute:"
    echo "${SQL_INIT}"
fi

echo ""
echo "=== Database Initialization Complete ==="

