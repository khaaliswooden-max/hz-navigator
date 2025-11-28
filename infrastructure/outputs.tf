# =============================================================================
# HZ-Navigator Infrastructure Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# General
# -----------------------------------------------------------------------------

output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "account_id" {
  description = "AWS account ID"
  value       = data.aws_caller_identity.current.account_id
}

# -----------------------------------------------------------------------------
# VPC
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = module.vpc.vpc_cidr
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = module.vpc.private_subnet_ids
}

output "nat_gateway_ips" {
  description = "NAT gateway public IPs"
  value       = module.vpc.nat_gateway_ips
}

# -----------------------------------------------------------------------------
# RDS
# -----------------------------------------------------------------------------

output "rds_endpoint" {
  description = "RDS primary endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "rds_read_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = module.rds.read_replica_endpoint
  sensitive   = true
}

output "rds_password_secret_arn" {
  description = "ARN of the secret containing RDS password"
  value       = module.rds.db_password_secret_arn
}

# -----------------------------------------------------------------------------
# ElastiCache
# -----------------------------------------------------------------------------

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = module.elasticache.primary_endpoint
  sensitive   = true
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = module.elasticache.reader_endpoint
  sensitive   = true
}

output "redis_auth_token_secret_arn" {
  description = "ARN of the secret containing Redis auth token"
  value       = module.elasticache.auth_token_secret_arn
}

# -----------------------------------------------------------------------------
# ECS
# -----------------------------------------------------------------------------

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = module.ecs.cluster_arn
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = module.ecs.service_name
}

output "ecs_task_definition_arn" {
  description = "ECS task definition ARN"
  value       = module.ecs.task_definition_arn
}

output "ecs_log_group" {
  description = "ECS CloudWatch log group"
  value       = module.ecs.log_group_name
}

# -----------------------------------------------------------------------------
# ALB
# -----------------------------------------------------------------------------

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.dns_name
}

output "alb_zone_id" {
  description = "ALB Route53 zone ID"
  value       = module.alb.zone_id
}

output "alb_arn" {
  description = "ALB ARN"
  value       = module.alb.alb_arn
}

# -----------------------------------------------------------------------------
# S3
# -----------------------------------------------------------------------------

output "s3_documents_bucket" {
  description = "S3 documents bucket name"
  value       = module.s3.documents_bucket_name
}

output "s3_frontend_bucket" {
  description = "S3 frontend bucket name"
  value       = module.s3.frontend_bucket_name
}

output "s3_map_tiles_bucket" {
  description = "S3 map tiles bucket name"
  value       = module.s3.map_tiles_bucket_id
}

# -----------------------------------------------------------------------------
# CloudFront
# -----------------------------------------------------------------------------

output "cloudfront_frontend_domain" {
  description = "CloudFront frontend distribution domain"
  value       = module.cloudfront.frontend_distribution_domain
}

output "cloudfront_frontend_distribution_id" {
  description = "CloudFront frontend distribution ID"
  value       = module.cloudfront.frontend_distribution_id
}

output "cloudfront_map_tiles_domain" {
  description = "CloudFront map tiles distribution domain"
  value       = module.cloudfront.map_tiles_distribution_domain
}

# -----------------------------------------------------------------------------
# IAM
# -----------------------------------------------------------------------------

output "ecs_task_execution_role_arn" {
  description = "ECS task execution role ARN"
  value       = module.iam.ecs_task_execution_role_arn
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN"
  value       = module.iam.ecs_task_role_arn
}

output "lambda_execution_role_arn" {
  description = "Lambda execution role ARN"
  value       = module.iam.lambda_execution_role_arn
}

output "deployment_role_arn" {
  description = "Deployment role ARN"
  value       = module.iam.deployment_role_arn
}

# -----------------------------------------------------------------------------
# ACM Certificates
# -----------------------------------------------------------------------------

output "alb_certificate_arn" {
  description = "ACM certificate ARN for ALB"
  value       = module.acm.alb_certificate_arn
}

output "cloudfront_certificate_arn" {
  description = "ACM certificate ARN for CloudFront"
  value       = module.acm.cloudfront_certificate_arn
}

# -----------------------------------------------------------------------------
# DNS Records (for manual setup)
# -----------------------------------------------------------------------------

output "dns_records_to_create" {
  description = "DNS records that need to be created"
  value = {
    api = {
      type    = "A"
      alias   = true
      target  = module.alb.dns_name
      zone_id = module.alb.zone_id
      comment = "API endpoint (ALB)"
    }
    frontend = {
      type    = "A"
      alias   = true
      target  = module.cloudfront.frontend_distribution_domain
      zone_id = module.cloudfront.frontend_distribution_hosted_zone_id
      comment = "Frontend (CloudFront)"
    }
    tiles = {
      type    = "A"
      alias   = true
      target  = module.cloudfront.map_tiles_distribution_domain
      zone_id = module.cloudfront.map_tiles_distribution_hosted_zone_id
      comment = "Map tiles (CloudFront)"
    }
  }
}

output "certificate_validation_records" {
  description = "Certificate validation records (create these in DNS)"
  value = {
    alb        = module.acm.alb_certificate_domain_validation_options
    cloudfront = module.acm.cloudfront_certificate_domain_validation_options
  }
}

