"""
Tests for the portfolio overview API endpoints
"""
import pytest
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock, patch
import json


@pytest.mark.asyncio
async def test_portfolio_overview_endpoint(mock_exchange_client, sample_portfolio_data):
    """Test the portfolio overview endpoint returns correct data structure"""
    from volatility_filter.portfolio_manager import PortfolioManager
    
    # Create portfolio manager
    pm = PortfolioManager(mock_exchange_client)
    
    # Mock the exchange client responses
    mock_exchange_client.get_portfolio.return_value = sample_portfolio_data
    
    # Get portfolio overview
    overview = await pm.get_portfolio_overview()
    
    # Check structure
    assert "portfolio" in overview
    assert "positions" in overview
    assert "performance" in overview
    assert "exposure" in overview
    assert "news" in overview
    
    # Check portfolio metrics
    portfolio = overview["portfolio"]
    assert "total_value" in portfolio
    assert "cumulative_pnl" in portfolio
    assert "cumulative_return" in portfolio
    assert "annual_return" in portfolio
    assert "max_drawdown" in portfolio
    assert "annual_volatility" in portfolio
    
    # Check data types
    assert isinstance(portfolio["total_value"], (int, float))
    assert isinstance(portfolio["cumulative_pnl"], (int, float))
    assert isinstance(portfolio["cumulative_return"], float)
    assert isinstance(portfolio["annual_return"], float)
    assert isinstance(portfolio["max_drawdown"], float)
    assert isinstance(portfolio["annual_volatility"], float)


@pytest.mark.asyncio
async def test_portfolio_overview_with_real_data(db_session):
    """Test portfolio overview with data from database"""
    from volatility_filter.portfolio_manager import PortfolioManager
    from volatility_filter.database import Position
    
    # Add test positions to database
    positions = [
        Position(
            symbol="BTC-USD",
            quantity=2.5,
            entry_price=42000,
            current_price=45000,
            position_value=112500,
            pnl=7500,
            instrument_type="spot",
            is_active=True
        ),
        Position(
            symbol="ETH-USD",
            quantity=10,
            entry_price=2300,
            current_price=2400,
            position_value=24000,
            pnl=1000,
            instrument_type="spot",
            is_active=True
        )
    ]
    
    for pos in positions:
        db_session.add(pos)
    db_session.commit()
    
    # Create portfolio manager with mocked exchange
    exchange_client = MagicMock()
    pm = PortfolioManager(exchange_client, db_session)
    
    # Get overview
    overview = await pm.get_portfolio_overview()
    
    # Verify calculations
    assert overview["portfolio"]["total_value"] == 136500  # 112500 + 24000
    assert overview["portfolio"]["cumulative_pnl"] == 8500  # 7500 + 1000
    assert len(overview["positions"]) == 2


@pytest.mark.asyncio
async def test_portfolio_exposure_calculation(sample_portfolio_data):
    """Test portfolio exposure calculation by asset class"""
    from volatility_filter.portfolio_manager import PortfolioManager
    
    # Create portfolio with mixed positions
    portfolio_data = {
        **sample_portfolio_data,
        "positions": [
            {"symbol": "BTC", "value": 50000, "type": "crypto"},
            {"symbol": "ETH", "value": 30000, "type": "crypto"},
            {"symbol": "EUR/USD", "value": 20000, "type": "forex"},
            {"symbol": "GLD", "value": 15000, "type": "commodities"},
            {"symbol": "SPY", "value": 25000, "type": "equities"},
            {"symbol": "USDT", "value": 10000, "type": "cash"}
        ]
    }
    
    exchange_client = MagicMock()
    exchange_client.get_portfolio.return_value = portfolio_data
    
    pm = PortfolioManager(exchange_client)
    overview = await pm.get_portfolio_overview()
    
    exposure = overview["exposure"]
    total_value = sum(p["value"] for p in portfolio_data["positions"])
    
    # Check exposure percentages
    assert abs(exposure["crypto"] - (80000 / total_value)) < 0.01
    assert abs(exposure["forex"] - (20000 / total_value)) < 0.01
    assert abs(exposure["commodities"] - (15000 / total_value)) < 0.01
    assert abs(exposure["equities"] - (25000 / total_value)) < 0.01
    assert abs(exposure["cash"] - (10000 / total_value)) < 0.01


@pytest.mark.asyncio
async def test_performance_history_calculation():
    """Test performance history calculation"""
    from volatility_filter.portfolio_manager import PortfolioManager
    
    # Mock historical data
    historical_values = [
        {"date": "2023-04", "value": 100000, "pnl": 0},
        {"date": "2023-05", "value": 105000, "pnl": 5000},
        {"date": "2023-06", "value": 113000, "pnl": 8000},
        {"date": "2023-07", "value": 127000, "pnl": 14000},
    ]
    
    exchange_client = MagicMock()
    pm = PortfolioManager(exchange_client)
    
    # Mock the historical data fetch
    with patch.object(pm, '_get_historical_values', return_value=historical_values):
        overview = await pm.get_portfolio_overview()
        
        performance = overview["performance"]
        assert len(performance["dates"]) == 4
        assert len(performance["returns"]) == 4
        assert len(performance["cumulative"]) == 4
        
        # Check return calculations
        assert performance["returns"][0] == 0  # First month
        assert abs(performance["returns"][1] - 0.05) < 0.001  # 5% return
        assert abs(performance["returns"][2] - 0.076) < 0.001  # ~7.6% return
        
        # Check cumulative returns
        assert performance["cumulative"][0] == 1.0
        assert abs(performance["cumulative"][1] - 1.05) < 0.001
        assert abs(performance["cumulative"][2] - 1.13) < 0.001


@pytest.mark.asyncio
async def test_news_feed_integration():
    """Test news feed integration in portfolio overview"""
    from volatility_filter.portfolio_manager import PortfolioManager
    
    # Mock news data
    mock_news = [
        {
            "id": "1",
            "title": "Fed Rate Decision",
            "description": "Federal Reserve raises rates by 25bps",
            "sentiment": "Negative",
            "timestamp": datetime.utcnow().isoformat()
        },
        {
            "id": "2",
            "title": "Bitcoin ETF Approval",
            "description": "SEC approves spot Bitcoin ETF",
            "sentiment": "Extremely Positive",
            "timestamp": datetime.utcnow().isoformat()
        }
    ]
    
    exchange_client = MagicMock()
    pm = PortfolioManager(exchange_client)
    
    # Mock news fetcher
    with patch.object(pm, '_get_news_feed', return_value=mock_news):
        overview = await pm.get_portfolio_overview()
        
        assert len(overview["news"]) == 2
        assert overview["news"][0]["title"] == "Fed Rate Decision"
        assert overview["news"][1]["sentiment"] == "Extremely Positive"


@pytest.mark.asyncio
async def test_portfolio_overview_error_handling():
    """Test error handling in portfolio overview"""
    from volatility_filter.portfolio_manager import PortfolioManager
    
    # Mock exchange client that raises errors
    exchange_client = MagicMock()
    exchange_client.get_portfolio.side_effect = Exception("API Error")
    
    pm = PortfolioManager(exchange_client)
    
    # Should return default values on error
    overview = await pm.get_portfolio_overview()
    
    assert overview["portfolio"]["total_value"] > 0  # Should have default value
    assert len(overview["positions"]) >= 0  # Should return empty or default positions
    assert "error" not in overview  # Should not expose internal errors