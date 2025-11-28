# =============================================================================
# HZ-Navigator Infrastructure Variables
# =============================================================================

# -----------------------------------------------------------------------------
# General Configuration
# -----------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
}

variable "frontend_subdomain" {
  description = "Subdomain for the frontend (e.g., 'app' for app.example.com)"
  type        = string
  default     = "app"
}

# -----------------------------------------------------------------------------
# VPC Configuration
# -----------------------------------------------------------------------------

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.20.0/24"]
}

# -----------------------------------------------------------------------------
# RDS Configuration
# -----------------------------------------------------------------------------

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage for RDS (GB)"
  type        = number
  default     = 100
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "hz_navigator"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "hz_navigator_admin"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment"
  type        = bool
  default     = true
}

variable "db_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "db_create_read_replica" {
  description = "Create a read replica for the RDS instance"
  type        = bool
  default     = true
}

variable "db_replica_instance_class" {
  description = "Instance class for the read replica"
  type        = string
  default     = "db.t3.medium"
}

# -----------------------------------------------------------------------------
# ECS Configuration
# -----------------------------------------------------------------------------

variable "ecs_task_cpu" {
  description = "CPU units for ECS task (1024 = 1 vCPU)"
  type        = number
  default     = 2048  # 2 vCPU
}

variable "ecs_task_memory" {
  description = "Memory for ECS task (MB)"
  type        = number
  default     = 4096  # 4 GB
}

variable "ecs_min_capacity" {
  description = "Minimum number of ECS tasks"
  type        = number
  default     = 2
}

variable "ecs_max_capacity" {
  description = "Maximum number of ECS tasks"
  type        = number
  default     = 10
}

variable "container_image" {
  description = "Docker image for the backend container"
  type        = string
  default     = "hz-navigator-backend:latest"
}

# -----------------------------------------------------------------------------
# ElastiCache (Redis) Configuration
# -----------------------------------------------------------------------------

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.r5.large"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in the cluster"
  type        = number
  default     = 2
}

variable "redis_parameter_group_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis7"
}

# -----------------------------------------------------------------------------
# S3 Configuration
# -----------------------------------------------------------------------------

variable "documents_bucket_name" {
  description = "Name for the documents S3 bucket"
  type        = string
  default     = "hz-navigator-documents"
}

variable "frontend_bucket_name" {
  description = "Name for the frontend S3 bucket"
  type        = string
  default     = "hz-navigator-frontend"
}

