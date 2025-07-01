# Deribit Volatility Filter

A real-time volatility filter for BTC-PERPETUAL trades on Deribit using AR(1) process with WebSocket broadcasting and SQLite storage.


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
