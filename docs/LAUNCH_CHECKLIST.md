# HZ Navigator - Production Launch Checklist

## Overview

This checklist ensures all systems are ready for production launch. Complete all items before going live.

**Target Launch Date:** _______________  
**Launch Time:** _____________ (recommend low-traffic hours: 2-4 AM EST)  
**Team On-Call:** _______________

---

## 1. Pre-Launch Verification

### Infrastructure
- [ ] AWS infrastructure deployed via Terraform
- [ ] VPC and subnets configured correctly
- [ ] Security groups properly restricted
- [ ] NAT gateways operational
- [ ] VPC Flow Logs enabled

### Database
- [ ] RDS PostgreSQL instance running
- [ ] Multi-AZ enabled
- [ ] Automated backups configured (daily, 7-day retention)
- [ ] Read replica created and synced
- [ ] PostGIS extension installed and working
- [ ] Connection pooling configured
- [ ] Database credentials in Secrets Manager

### Application
- [ ] ECS cluster healthy
- [ ] All tasks running (min 2 instances)
- [ ] Auto-scaling configured (2-10 tasks)
- [ ] Health checks passing
- [ ] CloudWatch Logs streaming

### Load Balancer
- [ ] ALB configured and healthy
- [ ] SSL certificate installed (ACM)
- [ ] HTTP → HTTPS redirect working
- [ ] WAF rules enabled
- [ ] Target group health checks passing

### CDN & Storage
- [ ] S3 buckets created (documents, frontend, map-tiles)
- [ ] CloudFront distributions configured
- [ ] SSL certificates for CloudFront
- [ ] CORS configured correctly
- [ ] Cache invalidation tested

### Cache
- [ ] ElastiCache Redis cluster running
- [ ] Both nodes healthy
- [ ] Auth token configured
- [ ] Connection from ECS verified

---

## 2. Security Verification

### SSL/TLS
- [ ] SSL certificate valid (not expiring soon)
- [ ] TLS 1.2+ enforced
- [ ] HSTS enabled
- [ ] Certificate auto-renewal configured

### Security Scanning
- [ ] OWASP ZAP scan completed
- [ ] No critical vulnerabilities
- [ ] Dependency audit passed (npm audit)
- [ ] Secrets scan passed (no leaked credentials)
- [ ] Container image scan passed

### Access Control
- [ ] IAM roles follow least privilege
- [ ] MFA enabled for AWS console access
- [ ] API authentication working
- [ ] Rate limiting configured
- [ ] CORS properly configured

---

## 3. Environment Configuration

### Environment Variables
- [ ] All production env vars set in Secrets Manager
- [ ] DATABASE_URL configured
- [ ] REDIS_URL configured
- [ ] JWT_SECRET set (strong random value)
- [ ] ENCRYPTION_KEY set
- [ ] AWS credentials configured
- [ ] Sentry DSN configured
- [ ] Email service credentials set

### Domain Configuration
- [ ] Domain registered and verified
- [ ] DNS records configured
  - [ ] A record for apex domain → CloudFront
  - [ ] CNAME for www → CloudFront
  - [ ] CNAME for api → ALB
  - [ ] CNAME for tiles → CloudFront
- [ ] DNS propagation complete
- [ ] SSL certificates validated

---

## 4. External Services

### Email Service (SES/SendGrid)
- [ ] Email service account created
- [ ] Domain verified
- [ ] DKIM configured
- [ ] SPF records added
- [ ] Test email sent successfully
- [ ] Production access requested (SES sandbox lifted)

### Error Tracking (Sentry)
- [ ] Sentry project created
- [ ] DSN configured in frontend
- [ ] DSN configured in backend
- [ ] Source maps uploaded
- [ ] Alert rules configured
- [ ] Team members invited

### Monitoring (Datadog/New Relic - optional)
- [ ] Account created
- [ ] Agent installed
- [ ] Dashboards created
- [ ] Alerts configured

### Uptime Monitoring
- [ ] Pingdom/UptimeRobot configured
- [ ] Health check endpoint monitored
- [ ] Homepage monitored
- [ ] Alert contacts configured

---

## 5. Data Preparation

