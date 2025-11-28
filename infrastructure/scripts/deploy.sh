#!/bin/bash
# =============================================================================
# HZ Navigator - Deployment Script
# =============================================================================
# Usage: ./deploy.sh [backend|frontend|all] [environment]
# Example: ./deploy.sh all production
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPONENT=${1:-"all"}
ENVIRONMENT=${2:-"production"}
AWS_REGION=${AWS_REGION:-"us-east-1"}

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}HZ Navigator Deployment Script${NC}"
echo -e "${GREEN}===========================================${NC}"
echo -e "Component: ${YELLOW}${COMPONENT}${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Region: ${YELLOW}${AWS_REGION}${NC}"
echo -e "${GREEN}===========================================${NC}"

# Get Terraform outputs
get_terraform_outputs() {
    echo -e "${YELLOW}Fetching Terraform outputs...${NC}"
    cd infrastructure/terraform
    
    ECR_REPO=$(terraform output -raw ecr_repository_url 2>/dev/null || echo "")
    ECS_CLUSTER=$(terraform output -raw ecs_cluster_name 2>/dev/null || echo "")
    ECS_SERVICE=$(terraform output -raw ecs_service_name 2>/dev/null || echo "")
    FRONTEND_BUCKET=$(terraform output -raw frontend_bucket_name 2>/dev/null || echo "")
    CLOUDFRONT_ID=$(terraform output -raw cloudfront_frontend_distribution_id 2>/dev/null || echo "")
    
    cd ../..
    
    if [ -z "$ECR_REPO" ]; then
        echo -e "${RED}Error: Could not get Terraform outputs. Make sure infrastructure is deployed.${NC}"
        exit 1
    fi
}

# Deploy backend to ECS
deploy_backend() {
    echo -e "${GREEN}Deploying backend...${NC}"
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Login to ECR
    echo -e "${YELLOW}Logging in to ECR...${NC}"
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
    
    # Build Docker image
    echo -e "${YELLOW}Building Docker image...${NC}"
    docker build -f infrastructure/docker/Dockerfile.backend -t hz-navigator-backend .
    
    # Tag image
    TIMESTAMP=$(date +%Y%m%d%H%M%S)
    docker tag hz-navigator-backend:latest ${ECR_REPO}:latest
    docker tag hz-navigator-backend:latest ${ECR_REPO}:${TIMESTAMP}
    
    # Push to ECR
    echo -e "${YELLOW}Pushing to ECR...${NC}"
    docker push ${ECR_REPO}:latest
    docker push ${ECR_REPO}:${TIMESTAMP}
    
    # Force new deployment
    echo -e "${YELLOW}Updating ECS service...${NC}"
    aws ecs update-service \
        --cluster ${ECS_CLUSTER} \
        --service ${ECS_SERVICE} \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    # Wait for deployment
    echo -e "${YELLOW}Waiting for deployment to complete...${NC}"
    aws ecs wait services-stable \
        --cluster ${ECS_CLUSTER} \
        --services ${ECS_SERVICE} \
        --region ${AWS_REGION}
    
    echo -e "${GREEN}Backend deployment complete!${NC}"
}

# Deploy frontend to S3
deploy_frontend() {
    echo -e "${GREEN}Deploying frontend...${NC}"
    
    # Get API URL from Terraform
    cd infrastructure/terraform
    API_URL=$(terraform output -raw api_endpoint 2>/dev/null || echo "")
    MAP_TILES_URL=$(terraform output -raw map_tiles_url 2>/dev/null || echo "")
    cd ../..
    
    # Build frontend
    echo -e "${YELLOW}Building frontend...${NC}"
    cd frontend
    npm ci
    VITE_API_URL=${API_URL} VITE_MAP_TILES_URL=${MAP_TILES_URL} VITE_ENVIRONMENT=${ENVIRONMENT} npm run build
    cd ..
    
    # Sync to S3
    echo -e "${YELLOW}Syncing to S3...${NC}"
    aws s3 sync frontend/dist/ s3://${FRONTEND_BUCKET}/ \
        --delete \
        --cache-control "public, max-age=31536000" \
        --region ${AWS_REGION}
    
    # Set cache control for HTML files (no cache)
    aws s3 cp s3://${FRONTEND_BUCKET}/index.html s3://${FRONTEND_BUCKET}/index.html \
        --cache-control "no-cache, no-store, must-revalidate" \
        --content-type "text/html" \
        --metadata-directive REPLACE \
        --region ${AWS_REGION}
    
    # Invalidate CloudFront cache
    echo -e "${YELLOW}Invalidating CloudFront cache...${NC}"
    aws cloudfront create-invalidation \
        --distribution-id ${CLOUDFRONT_ID} \
        --paths "/*" \
        --region ${AWS_REGION}
    
    echo -e "${GREEN}Frontend deployment complete!${NC}"
}

# Run database migrations
run_migrations() {
    echo -e "${GREEN}Running database migrations...${NC}"
    
    # Get database credentials from Secrets Manager
    DB_SECRET_ARN=$(cd infrastructure/terraform && terraform output -raw rds_credentials_secret_arn 2>/dev/null)
    DB_CREDENTIALS=$(aws secretsmanager get-secret-value --secret-id ${DB_SECRET_ARN} --query SecretString --output text)
    
    DB_HOST=$(echo ${DB_CREDENTIALS} | jq -r '.host')
    DB_PORT=$(echo ${DB_CREDENTIALS} | jq -r '.port')
    DB_NAME=$(echo ${DB_CREDENTIALS} | jq -r '.dbname')
    DB_USER=$(echo ${DB_CREDENTIALS} | jq -r '.username')
    DB_PASS=$(echo ${DB_CREDENTIALS} | jq -r '.password')
    
    echo -e "${YELLOW}Note: Migrations should be run from within the VPC or via a bastion host.${NC}"
    echo -e "${YELLOW}Database connection: postgresql://${DB_USER}:****@${DB_HOST}:${DB_PORT}/${DB_NAME}${NC}"
    
    echo -e "${GREEN}Migration step completed!${NC}"
}

# Main deployment logic
main() {
    get_terraform_outputs
    
    case ${COMPONENT} in
        "backend")
            deploy_backend
            ;;
        "frontend")
            deploy_frontend
            ;;
        "migrations")
            run_migrations
            ;;
        "all")
            deploy_backend
            deploy_frontend
            run_migrations
            ;;
        *)
            echo -e "${RED}Unknown component: ${COMPONENT}${NC}"
            echo "Usage: $0 [backend|frontend|migrations|all] [environment]"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}===========================================${NC}"
    echo -e "${GREEN}Deployment completed successfully!${NC}"
    echo -e "${GREEN}===========================================${NC}"
}

main

