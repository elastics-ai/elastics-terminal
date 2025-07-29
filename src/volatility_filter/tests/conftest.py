"""
Pytest configuration and fixtures for volatility filter tests
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone
import json
from typing import Dict, Any, List

@pytest.fixture
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_websocket():
    """Mock WebSocket connection for testing"""
    ws = AsyncMock()
    ws.send = AsyncMock()
    ws.recv = AsyncMock()
    ws.close = AsyncMock()
    ws.closed = False
    return ws

@pytest.fixture
def sample_portfolio_data():
    """Sample portfolio data for testing"""
    return {
        "total_value": 2540300,
        "cumulative_pnl": 91024.18,
        "cumulative_return": 0.60,
        "annual_return": 0.14,
        "max_drawdown": -0.26,
        "annual_volatility": 0.38,
        "positions": [
            {
                "symbol": "BTC",
                "value": 42000,
                "pnl": 5200,
                "return": 0.14
            },
            {
                "symbol": "ETH", 
                "value": 35250,
                "pnl": -320,
                "return": -0.01
            }
        ]
    }

@pytest.fixture
def sample_market_data():
    """Sample market data for testing"""
    return {
        "BTC": {
            "price": 42000,
            "volume": 1234567,
            "change_24h": 0.05,
            "implied_volatility": 0.65
        },
        "ETH": {
            "price": 2350,
            "volume": 987654,
            "change_24h": -0.02,
            "implied_volatility": 0.72
        }
    }

@pytest.fixture
def sample_greeks():
    """Sample Greeks data for testing"""
    return {
        "delta": 0.54,
        "gamma": 0.03,
        "vega": 45.2,
        "theta": -12.3,
        "rho": 18.4
    }

@pytest.fixture
def mock_exchange_client():
    """Mock exchange client for testing"""
    client = MagicMock()
    client.get_portfolio = AsyncMock()
    client.get_market_data = AsyncMock()
    client.place_order = AsyncMock()
    client.get_order_status = AsyncMock()
    client.cancel_order = AsyncMock()
    return client

@pytest.fixture
def sample_volatility_surface():
    """Sample volatility surface data for testing"""
    return {
        "strikes": [0.8, 0.9, 1.0, 1.1, 1.2],
        "expiries": [7, 14, 30, 60, 90],
        "surface": [
            [0.72, 0.68, 0.65, 0.63, 0.62],
            [0.70, 0.66, 0.63, 0.61, 0.60],
            [0.68, 0.64, 0.61, 0.59, 0.58],
            [0.67, 0.63, 0.60, 0.58, 0.57],
            [0.66, 0.62, 0.59, 0.57, 0.56]
        ]
    }

@pytest.fixture
def sample_agent_flow():
    """Sample agent flow configuration for testing"""
    return {
        "nodes": [
            {
                "id": "data_source_1",
                "type": "data_source",
                "config": {"exchange": "deribit", "symbol": "BTC"}
            },
            {
                "id": "function_1",
                "type": "function",
                "config": {"name": "implied_volatility"}
            },
            {
                "id": "strategy_1",
                "type": "strategy",
                "config": {"name": "market_making"}
            }
        ],
        "edges": [
            {"source": "data_source_1", "target": "function_1"},
            {"source": "function_1", "target": "strategy_1"}
        ]
    }

@pytest.fixture
def db_session():
    """Mock database session for testing"""
    session = MagicMock()
    session.query = MagicMock()
    session.add = MagicMock()
    session.commit = MagicMock()
    session.rollback = MagicMock()
    session.close = MagicMock()
    return session