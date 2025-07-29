#!/bin/bash

# Azure deployment with persistent authentication
set -e

RESOURCE_GROUP="elastics-terminal-rg"
LOCATION="eastus"
ACR_NAME="elasticsterminalacr$(date +%s | tail -c 6)"
APP_NAME="elastics-terminal"
AZURE_DIR="$HOME/.azure-elastics"

echo "=============================================="
echo "🚀 Elastics Terminal - Azure Deploy (Persistent Auth)"
echo "=============================================="

# Create persistent Azure directory
mkdir -p "$AZURE_DIR"

# Function to run Azure CLI with persistent auth
run_az() {
    docker run --rm \
        -v "${PWD}:/workspace" \
        -v "$AZURE_DIR:/root/.azure" \
        -w /workspace \
        mcr.microsoft.com/azure-cli:latest \
        az "$@"
}

# Check if already authenticated
echo "🔍 Checking authentication status..."
if run_az account show --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" > /dev/null 2>&1; then
    echo "✅ Already authenticated!"
else
    echo "🔐 Authentication required..."
    run_az login --use-device-code
    echo "💾 Authentication saved for future use!"
fi

echo ""
echo "📦 Creating/updating resource group..."
run_az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7"

echo ""
echo "🏗️ Creating Azure Container Registry..."
run_az acr create \
    --resource-group "$RESOURCE_GROUP" \
    --name "$ACR_NAME" \
    --sku Basic \
    --admin-enabled true \
    --location "$LOCATION" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" || echo "ACR may already exist"

echo ""
echo "⚙️ Building Docker image on Azure (this may take 5-10 minutes)..."
echo "📤 Uploading source code and building..."
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
echo "🚀 Creating Container App Environment..."
run_az containerapp env create \
    --name "elastics-terminal-env" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7" || echo "Environment may already exist"

echo ""
echo "📱 Deploying Container App..."
run_az containerapp create \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --environment "elastics-terminal-env" \
    --image "$ACR_SERVER/elastics-terminal:latest" \
    --target-port 3000 \
    --ingress external \
    --registry-server "$ACR_SERVER" \
    --env-vars \
        BASIC_AUTH_EMAIL="wojciech@elastics.ai" \
        BASIC_AUTH_PASSWORD="demo123!" \
        ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY_HERE" \
        AZURE_DEPLOYMENT="true" \
        NODE_ENV="production" \
        NEXT_TELEMETRY_DISABLED="1" \
        PYTHONUNBUFFERED="1" \
        WS_HOST="0.0.0.0" \
        WS_PORT="8765" \
    --cpu 2.0 \
    --memory 4.0Gi \
    --min-replicas 1 \
    --max-replicas 3 \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7"

echo ""
echo "🔍 Getting application URL..."
APP_URL=$(run_az containerapp show \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.configuration.ingress.fqdn" \
    --output tsv \
    --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7")

echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=============================================="
echo "📱 Application URL: https://$APP_URL"
echo "🔐 Basic Auth Email: wojciech@elastics.ai" 
echo "🔑 Basic Auth Password: demo123!"
echo "🏗️ Container Registry: $ACR_SERVER"
echo "📦 Resource Group: $RESOURCE_GROUP"
echo "💾 Auth saved in: $AZURE_DIR"
echo "=============================================="
echo ""
echo "✅ Your Elastics Terminal is now live on Azure!"
echo "🔒 Protected with basic authentication"
echo "🤖 Claude AI chat functionality enabled"
echo "📊 Full portfolio dashboard available"
echo "⚡ Real-time WebSocket updates enabled"
echo ""
echo "🌐 Access your application:"
echo "   URL: https://$APP_URL"
echo "   Username: wojciech@elastics.ai"
echo "   Password: demo123!"
echo ""
echo "🔧 Future deployments will use saved authentication!"