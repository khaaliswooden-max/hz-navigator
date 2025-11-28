# =============================================================================
# ACM Module Outputs
# =============================================================================

output "alb_certificate_arn" {
  description = "ARN of the ALB certificate"
  value       = aws_acm_certificate.alb.arn
}

output "cloudfront_certificate_arn" {
  description = "ARN of the CloudFront certificate (us-east-1)"
  value       = aws_acm_certificate.cloudfront.arn
}

output "alb_certificate_domain_validation_options" {
  description = "Domain validation options for ALB certificate"
  value       = aws_acm_certificate.alb.domain_validation_options
}

output "cloudfront_certificate_domain_validation_options" {
  description = "Domain validation options for CloudFront certificate"
  value       = aws_acm_certificate.cloudfront.domain_validation_options
}

