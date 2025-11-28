# =============================================================================
# S3 Module Outputs
# =============================================================================

# Documents Bucket
output "documents_bucket_id" {
  description = "Documents bucket ID"
  value       = aws_s3_bucket.documents.id
}

output "documents_bucket_arn" {
  description = "Documents bucket ARN"
  value       = aws_s3_bucket.documents.arn
}

output "documents_bucket_name" {
  description = "Documents bucket name"
  value       = aws_s3_bucket.documents.id
}

output "documents_bucket_domain_name" {
  description = "Documents bucket domain name"
  value       = aws_s3_bucket.documents.bucket_domain_name
}

# Frontend Bucket
output "frontend_bucket_id" {
  description = "Frontend bucket ID"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_arn" {
  description = "Frontend bucket ARN"
  value       = aws_s3_bucket.frontend.arn
}

output "frontend_bucket_name" {
  description = "Frontend bucket name"
  value       = aws_s3_bucket.frontend.id
}

output "frontend_bucket_domain_name" {
  description = "Frontend bucket domain name"
  value       = aws_s3_bucket.frontend.bucket_regional_domain_name
}

output "frontend_bucket_website_endpoint" {
  description = "Frontend bucket website endpoint"
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
}

# Map Tiles Bucket
output "map_tiles_bucket_id" {
  description = "Map tiles bucket ID"
  value       = aws_s3_bucket.map_tiles.id
}

output "map_tiles_bucket_arn" {
  description = "Map tiles bucket ARN"
  value       = aws_s3_bucket.map_tiles.arn
}

output "map_tiles_bucket_domain_name" {
  description = "Map tiles bucket domain name"
  value       = aws_s3_bucket.map_tiles.bucket_regional_domain_name
}

# KMS Key
output "kms_key_arn" {
  description = "KMS key ARN for S3 encryption"
  value       = aws_kms_key.s3.arn
}

