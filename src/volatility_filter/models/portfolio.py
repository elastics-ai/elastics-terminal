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


class StrategyPerformance(BaseModel):
    """Strategy performance metrics."""
    model_config = ConfigDict(from_attributes=True)
    
    strategy_name: str = Field(..., description="Strategy name")
    total_return: float = Field(0, description="Total return")
    cumulative_return: float = Field(0, description="Cumulative return percentage")
    annual_return: float = Field(0, description="Annualized return")
    max_drawdown: float = Field(0, description="Maximum drawdown")
    sharpe_ratio: float = Field(0, description="Sharpe ratio")
    sortino_ratio: float = Field(0, description="Sortino ratio")
    annual_volatility: float = Field(0, description="Annual volatility")
    win_rate: float = Field(0, description="Win rate percentage")
    profit_factor: float = Field(0, description="Profit factor")
    active: bool = Field(True, description="Strategy active status")
    last_update: datetime = Field(default_factory=datetime.now)


class PortfolioAnalytics(BaseModel):
    """Enhanced portfolio analytics matching design requirements."""
    model_config = ConfigDict(from_attributes=True)
    
    # Core metrics from design
    portfolio_value: float = Field(..., description="Current portfolio value")
    cumulative_pnl: float = Field(..., description="Cumulative P&L")
    cumulative_return: float = Field(..., description="Cumulative return percentage")
    annual_return: float = Field(..., description="Annualized return")
    max_drawdown: float = Field(..., description="Maximum drawdown")
    annual_volatility: float = Field(..., description="Annual volatility")
    
    # Strategy breakdown
    active_strategies: int = Field(0, description="Number of active strategies")
    strategy_performance: List[StrategyPerformance] = Field(default_factory=list)
    
    # Risk metrics
    var_95: float = Field(0, description="95% Value at Risk")
    cvar_95: float = Field(0, description="95% Conditional VaR")
    beta: float = Field(0, description="Portfolio beta")
    alpha: float = Field(0, description="Portfolio alpha")
    sharpe_ratio: float = Field(0, description="Sharpe ratio")
    sortino_ratio: float = Field(0, description="Sortino ratio")
    calmar_ratio: float = Field(0, description="Calmar ratio")
    
    # Greeks aggregation
    net_delta: float = Field(0, description="Net delta exposure")
    net_gamma: float = Field(0, description="Net gamma exposure")
    net_vega: float = Field(0, description="Net vega exposure") 
    net_theta: float = Field(0, description="Net theta exposure")
    
    timestamp: datetime = Field(default_factory=datetime.now)


class PerformanceHistory(BaseModel):
    """Historical performance data point."""
    model_config = ConfigDict(from_attributes=True)
    
    date: datetime = Field(..., description="Date of the data point")
    portfolio_value: float = Field(..., description="Portfolio value")
    daily_return: float = Field(0, description="Daily return")
    cumulative_return: float = Field(0, description="Cumulative return")
    drawdown: float = Field(0, description="Drawdown from peak")
    volatility: float = Field(0, description="Rolling volatility")
    benchmark_return: float = Field(0, description="Benchmark return")


class NewsItem(BaseModel):
    """News feed item."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="News item ID")
    title: str = Field(..., description="News title")
    summary: str = Field(..., description="News summary")
    source: str = Field(..., description="News source")
    url: Optional[str] = Field(None, description="Article URL")
    sentiment: Optional[float] = Field(None, description="Sentiment score (-1 to 1)")
    relevance_score: float = Field(0, description="Relevance score")
    symbols: List[str] = Field(default_factory=list, description="Related symbols")
    timestamp: datetime = Field(..., description="Publication timestamp")
    is_critical: bool = Field(False, description="Critical news flag")


class AIInsight(BaseModel):
    """AI-generated portfolio insight."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str = Field(..., description="Insight ID")
    type: str = Field(..., description="Insight type (risk, opportunity, alert)")
    title: str = Field(..., description="Insight title") 
    description: str = Field(..., description="Detailed description")
    confidence: float = Field(..., description="Confidence score 0-1")
    priority: str = Field(..., description="Priority level (low, medium, high, critical)")
    suggested_actions: List[str] = Field(default_factory=list, description="Suggested actions")
    related_positions: List[str] = Field(default_factory=list, description="Related positions")
    timestamp: datetime = Field(default_factory=datetime.now)
    acknowledged: bool = Field(False, description="User acknowledged flag")


class DashboardData(BaseModel):
    """Complete dashboard data matching the design."""
    model_config = ConfigDict(from_attributes=True)
    
    # Core portfolio data
    portfolio_summary: PortfolioSummary
    portfolio_analytics: PortfolioAnalytics
    performance_history: List[PerformanceHistory] = Field(default_factory=list)
    
    # News and insights
    news_feed: List[NewsItem] = Field(default_factory=list)
    ai_insights: List[AIInsight] = Field(default_factory=list)
    
    # Asset allocation breakdown
    asset_allocation: Dict[str, float] = Field(default_factory=dict)
    strategy_allocation: Dict[str, float] = Field(default_factory=dict)
    
    # Market context
    market_indicators: Dict[str, float] = Field(default_factory=dict)
    
    last_update: datetime = Field(default_factory=datetime.now)