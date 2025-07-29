"""WebSocket server for real-time data streaming."""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Set, Optional
import websockets
from websockets.server import WebSocketServerProtocol
import os
import sentry_sdk
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Sentry if DSN is available
sentry_logging = LoggingIntegration(
    level=logging.INFO,
    event_level=logging.ERROR
)

glitchtip_dsn = os.getenv('GLITCHTIP_DSN')
if glitchtip_dsn:
    sentry_sdk.init(
        dsn=glitchtip_dsn,
        integrations=[
            AsyncioIntegration(),
            sentry_logging
        ],
        traces_sample_rate=0.1,
        environment=os.getenv('NODE_ENV', 'production'),
        release="volatility-filter-ws@1.0.0"
    )
    logger.info("GlitchTip error tracking initialized for WebSocket server")


class WebSocketManager:
    """Manages WebSocket connections and message broadcasting."""
    
    def __init__(self):
        self.connections: Dict[str, Set[WebSocketServerProtocol]] = {
            'portfolio': set(),
            'market': set(),
            'volatility': set(),
            'agents': set(),
            'alerts': set(),
        }
        self.market_data_task: Optional[asyncio.Task] = None
        self.portfolio_data_task: Optional[asyncio.Task] = None
        self.volatility_data_task: Optional[asyncio.Task] = None
        
    async def register(self, websocket: WebSocketServerProtocol, channel: str):
        """Register a WebSocket connection to a channel."""
        if channel in self.connections:
            self.connections[channel].add(websocket)
            logger.info(f"Client registered to channel: {channel}")
            
            # Send initial data
            await self.send_initial_data(websocket, channel)
            
    async def unregister(self, websocket: WebSocketServerProtocol):
        """Unregister a WebSocket connection from all channels."""
        for channel, connections in self.connections.items():
            if websocket in connections:
                connections.remove(websocket)
                logger.info(f"Client unregistered from channel: {channel}")
                
    async def send_initial_data(self, websocket: WebSocketServerProtocol, channel: str):
        """Send initial data when a client connects."""
        initial_data = {
            'type': 'initial',
            'channel': channel,
            'timestamp': datetime.now().isoformat(),
        }
        
        if channel == 'portfolio':
            initial_data['data'] = {
                'total_value': 2540300,
                'day_pnl': 61024,
                'day_pnl_percent': 2.46,
                'positions': 22,
            }
        elif channel == 'market':
            initial_data['data'] = {
                'btc': {'price': 52345.67, 'change': 2.41},
                'eth': {'price': 2987.34, 'change': -1.14},
                'spx': {'price': 4783.25, 'change': 0.49},
            }
        elif channel == 'volatility':
            initial_data['data'] = {
                'vix': 14.25,
                'btc_iv': 68.5,
                'eth_iv': 72.3,
            }
            
        await websocket.send(json.dumps(initial_data))
        
    async def broadcast(self, channel: str, message: dict):
        """Broadcast a message to all connections in a channel."""
        if channel not in self.connections:
            return
            
        # Add metadata
        message['channel'] = channel
        message['timestamp'] = datetime.now().isoformat()
        
        # Send to all connected clients
        disconnected = set()
        for websocket in self.connections[channel]:
            try:
                await websocket.send(json.dumps(message))
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(websocket)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.add(websocket)
                
        # Remove disconnected clients
        for websocket in disconnected:
            self.connections[channel].remove(websocket)
            
    async def generate_portfolio_updates(self):
        """Generate portfolio updates every second."""
        while True:
            try:
                update = {
                    'type': 'update',
                    'data': {
                        'total_value': 2540300 + (asyncio.get_event_loop().time() % 10) * 1000,
                        'day_pnl': 61024 + (asyncio.get_event_loop().time() % 5) * 100,
                        'day_pnl_percent': 2.46 + (asyncio.get_event_loop().time() % 3) * 0.1,
                    }
                }
                await self.broadcast('portfolio', update)
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Error generating portfolio updates: {e}")
                await asyncio.sleep(5)
                
    async def generate_market_updates(self):
        """Generate market data updates every 500ms."""
        while True:
            try:
                import random
                update = {
                    'type': 'tick',
                    'data': {
                        'btc': {
                            'price': 52345.67 + random.uniform(-100, 100),
                            'volume': random.uniform(1000000, 2000000),
                        },
                        'eth': {
                            'price': 2987.34 + random.uniform(-10, 10),
                            'volume': random.uniform(500000, 1000000),
                        },
                        'spx': {
                            'price': 4783.25 + random.uniform(-5, 5),
                            'volume': random.uniform(2000000000, 3000000000),
                        }
                    }
                }
                await self.broadcast('market', update)
                await asyncio.sleep(0.5)
            except Exception as e:
                logger.error(f"Error generating market updates: {e}")
                await asyncio.sleep(5)
                
    async def generate_volatility_updates(self):
        """Generate volatility updates every 2 seconds."""
        while True:
            try:
                import random
                update = {
                    'type': 'volatility_update',
                    'data': {
                        'surface': {
                            'btc': {
                                'atm_iv': 68.5 + random.uniform(-2, 2),
                                'skew': random.uniform(-0.1, 0.1),
                                'term_structure': [
                                    {'tenor': '1W', 'iv': 65 + random.uniform(-2, 2)},
                                    {'tenor': '1M', 'iv': 68 + random.uniform(-2, 2)},
                                    {'tenor': '3M', 'iv': 72 + random.uniform(-2, 2)},
                                ]
                            },
                            'eth': {
                                'atm_iv': 72.3 + random.uniform(-2, 2),
                                'skew': random.uniform(-0.1, 0.1),
                            }
                        }
                    }
                }
                await self.broadcast('volatility', update)
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Error generating volatility updates: {e}")
                await asyncio.sleep(5)
                
    async def start_data_generation(self):
        """Start all data generation tasks."""
        self.portfolio_data_task = asyncio.create_task(self.generate_portfolio_updates())
        self.market_data_task = asyncio.create_task(self.generate_market_updates())
        self.volatility_data_task = asyncio.create_task(self.generate_volatility_updates())
        
    async def stop_data_generation(self):
        """Stop all data generation tasks."""
        if self.portfolio_data_task:
            self.portfolio_data_task.cancel()
        if self.market_data_task:
            self.market_data_task.cancel()
        if self.volatility_data_task:
            self.volatility_data_task.cancel()


