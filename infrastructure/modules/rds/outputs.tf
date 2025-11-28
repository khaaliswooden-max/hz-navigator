# =============================================================================
# RDS Module Outputs
# =============================================================================

output "db_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "address" {
  description = "RDS instance address (hostname)"
  value       = aws_db_instance.main.address
}

output "port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "connection_string" {
  description = "PostgreSQL connection string"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main.endpoint}/${var.db_name}?sslmode=require"
  sensitive   = true
}

output "read_replica_endpoint" {
  description = "RDS read replica endpoint"
  value       = var.create_read_replica ? aws_db_instance.replica[0].endpoint : null
}

output "read_replica_connection_string" {
  description = "PostgreSQL read replica connection string"
  value       = var.create_read_replica ? "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.replica[0].endpoint}/${var.db_name}?sslmode=require" : null
  sensitive   = true
}

output "db_password_secret_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for encryption"
  value       = aws_kms_key.rds.arn
}

