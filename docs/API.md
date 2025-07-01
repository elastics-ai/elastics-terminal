# API Documentation

## WebSocket API

The volatility filter provides a WebSocket server for real-time event broadcasting.

### Connection

Connect to `ws://localhost:8765` (default) or configured address.

### Message Types

#### Subscribe to Events
```json
{
  "type": "subscribe",
  "events": ["threshold_breach", "statistics_update"]
}
```

#### Threshold Breach Event
```json
{
  "type": "threshold_breach",
  "timestamp": 1234567890,
  "data": {
    "timestamp": 1234567890,
    "datetime": "2025-01-01T12:00:00",
    "price": 95000.50,
    "amount": 0.5,
    "direction": "buy",
    "volatility": 0.0234,
    "threshold": 0.015,
    "excess_ratio": 1.56
  }
}
```

#### Statistics Update
```json
{
  "type": "statistics_update",
  "timestamp": 1234567890,
  "data": {
    "total_trades": 1000,
    "filtered_trades": 23,
    "filter_ratio": 0.023,
    "current_volatility": 0.0156
  }
}
```

### Client Examples

See [examples/websocket_client.py](../examples/websocket_client.py) for Python implementation.
See [examples/javascript_client.html](../examples/javascript_client.html) for JavaScript implementation.