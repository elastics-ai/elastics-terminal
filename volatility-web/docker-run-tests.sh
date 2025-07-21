#!/bin/bash

# Script to run E2E tests from the web directory

echo "Running E2E tests using Docker..."

# Move to parent directory where docker-compose files are
cd ..

# Run the e2e tests
echo "Building and running E2E test container..."
docker-compose -f docker/docker-compose.test.yml run --rm e2e-test

# Check exit code
if [ $? -eq 0 ]; then
    echo "✅ E2E tests passed!"
else
    echo "❌ E2E tests failed!"
    exit 1
fi