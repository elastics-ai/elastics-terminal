import websockets
import json
import asyncio
from typing import Dict, Any, List, Optional, Callable
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)

class WebSocketClient:
    """Test client for WebSocket connections."""
    
    def __init__(self, url: str):
        self.url = url
        self.websocket = None
        self.messages: List[Dict[str, Any]] = []
        self.event_handlers: Dict[str, List[Callable]] = {}
        self._running = False
        self._receive_task = None
    
    async def connect(self, max_retries: int = 30, retry_delay: float = 1.0):
        """Connect to WebSocket server with retries."""
        for i in range(max_retries):
            try:
                self.websocket = await websockets.connect(self.url)
                self._running = True
                self._receive_task = asyncio.create_task(self._receive_messages())
                logger.info(f"Connected to WebSocket at {self.url}")
                return True
            except Exception as e:
                logger.warning(f"WebSocket connection attempt {i+1} failed: {e}")
                if i < max_retries - 1:
                    await asyncio.sleep(retry_delay)
        
        return False
    
    async def disconnect(self):
        """Disconnect from WebSocket server."""
        self._running = False
        
        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass
        
        if self.websocket:
            await self.websocket.close()
            self.websocket = None
    
    async def _receive_messages(self):
        """Continuously receive messages from WebSocket."""
        while self._running and self.websocket:
            try:
                message = await self.websocket.recv()
                data = json.loads(message)
                self.messages.append(data)
                
                # Trigger event handlers
                event_type = data.get("type", "unknown")
                if event_type in self.event_handlers:
                    for handler in self.event_handlers[event_type]:
                        try:
                            await handler(data)
                        except Exception as e:
                            logger.error(f"Error in event handler: {e}")
                
            except websockets.exceptions.ConnectionClosed:
                logger.info("WebSocket connection closed")
                break
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
    
    async def send(self, message: Dict[str, Any]):
        """Send message to WebSocket server."""
        if not self.websocket:
            raise RuntimeError("WebSocket not connected")
        
        await self.websocket.send(json.dumps(message))
    
    async def subscribe(self, events: List[str]):
        """Subscribe to events."""
        await self.send({
            "type": "subscribe",
            "events": events
        })
    
    async def unsubscribe(self, events: List[str]):
        """Unsubscribe from events."""
        await self.send({
            "type": "unsubscribe",
            "events": events
        })
    
    async def ping(self):
        """Send ping message."""
        await self.send({"type": "ping"})
    
    def on_event(self, event_type: str, handler: Callable):
        """Register event handler."""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)
    
    async def wait_for_message(self, event_type: Optional[str] = None, timeout: float = 5.0) -> Optional[Dict[str, Any]]:
        """Wait for a specific message type."""
        start_time = asyncio.get_event_loop().time()
        
        while asyncio.get_event_loop().time() - start_time < timeout:
            for msg in reversed(self.messages):
                if event_type is None or msg.get("type") == event_type:
                    return msg
            await asyncio.sleep(0.1)
        
        return None
    
    def clear_messages(self):
        """Clear received messages."""
        self.messages.clear()

@asynccontextmanager
async def websocket_client(url: str):
    """Context manager for WebSocket client."""
    client = WebSocketClient(url)
    
    try:
        if await client.connect():
            yield client
        else:
            raise RuntimeError(f"Failed to connect to WebSocket at {url}")
    finally:
        await client.disconnect()