### HUBZone Map Data
- [ ] Census tract data downloaded
- [ ] ~7000 tracts loaded into database
- [ ] Spatial indexes created
- [ ] Verification queries passing
- [ ] Map tiles generated and cached

### Test Data Cleanup
- [ ] All test data removed from production
- [ ] Test users deleted
- [ ] Sample businesses removed

---

## 6. Testing Verification

### Automated Tests
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] Test coverage meets threshold (>80%)

### Performance Tests
- [ ] Load test completed (K6)
- [ ] Response times within SLA (<500ms p95)
- [ ] Database queries optimized
- [ ] No memory leaks detected
- [ ] Auto-scaling verified under load

### Security Tests
- [ ] Penetration test completed
- [ ] SQL injection tests passed
- [ ] XSS tests passed
- [ ] CSRF protection verified
- [ ] Authentication bypass tests passed

---

## 7. Documentation

- [ ] API documentation complete (OpenAPI/Swagger)
- [ ] User guide created
- [ ] Admin guide created
- [ ] Deployment guide updated
- [ ] Runbook for incidents created
- [ ] Architecture documentation current

---

## 8. Legal & Compliance

- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Cookie Policy published
- [ ] Cookie consent banner implemented
- [ ] GDPR compliance verified (if applicable)
- [ ] Section 508 accessibility compliance
- [ ] Accessibility audit completed

---

## 9. Support Readiness

- [ ] Support email configured
- [ ] Help desk system ready (Zendesk/Intercom)
- [ ] Knowledge base articles written
- [ ] FAQ page published
- [ ] Contact form working
- [ ] Support team trained

---

## 10. Backup & Recovery

- [ ] Database backup tested
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented
- [ ] RTO/RPO defined and achievable
- [ ] Rollback procedure tested

---

## Launch Day Procedure

### T-24 Hours
- [ ] Notify team of launch window
- [ ] Verify all checklist items complete
- [ ] Run final smoke tests on staging
- [ ] Confirm on-call schedule

### T-4 Hours
- [ ] Deploy latest code to production
- [ ] Run database migrations
- [ ] Clear all caches
- [ ] Verify health checks

### T-1 Hour
- [ ] Final smoke tests on production
- [ ] Verify monitoring is active
- [ ] Confirm team is on standby
- [ ] Prepare rollback if needed

### Launch (T-0)
- [ ] Update DNS to point to production (if not already)
- [ ] Enable public access
- [ ] Monitor error rates
- [ ] Monitor response times

### T+1 Hour
- [ ] Check error tracking (Sentry)
- [ ] Review application logs
- [ ] Check database metrics
- [ ] Verify auto-scaling

### T+24 Hours
- [ ] Review all metrics
- [ ] Check user signups
- [ ] Address any issues
- [ ] Send launch announcement

---

## Smoke Tests (Production)

Run these tests immediately after launch:

| Test | Status | Notes |
|------|--------|-------|
| Homepage loads | [ ] | |
| Registration flow | [ ] | |
| Email verification | [ ] | |
| Login flow | [ ] | |
| Password reset | [ ] | |
| Address verification | [ ] | |
| Map loads correctly | [ ] | |
| HUBZone lookup works | [ ] | |
| Business creation | [ ] | |
| Employee management | [ ] | |
| Compliance calculation | [ ] | |
| Document upload | [ ] | |
| PDF generation | [ ] | |
| Admin dashboard | [ ] | |
| API health check | [ ] | |

---

## Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Tech Lead | | | |
| DevOps | | | |
| DBA | | | |
| Product Owner | | | |
| Support Lead | | | |

---

## Rollback Procedure

If critical issues are detected:

1. **Assess severity** - Is it blocking all users?
2. **Decide action** - Hot-fix or rollback?
3. **Execute rollback** (if needed):
   ```bash
   gh workflow run rollback.yml \
     -f component=both \
     -f environment=production \
     -f reason="Critical bug: [description]"
   ```
4. **Notify team** via Slack
5. **Investigate** root cause
6. **Schedule post-mortem**

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | | | |
| QA Lead | | | |
| Security Lead | | | |
| Product Owner | | | |
| Operations Lead | | | |

**Launch Approved:** [ ] Yes [ ] No

---

*Last Updated: _______________*

