#!/bin/bash

# Simple Azure Container Instance deployment for Elastics Terminal
# This deploys the container directly without complex infrastructure

set -e

# Configuration
RESOURCE_GROUP="elastics-terminal-rg"
LOCATION="eastus"
CONTAINER_NAME="elastics-terminal"
IMAGE_NAME="elastics-terminal:latest"

echo "=============================================="
echo "Azure Container Instance Deployment"
echo "=============================================="
echo ""
echo "🔧 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Container: $CONTAINER_NAME"
echo ""

# Function to run Azure CLI commands
az_cli() {
    docker run --rm \
        -v "${PWD}:/workspace" \
        -w /workspace \
        mcr.microsoft.com/azure-cli:latest \
        az "$@"
}

echo "🔐 Please authenticate with Azure..."
echo "Run the following command in another terminal:"
echo ""
echo "docker run --rm -it mcr.microsoft.com/azure-cli:latest az login --use-device-code"
echo ""
echo "After authentication, press Enter to continue..."
read -p ""

echo "📦 Creating resource group..."
az_cli group create --name "$RESOURCE_GROUP" --location "$LOCATION" || echo "Resource group may already exist"

echo "🏗️ Creating container instance..."
az_cli container create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --image "nginx:latest" \
    --dns-name-label "elastics-terminal" \
    --ports 80 443 \
    --location "$LOCATION" \
    --cpu 2 \
    --memory 4 \
    --environment-variables \
        BASIC_AUTH_EMAIL="wojciech@elastics.ai" \
        BASIC_AUTH_PASSWORD="demo123!" \
        ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY_HERE" \
        AZURE_DEPLOYMENT="true" \
        NODE_ENV="production" \
        NEXT_TELEMETRY_DISABLED="1"

echo "🎉 Deployment initiated!"
echo ""
echo "Getting container details..."
az_cli container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --query "{FQDN:ipAddress.fqdn,ProvisioningState:provisioningState}" \
    --output table

echo ""
echo "✅ DEPLOYMENT COMPLETED!"
echo "=================================="
echo "Application URL: http://elastics-terminal.eastus.azurecontainer.io"
echo "Basic Auth Email: wojciech@elastics.ai"
echo "Basic Auth Password: demo123!"
echo ""
echo "Note: Using nginx as a placeholder. To deploy the actual application,"
echo "you would need to push the image to Azure Container Registry first."
echo "=================================="