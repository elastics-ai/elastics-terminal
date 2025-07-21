# Volatility Filter Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Deployment](#development-deployment)
3. [Production Deployment](#production-deployment)
4. [Configuration Management](#configuration-management)
5. [Database Setup](#database-setup)
6. [Monitoring & Logging](#monitoring--logging)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)
9. [Performance Tuning](#performance-tuning)
10. [Security Hardening](#security-hardening)

## Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **CPU**: 4+ cores recommended
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 20GB free space minimum
- **Network**: Stable internet connection for market data

### Software Requirements
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Git**: For version control
- **Node.js**: 18+ (for local development)
- **Python**: 3.11+ (for local development)

### API Keys Required
- **Anthropic API Key**: For Claude AI integration
- **Deribit API** (optional): For live market data
- **Polymarket API** (optional): For prediction markets

## Development Deployment

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/volatility-filter.git
cd volatility-filter
```

### 2. Environment Configuration
Create `.env` file in the project root:
```bash
cp docker/.env.example .env
```

Edit `.env` with your configuration:
```env
# API Keys
ANTHROPIC_API_KEY=your_anthropic_key_here

# Database
DB_PATH=/app/data/volatility_filter.db

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000
WS_HOST=0.0.0.0
WS_PORT=8765

# Options
AUTO_OPTIMIZE=true
LOG_LEVEL=INFO
```

### 3. Build and Run with Docker Compose
```bash
# Build the Docker image
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Verify Deployment
```bash
# Check if services are running
docker-compose ps

# Test API endpoint
curl http://localhost:8000/health

# Test WebSocket connection
wscat -c ws://localhost:8765
```

### 5. Access the Application
- **Web Interface**: http://localhost:3001
- **API Documentation**: http://localhost:8000/docs
- **WebSocket**: ws://localhost:8765

## Production Deployment

### 1. Server Setup

#### AWS EC2 Example
```bash
# Launch EC2 instance (t3.large or better)
# Security groups: Allow ports 80, 443, 8000, 8765

# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. SSL/TLS Setup with Nginx

Create `nginx.conf`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. Production Docker Compose

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  volatility-filter:
    build:
      context: .
      dockerfile: docker/Dockerfile
      args:
        - BUILD_ENV=production
    ports:
      - "127.0.0.1:8000:8000"
      - "127.0.0.1:8765:8765"
      - "127.0.0.1:3001:3001"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - API_HOST=0.0.0.0
      - WS_HOST=0.0.0.0
    env_file:
      - .env.production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. Deploy to Production
```bash
# Copy files to server
scp -r . ubuntu@your-server:/home/ubuntu/volatility-filter

# On the server
cd /home/ubuntu/volatility-filter

# Create production env file
cp .env.example .env.production
# Edit with production values

# Build and run
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration Management

### Environment Variables

#### Core Configuration
```env
# Application
APP_NAME=VolatilityFilter
APP_ENV=production
DEBUG=false

# Database
DB_PATH=/app/data/volatility_filter.db
DB_BACKUP_PATH=/app/backups

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4
API_CORS_ORIGINS=["https://your-domain.com"]

# WebSocket Configuration
WS_HOST=0.0.0.0
WS_PORT=8765
WS_HEARTBEAT_INTERVAL=30
WS_MAX_CONNECTIONS=1000

# External APIs
ANTHROPIC_API_KEY=sk-ant-...
DERIBIT_CLIENT_ID=your-client-id
DERIBIT_CLIENT_SECRET=your-client-secret
DERIBIT_TEST_NET=false

# Volatility Engine
VOL_UPDATE_INTERVAL=60
VOL_LOOKBACK_DAYS=30
VOL_AR_ORDER=5
VOL_MIN_DATA_POINTS=100

# Alerts
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_SMTP=smtp.gmail.com
ALERT_EMAIL_PORT=587
ALERT_EMAIL_USER=alerts@your-domain.com
ALERT_EMAIL_PASS=your-password

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE=/app/logs/app.log
LOG_MAX_SIZE=100M
LOG_MAX_FILES=10

# Performance
CACHE_ENABLED=true
CACHE_TTL=300
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
```

### Configuration Files

#### Supervisor Configuration (`/etc/supervisor/conf.d/volatility-filter.conf`):
```ini
[program:websocket-server]
command=python /app/src/volatility_filter/websocket_server.py
directory=/app
autostart=true
autorestart=true
stderr_logfile=/app/logs/websocket.err.log
stdout_logfile=/app/logs/websocket.out.log
user=app
environment=PYTHONPATH="/app"

[program:api-server]
command=python /app/volatility-web/api_server.py
directory=/app
autostart=true
autorestart=true
stderr_logfile=/app/logs/api.err.log
stdout_logfile=/app/logs/api.out.log
user=app
environment=PYTHONPATH="/app"

[program:nextjs-server]
command=npm start
directory=/app/volatility-web
autostart=true
autorestart=true
stderr_logfile=/app/logs/nextjs.err.log
stdout_logfile=/app/logs/nextjs.out.log
user=app
environment=NODE_ENV="production",PORT="3001"
```

## Database Setup

### Initial Setup
```bash
# Create database directory
mkdir -p data

# Initialize database (run from container)
docker-compose exec volatility-filter python -m src.volatility_filter.database init

# Run migrations
docker-compose exec volatility-filter python -m src.volatility_filter.database migrate
```

### Database Schema Creation
```sql
-- Create indexes for performance
CREATE INDEX idx_trades_symbol_timestamp ON historical_trades(symbol, timestamp);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_greeks_symbol_timestamp ON option_greeks(symbol, timestamp);
CREATE INDEX idx_events_timestamp ON volatility_events(timestamp);

-- Create views for common queries
CREATE VIEW current_portfolio AS
SELECT 
    p.*,
    i.underlying,
    i.strike,
    i.expiry,
    i.option_type
FROM positions p
JOIN option_instruments i ON p.symbol = i.symbol
WHERE p.quantity > 0;

CREATE VIEW recent_volatility AS
SELECT 
    symbol,
    AVG(actual_value) as avg_vol,
    MAX(actual_value) as max_vol,
    MIN(actual_value) as min_vol
FROM volatility_events
WHERE timestamp > unixepoch('now', '-24 hours')
GROUP BY symbol;
```

### Database Maintenance
```bash
# Backup database
docker-compose exec volatility-filter sqlite3 /app/data/volatility_filter.db ".backup /app/backups/backup_$(date +%Y%m%d_%H%M%S).db"

# Vacuum database (optimize)
docker-compose exec volatility-filter sqlite3 /app/data/volatility_filter.db "VACUUM;"

# Check integrity
docker-compose exec volatility-filter sqlite3 /app/data/volatility_filter.db "PRAGMA integrity_check;"
```

## Monitoring & Logging

### Application Metrics

#### Prometheus Configuration (`prometheus.yml`):
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'volatility-filter'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

#### Grafana Dashboard
Import the provided dashboard JSON from `monitoring/grafana-dashboard.json`

Key metrics to monitor:
- API response times (p50, p95, p99)
- WebSocket connections (active, total)
- Database query performance
- Volatility calculation latency
- Error rates by endpoint

### Log Aggregation

#### Filebeat Configuration:
```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /app/logs/*.log
  multiline.pattern: '^\d{4}-\d{2}-\d{2}'
  multiline.negate: true
  multiline.match: after

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "volatility-filter-%{+yyyy.MM.dd}"
```

### Health Checks

#### API Health Endpoint:
```python
@app.get("/health")
async def health_check():
    checks = {
        "api": "healthy",
        "database": check_database_connection(),
        "websocket": check_websocket_server(),
        "external_apis": {
            "anthropic": check_anthropic_api(),
            "deribit": check_deribit_connection()
        }
    }
    
    status_code = 200 if all_healthy(checks) else 503
    return JSONResponse(content=checks, status_code=status_code)
```

#### Monitoring Script:
```bash
#!/bin/bash
# monitor.sh

while true; do
    # Check API health
    if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "API health check failed" | mail -s "Volatility Filter Alert" admin@your-domain.com
    fi
    
    # Check WebSocket
    if ! nc -z localhost 8765; then
        echo "WebSocket server down" | mail -s "Volatility Filter Alert" admin@your-domain.com
    fi
    
    # Check disk space
    if [ $(df -h /app/data | awk 'NR==2 {print $5}' | sed 's/%//') -gt 80 ]; then
        echo "Disk space low" | mail -s "Volatility Filter Alert" admin@your-domain.com
    fi
    
    sleep 300  # Check every 5 minutes
done
```

## Backup & Recovery

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/app/backups"
DB_PATH="/app/data/volatility_filter.db"
S3_BUCKET="s3://your-backup-bucket"
RETENTION_DAYS=30

# Create backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.db"

# Backup database
sqlite3 $DB_PATH ".backup $BACKUP_FILE"

# Compress backup
gzip $BACKUP_FILE

# Upload to S3 (if configured)
if [ ! -z "$S3_BUCKET" ]; then
    aws s3 cp "$BACKUP_FILE.gz" "$S3_BUCKET/volatility-filter/"
fi

# Clean old backups
find $BACKUP_DIR -name "backup_*.db.gz" -mtime +$RETENTION_DAYS -delete

# Log backup
echo "$(date): Backup completed - $BACKUP_FILE.gz" >> /app/logs/backup.log
```

### Recovery Procedure
```bash
# Stop services
docker-compose down

# Restore from backup
gunzip /app/backups/backup_20240315_120000.db.gz
cp /app/backups/backup_20240315_120000.db /app/data/volatility_filter.db

# Verify integrity
sqlite3 /app/data/volatility_filter.db "PRAGMA integrity_check;"

# Restart services
docker-compose up -d
```

## Troubleshooting

### Common Issues

#### 1. WebSocket Connection Drops
```bash
# Check WebSocket server logs
docker-compose logs -f volatility-filter | grep websocket

# Common solutions:
# - Increase heartbeat interval
# - Check nginx timeout settings
# - Verify firewall rules
```

#### 2. High Memory Usage
```bash
# Check memory usage
docker stats volatility-filter

# Solutions:
# - Increase container memory limit
# - Optimize data retention
# - Enable pagination for large queries
```

#### 3. Database Lock Errors
```bash
# Check for long-running queries
sqlite3 /app/data/volatility_filter.db "SELECT * FROM sqlite_master WHERE type='table';"

# Solutions:
# - Enable WAL mode
# - Reduce concurrent writes
# - Implement connection pooling
```

#### 4. API Performance Issues
```bash
# Profile slow endpoints
python -m cProfile -o profile.out api_server.py

# Solutions:
# - Add caching layer
# - Optimize database queries
# - Increase worker count
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
export DEBUG=true

# Run with verbose output
docker-compose up

# Access debug endpoints
curl http://localhost:8000/debug/routes
curl http://localhost:8000/debug/connections
```

## Performance Tuning

### Database Optimization
```sql
-- Enable Write-Ahead Logging
PRAGMA journal_mode = WAL;
PRAGMA wal_autocheckpoint = 1000;

-- Optimize query planner
PRAGMA optimize;

-- Increase cache size
PRAGMA cache_size = -64000;  -- 64MB

-- Enable memory-mapped I/O
PRAGMA mmap_size = 268435456;  -- 256MB
```

### API Performance
```python
# FastAPI optimization settings
app = FastAPI(
    docs_url="/docs",
    redoc_url=None,  # Disable redoc
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests
)

# Response caching
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache

@app.get("/api/volatility/surface/latest")
@cache(expire=60)  # Cache for 60 seconds
async def get_latest_surface():
    # Implementation
```

### Frontend Optimization
```javascript
// next.config.js
module.exports = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  
  images: {
    domains: ['your-domain.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  experimental: {
    optimizeCss: true,
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
          },
        },
      };
    }
    return config;
  },
};
```

## Security Hardening

### 1. API Security
```python
# Rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.get("/api/portfolio/summary")
@limiter.limit("100/minute")
async def get_portfolio_summary():
    # Implementation

# Input validation
from pydantic import BaseModel, validator

class PositionUpdate(BaseModel):
    quantity: float
    current_price: float
    
    @validator('quantity')
    def validate_quantity(cls, v):
        if v < 0:
            raise ValueError('Quantity must be positive')
        return v
```

### 2. Network Security
```bash
# UFW firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban configuration
sudo apt-get install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
# Edit jail.local to add custom rules
```

### 3. Container Security
```dockerfile
# Use non-root user
RUN addgroup -g 1000 app && \
    adduser -u 1000 -G app -s /bin/sh -D app

USER app

# Security scanning
# Run before deployment:
docker scan volatility-filter:latest
```

### 4. Secrets Management
```bash
# Use Docker secrets
echo "your-api-key" | docker secret create anthropic_api_key -

# In docker-compose.yml
secrets:
  anthropic_api_key:
    external: true

services:
  volatility-filter:
    secrets:
      - anthropic_api_key
```

## Maintenance Checklist

### Daily
- [ ] Check health endpoints
- [ ] Monitor error logs
- [ ] Verify backup completion
- [ ] Check disk space

### Weekly
- [ ] Review performance metrics
- [ ] Update dependencies
- [ ] Analyze slow queries
- [ ] Test disaster recovery

### Monthly
- [ ] Security updates
- [ ] Database optimization
- [ ] Certificate renewal
- [ ] Capacity planning

### Quarterly
- [ ] Full system audit
- [ ] Performance benchmarking
- [ ] Security assessment
- [ ] Documentation update

## Support & Resources

### Documentation
- Architecture: `/ARCHITECTURE.md`
- API Reference: `/API_DOCUMENTATION.md`
- Contributing: `/CONTRIBUTING.md`

### Monitoring URLs
- Grafana: `https://your-domain.com/grafana`
- Prometheus: `https://your-domain.com/prometheus`
- Logs: `https://your-domain.com/kibana`

### Support Contacts
- Technical Issues: tech@your-domain.com
- Security Issues: security@your-domain.com
- On-call: +1-xxx-xxx-xxxx

### Useful Commands
```bash
# View all logs
docker-compose logs -f

# Restart specific service
docker-compose restart volatility-filter

# Execute command in container
docker-compose exec volatility-filter bash

# Database console
docker-compose exec volatility-filter sqlite3 /app/data/volatility_filter.db

# Python shell with app context
docker-compose exec volatility-filter python -m src.volatility_filter.shell
```