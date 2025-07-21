#!/usr/bin/env python3
"""Simple test for Pydantic models without full module imports."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

# Import only the models module, not the full volatility_filter
from src.volatility_filter.models.portfolio import Position, PortfolioSummary, InstrumentType
from src.volatility_filter.models.chat import ChatMessage
from src.volatility_filter.models.market import PolymarketMarket
from src.volatility_filter.models.volatility import VolatilityAlert
from src.volatility_filter.models.sql import SQLModule
from datetime import datetime


def test_portfolio_models():
    """Test portfolio models."""
    print("\n=== Testing Portfolio Models ===")
    
    # Test Position model with alias
    position_data = {
        "symbol": "BTC-USD",  # Using alias
        "type": "spot",
        "quantity": 1.5,
        "entry_price": 45000,
        "current_price": 50000,
        "value": 75000,
        "pnl": 7500,
        "pnl_percentage": 16.67,
        "delta": 1.0
    }
    
    position = Position(**position_data)
    print(f"✓ Position created: {position.instrument}")  # Should use instrument internally
    print(f"  JSON output: {position.model_dump_json(indent=2)}")
    
    # Test PortfolioSummary
    summary = PortfolioSummary(
        total_positions=5,
        total_value=100000,
        total_pnl=15000,
        total_pnl_percentage=15.0
    )
    print(f"\n✓ Portfolio Summary created with {summary.total_positions} positions")


def test_chat_models():
    """Test chat models."""
    print("\n\n=== Testing Chat Models ===")
    
    # Test ChatMessage
    message = ChatMessage(
        content="What's my portfolio performance?",
        session_id="test_session_123",
        conversation_id=1
    )
    print(f"✓ Chat Message created: '{message.content[:30]}...'")


def test_market_models():
    """Test market models."""
    print("\n\n=== Testing Market Models ===")
    
    # Test PolymarketMarket
    market = PolymarketMarket(
        id="test-1",
        question="Will BTC reach $100k?",
        yes_percentage=65.5,
        no_percentage=34.5,
        volume=1000000,
        category="Crypto",
        tags=["bitcoin", "price"]
    )
    print(f"✓ Polymarket created: {market.question}")


def test_volatility_models():
    """Test volatility models."""
    print("\n\n=== Testing Volatility Models ===")
    
    # Test VolatilityAlert
    alert = VolatilityAlert(
        timestamp=int(datetime.now().timestamp() * 1000),
        datetime=datetime.now().isoformat(),
        price=50000,
        volatility=0.85,
        threshold=0.80
    )
    print(f"✓ Volatility Alert created: vol={alert.volatility}, threshold={alert.threshold}")


def test_sql_models():
    """Test SQL models."""
    print("\n\n=== Testing SQL Models ===")
    
    # Test SQLModule
    module = SQLModule(
        id=1,
        sql_query="SELECT * FROM positions WHERE is_active = 1",
        query_type="SELECT",
        title="Active Positions",
        created_at=datetime.now()
    )
    print(f"✓ SQL Module created: {module.title}")


def test_validation():
    """Test model validation."""
    print("\n\n=== Testing Validation ===")
    
    try:
        # This should fail - invalid instrument type
        position = Position(
            instrument="BTC-USD",
            type="invalid_type",  # Should fail validation
            quantity=1,
            entry_price=100,
            current_price=100,
            value=100,
            pnl=0,
            pnl_percentage=0
        )
    except Exception as e:
        print(f"✓ Validation error caught correctly: {type(e).__name__}")
    
    # Test with valid enum
    position = Position(
        instrument="BTC-USD",
        type=InstrumentType.OPTION,
        quantity=1,
        entry_price=100,
        current_price=100,
        value=100,
        pnl=0,
        pnl_percentage=0
    )
    print(f"✓ Valid position created with enum: {position.type.value}")


if __name__ == "__main__":
    test_portfolio_models()
    test_chat_models()
    test_market_models()
    test_volatility_models()
    test_sql_models()
    test_validation()
    print("\n✅ All Pydantic model tests completed successfully!")