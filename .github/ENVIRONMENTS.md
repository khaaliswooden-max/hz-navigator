# GitHub Environments Configuration

This document describes the GitHub Environments setup for the HZ-Navigator CI/CD pipeline.

## Environments Overview

| Environment | Auto-Deploy | Approval Required | Branch |
|-------------|-------------|-------------------|--------|
| development | Yes | No | `develop` |
| staging | Yes | No | `main` |
| production | Yes | **Yes** | `main` (manual) |

## Setting Up Environments

### 1. Create Environments in GitHub

Go to **Settings > Environments** and create:

1. `development`
2. `staging`
3. `production` (with required reviewers)

### 2. Configure Environment Protection Rules

#### Production Environment

1. **Required reviewers**: Add at least 2 team members
2. **Wait timer**: 0 minutes (reviewers must approve)
3. **Deployment branches**: Only `main`

#### Staging Environment

1. **Required reviewers**: None (auto-deploy)
2. **Deployment branches**: Only `main`

#### Development Environment

1. **Required reviewers**: None (auto-deploy)
2. **Deployment branches**: Only `develop`

## Required Secrets

### Repository Secrets (Shared)

| Secret | Description | Example |
|--------|-------------|---------|
| `CODECOV_TOKEN` | Codecov upload token | `xxxx-xxxx-xxxx` |

### Environment Secrets

Each environment needs these secrets:

| Secret | Description | Example |
|--------|-------------|---------|
| `AWS_DEPLOY_ROLE_ARN` | IAM role for deployment | `arn:aws:iam::123456789012:role/hz-navigator-deploy-role` |
| `TERRAFORM_STATE_BUCKET` | S3 bucket for Terraform state | `hz-navigator-terraform-state` |

### Setting Up AWS OIDC

1. Create an IAM Identity Provider for GitHub Actions:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

2. Create the deployment role with trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/hz-navigator:*"
        }
      }
    }
  ]
}
```

## Environment Variables

### Build-Time Variables

These are injected during the build process:

| Variable | Development | Staging | Production |
|----------|-------------|---------|------------|
| `VITE_API_URL` | `https://api.dev.hz-navigator.com` | `https://api.staging.hz-navigator.com` | `https://api.hz-navigator.com` |
| `VITE_ENVIRONMENT` | `development` | `staging` | `production` |

### Runtime Variables (ECS)

Configured in ECS task definition:

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Environment name |
| `DATABASE_URL` | PostgreSQL connection string (from Secrets Manager) |
| `REDIS_URL` | Redis connection string (from Secrets Manager) |
| `AWS_REGION` | AWS region |
| `S3_DOCUMENTS_BUCKET` | Documents bucket name |

## Deployment Flow

### Development (`develop` branch)

```
Push to develop → Test → Build → Deploy to development
```

### Staging (`main` branch)

```
Push to main → Test → Build → Migrate DB → Deploy to staging
```

### Production (Manual)

```
Workflow dispatch → Test → Build → Migrate DB → Wait for approval → Deploy to production
```

## Rollback Procedures

### Backend Rollback

1. Go to **Actions > Rollback Deployment**
2. Select environment and component
3. Specify revision (optional) or use previous
4. Provide reason and submit

### Frontend Rollback

1. Go to **Actions > Rollback Deployment**
2. Select environment and component
3. Specify backup folder (optional) or use latest
4. Provide reason and submit

### Database Rollback

1. Go to **Actions > Database Migrations**
2. Select environment
3. Action: `down`
4. Count: number of migrations to rollback

## Monitoring Deployments

### View Deployment Status

1. Go to **Actions** tab
2. Select the workflow run
3. View job logs and deployment summary

### ECS Service Status

```bash
aws ecs describe-services \
  --cluster hz-navigator-production-cluster \
  --services hz-navigator-production-backend-service
```

### Recent Deployments

```bash
aws ecs list-tasks \
  --cluster hz-navigator-production-cluster \
  --service-name hz-navigator-production-backend-service
```

## Troubleshooting

### Deployment Stuck

1. Check ECS service events:
   ```bash
   aws ecs describe-services --cluster CLUSTER --services SERVICE
   ```

2. Check task logs in CloudWatch:
   ```bash
   aws logs tail /aws/ecs/hz-navigator-production --follow
   ```

### Rollback Fails

1. Verify the target revision exists:
   ```bash
   aws ecs describe-task-definition --task-definition FAMILY:REVISION
   ```

2. Check IAM permissions for the deployment role

### Health Check Failures

1. Verify ALB target group health:
   ```bash
   aws elbv2 describe-target-health --target-group-arn ARN
   ```

2. Check container logs for startup errors

