#!/bin/bash

# Corrected Azure deployment with proper ACI parameters
set -e

RESOURCE_GROUP="elastics-terminal-rg"
LOCATION="eastus"
CONTAINER_NAME="elastics-terminal"
DNS_LABEL="elastics-terminal-$(date +%s)"
AZURE_AUTH_DIR="$HOME/.azure-elastics"

echo "=============================================="
echo "🚀 Elastics Terminal - Corrected Deployment"
echo "=============================================="

# Function to run Azure CLI with saved auth
run_az() {
    docker run --rm \
        -v "${PWD}:/workspace" \
        -v "$AZURE_AUTH_DIR:/root/.azure" \
        -w /workspace \
        mcr.microsoft.com/azure-cli:latest \
        az "$@"
}

echo "✅ Using saved authentication..."

echo ""
echo "📦 Using existing resource group..."

echo ""
echo "🚀 Deploying Container Instance with correct parameters..."

# Create container instance with proper OS type and configuration
run_az container create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --image "nginx:latest" \
    --dns-name-label "$DNS_LABEL" \
    --ports 80 \
    --location "$LOCATION" \
    --os-type Linux \
    --cpu 1 \
    --memory 2 \
    --restart-policy Always \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7"

echo ""
echo "🔍 Getting container details..."
CONTAINER_URL=$(run_az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --query "ipAddress.fqdn" \
    --output tsv \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7")

echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=============================================="
echo "🌐 Application URL: http://$CONTAINER_URL"
echo "📦 Resource Group: $RESOURCE_GROUP"
echo "🏗️ Container Instance: $CONTAINER_NAME"
echo "💾 Authentication saved for future use"
echo "=============================================="
echo ""
echo "✅ Your Azure infrastructure is ready!"
echo "🔧 Next step: Deploy your actual application image"
echo ""
echo "📋 To deploy Elastics Terminal:"
echo "1. Push your image to Docker Hub or use Azure Container Registry"
echo "2. Update the container with your image"
echo "3. Configure environment variables for your app"
echo ""
echo "🌐 Test the infrastructure: http://$CONTAINER_URL"
echo "🔐 Authentication persisted for future deployments"