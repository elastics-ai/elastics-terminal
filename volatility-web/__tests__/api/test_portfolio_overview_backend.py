"""
Backend API Tests for Portfolio Overview (Design Page 1)

Tests cover:
- /api/dashboard/overview endpoint
- /api/portfolio/summary endpoint
- /api/portfolio/positions endpoint
- /api/portfolio/pnl-breakdown endpoint
- Database integration and error handling
- Authentication and security
- Performance and scalability
"""

import pytest
import asyncio
import aiosqlite
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any
from unittest.mock import AsyncMock, MagicMock, patch
import sys
import os

# Add parent directories to path for imports
parent_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(parent_dir))

from fastapi.testclient import TestClient
from api_server import app, get_db

# Test database path
TEST_DB_PATH = "/tmp/test_volatility_filter.db"


class TestPortfolioOverviewBackend:
    """Test suite for Portfolio Overview backend API endpoints."""

    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Set up test environment before each test."""
        # Use test database
        os.environ["DB_PATH"] = TEST_DB_PATH
        self.client = TestClient(app)
        
        # Clear any existing test database
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)
            
        yield
        
        # Clean up after test
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)

    async def create_test_database(self):
        """Create test database with required tables and sample data."""
        conn = await aiosqlite.connect(TEST_DB_PATH)
        
        # Create positions table
        await conn.execute("""
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
        
        # Create volatility_events table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS volatility_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                datetime TEXT NOT NULL,
                price REAL NOT NULL,
                volatility REAL NOT NULL,
                threshold REAL NOT NULL,
                event_type TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create volatility_surface_fits table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS volatility_surface_fits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                datetime TEXT NOT NULL,
                spot_price REAL NOT NULL,
                surface_data TEXT NOT NULL,
                moneyness_grid TEXT NOT NULL,
                ttm_grid TEXT NOT NULL,
                num_options INTEGER NOT NULL,
                atm_vol REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create realtime_trades table
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS realtime_trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER NOT NULL,
                price REAL NOT NULL,
                ar_volatility REAL NOT NULL,
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
            await conn.execute("""
                INSERT INTO positions (
                    instrument_name, instrument_type, quantity, entry_price, 
                    current_price, position_value, pnl, pnl_percent, delta, 
                    gamma, vega, theta, mark_iv, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, pos)
        
        # Insert sample volatility events
        current_timestamp = int(datetime.now().timestamp() * 1000)
        await conn.execute("""
            INSERT INTO volatility_events (
                timestamp, datetime, price, volatility, threshold, event_type
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (current_timestamp, datetime.now().isoformat(), 47000, 25.5, 20.0, "threshold_exceeded"))
        
        # Insert sample surface data
        surface_data = {
            "surface": [[0.2, 0.25, 0.3], [0.22, 0.27, 0.32], [0.24, 0.29, 0.34]]
        }
        await conn.execute("""
            INSERT INTO volatility_surface_fits (
                timestamp, datetime, spot_price, surface_data, moneyness_grid, 
                ttm_grid, num_options, atm_vol
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_timestamp, datetime.now().isoformat(), 47000,
            json.dumps(surface_data), json.dumps([0.8, 1.0, 1.2]),
            json.dumps([0.25, 0.5, 1.0]), 150, 0.25
        ))
        
        # Insert sample trade data
        await conn.execute("""
            INSERT INTO realtime_trades (timestamp, price, ar_volatility)
            VALUES (?, ?, ?)
        """, (current_timestamp, 47000, 24.5))
        
        await conn.commit()
        await conn.close()


class TestDashboardOverviewEndpoint(TestPortfolioOverviewBackend):
    """Test /api/dashboard/overview endpoint."""

    @pytest.mark.asyncio
    async def test_dashboard_overview_success(self):
        """Test successful dashboard overview response."""
        await self.create_test_database()
        
        response = self.client.get("/api/dashboard/overview")
        
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

    @pytest.mark.asyncio
    async def test_dashboard_overview_portfolio_analytics(self):
        """Test portfolio analytics data structure."""
        await self.create_test_database()
        
        response = self.client.get("/api/dashboard/overview")
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
        assert analytics["alpha"] >= 0  # Alpha should be positive
        assert 0 <= analytics["beta"] <= 2  # Beta should be reasonable

    @pytest.mark.asyncio
    async def test_dashboard_overview_performance_history(self):
        """Test performance history data structure."""
        await self.create_test_database()
        
        response = self.client.get("/api/dashboard/overview")
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
        
        # Verify date format
        datetime.fromisoformat(entry["date"].replace('Z', '+00:00'))

    @pytest.mark.asyncio
    async def test_dashboard_overview_asset_allocation(self):
        """Test asset allocation calculation."""
        await self.create_test_database()
        
        response = self.client.get("/api/dashboard/overview")
        data = response.json()
        
        allocation = data["asset_allocation"]
        
        # Verify allocation is a dictionary
        assert isinstance(allocation, dict)
        assert len(allocation) > 0
        
        # Verify allocation percentages sum to reasonable total
        total_allocation = sum(allocation.values())
        assert 90 <= total_allocation <= 110  # Allow some rounding error

    @pytest.mark.asyncio
    async def test_dashboard_overview_ai_insights(self):
        """Test AI insights data structure."""
        await self.create_test_database()
        
        response = self.client.get("/api/dashboard/overview")
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

    @pytest.mark.asyncio
    async def test_dashboard_overview_news_feed(self):
        """Test news feed data structure."""
        await self.create_test_database()
        
        response = self.client.get("/api/dashboard/overview")
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
            assert 0 <= news_item["relevance_score"] <= 1

    @pytest.mark.asyncio
    async def test_dashboard_overview_database_error_handling(self):
        """Test error handling when database is unavailable."""
        # Don't create database to simulate error
        
        with patch('api_server.get_db') as mock_get_db:
            mock_get_db.side_effect = Exception("Database connection failed")
            
            response = self.client.get("/api/dashboard/overview")
            
            # Should still return data (mock fallback)
            assert response.status_code == 200
            data = response.json()
            assert "portfolio_analytics" in data

    @pytest.mark.asyncio
    async def test_dashboard_overview_performance(self):
        """Test dashboard overview endpoint performance."""
        await self.create_test_database()
        
        import time
        start_time = time.time()
        
        response = self.client.get("/api/dashboard/overview")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 2.0  # Should respond within 2 seconds


class TestPortfolioSummaryEndpoint(TestPortfolioOverviewBackend):
    """Test /api/portfolio/summary endpoint."""

    @pytest.mark.asyncio
    async def test_portfolio_summary_with_positions(self):
        """Test portfolio summary when positions exist."""
        await self.create_test_database()
        
        response = self.client.get("/api/portfolio/summary")
        
        assert response.status_code == 200
        data = response.json()
        
        # Expected values based on test data
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

    @pytest.mark.asyncio
    async def test_portfolio_summary_empty_portfolio(self):
        """Test portfolio summary when no positions exist."""
        # Create database but don't insert positions
        conn = await aiosqlite.connect(TEST_DB_PATH)
        await conn.execute("""
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
                is_active BOOLEAN DEFAULT 1
            )
        """)
        await conn.commit()
        await conn.close()
        
        response = self.client.get("/api/portfolio/summary")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return default values
        assert data["portfolio_value"]["value"] == 2540300
        assert data["cumulative_pnl"]["value"] == 1524180

    @pytest.mark.asyncio
    async def test_portfolio_summary_calculation_accuracy(self):
        """Test accuracy of portfolio summary calculations."""
        await self.create_test_database()
        
        response = self.client.get("/api/portfolio/summary")
        data = response.json()
        
        # Based on test data: 28000 + (-600) + 94000 + 52500 = 173900
        expected_total_value = 173900
        expected_total_pnl = 3000 + 150 + 4000 + 2500  # 9650
        
        assert abs(data["portfolio_value"]["value"] - expected_total_value) < 100
        assert abs(data["cumulative_pnl"]["value"] - expected_total_pnl) < 100


class TestPortfolioPositionsEndpoint(TestPortfolioOverviewBackend):
    """Test /api/portfolio/positions endpoint."""

    @pytest.mark.asyncio
    async def test_portfolio_positions_success(self):
        """Test successful positions retrieval."""
        await self.create_test_database()
        
        response = self.client.get("/api/portfolio/positions")
        
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

    @pytest.mark.asyncio
    async def test_portfolio_positions_ordering(self):
        """Test positions are ordered by absolute value descending."""
        await self.create_test_database()
        
        response = self.client.get("/api/portfolio/positions")
        positions = response.json()
        
        # Verify ordering by absolute value
        values = [abs(pos["value"]) for pos in positions]
        assert values == sorted(values, reverse=True)

    @pytest.mark.asyncio
    async def test_portfolio_positions_data_types(self):
        """Test positions data types are correct."""
        await self.create_test_database()
        
        response = self.client.get("/api/portfolio/positions")
        positions = response.json()
        
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

    @pytest.mark.asyncio
    async def test_portfolio_positions_empty_portfolio(self):
        """Test positions endpoint with empty portfolio."""
        # Create database without positions
        conn = await aiosqlite.connect(TEST_DB_PATH)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                instrument_name TEXT NOT NULL,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        await conn.commit()
        await conn.close()
        
        response = self.client.get("/api/portfolio/positions")
        
        assert response.status_code == 200
        positions = response.json()
        assert isinstance(positions, list)
        assert len(positions) == 0

    @pytest.mark.asyncio
    async def test_portfolio_positions_database_error(self):
        """Test positions endpoint error handling."""
        # Don't create database to trigger error
        
        response = self.client.get("/api/portfolio/positions")
        
        assert response.status_code == 500
        assert "Internal Server Error" in response.json()["detail"]


class TestPortfolioPnLBreakdownEndpoint(TestPortfolioOverviewBackend):
    """Test /api/portfolio/pnl-breakdown endpoint."""

    @pytest.mark.asyncio
    async def test_pnl_breakdown_success(self):
        """Test successful P&L breakdown retrieval."""
        await self.create_test_database()
        
        response = self.client.get("/api/portfolio/pnl-breakdown")
        
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

    @pytest.mark.asyncio
    async def test_pnl_breakdown_calculations(self):
        """Test P&L breakdown calculation accuracy."""
        await self.create_test_database()
        
        response = self.client.get("/api/portfolio/pnl-breakdown")
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

    @pytest.mark.asyncio
    async def test_pnl_breakdown_empty_portfolio(self):
        """Test P&L breakdown with empty portfolio."""
        # Create database without positions
        conn = await aiosqlite.connect(TEST_DB_PATH)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                instrument_type TEXT NOT NULL,
                pnl REAL NOT NULL,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        await conn.commit()
        await conn.close()
        
        response = self.client.get("/api/portfolio/pnl-breakdown")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return zeros
        assert data["by_asset_class"]["options"] == 0
        assert data["by_asset_class"]["futures"] == 0
        assert data["by_asset_class"]["spot"] == 0
        assert data["summary"]["total_pnl"] == 0


class TestPortfolioOverviewSecurity(TestPortfolioOverviewBackend):
    """Test security aspects of portfolio overview endpoints."""

    @pytest.mark.asyncio
    async def test_sql_injection_protection(self):
        """Test SQL injection protection in endpoints."""
        await self.create_test_database()
        
        # Try SQL injection in query parameters
        malicious_params = {
            "limit": "10; DROP TABLE positions; --",
            "search": "'; DELETE FROM positions; --"
        }
        
        # Test endpoints that might accept parameters
        response = self.client.get("/api/portfolio/positions", params=malicious_params)
        
        # Should not crash and positions should still exist
        assert response.status_code in [200, 422]  # 422 for invalid params
        
        # Verify positions still exist
        response2 = self.client.get("/api/portfolio/positions")
        assert response2.status_code == 200

    @pytest.mark.asyncio
    async def test_rate_limiting_simulation(self):
        """Test rate limiting behavior simulation."""
        await self.create_test_database()
        
        # Make multiple rapid requests
        responses = []
        for i in range(10):
            response = self.client.get("/api/dashboard/overview")
            responses.append(response.status_code)
        
        # Should all succeed (no rate limiting implemented yet)
        assert all(status == 200 for status in responses)

    @pytest.mark.asyncio
    async def test_data_sanitization(self):
        """Test that response data is properly sanitized."""
        await self.create_test_database()
        
        response = self.client.get("/api/dashboard/overview")
        data = response.json()
        
        # Verify no sensitive data leakage
        data_str = json.dumps(data)
        
        # Should not contain database paths or internal system info
        assert "sqlite" not in data_str.lower()
        assert "password" not in data_str.lower()
        assert "secret" not in data_str.lower()
        assert "token" not in data_str.lower()


class TestPortfolioOverviewPerformance(TestPortfolioOverviewBackend):
    """Test performance characteristics of portfolio overview endpoints."""

    @pytest.mark.asyncio
    async def test_concurrent_requests(self):
        """Test handling of concurrent requests."""
        await self.create_test_database()
        
        import asyncio
        import aiohttp
        
        async def make_request():
            response = self.client.get("/api/dashboard/overview")
            return response.status_code
        
        # Make 5 concurrent requests
        tasks = [make_request() for _ in range(5)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All should succeed
        assert all(result == 200 for result in results if not isinstance(result, Exception))

    @pytest.mark.asyncio
    async def test_large_dataset_performance(self):
        """Test performance with large dataset."""
        # Create database with many positions
        conn = await aiosqlite.connect(TEST_DB_PATH)
        
        await conn.execute("""
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
                is_active BOOLEAN DEFAULT 1
            )
        """)
        
        # Insert 1000 positions
        positions_data = []
        for i in range(1000):
            positions_data.append((
                f"INSTRUMENT-{i:04d}", "option", 10 + i, 100 + i, 105 + i,
                (105 + i) * (10 + i), 5 * (10 + i), 5.0, 0.5, 1
            ))
        
        await conn.executemany("""
            INSERT INTO positions (
                instrument_name, instrument_type, quantity, entry_price,
                current_price, position_value, pnl, pnl_percent, delta, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, positions_data)
        
        await conn.commit()
        await conn.close()
        
        # Test response time
        import time
        start_time = time.time()
        
        response = self.client.get("/api/portfolio/positions")
        
        end_time = time.time()
        response_time = end_time - start_time
        
        assert response.status_code == 200
        assert response_time < 5.0  # Should handle 1000 positions within 5 seconds
        
        positions = response.json()
        assert len(positions) == 1000

    @pytest.mark.asyncio
    async def test_memory_usage_monitoring(self):
        """Test memory usage doesn't grow excessively."""
        await self.create_test_database()
        
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Make 50 requests
        for _ in range(50):
            response = self.client.get("/api/dashboard/overview")
            assert response.status_code == 200
        
        final_memory = process.memory_info().rss
        memory_growth = final_memory - initial_memory
        
        # Memory growth should be reasonable (less than 50MB)
        assert memory_growth < 50 * 1024 * 1024


