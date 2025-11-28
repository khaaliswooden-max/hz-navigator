#!/bin/bash
# =============================================================================
# HZ-Navigator Frontend Deployment Script
# =============================================================================
# Usage: ./scripts/deploy-frontend.sh [environment]
# Example: ./scripts/deploy-frontend.sh production
# =============================================================================

set -e

# Configuration
ENVIRONMENT="${1:-production}"
AWS_REGION="${AWS_REGION:-us-east-1}"
S3_BUCKET="hz-navigator-frontend-${ENVIRONMENT}"

echo "=== HZ-Navigator Frontend Deployment ==="
echo "Environment: ${ENVIRONMENT}"
echo "Region: ${AWS_REGION}"
echo "S3 Bucket: ${S3_BUCKET}"
echo ""

# Build frontend
echo "=== Building Frontend ==="
cd frontend
npm ci
npm run build

# Get CloudFront distribution ID
echo ""
echo "=== Getting CloudFront Distribution ID ==="
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --query "Stacks[?contains(StackName, 'hz-navigator-${ENVIRONMENT}')].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
    --output text \
    --region ${AWS_REGION} 2>/dev/null || true)

# If not found via CloudFormation, try from Terraform output or manual config
if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" == "None" ]; then
    echo "CloudFront distribution ID not found via CloudFormation."
    echo "Trying to find distribution by S3 origin..."
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Origins.Items[?contains(DomainName, '${S3_BUCKET}')]].Id" \
        --output text \
        --region ${AWS_REGION} 2>/dev/null || true)
fi

if [ -z "$DISTRIBUTION_ID" ] || [ "$DISTRIBUTION_ID" == "None" ]; then
    echo "Warning: CloudFront distribution ID not found. Skipping invalidation."
    DISTRIBUTION_ID=""
fi

# Sync to S3
echo ""
echo "=== Deploying to S3 ==="
aws s3 sync dist/ s3://${S3_BUCKET}/ \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "*.json" \
    --region ${AWS_REGION}

# Upload index.html and JSON files with no-cache
aws s3 cp dist/index.html s3://${S3_BUCKET}/index.html \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html" \
    --region ${AWS_REGION}

# Upload manifest and other JSON files
for file in dist/*.json; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        aws s3 cp "$file" "s3://${S3_BUCKET}/${filename}" \
            --cache-control "no-cache" \
            --content-type "application/json" \
            --region ${AWS_REGION}
    fi
done

# Invalidate CloudFront cache
if [ -n "$DISTRIBUTION_ID" ]; then
    echo ""
    echo "=== Invalidating CloudFront Cache ==="
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id ${DISTRIBUTION_ID} \
        --paths "/*" \
        --query 'Invalidation.Id' \
        --output text \
        --region ${AWS_REGION})
    
    echo "Invalidation ID: ${INVALIDATION_ID}"
    
    # Wait for invalidation to complete
    echo "Waiting for invalidation to complete..."
    aws cloudfront wait invalidation-completed \
        --distribution-id ${DISTRIBUTION_ID} \
        --id ${INVALIDATION_ID} \
        --region ${AWS_REGION}
fi

echo ""
echo "=== Deployment Complete ==="
echo "S3 Bucket: ${S3_BUCKET}"
if [ -n "$DISTRIBUTION_ID" ]; then
    echo "CloudFront Distribution: ${DISTRIBUTION_ID}"
fi

