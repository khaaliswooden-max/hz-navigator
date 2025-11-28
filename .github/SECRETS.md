# GitHub Secrets Configuration

This document lists all required GitHub Secrets for the CI/CD pipelines.

## Required Secrets

### AWS Credentials (Staging)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key for staging | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for staging | `wJal...` |

### AWS Credentials (Production)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID_PROD` | AWS access key for production | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY_PROD` | AWS secret key for production | `wJal...` |

### S3 Buckets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DEV_S3_BUCKET` | Development frontend bucket | `hz-navigator-frontend-dev-xxxx` |
| `STAGING_S3_BUCKET` | Staging frontend bucket | `hz-navigator-frontend-staging-xxxx` |
| `PRODUCTION_S3_BUCKET` | Production frontend bucket | `hz-navigator-frontend-production-xxxx` |

### CloudFront Distribution IDs

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DEV_CLOUDFRONT_DISTRIBUTION_ID` | Development CloudFront ID | `E1234567890ABC` |
| `STAGING_CLOUDFRONT_DISTRIBUTION_ID` | Staging CloudFront ID | `E1234567890ABC` |
| `PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID` | Production CloudFront ID | `E1234567890ABC` |

### Database Secrets ARNs

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DEV_DB_SECRET_ARN` | Development DB secret ARN | `arn:aws:secretsmanager:...` |
| `STAGING_DB_SECRET_ARN` | Staging DB secret ARN | `arn:aws:secretsmanager:...` |
| `PRODUCTION_DB_SECRET_ARN` | Production DB secret ARN | `arn:aws:secretsmanager:...` |

### Database URLs (for migrations)

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `STAGING_DATABASE_URL` | Staging database connection string | `postgresql://user:pass@host:5432/db` |
| `PRODUCTION_DATABASE_URL` | Production database connection string | `postgresql://user:pass@host:5432/db` |

### Monitoring & Notifications

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | `https://hooks.slack.com/...` |
| `CODECOV_TOKEN` | Codecov upload token | `xxxx-xxxx-xxxx` |
| `SENTRY_DSN_STAGING` | Sentry DSN for staging | `https://xxxx@sentry.io/xxxx` |
| `SENTRY_DSN_PROD` | Sentry DSN for production | `https://xxxx@sentry.io/xxxx` |

## Environment Protection Rules

### Production Environment

1. Go to Repository Settings → Environments → production
2. Enable "Required reviewers" and add team leads
3. Enable "Wait timer" (optional, e.g., 5 minutes)
4. Add deployment branch rule: `main` only

### Staging Environment

1. Go to Repository Settings → Environments → staging
2. Add deployment branch rules: `main`, `develop`

## Setting Up Secrets

### Via GitHub CLI

```bash
# AWS Credentials
gh secret set AWS_ACCESS_KEY_ID --body "your-access-key-id"
gh secret set AWS_SECRET_ACCESS_KEY --body "your-secret-access-key"

# For production (separate credentials recommended)
gh secret set AWS_ACCESS_KEY_ID_PROD --body "your-prod-access-key-id"
gh secret set AWS_SECRET_ACCESS_KEY_PROD --body "your-prod-secret-access-key"

# S3 Buckets
gh secret set STAGING_S3_BUCKET --body "hz-navigator-frontend-staging-xxxx"
gh secret set PRODUCTION_S3_BUCKET --body "hz-navigator-frontend-production-xxxx"

# CloudFront
gh secret set STAGING_CLOUDFRONT_DISTRIBUTION_ID --body "E1234567890ABC"
gh secret set PRODUCTION_CLOUDFRONT_DISTRIBUTION_ID --body "E1234567890ABC"

# Database
gh secret set STAGING_DATABASE_URL --body "postgresql://user:pass@host:5432/db"
gh secret set PRODUCTION_DATABASE_URL --body "postgresql://user:pass@host:5432/db"

# Notifications
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/xxx"
gh secret set CODECOV_TOKEN --body "your-codecov-token"
```

### Via Terraform Output

After running Terraform, you can get many of these values:

```bash
cd infrastructure/terraform

# Get S3 bucket names
terraform output frontend_bucket_name
terraform output documents_bucket_name

# Get CloudFront distribution ID
terraform output cloudfront_frontend_distribution_id

# Get database secret ARN
terraform output rds_credentials_secret_arn

# Get ECR repository URL
terraform output ecr_repository_url
```

## Security Best Practices

1. **Rotate credentials regularly** - AWS recommends every 90 days
2. **Use separate credentials** for staging and production
3. **Limit IAM permissions** to only what's needed
4. **Enable MFA** for AWS accounts
5. **Monitor secret usage** in AWS CloudTrail
6. **Never commit secrets** to the repository
7. **Use environment-specific secrets** rather than shared ones

## Troubleshooting

### Secret Not Found

If a workflow fails with "secret not found":
1. Verify the secret name matches exactly (case-sensitive)
2. Check if the secret is set at the correct level (repo vs. org)
3. Ensure the workflow has access to the environment's secrets

### AWS Authentication Failed

If AWS authentication fails:
1. Verify the access key and secret key are correct
2. Check IAM user has necessary permissions
3. Ensure the credentials haven't expired or been rotated

### Database Connection Failed

If database migrations fail:
1. Verify the DATABASE_URL format is correct
2. Check security group rules allow GitHub Actions IPs
3. Ensure the database is accessible from the internet (for direct access) or use a VPN/bastion

