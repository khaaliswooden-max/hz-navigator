#!/bin/bash
# =============================================================================
# HZ Navigator - Pre-Launch Verification Script
# =============================================================================
# Run this script before production launch to verify all systems are ready
# Usage: ./scripts/pre-launch-check.sh [production|staging]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-production}
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}HZ Navigator Pre-Launch Verification${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Function to check and report
check() {
    local name=$1
    local result=$2
    local message=$3
    
    if [ "$result" == "pass" ]; then
        echo -e "${GREEN}✓${NC} $name"
        ((PASSED++))
    elif [ "$result" == "warn" ]; then
        echo -e "${YELLOW}⚠${NC} $name: $message"
        ((WARNINGS++))
    else
        echo -e "${RED}✗${NC} $name: $message"
        ((FAILED++))
    fi
}

# Set environment-specific variables
if [ "$ENVIRONMENT" == "production" ]; then
    API_URL="https://api.hz-navigator.com"
    APP_URL="https://hz-navigator.com"
    TILES_URL="https://tiles.hz-navigator.com"
else
    API_URL="https://api-staging.hz-navigator.com"
    APP_URL="https://staging.hz-navigator.com"
    TILES_URL="https://tiles-staging.hz-navigator.com"
fi

echo -e "${BLUE}[1/8] Checking API Health...${NC}"
echo "----------------------------------------"

# API Health Check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" == "200" ]; then
    check "API Health Endpoint" "pass"
else
    check "API Health Endpoint" "fail" "HTTP $HTTP_STATUS"
fi

# API Response Time
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/api/v1/health" 2>/dev/null || echo "999")
if (( $(echo "$RESPONSE_TIME < 0.5" | bc -l) )); then
    check "API Response Time" "pass"
elif (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    check "API Response Time" "warn" "${RESPONSE_TIME}s (target <0.5s)"
else
    check "API Response Time" "fail" "${RESPONSE_TIME}s (too slow)"
fi

echo ""
echo -e "${BLUE}[2/8] Checking Frontend...${NC}"
echo "----------------------------------------"

# Frontend Health Check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" == "200" ]; then
    check "Frontend Homepage" "pass"
else
    check "Frontend Homepage" "fail" "HTTP $HTTP_STATUS"
fi

# Check for key assets
if curl -s "$APP_URL" | grep -q "<!DOCTYPE html>"; then
    check "Frontend HTML Valid" "pass"
else
    check "Frontend HTML Valid" "fail" "Invalid HTML response"
fi

echo ""
echo -e "${BLUE}[3/8] Checking SSL/TLS...${NC}"
echo "----------------------------------------"

# SSL Certificate Check
SSL_EXPIRY=$(echo | openssl s_client -servername "${APP_URL#https://}" -connect "${APP_URL#https://}:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null | grep "notAfter" | cut -d= -f2)
if [ -n "$SSL_EXPIRY" ]; then
    EXPIRY_DATE=$(date -d "$SSL_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$SSL_EXPIRY" +%s 2>/dev/null)
    NOW=$(date +%s)
    DAYS_LEFT=$(( (EXPIRY_DATE - NOW) / 86400 ))
    
    if [ $DAYS_LEFT -gt 30 ]; then
        check "SSL Certificate" "pass"
    elif [ $DAYS_LEFT -gt 7 ]; then
        check "SSL Certificate" "warn" "Expires in $DAYS_LEFT days"
    else
        check "SSL Certificate" "fail" "Expires in $DAYS_LEFT days"
    fi
else
    check "SSL Certificate" "warn" "Could not verify"
fi

# HTTPS Redirect
HTTP_REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "http://${APP_URL#https://}" 2>/dev/null || echo "000")
if [ "$HTTP_REDIRECT" == "301" ] || [ "$HTTP_REDIRECT" == "302" ]; then
    check "HTTP to HTTPS Redirect" "pass"
else
    check "HTTP to HTTPS Redirect" "fail" "HTTP $HTTP_REDIRECT (expected 301/302)"
fi

echo ""
echo -e "${BLUE}[4/8] Checking Database...${NC}"
echo "----------------------------------------"

# Database connectivity via API
DB_CHECK=$(curl -s "$API_URL/api/v1/health" 2>/dev/null | grep -o '"database"[^}]*' || echo "")
if echo "$DB_CHECK" | grep -q '"status":"healthy"'; then
    check "Database Connection" "pass"
elif echo "$DB_CHECK" | grep -q '"status"'; then
    check "Database Connection" "fail" "Unhealthy"
else
    check "Database Connection" "warn" "Could not verify"
fi

echo ""
echo -e "${BLUE}[5/8] Checking Cache (Redis)...${NC}"
echo "----------------------------------------"

# Redis connectivity via API
REDIS_CHECK=$(curl -s "$API_URL/api/v1/health" 2>/dev/null | grep -o '"redis"[^}]*' || echo "")
if echo "$REDIS_CHECK" | grep -q '"status":"healthy"'; then
    check "Redis Connection" "pass"
elif echo "$REDIS_CHECK" | grep -q '"status"'; then
    check "Redis Connection" "fail" "Unhealthy"
else
    check "Redis Connection" "warn" "Could not verify"
fi

echo ""
echo -e "${BLUE}[6/8] Checking CDN/Static Assets...${NC}"
echo "----------------------------------------"

# CloudFront/CDN Check
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TILES_URL" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "403" ]; then
    check "Map Tiles CDN" "pass"
else
    check "Map Tiles CDN" "fail" "HTTP $HTTP_STATUS"
fi

# Check cache headers
CACHE_HEADER=$(curl -s -I "$APP_URL/assets/" 2>/dev/null | grep -i "cache-control" || echo "")
if echo "$CACHE_HEADER" | grep -qi "max-age"; then
    check "CDN Cache Headers" "pass"
else
    check "CDN Cache Headers" "warn" "Cache-Control not set"
fi

echo ""
echo -e "${BLUE}[7/8] Checking API Endpoints...${NC}"
echo "----------------------------------------"

# Check key API endpoints exist
ENDPOINTS=(
    "/api/v1/health"
    "/api/v1/auth/login"
    "/api/v1/hubzones/check"
)

for endpoint in "${ENDPOINTS[@]}"; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint" 2>/dev/null || echo "000")
    if [ "$HTTP_STATUS" == "200" ] || [ "$HTTP_STATUS" == "400" ] || [ "$HTTP_STATUS" == "401" ]; then
        check "Endpoint $endpoint" "pass"
    else
        check "Endpoint $endpoint" "fail" "HTTP $HTTP_STATUS"
    fi
done

echo ""
echo -e "${BLUE}[8/8] Checking Security Headers...${NC}"
echo "----------------------------------------"

HEADERS=$(curl -s -I "$APP_URL" 2>/dev/null)

# Check security headers
if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    check "HSTS Header" "pass"
else
    check "HSTS Header" "warn" "Not set"
fi

if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    check "X-Content-Type-Options" "pass"
else
    check "X-Content-Type-Options" "warn" "Not set"
fi

if echo "$HEADERS" | grep -qi "x-frame-options"; then
    check "X-Frame-Options" "pass"
else
    check "X-Frame-Options" "warn" "Not set"
fi

if echo "$HEADERS" | grep -qi "content-security-policy"; then
    check "Content-Security-Policy" "pass"
else
    check "Content-Security-Policy" "warn" "Not set"
fi

# Summary
echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo -e "${RED}Failed:${NC}   $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ PRE-LAUNCH CHECK FAILED${NC}"
    echo "Please resolve all failed checks before launching."
    exit 1
elif [ $WARNINGS -gt 5 ]; then
    echo -e "${YELLOW}⚠️ PRE-LAUNCH CHECK PASSED WITH WARNINGS${NC}"
    echo "Consider addressing warnings before launching."
    exit 0
else
    echo -e "${GREEN}✅ PRE-LAUNCH CHECK PASSED${NC}"
    echo "System is ready for launch!"
    exit 0
fi

