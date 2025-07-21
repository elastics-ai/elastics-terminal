"""Market-related Pydantic models."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class PolymarketMarket(BaseModel):
    """Polymarket market data model."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Market ID")
    question: str = Field(..., description="Market question")
    yes_percentage: float = Field(..., description="Yes outcome percentage")
    no_percentage: float = Field(..., description="No outcome percentage")
    volume: float = Field(..., description="Trading volume")
    end_date: Optional[str] = Field(None, description="Market end date")
    category: Optional[str] = Field(None, description="Market category")
    tags: List[str] = Field(default_factory=list, description="Market tags")
    active: bool = Field(True, description="Whether market is active")
    liquidity: Optional[float] = Field(None, description="Market liquidity")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class MarketData(BaseModel):
    """Generic market data model."""
    model_config = ConfigDict(from_attributes=True)
    
    instrument: str = Field(..., description="Instrument name")
    bid: Optional[float] = Field(None, description="Best bid price")
    ask: Optional[float] = Field(None, description="Best ask price")
    last: Optional[float] = Field(None, description="Last traded price")
    volume: Optional[float] = Field(None, description="Trading volume")
    open_interest: Optional[float] = Field(None, description="Open interest")
    timestamp: datetime = Field(default_factory=datetime.now)
    exchange: Optional[str] = Field(None, description="Exchange name")
    
    
class OrderBook(BaseModel):
    """Order book data model."""
    model_config = ConfigDict(from_attributes=True)
    
    instrument: str = Field(..., description="Instrument name")
    bids: List[List[float]] = Field(..., description="List of [price, quantity] for bids")
    asks: List[List[float]] = Field(..., description="List of [price, quantity] for asks")
    timestamp: datetime = Field(default_factory=datetime.now)
    exchange: Optional[str] = Field(None, description="Exchange name")
    
    @property
    def best_bid(self) -> Optional[float]:
        """Get best bid price."""
        return self.bids[0][0] if self.bids else None
    
    @property
    def best_ask(self) -> Optional[float]:
        """Get best ask price."""
        return self.asks[0][0] if self.asks else None
    
    @property
    def spread(self) -> Optional[float]:
        """Calculate bid-ask spread."""
        if self.best_bid and self.best_ask:
            return self.best_ask - self.best_bid
        return None


class PolymarketResponse(BaseModel):
    """Polymarket API response model."""
    model_config = ConfigDict(from_attributes=True)
    
    markets: List[PolymarketMarket] = Field(..., description="List of markets")
    total: int = Field(..., description="Total number of markets")
    last_update: datetime = Field(default_factory=datetime.now)
    is_mock: bool = Field(False, description="Whether data is mock data")


class MarketStats(BaseModel):
    """Market statistics model."""
    model_config = ConfigDict(from_attributes=True)
    
    total_trades: int = Field(0, description="Total number of trades")
    avg_volatility: Optional[float] = Field(None, description="Average volatility")
    max_volatility: Optional[float] = Field(None, description="Maximum volatility")
    min_price: Optional[float] = Field(None, description="Minimum price")
    max_price: Optional[float] = Field(None, description="Maximum price")
    avg_price: Optional[float] = Field(None, description="Average price")
    timestamp: datetime = Field(default_factory=datetime.now)