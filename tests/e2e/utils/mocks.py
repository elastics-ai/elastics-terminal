from unittest.mock import Mock, AsyncMock
from typing import List, Dict, Any
import json

class MockAnthropicClient:
    """Mock Anthropic client for testing."""
    
    def __init__(self):
        self.messages = AsyncMock()
        self.responses = []
        self.call_count = 0
        
    def add_response(self, text: str):
        """Add a response to the queue."""
        self.responses.append(text)
    
    def create_mock_response(self, text: str):
        """Create a mock response object."""
        mock_response = Mock()
        mock_response.content = [Mock(text=text)]
        return mock_response
    
    async def create_completion(self, messages: List[Dict[str, str]], **kwargs):
        """Mock completion creation."""
        self.call_count += 1
        
        # Use queued response or default
        if self.responses:
            response_text = self.responses.pop(0)
        else:
            # Generate context-aware response based on the last user message
            last_message = messages[-1]["content"] if messages else ""
            
            if "portfolio" in last_message.lower():
                response_text = """Based on your portfolio data:
                - Total Value: $56,000
                - Total P&L: $3,500 (6.25%)
                - Best Performer: ETH-USD (+6.67%)
                - Positions: 5 active positions across crypto and stocks"""
            elif "volatility" in last_message.lower():
                response_text = """Current volatility analysis:
                - BTC-USD: 0.85 (above threshold of 0.80)
                - ETH-USD: 0.72 (within normal range)
                - Alert: Increased volatility detected in BTC market"""
            elif "sql" in last_message.lower() or "query" in last_message.lower():
                response_text = """Here's the SQL query to get your portfolio summary:
                ```sql
                SELECT symbol, quantity, entry_price, current_price, 
                       (current_price - entry_price) * quantity as pnl,
                       ((current_price - entry_price) / entry_price * 100) as pnl_pct
                FROM positions
                ORDER BY pnl DESC
                ```"""
            else:
                response_text = "I can help you analyze your portfolio, monitor volatility, and execute SQL queries. What would you like to know?"
        
        return self.create_mock_response(response_text)

class MockNewsAPI:
    """Mock NewsAPI client for testing."""
    
    def __init__(self):
        self.articles = [
            {
                "title": "Bitcoin Surges Past $48,000 Amid Institutional Interest",
                "description": "Bitcoin price continues to climb as major institutions increase their holdings.",
                "url": "https://example.com/btc-surge",
                "publishedAt": "2025-01-20T10:00:00Z",
                "source": {"name": "Crypto News"}
            },
            {
                "title": "Ethereum Network Upgrade Scheduled for Next Month",
                "description": "The upcoming Ethereum upgrade promises improved scalability and lower fees.",
                "url": "https://example.com/eth-upgrade",
                "publishedAt": "2025-01-20T08:00:00Z",
                "source": {"name": "Tech Daily"}
            },
            {
                "title": "Stock Market Reaches New All-Time High",
                "description": "Major indices close at record levels as earnings season begins.",
                "url": "https://example.com/market-high",
                "publishedAt": "2025-01-20T06:00:00Z",
                "source": {"name": "Financial Times"}
            }
        ]
    
    async def get_top_headlines(self, category: str = "business", page_size: int = 10):
        """Mock getting top headlines."""
        return {
            "status": "ok",
            "totalResults": len(self.articles),
            "articles": self.articles[:page_size]
        }

class MockWebSocketBroadcaster:
    """Mock WebSocket broadcaster for testing."""
    
    def __init__(self):
        self.events = []
        self.subscribers = {}
    
    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Mock broadcasting an event."""
        event = {
            "type": event_type,
            "data": data,
            "timestamp": "2025-01-20T12:00:00Z"
        }
        self.events.append(event)
        
        # Simulate sending to subscribers
        if event_type in self.subscribers:
            for callback in self.subscribers[event_type]:
                await callback(event)
    
    def subscribe(self, event_type: str, callback):
        """Subscribe to an event type."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)
    
    def get_sample_events(self) -> List[Dict[str, Any]]:
        """Get sample events for different types."""
        return [
            {
                "type": "threshold_breach",
                "data": {
                    "symbol": "BTC-USD",
                    "current_volatility": 0.85,
                    "threshold": 0.80,
                    "breach_type": "above"
                }
            },
            {
                "type": "option_trade",
                "data": {
                    "symbol": "BTC-USD",
                    "strike": 50000,
                    "expiry": "2025-02-20",
                    "type": "call",
                    "quantity": 10,
                    "price": 2500
                }
            },
            {
                "type": "statistics_update",
                "data": {
                    "total_volume": 1500000,
                    "total_trades": 342,
                    "active_positions": 5,
                    "total_pnl": 3500
                }
            }
        ]