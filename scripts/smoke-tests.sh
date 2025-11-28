#!/bin/bash
# =============================================================================
# HZ Navigator - Production Smoke Tests
# =============================================================================
# Run these tests immediately after deployment to verify critical functionality
# Usage: ./scripts/smoke-tests.sh [production|staging] [--verbose]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENVIRONMENT=${1:-production}
VERBOSE=${2:-""}
PASSED=0
FAILED=0
TOTAL=0

# Set URLs based on environment
if [ "$ENVIRONMENT" == "production" ]; then
    API_URL="https://api.hz-navigator.com"
    APP_URL="https://hz-navigator.com"
else
    API_URL="https://api-staging.hz-navigator.com"
    APP_URL="https://staging.hz-navigator.com"
fi

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}HZ Navigator Smoke Tests${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# Test function
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local expected_status=$4
    local data=$5
    local auth=$6
    
    ((TOTAL++))
    
    if [ "$VERBOSE" == "--verbose" ]; then
        echo -e "${BLUE}Testing: $name${NC}"
        echo "  Method: $method"
        echo "  URL: $url"
    fi
    
    # Build curl command
    CURL_CMD="curl -s -o /tmp/smoke_response.txt -w '%{http_code}' -X $method"
    
    if [ -n "$data" ]; then
        CURL_CMD="$CURL_CMD -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ -n "$auth" ]; then
        CURL_CMD="$CURL_CMD -H 'Authorization: Bearer $auth'"
    fi
    
    CURL_CMD="$CURL_CMD '$url'"
    
    # Execute and capture status
    HTTP_STATUS=$(eval $CURL_CMD 2>/dev/null || echo "000")
    
    if [ "$HTTP_STATUS" == "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $name"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $name (expected $expected_status, got $HTTP_STATUS)"
        if [ "$VERBOSE" == "--verbose" ]; then
            echo "  Response: $(cat /tmp/smoke_response.txt | head -c 200)"
        fi
        ((FAILED++))
        return 1
    fi
}

# Test with response validation
test_with_response() {
    local name=$1
    local url=$2
    local expected_string=$3
    
    ((TOTAL++))
    
    RESPONSE=$(curl -s "$url" 2>/dev/null || echo "")
    
    if echo "$RESPONSE" | grep -q "$expected_string"; then
        echo -e "${GREEN}✓${NC} $name"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $name (expected response containing '$expected_string')"
        ((FAILED++))
        return 1
    fi
}

echo -e "${BLUE}[1/10] Frontend Tests${NC}"
echo "----------------------------------------"

test_endpoint "Homepage loads" "GET" "$APP_URL" "200"
test_with_response "Homepage has title" "$APP_URL" "HZ Navigator"
test_endpoint "Login page loads" "GET" "$APP_URL/login" "200"
test_endpoint "Registration page loads" "GET" "$APP_URL/register" "200"

echo ""
echo -e "${BLUE}[2/10] API Health Tests${NC}"
echo "----------------------------------------"

test_endpoint "API health check" "GET" "$API_URL/api/v1/health" "200"
test_with_response "Health returns healthy status" "$API_URL/api/v1/health" '"status":"healthy"'

echo ""
echo -e "${BLUE}[3/10] Authentication Tests${NC}"
echo "----------------------------------------"

# Test login endpoint exists (should return 400 for missing body)
test_endpoint "Login endpoint exists" "POST" "$API_URL/api/v1/auth/login" "400"

# Test registration endpoint exists
test_endpoint "Registration endpoint exists" "POST" "$API_URL/api/v1/auth/register" "400"

# Test invalid credentials
test_endpoint "Invalid login rejected" "POST" "$API_URL/api/v1/auth/login" "401" \
    '{"email":"invalid@test.com","password":"wrongpassword"}'

echo ""
echo -e "${BLUE}[4/10] HUBZone Verification Tests${NC}"
echo "----------------------------------------"

# Test HUBZone check endpoint
test_endpoint "HUBZone check endpoint exists" "GET" "$API_URL/api/v1/hubzones/check?lat=38.8951&lng=-77.0364" "200"

# Test address verification
test_with_response "HUBZone data returned" "$API_URL/api/v1/hubzones/check?lat=38.8951&lng=-77.0364" "hubzone"

echo ""
echo -e "${BLUE}[5/10] Map Tests${NC}"
echo "----------------------------------------"

# Test map tiles endpoint (may return 403 without proper auth, but should exist)
test_endpoint "Map tiles endpoint accessible" "GET" "$API_URL/api/v1/map/tiles" "200"

echo ""
echo -e "${BLUE}[6/10] Protected Endpoint Tests${NC}"
echo "----------------------------------------"

# These should return 401 without authentication
test_endpoint "Business endpoint requires auth" "GET" "$API_URL/api/v1/businesses" "401"
test_endpoint "Employees endpoint requires auth" "GET" "$API_URL/api/v1/employees" "401"
test_endpoint "Documents endpoint requires auth" "GET" "$API_URL/api/v1/documents" "401"
test_endpoint "Compliance endpoint requires auth" "GET" "$API_URL/api/v1/compliance" "401"

echo ""
echo -e "${BLUE}[7/10] Static Assets Tests${NC}"
echo "----------------------------------------"

# Check that static assets load
test_endpoint "Favicon loads" "GET" "$APP_URL/favicon.svg" "200"
test_endpoint "Manifest loads" "GET" "$APP_URL/manifest.json" "200"

echo ""
echo -e "${BLUE}[8/10] Error Handling Tests${NC}"
echo "----------------------------------------"

# Test 404 handling
test_endpoint "404 page works" "GET" "$APP_URL/nonexistent-page-12345" "200"  # SPA returns 200 with router

# Test API 404
test_endpoint "API 404 works" "GET" "$API_URL/api/v1/nonexistent" "404"

echo ""
echo -e "${BLUE}[9/10] Security Tests${NC}"
echo "----------------------------------------"

# Check security headers exist
HEADERS=$(curl -s -I "$API_URL/api/v1/health" 2>/dev/null)

((TOTAL++))
if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    echo -e "${GREEN}✓${NC} X-Content-Type-Options header present"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} X-Content-Type-Options header missing"
    ((FAILED++))
