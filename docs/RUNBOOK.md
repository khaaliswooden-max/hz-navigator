# HZ Navigator - Operations Runbook

## Overview

This runbook provides operational procedures for managing the HZ Navigator production environment. Use this guide for incident response, troubleshooting, and routine maintenance.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Incident Response](#incident-response)
3. [Common Issues & Solutions](#common-issues--solutions)
4. [Maintenance Procedures](#maintenance-procedures)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Escalation Paths](#escalation-paths)

---

## Quick Reference

### Important URLs

| Service | URL |
|---------|-----|
| Production App | https://hz-navigator.com |
| Production API | https://api.hz-navigator.com |
| Staging App | https://staging.hz-navigator.com |
| Staging API | https://api-staging.hz-navigator.com |
| AWS Console | https://console.aws.amazon.com |
| Sentry | https://sentry.io/organizations/hz-navigator |
| GitHub Actions | https://github.com/your-org/hz-navigator/actions |

### AWS Resources

| Resource | Name/ID |
|----------|---------|
| ECS Cluster (Prod) | hz-navigator-production-cluster |
| ECS Service (Prod) | hz-navigator-production-backend-service |
| RDS Instance (Prod) | hz-navigator-production-postgres |
| Redis Cluster (Prod) | hz-navigator-production-redis |
| ALB (Prod) | hz-navigator-production-alb |
| CloudFront (Frontend) | [Distribution ID] |
| S3 Frontend Bucket | hz-navigator-frontend-production-* |

### Quick Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster hz-navigator-production-cluster --services hz-navigator-production-backend-service

# Force new deployment
aws ecs update-service --cluster hz-navigator-production-cluster --service hz-navigator-production-backend-service --force-new-deployment

# View recent logs
aws logs tail /ecs/hz-navigator-production/backend --follow

# Check RDS status
aws rds describe-db-instances --db-instance-identifier hz-navigator-production-postgres
```

---

## Incident Response

### Severity Levels

| Severity | Description | Response Time | Examples |
|----------|-------------|---------------|----------|
| **SEV1** | Complete outage | 15 min | Site down, data loss |
| **SEV2** | Major degradation | 30 min | Slow performance, partial outage |
| **SEV3** | Minor impact | 2 hours | Single feature broken |
| **SEV4** | Low priority | 24 hours | Cosmetic issues |

### Incident Response Steps

#### 1. Acknowledge
- Acknowledge alert in Slack/PagerDuty
- Join incident channel #hz-navigator-incidents
- Assign incident commander

#### 2. Assess
- Determine severity level
- Identify affected systems
- Check monitoring dashboards
- Review recent deployments

#### 3. Communicate
- Post initial status update
- Notify stakeholders based on severity
- Update status page if applicable

#### 4. Mitigate
- Apply quick fixes or workarounds
- Rollback if recent deployment caused issue
- Scale resources if capacity issue

#### 5. Resolve
- Implement permanent fix
- Verify fix in staging first
- Deploy to production
- Monitor for recurrence

#### 6. Post-Incident
- Write incident report
- Schedule post-mortem
- Create follow-up tickets
- Update runbook if needed

---

## Common Issues & Solutions

### Issue: Site Not Loading (5xx Errors)

**Symptoms:**
- Users see 502/503/504 errors
- Health checks failing
- ALB returning errors

**Diagnosis:**
```bash
# Check ECS tasks
aws ecs describe-services --cluster hz-navigator-production-cluster \
  --services hz-navigator-production-backend-service

# Check task logs
aws logs tail /ecs/hz-navigator-production/backend --since 15m

# Check ALB target health
aws elbv2 describe-target-health --target-group-arn $TARGET_GROUP_ARN
```

**Resolution:**
1. Check if ECS tasks are running
2. Review application logs for errors
3. Verify database connectivity
4. Check Redis connectivity
5. If recent deployment, rollback:
   ```bash
   gh workflow run rollback.yml -f component=backend -f environment=production -f reason="5xx errors"
   ```

### Issue: High Response Times

**Symptoms:**
- API latency > 2 seconds
- CloudWatch alarms firing
- User complaints

**Diagnosis:**
```bash
# Check RDS performance
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=hz-navigator-production-postgres \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average

# Check Redis latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CacheHits \
  --dimensions Name=CacheClusterId,Value=hz-navigator-production-redis-001 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Sum
```

**Resolution:**
1. Check for slow database queries in RDS Performance Insights
2. Verify Redis is responding
3. Check if auto-scaling triggered
4. Review recent code changes
5. Scale ECS tasks if needed:
   ```bash
   aws ecs update-service --cluster hz-navigator-production-cluster \
     --service hz-navigator-production-backend-service \
     --desired-count 5
   ```

### Issue: Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- "Too many connections" errors
- Health check failing on database

**Diagnosis:**
```bash
# Check RDS instance status
aws rds describe-db-instances \
  --db-instance-identifier hz-navigator-production-postgres \
  --query 'DBInstances[0].DBInstanceStatus'

# Check connection count
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=hz-navigator-production-postgres \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average
```

**Resolution:**
1. Check if RDS instance is available
2. Verify security group allows connections
3. Check for connection leaks in application
4. Restart ECS tasks if connection pool exhausted
5. If multi-AZ, check failover status

### Issue: Redis Connection Errors

**Symptoms:**
- Cache misses
- Session errors
- Rate limiting not working

**Diagnosis:**
```bash
# Check Redis cluster status
aws elasticache describe-replication-groups \
  --replication-group-id hz-navigator-production-redis

# Check Redis metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CurrConnections \
  --dimensions Name=CacheClusterId,Value=hz-navigator-production-redis-001 \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average
```

**Resolution:**
1. Check Redis cluster status
2. Verify security group allows connections
3. Check memory usage
4. Restart ECS tasks to reset connections
5. If failover needed, Redis handles automatically

### Issue: Frontend Not Updating

**Symptoms:**
- Old content showing
- New features not visible
- CSS/JS not loading

**Diagnosis:**
```bash
# Check S3 bucket
aws s3 ls s3://hz-navigator-frontend-production-*/

# Check CloudFront invalidation status
aws cloudfront list-invalidations \
  --distribution-id $CLOUDFRONT_ID \
  --query 'InvalidationList.Items[0]'
```

**Resolution:**
1. Verify deployment completed successfully
2. Create CloudFront invalidation:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id $CLOUDFRONT_ID \
     --paths "/*"
   ```
3. Clear browser cache and test
4. Check S3 bucket has latest files

### Issue: Memory/CPU Spike

**Symptoms:**
- High CPU/memory alerts
- Service becoming unresponsive
- Auto-scaling triggered

**Diagnosis:**
```bash
# Check ECS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=hz-navigator-production-backend-service Name=ClusterName,Value=hz-navigator-production-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average
```

**Resolution:**
1. Check for traffic spike
2. Review recent deployments for memory leaks
3. Scale up ECS tasks
4. If persistent, investigate with profiling
5. Consider increasing task size

---

## Maintenance Procedures

### Scaling ECS Tasks

```bash
# Scale up
aws ecs update-service \
  --cluster hz-navigator-production-cluster \
  --service hz-navigator-production-backend-service \
  --desired-count 5

# Verify
aws ecs describe-services \
  --cluster hz-navigator-production-cluster \
  --services hz-navigator-production-backend-service \
  --query 'services[0].runningCount'
```

### Database Maintenance

```bash
# Create manual snapshot
aws rds create-db-snapshot \
  --db-instance-identifier hz-navigator-production-postgres \
  --db-snapshot-identifier manual-snapshot-$(date +%Y%m%d)

# Check snapshot status
aws rds describe-db-snapshots \
  --db-snapshot-identifier manual-snapshot-$(date +%Y%m%d)
```

### Rotate Secrets

```bash
# Update database password
aws secretsmanager rotate-secret \
  --secret-id hz-navigator-production/database/credentials

# Restart ECS tasks to pick up new credentials
aws ecs update-service \
  --cluster hz-navigator-production-cluster \
  --service hz-navigator-production-backend-service \
  --force-new-deployment
```

### SSL Certificate Renewal

ACM certificates auto-renew. To check status:

```bash
aws acm describe-certificate \
  --certificate-arn $CERTIFICATE_ARN \
  --query 'Certificate.{Status:Status,NotAfter:NotAfter,RenewalEligibility:RenewalEligibility}'
```

---

## Monitoring & Alerting

### CloudWatch Alarms

| Alarm | Threshold | Action |
|-------|-----------|--------|
| API 5xx Errors | > 10/min | Check logs, rollback if needed |
| API Latency P95 | > 2s | Scale up, check DB |
| ECS CPU | > 80% | Auto-scale triggers |
| ECS Memory | > 90% | Check for leaks |
| RDS CPU | > 80% | Optimize queries |
| RDS Connections | > 80% | Check connection pool |
| Redis Memory | > 80% | Increase eviction |

### Sentry Alerts

- **New Error**: New error type detected
- **Error Spike**: 10x increase in error rate
- **Performance Regression**: P95 latency increase

### Uptime Monitoring

- **Health Check**: https://api.hz-navigator.com/api/v1/health
- **Frequency**: Every 1 minute
- **Alert**: If 3 consecutive failures

---

## Escalation Paths

### Level 1: On-Call Engineer
- First responder
- Handles SEV3/SEV4 issues
- Escalates if unable to resolve in 30 minutes

### Level 2: Senior Engineer
- Handles SEV2 issues
- Deep debugging
- Escalates to L3 if needed

### Level 3: Engineering Lead
- Handles SEV1 issues
- Cross-team coordination
- Executive communication

### Contact List

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Primary On-Call | | | |
| Secondary On-Call | | | |
| Engineering Lead | | | |
| DevOps Lead | | | |
| Product Manager | | | |

---

## Appendix

### Useful AWS CLI Commands

```bash
# Get ECS task ARNs
aws ecs list-tasks --cluster hz-navigator-production-cluster --service-name hz-navigator-production-backend-service

# Describe specific task
aws ecs describe-tasks --cluster hz-navigator-production-cluster --tasks $TASK_ARN

# Get task logs
aws logs get-log-events --log-group-name /ecs/hz-navigator-production/backend --log-stream-name $LOG_STREAM

# List recent deployments
aws ecs list-task-definitions --family-prefix hz-navigator-production-backend --sort DESC --max-items 5

# Check ALB health
aws elbv2 describe-target-health --target-group-arn $TARGET_GROUP_ARN

# RDS Performance Insights
aws pi get-resource-metrics --service-type RDS --identifier $RDS_RESOURCE_ID --metric-queries file://metrics.json
```

### Log Analysis Queries

```
# Find errors in the last hour
fields @timestamp, @message
| filter @message like /error|Error|ERROR/
| sort @timestamp desc
| limit 100

# Count errors by type
fields @timestamp, @message
| filter @message like /error/i
| stats count(*) as errorCount by bin(1h)

# Find slow requests
fields @timestamp, @message, responseTime
| filter responseTime > 1000
| sort responseTime desc
| limit 50
```

---

*Last Updated: _______________*
*Version: 1.0*

