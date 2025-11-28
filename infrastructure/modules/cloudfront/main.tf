# =============================================================================
# CloudFront Module - HZ-Navigator
# =============================================================================
# Creates CloudFront distributions for:
# - Frontend (S3 origin) with SSL, compression
# - Map tiles (S3 origin) with aggressive caching
# =============================================================================

# -----------------------------------------------------------------------------
# Origin Access Control for S3
# -----------------------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.name_prefix}-frontend-oac"
  description                       = "OAC for frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "map_tiles" {
  name                              = "${var.name_prefix}-map-tiles-oac"
  description                       = "OAC for map tiles S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# CloudFront Distribution for Frontend
# -----------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "HZ-Navigator Frontend - ${var.environment}"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"  # US, Canada, Europe
  http_version        = "http2and3"

  aliases = var.domain_name != "" ? ["${var.frontend_subdomain}.${var.domain_name}"] : []

  origin {
    domain_name              = var.frontend_bucket_domain_name
    origin_id                = "S3-Frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # API origin (ALB)
  origin {
    domain_name = var.alb_domain_name
    origin_id   = "ALB-API"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Default cache behavior (frontend assets)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Frontend"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400     # 1 day
    max_ttl                = 31536000  # 1 year
    compress               = true

    # Response headers policy
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # API cache behavior - forward to ALB
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-API"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Origin", "Accept", "Accept-Language"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 0
    max_ttl                = 0
    compress               = true
  }

  # Static assets cache behavior (long cache)
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-Frontend"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400
    default_ttl            = 2592000   # 30 days
    max_ttl                = 31536000  # 1 year
    compress               = true

    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  # Custom error responses for SPA routing
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.certificate_arn == "" ? true : false
    acm_certificate_arn            = var.certificate_arn != "" ? var.certificate_arn : null
    ssl_support_method             = var.certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.certificate_arn != "" ? "TLSv1.2_2021" : null
  }

  # Web Application Firewall (optional)
  # web_acl_id = aws_wafv2_web_acl.main.arn

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-frontend-distribution"
  })
}

# -----------------------------------------------------------------------------
# CloudFront Distribution for Map Tiles
# -----------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "map_tiles" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "HZ-Navigator Map Tiles - ${var.environment}"
  price_class     = "PriceClass_100"
  http_version    = "http2and3"

  aliases = var.domain_name != "" ? ["tiles.${var.domain_name}"] : []

  origin {
    domain_name              = var.map_tiles_bucket_domain_name
    origin_id                = "S3-MapTiles"
    origin_access_control_id = aws_cloudfront_origin_access_control.map_tiles.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-MapTiles"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400      # 1 day minimum
    default_ttl            = 604800     # 7 days
    max_ttl                = 31536000   # 1 year
    compress               = true

    response_headers_policy_id = aws_cloudfront_response_headers_policy.cors_tiles.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.certificate_arn == "" ? true : false
    acm_certificate_arn            = var.certificate_arn != "" ? var.certificate_arn : null
    ssl_support_method             = var.certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version       = var.certificate_arn != "" ? "TLSv1.2_2021" : null
  }

  tags = merge(var.tags, {
    Name = "${var.name_prefix}-map-tiles-distribution"
  })
}

# -----------------------------------------------------------------------------
# Response Headers Policies
# -----------------------------------------------------------------------------

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.name_prefix}-security-headers"
  comment = "Security headers for frontend"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = true
      override                   = true
    }

    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }

    content_security_policy {
      content_security_policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.${var.domain_name} https://*.tiles.mapbox.com https://api.mapbox.com; frame-ancestors 'none';"
      override                = true
    }
  }

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = ["https://${var.frontend_subdomain}.${var.domain_name}", "https://${var.domain_name}"]
    }

    access_control_max_age_sec = 86400
    origin_override            = true
  }
}

resource "aws_cloudfront_response_headers_policy" "cors_tiles" {
  name    = "${var.name_prefix}-cors-tiles"
  comment = "CORS headers for map tiles"

  cors_config {
    access_control_allow_credentials = false

    access_control_allow_headers {
      items = ["*"]
    }

    access_control_allow_methods {
      items = ["GET", "HEAD", "OPTIONS"]
    }

    access_control_allow_origins {
      items = ["*"]
    }

    access_control_max_age_sec = 86400
    origin_override            = true
  }
}

# -----------------------------------------------------------------------------
# S3 Bucket Policy for CloudFront Access
# -----------------------------------------------------------------------------

resource "aws_s3_bucket_policy" "frontend" {
  bucket = var.frontend_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${var.frontend_bucket_arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}

# S3 bucket policy for map tiles - allow CloudFront access
resource "aws_s3_bucket_policy" "map_tiles" {
  count  = var.map_tiles_bucket_id != "" ? 1 : 0
  bucket = var.map_tiles_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${var.map_tiles_bucket_arn}/*"
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
# CloudWatch Alarms for CloudFront
# -----------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "frontend_5xx_errors" {
  alarm_name          = "${var.name_prefix}-cloudfront-5xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "5xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 5  # 5% error rate
  alarm_description   = "CloudFront 5XX error rate is high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = aws_cloudfront_distribution.frontend.id
    Region         = "Global"
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "frontend_4xx_errors" {
  alarm_name          = "${var.name_prefix}-cloudfront-4xx-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "4xxErrorRate"
  namespace           = "AWS/CloudFront"
  period              = 300
  statistic           = "Average"
  threshold           = 10  # 10% error rate
  alarm_description   = "CloudFront 4XX error rate is high"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DistributionId = aws_cloudfront_distribution.frontend.id
    Region         = "Global"
  }

  alarm_actions = []  # Add SNS topic ARN for notifications

  tags = var.tags
}

