# =============================================================================
# HZ Navigator - ElastiCache Redis Configuration
# =============================================================================
# - Cluster mode disabled
# - 2 nodes for redundancy (primary + replica)
# - r5.large instance type
# =============================================================================

# -----------------------------------------------------------------------------
# ElastiCache Parameter Group
# -----------------------------------------------------------------------------

resource "aws_elasticache_parameter_group" "main" {
  family      = "redis7"
  name        = "${local.name_prefix}-redis-params"
  description = "Redis parameter group for ${local.name_prefix}"

  # Optimize for caching use case
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"
  }

  parameter {
    name  = "timeout"
    value = "300"
  }

  parameter {
    name  = "tcp-keepalive"
    value = "300"
  }

  tags = {
    Name = "${local.name_prefix}-redis-params"
  }
}

# -----------------------------------------------------------------------------
# ElastiCache Replication Group (Primary + Replica)
# -----------------------------------------------------------------------------

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "${local.name_prefix}-redis"
  description                = "Redis cluster for ${local.name_prefix}"
  
  # Node configuration
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.redis_num_cache_nodes  # 2 nodes for redundancy
  
  # Engine configuration
  engine                     = "redis"
  engine_version             = "7.0"
  port                       = 6379
  parameter_group_name       = aws_elasticache_parameter_group.main.name

  # Network configuration
  subnet_group_name          = aws_elasticache_subnet_group.main.name
  security_group_ids         = [aws_security_group.elasticache.id]

  # High availability
  automatic_failover_enabled = true
  multi_az_enabled           = true
  
  # Maintenance
  maintenance_window         = "sun:05:00-sun:06:00"
  snapshot_window            = "04:00-05:00"
  snapshot_retention_limit   = 7
  
  # Security
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  kms_key_id                 = aws_kms_key.elasticache.arn
  auth_token                 = random_password.redis_auth_token.result
  
  # Auto minor version upgrade
  auto_minor_version_upgrade = true
  
  # Notifications
  notification_topic_arn     = aws_sns_topic.alerts.arn

  # Apply changes immediately (set to false for production)
  apply_immediately          = false

  tags = {
    Name = "${local.name_prefix}-redis"
  }

  lifecycle {
    ignore_changes = [num_cache_clusters]
  }
}

# -----------------------------------------------------------------------------
# KMS Key for ElastiCache Encryption
# -----------------------------------------------------------------------------

resource "aws_kms_key" "elasticache" {
  description             = "KMS key for ElastiCache encryption - ${local.name_prefix}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "${local.name_prefix}-elasticache-kms"
  }
}

resource "aws_kms_alias" "elasticache" {
  name          = "alias/${local.name_prefix}-elasticache"
  target_key_id = aws_kms_key.elasticache.key_id
}

# -----------------------------------------------------------------------------
# Redis Auth Token
# -----------------------------------------------------------------------------

resource "random_password" "redis_auth_token" {
  length           = 32
  special          = false  # Redis auth token has character restrictions
}

# Store Redis credentials in Secrets Manager
resource "aws_secretsmanager_secret" "redis_credentials" {
  name        = "${local.name_prefix}/redis/credentials"
  description = "Redis credentials for ${local.name_prefix}"
  kms_key_id  = aws_kms_key.elasticache.arn

  tags = {
    Name = "${local.name_prefix}-redis-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "redis_credentials" {
  secret_id = aws_secretsmanager_secret.redis_credentials.id
  secret_string = jsonencode({
    host       = aws_elasticache_replication_group.main.primary_endpoint_address
    port       = 6379
    auth_token = random_password.redis_auth_token.result
    url        = "rediss://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
  })
}

# -----------------------------------------------------------------------------
# SNS Topic for Alerts
# -----------------------------------------------------------------------------

resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"

  tags = {
    Name = "${local.name_prefix}-alerts"
  }
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms for Redis
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${local.name_prefix}-redis-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis CPU utilization exceeds 80%"
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.id}-001"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${local.name_prefix}-redis-cpu-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${local.name_prefix}-redis-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis memory usage exceeds 80%"
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.id}-001"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${local.name_prefix}-redis-memory-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_connections" {
  alarm_name          = "${local.name_prefix}-redis-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CurrConnections"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 5000
  alarm_description   = "Redis connections exceed 5000"
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.id}-001"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${local.name_prefix}-redis-connections-alarm"
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_replication_lag" {
  alarm_name          = "${local.name_prefix}-redis-replication-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicationLag"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 30
  alarm_description   = "Redis replication lag exceeds 30 seconds"
  
  dimensions = {
    CacheClusterId = "${aws_elasticache_replication_group.main.id}-002"  # Replica node
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${local.name_prefix}-redis-replication-lag-alarm"
  }
}

