# =============================================================================
# HZ Navigator - Production AWS Infrastructure
# =============================================================================
# This Terraform configuration sets up a production-ready AWS infrastructure
# including VPC, RDS, ECS Fargate, ALB, S3, CloudFront, ElastiCache, and IAM.
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

  # Configure backend for state management (uncomment and configure for production)
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
      Application = "hz-navigator"
      Environment = var.environment
      ManagedBy   = "terraform"
      Project     = "HZ Navigator"
    }
  }
}

# Provider for CloudFront ACM certificates (must be in us-east-1)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Application = "hz-navigator"
      Environment = var.environment
      ManagedBy   = "terraform"
      Project     = "HZ Navigator"
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

data "aws_region" "current" {}

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
# Local Values
# =============================================================================

locals {
  name_prefix = "hz-navigator-${var.environment}"
  
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
  
  common_tags = {
    Application = "hz-navigator"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

