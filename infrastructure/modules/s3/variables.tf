# =============================================================================
# S3 Module Variables
# =============================================================================

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "documents_bucket_name" {
  description = "Name for the documents bucket"
  type        = string
  default     = "hz-navigator-documents"
}

variable "frontend_bucket_name" {
  description = "Name for the frontend bucket"
  type        = string
  default     = "hz-navigator-frontend"
}

variable "domain_name" {
  description = "Domain name for CORS configuration"
  type        = string
  default     = "hz-navigator.com"
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

