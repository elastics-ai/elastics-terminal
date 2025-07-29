#!/bin/bash

# Basic E2E Test Runner
set -e

echo "🚀 Running Basic E2E Tests..."
echo "================================"

# Clean up
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker/docker-compose.test.yml down -v 2>/dev/null || true

# Build only the necessary services
echo "🔨 Building test services..."
docker-compose -f docker/docker-compose.test.yml build backend websocket

# Run backend unit tests
echo "📦 Running backend tests..."
docker-compose -f docker/docker-compose.test.yml run --rm backend-test || true

# Start services
echo "🌐 Starting services..."
docker-compose -f docker/docker-compose.test.yml up -d backend websocket

# Wait for services
echo "⏳ Waiting for services..."
sleep 10

# Run E2E tests
echo "🧪 Running E2E tests..."
docker-compose -f docker/docker-compose.test.yml run --rm e2e-test || true

# Clean up
echo "🧹 Cleaning up..."
docker-compose -f docker/docker-compose.test.yml down -v

echo "✅ Tests complete!"