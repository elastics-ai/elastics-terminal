"""Risk management models for the volatility filter system."""

from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field


class RiskMetricType(str, Enum):
    """Types of risk metrics."""
    VAR = "var"
    CVAR = "cvar"
    MAX_DRAWDOWN = "max_drawdown"
    SHARPE_RATIO = "sharpe_ratio"
    SORTINO_RATIO = "sortino_ratio"
    BETA = "beta"
    CORRELATION = "correlation"


class StrategyHealth(BaseModel):
    """Health score and metrics for a trading strategy."""
    strategy_name: str
    health_score: float = Field(ge=0, le=100, description="Overall health score 0-100")
    active: bool = True
    total_returns: float
    exposure: float
    volatility: float
    over_herd: float
    max_drawdown: float
    exposure_time: float
    alpha: float
    beta: float
    sharpe_ratio: Optional[float] = None
    tags: List[str] = []


class RiskBreakdown(BaseModel):
    """Risk breakdown by factor or strategy."""
    factor: str
    btc_correlation: float = Field(ge=-1, le=1)
    eth_correlation: float = Field(ge=-1, le=1)
    volatility_correlation: float = Field(ge=-1, le=1)
    spx_correlation: float = Field(ge=-1, le=1)
    pairs_correlation: float = Field(ge=-1, le=1)


class FactorDecaying(BaseModel):
    """Factor decay metrics over time."""
    timestamp: datetime
    credit_threshold: float
    max_daily_loss: float
    minimal_profit_factor: float


class AggregateGreeks(BaseModel):
    """Aggregate Greeks across portfolio."""
    delta: float
    gamma: float
    vega: float
    theta: float
    rho: Optional[float] = 0.0
    total_notional: float


class RiskLimit(BaseModel):
    """Risk limit configuration."""
    metric: str
    current_value: float
    limit_value: float
    threshold_percent: float = Field(ge=0, le=100)
    status: str = "normal"  # normal, warning, breach
    last_breach: Optional[datetime] = None


class RiskOverview(BaseModel):
    """Complete risk overview for dashboard."""
    timestamp: datetime = Field(default_factory=datetime.now)
    
    # Risk metrics
    var_95: float = Field(description="Value at Risk at 95% confidence")
    var_99: float = Field(description="Value at Risk at 99% confidence")
    cvar_95: float = Field(description="Conditional VaR at 95% confidence")
    max_drawdown: float
    current_drawdown: float
    
    # Greeks
    aggregate_greeks: AggregateGreeks
    
    # Strategy health
    strategy_health: List[StrategyHealth]
    
    # Risk breakdowns
    risk_breakdowns: List[RiskBreakdown]
    
    # Factor trends
    factor_trends: List[FactorDecaying]
    
    # Risk limits
    risk_limits: List[RiskLimit]
    
    # Summary stats
    total_exposure: float
    concentration_score: float = Field(ge=0, le=100)
    risk_score: float = Field(ge=0, le=100)


class ScenarioAnalysis(BaseModel):
    """Scenario analysis results."""
    scenario_name: str
    description: str
    parameters: Dict[str, Any]
    
    # Impact metrics
    portfolio_impact: float
    portfolio_impact_percent: float
    var_impact: float
    
    # Detailed impacts
    position_impacts: List[Dict[str, float]]
    strategy_impacts: Dict[str, float]
    
    # Risk changes
    new_var_95: float
    new_var_99: float
    new_max_drawdown: float


class ConcentrationRisk(BaseModel):
    """Concentration risk analysis."""
    timestamp: datetime = Field(default_factory=datetime.now)
    
    # By instrument type
    instrument_concentration: Dict[str, float]
    
    # By underlying
    underlying_concentration: Dict[str, float]
    
    # By strategy
    strategy_concentration: Dict[str, float]
    
    # By expiry
    expiry_concentration: Dict[str, float]
    
    # Herfindahl index (0-10000)
    herfindahl_index: float = Field(ge=0, le=10000)
    
    # Top exposures
    top_exposures: List[Dict[str, Any]]


class HistoricalRisk(BaseModel):
    """Historical risk metrics."""
    timestamp: datetime
    var_95: float
    var_99: float
    cvar_95: float
    realized_volatility: float
    sharpe_ratio: float
    max_drawdown: float
    current_drawdown: float
    total_exposure: float
    net_delta: float
    net_gamma: float
    net_vega: float
    net_theta: float


class RiskAlert(BaseModel):
    """Risk alert/breach notification."""
    alert_id: str
    timestamp: datetime
    alert_type: str  # limit_breach, concentration, drawdown, var_breach
    severity: str  # info, warning, critical
    metric: str
    current_value: float
    threshold_value: float
    message: str
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None


class RiskSnapshot(BaseModel):
    """Complete risk snapshot for storage."""
    snapshot_id: str
    timestamp: datetime
    
    # Core metrics
    var_95: float
    var_99: float
    cvar_95: float
    max_drawdown: float
    current_drawdown: float
    
    # Greeks
    net_delta: float
    net_gamma: float
    net_vega: float
    net_theta: float
    
    # Exposures
    total_exposure: float
    long_exposure: float
    short_exposure: float
    net_exposure: float
    
    # Concentration
    herfindahl_index: float
    largest_position_percent: float
    
    # Performance
    sharpe_ratio: float
    sortino_ratio: float
    calmar_ratio: float
    
    # Metadata
    position_count: int
    strategy_count: int
    calculation_time_ms: int