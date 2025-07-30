#!/bin/bash

# Deploy Elastics Terminal using Docker Compose

echo "🚀 Starting Elastics Terminal deployment..."

# Navigate to docker directory
cd /mnt/d/Coding/elastics-terminal/docker

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration (especially ANTHROPIC_API_KEY)"
    exit 1
fi

# Create data directory if it doesn't exist
mkdir -p data

echo "📦 Building Docker images..."
echo "Note: If you get permission errors, run: sudo usermod -aG docker $USER && newgrp docker"

# Build images
docker compose build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Trying with sudo..."
    sudo docker compose build
fi

echo "🔄 Starting services..."
docker compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Start failed. Trying with sudo..."
    sudo docker compose up -d
fi

echo "⏳ Waiting for services to start..."
sleep 10

echo "✅ Checking service status..."
docker compose ps || sudo docker compose ps

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📍 Service URLs:"
echo "   - Web Application: http://localhost:3001"
echo "   - API Server: http://localhost:7000"
echo "   - WebSocket Server: ws://localhost:8765"
echo "   - GlitchTip Dashboard: http://localhost:8080"
echo ""
echo "📊 View logs with: docker compose logs -f"
echo "🛑 Stop services with: docker compose down"