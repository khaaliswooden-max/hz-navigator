# =============================================================================
# CloudFront Module Variables
# =============================================================================

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "frontend_bucket_domain_name" {
  description = "Regional domain name of the frontend S3 bucket"
  type        = string
}

variable "frontend_bucket_arn" {
  description = "ARN of the frontend S3 bucket"
  type        = string
}

variable "frontend_bucket_id" {
  description = "ID of the frontend S3 bucket"
  type        = string
}

variable "map_tiles_bucket_domain_name" {
  description = "Regional domain name of the map tiles S3 bucket"
  type        = string
  default     = ""
}

variable "map_tiles_bucket_id" {
  description = "ID of the map tiles S3 bucket"
  type        = string
  default     = ""
}

variable "map_tiles_bucket_arn" {
  description = "ARN of the map tiles S3 bucket"
  type        = string
  default     = ""
}

variable "alb_domain_name" {
  description = "DNS name of the ALB"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the CloudFront distribution"
  type        = string
}

variable "frontend_subdomain" {
  description = "Subdomain for the frontend (e.g., 'app' for app.example.com)"
  type        = string
  default     = "app"
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate (must be in us-east-1)"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

