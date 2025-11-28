# =============================================================================
# HZ Navigator - Terraform Outputs
# =============================================================================

# -----------------------------------------------------------------------------
# VPC Outputs
# -----------------------------------------------------------------------------

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "VPC CIDR block"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "Database subnet IDs"
  value       = aws_subnet.database[*].id
}

# -----------------------------------------------------------------------------
# RDS Outputs
# -----------------------------------------------------------------------------

output "rds_endpoint" {
  description = "RDS primary instance endpoint"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS port"
  value       = aws_db_instance.main.port
}

output "rds_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = var.create_read_replica ? aws_db_instance.replica[0].address : null
}

output "rds_db_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "rds_credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}

# -----------------------------------------------------------------------------
# ECS Outputs
# -----------------------------------------------------------------------------

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.backend.name
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecs_task_role_arn" {
  description = "ECS task role ARN"
  value       = aws_iam_role.ecs_task.arn
}

output "ecs_execution_role_arn" {
  description = "ECS execution role ARN"
  value       = aws_iam_role.ecs_execution.arn
}

# -----------------------------------------------------------------------------
# ALB Outputs
# -----------------------------------------------------------------------------

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ALB ARN"
  value       = aws_lb.main.arn
}

output "api_endpoint" {
  description = "API endpoint URL"
  value       = var.domain_name != "" ? "https://${var.api_subdomain}.${var.domain_name}" : "https://${aws_lb.main.dns_name}"
}

# -----------------------------------------------------------------------------
# S3 Outputs
# -----------------------------------------------------------------------------

output "documents_bucket_name" {
  description = "Documents S3 bucket name"
  value       = aws_s3_bucket.documents.id
}

output "documents_bucket_arn" {
  description = "Documents S3 bucket ARN"
  value       = aws_s3_bucket.documents.arn
}

output "frontend_bucket_name" {
  description = "Frontend S3 bucket name"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  description = "Frontend S3 bucket ARN"
  value       = aws_s3_bucket.frontend.arn
}

output "map_tiles_bucket_name" {
  description = "Map tiles S3 bucket name"
  value       = aws_s3_bucket.map_tiles.id
}

# -----------------------------------------------------------------------------
# CloudFront Outputs
# -----------------------------------------------------------------------------

output "cloudfront_frontend_distribution_id" {
  description = "CloudFront frontend distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_frontend_domain_name" {
  description = "CloudFront frontend distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "cloudfront_map_tiles_distribution_id" {
  description = "CloudFront map tiles distribution ID"
  value       = aws_cloudfront_distribution.map_tiles.id
}

output "cloudfront_map_tiles_domain_name" {
  description = "CloudFront map tiles distribution domain name"
  value       = aws_cloudfront_distribution.map_tiles.domain_name
}

output "frontend_url" {
  description = "Frontend URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "map_tiles_url" {
  description = "Map tiles URL"
  value       = var.domain_name != "" ? "https://tiles.${var.domain_name}" : "https://${aws_cloudfront_distribution.map_tiles.domain_name}"
}

# -----------------------------------------------------------------------------
# ElastiCache Outputs
# -----------------------------------------------------------------------------

output "redis_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "Redis reader endpoint"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "redis_port" {
  description = "Redis port"
  value       = 6379
}

output "redis_credentials_secret_arn" {
  description = "ARN of the Secrets Manager secret containing Redis credentials"
  value       = aws_secretsmanager_secret.redis_credentials.arn
}

# -----------------------------------------------------------------------------
# IAM Outputs
# -----------------------------------------------------------------------------

output "lambda_execution_role_arn" {
  description = "Lambda execution role ARN"
  value       = aws_iam_role.lambda_execution.arn
}

output "deployment_role_arn" {
  description = "Deployment role ARN"
  value       = aws_iam_role.deployment.arn
}

# -----------------------------------------------------------------------------
# Monitoring Outputs
# -----------------------------------------------------------------------------

output "sns_alerts_topic_arn" {
  description = "SNS alerts topic ARN"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_log_group_ecs" {
  description = "CloudWatch log group for ECS"
  value       = aws_cloudwatch_log_group.ecs.name
}

# -----------------------------------------------------------------------------
# Connection Strings (for application configuration)
# -----------------------------------------------------------------------------

output "app_secrets_arn" {
  description = "ARN of the application secrets in Secrets Manager"
  value       = aws_secretsmanager_secret.app_secrets.arn
}

output "environment_variables" {
  description = "Environment variables for application configuration"
  value = {
    AWS_REGION           = var.aws_region
    NODE_ENV             = var.environment
    S3_DOCUMENTS_BUCKET  = aws_s3_bucket.documents.id
    S3_MAP_TILES_BUCKET  = aws_s3_bucket.map_tiles.id
    REDIS_HOST           = aws_elasticache_replication_group.main.primary_endpoint_address
    REDIS_PORT           = "6379"
    CLOUDFRONT_FRONTEND  = aws_cloudfront_distribution.frontend.domain_name
    CLOUDFRONT_MAP_TILES = aws_cloudfront_distribution.map_tiles.domain_name
  }
  sensitive = false
}

# -----------------------------------------------------------------------------
# Summary Output
# -----------------------------------------------------------------------------

output "summary" {
  description = "Infrastructure deployment summary"
  value = <<-EOT
    
    ============================================
    HZ Navigator Infrastructure Deployed
    ============================================
    
    Environment: ${var.environment}
    Region: ${var.aws_region}
    
    Endpoints:
    - Frontend: ${var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.frontend.domain_name}"}
    - API: ${var.domain_name != "" ? "https://${var.api_subdomain}.${var.domain_name}" : "https://${aws_lb.main.dns_name}"}
    - Map Tiles: ${var.domain_name != "" ? "https://tiles.${var.domain_name}" : "https://${aws_cloudfront_distribution.map_tiles.domain_name}"}
    
    Database:
    - Primary: ${aws_db_instance.main.address}:${aws_db_instance.main.port}
    ${var.create_read_replica ? "- Replica: ${aws_db_instance.replica[0].address}:${aws_db_instance.main.port}" : "- Replica: Not created"}
    
    Cache:
    - Redis: ${aws_elasticache_replication_group.main.primary_endpoint_address}:6379
    
    ECR Repository:
    - ${aws_ecr_repository.backend.repository_url}
    
    Next Steps:
    1. Build and push Docker image to ECR
    2. Deploy frontend to S3
    3. Run PostGIS extension setup SQL
    4. Configure DNS if using custom domain
    5. Verify health check at /api/v1/health
    
    ============================================
  EOT
}

