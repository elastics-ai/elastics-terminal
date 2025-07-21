#!/bin/bash

echo "Starting Volatility Terminal Web App..."

# Kill any existing processes on ports 3000 and 8000
echo "Cleaning up existing processes..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Start the Python API server in the background
echo "Starting Python API server on port 8000..."
cd /home/wojtek/dev/vol_filter/volatility-web
python3 api_server.py &
API_PID=$!

# Give the API server time to start
sleep 2

# Start the Next.js dev server
echo "Starting Next.js dev server on port 3000..."
npm run dev

# Cleanup on exit
trap "kill $API_PID 2>/dev/null" EXIT