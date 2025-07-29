"""Tests for WebSocket portfolio updates."""

import asyncio
import json
import pytest
import websockets
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

from src.volatility_filter.websocket_server import WebSocketBroadcastServer
from src.volatility_filter.services.realtime_portfolio_service import RealtimePortfolioService
from src.volatility_filter.models.portfolio import PortfolioAnalytics, Position


class TestWebSocketPortfolioUpdates:
    """Test portfolio-specific WebSocket functionality."""

    @pytest.fixture
    async def websocket_server(self):
        """Create a WebSocket server for testing."""
        server = WebSocketBroadcastServer(host="localhost", port=0)  # Use random port
        # Start server in background
        server.start()
        yield server
        server.stop()

    @pytest.fixture
    def sample_portfolio_data(self):
        """Sample portfolio data for testing."""
        return {
            "portfolio_value": 2540300,
            "cumulative_pnl": 91024.18,
            "cumulative_return": 60.0,
            "annual_return": 14.0,
            "max_drawdown": -26.0,
            "annual_volatility": 38.0,
            "net_delta": 2.55,
            "net_gamma": 0.003,
            "net_vega": 19.5,
            "net_theta": -4.8,
            "updated_at": datetime.now()
        }

    @pytest.fixture
    def sample_news_data(self):
        """Sample news data for testing."""
        return {
            "news_feed": [
                {
                    "id": "news_1",
                    "title": "Market Update",
                    "summary": "Latest market developments",
                    "source": "Bloomberg",
                    "timestamp": datetime.now()
                }
            ]
        }

    @pytest.mark.asyncio
    async def test_portfolio_subscription_types(self, websocket_server):
        """Test that new portfolio subscription types are available."""
        # Mock websocket connection
        mock_websocket = AsyncMock()
        mock_websocket.remote_address = ("127.0.0.1", 12345)
        
        # Test registration includes new subscription types
        client_id = await websocket_server.register_client(mock_websocket)
        
        # Check that the welcome message was sent
        mock_websocket.send.assert_called_once()
        welcome_call = mock_websocket.send.call_args[0][0]
        welcome_data = json.loads(welcome_call)
        
        # Verify new subscription types are available
        available_subs = welcome_data["available_subscriptions"]
        expected_portfolio_subs = [
            "portfolio_update",
            "portfolio_analytics", 
            "performance_update",
            "news_update",
            "ai_insight",
            "risk_alert",
            "position_update"
        ]
        
        for sub in expected_portfolio_subs:
            assert sub in available_subs, f"Missing subscription type: {sub}"

    @pytest.mark.asyncio
    async def test_portfolio_subscription_handling(self, websocket_server):
        """Test subscribing to portfolio events."""
        mock_websocket = AsyncMock()
        mock_websocket.remote_address = ("127.0.0.1", 12345)
        
        client_id = await websocket_server.register_client(mock_websocket)
        
        # Test subscription to portfolio events
        subscription_msg = json.dumps({
            "type": "subscribe",
            "events": ["portfolio_update", "portfolio_analytics", "news_update"]
        })
        
        await websocket_server.handle_client_message(
            mock_websocket, client_id, subscription_msg
        )
        
        # Verify subscription confirmation
        assert mock_websocket.send.call_count == 2  # Welcome + confirmation
        confirmation_call = mock_websocket.send.call_args[0][0]
        confirmation_data = json.loads(confirmation_call)
        
        assert confirmation_data["type"] == "subscription_confirmed"
        assert set(confirmation_data["subscribed_events"]) == {
            "portfolio_update", "portfolio_analytics", "news_update"
        }

    @pytest.mark.asyncio
    async def test_broadcast_portfolio_update(self, websocket_server, sample_portfolio_data):
        """Test broadcasting portfolio updates."""
        mock_websocket = AsyncMock()
        mock_websocket.remote_address = ("127.0.0.1", 12345)
        
        # Register client and subscribe to portfolio updates
        client_id = await websocket_server.register_client(mock_websocket)
        websocket_server.subscriptions[client_id] = {"portfolio_update"}
        
        # Broadcast portfolio update
        websocket_server.broadcast_portfolio_update(sample_portfolio_data)
        
        # Wait for async broadcast to complete
        await asyncio.sleep(0.1)
        
        # Verify broadcast was sent
        assert mock_websocket.send.call_count >= 2  # Welcome + broadcast
        
        # Find the portfolio update call
        portfolio_call = None
        for call in mock_websocket.send.call_args_list[1:]:  # Skip welcome message
            try:
                data = json.loads(call[0][0])
                if data.get("type") == "portfolio_update":
                    portfolio_call = data
                    break
            except (json.JSONDecodeError, KeyError):
                continue
                
        assert portfolio_call is not None, "Portfolio update not found in broadcasts"
        assert portfolio_call["data"]["portfolio_value"] == 2540300
        assert portfolio_call["data"]["cumulative_pnl"] == 91024.18

    @pytest.mark.asyncio
    async def test_broadcast_news_update(self, websocket_server, sample_news_data):
        """Test broadcasting news updates."""
        mock_websocket = AsyncMock()
        mock_websocket.remote_address = ("127.0.0.1", 12345)
        
        client_id = await websocket_server.register_client(mock_websocket)
        websocket_server.subscriptions[client_id] = {"news_update"}
        
        # Broadcast news update
        websocket_server.broadcast_news_update(sample_news_data)
        
        await asyncio.sleep(0.1)
        
        # Verify broadcast
        assert mock_websocket.send.call_count >= 2
        
        # Find news update call
        news_call = None
        for call in mock_websocket.send.call_args_list[1:]:
            try:
                data = json.loads(call[0][0])
                if data.get("type") == "news_update":
                    news_call = data
                    break
            except (json.JSONDecodeError, KeyError):
                continue
                
        assert news_call is not None, "News update not found in broadcasts"
        assert len(news_call["data"]["news_feed"]) == 1
        assert news_call["data"]["news_feed"][0]["title"] == "Market Update"

    @pytest.mark.asyncio
    async def test_datetime_serialization(self, websocket_server):
        """Test that datetime objects are properly serialized."""
        mock_websocket = AsyncMock()
        mock_websocket.remote_address = ("127.0.0.1", 12345)
        
        client_id = await websocket_server.register_client(mock_websocket)
        websocket_server.subscriptions[client_id] = {"portfolio_analytics"}
        
        # Data with datetime objects
        data_with_datetime = {
            "timestamp": datetime.now(),
            "nested": {
                "created_at": datetime.now()
            },
            "list_with_datetime": [
                {"updated_at": datetime.now()},
                {"processed_at": datetime.now()}
            ]
        }
        
        # Broadcast should not raise serialization errors
        websocket_server.broadcast_portfolio_analytics(data_with_datetime)
        await asyncio.sleep(0.1)
        
        # Verify the broadcast was sent successfully
        assert mock_websocket.send.call_count >= 2

    def test_subscription_stats_include_portfolio_events(self, websocket_server):
        """Test that subscription stats include new portfolio events."""
        stats = websocket_server.get_subscription_stats()
        
        expected_portfolio_stats = [
            "portfolio_update",
            "portfolio_analytics",
            "performance_update", 
            "news_update",
            "ai_insight",
            "risk_alert",
            "position_update"
        ]
        
        for stat in expected_portfolio_stats:
            assert stat in stats, f"Missing stat for: {stat}"


