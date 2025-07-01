# Deribit Volatility Filter

A real-time volatility filter for BTC-PERPETUAL trades on Deribit using AR(1) process with WebSocket broadcasting and SQLite storage.

## Features

- **Real-time AR(1) Volatility Filtering**: Monitors BTC-PERPETUAL trades and detects volatility breaches
- **Hyperparameter Optimization**: Automatic threshold tuning using historical data
- **WebSocket Broadcasting**: Real-time event notifications for external applications
- **Database Storage**: SQLite storage for trades, events, and performance metrics
- **Performance Reporting**: HTML reports with detailed analytics
- **Production Ready**: Modular design, comprehensive logging, and Docker support

## Quick Start

### Installation

```bash
git clone https://github.com/yourusername/deribit-volatility-filter.git
cd deribit-volatility-filter
pip install -r requirements.txt
```

### Basic Usage

```bash
# Run with default settings
python scripts/run_filter.py

# Run with optimization
python scripts/run_filter.py --optimize

# Run backtest
python scripts/backtest.py --days 14
```

### WebSocket Client

```bash
# In another terminal
python examples/websocket_client.py
```

## Documentation

- [API Documentation](docs/API.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Examples](docs/EXAMPLES.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## License

MIT License - see [LICENSE](LICENSE) file for details.