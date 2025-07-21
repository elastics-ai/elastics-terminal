# Docker Setup for Elastics Terminal

This directory contains Docker configuration for running the Elastics Terminal system, now with a modern web interface.

## 🚀 Quick Start - Web App (Recommended)

1. **Copy and configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY for AI chat features
   ```

2. **Start the web app:**
   ```bash
   # Start the full web application (includes WebSocket server, API, and web UI)
   docker-compose up -d volatility-webapp
   ```

3. **Access the web terminal:**
   - Open http://localhost:3000 in your browser
   - Use the command bar (press `/`) to navigate
   - Available views: PORT, FILTER, VOL, CHAT, POLY

## Services

### volatility-webapp (Default - Recommended)
- **Modern web interface** replacing the TUI
- **Ports:**
  - `3000`: Next.js web application
  - `8000`: FastAPI backend
  - `8765`: WebSocket server
- **Features:**
  - Real-time portfolio monitoring
  - Live volatility tracking with alerts
  - 3D volatility surface visualization
  - AI-powered chat with Claude
  - Polymarket integration
- **Data:** Stored in `./data/volatility_filter.db`

### Legacy Services (use `--profile legacy`)

#### volatility-server
- Standalone WebSocket server (if you only need the API)
- WebSocket API on port 8765

#### elastics-tui
- Original terminal UI (deprecated)
- Requires `--profile legacy` flag

## Usage Examples

### Run the Web App (Recommended)
```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f volatility-webapp

# Stop everything
docker-compose down
```

### Run Legacy TUI (if needed)
```bash
# Start legacy services
docker-compose --profile legacy up -d

# Attach to TUI
docker exec -it elastics-terminal tmux attach-session -t elastics
```

### Development Mode
```bash
# Run with live logs
docker-compose up volatility-webapp

# Rebuild after changes
docker-compose build volatility-webapp
docker-compose up -d volatility-webapp
```

## Environment Variables

Key variables in `.env`:

- `ANTHROPIC_API_KEY`: Required for AI chat features
- `WS_HOST/WS_PORT`: WebSocket server configuration (default: 0.0.0.0:8765)
- `DB_PATH`: Database file location (default: /data/volatility_filter.db)
- `ENABLE_OPTIONS`: Enable options monitoring (default: true)
- `VOL_THRESHOLD`: Volatility threshold for alerts

## Data Persistence

- Database: `./data/volatility_filter.db`
- All portfolio and market data persists between restarts
- Backup regularly: `cp ./data/volatility_filter.db ./data/backup_$(date +%Y%m%d).db`

## Troubleshooting

### Web app not loading
```bash
# Check all services are running
docker-compose ps

# Check logs for errors
docker-compose logs volatility-webapp

# Ensure ports are not in use
lsof -i :3000 -i :8000 -i :8765
```

### Permission issues
```bash
sudo chown -R $USER:$USER ./data
```

### Reset everything
```bash
docker-compose down
rm -rf ./data/*
docker-compose up -d
```

### Can't connect to WebSocket
- Ensure WebSocket server is running: check logs for "WebSocket server started"
- Try accessing directly: `ws://localhost:8765`

## Upgrading from TUI to Web App

1. Stop existing services: `docker-compose down`
2. Pull latest changes
3. Build new image: `docker-compose build volatility-webapp`
4. Start web app: `docker-compose up -d`
5. Your existing database in `./data` will be automatically used

## Performance Tuning

For production use, consider:
- Setting `NODE_ENV=production` (already set in Dockerfile)
- Adjusting WebSocket `BROADCAST_INTERVAL` for less frequent updates
- Using a reverse proxy (nginx) for the web app
- Enabling Redis for caching (future enhancement)