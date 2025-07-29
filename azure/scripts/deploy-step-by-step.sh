#!/bin/bash

# Step-by-step Azure deployment for Elastics Terminal
# This script runs each deployment step individually

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

echo "🔧 Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  Location: $LOCATION"
echo "  Subscription: $SUBSCRIPTION_ID"
echo "  PostgreSQL Password: $POSTGRES_PASSWORD"
echo "  Redis Password: $REDIS_PASSWORD"
echo ""

echo "Step 1: Creating resource group..."
docker run --rm \
    -v "${PWD}:/workspace" \
    -w /workspace \
    mcr.microsoft.com/azure-cli:latest \
    bash -c "az login --service-principal --username $AZURE_CLIENT_ID --password $AZURE_CLIENT_SECRET --tenant $AZURE_TENANT_ID 2>/dev/null || az login --use-device-code"

# Instead of the complex auth, let me create the resources using Azure REST API or a simpler method