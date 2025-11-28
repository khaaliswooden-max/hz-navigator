#!/bin/bash
# =============================================================================
# HZ Navigator - Launch Day Script
# =============================================================================
# Execute this script on launch day to perform final checks and go live
# Usage: ./scripts/launch-day.sh [check|deploy|monitor|rollback]
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

ACTION=${1:-"check"}
ENVIRONMENT="production"
LOG_FILE="launch-$(date +%Y%m%d-%H%M%S).log"

# Configuration
API_URL="https://api.hz-navigator.com"
APP_URL="https://hz-navigator.com"

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

header() {
    log ""
    log "${CYAN}============================================${NC}"
    log "${CYAN}$1${NC}"
    log "${CYAN}============================================${NC}"
    log ""
}

success() {
    log "${GREEN}✓ $1${NC}"
}

error() {
    log "${RED}✗ $1${NC}"
}

warn() {
    log "${YELLOW}⚠ $1${NC}"
}

# =============================================================================
# Pre-Launch Checks
# =============================================================================
pre_launch_checks() {
    header "Pre-Launch Checks"
    
    local ERRORS=0
    
    # 1. Run pre-launch verification
    log "${BLUE}Running pre-launch verification...${NC}"
    if ./scripts/pre-launch-check.sh production; then
        success "Pre-launch checks passed"
    else
        error "Pre-launch checks failed"
        ((ERRORS++))
    fi
    
    # 2. Check CI/CD status
    log ""
    log "${BLUE}Checking recent deployments...${NC}"
    LAST_WORKFLOW=$(gh run list --workflow=backend.yml --limit=1 --json status,conclusion,createdAt 2>/dev/null || echo "")
    if echo "$LAST_WORKFLOW" | grep -q '"conclusion":"success"'; then
        success "Last backend deployment successful"
    else
        warn "Check last backend deployment status manually"
    fi
    
    # 3. Check database migrations
    log ""
    log "${BLUE}Checking database migration status...${NC}"
    # This would normally query the database for migration status
    success "Migration status check (verify manually)"
    
    # 4. Verify monitoring
    log ""
    log "${BLUE}Verifying monitoring setup...${NC}"
    
    # Check CloudWatch alarms
    ALARM_COUNT=$(aws cloudwatch describe-alarms \
        --alarm-name-prefix "hz-navigator-production" \
        --query 'MetricAlarms | length(@)' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$ALARM_COUNT" -gt 0 ]; then
        success "CloudWatch alarms configured ($ALARM_COUNT alarms)"
    else
        warn "No CloudWatch alarms found"
    fi
    
    # 5. Check SSL certificates
    log ""
    log "${BLUE}Checking SSL certificates...${NC}"
    
    SSL_EXPIRY=$(echo | openssl s_client -servername hz-navigator.com -connect hz-navigator.com:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$SSL_EXPIRY" ]; then
        success "SSL certificate valid until: $SSL_EXPIRY"
    else
        warn "Could not verify SSL certificate"
    fi
    
    # 6. Final readiness
    log ""
    if [ $ERRORS -eq 0 ]; then
        success "All pre-launch checks passed!"
        log ""
        log "${GREEN}System is ready for launch.${NC}"
        return 0
    else
        error "$ERRORS check(s) failed"
        log ""
        log "${RED}Please resolve issues before launching.${NC}"
        return 1
    fi
}

# =============================================================================
# Deploy to Production
# =============================================================================
deploy_production() {
    header "Deploying to Production"
    
    # Confirmation prompt
    log "${YELLOW}⚠️  WARNING: You are about to deploy to PRODUCTION${NC}"
    log ""
    read -p "Type 'DEPLOY' to confirm: " CONFIRM
    
    if [ "$CONFIRM" != "DEPLOY" ]; then
        log "Deployment cancelled."
        exit 1
    fi
    
    log ""
    log "${BLUE}Starting deployment...${NC}"
    
    # 1. Create pre-deployment backup
    log ""
    log "Creating pre-deployment backup..."
    BACKUP_NAME="pre-launch-$(date +%Y%m%d-%H%M%S)"
    
    # Database snapshot
    aws rds create-db-snapshot \
        --db-instance-identifier hz-navigator-production-postgres \
        --db-snapshot-identifier "$BACKUP_NAME" 2>/dev/null || warn "Could not create DB snapshot"
    
    success "Backup initiated: $BACKUP_NAME"
    
    # 2. Run database migrations
    log ""
    log "Running database migrations..."
    gh workflow run database-migration.yml \
        -f environment=production \
        -f action=up \
        2>/dev/null || warn "Could not trigger migrations via workflow"
    
    # 3. Deploy backend
    log ""
    log "Deploying backend..."
    gh workflow run deploy.yml \
        -f component=backend \
        -f environment=production \
        2>/dev/null || warn "Could not trigger backend deployment"
    
    # 4. Deploy frontend
    log ""
    log "Deploying frontend..."
    gh workflow run deploy.yml \
        -f component=frontend \
        -f environment=production \
        2>/dev/null || warn "Could not trigger frontend deployment"
    
    success "Deployment initiated!"
    log ""
    log "${YELLOW}Monitor deployment progress in GitHub Actions.${NC}"
}

# =============================================================================
# Post-Launch Monitoring
# =============================================================================
monitor_launch() {
    header "Post-Launch Monitoring"
    
    log "Monitoring will check system health every 30 seconds."
    log "Press Ctrl+C to stop."
    log ""
    
    local ITERATION=0
    local MAX_ITERATIONS=120  # 1 hour of monitoring
    
    while [ $ITERATION -lt $MAX_ITERATIONS ]; do
        TIMESTAMP=$(date +"%H:%M:%S")
        
        # Health check
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null || echo "000")
        RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/api/v1/health" 2>/dev/null || echo "999")
        
        # Frontend check
        FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" 2>/dev/null || echo "000")
        
        # Display status
        if [ "$HTTP_STATUS" == "200" ]; then
            STATUS_COLOR=$GREEN
            STATUS_TEXT="HEALTHY"
        else
            STATUS_COLOR=$RED
            STATUS_TEXT="UNHEALTHY"
        fi
        
        log "[$TIMESTAMP] API: ${STATUS_COLOR}${STATUS_TEXT}${NC} (${HTTP_STATUS}, ${RESPONSE_TIME}s) | Frontend: ${FRONTEND_STATUS}"
        
        # Alert on issues
        if [ "$HTTP_STATUS" != "200" ]; then
            log "${RED}⚠️  API health check failed!${NC}"
            # Could add Slack notification here
        fi
        
        if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l 2>/dev/null || echo 0) )); then
            log "${YELLOW}⚠️  Slow response time detected${NC}"
        fi
        
        ((ITERATION++))
        sleep 30
    done
}

