#!/bin/bash
# =============================================================================
# HZ-Navigator Backend Deployment Script
# =============================================================================
# Usage: ./scripts/deploy-backend.sh [environment] [tag]
# Example: ./scripts/deploy-backend.sh production latest
# =============================================================================

set -e

# Configuration
ENVIRONMENT="${1:-production}"
IMAGE_TAG="${2:-latest}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_REPOSITORY="hz-navigator-${ENVIRONMENT}-backend"
ECS_CLUSTER="hz-navigator-${ENVIRONMENT}-cluster"
ECS_SERVICE="hz-navigator-${ENVIRONMENT}-backend-service"

echo "=== HZ-Navigator Backend Deployment ==="
echo "Environment: ${ENVIRONMENT}"
echo "Image Tag: ${IMAGE_TAG}"
echo "Region: ${AWS_REGION}"
echo ""

# Get AWS account ID if not set
if [ -z "$AWS_ACCOUNT_ID" ]; then
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
fi

echo "ECR Registry: ${ECR_REGISTRY}"
echo ""

# Login to ECR
echo "=== Logging into ECR ==="
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Build Docker image
echo ""
echo "=== Building Docker Image ==="
cd backend
docker build -t ${ECR_REPOSITORY}:${IMAGE_TAG} .
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
docker tag ${ECR_REPOSITORY}:${IMAGE_TAG} ${ECR_REGISTRY}/${ECR_REPOSITORY}:${ENVIRONMENT}

# Push to ECR
echo ""
echo "=== Pushing to ECR ==="
docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}
docker push ${ECR_REGISTRY}/${ECR_REPOSITORY}:${ENVIRONMENT}

# Update ECS service
echo ""
echo "=== Updating ECS Service ==="
aws ecs update-service \
    --cluster ${ECS_CLUSTER} \
    --service ${ECS_SERVICE} \
    --force-new-deployment \
    --region ${AWS_REGION}

# Wait for deployment to complete
echo ""
echo "=== Waiting for Deployment ==="
aws ecs wait services-stable \
    --cluster ${ECS_CLUSTER} \
    --services ${ECS_SERVICE} \
    --region ${AWS_REGION}

echo ""
echo "=== Deployment Complete ==="
echo "Service: ${ECS_SERVICE}"
echo "Cluster: ${ECS_CLUSTER}"
echo "Image: ${ECR_REGISTRY}/${ECR_REPOSITORY}:${IMAGE_TAG}"

