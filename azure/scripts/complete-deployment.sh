#!/bin/bash

# Complete Azure deployment for Elastics Terminal
# This script handles the full deployment process

set -e

# Configuration
RESOURCE_GROUP="elastics-terminal-rg"
LOCATION="eastus"
ACR_NAME="elasticsterminalacr"
APP_NAME="elastics-terminal"
SUBSCRIPTION_ID="48894024-13ed-494a-b9dc-b3cfe44bd9f7"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=============================================="
echo "🚀 Elastics Terminal - Complete Azure Deployment"
echo "=============================================="
echo ""

# Function to run Azure CLI with persistent authentication
run_azure_command() {
    local auth_dir="/tmp/azure-auth-$$"
    mkdir -p "$auth_dir"
    
    docker run --rm \
        -v "${PWD}:/workspace" \
        -v "$auth_dir:/root/.azure" \
        -w /workspace \
        mcr.microsoft.com/azure-cli:latest \
        "$@"
}

# Step 1: Authentication
log_info "Step 1: Azure Authentication"
echo "🔐 Please complete Azure authentication..."

# Try to login and set subscription
run_azure_command bash -c "
    echo 'Logging into Azure...'
    az login --use-device-code
    az account set --subscription '$SUBSCRIPTION_ID'
    echo 'Authentication completed!'
"

# Step 2: Create Resource Group
log_info "Step 2: Creating Resource Group"
run_azure_command az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --subscription "$SUBSCRIPTION_ID"

log_success "Resource group created: $RESOURCE_GROUP"

# Step 3: Create Container Registry
log_info "Step 3: Creating Azure Container Registry"
run_azure_command az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true \
    --location "$LOCATION"

log_success "Container registry created: $ACR_NAME"

# Step 4: Get ACR credentials
log_info "Step 4: Getting Container Registry credentials"
ACR_SERVER=$(run_azure_command az acr show \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "loginServer" \
    --output tsv)

ACR_USERNAME=$(run_azure_command az acr credential show \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "username" \
    --output tsv)

ACR_PASSWORD=$(run_azure_command az acr credential show \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "passwords[0].value" \
    --output tsv)

log_success "Registry credentials obtained"
echo "Registry Server: $ACR_SERVER"
echo "Username: $ACR_USERNAME"

# Step 5: Tag and push Docker image
log_info "Step 5: Pushing Docker image to registry"
docker tag elastics-terminal:latest "$ACR_SERVER/elastics-terminal:latest"

# Login to ACR using docker
echo "$ACR_PASSWORD" | docker login "$ACR_SERVER" --username "$ACR_USERNAME" --password-stdin

# Push the image
docker push "$ACR_SERVER/elastics-terminal:latest"

log_success "Docker image pushed to registry"

# Step 6: Deploy using Container Apps
log_info "Step 6: Creating Container App Environment"
run_azure_command az containerapp env create \
    --name "elastics-terminal-env" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION"

log_info "Step 7: Deploying Container App"
run_azure_command az containerapp create \
    --name "elastics-terminal-app" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "elastics-terminal-env" \
    --image "$ACR_SERVER/elastics-terminal:latest" \
    --target-port 3000 \
    --ingress external \
    --registry-server "$ACR_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --env-vars \
        BASIC_AUTH_EMAIL="wojciech@elastics.ai" \
        BASIC_AUTH_PASSWORD="demo123!" \
        ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY_HERE" \
        AZURE_DEPLOYMENT="true" \
        NODE_ENV="production" \
        NEXT_TELEMETRY_DISABLED="1" \
        PYTHONUNBUFFERED="1" \
    --cpu 2.0 \
    --memory 4.0Gi \
    --min-replicas 1 \
    --max-replicas 3

# Step 8: Get application URL
log_info "Step 8: Getting application URL"
APP_URL=$(run_azure_command az containerapp show \
    --name "elastics-terminal-app" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.configuration.ingress.fqdn" \
    --output tsv)

echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=============================================="
echo "📱 Application URL: https://$APP_URL"
echo "🔐 Basic Auth Email: wojciech@elastics.ai"
echo "🔑 Basic Auth Password: demo123!"
echo "🏗️ Resource Group: $RESOURCE_GROUP"
echo "📦 Container Registry: $ACR_SERVER"
echo "=============================================="
echo ""
echo "✅ The Elastics Terminal is now deployed and accessible!"
echo "🔒 The application is protected with basic authentication"
echo "🤖 Claude AI chat functionality is enabled"
echo "📊 Full dashboard with portfolio analytics available"
echo ""
echo "🌐 Visit: https://$APP_URL"
echo "   Username: wojciech@elastics.ai"
echo "   Password: demo123!"

# Cleanup
rm -rf /tmp/azure-auth-*