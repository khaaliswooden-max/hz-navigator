# =============================================================================
# HZ-Navigator Production Infrastructure
# =============================================================================
# This Terraform configuration sets up the complete AWS infrastructure for
# the HZ-Navigator application including VPC, RDS, ECS, ALB, S3, CloudFront,
# ElastiCache, and IAM resources.
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configuration for state management
  # Uncomment and configure for production use
  # backend "s3" {
  #   bucket         = "hz-navigator-terraform-state"
  #   key            = "production/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "hz-navigator-terraform-locks"
  # }
}

# =============================================================================
# Provider Configuration
# =============================================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "hz-navigator"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "platform-team"
    }
  }
}

# Provider for ACM certificates (must be in us-east-1 for CloudFront)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "hz-navigator"
      Environment = var.environment
      ManagedBy   = "terraform"
      Owner       = "platform-team"
    }
  }
}

# =============================================================================
# Data Sources
# =============================================================================

data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

# =============================================================================
# Random Resources
# =============================================================================

resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "random_id" "suffix" {
  byte_length = 4
}

# =============================================================================
# Local Variables
# =============================================================================

locals {
  name_prefix = "hz-navigator-${var.environment}"
  
  # Select first 2 availability zones
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
  
  # Common tags
  common_tags = {
    Project     = "hz-navigator"
    Environment = var.environment
  }
}

# =============================================================================
# Module: VPC
# =============================================================================

module "vpc" {
  source = "./modules/vpc"

  name_prefix = local.name_prefix
  environment = var.environment
  
  vpc_cidr             = var.vpc_cidr
  availability_zones   = local.azs
  public_subnet_cidrs  = var.public_subnet_cidrs
  private_subnet_cidrs = var.private_subnet_cidrs

  tags = local.common_tags
}

# =============================================================================
# Module: Security Groups
# =============================================================================

module "security_groups" {
  source = "./modules/security-groups"

  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  vpc_cidr    = var.vpc_cidr

  tags = local.common_tags
}

# =============================================================================
# Module: RDS PostgreSQL
# =============================================================================

module "rds" {
  source = "./modules/rds"

  name_prefix = local.name_prefix
  environment = var.environment

  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.private_subnet_ids
  security_group_id  = module.security_groups.rds_security_group_id

  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_name              = var.db_name
  db_username          = var.db_username
  db_password          = random_password.db_password.result

  multi_az                    = var.db_multi_az
  backup_retention_period     = var.db_backup_retention_period
  create_read_replica         = var.db_create_read_replica
  replica_instance_class      = var.db_replica_instance_class

  tags = local.common_tags
}

# =============================================================================
# Module: ElastiCache Redis
# =============================================================================

module "elasticache" {
  source = "./modules/elasticache"

  name_prefix = local.name_prefix
  environment = var.environment

  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.private_subnet_ids
  security_group_id = module.security_groups.redis_security_group_id

  node_type           = var.redis_node_type
  num_cache_nodes     = var.redis_num_cache_nodes
  parameter_group_family = var.redis_parameter_group_family

  tags = local.common_tags
}

# =============================================================================
# Module: S3 Buckets
# =============================================================================

module "s3" {
  source = "./modules/s3"

  name_prefix = local.name_prefix
  environment = var.environment
  
  documents_bucket_name = var.documents_bucket_name
  frontend_bucket_name  = var.frontend_bucket_name
  domain_name           = var.domain_name

  tags = local.common_tags
}

# =============================================================================
# Module: IAM Roles
# =============================================================================

module "iam" {
  source = "./modules/iam"

  name_prefix = local.name_prefix
  environment = var.environment

  documents_bucket_arn = module.s3.documents_bucket_arn
  frontend_bucket_arn  = module.s3.frontend_bucket_arn
  
  rds_arn              = module.rds.db_instance_arn
  elasticache_arn      = module.elasticache.cluster_arn

  tags = local.common_tags
}

# =============================================================================
# Module: ACM Certificates
# =============================================================================

module "acm" {
  source = "./modules/acm"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  domain_name     = var.domain_name
  environment     = var.environment

  tags = local.common_tags
}

# =============================================================================
# Module: Application Load Balancer
# =============================================================================

module "alb" {
  source = "./modules/alb"

  name_prefix = local.name_prefix
  environment = var.environment

  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  security_group_id = module.security_groups.alb_security_group_id

  certificate_arn = module.acm.alb_certificate_arn
  health_check_path = "/api/v1/health"

  tags = local.common_tags
}

# =============================================================================
# Module: ECS Fargate
# =============================================================================

module "ecs" {
  source = "./modules/ecs"

  name_prefix = local.name_prefix
  environment = var.environment
  aws_region  = var.aws_region

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_id  = module.security_groups.ecs_security_group_id

  alb_target_group_arn = module.alb.target_group_arn
  alb_resource_label   = "${module.alb.alb_arn_suffix}/${module.alb.target_group_arn_suffix}"

  task_cpu    = var.ecs_task_cpu
  task_memory = var.ecs_task_memory
  
  min_capacity = var.ecs_min_capacity
  max_capacity = var.ecs_max_capacity

  task_execution_role_arn = module.iam.ecs_task_execution_role_arn
  task_role_arn           = module.iam.ecs_task_role_arn

  # Environment variables for the container
  container_environment = {
    NODE_ENV           = var.environment
    DATABASE_URL       = module.rds.connection_string
    DATABASE_READ_URL  = module.rds.read_replica_connection_string
    REDIS_URL          = module.elasticache.connection_string
    AWS_REGION         = var.aws_region
    S3_DOCUMENTS_BUCKET = module.s3.documents_bucket_name
    S3_FRONTEND_BUCKET  = module.s3.frontend_bucket_name
  }

  container_secrets = {
    DB_PASSWORD = module.rds.db_password_secret_arn
  }

  container_image = var.container_image

  tags = local.common_tags
}

# =============================================================================
# Module: CloudFront
# =============================================================================

module "cloudfront" {
  source = "./modules/cloudfront"

  providers = {
    aws = aws.us_east_1
  }

  name_prefix = local.name_prefix
  environment = var.environment

  frontend_bucket_domain_name    = module.s3.frontend_bucket_domain_name
  frontend_bucket_arn            = module.s3.frontend_bucket_arn
  frontend_bucket_id             = module.s3.frontend_bucket_id
  map_tiles_bucket_domain_name   = module.s3.map_tiles_bucket_domain_name
  map_tiles_bucket_id            = module.s3.map_tiles_bucket_id
  map_tiles_bucket_arn           = module.s3.map_tiles_bucket_arn
  
  alb_domain_name                = module.alb.dns_name
  
  domain_name                    = var.domain_name
  frontend_subdomain             = var.frontend_subdomain
  
  certificate_arn                = module.acm.cloudfront_certificate_arn

  tags = local.common_tags
}

# =============================================================================
# Outputs
# =============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.dns_name
}

output "cloudfront_distribution_domain" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.frontend_distribution_domain
}

output "rds_endpoint" {
  description = "RDS primary endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache.endpoint
  sensitive   = true
}

output "s3_documents_bucket" {
  description = "S3 documents bucket name"
  value       = module.s3.documents_bucket_name
}

output "s3_frontend_bucket" {
  description = "S3 frontend bucket name"
  value       = module.s3.frontend_bucket_name
}

