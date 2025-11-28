# HZ Navigator - AWS Infrastructure

This directory contains Terraform configurations for deploying the HZ Navigator production infrastructure on AWS.

## Architecture Overview

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                          AWS Cloud                           │
                                    │                                                              │
    Internet                        │  ┌─────────────────────────────────────────────────────┐   │
        │                           │  │                    CloudFront                        │   │
        │                           │  │  ┌───────────────┐    ┌───────────────────────────┐ │   │
        │                           │  │  │   Frontend    │    │       Map Tiles           │ │   │
        │                           │  │  │  Distribution │    │      Distribution         │ │   │
        │                           │  │  └───────┬───────┘    └───────────┬───────────────┘ │   │
        │                           │  └──────────┼───────────────────────┼─────────────────┘   │
        │                           │             │                       │                      │
        ▼                           │             ▼                       ▼                      │
┌───────────────┐                   │  ┌─────────────────┐    ┌───────────────────────────┐     │
│    Route 53   │───────────────────┼─▶│  S3 - Frontend  │    │    S3 - Map Tiles         │     │
└───────────────┘                   │  └─────────────────┘    └───────────────────────────┘     │
        │                           │                                                           │
        │                           │  ┌─────────────────────────────────────────────────────┐   │
        │                           │  │                     VPC (10.0.0.0/16)                │   │
        │                           │  │                                                      │   │
        │                           │  │  Public Subnets (10.0.1.0/24, 10.0.2.0/24)          │   │
        │                           │  │  ┌──────────────────────────────────────────────┐   │   │
        │                           │  │  │              Application Load Balancer        │   │   │
        ▼                           │  │  │  ┌────────────┐         ┌────────────┐        │   │   │
┌───────────────┐                   │  │  │  │  AZ-1a     │         │   AZ-1b    │        │   │   │
│      ALB      │◀──────────────────┼──┼──│  │  NAT GW    │         │   NAT GW   │        │   │   │
│  (WAF + SSL)  │                   │  │  │  └────────────┘         └────────────┘        │   │   │
└───────────────┘                   │  │  └──────────────────────────────────────────────┘   │   │
        │                           │  │                                                      │   │
        │                           │  │  Private Subnets (10.0.11.0/24, 10.0.12.0/24)       │   │
        │                           │  │  ┌──────────────────────────────────────────────┐   │   │
        │                           │  │  │                ECS Fargate                    │   │   │
        ▼                           │  │  │  ┌────────────┐         ┌────────────┐        │   │   │
┌───────────────┐                   │  │  │  │  Task 1    │   ...   │   Task N   │        │   │   │
│  ECS Service  │◀──────────────────┼──┼──│  │  (Backend) │         │  (Backend) │        │   │   │
│  (Auto-scale) │                   │  │  │  └────────────┘         └────────────┘        │   │   │
└───────────────┘                   │  │  │                                                │   │   │
        │                           │  │  │  ┌──────────────────────────────────────────┐ │   │   │
        │                           │  │  │  │           ElastiCache Redis               │ │   │   │
        │                           │  │  │  │  ┌────────────┐    ┌────────────┐         │ │   │   │
        │                           │  │  │  │  │  Primary   │    │  Replica   │         │ │   │   │
        │                           │  │  │  │  └────────────┘    └────────────┘         │ │   │   │
        │                           │  │  │  └──────────────────────────────────────────┘ │   │   │
        │                           │  │  └──────────────────────────────────────────────┘   │   │
        │                           │  │                                                      │   │
        │                           │  │  Database Subnets (10.0.21.0/24, 10.0.22.0/24)      │   │
        │                           │  │  ┌──────────────────────────────────────────────┐   │   │
        │                           │  │  │              RDS PostgreSQL                   │   │   │
        ▼                           │  │  │  ┌────────────┐         ┌────────────┐        │   │   │
