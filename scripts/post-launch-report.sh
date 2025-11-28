#!/bin/bash
# =============================================================================
# HZ Navigator - Post-Launch Report Generator
# =============================================================================
# Generates a report of system health after launch
# Usage: ./scripts/post-launch-report.sh [hours]
# =============================================================================

set -e

HOURS=${1:-24}
REPORT_FILE="post-launch-report-$(date +%Y%m%d-%H%M%S).md"
API_URL="https://api.hz-navigator.com"
APP_URL="https://hz-navigator.com"

echo "Generating post-launch report for the last $HOURS hours..."
echo ""

cat > "$REPORT_FILE" << EOF
# HZ Navigator Post-Launch Report

**Generated:** $(date)
**Period:** Last $HOURS hours
**Environment:** Production

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
EOF

# Get current health
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health" 2>/dev/null || echo "000")
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL/api/v1/health" 2>/dev/null || echo "N/A")

if [ "$HTTP_STATUS" == "200" ]; then
    echo "| Current Health | Healthy | ✅ |" >> "$REPORT_FILE"
else
    echo "| Current Health | Unhealthy ($HTTP_STATUS) | ❌ |" >> "$REPORT_FILE"
fi

echo "| Response Time | ${RESPONSE_TIME}s | $(if (( $(echo "$RESPONSE_TIME < 0.5" | bc -l 2>/dev/null || echo 0) )); then echo "✅"; else echo "⚠️"; fi) |" >> "$REPORT_FILE"

# Get ECS metrics
RUNNING_TASKS=$(aws ecs describe-services \
    --cluster hz-navigator-production-cluster \
    --services hz-navigator-production-backend-service \
    --query 'services[0].runningCount' \
    --output text 2>/dev/null || echo "N/A")

echo "| Running Tasks | $RUNNING_TASKS | ✅ |" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << EOF

---

## Infrastructure Status

### ECS Service
EOF

aws ecs describe-services \
    --cluster hz-navigator-production-cluster \
    --services hz-navigator-production-backend-service \
    --query 'services[0].{DesiredCount:desiredCount,RunningCount:runningCount,PendingCount:pendingCount,Status:status}' \
    --output table 2>/dev/null >> "$REPORT_FILE" || echo "Could not fetch ECS metrics" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << EOF

### RDS Database
EOF

aws rds describe-db-instances \
    --db-instance-identifier hz-navigator-production-postgres \
    --query 'DBInstances[0].{Status:DBInstanceStatus,Class:DBInstanceClass,MultiAZ:MultiAZ,StorageType:StorageType}' \
    --output table 2>/dev/null >> "$REPORT_FILE" || echo "Could not fetch RDS metrics" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << EOF

### ElastiCache Redis
EOF

aws elasticache describe-replication-groups \
    --replication-group-id hz-navigator-production-redis \
    --query 'ReplicationGroups[0].{Status:Status,NodeType:CacheNodeType,AutoFailover:AutomaticFailover}' \
    --output table 2>/dev/null >> "$REPORT_FILE" || echo "Could not fetch Redis metrics" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << EOF

---

## CloudWatch Metrics Summary

### API Performance (Last $HOURS hours)
EOF

# Get API metrics
START_TIME=$(date -u -d "$HOURS hours ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-${HOURS}H +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "" >> "$REPORT_FILE"
echo "Note: Detailed CloudWatch metrics should be reviewed in the AWS Console." >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << EOF

---

## Alerts Fired

EOF

# Get recent alarms
aws cloudwatch describe-alarm-history \
    --alarm-name-prefix "hz-navigator-production" \
    --history-item-type StateUpdate \
    --start-date "$START_TIME" \
    --end-date "$END_TIME" \
    --query 'AlarmHistoryItems[?HistorySummary!=`Alarm updated from OK to OK`].{AlarmName:AlarmName,Timestamp:Timestamp,Summary:HistorySummary}' \
    --output table 2>/dev/null >> "$REPORT_FILE" || echo "No alarm history available or could not fetch." >> "$REPORT_FILE"

cat >> "$REPORT_FILE" << EOF

---

## Error Summary

### Sentry Errors

Please check Sentry dashboard for detailed error analysis:
- [Sentry Dashboard](https://sentry.io/organizations/hz-navigator/issues/)

### CloudWatch Logs Errors

Use the following query in CloudWatch Logs Insights:

\`\`\`
fields @timestamp, @message
| filter @message like /error|Error|ERROR/
| sort @timestamp desc
| limit 100
\`\`\`

---

## Recommendations

1. **Review error patterns** in Sentry for any recurring issues
2. **Monitor response times** for any degradation trends
3. **Check auto-scaling events** if traffic patterns changed
4. **Review database slow queries** in Performance Insights
5. **Verify backup completion** for daily database backups

---

## Next Steps

- [ ] Schedule post-launch retrospective meeting
- [ ] Address any critical issues identified
- [ ] Update runbook with any new learnings
- [ ] Plan for upcoming features/improvements

---

*Report generated automatically by post-launch-report.sh*
EOF

echo ""
echo "Report generated: $REPORT_FILE"
echo ""
echo "Summary:"
echo "  - Current Health: $HTTP_STATUS"
echo "  - Response Time: ${RESPONSE_TIME}s"
echo "  - Running Tasks: $RUNNING_TASKS"

