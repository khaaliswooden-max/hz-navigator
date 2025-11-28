# =============================================================================
# HZ Navigator - S3 Configuration
# =============================================================================
# - hz-navigator-documents (private)
# - hz-navigator-frontend (public for static hosting)
# - Enable versioning
# - Configure CORS
# - Set lifecycle policies
# =============================================================================

# -----------------------------------------------------------------------------
# Documents Bucket (Private)
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "documents" {
  bucket = "hz-navigator-documents-${var.environment}-${random_id.suffix.hex}"

  tags = {
    Name        = "hz-navigator-documents"
    Environment = var.environment
    Purpose     = "Document storage"
  }
}

resource "aws_s3_bucket_versioning" "documents" {
  bucket = aws_s3_bucket.documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.s3.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "documents" {
  bucket = aws_s3_bucket.documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.domain_name != "" ? ["https://${var.domain_name}", "https://*.${var.domain_name}"] : ["*"]
    expose_headers  = ["ETag", "Content-Length", "Content-Type"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "documents" {
  bucket = aws_s3_bucket.documents.id

  rule {
    id     = "archive-old-documents"
    status = "Enabled"

    # Move to Intelligent-Tiering after 90 days
    transition {
      days          = 90
      storage_class = "INTELLIGENT_TIERING"
    }

    # Archive to Glacier after 365 days
    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    # Deep archive after 7 years (compliance)
    transition {
      days          = 2555  # 7 years
      storage_class = "DEEP_ARCHIVE"
    }
  }

  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  rule {
    id     = "noncurrent-version-expiration"
    status = "Enabled"

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}

# -----------------------------------------------------------------------------
# Frontend Bucket (Static Hosting)
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "frontend" {
  bucket = "hz-navigator-frontend-${var.environment}-${random_id.suffix.hex}"

  tags = {
    Name        = "hz-navigator-frontend"
    Environment = var.environment
    Purpose     = "Frontend static hosting"
  }
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  # Block direct public access - CloudFront OAC will be used
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag", "Content-Length"]
    max_age_seconds = 86400
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }

  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# CloudFront OAC policy for frontend bucket
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# Map Tiles Bucket (for cached map tiles)
# -----------------------------------------------------------------------------

resource "aws_s3_bucket" "map_tiles" {
  bucket = "hz-navigator-map-tiles-${var.environment}-${random_id.suffix.hex}"

  tags = {
    Name        = "hz-navigator-map-tiles"
    Environment = var.environment
    Purpose     = "Map tile caching"
  }
}

resource "aws_s3_bucket_versioning" "map_tiles" {
  bucket = aws_s3_bucket.map_tiles.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "map_tiles" {
  bucket = aws_s3_bucket.map_tiles.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "map_tiles" {
  bucket = aws_s3_bucket.map_tiles.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "map_tiles" {
  bucket = aws_s3_bucket.map_tiles.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 86400
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "map_tiles" {
  bucket = aws_s3_bucket.map_tiles.id

  rule {
    id     = "expire-old-tiles"
    status = "Enabled"

    # Map tiles expire after 30 days (refreshed regularly)
    expiration {
      days = 30
    }
  }

  rule {
    id     = "delete-incomplete-uploads"
    status = "Enabled"

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# CloudFront OAC policy for map tiles bucket
resource "aws_s3_bucket_policy" "map_tiles" {
  bucket = aws_s3_bucket.map_tiles.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.map_tiles.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.map_tiles.arn
          }
        }
      }
    ]
  })
}

# -----------------------------------------------------------------------------
# KMS Key for S3 Encryption
# -----------------------------------------------------------------------------

resource "aws_kms_key" "s3" {
  description             = "KMS key for S3 encryption - ${local.name_prefix}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow ECS tasks to use the key"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.ecs_task.arn
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-s3-kms"
  }
}

resource "aws_kms_alias" "s3" {
  name          = "alias/${local.name_prefix}-s3"
  target_key_id = aws_kms_key.s3.key_id
}