┌───────────────┐                   │  │  │  │  Primary   │         │   Replica  │        │   │   │
│ RDS PostgreSQL│◀──────────────────┼──┼──│  │  (Multi-AZ)│         │  (Read)    │        │   │   │
│  (PostGIS)    │                   │  │  │  └────────────┘         └────────────┘        │   │   │
└───────────────┘                   │  │  └──────────────────────────────────────────────┘   │   │
                                    │  └─────────────────────────────────────────────────────┘   │
                                    │                                                            │
                                    │  ┌─────────────────┐    ┌─────────────────────────────┐   │
                                    │  │  S3 - Documents │    │      Secrets Manager        │   │
                                    │  │    (Private)    │    │  (DB, Redis, App secrets)   │   │
                                    │  └─────────────────┘    └─────────────────────────────┘   │
                                    │                                                            │
                                    └────────────────────────────────────────────────────────────┘
```

## Infrastructure Components

### 1. VPC Configuration
- **VPC CIDR**: 10.0.0.0/16
- **Public Subnets**: 2 (for ALB, NAT Gateways)
- **Private Subnets**: 2 (for ECS, ElastiCache)
- **Database Subnets**: 2 (for RDS)
- **NAT Gateways**: 2 (one per AZ for HA)
- **VPC Endpoints**: S3, ECR, CloudWatch Logs, Secrets Manager

### 2. RDS PostgreSQL
- **Instance**: db.t3.medium (upgradable to db.r5.large)
- **Engine**: PostgreSQL 15 with PostGIS extension
- **Multi-AZ**: Enabled for high availability
- **Read Replica**: Optional, for read-heavy queries
- **Backups**: Daily, 7-day retention
- **Encryption**: At rest (KMS) and in transit

### 3. ECS Fargate
- **Cluster**: Container Insights enabled
- **Task Definition**: 2 vCPU, 4GB RAM
- **Service**: Auto-scaling (min: 2, max: 10)
- **Scaling Policies**: CPU, Memory, Request count
- **Logging**: CloudWatch Logs

### 4. Application Load Balancer
- **Type**: Internet-facing
- **SSL**: TLS 1.3 with ACM certificate
- **WAF**: Enabled with AWS managed rules
- **Health Check**: /api/v1/health
- **HTTP to HTTPS**: Automatic redirect

### 5. S3 Buckets
- **Documents**: Private, encrypted (KMS), versioned
- **Frontend**: Public via CloudFront OAC
- **Map Tiles**: Public via CloudFront OAC
- **Lifecycle Policies**: Automatic archival and cleanup

### 6. CloudFront
- **Frontend Distribution**: SPA routing, compression
- **Map Tiles Distribution**: Long cache TTL
- **SSL**: TLS 1.2 minimum
- **Price Class**: US, Canada, Europe

### 7. ElastiCache Redis
- **Engine**: Redis 7.0
- **Nodes**: 2 (primary + replica)
- **Instance**: cache.r5.large
- **Encryption**: At rest and in transit
- **Auth**: Token-based authentication

### 8. IAM Roles
- **ECS Execution Role**: ECR, Secrets Manager, CloudWatch
- **ECS Task Role**: S3, CloudWatch, SES, X-Ray
- **Lambda Execution Role**: S3, Secrets Manager, Textract
- **Deployment Role**: ECR, ECS, S3, CloudFront

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Terraform** >= 1.5.0
3. **AWS Account** with necessary permissions
4. **Domain** (optional) registered in Route53

## Getting Started

### 1. Clone and Configure

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your configuration.

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Review the Plan

```bash
terraform plan
```

### 4. Apply the Configuration

```bash
terraform apply
```

### 5. Post-Deployment Steps

1. **Enable PostGIS Extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS postgis_topology;
   CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
   CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
   ```

2. **Build and Push Docker Image**:
   ```bash
   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

   # Build and push
   docker build -t hz-navigator-backend ./backend
   docker tag hz-navigator-backend:latest <ecr-repo-url>:latest
   docker push <ecr-repo-url>:latest
   ```

