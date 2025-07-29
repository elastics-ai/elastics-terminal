#!/bin/bash

# Complete ACR build and deployment for Elastics Terminal
set -e

RESOURCE_GROUP="elastics-terminal-rg"
LOCATION="eastus"
ACR_NAME="elasticsterminalacr$(date +%s | tail -c 6)"
CONTAINER_NAME="elastics-terminal-app"
DNS_LABEL="elastics-terminal-live"
AZURE_AUTH_DIR="$HOME/.azure-elastics"

echo "=============================================="
echo "🚀 Elastics Terminal - Complete ACR Deployment"
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
echo "🔧 Registering Container Registry provider..."
run_az provider register --namespace Microsoft.ContainerRegistry --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7"

echo ""
echo "⏳ Waiting for provider registration (30 seconds)..."
sleep 30

echo ""
echo "🏗️ Creating Azure Container Registry..."
run_az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true \
    --location "$LOCATION" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7"

echo ""
echo "📤 Building Docker image on Azure (this will take 5-10 minutes)..."
echo "   Uploading source code and building Elastics Terminal..."

# Build the image on Azure using ACR Tasks
run_az acr build \
    --registry "$ACR_NAME" \
    --image "elastics-terminal:latest" \
    --file "Dockerfile.azure" \
    --resource-group "$RESOURCE_GROUP" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" \
    .

echo ""
echo "🔍 Getting registry details..."
ACR_SERVER=$(run_az acr show \
    --name "$ACR_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "loginServer" \
    --output tsv \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7")

echo ""
echo "🚀 Deploying Elastics Terminal to Azure Container Instance..."
run_az container create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --image "$ACR_SERVER/elastics-terminal:latest" \
    --dns-name-label "$DNS_LABEL" \
    --ports 3000 8000 8765 \
    --location "$LOCATION" \
    --os-type Linux \
    --cpu 2 \
    --memory 4 \
    --restart-policy Always \
    --registry-login-server "$ACR_SERVER" \
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
echo "🔍 Getting application details..."
APP_URL=$(run_az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --query "ipAddress.fqdn" \
    --output tsv \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7")

APP_IP=$(run_az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --query "ipAddress.ip" \
    --output tsv \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7")

PROVISIONING_STATE=$(run_az container show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$CONTAINER_NAME" \
    --query "provisioningState" \
    --output tsv \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7")

echo ""
echo "🎉 ELASTICS TERMINAL DEPLOYMENT COMPLETED!"
echo "=============================================="
echo "📱 Application URL: http://$APP_URL:3000"
echo "🌐 Direct IP: http://$APP_IP:3000"
echo "📊 API Endpoint: http://$APP_URL:8000"
echo "🔌 WebSocket: ws://$APP_URL:8765"
echo "🔐 Login Email: wojciech@elastics.ai"
echo "🔑 Login Password: demo123!"
echo "⚡ Status: $PROVISIONING_STATE"
echo "=============================================="
echo ""
echo "✅ FEATURES AVAILABLE:"
echo "   🤖 Claude AI Chat Integration"
echo "   📈 Portfolio Overview Dashboard"
echo "   📊 Real-time Volatility Monitoring"
echo "   🔒 Basic Authentication Protection"
echo "   ⚡ WebSocket Real-time Updates"
echo "   📱 Responsive Web Interface"
echo "   🎯 Options Chain Analysis"
echo "   📉 Greeks Calculations"
echo "   🔄 Automated Portfolio Rebalancing"
echo ""
echo "🌐 ACCESS YOUR APPLICATION:"
echo "   1. Open: http://$APP_URL:3000"
echo "   2. Login: wojciech@elastics.ai / demo123!"
echo "   3. Enjoy your Elastics Terminal!"
echo ""
echo "📋 AZURE RESOURCES:"
echo "   • Resource Group: $RESOURCE_GROUP"
echo "   • Container Registry: $ACR_SERVER"
echo "   • Container Instance: $CONTAINER_NAME"
echo "   • Location: East US"
echo "   • Subscription: Microsoft Azure Sponsorship"
echo ""
echo "🔐 Authentication saved for future deployments!"
echo "💾 Location: $AZURE_AUTH_DIR"
echo ""
echo "🚀 Your Elastics Terminal is now LIVE on Azure!"