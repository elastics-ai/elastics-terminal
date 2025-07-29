#!/bin/bash

# Final working Azure deployment - builds locally and uses ACI
set -e

RESOURCE_GROUP="elastics-terminal-rg"
LOCATION="eastus"
CONTAINER_NAME="elastics-terminal"
DNS_LABEL="elastics-terminal-$(date +%s)"
AZURE_AUTH_DIR="$HOME/.azure-elastics"

echo "=============================================="
echo "🚀 Elastics Terminal - Final Working Deployment"
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
echo "📦 Ensuring resource group exists..."
run_az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" || echo "Resource group exists"

echo ""
echo "🔧 Registering required Azure providers..."
run_az provider register --namespace Microsoft.ContainerInstance --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" || echo "Provider may already be registered"

echo ""
echo "🚀 Deploying to Azure Container Instance..."
echo "   This will create a container instance with your application"

# Create a simple nginx container first to test the infrastructure
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

echo ""
echo "🔍 Getting container details..."
CONTAINER_URL=$(run_az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --query "ipAddress.fqdn" \
    --output tsv \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7")

CONTAINER_IP=$(run_az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --query "ipAddress.ip" \
    --output tsv \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7")

echo ""
echo "🎉 INFRASTRUCTURE DEPLOYED SUCCESSFULLY!"
echo "=============================================="
echo "🌐 Test URL: http://$CONTAINER_URL"
echo "📍 IP Address: $CONTAINER_IP"
echo "📦 Resource Group: $RESOURCE_GROUP"
echo "🏗️ Container Instance: $CONTAINER_NAME"
echo "=============================================="
echo ""
echo "📋 Next Steps to Deploy Your Application:"
echo "1. ✅ Infrastructure is ready"
echo "2. 🔧 Replace nginx with your application:"
echo ""
echo "   # Update container with your image:"
echo "   az container create \\"
echo "     --resource-group $RESOURCE_GROUP \\"
echo "     --name elastics-terminal-app \\"
echo "     --image <YOUR_PUBLIC_IMAGE> \\"
echo "     --dns-name-label elastics-terminal-live \\"
echo "     --ports 3000 8000 8765 \\"
echo "     --location $LOCATION \\"
echo "     --cpu 2 --memory 4 \\"
echo "     --environment-variables \\"
echo "       BASIC_AUTH_EMAIL=wojciech@elastics.ai \\"
echo "       BASIC_AUTH_PASSWORD=demo123! \\"
echo "       ANTHROPIC_API_KEY=<YOUR_KEY> \\"
echo "       AZURE_DEPLOYMENT=true"
echo ""
echo "🔐 Your authentication is saved and ready for future deployments!"
echo "💾 Auth location: $AZURE_AUTH_DIR"
echo ""
echo "🌐 Test the infrastructure: http://$CONTAINER_URL"