3. **Deploy Frontend**:
   ```bash
   # Build frontend
   cd frontend && npm run build

   # Sync to S3
   aws s3 sync dist/ s3://<frontend-bucket-name> --delete

   # Invalidate CloudFront cache
   aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"
   ```

4. **Configure DNS** (if using custom domain):
   - Point your domain to the CloudFront distribution
   - Validate ACM certificates

## Cost Estimation

| Resource | Type | Monthly Cost (Est.) |
|----------|------|---------------------|
| RDS PostgreSQL | db.t3.medium Multi-AZ | ~$150 |
| RDS Read Replica | db.t3.medium | ~$75 |
| ECS Fargate (2 tasks) | 2vCPU, 4GB | ~$120 |
| NAT Gateways (2) | Per GB processed | ~$90 |
| ElastiCache Redis | cache.r5.large x2 | ~$300 |
| ALB | Per hour + LCU | ~$25 |
| S3 | Storage + requests | ~$10 |
| CloudFront | Transfer + requests | ~$20 |
| **Total** | | **~$790/month** |

*Costs may vary based on usage patterns and region.*

## Security Features

- **Encryption at Rest**: RDS, S3, ElastiCache, ECS
- **Encryption in Transit**: TLS 1.2+ everywhere
- **WAF**: SQL injection, XSS, rate limiting
- **Security Groups**: Least privilege access
- **Secrets Management**: AWS Secrets Manager
- **VPC Flow Logs**: Network monitoring
- **IAM**: Role-based access control

## Monitoring & Alerting

- **CloudWatch Dashboards**: Pre-configured metrics
- **CloudWatch Alarms**: CPU, memory, connections
- **SNS Notifications**: Email alerts
- **Container Insights**: ECS monitoring
- **Performance Insights**: RDS monitoring

## Disaster Recovery

- **RDS**: Multi-AZ with automatic failover
- **Redis**: Replication with automatic failover
- **S3**: Cross-region replication (optional)
- **Backups**: Daily automated backups
- **State Management**: Terraform state in S3 with DynamoDB locking

## Scaling

### Horizontal Scaling
- ECS auto-scaling based on CPU, memory, and requests
- Read replica for database read operations

### Vertical Scaling
- RDS: Upgrade to db.r5.large or higher
- ElastiCache: Upgrade to larger node types
- ECS: Increase task CPU/memory

## Maintenance

### Routine Tasks
1. Monitor CloudWatch dashboards
2. Review security group rules
3. Check SSL certificate expiration
4. Review and rotate secrets
5. Analyze performance metrics

### Updates
1. Review Terraform plan before applying
2. Test in staging environment first
3. Apply during maintenance windows
4. Monitor after changes

## Troubleshooting

### Common Issues

1. **ECS Tasks Not Starting**
   - Check CloudWatch logs
   - Verify security group rules
   - Check ECR image availability

2. **Database Connection Issues**
   - Verify security group rules
   - Check credentials in Secrets Manager
   - Verify VPC endpoints

3. **CloudFront 403 Errors**
   - Check S3 bucket policy
   - Verify OAC configuration
   - Check CloudFront function

## Files Structure

```
infrastructure/
├── terraform/
│   ├── main.tf              # Provider and backend config
│   ├── variables.tf         # Input variables
│   ├── outputs.tf           # Output values
│   ├── vpc.tf               # VPC, subnets, NAT
│   ├── security-groups.tf   # Security groups
│   ├── rds.tf               # RDS PostgreSQL
│   ├── ecs.tf               # ECS Fargate cluster
│   ├── alb.tf               # Application Load Balancer
│   ├── s3.tf                # S3 buckets
│   ├── cloudfront.tf        # CloudFront distributions
│   ├── elasticache.tf       # ElastiCache Redis
│   ├── iam.tf               # IAM roles and policies
│   └── terraform.tfvars.example
└── README.md
```

## Support

For issues or questions, please:
1. Check the troubleshooting guide
2. Review CloudWatch logs
3. Open an issue in the repository