class TestPortfolioOverviewIntegration(TestPortfolioOverviewBackend):
    """Test integration aspects across portfolio overview endpoints."""

    @pytest.mark.asyncio
    async def test_data_consistency_across_endpoints(self):
        """Test data consistency between related endpoints."""
        await self.create_test_database()
        
        # Get data from multiple endpoints
        overview_resp = self.client.get("/api/dashboard/overview")
        summary_resp = self.client.get("/api/portfolio/summary")
        positions_resp = self.client.get("/api/portfolio/positions")
        pnl_resp = self.client.get("/api/portfolio/pnl-breakdown")
        
        assert all(resp.status_code == 200 for resp in [overview_resp, summary_resp, positions_resp, pnl_resp])
        
        overview_data = overview_resp.json()
        summary_data = summary_resp.json()
        positions_data = positions_resp.json()
        pnl_data = pnl_resp.json()
        
        # Verify consistency
        # Total P&L should be consistent
        positions_total_pnl = sum(pos["pnl"] for pos in positions_data)
        pnl_total = pnl_data["summary"]["total_pnl"]
        
        assert abs(positions_total_pnl - pnl_total) < 1  # Allow small rounding differences
        
        # Portfolio value should be consistent
        positions_total_value = sum(pos["value"] for pos in positions_data)
        overview_portfolio_value = overview_data["portfolio_analytics"]["portfolio_value"]
        
        assert abs(positions_total_value - overview_portfolio_value) < 100

    @pytest.mark.asyncio
    async def test_real_time_data_updates(self):
        """Test that updates are reflected across endpoints."""
        await self.create_test_database()
        
        # Get initial data
        initial_resp = self.client.get("/api/portfolio/positions")
        initial_positions = initial_resp.json()
        initial_count = len(initial_positions)
        
        # Add a new position to database
        conn = await aiosqlite.connect(TEST_DB_PATH)
        await conn.execute("""
            INSERT INTO positions (
                instrument_name, instrument_type, quantity, entry_price,
                current_price, position_value, pnl, pnl_percent, delta, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, ("NEW-POSITION", "option", 5, 100, 110, 550, 50, 10.0, 0.3, 1))
        await conn.commit()
        await conn.close()
        
        # Get updated data
        updated_resp = self.client.get("/api/portfolio/positions")
        updated_positions = updated_resp.json()
        
        assert len(updated_positions) == initial_count + 1
        
        # Verify the new position appears
        new_position = next(pos for pos in updated_positions if pos["symbol"] == "NEW-POSITION")
        assert new_position["pnl"] == 50

    @pytest.mark.asyncio
    async def test_error_propagation(self):
        """Test how errors propagate through integrated endpoints."""
        # Simulate database corruption
        with patch('api_server.get_db') as mock_get_db:
            
            async def failing_db():
                raise Exception("Database corrupted")
            
            mock_get_db.return_value.__aenter__ = AsyncMock(side_effect=failing_db)
            
            # Test all endpoints handle the error gracefully
            overview_resp = self.client.get("/api/dashboard/overview")
            positions_resp = self.client.get("/api/portfolio/positions")
            
            # Overview should fallback to mock data
            assert overview_resp.status_code == 200
            
            # Positions should return error
            assert positions_resp.status_code == 500


if __name__ == "__main__":
    pytest.main([__file__, "-v"])