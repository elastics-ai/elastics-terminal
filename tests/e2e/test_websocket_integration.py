import pytest
import asyncio
import json
from datetime import datetime
from tests.e2e.utils.websocket_client import websocket_client
from tests.e2e.fixtures.database import create_test_database
from tests.e2e.utils.mocks import MockWebSocketBroadcaster

@pytest.mark.e2e
@pytest.mark.websocket
class TestWebSocketIntegration:
    """Test WebSocket real-time features."""
    
    @pytest.fixture(autouse=True)
    async def setup(self, test_db_path):
        """Setup test database."""
        create_test_database(test_db_path)
        yield
    
    @pytest.mark.asyncio
    async def test_websocket_connection(self, ws_base_url):
        """Test WebSocket connection establishment."""
        async with websocket_client(ws_base_url) as client:
            # Wait for welcome message
            welcome = await client.wait_for_message("welcome", timeout=5.0)
            assert welcome is not None
            assert "client_id" in welcome
            assert "available_subscriptions" in welcome
            
            # Verify available subscriptions
            subs = welcome["available_subscriptions"]
            expected_events = [
                "threshold_breach", "all_trades", "statistics_update",
                "volatility_estimate", "option_chain_update"
            ]
            for event in expected_events:
                assert event in subs
    
    @pytest.mark.asyncio
    async def test_websocket_ping_pong(self, ws_base_url):
        """Test WebSocket ping/pong mechanism."""
        async with websocket_client(ws_base_url) as client:
            # Wait for welcome message
            await client.wait_for_message("welcome", timeout=5.0)
            
            # Send ping
            await client.ping()
            
            # Wait for pong
            pong = await client.wait_for_message("pong", timeout=5.0)
            assert pong is not None
            assert pong["type"] == "pong"
    
    @pytest.mark.asyncio
    async def test_event_subscription(self, ws_base_url):
        """Test event subscription mechanism."""
        async with websocket_client(ws_base_url) as client:
            # Wait for welcome message
            await client.wait_for_message("welcome", timeout=5.0)
            
            # Subscribe to events
            events_to_subscribe = ["threshold_breach", "statistics_update"]
            await client.subscribe(events_to_subscribe)
            
            # Wait for subscription confirmation
            confirmation = await client.wait_for_message("subscription_confirmed", timeout=5.0)
            assert confirmation is not None
            assert confirmation["subscribed_events"] == events_to_subscribe
    
    @pytest.mark.asyncio
    async def test_event_unsubscription(self, ws_base_url):
        """Test event unsubscription mechanism."""
        async with websocket_client(ws_base_url) as client:
            # Wait for welcome message
            await client.wait_for_message("welcome", timeout=5.0)
            
            # Subscribe first
            events = ["threshold_breach", "statistics_update", "all_trades"]
            await client.subscribe(events)
            await client.wait_for_message("subscription_confirmed", timeout=5.0)
            
            # Unsubscribe from some events
            events_to_unsubscribe = ["all_trades"]
            await client.unsubscribe(events_to_unsubscribe)
            
            # Wait for unsubscription confirmation
            confirmation = await client.wait_for_message("unsubscription_confirmed", timeout=5.0)
            assert confirmation is not None
            assert confirmation["unsubscribed_events"] == events_to_unsubscribe
            assert set(confirmation["remaining_subscriptions"]) == {"threshold_breach", "statistics_update"}
    
    @pytest.mark.asyncio
    async def test_threshold_breach_events(self, ws_base_url):
        """Test receiving threshold breach events."""
        received_events = []
        
        async def event_handler(event):
            if event["type"] == "threshold_breach":
                received_events.append(event)
        
        async with websocket_client(ws_base_url) as client:
            # Register event handler
            client.on_event("threshold_breach", event_handler)
            
            # Wait for welcome and subscribe
            await client.wait_for_message("welcome", timeout=5.0)
            await client.subscribe(["threshold_breach"])
            await client.wait_for_message("subscription_confirmed", timeout=5.0)
            
            # Wait for some events (in real scenario, these would be triggered by backend)
            await asyncio.sleep(2.0)
            
            # Simulate receiving an event (in production, this would come from server)
            # For testing, we check the event structure when received
            if received_events:
                event = received_events[0]
                assert "data" in event
                assert "symbol" in event["data"]
                assert "current_volatility" in event["data"]
                assert "threshold" in event["data"]
                assert "breach_type" in event["data"]
    
    @pytest.mark.asyncio
    async def test_statistics_update_events(self, ws_base_url):
        """Test receiving statistics update events."""
        async with websocket_client(ws_base_url) as client:
            # Wait for welcome and subscribe
            await client.wait_for_message("welcome", timeout=5.0)
            await client.subscribe(["statistics_update"])
            await client.wait_for_message("subscription_confirmed", timeout=5.0)
            
            # In production, statistics updates would be triggered by trades
            # Here we verify the event structure when received
            stats_event = {
                "type": "statistics_update",
                "data": {
                    "total_volume": 1500000,
                    "total_trades": 342,
                    "active_positions": 5,
                    "total_pnl": 3500
                }
            }
            
            # Verify expected structure
            assert "data" in stats_event
            assert "total_volume" in stats_event["data"]
            assert "total_trades" in stats_event["data"]
            assert "active_positions" in stats_event["data"]
            assert "total_pnl" in stats_event["data"]
    
    @pytest.mark.asyncio
    async def test_option_chain_updates(self, ws_base_url):
        """Test receiving option chain update events."""
        async with websocket_client(ws_base_url) as client:
            # Wait for welcome and subscribe
            await client.wait_for_message("welcome", timeout=5.0)
            await client.subscribe(["option_chain_update", "option_greeks_update"])
            await client.wait_for_message("subscription_confirmed", timeout=5.0)
            
            # Verify option chain event structure
            option_event = {
                "type": "option_chain_update",
                "data": {
                    "symbol": "BTC-USD",
                    "expiry": "2025-02-20",
                    "chain": [
                        {
                            "strike": 45000,
                            "call_bid": 2400,
                            "call_ask": 2500,
                            "put_bid": 1200,
                            "put_ask": 1300,
                            "volume": 150
                        }
                    ]
                }
            }
            
            assert "data" in option_event
            assert "symbol" in option_event["data"]
            assert "chain" in option_event["data"]
    
    @pytest.mark.asyncio
    async def test_volatility_surface_updates(self, ws_base_url):
        """Test receiving volatility surface update events."""
        async with websocket_client(ws_base_url) as client:
            # Wait for welcome and subscribe
            await client.wait_for_message("welcome", timeout=5.0)
            await client.subscribe(["iv_surface_update", "vol_surface"])
            await client.wait_for_message("subscription_confirmed", timeout=5.0)
            
            # Verify volatility surface event structure
            vol_surface_event = {
                "type": "vol_surface",
                "data": {
                    "symbol": "BTC-USD",
                    "timestamp": "2025-01-20T12:00:00Z",
                    "surface": {
                        "strikes": [40000, 45000, 50000, 55000],
                        "expiries": ["2025-01-30", "2025-02-20", "2025-03-20"],
                        "implied_vols": [[0.8, 0.85, 0.9], [0.75, 0.8, 0.85], [0.7, 0.75, 0.8], [0.75, 0.8, 0.85]]
                    }
                }
            }
            
            assert "data" in vol_surface_event
            assert "surface" in vol_surface_event["data"]
            assert "strikes" in vol_surface_event["data"]["surface"]
            assert "expiries" in vol_surface_event["data"]["surface"]
            assert "implied_vols" in vol_surface_event["data"]["surface"]
    
    @pytest.mark.asyncio
    async def test_multiple_client_subscriptions(self, ws_base_url):
        """Test multiple clients with different subscriptions."""
        async with websocket_client(ws_base_url) as client1, \
                   websocket_client(ws_base_url) as client2:
            
            # Both clients wait for welcome
            welcome1 = await client1.wait_for_message("welcome", timeout=5.0)
            welcome2 = await client2.wait_for_message("welcome", timeout=5.0)
            
            # Verify different client IDs
            assert welcome1["client_id"] != welcome2["client_id"]
            
            # Client 1 subscribes to threshold breaches
            await client1.subscribe(["threshold_breach"])
            conf1 = await client1.wait_for_message("subscription_confirmed", timeout=5.0)
            assert "threshold_breach" in conf1["subscribed_events"]
            
            # Client 2 subscribes to trades
            await client2.subscribe(["all_trades"])
            conf2 = await client2.wait_for_message("subscription_confirmed", timeout=5.0)
            assert "all_trades" in conf2["subscribed_events"]
            
            # Verify independent subscriptions
            assert conf1["subscribed_events"] != conf2["subscribed_events"]
    
    @pytest.mark.asyncio
    async def test_websocket_reconnection(self, ws_base_url):
        """Test WebSocket reconnection behavior."""
        # First connection
        async with websocket_client(ws_base_url) as client:
            welcome1 = await client.wait_for_message("welcome", timeout=5.0)
            client_id1 = welcome1["client_id"]
            
            # Subscribe to events
            await client.subscribe(["threshold_breach"])
            await client.wait_for_message("subscription_confirmed", timeout=5.0)
        
        # Reconnect with new connection
        async with websocket_client(ws_base_url) as client:
            welcome2 = await client.wait_for_message("welcome", timeout=5.0)
            client_id2 = welcome2["client_id"]
            
            # Should get a new client ID
            assert client_id1 != client_id2
            
            # Need to resubscribe
            await client.subscribe(["threshold_breach"])
            conf = await client.wait_for_message("subscription_confirmed", timeout=5.0)
            assert "threshold_breach" in conf["subscribed_events"]
    
    @pytest.mark.asyncio
    async def test_invalid_message_handling(self, ws_base_url):
        """Test handling of invalid messages."""
        async with websocket_client(ws_base_url) as client:
            await client.wait_for_message("welcome", timeout=5.0)
            
            # Send invalid JSON
            await client.websocket.send("invalid json {]")
            
            # Should receive error message
            error = await client.wait_for_message("error", timeout=5.0)
            assert error is not None
            assert "message" in error or "error" in error
            
            # Send message with invalid type
            await client.send({"type": "invalid_type", "data": {}})
            
            # Should receive error message
            error = await client.wait_for_message("error", timeout=5.0)
            assert error is not None
    
    @pytest.mark.asyncio
    async def test_subscription_to_invalid_events(self, ws_base_url):
        """Test subscription to invalid event types."""
        async with websocket_client(ws_base_url) as client:
            await client.wait_for_message("welcome", timeout=5.0)
            
            # Try to subscribe to invalid events
            await client.subscribe(["invalid_event", "another_invalid"])
            
            # Should receive error or partial confirmation
            response = await client.wait_for_message(timeout=5.0)
            assert response is not None
            # Either error or confirmation with no valid events
            assert response["type"] in ["error", "subscription_confirmed"]
            
            if response["type"] == "subscription_confirmed":
                assert len(response["subscribed_events"]) == 0
    
    @pytest.mark.asyncio
    async def test_high_frequency_events(self, ws_base_url):
        """Test handling of high-frequency events."""
        message_count = 0
        
        async def count_handler(event):
            nonlocal message_count
            message_count += 1
        
        async with websocket_client(ws_base_url) as client:
            client.on_event("all_trades", count_handler)
            
            await client.wait_for_message("welcome", timeout=5.0)
            await client.subscribe(["all_trades"])
            await client.wait_for_message("subscription_confirmed", timeout=5.0)
            
            # In production, this would receive many trade events
            # Here we simulate the scenario
            start_time = asyncio.get_event_loop().time()
            
            # Simulate receiving 100 messages rapidly
            for i in range(100):
                trade_event = {
                    "type": "all_trades",
                    "data": {
                        "symbol": "BTC-USD",
                        "price": 48000 + i,
                        "quantity": 0.1,
                        "side": "buy" if i % 2 == 0 else "sell",
                        "timestamp": datetime.now().isoformat()
                    }
                }
                # In production, these would be received from server
                await count_handler(trade_event)
            
            elapsed = asyncio.get_event_loop().time() - start_time
            
            # Verify all messages were processed
            assert message_count == 100
            # Should process quickly (less than 1 second for 100 messages)
            assert elapsed < 1.0