# Global WebSocket manager
manager = WebSocketManager()


async def handle_client(websocket: WebSocketServerProtocol, path: str):
    """Handle a WebSocket client connection."""
    client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    logger.info(f"Client connected: {client_id} on path: {path}")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                
                if data.get('type') == 'subscribe':
                    channel = data.get('channel')
                    if channel:
                        await manager.register(websocket, channel)
                        await websocket.send(json.dumps({
                            'type': 'subscribed',
                            'channel': channel,
                            'status': 'success'
                        }))
                        
                elif data.get('type') == 'unsubscribe':
                    await manager.unregister(websocket)
                    await websocket.send(json.dumps({
                        'type': 'unsubscribed',
                        'status': 'success'
                    }))
                    
                elif data.get('type') == 'ping':
                    await websocket.send(json.dumps({
                        'type': 'pong',
                        'timestamp': datetime.now().isoformat()
                    }))
                    
            except json.JSONDecodeError:
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': 'Invalid JSON format'
                }))
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                await websocket.send(json.dumps({
                    'type': 'error',
                    'message': str(e)
                }))
                
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        await manager.unregister(websocket)


async def main():
    """Main server function."""
    logger.info("Starting WebSocket server on port 8765")
    
    # Start data generation
    await manager.start_data_generation()
    
    # Start WebSocket server
    async with websockets.serve(handle_client, "0.0.0.0", 8765):
        logger.info("WebSocket server started successfully")
        await asyncio.Future()  # Run forever


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
    except Exception as e:
        logger.error(f"Server error: {e}")
        if sentry_sdk:
            sentry_sdk.capture_exception(e)