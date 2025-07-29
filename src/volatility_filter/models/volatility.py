"""Volatility-related Pydantic models."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime as dt


class VolatilityAlert(BaseModel):
    """Volatility breach alert model."""
    model_config = ConfigDict(from_attributes=True)
    
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")
    datetime: str = Field(..., description="Datetime string")
    price: float = Field(..., description="Price at alert")
    volatility: float = Field(..., description="Volatility value")
    threshold: float = Field(..., description="Breach threshold")
    event_type: str = Field("threshold_exceeded", description="Event type")
    instrument: Optional[str] = Field(None, description="Instrument name")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class VolatilitySurface(BaseModel):
    """Volatility surface data model."""
    model_config = ConfigDict(from_attributes=True)
    
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")
    datetime: str = Field(..., description="Datetime string")
    spot_price: float = Field(..., description="Spot price")
    surface_data: List[List[float]] = Field(..., description="2D surface data")
    moneyness_grid: List[float] = Field(..., description="Moneyness grid values")
    ttm_grid: List[float] = Field(..., description="Time to maturity grid values")
    num_options: int = Field(..., description="Number of options used")
    atm_vol: float = Field(..., description="At-the-money volatility")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class VolatilityEvent(BaseModel):
    """General volatility event model."""
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[int] = Field(None, description="Event ID")
    timestamp: int = Field(..., description="Unix timestamp in milliseconds")
    datetime: str = Field(..., description="Datetime string")
    event_type: str = Field(..., description="Event type")
    instrument: Optional[str] = Field(None, description="Instrument name")
    price: Optional[float] = Field(None, description="Price at event")
    volatility: Optional[float] = Field(None, description="Volatility value")
    threshold: Optional[float] = Field(None, description="Threshold value")
    details: Optional[Dict[str, Any]] = Field(None, description="Event details")
    created_at: dt = Field(default_factory=lambda: dt.now())


class ImpliedVolData(BaseModel):
    """Implied volatility data for an option."""
    model_config = ConfigDict(from_attributes=True)
    
    instrument_name: str = Field(..., description="Option instrument name")
    strike: float = Field(..., description="Strike price")
    expiry: str = Field(..., description="Expiry date")
    ttm: float = Field(..., description="Time to maturity in years")
    moneyness: float = Field(..., description="Strike/Spot ratio")
    iv: float = Field(..., description="Implied volatility")
    bid_iv: Optional[float] = Field(None, description="Bid implied volatility")
    ask_iv: Optional[float] = Field(None, description="Ask implied volatility")
    volume: Optional[float] = Field(None, description="Trading volume")
    open_interest: Optional[float] = Field(None, description="Open interest")
    timestamp: dt = Field(default_factory=lambda: dt.now())


class VolatilityCurve(BaseModel):
    """Volatility term structure curve."""
    model_config = ConfigDict(from_attributes=True)
    
    currency: str = Field(..., description="Currency/underlying")
    expiries: List[str] = Field(..., description="Expiry dates")
    ttms: List[float] = Field(..., description="Time to maturities")
    ivs: List[float] = Field(..., description="Implied volatilities")
    spot_price: float = Field(..., description="Current spot price")
    timestamp: dt = Field(default_factory=lambda: dt.now())
    
    
class VolatilitySmile(BaseModel):
    """Volatility smile for a specific expiry."""
    model_config = ConfigDict(from_attributes=True)
    
    currency: str = Field(..., description="Currency/underlying")
    expiry: str = Field(..., description="Expiry date")
    ttm: float = Field(..., description="Time to maturity")
    strikes: List[float] = Field(..., description="Strike prices")
    ivs: List[float] = Field(..., description="Implied volatilities")
    spot_price: float = Field(..., description="Current spot price")
    atm_strike: float = Field(..., description="At-the-money strike")
    atm_iv: float = Field(..., description="At-the-money IV")
    timestamp: dt = Field(default_factory=lambda: dt.now())