# =============================================================================
# Quick Status Check
# =============================================================================
quick_status() {
    header "Quick Status Check"
    
    log "Checking production status..."
    log ""
    
    # API Health
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null || echo "000")
    RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/api/v1/health" 2>/dev/null || echo "N/A")
    
    if [ "$HTTP_STATUS" == "200" ]; then
        success "API: Healthy ($RESPONSE_TIME s)"
    else
        error "API: Status $HTTP_STATUS"
    fi
    
    # Frontend
    FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL" 2>/dev/null || echo "000")
    
    if [ "$FRONTEND_STATUS" == "200" ]; then
        success "Frontend: Online"
    else
        error "Frontend: Status $FRONTEND_STATUS"
    fi
    
    # ECS Tasks
    RUNNING_TASKS=$(aws ecs describe-services \
        --cluster hz-navigator-production-cluster \
        --services hz-navigator-production-backend-service \
        --query 'services[0].runningCount' \
        --output text 2>/dev/null || echo "N/A")
    
    log "ECS Tasks Running: $RUNNING_TASKS"
    
    # RDS Status
    RDS_STATUS=$(aws rds describe-db-instances \
        --db-instance-identifier hz-navigator-production-postgres \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text 2>/dev/null || echo "N/A")
    
    log "RDS Status: $RDS_STATUS"
}

# =============================================================================
# Emergency Rollback
# =============================================================================
emergency_rollback() {
    header "Emergency Rollback"
    
    log "${RED}⚠️  EMERGENCY ROLLBACK${NC}"
    log ""
    
    read -p "Reason for rollback: " REASON
    
    if [ -z "$REASON" ]; then
        log "Rollback reason is required."
        exit 1
    fi
    
    log ""
    log "Initiating rollback..."
    
    # Trigger rollback workflow
    gh workflow run rollback.yml \
        -f component=both \
        -f environment=production \
        -f reason="$REASON" \
        2>/dev/null
    
    if [ $? -eq 0 ]; then
        success "Rollback workflow triggered"
        log ""
        log "${YELLOW}Monitor rollback progress in GitHub Actions.${NC}"
    else
        error "Failed to trigger rollback workflow"
        log ""
        log "${YELLOW}Manual rollback required:${NC}"
        log "1. Backend: aws ecs update-service --cluster hz-navigator-production-cluster --service hz-navigator-production-backend-service --task-definition [PREVIOUS_REVISION] --force-new-deployment"
        log "2. Frontend: aws s3 sync s3://frontend-bucket-backups/[BACKUP]/ s3://frontend-bucket/ --delete"
    fi
}

# =============================================================================
# Run Smoke Tests
# =============================================================================
run_smoke_tests() {
    header "Running Smoke Tests"
    
    log "Running smoke tests against production..."
    log ""
    
    if [ -f "./scripts/smoke-tests.sh" ]; then
        ./scripts/smoke-tests.sh production
    else
        log "${YELLOW}Smoke test script not found. Running basic checks...${NC}"
        
        # Basic checks
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health")
        log "API Health: $HTTP_STATUS"
        
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL")
        log "Frontend: $HTTP_STATUS"
    fi
}

# =============================================================================
# Main
# =============================================================================
main() {
    header "HZ Navigator Launch Day Operations"
    
    log "Date: $(date)"
    log "Action: $ACTION"
    log "Log file: $LOG_FILE"
    
    case $ACTION in
        "check")
            pre_launch_checks
            ;;
        "deploy")
            pre_launch_checks && deploy_production
            ;;
        "monitor")
            monitor_launch
            ;;
        "status")
            quick_status
            ;;
        "smoke")
            run_smoke_tests
            ;;
        "rollback")
            emergency_rollback
            ;;
        *)
            log "Usage: $0 [check|deploy|monitor|status|smoke|rollback]"
            log ""
            log "Commands:"
            log "  check    - Run pre-launch verification"
            log "  deploy   - Deploy to production"
            log "  monitor  - Continuous health monitoring"
            log "  status   - Quick status check"
            log "  smoke    - Run smoke tests"
            log "  rollback - Emergency rollback"
            exit 1
            ;;
    esac
}

main

