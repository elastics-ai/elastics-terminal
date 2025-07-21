# Volatility Filter - Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [Database Design](#database-design)
7. [Real-time Communication](#real-time-communication)
8. [Security & Authentication](#security--authentication)
9. [Deployment Architecture](#deployment-architecture)
10. [Development Guidelines](#development-guidelines)

## System Overview

The Volatility Filter is a sophisticated financial analytics platform designed for professional traders and portfolio managers. It provides real-time volatility monitoring, options analytics, and AI-powered insights for cryptocurrency markets (primarily BTC and ETH).

### Key Features
- **Real-time Volatility Monitoring**: Track and analyze implied volatility surfaces
- **Portfolio Management**: Monitor positions, P&L, and risk metrics
- **AI-Powered Chat**: Claude AI integration for market insights and analysis
- **Options Analytics**: Greeks calculation, volatility smile analysis
- **Automated Trading Signals**: Threshold-based alerts and notifications
- **Polymarket Integration**: Prediction market data and analysis

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client Layer (Browser)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Next.js Frontend (Port 3000)                                               │
│  ├── React Components (Bloomberg Terminal UI)                               │
│  ├── WebSocket Client (Real-time Updates)                                   │
│  ├── React Query (Data Fetching & Caching)                                  │
│  └── Three.js (3D Visualizations)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                            API Gateway                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  FastAPI Server (Port 8000)          │  WebSocket Server (Port 8765)       │
│  ├── REST Endpoints                  │  ├── Event Broadcasting              │
│  ├── Request Validation              │  ├── Client Subscriptions           │
│  ├── Authentication                  │  ├── Real-time Data Streaming       │
│  └── Response Formatting             │  └── Connection Management          │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Business Logic Layer                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  Core Services                                                              │
│  ├── Volatility Engine (AR Model, Surface Fitting)                         │
│  ├── Portfolio Manager (Position Tracking, P&L Calculation)                │
│  ├── Options Analytics (Greeks, Pricing Models)                            │
│  ├── Market Data Fetcher (Deribit, Polymarket APIs)                       │
│  ├── Claude AI Client (Chat & Analysis)                                    │
│  └── SQL Agent (Database Query Interface)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                            Data Layer                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  SQLite Database                                                            │
│  ├── Trading Data (Historical & Real-time)                                 │
│  ├── Options Data (Chains, Greeks, Trades)                                 │
│  ├── Portfolio Data (Positions, Performance)                               │
│  ├── Analytics Data (Events, Surfaces, Metrics)                            │
│  └── Configuration (Filters, Thresholds)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                         External Services                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ├── Deribit API (Options Data)                                            │
│  ├── Polymarket API (Prediction Markets)                                   │
│  └── Anthropic API (Claude AI)                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Backend Technologies
- **Language**: Python 3.11
- **Web Framework**: FastAPI
- **WebSocket**: Native Python WebSockets
- **Data Processing**: pandas, numpy, scipy
- **Statistical Modeling**: statsmodels (AR models)
- **AI Integration**: Anthropic SDK (Claude)
- **Database**: SQLite with SQLAlchemy
- **HTTP Client**: aiohttp for async requests

### Frontend Technologies
- **Framework**: Next.js 15.3.5
- **Language**: TypeScript
- **UI Library**: React 19
- **State Management**: Jotai
- **Data Fetching**: @tanstack/react-query
- **Real-time**: Socket.io-client
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **3D Graphics**: Three.js with React Three Fiber
- **Form Handling**: React Hook Form with Zod validation

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Process Management**: Supervisor (in Docker)
- **Environment Management**: Docker environment variables

## Backend Architecture

### Core Services

#### 1. Volatility Engine (`src/volatility_filter/filter.py`)
```python
class VolatilityFilter:
    - AR model for volatility estimation
    - Real-time volatility calculation
    - Threshold breach detection
    - Surface fitting algorithms
```

#### 2. Portfolio Manager (`src/volatility_filter/portfolio_manager.py`)
```python
class PortfolioManager:
    - Position tracking and updates
    - P&L calculation (realized/unrealized)
    - Greeks aggregation
    - Performance metrics calculation
```

#### 3. Database Service (`src/volatility_filter/database.py`)
```python
class DatabaseService:
    - Connection pooling
    - Query optimization
    - Data persistence layer
    - Transaction management
```

#### 4. Market Data Services
- **Deribit Client**: Options chain fetching, trade data
- **Polymarket Client**: Prediction market integration
- **WebSocket Feeds**: Real-time price updates

#### 5. AI Integration (`src/volatility_filter/claude_client.py`)
```python
class ClaudeClient:
    - Chat completions
    - Financial analysis
    - Context management
    - Response formatting
```

### API Design

#### REST Endpoints (FastAPI)
```
GET  /api/portfolio/summary         # Portfolio overview
GET  /api/portfolio/positions       # Current positions
GET  /api/volatility/alerts         # Active alerts
GET  /api/volatility/surface/latest # Latest vol surface
POST /api/chat/send                 # Send chat message
GET  /api/polymarket/markets        # Prediction markets
GET  /api/stats/realtime           # Real-time statistics
```

#### WebSocket Events
```
Subscriptions:
- threshold_breach    # Volatility alerts
- trade              # New trades
- volatility_estimate # Updated estimates
- option_data        # Options updates
- portfolio_update   # Position changes
```

## Frontend Architecture

### Component Structure
```
volatility-web/
├── app/                      # Next.js app directory
│   ├── page.tsx             # Dashboard
│   ├── chat/                # AI Chat interface
│   ├── filter/              # Volatility filter
│   ├── portfolio/           # Portfolio views
│   └── polymarket/          # Prediction markets
├── components/
│   ├── layout/              # App layout components
│   ├── dashboard/           # Dashboard widgets
│   ├── bloomberg/           # Terminal UI components
│   └── ui/                  # Reusable UI components
├── lib/
│   ├── api.ts              # API client
│   ├── websocket.ts        # WebSocket manager
│   └── utils.ts            # Utility functions
└── hooks/                   # Custom React hooks
```

### State Management
- **Server State**: React Query for caching and synchronization
- **Client State**: Jotai atoms for UI state
- **WebSocket State**: Custom hooks for real-time data

### Key Components

#### 1. Dashboard (`app/page.tsx`)
- Portfolio overview cards
- Risk metrics display
- Performance charts
- News feed integration
- Notifications panel

#### 2. Chat Interface (`components/bloomberg/views/chat/`)
- Message history
- AI response streaming
- Code highlighting
- Context awareness

#### 3. Volatility Surface (`components/bloomberg/views/filter/`)
- 3D surface visualization
- Heatmap display
- Interactive controls
- Real-time updates

## Database Design

### Schema Overview

#### Trading Tables
```sql
-- Historical trades
CREATE TABLE historical_trades (
    id INTEGER PRIMARY KEY,
    symbol TEXT,
    price REAL,
    volume REAL,
    timestamp INTEGER,
    source TEXT
);

-- Real-time trades
CREATE TABLE realtime_trades (
    id INTEGER PRIMARY KEY,
    symbol TEXT,
    price REAL,
    volume REAL,
    timestamp INTEGER
);
```

#### Options Tables
```sql
-- Option instruments
CREATE TABLE option_instruments (
    id INTEGER PRIMARY KEY,
    symbol TEXT UNIQUE,
    underlying TEXT,
    strike REAL,
    expiry TEXT,
    option_type TEXT
);

-- Option Greeks
CREATE TABLE option_greeks (
    id INTEGER PRIMARY KEY,
    symbol TEXT,
    delta REAL,
    gamma REAL,
    theta REAL,
    vega REAL,
    rho REAL,
    timestamp INTEGER
);
```

#### Portfolio Tables
```sql
-- Positions
CREATE TABLE positions (
    id INTEGER PRIMARY KEY,
    symbol TEXT,
    quantity REAL,
    entry_price REAL,
    current_price REAL,
    realized_pnl REAL,
    unrealized_pnl REAL,
    delta REAL,
    gamma REAL,
    theta REAL,
    vega REAL,
    updated_at INTEGER
);
```

#### Analytics Tables
```sql
-- Volatility events
CREATE TABLE volatility_events (
    id INTEGER PRIMARY KEY,
    symbol TEXT,
    event_type TEXT,
    threshold REAL,
    actual_value REAL,
    timestamp INTEGER
);

-- Performance metrics
CREATE TABLE performance_metrics (
    id INTEGER PRIMARY KEY,
    metric_name TEXT,
    value REAL,
    timestamp INTEGER
);
```

## Real-time Communication

### WebSocket Architecture

#### Server Implementation
```python
class WebSocketServer:
    def __init__(self):
        self.clients = set()
        self.subscriptions = defaultdict(set)
    
    async def handle_client(self, websocket):
        # Connection management
        # Message routing
        # Subscription handling
    
    async def broadcast_event(self, event_type, data):
        # Send to subscribed clients
```

#### Client Implementation
```typescript
class WebSocketManager {
    constructor(url: string) {
        this.connect();
        this.setupReconnection();
    }
    
    subscribe(event: string, callback: Function) {
        // Event subscription
    }
    
    private handleMessage(data: any) {
        // Message processing
    }
}
```

### Message Protocol
```typescript
interface WebSocketMessage {
    type: 'subscribe' | 'unsubscribe' | 'event';
    event?: string;
    data?: any;
    timestamp: number;
}
```

## Security & Authentication

### Current Implementation
- **API Keys**: Environment variable based
- **CORS**: Configured for local development
- **Input Validation**: Pydantic models for request validation
- **SQL Injection Prevention**: Parameterized queries

### Recommended Enhancements
1. **JWT Authentication**: For user sessions
2. **Rate Limiting**: Prevent API abuse
3. **HTTPS**: SSL/TLS encryption
4. **API Key Management**: Secure storage and rotation
5. **Audit Logging**: Track all sensitive operations

## Deployment Architecture

### Docker Configuration

#### Dockerfile
```dockerfile
FROM python:3.11-slim
# Multi-stage build for optimization
# Supervisor for process management
# Health checks for reliability
```

#### Docker Compose
```yaml
services:
  volatility-filter:
    build: .
    ports:
      - "8000:8000"  # API
      - "8765:8765"  # WebSocket
      - "3001:3001"  # Frontend
    volumes:
      - ./data:/app/data
    environment:
      - DB_PATH=/app/data/volatility_filter.db
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
```

### Production Recommendations
1. **Load Balancing**: Nginx for traffic distribution
2. **Database**: Migrate to PostgreSQL for production
3. **Caching**: Redis for session and data caching
4. **Monitoring**: Prometheus + Grafana
5. **Logging**: ELK stack (Elasticsearch, Logstash, Kibana)
6. **CI/CD**: GitHub Actions or GitLab CI

## Development Guidelines

### Code Structure
```
project-root/
├── src/volatility_filter/    # Core Python modules
├── volatility-web/           # Next.js frontend
├── scripts/                  # Utility scripts
├── tests/                    # Test suite
├── docker/                   # Docker configs
└── docs/                     # Documentation
```

### Development Workflow
1. **Local Development**: Use Docker Compose
2. **Testing**: Run pytest and Jest test suites
3. **Code Quality**: Black, isort, ESLint, Prettier
4. **Version Control**: Git with feature branches
5. **Documentation**: Update as you code

### Best Practices
1. **Type Safety**: Use TypeScript and Python type hints
2. **Error Handling**: Comprehensive error boundaries
3. **Logging**: Structured logging with appropriate levels
4. **Testing**: Unit, integration, and E2E tests
5. **Performance**: Profile and optimize critical paths

### API Versioning
- Use URL versioning: `/api/v1/...`
- Maintain backward compatibility
- Document breaking changes
- Deprecation notices

### Database Migrations
- Track schema changes in version control
- Use migration scripts for updates
- Test migrations in staging environment
- Backup before production migrations

## Performance Considerations

### Backend Optimization
1. **Async Operations**: Leverage FastAPI's async capabilities
2. **Connection Pooling**: Reuse database connections
3. **Caching**: Cache expensive calculations
4. **Batch Processing**: Group similar operations
5. **Query Optimization**: Use indexes and explain plans

### Frontend Optimization
1. **Code Splitting**: Dynamic imports for large components
2. **Image Optimization**: Next.js Image component
3. **Bundle Size**: Analyze and minimize
4. **Caching Strategy**: React Query configuration
5. **WebSocket Efficiency**: Throttle updates when needed

## Monitoring & Observability

### Metrics to Track
1. **API Response Times**: P50, P95, P99 latencies
2. **WebSocket Connections**: Active connections, disconnects
3. **Database Performance**: Query times, connection pool
4. **Error Rates**: 4xx, 5xx responses
5. **Business Metrics**: Active users, trades processed

### Health Checks
```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": check_database(),
        "websocket": check_websocket_server(),
        "external_apis": check_external_services()
    }
```

## Future Enhancements

### Planned Features
1. **Multi-Exchange Support**: Beyond Deribit
2. **Advanced Analytics**: ML-based predictions
3. **Mobile App**: React Native implementation
4. **Backtesting Engine**: Historical strategy testing
5. **Risk Management**: VaR, stress testing

### Scalability Roadmap
1. **Microservices**: Split monolith into services
2. **Message Queue**: RabbitMQ or Kafka
3. **Distributed Cache**: Redis Cluster
4. **Database Sharding**: For large datasets
5. **Kubernetes**: Container orchestration

## Conclusion

The Volatility Filter architecture is designed for reliability, performance, and extensibility. The modular design allows for easy enhancement and scaling while maintaining code quality and developer experience.

For questions or contributions, please refer to the project README and contribution guidelines.