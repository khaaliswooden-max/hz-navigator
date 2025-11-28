# HZ-Navigator Pre-Launch Checklist

> **Launch Date:** _______________
> **Launch Time:** _______________ (recommend low-traffic hours: 2-6 AM EST)
> **Team On-Call:** _______________

## 🚀 Launch Readiness Overview

| Category | Status | Owner | Notes |
|----------|--------|-------|-------|
| Infrastructure | ⬜ | DevOps | |
| Application | ⬜ | Backend/Frontend | |
| Security | ⬜ | Security | |
| Monitoring | ⬜ | DevOps | |
| Documentation | ⬜ | Product | |
| Legal/Compliance | ⬜ | Legal | |
| Support | ⬜ | Support | |

---

## 1. Pre-Launch Verification

### 1.1 Testing & Quality

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| All unit tests passing | ⬜ | | |
| All integration tests passing | ⬜ | | |
| All E2E tests passing | ⬜ | | |
| Security scan completed (OWASP ZAP) | ⬜ | | |
| Dependency vulnerability scan clear | ⬜ | | |
| Performance testing passed (k6 load tests) | ⬜ | | |
| API contract tests passing | ⬜ | | |
| Browser compatibility verified | ⬜ | | |
| Mobile responsiveness verified | ⬜ | | |
| Accessibility audit (WCAG 2.1 AA) | ⬜ | | |

### 1.2 Infrastructure

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| VPC and networking configured | ⬜ | | |
| RDS PostgreSQL deployed (Multi-AZ) | ⬜ | | |
| PostGIS extension installed | ⬜ | | |
| Read replica configured | ⬜ | | |
| ElastiCache Redis deployed | ⬜ | | |
| ECS Fargate cluster running | ⬜ | | |
| Auto-scaling configured and tested | ⬜ | | |
| ALB health checks passing | ⬜ | | |
| S3 buckets configured | ⬜ | | |
| CloudFront distributions active | ⬜ | | |
| NAT Gateway configured | ⬜ | | |

### 1.3 Security & SSL

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| SSL certificates installed (ACM) | ⬜ | | |
| HTTPS enforced (HTTP redirects) | ⬜ | | |
| Security headers configured | ⬜ | | |
| WAF rules configured | ⬜ | | |
| CORS properly configured | ⬜ | | |
| Rate limiting enabled | ⬜ | | |
| SQL injection protection verified | ⬜ | | |
| XSS protection verified | ⬜ | | |
| CSRF protection enabled | ⬜ | | |
| Secrets in AWS Secrets Manager | ⬜ | | |
| IAM roles least-privilege | ⬜ | | |

### 1.4 DNS & Domain

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| Domain registered and verified | ⬜ | | |
| DNS records configured | ⬜ | | |
| - A record for api.domain.com → ALB | ⬜ | | |
| - A record for app.domain.com → CloudFront | ⬜ | | |
| - A record for tiles.domain.com → CloudFront | ⬜ | | |
| Certificate validation complete | ⬜ | | |
| DNS propagation verified | ⬜ | | |
| DNSSEC enabled (if applicable) | ⬜ | | |

### 1.5 Database & Data

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| Database backups configured | ⬜ | | |
| Point-in-time recovery enabled | ⬜ | | |
| All migrations applied | ⬜ | | |
| HUBZone map data loaded (~7,000 tracts) | ⬜ | | |
| PostGIS spatial queries verified | ⬜ | | |
| Database indexes optimized | ⬜ | | |
| Connection pooling configured | ⬜ | | |
| Sample test data removed | ⬜ | | |

### 1.6 Environment Configuration

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| Production environment variables set | ⬜ | | |
| NODE_ENV=production | ⬜ | | |
| DATABASE_URL configured | ⬜ | | |
| REDIS_URL configured | ⬜ | | |
| JWT_SECRET set (strong, unique) | ⬜ | | |
| AWS credentials configured | ⬜ | | |
| Email service configured (SES) | ⬜ | | |
| Sentry DSN configured | ⬜ | | |
| Feature flags configured | ⬜ | | |

