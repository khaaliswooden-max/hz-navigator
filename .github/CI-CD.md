# HZ Navigator CI/CD Documentation

## Overview

This document describes the CI/CD pipeline architecture for HZ Navigator, including workflows, deployment stages, and operational procedures.

## Pipeline Architecture

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                    GitHub Actions                            │
                                    │                                                              │
    Developer                       │  ┌─────────────────────────────────────────────────────┐   │
        │                           │  │                  Pull Request                        │   │
        │ Push to                   │  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
        │ feature branch            │  │  │  Lint    │  │  Test    │  │  Security Scan   │  │   │
        │                           │  │  └──────────┘  └──────────┘  └──────────────────┘  │   │
        ▼                           │  └─────────────────────────────────────────────────────┘   │
┌───────────────┐                   │                           │                                │
│  Pull Request │───────────────────┼───────────────────────────┘                                │
└───────────────┘                   │                                                            │
        │                           │  ┌─────────────────────────────────────────────────────┐   │
        │ Merge to                  │  │               Merge to main/develop                  │   │
        │ main                      │  │                                                      │   │
        ▼                           │  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
┌───────────────┐                   │  │  │  Build   │──│  Push    │──│  Deploy Staging  │  │   │
│  main branch  │───────────────────┼──│  │  Docker  │  │  to ECR  │  │                  │  │   │
└───────────────┘                   │  │  └──────────┘  └──────────┘  └────────┬─────────┘  │   │
                                    │  │                                       │            │   │
                                    │  │                               ┌───────▼─────────┐  │   │
                                    │  │                               │ Manual Approval │  │   │
                                    │  │                               │  (Production)   │  │   │
                                    │  │                               └───────┬─────────┘  │   │
                                    │  │                                       │            │   │
                                    │  │                               ┌───────▼─────────┐  │   │
                                    │  │                               │ Deploy Prod     │  │   │
                                    │  │                               │ (Blue/Green)    │  │   │
                                    │  │                               └─────────────────┘  │   │
                                    │  └─────────────────────────────────────────────────────┘   │
                                    └────────────────────────────────────────────────────────────┘
```

## Workflows

### 1. Pull Request Tests (`test.yml`)

**Triggers:** Pull requests to `main` or `develop`

**Jobs:**
- Detect changed files
- Backend tests (if backend changed)
- Frontend tests (if frontend changed)
- E2E tests (if significant changes)
- Security scan
- Post summary comment

### 2. Backend CI/CD (`backend.yml`)

**Triggers:** Push to `main` or `develop` (backend changes)

**Jobs:**
1. **Test**: Lint, type check, unit tests, integration tests
2. **Build**: Build Docker image, push to ECR
3. **Deploy Staging**: Run migrations, deploy to ECS, health check
4. **Deploy Production**: (Manual approval) Migrations, Blue/Green deploy

### 3. Frontend CI/CD (`frontend.yml`)

**Triggers:** Push to `main` or `develop` (frontend changes)

**Jobs:**
1. **Test**: Lint, type check, unit tests
2. **Build**: Build production bundles for each environment
3. **Deploy Staging**: Sync to S3, invalidate CloudFront
4. **Deploy Production**: (Manual approval) Backup, sync, invalidate
5. **Lighthouse Audit**: Performance metrics

### 4. Manual Deployment (`deploy.yml`)

**Triggers:** Manual workflow dispatch

**Options:**
- Component: backend, frontend, both
- Environment: development, staging, production
- Version: specific tag or latest
- Dry run mode

### 5. Database Migration (`database-migration.yml`)

**Triggers:** Manual workflow dispatch

**Options:**
- Environment: development, staging, production
- Action: up, down, status, redo
- Count: number of migrations
- Dry run mode

### 6. Rollback (`rollback.yml`)

**Triggers:** Manual workflow dispatch

**Options:**
- Component: backend, frontend, both
- Environment: staging, production
- Specific revision/backup to restore
- Reason (required)

### 7. Scheduled Tasks (`scheduled-tasks.yml`)

**Triggers:** Cron schedule

**Tasks:**
- Daily: Cleanup old resources
- Weekly: Security scan
- Monthly: Dependency check

## Deployment Stages

### Development
- Auto-deploy on push to `develop`
- No approval required
- Relaxed health checks
- Fast iteration

### Staging
- Auto-deploy on push to `main`
- No approval required
- Production-like environment
- Full testing before production

### Production
- Manual approval required
- Blue/Green deployment
- Automatic rollback on failure
- Post-deployment verification

## Environment Variables

### Build-time Variables

| Variable | Description | Set During |
|----------|-------------|------------|
| `VITE_API_URL` | Backend API URL | Build |
| `VITE_MAP_TILES_URL` | Map tiles CDN URL | Build |
| `VITE_ENVIRONMENT` | Environment name | Build |
| `VITE_SENTRY_DSN` | Sentry DSN | Build |
| `VITE_VERSION` | Git commit SHA | Build |

### Runtime Variables (ECS)

| Variable | Description | Source |
|----------|-------------|--------|
| `NODE_ENV` | Environment | Task definition |
| `DATABASE_URL` | DB connection string | Secrets Manager |
| `REDIS_HOST` | Redis endpoint | Task definition |
| `JWT_SECRET` | JWT signing key | Secrets Manager |
| `S3_DOCUMENTS_BUCKET` | S3 bucket name | Task definition |

## Rollback Procedures

### Automatic Rollback

ECS automatically rolls back if:
- Health checks fail during deployment
- Service doesn't stabilize within timeout
- CodeDeploy detects failures (production)

### Manual Rollback - Backend

1. Go to Actions → Rollback Deployment
2. Select `backend`, environment, and revision
3. Provide rollback reason
4. Execute

Or via CLI:
```bash
aws ecs update-service \
  --cluster hz-navigator-production-cluster \
  --service hz-navigator-production-backend-service \
  --task-definition hz-navigator-production-backend:PREVIOUS_REVISION \
  --force-new-deployment
