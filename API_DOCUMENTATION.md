# Volatility Filter API Documentation

## Overview

The Volatility Filter API provides programmatic access to portfolio data, volatility analytics, and real-time market information. The API is RESTful and returns JSON responses.

## Base URLs

- **REST API**: `http://localhost:8000/api`
- **WebSocket**: `ws://localhost:8765`

## Authentication

Currently, the API does not require authentication for local development. In production, implement API key or JWT authentication.

## REST API Endpoints

### Portfolio Management

#### Get Portfolio Summary
```http
GET /api/portfolio/summary
```

Returns an overview of the portfolio including total value, P&L, and performance metrics.

**Response:**
```json
{
  "total_value": 2540300.50,
  "total_pnl": 1524180.25,
  "total_pnl_percentage": 150.23,
  "positions_count": 12,
  "total_delta": 45.67,
  "total_gamma": 2.34,
  "total_theta": -123.45,
  "total_vega": 567.89
}
```

#### Get Portfolio Positions
```http
GET /api/portfolio/positions
```

Returns all current positions with their Greeks and P&L.

**Response:**
```json
{
  "positions": [
    {
      "id": 1,
      "symbol": "BTC-29MAR24-50000-C",
      "quantity": 10,
      "entry_price": 1500.0,
      "current_price": 2000.0,
      "realized_pnl": 0,
      "unrealized_pnl": 5000.0,
      "delta": 0.65,
      "gamma": 0.0002,
      "theta": -45.5,
      "vega": 125.3,
      "updated_at": 1710123456
    }
  ]
}
```

#### Update Position
```http
PUT /api/portfolio/positions/{position_id}
```

Updates an existing position.

**Request Body:**
```json
{
  "quantity": 15,
  "current_price": 2100.0
}
```

### Volatility Analytics

#### Get Volatility Alerts
```http
GET /api/volatility/alerts
```

Returns active volatility alerts and threshold breaches.

**Query Parameters:**
- `symbol` (optional): Filter by symbol
- `limit` (optional): Number of alerts to return (default: 50)

**Response:**
```json
{
  "alerts": [
    {
      "id": 1,
      "symbol": "BTC",
      "event_type": "threshold_breach",
      "threshold": 80.0,
      "actual_value": 85.5,
      "timestamp": 1710123456,
      "message": "BTC implied volatility exceeded threshold"
    }
  ]
}
```

#### Get Latest Volatility Surface
```http
GET /api/volatility/surface/latest
```

Returns the latest fitted volatility surface data.

**Response:**
```json
{
  "surface": {
    "symbol": "BTC",
    "timestamp": 1710123456,
    "expirations": ["2024-03-29", "2024-04-26"],
    "strikes": [40000, 45000, 50000, 55000, 60000],
    "implied_vols": [
      [0.65, 0.62, 0.60, 0.63, 0.68],
      [0.58, 0.55, 0.53, 0.56, 0.61]
    ],
    "parameters": {
      "atm_vol": 0.60,
      "skew": -0.15,
      "smile": 0.05
    }
  }
}
```

#### Set Volatility Threshold
```http
POST /api/volatility/threshold
```

Sets a new volatility threshold for alerts.

**Request Body:**
```json
{
  "symbol": "BTC",
  "threshold": 85.0,
  "alert_type": "breach_above"
}
```

### Market Data

#### Get Real-time Stats
```http
GET /api/stats/realtime
```

Returns real-time market statistics.

**Response:**
```json
{
  "btc": {
    "price": 67500.50,
    "24h_change": 2.45,
    "volume": 1234567890,
    "implied_vol": 62.5,
    "realized_vol": 58.3
  },
  "eth": {
    "price": 3500.25,
    "24h_change": 3.12,
    "volume": 987654321,
    "implied_vol": 68.2,
    "realized_vol": 64.7
  }
}
```

### Polymarket Integration

#### Get Polymarket Markets
```http
GET /api/polymarket/markets
```

Returns available prediction markets.

**Query Parameters:**
- `active` (optional): Filter active markets only
- `tag` (optional): Filter by tag (e.g., "crypto", "politics")

**Response:**
```json
{
  "markets": [
    {
      "id": "0x123...",
      "question": "Will BTC reach $100k by end of 2024?",
      "yes_price": 0.35,
      "no_price": 0.65,
      "volume": 1500000,
      "liquidity": 500000,
      "end_date": "2024-12-31",
      "tags": ["crypto", "bitcoin"]
    }
  ]
}
```

### AI Chat

#### Send Chat Message
```http
POST /api/chat/send
```

Sends a message to the AI assistant.

**Request Body:**
```json
{
  "message": "What's the current volatility regime for BTC?",
  "context": {
    "include_portfolio": true,
    "include_market_data": true
  }
}
```

**Response:**
```json
{
  "response": "Based on current market data, BTC is in a moderate volatility regime...",
  "suggestions": [
    "How do current levels compare to historical averages?",
    "What are the implications for my options positions?"
  ],
  "metadata": {
    "model": "claude-3.5-sonnet",
    "tokens_used": 245
  }
}
```

#### Get Chat Suggestions
```http
GET /api/chat/suggestions
```

Returns contextual chat suggestions.