### 1.7 External Services

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| Email service configured (SES/SendGrid) | ⬜ | | |
| Email templates tested | ⬜ | | |
| Email deliverability verified | ⬜ | | |
| SMS service configured (Twilio - optional) | ⬜ | | |
| PDF generation service working | ⬜ | | |
| OCR service configured (if used) | ⬜ | | |
| Map tile service configured | ⬜ | | |

---

## 2. Smoke Tests (Production)

> Run these tests on production after deployment, before public announcement.

### 2.1 Critical Path Tests

| Test | Expected Result | Status | Notes |
|------|-----------------|--------|-------|
| **Homepage** | | | |
| Homepage loads in < 3s | ⬜ Pass / ⬜ Fail | | |
| All assets load (images, CSS, JS) | ⬜ Pass / ⬜ Fail | | |
| No console errors | ⬜ Pass / ⬜ Fail | | |
| **Authentication** | | | |
| Registration with valid data | ⬜ Pass / ⬜ Fail | | |
| Email verification received | ⬜ Pass / ⬜ Fail | | |
| Login with credentials | ⬜ Pass / ⬜ Fail | | |
| Password reset flow | ⬜ Pass / ⬜ Fail | | |
| Logout functionality | ⬜ Pass / ⬜ Fail | | |
| **HUBZone Verification** | | | |
| Address lookup works | ⬜ Pass / ⬜ Fail | | |
| Map displays correctly | ⬜ Pass / ⬜ Fail | | |
| HUBZone boundaries visible | ⬜ Pass / ⬜ Fail | | |
| Geocoding returns results | ⬜ Pass / ⬜ Fail | | |
| Spatial query returns correct zone | ⬜ Pass / ⬜ Fail | | |
| **Business Management** | | | |
| Create business | ⬜ Pass / ⬜ Fail | | |
| Edit business details | ⬜ Pass / ⬜ Fail | | |
| Add business location | ⬜ Pass / ⬜ Fail | | |
| **Employee Management** | | | |
| Add employee | ⬜ Pass / ⬜ Fail | | |
| Edit employee details | ⬜ Pass / ⬜ Fail | | |
| Import employees (CSV) | ⬜ Pass / ⬜ Fail | | |
| **Compliance** | | | |
| Compliance calculation runs | ⬜ Pass / ⬜ Fail | | |
| 35% residency rule calculated | ⬜ Pass / ⬜ Fail | | |
| Compliance status displayed | ⬜ Pass / ⬜ Fail | | |
| **Documents** | | | |
| Upload document | ⬜ Pass / ⬜ Fail | | |
| Download document | ⬜ Pass / ⬜ Fail | | |
| View document preview | ⬜ Pass / ⬜ Fail | | |
| PDF generation works | ⬜ Pass / ⬜ Fail | | |
| **API Health** | | | |
| /api/v1/health returns 200 | ⬜ Pass / ⬜ Fail | | |
| Response time < 200ms | ⬜ Pass / ⬜ Fail | | |

### 2.2 Edge Cases

| Test | Expected Result | Status |
|------|-----------------|--------|
| Invalid login (wrong password) | Error message shown | ⬜ |
| Invalid address lookup | Graceful error handling | ⬜ |
| Large file upload (>10MB) | Size limit enforced | ⬜ |
| Concurrent user sessions | Both sessions work | ⬜ |
| Session timeout handling | Redirects to login | ⬜ |
| Rate limit exceeded | 429 response | ⬜ |

---

## 3. Monitoring Setup

### 3.1 Application Monitoring

| Item | Service | Status | Notes |
|------|---------|--------|-------|
| Error tracking | Sentry | ⬜ | |
| APM (Application Performance) | CloudWatch/Datadog | ⬜ | |
| Real User Monitoring (RUM) | CloudWatch RUM | ⬜ | |
| Custom business metrics | CloudWatch | ⬜ | |
| Log aggregation | CloudWatch Logs | ⬜ | |

### 3.2 Infrastructure Monitoring

