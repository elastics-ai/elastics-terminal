# Option Chain Integration Guide

This document describes the option chain integration features added to the volatility filter system.

## Overview

The option chain integration extends the volatility filter to monitor and analyze Deribit options data, including:

- Real-time option trades and order book data
- Greeks calculation and monitoring
- Implied volatility (IV) anomaly detection
- IV surface tracking
- Option-specific volatility events

## Architecture

### New Components

1. **Option Data Fetcher** (`option_data_fetcher.py`)
   - Fetches option instruments from Deribit REST API
   - Retrieves option chains, order books, and trades
   - Calculates IV surface data
   - Handles Greeks data fetching

2. **Option Filter** (`option_filter.py`)
   - Real-time WebSocket monitoring for options
   - IV anomaly detection using statistical methods
   - IV change tracking
   - Greeks update management
   - Integration with main broadcast server

3. **Database Schema Extensions**
   - `option_instruments`: Option contract metadata
   - `option_chains`: Full chain snapshots
   - `option_trades`: Individual option trades
   - `option_greeks`: Greeks time series
   - `option_volatility_events`: IV anomalies and changes

### WebSocket Event Types

New WebSocket events for option data:

- `option_chain_update`: Full option chain updates
- `option_trade`: Individual option trades
- `option_greeks_update`: Greeks calculations
- `iv_surface_update`: Implied volatility surface
- `option_volatility_event`: IV anomalies and significant changes

## Configuration

### Environment Variables

```bash
# Enable option monitoring
ENABLE_OPTIONS=true

# Option-specific settings
OPTION_CURRENCY=BTC              # Currency to monitor (BTC, ETH)
OPTION_EXPIRY_DAYS=60           # Days ahead to track expiries
OPTION_STRIKE_RANGE=0.25        # Strike range (0.25 = ±25% from spot)
OPTION_IV_THRESHOLD=2.0         # IV anomaly threshold (std devs)
OPTION_IV_CHANGE_THRESHOLD=0.1  # IV change threshold (0.1 = 10%)
OPTION_GREEKS_INTERVAL=60       # Greeks update interval (seconds)
OPTION_CHAIN_INTERVAL=300       # Full chain update interval (seconds)
```

### Command Line Arguments

```bash
# Run combined filter with options enabled
python scripts/run_combined_filter.py \
    --enable-options \
    --option-currency BTC \
    --option-expiry-days 30 \
    --option-strike-range 0.20 \
    --option-iv-threshold 2.5
```

## Usage Examples

### 1. Basic Option Chain Fetching

```python
from src.volatility_filter.option_data_fetcher import OptionDataFetcher

fetcher = OptionDataFetcher()

# Fetch option instruments
instruments = fetcher.fetch_option_instruments("BTC")

# Get order book with Greeks
order_book = fetcher.fetch_option_order_book("BTC-29DEC23-45000-C")
greeks = order_book['greeks']
print(f"Delta: {greeks['delta']}, IV: {order_book['mark_iv']}")
```

### 2. Running Option Filter Standalone

```python
from src.volatility_filter.option_filter import OptionVolatilityFilter

# Create and start option filter
option_filter = OptionVolatilityFilter(
    currency="BTC",
    expiry_days_ahead=30,
    strike_range_pct=0.20,
    iv_threshold_std=2.0
)

option_filter.start()
```

### 3. Combined Filter with Options

```bash
# Run both perpetual and option filters together
python scripts/run_combined_filter.py --enable-options --optimize
```

### 4. WebSocket Client for Option Events

```python
import asyncio
import websockets
import json

async def listen_option_events():
    async with websockets.connect('ws://localhost:8765') as ws:
        # Subscribe to option events
        await ws.send(json.dumps({
            'type': 'subscribe',
            'events': ['option_volatility_event', 'iv_surface_update']
        }))
        
        async for message in ws:
            data = json.loads(message)
            if data['type'] == 'option_volatility_event':
                event = data['data']
                print(f"IV Event: {event['instrument_name']} - {event['event_type']}")
```

## Database Queries

### Get Active Options

```python
from src.volatility_filter.database import DatabaseManager

db = DatabaseManager()

# Get all active BTC options
options = db.get_active_option_instruments("BTC")

# Get option chain for specific expiry
chain = db.get_option_chain_by_expiry("BTC", "2024-01-26")

# Get IV surface data
iv_surface = db.get_iv_surface_data("BTC")
```

### Query Option Events

```python
# Get recent option volatility events
events = db.get_option_volatility_events(
    event_type='iv_anomaly',
    start_time=timestamp_24h_ago
)

# Get option trades
trades = db.get_recent_option_trades(
    instrument_name="BTC-26JAN24-45000-C",
    limit=100
)
```

## Event Detection

### IV Anomaly Detection

The system detects IV anomalies using statistical methods:

1. Maintains rolling history of IV for each instrument
2. Calculates mean and standard deviation
3. Triggers event when IV exceeds threshold (default: 2 std devs)

### IV Change Detection

Monitors significant IV changes:

1. Tracks IV changes between updates
2. Triggers event when change exceeds threshold (default: 10%)
3. Includes Greeks in event data for context

## Performance Considerations

### Subscription Limits

- Limit WebSocket subscriptions to avoid overwhelming the connection
- Default: Track options within ±25% of spot, expiring in next 60 days
- Automatically samples instruments if too many match criteria

### Update Intervals

- Greeks updates: Every 60 seconds (configurable)
- Full chain snapshots: Every 5 minutes (configurable)
- Trade monitoring: Real-time for subscribed instruments

### Database Optimization

- Proper indexing on instrument names, timestamps, and expiry dates
- Periodic cleanup of old data
- Efficient queries using latest values for Greeks

## Troubleshooting

### Common Issues

1. **Too many instruments tracked**
   - Reduce `OPTION_STRIKE_RANGE` or `OPTION_EXPIRY_DAYS`
   - System automatically limits subscriptions

2. **Missing Greeks data**
   - Some illiquid options may not have Greeks
   - Check if instrument is active

3. **Database performance**
   - Run cleanup regularly: `db.cleanup_old_data(days_to_keep=30)`
   - Consider archiving old option data

### Debug Mode

Enable debug logging to see detailed information:

```bash
python scripts/run_combined_filter.py --enable-options --debug
```

## Future Enhancements

Potential improvements for the option integration:

1. **Advanced Analytics**
   - Volatility smile analysis
   - Term structure monitoring
   - Put-call parity checks

2. **Risk Metrics**
   - Portfolio Greeks aggregation
   - Scenario analysis
   - Cross-asset correlations

3. **Machine Learning**
   - IV prediction models
   - Anomaly detection improvements
   - Pattern recognition

4. **Visualization**
   - Real-time IV surface plots
   - Greeks heatmaps
   - Historical IV charts