#!/bin/bash

# Start test services script
echo "Starting test services..."

# Export test environment
export TESTING=true
export ANTHROPIC_API_KEY=test-key
export DB_PATH=/tmp/test_volatility.db

# Kill any existing processes
pkill -f "python.*api_server.py" || true
pkill -f "python.*websocket_server" || true

# Start API server in background
echo "Starting API server..."
cd .. && python volatility-web/api_server.py &
API_PID=$!
cd volatility-web

# Start WebSocket server in background
echo "Starting WebSocket server..."
cd .. && python -m src.volatility_filter.websocket_server &
WS_PID=$!
cd volatility-web

# Wait for services to start
echo "Waiting for services to start..."
sleep 5

# Check if services are running
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✅ API server is running"
else
    echo "❌ API server failed to start"
fi

# Keep PIDs for cleanup
echo $API_PID > /tmp/api_server.pid
echo $WS_PID > /tmp/websocket_server.pid

echo "Services started. PIDs saved to /tmp/*.pid"
echo "To stop: kill \$(cat /tmp/api_server.pid) \$(cat /tmp/websocket_server.pid)"