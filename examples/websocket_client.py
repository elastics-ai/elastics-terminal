#!/usr/bin/env python3
"""
WebSocket client example for subscribing to volatility events.

This example shows how to connect to the volatility filter's WebSocket
server and receive real-time notifications when volatility breaches occur.
"""

import asyncio
import json
import websockets
from datetime import datetime


class VolatilityEventClient:
    """Client for subscribing to volatility events."""

    def __init__(self, uri="ws://localhost:8765"):
        self.uri = uri
        self.running = True

    async def handle_threshold_breach(self, data):
        """Handle threshold breach events."""
        print(f"\n🚨 VOLATILITY BREACH DETECTED!")
        print(f"   Time: {data['datetime']}")
        print(f"   Price: ${data['price']:.2f}")
        print(f"   Amount: {data['amount']} BTC")
        print(f"   Direction: {data['direction']}")
        print(f"   Volatility: {data['volatility']:.4f}")
        print(f"   Threshold: {data['threshold']:.4f}")
        print(f"   Excess: {data['excess_ratio']:.2f}x threshold")

    async def handle_statistics_update(self, data):
        """Handle statistics updates."""
        print(f"\n📊 Statistics Update at {datetime.now().strftime('%H:%M:%S')}")
        print(f"   Total Trades: {data['total_trades']}")
        print(f"   Filtered Trades: {data['filtered_trades']}")
        print(f"   Filter Ratio: {data['filter_ratio']:.2%}")
        print(f"   Current Volatility: {data['current_volatility']:.4f}")

    async def listen_for_events(self):
        """Connect and listen for volatility events."""
        try:
            async with websockets.connect(self.uri) as websocket:
                print(f"Connected to {self.uri}")

                # Subscribe to events
                await websocket.send(
                    json.dumps(
                        {
                            "type": "subscribe",
                            "events": ["threshold_breach", "statistics_update"],
                        }
                    )
                )

                print("Subscribed to volatility events")
                print("Listening for events... (Press Ctrl+C to stop)\n")

                # Listen for messages
                while self.running:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=1.0)

                        data = json.loads(message)
                        msg_type = data.get("type")

                        if msg_type == "threshold_breach":
                            await self.handle_threshold_breach(data["data"])
                        elif msg_type == "statistics_update":
                            await self.handle_statistics_update(data["data"])
                        elif msg_type == "connection":
                            print(f"Server: {data['message']}")
                        elif msg_type == "subscription_confirmed":
                            print(
                                f"Subscription confirmed: {data['subscribed_events']}"
                            )

                    except asyncio.TimeoutError:
                        # Send ping to keep connection alive
                        await websocket.send(json.dumps({"type": "ping"}))
                    except websockets.exceptions.ConnectionClosed:
                        print("Connection closed by server")
                        break

        except Exception as e:
            print(f"Error: {e}")

    def stop(self):
        """Stop the client."""
        self.running = False

    def run(self):
        """Run the client."""
        try:
            asyncio.run(self.listen_for_events())
        except KeyboardInterrupt:
            print("\nStopping client...")
            self.stop()


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="WebSocket client for volatility events"
    )
    parser.add_argument("--host", default="localhost", help="WebSocket server host")
    parser.add_argument("--port", type=int, default=8765, help="WebSocket server port")

    args = parser.parse_args()

    client = VolatilityEventClient(f"ws://{args.host}:{args.port}")
    client.run()


if __name__ == "__main__":
    main()
