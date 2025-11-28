# =============================================================================
# HZ Navigator - CloudFront Configuration
# =============================================================================
# - Distribution for frontend (S3 origin)
# - Distribution for map tiles (caching)
# - SSL certificate
# - Compress files
# =============================================================================

# -----------------------------------------------------------------------------
# CloudFront Origin Access Control
# -----------------------------------------------------------------------------

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name_prefix}-frontend-oac"
  description                       = "OAC for frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_origin_access_control" "map_tiles" {
  name                              = "${local.name_prefix}-map-tiles-oac"
  description                       = "OAC for map tiles S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# -----------------------------------------------------------------------------
# ACM Certificate for CloudFront (must be in us-east-1)
# -----------------------------------------------------------------------------

resource "aws_acm_certificate" "cloudfront" {
  count             = var.cloudfront_certificate_arn == "" && var.domain_name != "" ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${local.name_prefix}-cloudfront-certificate"
  }
}

# -----------------------------------------------------------------------------
# Frontend CloudFront Distribution
# -----------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "HZ Navigator Frontend Distribution"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"  # US, Canada, Europe
  http_version        = "http2and3"
  
  aliases = var.domain_name != "" ? [var.domain_name, "www.${var.domain_name}"] : []

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
    origin_id                = "S3-frontend"
  }

  # API origin for backend
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-api"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-frontend"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600      # 1 hour
    max_ttl                = 86400     # 24 hours
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_routing.arn
    }
  }

  # API route behavior
  ordered_cache_behavior {
    path_pattern     = "/api/*"
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ALB-api"

    forwarded_values {
      query_string = true
      headers      = ["Authorization", "Origin", "Accept", "Content-Type"]
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

  # Static assets behavior
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-frontend"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400      # 1 day
    default_ttl            = 604800     # 7 days
    max_ttl                = 31536000   # 1 year
    compress               = true
  }

  # Custom error responses for SPA
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == ""
    acm_certificate_arn           = var.cloudfront_certificate_arn != "" ? var.cloudfront_certificate_arn : (var.domain_name != "" ? aws_acm_certificate.cloudfront[0].arn : null)
    ssl_support_method            = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version      = "TLSv1.2_2021"
  }

  tags = {
    Name = "${local.name_prefix}-frontend-distribution"
  }
}

# CloudFront function for SPA routing
resource "aws_cloudfront_function" "spa_routing" {
  name    = "${local.name_prefix}-spa-routing"
  runtime = "cloudfront-js-1.0"
  comment = "Handle SPA routing by rewriting paths without extensions to index.html"
  publish = true
  code    = <<-EOF
function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Check if the URI has a file extension
    if (uri.includes('.')) {
        return request;
    }
    
    // Check if it's an API request (shouldn't reach here, but just in case)
    if (uri.startsWith('/api/')) {
        return request;
    }
    
    // Rewrite to index.html for SPA routing
    request.uri = '/index.html';
    return request;
}
EOF
}

# -----------------------------------------------------------------------------
# Map Tiles CloudFront Distribution
# -----------------------------------------------------------------------------

resource "aws_cloudfront_distribution" "map_tiles" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "HZ Navigator Map Tiles Distribution"
  price_class     = "PriceClass_100"
  http_version    = "http2and3"
  
  aliases = var.domain_name != "" ? ["tiles.${var.domain_name}"] : []

  origin {
    domain_name              = aws_s3_bucket.map_tiles.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.map_tiles.id
    origin_id                = "S3-map-tiles"
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-map-tiles"

    forwarded_values {
      query_string = true  # Map tiles may use query params for versioning
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 86400       # 1 day
    default_ttl            = 604800      # 7 days
    max_ttl                = 2592000     # 30 days
    compress               = true
  }

  # Vector tiles behavior (longer cache)
  ordered_cache_behavior {
    path_pattern     = "*.pbf"
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-map-tiles"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 604800      # 7 days
    default_ttl            = 2592000     # 30 days
    max_ttl                = 31536000    # 1 year
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == ""
    acm_certificate_arn           = var.cloudfront_certificate_arn != "" ? var.cloudfront_certificate_arn : (var.domain_name != "" ? aws_acm_certificate.cloudfront[0].arn : null)
    ssl_support_method            = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version      = "TLSv1.2_2021"
  }

  tags = {
    Name = "${local.name_prefix}-map-tiles-distribution"
  }
}

# -----------------------------------------------------------------------------
# Route53 Records for CloudFront (optional)
# -----------------------------------------------------------------------------

resource "aws_route53_record" "frontend" {
  count   = var.route53_zone_id != "" && var.domain_name != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "frontend_www" {
  count   = var.route53_zone_id != "" && var.domain_name != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "tiles" {
  count   = var.route53_zone_id != "" && var.domain_name != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = "tiles.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.map_tiles.domain_name
    zone_id                = aws_cloudfront_distribution.map_tiles.hosted_zone_id
    evaluate_target_health = false
  }
}