| Item | Metric | Alert Threshold | Status |
|------|--------|-----------------|--------|
| ECS CPU utilization | CPUUtilization | > 80% | ⬜ |
| ECS memory utilization | MemoryUtilization | > 85% | ⬜ |
| ECS running task count | RunningTaskCount | < 2 | ⬜ |
| RDS CPU utilization | CPUUtilization | > 80% | ⬜ |
| RDS connections | DatabaseConnections | > 150 | ⬜ |
| RDS free storage | FreeStorageSpace | < 10GB | ⬜ |
| RDS replica lag | ReplicaLag | > 60s | ⬜ |
| Redis CPU | CPUUtilization | > 75% | ⬜ |
| Redis memory | DatabaseMemoryUsagePercentage | > 80% | ⬜ |
| ALB 5XX errors | HTTPCode_ELB_5XX_Count | > 10/5min | ⬜ |
| ALB latency (p95) | TargetResponseTime | > 2s | ⬜ |
| ALB unhealthy hosts | UnHealthyHostCount | > 0 | ⬜ |
| CloudFront error rate | 5xxErrorRate | > 5% | ⬜ |

### 3.3 Uptime Monitoring

| Item | Service | Frequency | Status |
|------|---------|-----------|--------|
| API health check | Pingdom/UptimeRobot | 1 min | ⬜ |
| Frontend availability | Pingdom/UptimeRobot | 1 min | ⬜ |
| Database connectivity | CloudWatch | 1 min | ⬜ |
| Redis connectivity | CloudWatch | 1 min | ⬜ |
| SSL certificate expiry | CloudWatch | Daily | ⬜ |

### 3.4 Alerting

| Alert | Channel | On-Call | Status |
|-------|---------|---------|--------|
| Critical (P1) | PagerDuty + Slack | Immediate | ⬜ |
| High (P2) | Slack + Email | 15 min | ⬜ |
| Medium (P3) | Email | 1 hour | ⬜ |
| Low (P4) | Email (daily digest) | Next business day | ⬜ |

---

## 4. Documentation

### 4.1 Technical Documentation

| Document | Location | Status | Last Updated |
|----------|----------|--------|--------------|
| API Documentation (OpenAPI/Swagger) | /docs/api | ⬜ | |
| Architecture Overview | /docs/ARCHITECTURE.md | ⬜ | |
| Database Schema | /docs/DATABASE.md | ⬜ | |
| Deployment Guide | /docs/DEPLOYMENT.md | ⬜ | |
| Development Guide | /docs/DEVELOPMENT.md | ⬜ | |
| Security Guide | /docs/SECURITY.md | ⬜ | |
| Runbook (Incident Response) | /docs/RUNBOOK.md | ⬜ | |

### 4.2 User Documentation

| Document | Location | Status |
|----------|----------|--------|
| User Guide | Help Center | ⬜ |
| Admin Guide | Help Center | ⬜ |
| Quick Start Guide | In-app | ⬜ |
| Video Tutorials | YouTube/Vimeo | ⬜ |
| FAQ Page | /faq | ⬜ |
| Knowledge Base | Help Center | ⬜ |

---

## 5. Support Setup

| Item | Service/Tool | Status | Notes |
|------|--------------|--------|-------|
| Help desk system | Zendesk/Intercom | ⬜ | |
| Support email (support@domain.com) | SES | ⬜ | |
| Live chat widget | Intercom | ⬜ | |
| Support ticket workflow | Configured | ⬜ | |
| Escalation procedures | Documented | ⬜ | |
| Support team trained | Completed | ⬜ | |
| Canned responses created | Completed | ⬜ | |
| SLA defined | Documented | ⬜ | |

---

## 6. Legal & Compliance

### 6.1 Legal Documents

| Document | URL | Status | Legal Review |
|----------|-----|--------|--------------|
| Privacy Policy | /privacy | ⬜ | ⬜ |
| Terms of Service | /terms | ⬜ | ⬜ |
| Cookie Policy | /cookies | ⬜ | ⬜ |
| Acceptable Use Policy | /acceptable-use | ⬜ | ⬜ |
| Data Processing Agreement | On request | ⬜ | ⬜ |

### 6.2 Compliance

