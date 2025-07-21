#!/bin/bash

# Test Pydantic models in Docker container

echo "Testing Pydantic models implementation..."

docker-compose -f docker/docker-compose.yml exec -T api python3 -c '
import sys
sys.path.insert(0, "/app")

from src.volatility_filter.models.portfolio import Position, PortfolioSummary, InstrumentType
from src.volatility_filter.models.chat import ChatMessage
from src.volatility_filter.models.market import PolymarketMarket
from datetime import datetime

print("=== Testing Pydantic Models ===")

# Test Position with alias
pos = Position(
    symbol="BTC-USD",
    type="spot",
    quantity=1.5,
    entry_price=45000,
    current_price=50000,
    value=75000,
    pnl=7500,
    pnl_percentage=16.67
)
print(f"✓ Position created: {pos.instrument}")

# Test ChatMessage
msg = ChatMessage(content="Test message", session_id="test123")
print(f"✓ ChatMessage created: {msg.content}")

# Test PolymarketMarket
market = PolymarketMarket(
    id="test-1",
    question="Will BTC reach $100k?",
    yes_percentage=65.5,
    no_percentage=34.5,
    volume=1000000
)
print(f"✓ PolymarketMarket created: {market.question}")

print("\n✅ All model tests passed!")
'