```

### Manual Rollback - Frontend

1. Go to Actions → Rollback Deployment
2. Select `frontend`, environment, and backup number
3. Provide rollback reason
4. Execute

Or via CLI:
```bash
# Restore from backup
aws s3 sync s3://frontend-bucket-backups/backup-NUMBER/ s3://frontend-bucket/ --delete

# Invalidate cache
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
```

## Database Migrations

### Running Migrations

Via GitHub Actions:
1. Go to Actions → Database Migration
2. Select environment and action
3. Optionally enable dry run
4. Execute

Via CLI:
```bash
cd backend
DATABASE_URL=your-connection-string npm run migrate:up
```

### Creating New Migrations

```bash
cd backend
npm run migrate:create -- migration_name
```

### Rollback Migrations

```bash
# Rollback 1 migration
npm run migrate:down

# Rollback specific count
npm run migrate:down -- --count 3
```

## Monitoring Deployments

### CloudWatch Dashboards

- ECS service metrics
- ALB request metrics
- RDS performance
- Redis metrics

### Alerts

Configured alerts for:
- Deployment failures (Slack)
- Health check failures
- High error rates
- Resource utilization

### Logs

- ECS: CloudWatch Logs `/ecs/hz-navigator-*/backend`
- ALB: S3 access logs
- CloudFront: S3 access logs

## Troubleshooting

### Deployment Stuck

1. Check ECS service events: `aws ecs describe-services --cluster CLUSTER --services SERVICE`
2. Check task logs in CloudWatch
3. Verify health check endpoint is responding
4. Check security group rules

### Build Failures

1. Check GitHub Actions logs
2. Verify secrets are configured
3. Check ECR repository exists
4. Verify IAM permissions

### Database Migration Failures

1. Check migration logs
2. Verify database connectivity
3. Check for conflicting migrations
4. Rollback if needed

### Frontend Not Updating

1. Verify S3 sync completed
2. Check CloudFront invalidation status
3. Clear browser cache
4. Check cache-control headers

## Security Considerations

1. **Credentials**: All secrets stored in GitHub Secrets
2. **IAM**: Least privilege permissions
3. **Network**: Private subnets for backend
4. **Encryption**: TLS everywhere, encryption at rest
5. **Scanning**: Weekly security scans
6. **Audit**: All deployments logged

## Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Deployment time | < 10 min | > 15 min |
| Health check response | < 500ms | > 2s |
| Frontend FCP | < 2s | > 3s |
| Frontend LCP | < 3s | > 4s |
| API p95 latency | < 500ms | > 2s |

## Contact

- **On-call**: Check PagerDuty schedule
- **Slack**: #hz-navigator-alerts
- **Documentation**: This file + AWS Console

