# =============================================================================
# ACM Certificate Module - HZ-Navigator
# =============================================================================
# Creates ACM certificates for:
# - ALB (in the same region as ALB)
# - CloudFront (must be in us-east-1)
# =============================================================================

terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws, aws.us_east_1]
    }
  }
}

# -----------------------------------------------------------------------------
# ACM Certificate for ALB (regional)
# -----------------------------------------------------------------------------

resource "aws_acm_certificate" "alb" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}",
    "api.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "hz-navigator-alb-cert-${var.environment}"
  })
}

# -----------------------------------------------------------------------------
# ACM Certificate for CloudFront (must be in us-east-1)
# -----------------------------------------------------------------------------

resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1

  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(var.tags, {
    Name = "hz-navigator-cloudfront-cert-${var.environment}"
  })
}

# -----------------------------------------------------------------------------
# Certificate Validation Records (output for Route53)
# -----------------------------------------------------------------------------

# Note: These outputs can be used to create Route53 validation records
# If using Route53, you can add:
#
# resource "aws_route53_record" "cert_validation" {
#   for_each = {
#     for dvo in aws_acm_certificate.alb.domain_validation_options : dvo.domain_name => {
#       name   = dvo.resource_record_name
#       record = dvo.resource_record_value
#       type   = dvo.resource_record_type
#     }
#   }
#
#   allow_overwrite = true
#   name            = each.value.name
#   records         = [each.value.record]
#   ttl             = 60
#   type            = each.value.type
#   zone_id         = var.route53_zone_id
# }
#
# resource "aws_acm_certificate_validation" "alb" {
#   certificate_arn         = aws_acm_certificate.alb.arn
#   validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
# }

