# HZ-Navigator AWS Infrastructure

This directory contains Terraform configurations for deploying the HZ-Navigator application infrastructure on AWS.

## Architecture Overview

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                         AWS Cloud                            │
                                    │                                                              │
     ┌──────────┐                  │   ┌─────────────┐    ┌─────────────────────────────────┐    │
     │  Users   │───────────────────────▶ CloudFront  │────▶│        S3 Frontend Bucket       │    │
     └──────────┘                  │   └─────────────┘    └─────────────────────────────────┘    │
                                   │          │                                                   │
                                   │          │ /api/*                                            │
                                   │          ▼                                                   │
                                   │   ┌─────────────┐                                           │
                                   │   │     ALB     │ (Public Subnets)                          │
                                   │   └──────┬──────┘                                           │
                                   │          │                                                   │
                                   │          ▼                                                   │
                                   │   ┌─────────────┐                                           │
                                   │   │ ECS Fargate │ (Private Subnets)                         │
                                   │   │  Cluster    │                                           │
                                   │   └──────┬──────┘                                           │
                                   │          │                                                   │
                                   │    ┌─────┴─────┐                                            │
                                   │    ▼           ▼                                            │
                                   │ ┌─────────┐ ┌─────────┐                                     │
                                   │ │   RDS   │ │ Redis   │ (Private Subnets)                   │
                                   │ │PostgreSQL│ │ Cache  │                                     │
                                   │ └─────────┘ └─────────┘                                     │
                                   │                                                              │
                                   └─────────────────────────────────────────────────────────────┘
```

## Components

| Component | Description | Configuration |
|-----------|-------------|---------------|
| **VPC** | Network isolation with public/private subnets | 2 AZs, NAT Gateways, VPC Endpoints |
| **RDS** | PostgreSQL 15 with PostGIS | Multi-AZ, encryption, read replica |
| **ECS Fargate** | Containerized backend | Auto-scaling (2-10 tasks), 2 vCPU, 4GB RAM |
| **ALB** | Application Load Balancer | HTTPS, health checks, HTTP→HTTPS redirect |
| **S3** | Object storage | Documents (private), Frontend (public), Map tiles |
| **CloudFront** | CDN | Frontend distribution, Map tiles caching |
| **ElastiCache** | Redis cache | r5.large, 2 nodes, cluster mode disabled |
| **IAM** | Access management | ECS roles, Lambda role, Deployment role |

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.5.0
3. **Domain** registered and Route53 hosted zone created
4. **ECR Repository** for Docker images

## Quick Start

### 1. Initialize Terraform

```bash
cd infrastructure
terraform init
```

### 2. Create workspace for environment

```bash
# For production
terraform workspace new production
terraform workspace select production

# For staging
terraform workspace new staging
terraform workspace select staging
```

### 3. Review the plan

```bash
# Production
terraform plan -var-file=environments/production.tfvars

# Staging
terraform plan -var-file=environments/staging.tfvars
```

### 4. Apply the configuration

```bash
# Production
terraform apply -var-file=environments/production.tfvars

# Staging
terraform apply -var-file=environments/staging.tfvars
```

## Directory Structure

```
infrastructure/
├── main.tf                 # Main configuration, module calls
├── variables.tf            # Input variable definitions
├── outputs.tf             # Output values
├── terraform.tfvars.example # Example variables file
├── environments/
│   ├── production.tfvars  # Production settings
│   └── staging.tfvars     # Staging settings
└── modules/
    ├── vpc/               # VPC with subnets, NAT, endpoints
    ├── security-groups/   # Security groups for all resources
    ├── rds/               # RDS PostgreSQL with replica
    ├── elasticache/       # Redis cluster
    ├── ecs/               # ECS Fargate cluster and service
    ├── alb/               # Application Load Balancer
    ├── s3/                # S3 buckets
    ├── cloudfront/        # CloudFront distributions
    ├── acm/               # SSL certificates
    └── iam/               # IAM roles and policies
```

## Environment Variables

After deployment, configure these environment variables for your ECS tasks:

| Variable | Description | Source |
|----------|-------------|--------|
| `DATABASE_URL` | PostgreSQL connection string | RDS endpoint |
| `DATABASE_READ_URL` | Read replica connection string | RDS replica endpoint |
| `REDIS_URL` | Redis connection string | ElastiCache endpoint |
| `AWS_REGION` | AWS region | terraform output |
| `S3_DOCUMENTS_BUCKET` | Documents bucket name | terraform output |

## Post-Deployment Steps

### 1. Validate ACM Certificates

After deployment, you need to validate the ACM certificates by creating DNS records:

```bash
terraform output certificate_validation_records
```

Add the CNAME records to your DNS provider.

### 2. Create DNS Records

```bash
terraform output dns_records_to_create
```

Create the following records:
- `api.your-domain.com` → ALB
- `app.your-domain.com` → CloudFront (frontend)
- `tiles.your-domain.com` → CloudFront (map tiles)

### 3. Enable PostGIS Extension

Connect to the RDS instance and run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
```

### 4. Deploy the Application

```bash
# Build and push Docker image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker build -t hz-navigator-backend ./backend
docker tag hz-navigator-backend:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hz-navigator-backend:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/hz-navigator-backend:latest

# Update ECS service
aws ecs update-service --cluster hz-navigator-production-cluster --service hz-navigator-production-backend-service --force-new-deployment
```

### 5. Deploy Frontend

```bash
# Build frontend
cd frontend
npm run build

# Deploy to S3
aws s3 sync dist/ s3://hz-navigator-frontend-production/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
```

## Estimated Costs (Monthly)

| Resource | Production | Staging |
|----------|------------|---------|
| ECS Fargate (2 tasks) | ~$146 | ~$73 |
| RDS db.t3.medium (Multi-AZ) | ~$130 | ~$26 |
| RDS Read Replica | ~$65 | $0 |
| ElastiCache r5.large (2 nodes) | ~$360 | ~$52 |
| NAT Gateway (2x) | ~$65 | ~$65 |
| ALB | ~$22 | ~$22 |
| S3 + CloudFront | ~$20 | ~$10 |
| **Total** | **~$808** | **~$248** |

*Costs are approximate and may vary based on usage.*

## Scaling

### Vertical Scaling (RDS)

To upgrade RDS from db.t3.medium to db.r5.large:

```hcl
# In environments/production.tfvars
db_instance_class = "db.r5.large"
```

Then apply:

```bash
terraform apply -var-file=environments/production.tfvars
```

### Horizontal Scaling (ECS)

Auto-scaling is configured based on:
- CPU utilization (target: 70%)
- Memory utilization (target: 75%)
- ALB request count (target: 1000 requests/target)

Manual scaling:

```bash
aws ecs update-service --cluster hz-navigator-production-cluster \
  --service hz-navigator-production-backend-service \
  --desired-count 5
```

## Monitoring

### CloudWatch Alarms

The following alarms are automatically created:

- RDS: CPU high, storage low, connections high
- ECS: CPU high, memory high, task count low
- ALB: 5XX errors, unhealthy hosts, high latency
- Redis: CPU high, memory high, connections high
- CloudFront: 4XX/5XX error rates

### CloudWatch Logs

- ECS logs: `/aws/ecs/hz-navigator-{environment}`
- VPC flow logs: `/aws/vpc/hz-navigator-{environment}-flow-logs`
- Redis logs: `/aws/elasticache/hz-navigator-{environment}-redis/*`

## Security

- All data encrypted at rest (RDS, S3, ElastiCache)
- All traffic encrypted in transit (TLS 1.2+)
- VPC endpoints for AWS services (no internet traversal)
- Security groups with least-privilege access
- IAM roles with minimal required permissions
- Secrets stored in AWS Secrets Manager

## Backup & Recovery

### RDS Backups
- Automated daily backups (7-day retention)
- Point-in-time recovery enabled
- Manual snapshots before major changes

### S3 Versioning
- Enabled on all buckets
- Lifecycle policies for cost optimization

## Troubleshooting

### Check ECS Service Status

```bash
aws ecs describe-services \
  --cluster hz-navigator-production-cluster \
  --services hz-navigator-production-backend-service
```

### View ECS Task Logs

```bash
aws logs tail /aws/ecs/hz-navigator-production --follow
```

### Test ALB Health Check

```bash
curl -v https://api.your-domain.com/api/v1/health
```

### Connect to RDS (via bastion or SSM)

```bash
psql -h <rds-endpoint> -U hz_navigator_admin -d hz_navigator
```

## Destroying Infrastructure

⚠️ **Warning**: This will delete all resources including data.

```bash
# Disable deletion protection first
# Then:
terraform destroy -var-file=environments/production.tfvars
```

## Support

For issues or questions, please contact the platform team.