**Response:**
```json
{
  "suggestions": [
    "Analyze my portfolio risk",
    "Show me volatility term structure",
    "What's the options skew telling us?",
    "Compare BTC and ETH volatility"
  ]
}
```

## WebSocket API

### Connection

Connect to the WebSocket server:
```javascript
const ws = new WebSocket('ws://localhost:8765');
```

### Message Format

All WebSocket messages follow this format:
```json
{
  "type": "subscribe|unsubscribe|event",
  "event": "event_name",
  "data": {},
  "timestamp": 1710123456
}
```

### Subscription Events

#### Subscribe to Events
```json
{
  "type": "subscribe",
  "events": ["threshold_breach", "trade", "volatility_estimate"]
}
```

#### Unsubscribe from Events
```json
{
  "type": "unsubscribe",
  "events": ["trade"]
}
```

### Event Types

#### Threshold Breach
Triggered when volatility exceeds configured thresholds.
```json
{
  "type": "event",
  "event": "threshold_breach",
  "data": {
    "symbol": "BTC",
    "threshold": 80.0,
    "actual": 85.5,
    "direction": "above"
  },
  "timestamp": 1710123456
}
```

#### New Trade
Triggered when a new trade is executed.
```json
{
  "type": "event",
  "event": "trade",
  "data": {
    "symbol": "BTC-29MAR24-50000-C",
    "price": 2100.0,
    "quantity": 5,
    "side": "buy",
    "timestamp": 1710123456
  }
}
```

#### Volatility Estimate Update
Periodic updates of volatility estimates.
```json
{
  "type": "event",
  "event": "volatility_estimate",
  "data": {
    "symbol": "BTC",
    "realized_vol": 58.5,
    "implied_vol": 62.3,
    "forecast_vol": 60.1,
    "confidence_interval": [55.2, 65.0]
  }
}
```

#### Option Data Update
Real-time option chain updates.
```json
{
  "type": "event",
  "event": "option_data",
  "data": {
    "symbol": "BTC-29MAR24-50000-C",
    "bid": 2000,
    "ask": 2010,
    "last": 2005,
    "volume": 150,
    "open_interest": 1200,
    "greeks": {
      "delta": 0.65,
      "gamma": 0.0002,
      "theta": -45.5,
      "vega": 125.3
    }
  }
}
```

#### Portfolio Update
Updates to portfolio positions and P&L.
```json
{
  "type": "event",
  "event": "portfolio_update",
  "data": {
    "total_value": 2550000,
    "total_pnl": 1530000,
    "positions_updated": [
      {
        "symbol": "BTC-29MAR24-50000-C",
        "unrealized_pnl": 5500.0,
        "current_price": 2100.0
      }
    ]
  }
}
```

## Error Responses

The API uses standard HTTP status codes. Error responses include:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "symbol",
      "issue": "Symbol format invalid"
    }
  }
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request parameters
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Rate Limiting

- **REST API**: 100 requests per minute per IP
- **WebSocket**: 50 messages per minute per connection

## Best Practices

1. **Connection Management**
   - Implement reconnection logic for WebSocket
   - Use connection pooling for REST requests
   - Handle network interruptions gracefully

2. **Data Handling**
   - Cache frequently accessed data
   - Use pagination for large datasets
   - Implement proper error handling

3. **Performance**
   - Batch multiple operations when possible
   - Use WebSocket for real-time data
   - Minimize payload sizes

4. **Security**
   - Always use HTTPS in production
   - Validate all input data
   - Implement proper authentication
   - Never expose sensitive data

## SDK Examples

### Python Client
```python
import aiohttp
import asyncio

class VolatilityFilterClient:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        
    async def get_portfolio_summary(self):
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/api/portfolio/summary") as resp:
                return await resp.json()
    
    async def subscribe_to_updates(self):
        session = aiohttp.ClientSession()
        ws = await session.ws_connect("ws://localhost:8765")
        
        # Subscribe to events
        await ws.send_json({
            "type": "subscribe",
            "events": ["volatility_estimate", "portfolio_update"]
        })
        
        # Listen for updates
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                data = msg.json()
                yield data
```

### JavaScript/TypeScript Client
```typescript
class VolatilityFilterClient {
  private baseUrl: string;
  private ws: WebSocket | null = null;

  constructor(baseUrl = "http://localhost:8000") {
    this.baseUrl = baseUrl;
  }

  async getPortfolioSummary() {
    const response = await fetch(`${this.baseUrl}/api/portfolio/summary`);
    return response.json();
  }

  connectWebSocket(onMessage: (data: any) => void) {
    this.ws = new WebSocket("ws://localhost:8765");
    
    this.ws.onopen = () => {
      // Subscribe to events
      this.ws?.send(JSON.stringify({
        type: "subscribe",
        events: ["volatility_estimate", "portfolio_update"]
      }));
    };
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }
}
```

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Portfolio management endpoints
- Volatility analytics
- WebSocket real-time updates
- AI chat integration
- Polymarket integration

### Planned Features (v2.0.0)
- Authentication system
- Advanced filtering options
- Historical data endpoints
- Backtesting API
- Risk analytics endpoints
- Multi-exchange support