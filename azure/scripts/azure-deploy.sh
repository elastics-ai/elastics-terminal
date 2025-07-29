#!/bin/bash

# Single-session Azure deployment script for Elastics Terminal
set -e

# Configuration
RESOURCE_GROUP="elastics-terminal-rg"
LOCATION="eastus"
APP_NAME="elastics-terminal"
SUBSCRIPTION_ID="48894024-13ed-494a-b9dc-b3cfe44bd9f7"
ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY_HERE"

# Generate secure passwords
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo "========================================"
echo "Elastics Terminal Azure Deployment"
echo "========================================"
echo ""
echo "🔧 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Subscription: $SUBSCRIPTION_ID"
echo ""

# Create the deployment script that will run inside Docker
cat > /tmp/azure_deploy_inner.sh << 'EOF'
#!/bin/bash
set -e

echo "🔐 Logging into Azure..."
az login --use-device-code

echo "📋 Setting subscription..."
az account set --subscription "48894024-13ed-494a-b9dc-b3cfe44bd9f7"

echo "📦 Creating resource group..."
az group create --name "elastics-terminal-rg" --location "eastus"

echo "🏗️ Deploying infrastructure..."
az deployment group create \
    --resource-group "elastics-terminal-rg" \
    --template-file "/workspace/azure/bicep/main.bicep" \
    --parameters \
        appName="elastics-terminal" \
        location="eastus" \
        postgresPassword="$(echo $POSTGRES_PASSWORD)" \
        redisPassword="$(echo $REDIS_PASSWORD)" \
        anthropicApiKey="YOUR_ANTHROPIC_API_KEY_HERE" \
        basicAuthPassword="demo123!"

echo "✅ Infrastructure deployment completed!"

# Get the container registry details
echo "🔍 Getting container registry details..."
ACR_NAME=$(az acr list --resource-group "elastics-terminal-rg" --query "[0].name" --output tsv)
ACR_LOGIN_SERVER=$(az acr list --resource-group "elastics-terminal-rg" --query "[0].loginServer" --output tsv)

echo "Container Registry: $ACR_NAME"
echo "Login Server: $ACR_LOGIN_SERVER"

echo "🔑 Getting container registry credentials..."
az acr login --name "$ACR_NAME" || echo "Login failed, continuing..."

# Get deployment outputs
echo "📄 Getting deployment information..."
CONTAINER_APP_URL=$(az deployment group show \
    --resource-group "elastics-terminal-rg" \
    --name "main" \
    --query "properties.outputs.containerAppUrl.value" \
    --output tsv)

echo ""
echo "🎉 DEPLOYMENT COMPLETED!"
echo "=================================="
echo "Application URL: $CONTAINER_APP_URL"
echo "Basic Auth Email: wojciech@elastics.ai"
echo "Basic Auth Password: demo123!"
echo "Container Registry: $ACR_LOGIN_SERVER"
echo ""
echo "Next steps:"
echo "1. Build and push the container image"
echo "2. Update the container app with the new image"
echo "=================================="
EOF

chmod +x /tmp/azure_deploy_inner.sh

# Run the deployment in Docker with the inner script
docker run --rm -it \
    -v "${PWD}:/workspace" \
    -v "/tmp/azure_deploy_inner.sh:/deploy.sh" \
    -w /workspace \
    -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
    -e REDIS_PASSWORD="$REDIS_PASSWORD" \
    mcr.microsoft.com/azure-cli:latest \
    /deploy.sh