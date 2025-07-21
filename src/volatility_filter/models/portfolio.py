"""Portfolio-related Pydantic models."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class InstrumentType(str, Enum):
    """Valid instrument types."""
    OPTION = "option"
    FUTURE = "future"
    SPOT = "spot"


class Position(BaseModel):
    """Position data model."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    instrument: str = Field(..., description="Instrument name", alias="symbol")
    type: InstrumentType = Field(..., description="Instrument type")
    quantity: float = Field(..., description="Position quantity")
    entry_price: float = Field(..., description="Entry price")
    current_price: float = Field(..., description="Current price")
    value: float = Field(..., description="Position value")
    pnl: float = Field(..., description="Profit and loss")
    pnl_percentage: float = Field(..., description="P&L percentage")
    delta: Optional[float] = Field(None, description="Option delta")
    iv: Optional[float] = Field(None, description="Implied volatility")
    gamma: Optional[float] = Field(None, description="Option gamma")
    vega: Optional[float] = Field(None, description="Option vega")
    theta: Optional[float] = Field(None, description="Option theta")
    is_active: bool = Field(True, description="Whether position is active")
    timestamp: Optional[datetime] = Field(None, description="Position timestamp")


class PortfolioSummary(BaseModel):
    """Portfolio summary statistics."""
    model_config = ConfigDict(from_attributes=True)
    
    total_positions: int = Field(0, description="Total number of positions")
    total_value: float = Field(0, description="Total portfolio value")
    total_pnl: float = Field(0, description="Total P&L")
    total_pnl_percentage: float = Field(0, description="Total P&L percentage")
    net_delta: float = Field(0, description="Net delta exposure")
    absolute_delta: float = Field(0, description="Absolute delta exposure")
    gamma: float = Field(0, description="Total gamma")
    vega: float = Field(0, description="Total vega")
    theta: float = Field(0, description="Total theta")
    last_update: datetime = Field(default_factory=datetime.now, description="Last update time")


class PortfolioSnapshot(BaseModel):
    """Complete portfolio snapshot."""
    model_config = ConfigDict(from_attributes=True)
    
    summary: PortfolioSummary
    positions: List[Position]
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class Trade(BaseModel):
    """Trade execution model."""
    model_config = ConfigDict(from_attributes=True)
    
    instrument_name: str = Field(..., description="Instrument name")
    instrument_type: InstrumentType = Field(..., description="Instrument type")
    side: str = Field(..., description="Buy or sell")
    quantity: float = Field(..., description="Trade quantity")
    price: float = Field(..., description="Execution price")
    fee: float = Field(0, description="Trading fee")
    timestamp: datetime = Field(default_factory=datetime.now)
    trade_id: Optional[str] = Field(None, description="Trade ID")
    order_id: Optional[str] = Field(None, description="Order ID")


class PnLBreakdown(BaseModel):
    """P&L breakdown by instrument type."""
    model_config = ConfigDict(from_attributes=True)
    
    options: float = Field(0, description="Options P&L")
    futures: float = Field(0, description="Futures P&L")
    spot: float = Field(0, description="Spot P&L")
    total: float = Field(0, description="Total P&L")
    timestamp: datetime = Field(default_factory=datetime.now)