| Requirement | Status | Evidence |
|-------------|--------|----------|
| GDPR compliance (if applicable) | ⬜ | |
| - Data subject rights implemented | ⬜ | |
| - Consent management | ⬜ | |
| - Data export capability | ⬜ | |
| - Right to deletion | ⬜ | |
| Section 508 accessibility | ⬜ | |
| - Screen reader compatible | ⬜ | |
| - Keyboard navigation | ⬜ | |
| - Color contrast (4.5:1) | ⬜ | |
| SOC 2 Type II (future) | ⬜ | |
| PCI DSS (if payment) | ⬜ | |

---

## 7. Marketing & Launch

### 7.1 Pre-Launch

| Item | Owner | Status | Date |
|------|-------|--------|------|
| Landing page live | Marketing | ⬜ | |
| SEO optimization | Marketing | ⬜ | |
| Social media accounts ready | Marketing | ⬜ | |
| Email templates designed | Marketing | ⬜ | |
| Press release drafted | Marketing | ⬜ | |
| Blog post written | Marketing | ⬜ | |
| Demo video created | Marketing | ⬜ | |

### 7.2 Launch Day

| Item | Time | Owner | Status |
|------|------|-------|--------|
| Final smoke test | T-2h | Engineering | ⬜ |
| Deploy to production | T-1h | DevOps | ⬜ |
| Verify deployment | T-30m | Engineering | ⬜ |
| Remove maintenance page | T-0 | DevOps | ⬜ |
| Send announcement email | T+30m | Marketing | ⬜ |
| Publish blog post | T+30m | Marketing | ⬜ |
| Social media posts | T+1h | Marketing | ⬜ |
| Send press release | T+2h | Marketing | ⬜ |

---

## 8. Post-Launch

### 8.1 First 24 Hours

| Item | Frequency | Owner | Status |
|------|-----------|-------|--------|
| Monitor error rates | Continuous | DevOps | ⬜ |
| Monitor performance metrics | Continuous | DevOps | ⬜ |
| Check CloudWatch alarms | Every 30min | DevOps | ⬜ |
| Review Sentry errors | Every hour | Engineering | ⬜ |
| Monitor user registrations | Every hour | Product | ⬜ |
| Respond to support tickets | As received | Support | ⬜ |
| Team standup | Every 4 hours | All | ⬜ |

### 8.2 First Week

| Item | Owner | Status |
|------|-------|--------|
| Collect user feedback | Product | ⬜ |
| Analyze usage metrics | Product | ⬜ |
| Hot-fix critical bugs | Engineering | ⬜ |
| Performance optimization | Engineering | ⬜ |
| Post-mortem meeting | All | ⬜ |
| Update documentation | All | ⬜ |
| Plan next iteration | Product | ⬜ |

---

## 9. Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Engineering Lead | | | |
| DevOps Lead | | | |
| Product Owner | | | |
| Security Contact | | | |
| AWS Support | | | Case via Console |
| Domain Registrar | | | |

---

## 10. Rollback Plan

### Trigger Conditions
- Error rate > 5% for 15 minutes
- Response time > 5s (p95) for 15 minutes
- Critical functionality broken
- Data integrity issues

### Rollback Steps
1. **Immediate**: Route traffic to maintenance page
2. **Backend**: Rollback to previous ECS task definition
3. **Frontend**: Restore from S3 backup
4. **Database**: Point-in-time recovery (if needed)
5. **Verify**: Run smoke tests on rolled-back version
6. **Communicate**: Notify stakeholders

### Commands
```bash
# Backend rollback
aws ecs update-service --cluster hz-navigator-production-cluster \
  --service hz-navigator-production-backend-service \
  --task-definition hz-navigator-production-backend:PREVIOUS_REVISION

# Frontend rollback
aws s3 sync s3://hz-navigator-frontend-production-backups/BACKUP_ID/ \
  s3://hz-navigator-frontend-production/ --delete

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID --paths "/*"
```

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | | | |
| DevOps Lead | | | |
| QA Lead | | | |
| Product Owner | | | |
| Security | | | |

---

**Launch is GO when all critical items are checked and signed off.**

