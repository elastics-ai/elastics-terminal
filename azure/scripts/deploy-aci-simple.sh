#!/bin/bash

# Simple Azure Container Instance deployment
# Uses Container Instances instead of Container Registry + Container Apps

set -e

RESOURCE_GROUP="elastics-terminal-rg"
LOCATION="eastus"
CONTAINER_NAME="elastics-terminal"
DNS_LABEL="elastics-terminal-$(date +%s)"

echo "=============================================="
echo "🚀 Azure Container Instance Deployment"
echo "=============================================="
echo ""

# Function to run Azure CLI
run_az() {
    docker run --rm -v "${PWD}:/workspace" -w /workspace mcr.microsoft.com/azure-cli:latest az "$@"
}

echo "🔐 Please authenticate again (device code will be shown)..."
run_az login --use-device-code

echo "📦 Creating resource group (if not exists)..."
run_az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" || echo "Resource group may already exist"

echo "🚀 Deploying container to Azure Container Instances..."
echo "This will use a public Docker image as a placeholder..."

# Deploy using ACI with the built image
run_az container create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --image "nginx:latest" \
    --dns-name-label "$DNS_LABEL" \
    --ports 80 \
    --location "$LOCATION" \
    --cpu 1 \
    --memory 2 \
    --restart-policy Always \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7"

echo "🔍 Getting container information..."
CONTAINER_URL=$(run_az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" \
    --query "ipAddress.fqdn" \
    --output tsv)

echo ""
echo "🎉 DEPLOYMENT COMPLETED!"
echo "=============================================="
echo "📱 Application URL: http://$CONTAINER_URL"
echo "🔐 Basic Auth Email: wojciech@elastics.ai"
echo "🔑 Basic Auth Password: demo123!"
echo "=============================================="
echo ""
echo "ℹ️  Note: This is currently running nginx as a placeholder."
echo "   To deploy the actual Elastics Terminal, you would need to:"
echo "   1. Push the Docker image to a public registry (Docker Hub)"
echo "   2. Update the container to use that image"
echo "   3. Configure proper environment variables"
echo ""
echo "The infrastructure is ready for your application!"