fi

((TOTAL++))
if echo "$HEADERS" | grep -qi "x-frame-options\|content-security-policy"; then
    echo -e "${GREEN}✓${NC} Clickjacking protection present"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠${NC} Clickjacking protection missing"
    ((FAILED++))
fi

echo ""
echo -e "${BLUE}[10/10] Performance Tests${NC}"
echo "----------------------------------------"

# Measure response times
API_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/api/v1/health" 2>/dev/null || echo "999")
FRONTEND_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$APP_URL" 2>/dev/null || echo "999")

((TOTAL++))
if (( $(echo "$API_TIME < 1.0" | bc -l) )); then
    echo -e "${GREEN}✓${NC} API response time: ${API_TIME}s"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} API response time: ${API_TIME}s (too slow)"
    ((FAILED++))
fi

((TOTAL++))
if (( $(echo "$FRONTEND_TIME < 3.0" | bc -l) )); then
    echo -e "${GREEN}✓${NC} Frontend load time: ${FRONTEND_TIME}s"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Frontend load time: ${FRONTEND_TIME}s (too slow)"
    ((FAILED++))
fi

# Summary
echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}Smoke Test Summary${NC}"
echo -e "${BLUE}==========================================${NC}"
echo -e "Total:  $TOTAL"
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo ""

PASS_RATE=$((PASSED * 100 / TOTAL))
echo "Pass Rate: ${PASS_RATE}%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL SMOKE TESTS PASSED${NC}"
    exit 0
elif [ $FAILED -le 2 ]; then
    echo -e "${YELLOW}⚠️ SMOKE TESTS PASSED WITH MINOR ISSUES${NC}"
    echo "Review failed tests before proceeding."
    exit 0
else
    echo -e "${RED}❌ SMOKE TESTS FAILED${NC}"
    echo "Critical issues detected. Do not proceed with launch."
    exit 1
fi

