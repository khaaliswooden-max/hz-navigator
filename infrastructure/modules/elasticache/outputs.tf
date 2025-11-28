# =============================================================================
# ElastiCache Module Outputs
# =============================================================================

output "cluster_id" {
  description = "ElastiCache replication group ID"
  value       = aws_elasticache_replication_group.main.id
}

output "cluster_arn" {
  description = "ElastiCache replication group ARN"
  value       = aws_elasticache_replication_group.main.arn
}

output "primary_endpoint" {
  description = "Primary endpoint address"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "reader_endpoint" {
  description = "Reader endpoint address"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "endpoint" {
  description = "Primary endpoint address (alias)"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = 6379
}

output "connection_string" {
  description = "Redis connection string (with auth)"
  value       = "rediss://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
  sensitive   = true
}

output "auth_token_secret_arn" {
  description = "ARN of the Secrets Manager secret containing Redis auth token"
  value       = aws_secretsmanager_secret.redis_auth.arn
}

