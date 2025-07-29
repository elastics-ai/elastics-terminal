# Elastics Terminal

A comprehensive portfolio management and options trading terminal for cryptocurrency derivatives. Built with Next.js, FastAPI, and real-time WebSocket connections to major exchanges.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/elastics-ai/elastics-terminal.git
cd elastics-terminal

# Start all services with Docker
cd docker
docker-compose up -d

# Access the application
open http://localhost:3001
```

## Features

### 🏗️ Portfolio Management
- **Real-time portfolio tracking** with P&L calculations
- **Multi-exchange support** (Deribit, Kalshi, Polymarket)
- **Advanced risk metrics** with Greeks monitoring
- **Automated rebalancing** via Bookkeeper module

### 📊 Market Analysis
- **Live volatility surfaces** with 3D visualization
- **Options chain analysis** with real-time pricing
- **Market overview** with cross-asset monitoring
- **Volatility filtering** with customizable thresholds

### 🤖 AI-Powered Tools
- **Claude AI integration** for portfolio analysis
- **Agent Builder** with flow-based programming
- **Intelligent suggestions** for optimization
- **Natural language queries** for data exploration

### 🔧 Trading Tools
- **Contract screener** with advanced filtering
- **Bookkeeper optimizer** for portfolio rebalancing  
- **Risk management** with automated alerts
- **Data library** for custom analysis modules

### 📈 Visualization & Monitoring
- **Interactive charts** with Chart.js and Plotly
- **Real-time dashboards** with WebSocket updates
- **Error tracking** via GlitchTip integration
- **Performance monitoring** with comprehensive metrics

## Architecture

```
├── volatility-web/          # Next.js frontend application
│   ├── app/                 # App router pages and layouts
│   ├── components/          # Reusable UI components
│   ├── lib/                 # Utility functions and hooks
│   └── public/              # Static assets
├── src/                     # Python backend services
│   └── volatility_filter/   # Core volatility engine
│       ├── api/             # FastAPI endpoints
│       ├── services/        # Business logic
│       └── websocket/       # Real-time data server
├── docker/                  # Container orchestration
│   ├── docker-compose.yml   # Service definitions
│   └── Dockerfile.webapp    # Multi-stage build
└── elastics-options/        # Options pricing module
```

## Services

| Service | URL | Description |
|---------|-----|-------------|
| **Web App** | http://localhost:3001 | Next.js frontend dashboard |
| **API Server** | http://localhost:7000 | FastAPI REST endpoints |
| **WebSocket** | ws://localhost:8765 | Real-time data streaming |
| **GlitchTip** | http://localhost:8080 | Error tracking & monitoring |

## Technology Stack

### Frontend
- **Next.js 15** with TypeScript and App Router
- **Tailwind CSS** for styling with custom design system
- **Radix UI** components for accessibility
- **Chart.js & Plotly** for data visualization
- **WebSocket client** for real-time updates

### Backend  
- **FastAPI** with async/await support
- **SQLite** database with custom migrations
- **WebSocket server** for real-time broadcasting
- **Pydantic** models for data validation
- **Anthropic Claude** API integration

### Infrastructure
- **Docker Compose** for service orchestration
- **Multi-stage builds** for optimized containers
- **Volume persistence** for database storage
- **Health checks** and service monitoring
- **GlitchTip** for error tracking and performance monitoring

## Development

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)

### Local Development Setup

```bash
# Install frontend dependencies
cd volatility-web
npm install

# Install Python dependencies
pip install -r requirements.txt

# Start development servers
npm run dev          # Frontend on :3000
python api_server.py # Backend on :8000
```

### Environment Variables

Create `.env` files for configuration:

```bash
# docker/.env
GLITCHTIP_DSN=your_glitchtip_dsn
ANTHROPIC_API_KEY=your_claude_api_key
DATABASE_URL=sqlite:///data/elastics_terminal.db
```

## API Documentation

### REST Endpoints
- `GET /api/health` - Health check
- `GET /api/portfolio/overview` - Portfolio summary
- `POST /api/bookkeeper/optimize` - Portfolio optimization
- `GET /api/data/sources` - Available data sources

### WebSocket Events
- `trade` - Live trade updates
- `volatility_estimate` - Volatility calculations
- `option_greeks_update` - Greeks monitoring
- `portfolio_update` - Portfolio changes

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Contact: support@elastics.ai