class TestRealtimePortfolioService:
    """Test the real-time portfolio service."""

    @pytest.fixture
    def mock_websocket_server(self):
        """Mock WebSocket server."""
        server = Mock(spec=WebSocketBroadcastServer)
        server.get_client_count.return_value = 5
        server.get_subscription_stats.return_value = {"portfolio_update": 3}
        return server

    @pytest.fixture
    def mock_portfolio_manager(self):
        """Mock portfolio manager."""
        manager = Mock()
        manager.get_positions.return_value = [
            Position(
                id="1",
                instrument="BTC-USD",
                quantity=1.0,
                value=50000.0,
                pnl=2500.0,
                delta=0.5,
                gamma=0.01,
                vega=10.0,
                theta=-2.0
            ),
            Position(
                id="2", 
                instrument="ETH-USD",
                quantity=10.0,
                value=30000.0,
                pnl=1500.0,
                delta=0.3,
                gamma=0.005,
                vega=5.0,
                theta=-1.0
            )
        ]
        return manager

    @pytest.fixture
    def portfolio_service(self, mock_websocket_server, mock_portfolio_manager):
        """Create portfolio service with mocks."""
        return RealtimePortfolioService(
            websocket_server=mock_websocket_server,
            portfolio_manager=mock_portfolio_manager,
            update_interval=1  # 1 second for faster testing
        )

    @pytest.mark.asyncio
    async def test_service_start_stop(self, portfolio_service):
        """Test starting and stopping the service."""
        assert not portfolio_service.is_running
        
        await portfolio_service.start()
        assert portfolio_service.is_running
        
        await asyncio.sleep(0.1)  # Let it start
        
        await portfolio_service.stop()
        assert not portfolio_service.is_running

    @pytest.mark.asyncio
    async def test_portfolio_data_generation(self, portfolio_service):
        """Test generating dashboard data."""
        dashboard_data = await portfolio_service._get_dashboard_data()
        
        assert dashboard_data is not None
        assert dashboard_data.portfolio_summary.total_positions == 2
        assert dashboard_data.portfolio_summary.total_value == 80000.0
        assert dashboard_data.portfolio_summary.total_pnl == 4000.0
        
        # Check analytics
        assert dashboard_data.portfolio_analytics.portfolio_value == 80000.0
        assert dashboard_data.portfolio_analytics.net_delta == 0.8
        assert dashboard_data.portfolio_analytics.net_vega == 15.0

    @pytest.mark.asyncio 
    async def test_broadcast_full_update(self, portfolio_service):
        """Test broadcasting full portfolio update."""
        dashboard_data = await portfolio_service._get_dashboard_data()
        
        await portfolio_service._broadcast_full_update(dashboard_data)
        
        # Verify all broadcast methods were called
        mock_server = portfolio_service.websocket_server
        mock_server.broadcast_portfolio_update.assert_called_once()
        mock_server.broadcast_portfolio_analytics.assert_called_once()
        mock_server.broadcast_performance_update.assert_called_once()
        mock_server.broadcast_news_update.assert_called_once()

    def test_asset_allocation_calculation(self, portfolio_service):
        """Test asset allocation calculation."""
        positions = portfolio_service.portfolio_manager.get_positions()
        allocation = portfolio_service._calculate_asset_allocation(positions)
        
        assert "BTC" in allocation
        assert "ETH" in allocation
        assert abs(allocation["BTC"] - 62.5) < 1  # 50000/80000 * 100
        assert abs(allocation["ETH"] - 37.5) < 1  # 30000/80000 * 100

    def test_significant_change_detection(self, portfolio_service):
        """Test detection of significant portfolio changes."""
        # No previous values - should be significant
        assert portfolio_service._has_significant_change(100000, 5000)
        
        # Set previous values
        portfolio_service.last_portfolio_value = 100000
        portfolio_service.last_pnl = 5000
        
        # Small changes - not significant
        assert not portfolio_service._has_significant_change(100100, 5050)
        
        # Large value change - significant
        assert portfolio_service._has_significant_change(105000, 5000)
        
        # Large PnL change - significant
        assert portfolio_service._has_significant_change(100000, 6500)

    def test_service_stats(self, portfolio_service):
        """Test service statistics."""
        stats = portfolio_service.get_stats()
        
        assert "is_running" in stats
        assert "update_interval" in stats
        assert "websocket_clients" in stats
        assert "subscription_stats" in stats
        assert stats["websocket_clients"] == 5
        assert stats["subscription_stats"]["portfolio_update"] == 3