# =============================================================================
# Application Load Balancer Module - HZ-Navigator
# =============================================================================
# Creates an internet-facing ALB with:
# - Target group for ECS service
# - Health check: /api/v1/health
# - SSL certificate (ACM)
# - HTTP to HTTPS redirect
# =============================================================================

# -----------------------------------------------------------------------------
# Application Load Balancer
# -----------------------------------------------------------------------------

resource "aws_lb" "main" {
  name               = "${var.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group_id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2              = true
  idle_timeout              = 60

  # Access logs (optional - requires S3 bucket)
  # access_logs {
  #   bucket  = var.access_logs_bucket
  #   prefix  = "alb"
  #   enabled = true
  # }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-alb"
  })
}

# -----------------------------------------------------------------------------
# Target Group
# -----------------------------------------------------------------------------

resource "aws_lb_target_group" "backend" {
  name        = "${var.name_prefix}-backend-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    path                = var.health_check_path
    protocol            = "HTTP"
    matcher             = "200-299"
  }

  # Deregistration delay for graceful shutdown
  deregistration_delay = 30

  # Stickiness (session affinity) - disable for stateless apps
  stickiness {
    type            = "lb_cookie"
    enabled         = false
    cookie_duration = 86400
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-backend-tg"
  })

  lifecycle {
    create_before_destroy = true
  }
}

# -----------------------------------------------------------------------------
# HTTPS Listener (port 443)
# -----------------------------------------------------------------------------

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# HTTP Listener (port 80) - Redirect to HTTPS
# -----------------------------------------------------------------------------

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# Listener Rules (optional - for path-based routing)
# -----------------------------------------------------------------------------

# API routing rule
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }

  tags = var.tags
}

# Health check bypass (allow unauthenticated)
resource "aws_lb_listener_rule" "health" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }

  condition {
    path_pattern {
      values = ["/api/v1/health", "/health"]
    }
  }

  tags = var.tags
}

# -----------------------------------------------------------------------------
# CloudWatch Alarms for ALB
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "alb_5xx_errors" {
  alarm_name          = "${var.name_prefix}-alb-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB is returning 5XX errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "alb_target_5xx_errors" {
  alarm_name          = "${var.name_prefix}-alb-target-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Backend targets are returning 5XX errors"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.backend.arn_suffix
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy_hosts" {
  alarm_name          = "${var.name_prefix}-alb-unhealthy-hosts"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 0
  alarm_description   = "ALB has unhealthy hosts"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.backend.arn_suffix
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  alarm_name          = "${var.name_prefix}-alb-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 2  # 2 seconds p95 latency
  alarm_description   = "ALB response latency is high"

  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
    TargetGroup  = aws_lb_target_group.backend.arn_suffix
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

