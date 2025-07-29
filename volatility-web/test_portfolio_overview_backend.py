"""
Backend API Tests for Portfolio Overview (Design Page 1)

Tests cover:
- /api/dashboard/overview endpoint functionality
- /api/portfolio/summary endpoint
- /api/portfolio/positions endpoint  
- /api/portfolio/pnl-breakdown endpoint
- Database integration and error handling
- Data consistency and calculations
"""

import pytest
import json
import os
import sqlite3
from datetime import datetime
from fastapi.testclient import TestClient
from api_server import app

client = TestClient(app)

# Test database path
TEST_DB_PATH = "/tmp/test_volatility_filter.db"


class TestPortfolioOverviewBackend:
    """Test suite for Portfolio Overview backend API endpoints."""

    def setup_method(self):
        """Set up test environment before each test."""
        # Use test database
        os.environ["DB_PATH"] = TEST_DB_PATH
        
        # Clear any existing test database
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)

    def teardown_method(self):
        """Clean up after test."""
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)

    def create_test_database(self):
        """Create test database with required tables and sample data."""
        conn = sqlite3.connect(TEST_DB_PATH)
        
        # Create positions table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                instrument_name TEXT NOT NULL,
                instrument_type TEXT NOT NULL,
                quantity REAL NOT NULL,
                entry_price REAL NOT NULL,
                current_price REAL NOT NULL,
                position_value REAL NOT NULL,
                pnl REAL NOT NULL,
                pnl_percent REAL NOT NULL,
                delta REAL,
                gamma REAL,
                vega REAL,
                theta REAL,
                mark_iv REAL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insert sample positions data
        sample_positions = [
            ("BTC-29MAR24-50000-C", "option", 10, 2500, 2800, 28000, 3000, 12.0, 0.6, 0.001, 15.2, -12.5, 0.75, 1),
            ("ETH-29MAR24-3000-P", "option", -5, 150, 120, -600, 150, 20.0, -0.3, 0.002, -8.5, 8.2, 0.65, 1),
            ("BTC-PERP", "future", 2, 45000, 47000, 94000, 4000, 8.89, 2.0, 0, 0, 0, None, 1),
            ("Strategy-Alpha-01", "option", 1, 50000, 52500, 52500, 2500, 5.0, 0.25, 0.0015, 12.8, -8.5, 0.68, 1),
        ]
        
        for pos in sample_positions:
            conn.execute("""
                INSERT INTO positions (
                    instrument_name, instrument_type, quantity, entry_price, 
                    current_price, position_value, pnl, pnl_percent, delta, 
                    gamma, vega, theta, mark_iv, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, pos)
        
        conn.commit()
        conn.close()


class TestDashboardOverviewEndpoint(TestPortfolioOverviewBackend):
    """Test /api/dashboard/overview endpoint."""

    def test_dashboard_overview_success(self):
        """Test successful dashboard overview response."""
        response = client.get("/api/dashboard/overview")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify required fields are present
        assert "portfolio_summary" in data
        assert "portfolio_analytics" in data
        assert "performance_history" in data
        assert "news_feed" in data
        assert "ai_insights" in data
        assert "asset_allocation" in data
        assert "strategy_allocation" in data
        assert "market_indicators" in data

    def test_dashboard_overview_portfolio_analytics(self):
        """Test portfolio analytics data structure."""
        response = client.get("/api/dashboard/overview")
        data = response.json()
        
        analytics = data["portfolio_analytics"]
        
        # Verify analytics fields
        assert "portfolio_value" in analytics
        assert "cumulative_pnl" in analytics
        assert "cumulative_return" in analytics
        assert "annual_return" in analytics
        assert "max_drawdown" in analytics
        assert "annual_volatility" in analytics
        assert "net_delta" in analytics
        assert "net_vega" in analytics
        assert "var_95" in analytics
        assert "beta" in analytics
        assert "alpha" in analytics
        
        # Verify data types and ranges
        assert isinstance(analytics["portfolio_value"], (int, float))
        assert isinstance(analytics["cumulative_pnl"], (int, float))
        assert isinstance(analytics["alpha"], (int, float))
        assert isinstance(analytics["beta"], (int, float))

    def test_dashboard_overview_performance_history(self):
        """Test performance history data structure."""
        response = client.get("/api/dashboard/overview")
        data = response.json()
        
        history = data["performance_history"]
        
        # Verify it's a list with entries
        assert isinstance(history, list)
        assert len(history) > 0
        
        # Verify history entry structure
        entry = history[0]
        assert "date" in entry
        assert "portfolio_value" in entry
        assert "daily_return" in entry
        assert "cumulative_return" in entry

    def test_dashboard_overview_asset_allocation(self):
        """Test asset allocation calculation."""
        response = client.get("/api/dashboard/overview")
        data = response.json()
        
        allocation = data["asset_allocation"]
        
        # Verify allocation is a dictionary
        assert isinstance(allocation, dict)
        assert len(allocation) > 0
        
        # Verify allocation percentages sum to reasonable total
        total_allocation = sum(allocation.values())
        assert 90 <= total_allocation <= 110  # Allow some rounding error

    def test_dashboard_overview_ai_insights(self):
        """Test AI insights data structure."""
        response = client.get("/api/dashboard/overview")
        data = response.json()
        
        insights = data["ai_insights"]
        
        # Verify insights structure
        assert isinstance(insights, list)
        
        if len(insights) > 0:
            insight = insights[0]
            assert "id" in insight
            assert "title" in insight
            assert "description" in insight
            assert "type" in insight
            assert "priority" in insight
            assert "suggested_actions" in insight
            assert "acknowledged" in insight
            
            # Verify enum values
            assert insight["type"] in ["risk", "opportunity", "info"]
            assert insight["priority"] in ["high", "medium", "low"]
            assert isinstance(insight["acknowledged"], bool)

    def test_dashboard_overview_news_feed(self):
        """Test news feed data structure."""
        response = client.get("/api/dashboard/overview")
        data = response.json()
        
        news = data["news_feed"]
        
        # Verify news structure
        assert isinstance(news, list)
        
        if len(news) > 0:
            news_item = news[0]
            assert "id" in news_item
            assert "title" in news_item
            assert "summary" in news_item
            assert "source" in news_item
            assert "timestamp" in news_item
            assert "is_critical" in news_item
            assert "relevance_score" in news_item
            
            # Verify data types
            assert isinstance(news_item["is_critical"], bool)
            assert isinstance(news_item["relevance_score"], (int, float))


class TestPortfolioSummaryEndpoint(TestPortfolioOverviewBackend):
    """Test /api/portfolio/summary endpoint."""

    def test_portfolio_summary_success(self):
        """Test successful portfolio summary response."""
        response = client.get("/api/portfolio/summary")
        
        assert response.status_code == 200
        data = response.json()
        
        # Expected fields based on existing test
        assert "portfolio_value" in data
        assert "cumulative_pnl" in data
        assert "cumulative_return" in data
        assert "annual_return" in data
        assert "max_drawdown" in data
        assert "annual_volatility" in data
        assert "alpha" in data
        assert "beta" in data
        assert "cvar_95" in data
        assert "sharpe_ratio" in data
        
        # Verify structure of nested values
        pv = data["portfolio_value"]
        assert "value" in pv
        assert "change_24h" in pv
        assert isinstance(pv["value"], (int, float))
        assert isinstance(pv["change_24h"], (int, float))

    def test_portfolio_summary_data_types(self):
        """Test portfolio summary data types."""
        response = client.get("/api/portfolio/summary")
        data = response.json()
        
        # Test all the data types as in existing test
        assert isinstance(data["portfolio_value"]["value"], (int, float))
        assert isinstance(data["portfolio_value"]["change_24h"], (int, float))
        assert isinstance(data["cumulative_pnl"]["value"], (int, float))
        assert isinstance(data["cumulative_pnl"]["change_24h"], (int, float))
        assert isinstance(data["cumulative_return"]["value"], (int, float))
        assert isinstance(data["cumulative_return"]["change_24h"], (int, float))
        assert isinstance(data["annual_return"]["value"], (int, float))
        assert isinstance(data["annual_return"]["change_24h"], (int, float))
        assert isinstance(data["max_drawdown"]["value"], (int, float))
        assert isinstance(data["max_drawdown"]["change_24h"], (int, float))
        assert isinstance(data["annual_volatility"]["value"], (int, float))
        assert isinstance(data["annual_volatility"]["change_24h"], (int, float))
        assert isinstance(data["alpha"]["value"], (int, float))
        assert isinstance(data["alpha"]["change_24h"], (int, float))
        assert isinstance(data["beta"]["value"], (int, float))
        assert isinstance(data["beta"]["change_24h"], (int, float))
        assert isinstance(data["cvar_95"]["value"], (int, float))
        assert isinstance(data["cvar_95"]["change_24h"], (int, float))
        assert isinstance(data["sharpe_ratio"]["value"], (int, float))
        assert isinstance(data["sharpe_ratio"]["change_24h"], (int, float))


class TestPortfolioPositionsEndpoint(TestPortfolioOverviewBackend):
    """Test /api/portfolio/positions endpoint."""

    def test_portfolio_positions_success(self):
        """Test successful positions retrieval."""
        # Use actual database data
        self.create_test_database()
        
        response = client.get("/api/portfolio/positions")
        
        assert response.status_code == 200
        positions = response.json()
        
        assert isinstance(positions, list)
        assert len(positions) == 4  # Based on test data
        
        # Verify position structure
        position = positions[0]
        assert "symbol" in position
        assert "type" in position
        assert "quantity" in position
        assert "entry_price" in position
        assert "current_price" in position
        assert "value" in position
        assert "pnl" in position
        assert "pnl_percentage" in position
        assert "delta" in position
        assert "iv" in position

    def test_portfolio_positions_ordering(self):
        """Test positions are ordered by absolute value descending."""
        self.create_test_database()
        
        response = client.get("/api/portfolio/positions")
        positions = response.json()
        
        # Verify ordering by absolute value
        values = [abs(pos["value"]) for pos in positions]
        assert values == sorted(values, reverse=True)

    def test_portfolio_positions_data_types(self):
        """Test positions data types are correct."""
        self.create_test_database()
        
        response = client.get("/api/portfolio/positions")
        positions = response.json()
        
        if len(positions) > 0:
            position = positions[0]
            
            # Verify numeric fields
            assert isinstance(position["quantity"], (int, float))
            assert isinstance(position["entry_price"], (int, float))
            assert isinstance(position["current_price"], (int, float))
            assert isinstance(position["value"], (int, float))
            assert isinstance(position["pnl"], (int, float))
            assert isinstance(position["pnl_percentage"], (int, float))
            
            # Verify string fields
            assert isinstance(position["symbol"], str)
            assert isinstance(position["type"], str)

    def test_portfolio_positions_empty_portfolio(self):
        """Test positions endpoint with empty portfolio."""
        # Create database without positions (just structure)
        conn = sqlite3.connect(TEST_DB_PATH)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                instrument_name TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        conn.commit()
        conn.close()
        
        response = client.get("/api/portfolio/positions")
        
        assert response.status_code == 200
        positions = response.json()
        assert isinstance(positions, list)
        assert len(positions) == 0


class TestPortfolioPnLBreakdownEndpoint(TestPortfolioOverviewBackend):
    """Test /api/portfolio/pnl-breakdown endpoint."""

    def test_pnl_breakdown_success(self):
        """Test successful P&L breakdown retrieval."""
        self.create_test_database()
        
        response = client.get("/api/portfolio/pnl-breakdown")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "by_asset_class" in data
        assert "by_symbol" in data
        assert "summary" in data
        
        # Verify by_asset_class structure
        by_asset = data["by_asset_class"]
        assert "options" in by_asset
        assert "futures" in by_asset
        assert "spot" in by_asset
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_pnl" in summary
        assert "realized_pnl" in summary
        assert "unrealized_pnl" in summary

    def test_pnl_breakdown_calculations(self):
        """Test P&L breakdown calculation accuracy."""
        self.create_test_database()
        
        response = client.get("/api/portfolio/pnl-breakdown")
        data = response.json()
        
        # Based on test data:
        # Options: BTC-29MAR24-50000-C (3000) + ETH-29MAR24-3000-P (150) + Strategy-Alpha-01 (2500) = 5650
        # Futures: BTC-PERP (4000) = 4000
        # Total: 9650
        
        expected_options_pnl = 5650
        expected_futures_pnl = 4000
        expected_total_pnl = 9650
        
        assert abs(data["by_asset_class"]["options"] - expected_options_pnl) < 100
        assert abs(data["by_asset_class"]["futures"] - expected_futures_pnl) < 100
        assert abs(data["summary"]["total_pnl"] - expected_total_pnl) < 100

    def test_pnl_breakdown_empty_portfolio(self):
        """Test P&L breakdown with empty portfolio."""
        # Create database without positions
        conn = sqlite3.connect(TEST_DB_PATH)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                instrument_type TEXT NOT NULL,
                pnl REAL NOT NULL,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        conn.commit()
        conn.close()
        
        response = client.get("/api/portfolio/pnl-breakdown")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return zeros
        assert data["by_asset_class"]["options"] == 0
        assert data["by_asset_class"]["futures"] == 0
        assert data["by_asset_class"]["spot"] == 0
        assert data["summary"]["total_pnl"] == 0


class TestPortfolioOverviewIntegration(TestPortfolioOverviewBackend):
    """Test integration aspects across portfolio overview endpoints."""

    def test_data_consistency_across_endpoints(self):
        """Test data consistency between related endpoints."""
        self.create_test_database()
        
        # Get data from multiple endpoints
        overview_resp = client.get("/api/dashboard/overview")
        summary_resp = client.get("/api/portfolio/summary")
        positions_resp = client.get("/api/portfolio/positions")
        pnl_resp = client.get("/api/portfolio/pnl-breakdown")
        
        assert all(resp.status_code == 200 for resp in [overview_resp, summary_resp, positions_resp, pnl_resp])
        
        overview_data = overview_resp.json()
        summary_data = summary_resp.json()
        positions_data = positions_resp.json()
        pnl_data = pnl_resp.json()
        
        # Verify consistency
        # Total P&L should be consistent
        if len(positions_data) > 0:
            positions_total_pnl = sum(pos["pnl"] for pos in positions_data)
            pnl_total = pnl_data["summary"]["total_pnl"]
            
            assert abs(positions_total_pnl - pnl_total) < 1  # Allow small rounding differences

    def test_performance_acceptable_response_times(self):
        """Test that all endpoints respond within acceptable time limits."""
        import time
        
        endpoints = [
            "/api/dashboard/overview",
            "/api/portfolio/summary", 
            "/api/portfolio/positions",
            "/api/portfolio/pnl-breakdown"
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            response = client.get(endpoint)
            end_time = time.time()
            
            response_time = end_time - start_time
            
            assert response.status_code == 200
            assert response_time < 3.0, f"{endpoint} took {response_time:.2f}s (> 3.0s limit)"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])