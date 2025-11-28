# =============================================================================
# CloudFront Module Outputs
# =============================================================================

# Frontend Distribution
output "frontend_distribution_id" {
  description = "CloudFront distribution ID for frontend"
  value       = aws_cloudfront_distribution.frontend.id
}

output "frontend_distribution_arn" {
  description = "CloudFront distribution ARN for frontend"
  value       = aws_cloudfront_distribution.frontend.arn
}

output "frontend_distribution_domain" {
  description = "CloudFront distribution domain name for frontend"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "frontend_distribution_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID (for Route53 alias)"
  value       = aws_cloudfront_distribution.frontend.hosted_zone_id
}

# Map Tiles Distribution
output "map_tiles_distribution_id" {
  description = "CloudFront distribution ID for map tiles"
  value       = aws_cloudfront_distribution.map_tiles.id
}

output "map_tiles_distribution_domain" {
  description = "CloudFront distribution domain name for map tiles"
  value       = aws_cloudfront_distribution.map_tiles.domain_name
}

output "map_tiles_distribution_hosted_zone_id" {
  description = "CloudFront distribution hosted zone ID for map tiles"
  value       = aws_cloudfront_distribution.map_tiles.hosted_zone_id
}

# OAC IDs
output "frontend_oac_id" {
  description = "Origin Access Control ID for frontend"
  value       = aws_cloudfront_origin_access_control.frontend.id
}

output "map_tiles_oac_id" {
  description = "Origin Access Control ID for map tiles"
  value       = aws_cloudfront_origin_access_control.map_tiles.id
}

