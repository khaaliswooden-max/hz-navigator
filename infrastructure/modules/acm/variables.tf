# =============================================================================
# ACM Module Variables
# =============================================================================

variable "domain_name" {
  description = "Primary domain name for the certificate"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

