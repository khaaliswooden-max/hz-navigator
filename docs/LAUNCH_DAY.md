# HZ-Navigator Launch Day Playbook

> **Launch Date:** _______________
> **Launch Time:** _______________ (Recommended: 3-5 AM EST)
> **War Room:** _______________
> **On-Call Lead:** _______________

---

## 📋 Pre-Launch (T-24 hours)

### Team Preparation
- [ ] All team members confirmed availability
- [ ] War room (physical/virtual) set up
- [ ] Communication channels verified (Slack, Phone)
- [ ] Escalation contacts confirmed
- [ ] Rollback procedures reviewed

### Final Checks
- [ ] All staging tests passing
- [ ] Security scan completed
- [ ] Performance test results acceptable
- [ ] Database backups verified
- [ ] Monitoring dashboards ready
- [ ] Status page prepared

---

## 🚀 Launch Timeline

### T-4 hours: Final Preparation

```
□ Engineering lead confirms GO/NO-GO
□ DevOps confirms infrastructure ready
□ QA confirms staging sign-off
□ Product confirms feature completeness
```

### T-2 hours: Deploy to Production

```bash
# 1. Create database backup
aws rds create-db-snapshot \
  --db-instance-identifier hz-navigator-production-postgres \
  --db-snapshot-identifier pre-launch-$(date +%Y%m%d-%H%M%S)

# 2. Deploy backend
gh workflow run backend.yml -f environment=production

# 3. Wait for backend deployment
# Monitor: https://github.com/ORG/hz-navigator/actions

# 4. Deploy frontend
gh workflow run frontend.yml -f environment=production

# 5. Wait for frontend deployment + CloudFront invalidation
```

### T-1 hour: Verification

```bash
# Run smoke tests
npx ts-node scripts/smoke-test.ts --env production --verbose

# Manual verification checklist:
□ Homepage loads correctly
□ Login works
□ Registration works
□ HUBZone check works
□ Map displays correctly
□ Business creation works
□ Employee management works
□ Compliance calculation works
□ Document upload works
```

### T-30 minutes: Final Go/No-Go

```
□ All smoke tests passing
□ Error rate < 0.1%
□ Response time < 500ms (p95)
□ All team members confirm ready
□ GO/NO-GO decision by Engineering Lead
```

### T-0: Launch! 🎉

```
□ Remove maintenance page (if any)
□ Update status page to "Operational"
□ Start monitoring dashboards
□ Team standup in war room
```

### T+30 minutes: Initial Monitoring

```
□ Error rate stable
□ Response time stable
□ No critical alerts
□ User registrations working
□ First user feedback reviewed
```

### T+1 hour: Marketing Activation

```
□ Send announcement email to waitlist
□ Publish blog post
□ Update social media
□ Notify press contacts
```

---

## 📊 Monitoring Checklist

### Every 15 minutes (first 2 hours)

| Metric | Target | Actual |
|--------|--------|--------|
| Error rate | < 1% | |
| Response time (p95) | < 1s | |
| ECS task count | ≥ 2 | |
| RDS CPU | < 70% | |
| Redis memory | < 80% | |

### Dashboards to Watch

1. **CloudWatch Production Dashboard**
   - URL: https://console.aws.amazon.com/cloudwatch/...

2. **Sentry Error Dashboard**
   - URL: https://sentry.io/organizations/hz-navigator/...

3. **ALB Access Logs**
   - URL: CloudWatch Logs Insights

4. **Status Page**
   - URL: https://status.hz-navigator.com

---

## 🚨 Incident Response

### Severity Levels

| Level | Symptoms | Response |
|-------|----------|----------|
| **P1** | Service down, > 5% error rate | Immediate rollback |
| **P2** | Feature broken, > 2% error rate | Investigate, possible rollback |
| **P3** | Degraded performance | Monitor, fix forward |
| **P4** | Minor issues | Log for next release |

### Rollback Decision Tree

```
Is the service down?
├─ YES → ROLLBACK IMMEDIATELY
└─ NO
   └─ Is error rate > 5%?
      ├─ YES → ROLLBACK
      └─ NO
         └─ Is error rate > 2% for 15 min?
            ├─ YES → Consider rollback
            └─ NO → Monitor and investigate
```

### Rollback Commands

```bash
# Backend rollback
gh workflow run rollback.yml \
  -f environment=production \
  -f component=backend \
  -f reason="Launch issues"

# Frontend rollback
gh workflow run rollback.yml \
  -f environment=production \
  -f component=frontend \
  -f reason="Launch issues"

# Full rollback
gh workflow run rollback.yml \
  -f environment=production \
  -f component=both \
  -f reason="Launch issues"
```

---

## 📞 Communication Templates

### Internal Update (Every 30 min)

```
📊 HZ-Navigator Launch Update - [TIME]

Status: [GREEN/YELLOW/RED]

Metrics (last 30 min):
- Requests: X
- Error rate: X%
- Response time (p95): Xms
- New users: X

Issues:
- [None / List issues]

Next update: [TIME]
```

### External Status Update (If Issues)

```
🔔 HZ-Navigator Status Update

We are currently experiencing [ISSUE DESCRIPTION].

Impact: [WHO IS AFFECTED]

Our team is actively working on a resolution.

Expected resolution: [TIME or "We will provide updates"]

We apologize for any inconvenience.
```

### Resolution Announcement

```
✅ Issue Resolved

The issue affecting [SERVICE] has been resolved at [TIME].

Root cause: [BRIEF DESCRIPTION]

We apologize for any inconvenience. Please contact support@hz-navigator.com if you experience any issues.
```

---

## 📋 Post-Launch (T+24 hours)

### Immediate Follow-up

- [ ] Review all error logs
- [ ] Analyze performance metrics
- [ ] Compile user feedback
- [ ] Document any incidents
- [ ] Update runbook with learnings

### Post-Mortem (T+48 hours)

- [ ] Schedule post-mortem meeting
- [ ] Prepare incident timeline
- [ ] Identify root causes
- [ ] Define action items
- [ ] Update documentation

### Week 1 Goals

- [ ] Monitor error rates daily
- [ ] Respond to all support tickets
- [ ] Hot-fix critical issues
- [ ] Collect user feedback
- [ ] Plan iteration based on feedback

---

## 👥 Team Roster

| Role | Name | Phone | Availability |
|------|------|-------|--------------|
| Engineering Lead | | | T-4h to T+8h |
| DevOps Lead | | | T-4h to T+8h |
| Backend Engineer | | | T-2h to T+6h |
| Frontend Engineer | | | T-2h to T+6h |
| QA Lead | | | T-2h to T+4h |
| Product Owner | | | T-0 to T+4h |
| Support Lead | | | T+0 to T+12h |

---

## ✅ Success Criteria

The launch is considered successful when:

1. **Availability:** 99.9% uptime in first 24 hours
2. **Performance:** p95 response time < 1 second
3. **Errors:** Error rate < 0.5%
4. **User Experience:** No critical bugs reported
5. **Data:** No data loss or corruption

---

**Remember:** If in doubt, rollback first, ask questions later. User trust is more important than shipping on time.

Good luck! 🚀

