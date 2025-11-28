# HZ-Navigator Operations Runbook

> **Version:** 1.0
> **Last Updated:** _______________
> **On-Call:** Check PagerDuty schedule

## Table of Contents

1. [Quick Reference](#1-quick-reference)
2. [Incident Response](#2-incident-response)
3. [Common Issues & Solutions](#3-common-issues--solutions)
4. [Rollback Procedures](#4-rollback-procedures)
5. [Scaling Procedures](#5-scaling-procedures)
6. [Database Operations](#6-database-operations)
7. [Monitoring & Alerting](#7-monitoring--alerting)
8. [Contact Information](#8-contact-information)

---

## 1. Quick Reference

### Service URLs

| Service | Production | Staging |
|---------|------------|---------|
| Frontend | https://app.hz-navigator.com | https://app.staging.hz-navigator.com |
| API | https://api.hz-navigator.com | https://api.staging.hz-navigator.com |
| Health Check | /api/v1/health | /api/v1/health |

### AWS Resources

| Resource | Production | Staging |
|----------|------------|---------|
| ECS Cluster | hz-navigator-production-cluster | hz-navigator-staging-cluster |
| ECS Service | hz-navigator-production-backend-service | hz-navigator-staging-backend-service |
| RDS Instance | hz-navigator-production-postgres | hz-navigator-staging-postgres |
| Redis | hz-navigator-production-redis | hz-navigator-staging-redis |
| ALB | hz-navigator-production-alb | hz-navigator-staging-alb |
| CloudFront (Frontend) | XXXXXXXXXX | XXXXXXXXXX |

### Quick Commands

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster hz-navigator-production-cluster \
  --services hz-navigator-production-backend-service \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount}'

# View recent logs
aws logs tail /aws/ecs/hz-navigator-production --follow

# Check ALB health
aws elbv2 describe-target-health \
  --target-group-arn <TARGET_GROUP_ARN>

# Force new deployment
aws ecs update-service \
  --cluster hz-navigator-production-cluster \
  --service hz-navigator-production-backend-service \
  --force-new-deployment
```

---

## 2. Incident Response

### Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1 - Critical** | Service down, data loss | 15 min | Complete outage, security breach |
| **P2 - High** | Major feature broken | 1 hour | Auth failing, payments broken |
| **P3 - Medium** | Feature degraded | 4 hours | Slow performance, minor bugs |
| **P4 - Low** | Minor issue | Next business day | UI glitches, typos |

### Incident Response Steps

#### 1. Acknowledge
```
□ Acknowledge alert in PagerDuty
□ Join #incident-response Slack channel
□ Start incident timeline document
```

#### 2. Assess
```
□ Check error rate (CloudWatch/Sentry)
□ Check response time
□ Check ECS task status
□ Check RDS status
□ Check recent deployments
□ Determine severity level
```

#### 3. Communicate
```
□ Update status page (if P1/P2)
□ Notify stakeholders in Slack
□ Send initial customer communication (if needed)
```

#### 4. Mitigate
```
□ Rollback if deployment-related
□ Scale up if capacity-related
□ Enable maintenance mode if needed
□ Apply emergency fix
```

#### 5. Resolve
```
□ Verify fix
□ Run smoke tests
□ Update status page
□ Send resolution communication
```

#### 6. Post-Mortem
```
□ Document timeline
□ Identify root cause
□ Define action items
□ Schedule post-mortem meeting
□ Update runbook if needed
```

### Incident Communication Templates

#### Status Page - Investigating
```
We are currently investigating issues with [SERVICE]. 
Some users may experience [SYMPTOMS].
We will provide updates as we learn more.
```

#### Status Page - Identified
```
We have identified the issue affecting [SERVICE].
The issue is related to [BRIEF DESCRIPTION].
Our team is working on a fix.
```

#### Status Page - Resolved
```
The issue affecting [SERVICE] has been resolved.
[BRIEF DESCRIPTION OF FIX]
We apologize for any inconvenience.
```

---

## 3. Common Issues & Solutions

### 3.1 High Error Rate (5XX)

**Symptoms:**
- CloudWatch alarm: ALB 5XX errors
- Sentry: Spike in error count
- User reports of errors

**Diagnosis:**
```bash
# Check ECS task logs
aws logs tail /aws/ecs/hz-navigator-production --since 30m | grep -i error

# Check recent deployments
aws ecs describe-services --cluster hz-navigator-production-cluster \
  --services hz-navigator-production-backend-service \
  --query 'services[0].deployments'

# Check task status
aws ecs list-tasks --cluster hz-navigator-production-cluster \
  --service-name hz-navigator-production-backend-service
```

**Solutions:**
1. **If after deployment:** Rollback (see Section 4)
2. **If database related:** Check RDS metrics, connections
3. **If Redis related:** Check ElastiCache metrics
4. **If resource exhaustion:** Scale up (see Section 5)

### 3.2 High Latency

**Symptoms:**
- CloudWatch alarm: ALB response time > 2s
- User reports of slow pages

**Diagnosis:**
```bash
# Check ECS CPU/Memory
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=hz-navigator-production-cluster \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average

# Check RDS performance
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=hz-navigator-production-postgres \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average

# Check for slow queries (via RDS logs)
```

**Solutions:**
1. **High CPU:** Scale up ECS tasks
2. **Database bottleneck:** Check slow query log, add indexes
3. **Cache miss:** Check Redis hit rate
4. **External API:** Check third-party service status

### 3.3 ECS Tasks Unhealthy

**Symptoms:**
- ALB unhealthy host count > 0
- ECS tasks cycling (stopping/starting)

**Diagnosis:**
```bash
# Check task status
aws ecs describe-tasks \
  --cluster hz-navigator-production-cluster \
  --tasks $(aws ecs list-tasks --cluster hz-navigator-production-cluster \
    --service-name hz-navigator-production-backend-service --query 'taskArns' --output text)

# Check stopped task reason
aws ecs describe-tasks \
  --cluster hz-navigator-production-cluster \
  --tasks <STOPPED_TASK_ARN> \
  --query 'tasks[0].stoppedReason'
```

**Solutions:**
1. **Out of memory:** Increase task memory or optimize code
2. **Health check failing:** Check /api/v1/health endpoint
3. **Container crash:** Check logs for stack traces
4. **Database connection:** Verify RDS accessibility

### 3.4 Database Connection Issues

**Symptoms:**
- "Connection refused" errors
- "Too many connections" errors
- Timeout errors

**Diagnosis:**
```bash
# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier hz-navigator-production-postgres \
  --query 'DBInstances[0].{Status:DBInstanceStatus,Connections:DBInstanceStatus}'

# Check connection count
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=hz-navigator-production-postgres \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Maximum
```

**Solutions:**
1. **Too many connections:** Reduce ECS tasks, check for connection leaks
2. **RDS unavailable:** Check for maintenance, failover status
3. **Network issue:** Verify security groups, VPC connectivity

### 3.5 Redis Connection Issues

**Symptoms:**
- Cache misses
- Session errors
- "ECONNREFUSED" errors

**Diagnosis:**
```bash
# Check ElastiCache status
aws elasticache describe-replication-groups \
  --replication-group-id hz-navigator-production-redis

# Check Redis metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CurrConnections \
  --dimensions Name=ReplicationGroupId,Value=hz-navigator-production-redis \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Maximum
```

**Solutions:**
1. **Connection limit:** Check for connection leaks
2. **Memory full:** Check eviction policy, increase node size
3. **Failover:** Wait for automatic failover to complete

---

## 4. Rollback Procedures

### 4.1 Backend Rollback (ECS)

```bash
# List recent task definitions
aws ecs list-task-definitions \
  --family-prefix hz-navigator-production-backend \
  --sort DESC \
  --max-items 5

# Get current revision
CURRENT=$(aws ecs describe-services \
  --cluster hz-navigator-production-cluster \
  --services hz-navigator-production-backend-service \
  --query 'services[0].taskDefinition' --output text)

# Extract revision number
CURRENT_REV=$(echo $CURRENT | grep -o '[0-9]*$')
PREVIOUS_REV=$((CURRENT_REV - 1))

# Rollback to previous
aws ecs update-service \
  --cluster hz-navigator-production-cluster \
  --service hz-navigator-production-backend-service \
  --task-definition hz-navigator-production-backend:$PREVIOUS_REV

# Wait for stability
aws ecs wait services-stable \
  --cluster hz-navigator-production-cluster \
  --services hz-navigator-production-backend-service

# Verify
curl -s https://api.hz-navigator.com/api/v1/health
```

### 4.2 Frontend Rollback (S3)

```bash
# List backups
aws s3 ls s3://hz-navigator-frontend-production-backups/

# Restore from backup
aws s3 sync \
  s3://hz-navigator-frontend-production-backups/<BACKUP_ID>/ \
  s3://hz-navigator-frontend-production/ \
  --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"

# Wait for invalidation
aws cloudfront wait invalidation-completed \
  --distribution-id <DISTRIBUTION_ID> \
  --id <INVALIDATION_ID>
```

### 4.3 Database Rollback

⚠️ **WARNING:** Database rollback should be a last resort.

```bash
# Option 1: Point-in-time restore (creates new instance)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier hz-navigator-production-postgres \
  --target-db-instance-identifier hz-navigator-production-postgres-restored \
  --restore-time <ISO_TIMESTAMP>

# Option 2: Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier hz-navigator-production-postgres-restored \
  --db-snapshot-identifier <SNAPSHOT_ID>

# Option 3: Migration rollback
cd backend
DATABASE_URL=<PRODUCTION_URL> npx node-pg-migrate down
```

---

## 5. Scaling Procedures

### 5.1 Horizontal Scaling (ECS Tasks)

```bash
# Check current capacity
aws ecs describe-services \
  --cluster hz-navigator-production-cluster \
  --services hz-navigator-production-backend-service \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount}'

# Scale up
aws ecs update-service \
  --cluster hz-navigator-production-cluster \
  --service hz-navigator-production-backend-service \
  --desired-count 6

# Scale down
aws ecs update-service \
  --cluster hz-navigator-production-cluster \
  --service hz-navigator-production-backend-service \
  --desired-count 2
```

### 5.2 Vertical Scaling (Change Instance Size)

**RDS:**
```bash
# Modify instance class (causes brief downtime with Multi-AZ)
aws rds modify-db-instance \
  --db-instance-identifier hz-navigator-production-postgres \
  --db-instance-class db.r5.large \
  --apply-immediately
```

**ElastiCache:**
```bash
# Modify node type
aws elasticache modify-replication-group \
  --replication-group-id hz-navigator-production-redis \
  --cache-node-type cache.r5.xlarge \
  --apply-immediately
```

---

## 6. Database Operations

### 6.1 Manual Backup

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier hz-navigator-production-postgres \
  --db-snapshot-identifier hz-navigator-manual-$(date +%Y%m%d-%H%M%S)

# List snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier hz-navigator-production-postgres \
  --query 'DBSnapshots[].{ID:DBSnapshotIdentifier,Time:SnapshotCreateTime,Status:Status}'
```

### 6.2 Run Migrations

```bash
# Get database credentials
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id hz-navigator-production-db-password \
  --query SecretString --output text)

DB_URL=$(echo $SECRET | jq -r '"postgresql://\(.username):\(.password)@\(.host):\(.port)/\(.dbname)?sslmode=require"')

# Run migrations
cd backend
DATABASE_URL=$DB_URL npx node-pg-migrate up

# Check status
DATABASE_URL=$DB_URL npx node-pg-migrate status
```

### 6.3 Query Performance

```bash
# Enable slow query log (if not enabled)
aws rds modify-db-parameter-group \
  --db-parameter-group-name hz-navigator-production-pg-params \
  --parameters "ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=immediate"

# View slow queries via CloudWatch Logs
aws logs filter-log-events \
  --log-group-name /aws/rds/instance/hz-navigator-production-postgres/postgresql \
  --filter-pattern "duration:"
```

---

## 7. Monitoring & Alerting

### 7.1 Key Metrics to Watch

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| ECS CPU | < 60% | > 70% | > 85% |
| ECS Memory | < 70% | > 80% | > 90% |
| RDS CPU | < 60% | > 75% | > 90% |
| RDS Connections | < 100 | > 150 | > 180 |
| Redis Memory | < 70% | > 80% | > 90% |
| ALB 5XX Rate | < 0.1% | > 1% | > 5% |
| ALB Latency (p95) | < 500ms | > 1s | > 2s |
| Error Rate (Sentry) | < 10/min | > 50/min | > 100/min |

### 7.2 CloudWatch Dashboards

```bash
# List dashboards
aws cloudwatch list-dashboards

# Get dashboard
aws cloudwatch get-dashboard --dashboard-name hz-navigator-production
```

### 7.3 Sentry

- **URL:** https://sentry.io/organizations/hz-navigator
- **Project:** hz-navigator-backend

### 7.4 Log Queries

```bash
# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/ecs/hz-navigator-production \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '1 hour ago' +%s)000

# Search for specific user
aws logs filter-log-events \
  --log-group-name /aws/ecs/hz-navigator-production \
  --filter-pattern "{$.userId = \"USER_ID\"}"
```

---

## 8. Contact Information

### Internal Team

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Engineering Lead | | | @eng-lead |
| DevOps Lead | | | @devops-lead |
| Backend Lead | | | @backend-lead |
| Frontend Lead | | | @frontend-lead |
| Product Owner | | | @product |

### External Contacts

| Service | Contact | Support URL |
|---------|---------|-------------|
| AWS Support | | https://console.aws.amazon.com/support |
| Sentry | | https://sentry.io/support |
| Domain Registrar | | |
| SSL Provider | | |

### Escalation Path

1. **L1:** On-call engineer (PagerDuty)
2. **L2:** Team lead
3. **L3:** Engineering manager
4. **L4:** CTO

---

## Appendix A: Useful Scripts

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

API_URL="https://api.hz-navigator.com"
FRONTEND_URL="https://app.hz-navigator.com"

echo "Checking API health..."
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/v1/health")
echo "API Status: $API_STATUS"

echo "Checking Frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
echo "Frontend Status: $FRONTEND_STATUS"

if [ "$API_STATUS" != "200" ] || [ "$FRONTEND_STATUS" != "200" ]; then
  echo "❌ Health check failed!"
  exit 1
fi

echo "✅ All services healthy"
```

### Service Status Script

```bash
#!/bin/bash
# service-status.sh

CLUSTER="hz-navigator-production-cluster"
SERVICE="hz-navigator-production-backend-service"

echo "ECS Service Status:"
aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}'

echo ""
echo "Recent Events:"
aws ecs describe-services \
  --cluster $CLUSTER \
  --services $SERVICE \
  --query 'services[0].events[:5]'
```

---

**Document Version Control:**
- v1.0 - Initial version
- v1.1 - Added database rollback procedures
- v1.2 - Updated contact information

