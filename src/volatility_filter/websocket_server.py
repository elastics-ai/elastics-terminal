"""WebSocket server for broadcasting volatility events to subscribers."""

import asyncio
import json
import websockets
from typing import Set, Dict, Any, Optional
import uuid
import threading
import time
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class WebSocketBroadcastServer:
    """WebSocket server for broadcasting volatility events to subscribers."""

    def __init__(self, host="localhost", port=8765):
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.server = None
        self.loop = None
        self.server_thread = None
        self.running = False
        self.subscriptions: Dict[
            str, Set[str]
        ] = {}  # client_id -> set of subscribed events
        self.client_map: Dict[
            websockets.WebSocketServerProtocol, str
        ] = {}  # websocket -> client_id

    async def register_client(self, websocket) -> str:
        """Register a new client connection."""
        client_id = str(uuid.uuid4())
        self.clients.add(websocket)
        self.client_map[websocket] = client_id

        # Send welcome message
        await websocket.send(
            json.dumps(
                {
                    "type": "connection",
                    "status": "connected",
                    "client_id": client_id,
                    "message": "Connected to Volatility Filter WebSocket Server",
                    "available_subscriptions": [
                        "threshold_breach",
                        "all_trades",
                        "statistics_update",
                        "volatility_estimate",
                        "option_chain_update",
                        "option_trade",
                        "option_greeks_update",
                        "iv_surface_update",
                        "option_volatility_event",
                        "vol_surface",
                    ],
                    "timestamp": int(time.time() * 1000),
                }
            )
        )

        logger.info(f"Client {client_id} connected from {websocket.remote_address}")
        return client_id

    async def unregister_client(self, websocket, client_id: str):
        """Remove a client connection."""
        self.clients.discard(websocket)
        if client_id in self.subscriptions:
            del self.subscriptions[client_id]
        if websocket in self.client_map:
            del self.client_map[websocket]

        logger.info(f"Client {client_id} disconnected")

    async def handle_client_message(self, websocket, client_id: str, message: str):
        """Handle incoming messages from clients."""
        try:
            data = json.loads(message)
            msg_type = data.get("type")

            if msg_type == "subscribe":
                # Handle subscription requests
                events = data.get("events", ["threshold_breach"])
                if not isinstance(events, list):
                    events = [events]

                # Validate event types
                valid_events = {
                    "threshold_breach",
                    "all_trades",
                    "statistics_update",
                    "volatility_estimate",
                    "option_chain_update",
                    "option_trade",
                    "option_greeks_update",
                    "iv_surface_update",
                    "option_volatility_event",
                    "vol_surface",
                    "all",
                }
                events = [e for e in events if e in valid_events]

                self.subscriptions[client_id] = set(events)

                await websocket.send(
                    json.dumps(
                        {
                            "type": "subscription_confirmed",
                            "subscribed_events": list(self.subscriptions[client_id]),
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                )

                logger.info(f"Client {client_id} subscribed to: {events}")

            elif msg_type == "unsubscribe":
                # Handle unsubscription requests
                events = data.get("events", [])
                if not isinstance(events, list):
                    events = [events]

                if client_id in self.subscriptions:
                    for event in events:
                        self.subscriptions[client_id].discard(event)

                await websocket.send(
                    json.dumps(
                        {
                            "type": "unsubscription_confirmed",
                            "unsubscribed_events": events,
                            "remaining_subscriptions": list(
                                self.subscriptions.get(client_id, set())
                            ),
                            "timestamp": int(time.time() * 1000),
                        }
                    )
                )

            elif msg_type == "ping":
                # Respond to ping
                await websocket.send(
                    json.dumps({"type": "pong", "timestamp": int(time.time() * 1000)})
                )

        except json.JSONDecodeError:
            await websocket.send(
                json.dumps(
                    {
                        "type": "error",
                        "message": "Invalid JSON format",
                        "timestamp": int(time.time() * 1000),
                    }
                )
            )
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
            await websocket.send(
                json.dumps(
                    {
                        "type": "error",
                        "message": str(e),
                        "timestamp": int(time.time() * 1000),
                    }
                )
            )

    async def client_handler(self, websocket):
        """Handle a client connection."""
        client_id = None
        try:
            # Register client only after successful handshake
            client_id = await self.register_client(websocket)

            async for message in websocket:
                await self.handle_client_message(websocket, client_id, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        except websockets.exceptions.InvalidMessage as e:
            # Handle invalid WebSocket handshake (e.g., health checks)
            logger.debug(
                f"Invalid WebSocket handshake from {websocket.remote_address}: {e}"
            )
        except Exception as e:
            logger.error(f"Client handler error: {e}")
        finally:
            if client_id:
                await self.unregister_client(websocket, client_id)

    async def broadcast_event(self, event_type: str, data: Dict[str, Any]):
        """Broadcast an event to all subscribed clients."""
        if not self.clients:
            return

        message = json.dumps(
            {"type": event_type, "timestamp": int(time.time() * 1000), "data": data}
        )

        # Send to clients subscribed to this event type or 'all' events
        disconnected_clients = set()

        for client in self.clients:
            try:
                client_id = self.client_map.get(client)
                if client_id:
                    client_subs = self.subscriptions.get(client_id, set())
                    # Send if subscribed to specific event, 'all', or no subscription set
                    if (
                        event_type in client_subs
                        or "all" in client_subs
                        or not client_subs
                    ):
                        await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected_clients.add(client)

        # Clean up disconnected clients
        for client in disconnected_clients:
            await self.unregister_client(client, self.client_map.get(client, "unknown"))

    def broadcast_threshold_breach(self, trade_data: Dict[str, Any]):
        """Broadcast a threshold breach event."""
        if self.loop and self.running:
            # Ensure datetime is serializable
            if "datetime" in trade_data and hasattr(
                trade_data["datetime"], "isoformat"
            ):
                trade_data["datetime"] = trade_data["datetime"].isoformat()

            asyncio.run_coroutine_threadsafe(
                self.broadcast_event("threshold_breach", trade_data), self.loop
            )

    def broadcast_statistics(self, stats: Dict[str, Any]):
        """Broadcast statistics update."""
        if self.loop and self.running:
            asyncio.run_coroutine_threadsafe(
                self.broadcast_event("statistics_update", stats), self.loop
            )

    def broadcast_trade(self, trade_data: Dict[str, Any]):
        """Broadcast a trade (for clients subscribed to all trades)."""
        if self.loop and self.running:
            asyncio.run_coroutine_threadsafe(
                self.broadcast_event("all_trades", trade_data), self.loop
            )

    def broadcast_volatility_estimate(self, volatility_data: Dict[str, Any]):
        """Broadcast volatility estimate update."""
        if self.loop and self.running:
            asyncio.run_coroutine_threadsafe(
                self.broadcast_event("volatility_estimate", volatility_data), self.loop
            )

    async def start_server(self):
        """Start the WebSocket server."""
        try:
            # Custom logger for websocket library to reduce noise
            websocket_logger = logging.getLogger("websockets.server")
            websocket_logger.setLevel(logging.WARNING)

            self.server = await websockets.serve(
                self.client_handler,
                self.host,
                self.port,
                ping_interval=30,
                ping_timeout=10,
                # Additional options to handle edge cases
                compression=None,
                max_size=10 * 1024 * 1024,  # 10MB max message size
            )
            self.running = True
            logger.info(
                f"WebSocket broadcast server started on ws://{self.host}:{self.port}"
            )

            # Keep the server running
            await asyncio.Future()
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
            raise

    def run_server(self):
        """Run the server in its own event loop."""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

        try:
            self.loop.run_until_complete(self.start_server())
        except Exception as e:
            logger.error(f"WebSocket server error: {e}")
        finally:
            self.loop.close()

    def start(self):
        """Start the WebSocket server in a separate thread."""
        self.server_thread = threading.Thread(target=self.run_server)
        self.server_thread.daemon = True
        self.server_thread.start()

        # Give server time to start
        time.sleep(1)

        # Verify server is running
        if not self.running:
            raise RuntimeError("Failed to start WebSocket server")

    def stop(self):
        """Stop the WebSocket server."""
        self.running = False

        if self.server and self.loop:
            # Close all client connections
            for client in list(self.clients):
                self.loop.call_soon_threadsafe(
                    lambda c=client: asyncio.create_task(c.close())
                )

            # Close the server
            self.loop.call_soon_threadsafe(lambda: self.server.close())

            # Stop the event loop
            self.loop.call_soon_threadsafe(self.loop.stop)

        # Wait for thread to finish
        if self.server_thread and self.server_thread.is_alive():
            self.server_thread.join(timeout=5)

        logger.info("WebSocket server stopped")

    def get_client_count(self) -> int:
        """Get the number of connected clients."""
        return len(self.clients)

    def broadcast_option_chain_update(self, chain_data: Dict[str, Any]):
        """Broadcast option chain update."""
        if self.loop and self.running:
            asyncio.run_coroutine_threadsafe(
                self.broadcast_event("option_chain_update", chain_data), self.loop
            )

    def broadcast_option_trade(self, trade_data: Dict[str, Any]):
        """Broadcast option trade."""
        if self.loop and self.running:
            # Ensure datetime is serializable
            if "datetime" in trade_data and hasattr(
                trade_data["datetime"], "isoformat"
            ):
                trade_data["datetime"] = trade_data["datetime"].isoformat()

            asyncio.run_coroutine_threadsafe(
                self.broadcast_event("option_trade", trade_data), self.loop
            )

    def broadcast_option_greeks_update(self, greeks_data: Dict[str, Any]):
        """Broadcast option Greeks update."""
        if self.loop and self.running:
            asyncio.run_coroutine_threadsafe(
                self.broadcast_event("option_greeks_update", greeks_data), self.loop
            )

    def broadcast_iv_surface_update(self, surface_data: Dict[str, Any]):
        """Broadcast implied volatility surface update."""
        if self.loop and self.running:
            asyncio.run_coroutine_threadsafe(
                self.broadcast_event("iv_surface_update", surface_data), self.loop
            )

    def broadcast_option_volatility_event(self, event_data: Dict[str, Any]):
        """Broadcast option volatility event."""
        if self.loop and self.running:
            # Ensure datetime is serializable
            if "datetime" in event_data and hasattr(
                event_data["datetime"], "isoformat"
            ):
                event_data["datetime"] = event_data["datetime"].isoformat()

            asyncio.run_coroutine_threadsafe(
                self.broadcast_event("option_volatility_event", event_data), self.loop
            )

    def get_subscription_stats(self) -> Dict[str, int]:
        """Get statistics about client subscriptions."""
        stats = {
            "threshold_breach": 0,
            "all_trades": 0,
            "trade": 0,  # Added for backward compatibility
            "statistics_update": 0,
            "volatility_estimate": 0,
            "option_chain_update": 0,
            "option_trade": 0,
            "option_greeks_update": 0,
            "iv_surface_update": 0,
            "option_volatility_event": 0,
            "all": 0,
        }

        for client_id, subs in self.subscriptions.items():
            for sub in subs:
                if sub in stats:
                    stats[sub] += 1

        return stats

    def broadcast_vol_surface(self, surface_data: Dict[str, Any]):
        """Broadcast volatility surface update."""
        if self.loop and self.running:
            asyncio.run_coroutine_threadsafe(
                self.broadcast_event("vol_surface", surface_data), self.loop
            )
