#!/bin/bash

# Final Azure deployment - creates infrastructure ready for your application
set -e

RESOURCE_GROUP="elastics-terminal-rg"
LOCATION="eastus"
CONTAINER_NAME="elastics-terminal-app"
DNS_LABEL="elastics-terminal-$(date +%s)"

echo "=============================================="
echo "🚀 Elastics Terminal - Final Azure Deployment"
echo "=============================================="
echo ""

# Function to run Azure CLI
run_az() {
    docker run --rm -v "${PWD}:/workspace" -w /workspace mcr.microsoft.com/azure-cli:latest az "$@"
}

echo "🔐 Azure Authentication Required"
echo "Please complete the device authentication when prompted..."
echo ""

# Authenticate
run_az login --use-device-code

echo ""
echo "📦 Creating resource group..."
run_az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" || echo "Resource group already exists"

echo ""
echo "🚀 Deploying Elastics Terminal to Azure Container Instance..."
echo ""

# Deploy the actual application container
run_az container create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --image "elastics-terminal:latest" \
    --dns-name-label "$DNS_LABEL" \
    --ports 3000 8000 8765 \
    --location "$LOCATION" \
    --cpu 2 \
    --memory 4 \
    --restart-policy Always \
    --environment-variables \
        BASIC_AUTH_EMAIL="wojciech@elastics.ai" \
        BASIC_AUTH_PASSWORD="demo123!" \
        ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY_HERE" \
        AZURE_DEPLOYMENT="true" \
        NODE_ENV="production" \
        NEXT_TELEMETRY_DISABLED="1" \
        PYTHONUNBUFFERED="1" \
        WS_HOST="0.0.0.0" \
        WS_PORT="8765" \
        AUTO_OPTIMIZE="true" \
        BROADCAST_EVENTS="true" \
        ENABLE_OPTIONS="true" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7"

echo ""
echo "🔍 Getting deployment information..."

# Get container details
CONTAINER_URL=$(run_az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" \
    --query "ipAddress.fqdn" \
    --output tsv)

CONTAINER_IP=$(run_az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" \
    --query "ipAddress.ip" \
    --output tsv)

PROVISIONING_STATE=$(run_az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" \
    --query "provisioningState" \
    --output tsv)

echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=============================================="
echo "📱 Application URL: http://$CONTAINER_URL:3000"
echo "🌐 Alternative URL: http://$CONTAINER_IP:3000"
echo "🔐 Basic Auth Email: wojciech@elastics.ai"
echo "🔑 Basic Auth Password: demo123!"
echo "📊 API Endpoint: http://$CONTAINER_URL:8000"
echo "🔌 WebSocket: ws://$CONTAINER_URL:8765"
echo "⚡ Provisioning State: $PROVISIONING_STATE"
echo "=============================================="
echo ""
echo "✅ Features Available:"
echo "   🤖 Claude AI Chat Integration"
echo "   📈 Portfolio Overview Dashboard"
echo "   📊 Real-time Volatility Monitoring"
echo "   🔒 Basic Authentication Protection"
echo "   ⚡ WebSocket Real-time Updates"
echo "   📱 Responsive Web Interface"
echo ""
echo "🔗 Access your application:"
echo "   1. Open: http://$CONTAINER_URL:3000"
echo "   2. Login with: wojciech@elastics.ai / demo123!"
echo "   3. Enjoy your Elastics Terminal!"
echo ""
echo "📋 Azure Resources Created:"
echo "   • Resource Group: $RESOURCE_GROUP"
echo "   • Container Instance: $CONTAINER_NAME"
echo "   • Location: $LOCATION"
echo "   • Subscription: 48894024-13ed-494a-b9dc-b3cfe44bd9f7"