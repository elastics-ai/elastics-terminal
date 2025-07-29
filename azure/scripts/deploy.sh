#!/bin/bash

# Elastics Terminal Azure Deployment Script
# This script deploys the Elastics Terminal to Azure Container Apps

set -e

# Configuration
RESOURCE_GROUP="elastics-terminal-rg"
LOCATION="eastus"
APP_NAME="elastics-terminal"
SUBSCRIPTION_ID=""
CONTAINER_IMAGE_TAG="latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Azure CLI is available
check_azure_cli() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is required but not installed. Please install Docker first."
        exit 1
    fi
    
    log_info "Using Azure CLI via Docker container"
}

# Function to run Azure CLI commands via Docker
az_cli() {
    docker run --rm -v "${PWD}:/workspace" -w /workspace mcr.microsoft.com/azure-cli:latest az "$@"
}

# Function to prompt for missing environment variables
prompt_for_credentials() {
    log_info "Checking for required credentials..."
    
    # Set default values from the environment file if available
    if [ -f ".env" ]; then
        source .env
    fi
    
    if [ -z "$AZURE_SUBSCRIPTION_ID" ]; then
        AZURE_SUBSCRIPTION_ID="48894024-13ed-494a-b9dc-b3cfe44bd9f7"
        log_info "Using Azure Subscription ID: $AZURE_SUBSCRIPTION_ID"
    fi
    
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY_HERE"
        log_info "Using provided Anthropic API Key"
    fi
    
    # Generate secure passwords if not provided
    if [ -z "$POSTGRES_PASSWORD" ]; then
        POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        log_info "Generated secure PostgreSQL password"
    fi
    
    if [ -z "$REDIS_PASSWORD" ]; then
        REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        log_info "Generated secure Redis password"
    fi
}

# Function to login to Azure
azure_login() {
    log_info "Logging into Azure..."
    az_cli login
    az_cli account set --subscription "$AZURE_SUBSCRIPTION_ID"
    log_success "Successfully logged into Azure"
}

# Function to create resource group
create_resource_group() {
    log_info "Creating resource group: $RESOURCE_GROUP"
    az_cli group create --name "$RESOURCE_GROUP" --location "$LOCATION"
    log_success "Resource group created successfully"
}

# Function to build and push container image
build_and_push_image() {
    log_info "Building Docker image for Azure..."
    
    # Build the image using the Azure-optimized Dockerfile
    docker build -f Dockerfile.azure -t "${APP_NAME}:${CONTAINER_IMAGE_TAG}" .
    
    log_success "Docker image built successfully"
    
    # The image will be pushed to Azure Container Registry after it's created via Bicep
    log_info "Image ready for push to Azure Container Registry"
}

# Function to deploy infrastructure using Bicep
deploy_infrastructure() {
    log_info "Deploying infrastructure using Bicep..."
    
    az_cli deployment group create \
        --resource-group "$RESOURCE_GROUP" \
        --template-file "azure/bicep/main.bicep" \
        --parameters \
            appName="$APP_NAME" \
            location="$LOCATION" \
            postgresPassword="$POSTGRES_PASSWORD" \
            redisPassword="$REDIS_PASSWORD" \
            anthropicApiKey="$ANTHROPIC_API_KEY" \
            basicAuthPassword="demo123!"
    
    log_success "Infrastructure deployed successfully"
}

# Function to get ACR login server and push image
push_to_acr() {
    log_info "Pushing image to Azure Container Registry..."
    
    # Get ACR login server
    ACR_LOGIN_SERVER=$(az_cli acr list --resource-group "$RESOURCE_GROUP" --query "[0].loginServer" --output tsv)
    
    if [ -z "$ACR_LOGIN_SERVER" ]; then
        log_error "Could not retrieve ACR login server"
        exit 1
    fi
    
    # Login to ACR
    az_cli acr login --name "${ACR_LOGIN_SERVER%%.azurecr.io}"
    
    # Tag and push image
    docker tag "${APP_NAME}:${CONTAINER_IMAGE_TAG}" "${ACR_LOGIN_SERVER}/${APP_NAME}:${CONTAINER_IMAGE_TAG}"
    docker push "${ACR_LOGIN_SERVER}/${APP_NAME}:${CONTAINER_IMAGE_TAG}"
    
    log_success "Image pushed to Azure Container Registry"
}

# Function to get deployment outputs
get_deployment_info() {
    log_info "Retrieving deployment information..."
    
    # Get the container app URL
    CONTAINER_APP_URL=$(az_cli deployment group show \
        --resource-group "$RESOURCE_GROUP" \
        --name "main" \
        --query "properties.outputs.containerAppUrl.value" \
        --output tsv)
    
    if [ -n "$CONTAINER_APP_URL" ]; then
        log_success "Application deployed successfully!"
        echo
        log_info "=== DEPLOYMENT INFORMATION ==="
        echo "Application URL: $CONTAINER_APP_URL"
        echo "Basic Auth Email: wojciech@elastics.ai"
        echo "Basic Auth Password: demo123!"
        echo
        log_info "The application may take a few minutes to start up completely."
        log_info "You can monitor the deployment in the Azure Portal."
    else
        log_warning "Could not retrieve application URL. Check Azure Portal for deployment status."
    fi
}

# Main deployment function
main() {
    echo "======================================"
    echo "Elastics Terminal Azure Deployment"
    echo "======================================"
    echo
    
    # Change to project root directory
    cd "$(dirname "$0")/../.."
    
    # Check prerequisites
    check_azure_cli
    
    # Prompt for credentials
    prompt_for_credentials
    
    # Login to Azure
    azure_login
    
    # Create resource group
    create_resource_group
    
    # Build container image
    build_and_push_image
    
    # Deploy infrastructure
    deploy_infrastructure
    
    # Push image to ACR
    push_to_acr
    
    # Get deployment information
    get_deployment_info
    
    log_success "Deployment completed successfully!"
}

# Run main function
main "$@"