# =============================================================================
# ECS Fargate Module - HZ-Navigator
# =============================================================================
# Creates ECS Fargate infrastructure with:
# - ECS Cluster with Container Insights
# - Task definition (2 vCPU, 4GB RAM)
# - Service with auto-scaling (min: 2, max: 10)
# - Health checks
# - CloudWatch logs
# =============================================================================

# -----------------------------------------------------------------------------
# ECS Cluster
# -----------------------------------------------------------------------------

resource "aws_ecs_cluster" "main" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-cluster"
  })
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    base              = 2
    weight            = 100
    capacity_provider = "FARGATE"
  }

  default_capacity_provider_strategy {
    base              = 0
    weight            = 50
    capacity_provider = "FARGATE_SPOT"
  }
}

# -----------------------------------------------------------------------------
# CloudWatch Log Group for ECS
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/aws/ecs/${var.name_prefix}"
  retention_in_days = 30

  tags = var.tags
}

# -----------------------------------------------------------------------------
# ECS Task Definition
# -----------------------------------------------------------------------------

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.name_prefix}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = var.task_execution_role_arn
  task_role_arn            = var.task_role_arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = var.container_image
      essential = true

      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        for key, value in var.container_environment : {
          name  = key
          value = value
        }
      ]

      secrets = [
        for key, value in var.container_secrets : {
          name      = key
          valueFrom = value
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/api/v1/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      linuxParameters = {
        initProcessEnabled = true
      }

      ulimits = [
        {
          name      = "nofile"
          softLimit = 65536
          hardLimit = 65536
        }
      ]
    }
  ])

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-backend-task"
  })
}

# -----------------------------------------------------------------------------
# ECS Service
# -----------------------------------------------------------------------------

resource "aws_ecs_service" "backend" {
  name            = "${var.name_prefix}-backend-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.min_capacity
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.security_group_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.alb_target_group_arn
    container_name   = "backend"
    container_port   = 3000
  }

  deployment_configuration {
    maximum_percent         = 200
    minimum_healthy_percent = 100
    
    deployment_circuit_breaker {
      enable   = true
      rollback = true
    }
  }

  deployment_controller {
    type = "ECS"
  }

  # Enable ECS managed tags
  enable_ecs_managed_tags = true
  propagate_tags          = "SERVICE"

  # Service discovery (optional)
  # service_registries {
  #   registry_arn = aws_service_discovery_service.backend.arn
  # }

  health_check_grace_period_seconds = 120

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-backend-service"
  })

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

# -----------------------------------------------------------------------------
# Auto Scaling
# -----------------------------------------------------------------------------

resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = var.max_capacity
  min_capacity       = var.min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Scale based on CPU utilization
resource "aws_appautoscaling_policy" "cpu" {
  name               = "${var.name_prefix}-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Scale based on memory utilization
resource "aws_appautoscaling_policy" "memory" {
  name               = "${var.name_prefix}-memory-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = 75.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Scale based on ALB request count
resource "aws_appautoscaling_policy" "alb_requests" {
  name               = "${var.name_prefix}-alb-requests-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = var.alb_resource_label
    }
    target_value       = 1000.0  # Scale when requests per target exceed 1000/min
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}

# Schedule-based scaling for expected traffic patterns
resource "aws_appautoscaling_scheduled_action" "scale_up_morning" {
  name               = "${var.name_prefix}-scale-up-morning"
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  schedule           = "cron(0 8 ? * MON-FRI *)"  # 8 AM UTC weekdays
  timezone           = "America/New_York"

  scalable_target_action {
    min_capacity = var.min_capacity + 2
    max_capacity = var.max_capacity
  }
}

resource "aws_appautoscaling_scheduled_action" "scale_down_evening" {
  name               = "${var.name_prefix}-scale-down-evening"
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  schedule           = "cron(0 20 ? * MON-FRI *)"  # 8 PM UTC weekdays
  timezone           = "America/New_York"

  scalable_target_action {
    min_capacity = var.min_capacity
    max_capacity = var.max_capacity
  }
}


# -----------------------------------------------------------------------------
# CloudWatch Alarms for ECS
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  alarm_name          = "${var.name_prefix}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS CPU utilization is high"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  alarm_name          = "${var.name_prefix}-ecs-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "ECS memory utilization is high"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "ecs_running_count_low" {
  alarm_name          = "${var.name_prefix}-ecs-running-count-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 300
  statistic           = "Average"
  threshold           = var.min_capacity
  alarm_description   = "ECS running task count is below minimum"

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

