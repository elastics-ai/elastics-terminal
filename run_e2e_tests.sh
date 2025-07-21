#!/bin/bash

# E2E Test Runner Script
# This script runs all end-to-end tests using Docker

set -e

echo "🚀 Starting E2E Test Suite..."
echo "================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Clean up any existing test containers
echo "🧹 Cleaning up existing test containers..."
docker-compose -f docker/docker-compose.test.yml down -v 2>/dev/null || true

# Build test images
echo "🔨 Building test images..."
docker-compose -f docker/docker-compose.test.yml build

# Run backend unit tests
echo -e "\n${YELLOW}📦 Running Backend Unit Tests...${NC}"
docker-compose -f docker/docker-compose.test.yml run --rm backend-test

# Run frontend unit tests
echo -e "\n${YELLOW}📦 Running Frontend Unit Tests...${NC}"
docker-compose -f docker/docker-compose.test.yml run --rm frontend-test

# Start services for E2E tests
echo -e "\n${YELLOW}🌐 Starting services for E2E tests...${NC}"
docker-compose -f docker/docker-compose.test.yml up -d backend frontend websocket

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
for i in {1..30}; do
    if docker-compose -f docker/docker-compose.test.yml ps | grep -q "healthy"; then
        echo -e "${GREEN}✅ Services are ready!${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Run Python E2E tests
echo -e "\n${YELLOW}🐍 Running Python E2E Tests...${NC}"
docker-compose -f docker/docker-compose.test.yml run --rm e2e-test

# Run Playwright E2E tests
echo -e "\n${YELLOW}🎭 Running Playwright E2E Tests...${NC}"
docker-compose -f docker/docker-compose.test.yml run --rm playwright-test

# Generate test reports
echo -e "\n${YELLOW}📊 Generating test reports...${NC}"
mkdir -p test-reports

# Copy Python coverage report
docker cp $(docker-compose -f docker/docker-compose.test.yml ps -q e2e-test):/app/htmlcov test-reports/python-coverage 2>/dev/null || true

# Copy Playwright report
docker cp $(docker-compose -f docker/docker-compose.test.yml ps -q playwright-test):/app/playwright-report test-reports/playwright-report 2>/dev/null || true

# Clean up
echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
docker-compose -f docker/docker-compose.test.yml down -v

# Summary
echo -e "\n================================"
echo -e "${GREEN}✅ E2E Test Suite Complete!${NC}"
echo -e "Test reports available in: ./test-reports/"
echo "================================"