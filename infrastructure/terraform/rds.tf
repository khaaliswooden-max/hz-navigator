# =============================================================================
# HZ Navigator - RDS PostgreSQL Configuration
# =============================================================================
# - Instance: db.t3.medium (upgrade to db.r5.large later)
# - PostGIS extension enabled
# - Multi-AZ deployment
# - Automated backups (daily, 7-day retention)
# - Encryption at rest
# - Read replica for read-heavy queries
# =============================================================================

# -----------------------------------------------------------------------------
# KMS Key for RDS Encryption
# -----------------------------------------------------------------------------

resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption - ${local.name_prefix}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name = "${local.name_prefix}-rds-kms"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/${local.name_prefix}-rds"
  target_key_id = aws_kms_key.rds.key_id
}

# -----------------------------------------------------------------------------
# DB Parameter Group (with PostGIS support)
# -----------------------------------------------------------------------------

resource "aws_db_parameter_group" "main" {
  family      = "postgres15"
  name        = "${local.name_prefix}-pg-params"
  description = "PostgreSQL parameter group for ${local.name_prefix}"

  # PostGIS and performance parameters
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  parameter {
    name  = "max_connections"
    value = "200"
  }

  parameter {
    name  = "work_mem"
    value = "65536"  # 64MB
  }

  parameter {
    name  = "maintenance_work_mem"
    value = "524288"  # 512MB
  }

  parameter {
    name  = "effective_cache_size"
    value = "2097152"  # 2GB
  }

  tags = {
    Name = "${local.name_prefix}-pg-params"
  }
}

# -----------------------------------------------------------------------------
# DB Option Group
# -----------------------------------------------------------------------------

resource "aws_db_option_group" "main" {
  name                     = "${local.name_prefix}-pg-options"
  engine_name              = "postgres"
  major_engine_version     = "15"

  tags = {
    Name = "${local.name_prefix}-pg-options"
  }
}

# -----------------------------------------------------------------------------
# Primary RDS Instance
# -----------------------------------------------------------------------------

resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-postgres"

  # Engine configuration
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.db_instance_class
  
  # Storage configuration
  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.rds.arn

  # Database configuration
  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result
  port     = 5432

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = var.db_multi_az

  # Parameter and option groups
  parameter_group_name = aws_db_parameter_group.main.name
  option_group_name    = aws_db_option_group.main.name

  # Backup configuration
  backup_retention_period   = var.db_backup_retention_period
  backup_window             = "03:00-04:00"  # UTC
  maintenance_window        = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot     = true
  delete_automated_backups  = false
  final_snapshot_identifier = "${local.name_prefix}-final-snapshot"
  skip_final_snapshot       = false

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id = aws_kms_key.rds.arn

  # Protection
  deletion_protection = var.enable_deletion_protection

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name = "${local.name_prefix}-postgres"
  }

  lifecycle {
    prevent_destroy = false  # Set to true in production
  }
}

# -----------------------------------------------------------------------------
# Read Replica (for read-heavy queries)
# -----------------------------------------------------------------------------

resource "aws_db_instance" "replica" {
  count = var.create_read_replica ? 1 : 0

  identifier = "${local.name_prefix}-postgres-replica"

  # Replicate from primary
  replicate_source_db = aws_db_instance.main.identifier

  # Instance configuration
  instance_class = var.db_instance_class
  
  # Storage (inherits from primary)
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  # Network configuration
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Parameter group
  parameter_group_name = aws_db_parameter_group.main.name

  # Monitoring
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled    = true
  performance_insights_retention_period = 7
  performance_insights_kms_key_id = aws_kms_key.rds.arn

  # No backup for replica
  backup_retention_period = 0
  skip_final_snapshot     = true

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  tags = {
    Name = "${local.name_prefix}-postgres-replica"
    Role = "read-replica"
  }
}

# -----------------------------------------------------------------------------
# RDS Enhanced Monitoring IAM Role
# -----------------------------------------------------------------------------

resource "aws_iam_role" "rds_monitoring" {
  name = "${local.name_prefix}-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# -----------------------------------------------------------------------------
# Store DB Credentials in Secrets Manager
# -----------------------------------------------------------------------------

resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${local.name_prefix}/database/credentials"
  description = "Database credentials for ${local.name_prefix}"
  kms_key_id  = aws_kms_key.rds.arn

  tags = {
    Name = "${local.name_prefix}-db-credentials"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username            = var.db_username
    password            = random_password.db_password.result
    engine              = "postgres"
    host                = aws_db_instance.main.address
    port                = aws_db_instance.main.port
    dbname              = var.db_name
    dbInstanceIdentifier = aws_db_instance.main.identifier
    read_replica_host   = var.create_read_replica ? aws_db_instance.replica[0].address : null
  })
}

# -----------------------------------------------------------------------------
# PostGIS Extension Setup Script
# -----------------------------------------------------------------------------
# Note: Run this SQL after database creation to enable PostGIS
# CREATE EXTENSION IF NOT EXISTS postgis;
# CREATE EXTENSION IF NOT EXISTS postgis_topology;
# CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
# CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

