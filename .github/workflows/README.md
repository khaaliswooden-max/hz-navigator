# HZ-Navigator CI/CD Workflows

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflow Overview

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `backend.yml` | Push to main/develop | Build and deploy backend to ECS |
| `frontend.yml` | Push to main/develop | Build and deploy frontend to S3/CloudFront |
| `test.yml` | Pull requests | Run tests and linting |
| `rollback.yml` | Manual | Rollback deployments |
| `database-migrations.yml` | Manual | Manage database migrations |

## Quick Reference

### Automatic Deployments

| Branch | Environment | Approval |
|--------|-------------|----------|
| `develop` | development | No |
| `main` | staging | No |
| `main` (dispatch) | production | **Yes** |

### Manual Workflows

#### Deploy to Production

1. Go to **Actions** → **Backend CI/CD** (or Frontend CI/CD)
2. Click **Run workflow**
3. Select `production` environment
4. Click **Run workflow**
5. Approve the deployment when prompted

#### Rollback

1. Go to **Actions** → **Rollback Deployment**
2. Click **Run workflow**
3. Select environment and component
4. Provide reason
5. Click **Run workflow**

#### Database Migrations

1. Go to **Actions** → **Database Migrations**
2. Click **Run workflow**
3. Select environment and action (status/up/down/redo)
4. Click **Run workflow**

## Workflow Files

### `backend.yml`

Full backend CI/CD pipeline:

```yaml
Trigger: Push to main/develop, or manual dispatch

Jobs:
  1. lint-and-test     - Run linter and tests
  2. determine-env     - Determine target environment
  3. build             - Build and push Docker image to ECR
  4. migrate           - Run database migrations
  5. deploy-auto       - Deploy to dev/staging (automatic)
  6. deploy-production - Deploy to production (approval required)
```

### `frontend.yml`

Full frontend CI/CD pipeline:

```yaml
Trigger: Push to main/develop, or manual dispatch

Jobs:
  1. lint-and-test     - Run linter and tests
  2. determine-env     - Determine target environment
  3. build             - Build production bundle
  4. deploy-auto       - Deploy to dev/staging (automatic)
  5. deploy-production - Deploy to production (approval required)
```

### `test.yml`

PR validation pipeline:

```yaml
Trigger: Pull requests to main/develop

Jobs:
  1. changes        - Detect changed files
  2. backend-tests  - Run backend tests (if changed)
  3. frontend-tests - Run frontend tests (if changed)
  4. e2e-tests      - Run E2E tests (if any changes)
  5. security-scan  - Run security vulnerability scan
  6. summary        - Generate test summary
```

### `rollback.yml`

Manual rollback workflow:

```yaml
Trigger: Manual dispatch only

Inputs:
  - environment: development/staging/production
  - component: backend/frontend/both
  - backend_revision: ECS task revision (optional)
  - frontend_backup: S3 backup folder (optional)
  - reason: Rollback reason (required)

Jobs:
  1. validate          - Validate and log request
  2. rollback-backend  - Rollback ECS service
  3. rollback-frontend - Restore S3 from backup
  4. summary           - Generate rollback summary
```

### `database-migrations.yml`

Database migration management:

```yaml
Trigger: Manual dispatch only

Inputs:
  - environment: development/staging/production
  - action: status/up/down/redo
  - count: Number of migrations (for down/redo)

Jobs:
  - status       - Check migration status
  - migrate-up   - Apply pending migrations
  - migrate-down - Rollback migrations
  - migrate-redo - Re-run last migration(s)
```

## Environment Setup

See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for detailed environment configuration.

### Required Secrets

| Secret | Scope | Description |
|--------|-------|-------------|
| `AWS_DEPLOY_ROLE_ARN` | Per environment | IAM role for AWS deployments |
| `TERRAFORM_STATE_BUCKET` | Repository | S3 bucket for Terraform state |
| `CODECOV_TOKEN` | Repository | Code coverage uploads |

## Best Practices

### Before Merging to Main

1. ✅ All tests pass
2. ✅ No security vulnerabilities
3. ✅ Code reviewed and approved
4. ✅ Changelog updated

### Before Production Deployment

1. ✅ Staging deployment verified
2. ✅ Manual testing completed
3. ✅ Database migration tested
4. ✅ Rollback plan documented

### After Production Deployment

1. ✅ Monitor CloudWatch metrics
2. ✅ Check error rates
3. ✅ Verify key user flows
4. ✅ Update deployment log

## Troubleshooting

### Build Failures

```bash
# Check workflow logs
gh run view <run-id> --log

# Re-run failed job
gh run rerun <run-id> --failed
```

### Deployment Failures

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster hz-navigator-<env>-cluster \
  --services hz-navigator-<env>-backend-service \
  --query 'services[0].events[:5]'

# Check task logs
aws logs tail /aws/ecs/hz-navigator-<env> --follow
```

### Rollback Issues

```bash
# List available task definition revisions
aws ecs list-task-definitions \
  --family-prefix hz-navigator-<env>-backend \
  --sort DESC \
  --max-items 10

# List S3 backups
aws s3 ls s3://hz-navigator-frontend-<env>-backups/
```

## Support

- **Slack**: #hz-navigator-deployments
- **On-call**: Check PagerDuty schedule
- **Documentation**: See `/docs/DEPLOYMENT.md`

