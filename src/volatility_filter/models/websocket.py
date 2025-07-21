"""WebSocket-related Pydantic models."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


class WebSocketMessageType(str, Enum):
    """WebSocket message types."""
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    POSITION_UPDATE = "position_update"
    PRICE_UPDATE = "price_update"
    VOLATILITY_UPDATE = "volatility_update"
    TRADE_EXECUTION = "trade_execution"
    ALERT = "alert"
    ERROR = "error"
    HEARTBEAT = "heartbeat"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"


class WebSocketSubscriptionType(str, Enum):
    """WebSocket subscription types."""
    POSITIONS = "positions"
    PRICES = "prices"
    VOLATILITY = "volatility"
    TRADES = "trades"
    ALERTS = "alerts"
    ALL = "all"


class WebSocketMessage(BaseModel):
    """Base WebSocket message model."""
    model_config = ConfigDict(from_attributes=True)
    
    type: WebSocketMessageType = Field(..., description="Message type")
    timestamp: datetime = Field(default_factory=datetime.now)
    data: Optional[Dict[str, Any]] = Field(None, description="Message data")
    client_id: Optional[str] = Field(None, description="Client ID")
    request_id: Optional[str] = Field(None, description="Request ID for tracking")


class WebSocketSubscription(BaseModel):
    """WebSocket subscription request model."""
    model_config = ConfigDict(from_attributes=True)
    
    type: WebSocketMessageType = Field(WebSocketMessageType.SUBSCRIBE)
    subscription_type: WebSocketSubscriptionType = Field(..., description="What to subscribe to")
    instruments: Optional[List[str]] = Field(None, description="Specific instruments to monitor")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")
    client_id: Optional[str] = Field(None, description="Client ID")


class WebSocketResponse(BaseModel):
    """WebSocket response model."""
    model_config = ConfigDict(from_attributes=True)
    
    type: WebSocketMessageType = Field(..., description="Response type")
    success: bool = Field(True, description="Whether operation was successful")
    data: Optional[Union[Dict[str, Any], List[Dict[str, Any]]]] = Field(None, description="Response data")
    error: Optional[str] = Field(None, description="Error message if failed")
    timestamp: datetime = Field(default_factory=datetime.now)
    request_id: Optional[str] = Field(None, description="Original request ID")


class PositionUpdateMessage(BaseModel):
    """Position update WebSocket message."""
    model_config = ConfigDict(from_attributes=True)
    
    type: WebSocketMessageType = Field(WebSocketMessageType.POSITION_UPDATE)
    instrument: str = Field(..., description="Instrument name")
    position: Dict[str, Any] = Field(..., description="Updated position data")
    change_type: str = Field(..., description="Type of change (new, update, close)")
    timestamp: datetime = Field(default_factory=datetime.now)


class PriceUpdateMessage(BaseModel):
    """Price update WebSocket message."""
    model_config = ConfigDict(from_attributes=True)
    
    type: WebSocketMessageType = Field(WebSocketMessageType.PRICE_UPDATE)
    instrument: str = Field(..., description="Instrument name")
    price: float = Field(..., description="Current price")
    bid: Optional[float] = Field(None, description="Best bid")
    ask: Optional[float] = Field(None, description="Best ask")
    volume: Optional[float] = Field(None, description="Trading volume")
    timestamp: datetime = Field(default_factory=datetime.now)


class VolatilityUpdateMessage(BaseModel):
    """Volatility update WebSocket message."""
    model_config = ConfigDict(from_attributes=True)
    
    type: WebSocketMessageType = Field(WebSocketMessageType.VOLATILITY_UPDATE)
    instrument: str = Field(..., description="Instrument name")
    iv: float = Field(..., description="Implied volatility")
    realized_vol: Optional[float] = Field(None, description="Realized volatility")
    vol_change: Optional[float] = Field(None, description="Volatility change")
    timestamp: datetime = Field(default_factory=datetime.now)


class TradeExecutionMessage(BaseModel):
    """Trade execution WebSocket message."""
    model_config = ConfigDict(from_attributes=True)
    
    type: WebSocketMessageType = Field(WebSocketMessageType.TRADE_EXECUTION)
    trade_id: str = Field(..., description="Trade ID")
    instrument: str = Field(..., description="Instrument name")
    side: str = Field(..., description="Buy or sell")
    quantity: float = Field(..., description="Trade quantity")
    price: float = Field(..., description="Execution price")
    timestamp: datetime = Field(default_factory=datetime.now)
    order_id: Optional[str] = Field(None, description="Order ID")


class AlertMessage(BaseModel):
    """Alert WebSocket message."""
    model_config = ConfigDict(from_attributes=True)
    
    type: WebSocketMessageType = Field(WebSocketMessageType.ALERT)
    alert_type: str = Field(..., description="Type of alert")
    severity: str = Field(..., description="Alert severity (info, warning, critical)")
    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Alert message")
    instrument: Optional[str] = Field(None, description="Related instrument")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional alert data")
    timestamp: datetime = Field(default_factory=datetime.now)


class HeartbeatMessage(BaseModel):
    """Heartbeat WebSocket message."""
    model_config = ConfigDict(from_attributes=True)
    
    type: WebSocketMessageType = Field(WebSocketMessageType.HEARTBEAT)
    timestamp: datetime = Field(default_factory=datetime.now)
    server_time: datetime = Field(default_factory=datetime.now)
    connection_id: Optional[str] = Field(None, description="Connection ID")