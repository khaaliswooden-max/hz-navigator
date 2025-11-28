# CloudWatch Alarms for HZ Navigator
# Terraform configuration for production monitoring

variable "environment" {
  description = "Environment name (production, staging)"
  type        = string
  default     = "production"
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for alarm notifications"
  type        = string
}

locals {
  common_tags = {
    Application = "hz-navigator"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ============================================
# API Performance Alarms
# ============================================

resource "aws_cloudwatch_metric_alarm" "api_response_time_p95" {
  alarm_name          = "hz-navigator-${var.environment}-api-response-time-p95"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ResponseTimeP95"
  namespace           = "HZNavigator/${var.environment}"
  period              = 60
  statistic           = "Average"
  threshold           = 2000 # 2 seconds
  alarm_description   = "API p95 response time exceeds 2 seconds"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  dimensions = {
    Environment = var.environment
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "hz-navigator-${var.environment}-api-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ErrorRate"
  namespace           = "HZNavigator/${var.environment}"
  period              = 60
  statistic           = "Average"
  threshold           = 0.05 # 5%
  alarm_description   = "API error rate exceeds 5%"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  dimensions = {
    Environment = var.environment
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "hz-navigator-${var.environment}-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrors"
  namespace           = "HZNavigator/${var.environment}"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "More than 10 5xx errors in 1 minute"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  dimensions = {
    Environment = var.environment
  }
  
  tags = local.common_tags
}

# ============================================
# Infrastructure Alarms
# ============================================

resource "aws_cloudwatch_metric_alarm" "cpu_utilization" {
  alarm_name          = "hz-navigator-${var.environment}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilization exceeds 80%"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "memory_utilization" {
  alarm_name          = "hz-navigator-${var.environment}-memory-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "mem_used_percent"
  namespace           = "HZNavigator"
  period              = 60
  statistic           = "Average"
  threshold           = 90
  alarm_description   = "Memory utilization exceeds 90%"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  dimensions = {
    Environment = var.environment
  }
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "disk_utilization" {
  alarm_name          = "hz-navigator-${var.environment}-disk-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "disk_used_percent"
  namespace           = "HZNavigator"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Disk utilization exceeds 80%"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  dimensions = {
    Environment = var.environment
    Path        = "/"
  }
  
  tags = local.common_tags
}

# ============================================
# Database Alarms
# ============================================

resource "aws_cloudwatch_metric_alarm" "db_connections" {
  alarm_name          = "hz-navigator-${var.environment}-db-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Database connections exceed 80% of max"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  alarm_name          = "hz-navigator-${var.environment}-db-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Database CPU utilization exceeds 80%"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "db_freeable_memory" {
  alarm_name          = "hz-navigator-${var.environment}-db-memory"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 3
  metric_name         = "FreeableMemory"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 1000000000 # 1GB
  alarm_description   = "Database freeable memory below 1GB"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  tags = local.common_tags
}

# ============================================
# Load Balancer Alarms
# ============================================

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "hz-navigator-${var.environment}-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "Unhealthy hosts detected in target group"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  alarm_name          = "hz-navigator-${var.environment}-alb-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "p95"
  threshold           = 0.5 # 500ms
  alarm_description   = "ALB target response time p95 exceeds 500ms"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  tags = local.common_tags
}

# ============================================
# Cache (ElastiCache) Alarms
# ============================================

resource "aws_cloudwatch_metric_alarm" "cache_cpu" {
  alarm_name          = "hz-navigator-${var.environment}-cache-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis cache CPU utilization exceeds 80%"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  tags = local.common_tags
}

resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  alarm_name          = "hz-navigator-${var.environment}-cache-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseMemoryUsagePercentage"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis cache memory usage exceeds 80%"
  
  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]
  
  tags = local.common_tags
}

# ============================================
# CloudWatch Dashboard
# ============================================

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "hz-navigator-${var.environment}"
  
  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "API Response Time"
          region  = "us-east-1"
          metrics = [
            ["HZNavigator/${var.environment}", "ResponseTimeP50", { label = "p50" }],
            [".", "ResponseTimeP95", { label = "p95" }],
            [".", "ResponseTimeP99", { label = "p99" }]
          ]
          period = 60
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "Request Rate & Errors"
          region  = "us-east-1"
          metrics = [
            ["HZNavigator/${var.environment}", "RequestCount", { label = "Requests" }],
            [".", "ErrorCount", { label = "Errors", color = "#d62728" }]
          ]
          period = 60
          stat   = "Sum"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "CPU Utilization"
          region  = "us-east-1"
          metrics = [
            ["AWS/EC2", "CPUUtilization", { label = "EC2" }],
            ["AWS/RDS", "CPUUtilization", { label = "RDS" }],
            ["AWS/ElastiCache", "CPUUtilization", { label = "Redis" }]
          ]
          period = 60
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "Memory Utilization"
          region  = "us-east-1"
          metrics = [
            ["HZNavigator", "mem_used_percent", { label = "EC2" }],
            ["AWS/ElastiCache", "DatabaseMemoryUsagePercentage", { label = "Redis" }]
          ]
          period = 60
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "Database Connections"
          region  = "us-east-1"
          metrics = [
            ["AWS/RDS", "DatabaseConnections"]
          ]
          period = 60
          stat   = "Average"
        }
      }
    ]
  })
}

