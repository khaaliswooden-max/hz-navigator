# =============================================================================
# ElastiCache Redis Module - HZ-Navigator
# =============================================================================
# Creates ElastiCache Redis cluster with:
# - Cluster mode disabled (single shard)
# - 2 nodes for redundancy (primary + replica)
# - r5.large instance type
# - Encryption at rest and in transit
# =============================================================================

# -----------------------------------------------------------------------------
# Subnet Group
# -----------------------------------------------------------------------------

resource "aws_elasticache_subnet_group" "main" {
  name        = "${var.name_prefix}-redis-subnet-group"
  description = "Subnet group for ${var.name_prefix} Redis"
  subnet_ids  = var.subnet_ids

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Parameter Group
# -----------------------------------------------------------------------------

resource "aws_elasticache_parameter_group" "main" {
  name        = "${var.name_prefix}-redis-params"
  family      = var.parameter_group_family
  description = "Redis parameter group for ${var.name_prefix}"

  # Performance tuning parameters
  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Enable key expiration notifications
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# KMS Key for Redis Encryption
# -----------------------------------------------------------------------------

resource "aws_kms_key" "redis" {
  description             = "KMS key for Redis encryption - ${var.name_prefix}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis-kms"
  })
}

resource "aws_kms_alias" "redis" {
  name          = "alias/${var.name_prefix}-redis"
  target_key_id = aws_kms_key.redis.key_id
}

# -----------------------------------------------------------------------------
# ElastiCache Replication Group (Cluster Mode Disabled)
# -----------------------------------------------------------------------------

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${var.name_prefix}-redis"
  description                = "Redis cluster for ${var.name_prefix}"

  # Node configuration
  node_type                  = var.node_type
  num_cache_clusters         = var.num_cache_nodes
  port                       = 6379

  # Engine configuration
  engine                     = "redis"
  engine_version             = "7.1"
  parameter_group_name       = aws_elasticache_parameter_group.main.name

  # Network configuration
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [var.security_group_id]

  # High availability
  automatic_failover_enabled = var.num_cache_nodes > 1 ? true : false
  multi_az_enabled           = var.num_cache_nodes > 1 ? true : false

  # Security - Encryption
  at_rest_encryption_enabled = true
  kms_key_id                 = aws_kms_key.redis.arn
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  # Maintenance
  maintenance_window         = "sun:05:00-sun:06:00"
  snapshot_retention_limit   = 7
  snapshot_window            = "04:00-05:00"
  
  # Auto minor version upgrades
  auto_minor_version_upgrade = true
  
  # Apply changes immediately in non-production
  apply_immediately          = var.environment != "production"

  # Logging
  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_slow_logs.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  log_delivery_configuration {
    destination      = aws_cloudwatch_log_group.redis_engine_logs.name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "engine-log"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-redis"
  })

  lifecycle {
    ignore_changes = [num_cache_clusters]
  }
}

# -----------------------------------------------------------------------------
# Random Password for Redis Auth Token
# -----------------------------------------------------------------------------

resource "random_password" "redis_auth_token" {
  length           = 32
  special          = false  # Redis auth token doesn't support all special chars
}

# -----------------------------------------------------------------------------
# Secrets Manager for Redis Auth Token
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "redis_auth" {
  name        = "${var.name_prefix}-redis-auth"
  description = "Redis auth token for ${var.name_prefix}"
  
  recovery_window_in_days = 7

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    endpoint   = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = 6379
  })
}

# -----------------------------------------------------------------------------
# CloudWatch Log Groups
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "redis_slow_logs" {
  name              = "/aws/elasticache/${var.name_prefix}-redis/slow-log"
  retention_in_days = 30

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "redis_engine_logs" {
  name              = "/aws/elasticache/${var.name_prefix}-redis/engine-log"
  retention_in_days = 30

  tags = var.tags
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "redis_cpu_high" {
  alarm_name          = "${var.name_prefix}-redis-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  alarm_description   = "Redis CPU utilization is high"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_memory_high" {
  alarm_name          = "${var.name_prefix}-redis-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis memory usage is high"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "redis_connections_high" {
  alarm_name          = "${var.name_prefix}-redis-connections-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 5000
  alarm_description   = "Redis connections are high"

  dimensions = {
    ReplicationGroupId = aws_elasticache_replication_group.main.id
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

