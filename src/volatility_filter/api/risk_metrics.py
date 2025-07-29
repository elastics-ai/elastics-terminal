"""
Risk metrics API endpoints for portfolio risk analysis
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
import random

router = APIRouter(prefix="/api/risk", tags=["risk"])

class RiskCategory(BaseModel):
    category: str
    subcategory: str
    value: float  # 0-1 scale
    label: str

class Greek(BaseModel):
    name: str
    value: float
    change: float
    change_percent: float
    description: str

class PortfolioMetrics(BaseModel):
    total_value: float
    value_at_risk: float
    stress_test_loss: float
    sharpe_ratio: float
    max_drawdown: float
    volatility: float
    updated_at: datetime

class RiskBreakdownResponse(BaseModel):
    risk_data: List[RiskCategory]
    updated_at: datetime

class GreeksResponse(BaseModel):
    greeks: List[Greek]
    aggregate_value: float
    updated_at: datetime

class StrategyHealth(BaseModel):
    strategy_name: str
    health_score: int  # 0-100
    status: str  # healthy, warning, critical
    issues: List[str]

@router.get("/breakdown", response_model=RiskBreakdownResponse)
async def get_risk_breakdown():
    """Get portfolio risk breakdown by category"""
    
    risk_data = [
        # Market Risk
        RiskCategory(category="Market Risk", subcategory="Delta", value=0.75, label="High"),
        RiskCategory(category="Market Risk", subcategory="Gamma", value=0.45, label="Medium"),
        RiskCategory(category="Market Risk", subcategory="Vega", value=0.85, label="Critical"),
        RiskCategory(category="Market Risk", subcategory="Theta", value=0.25, label="Low"),
        
        # Credit Risk
        RiskCategory(category="Credit Risk", subcategory="Counterparty", value=0.65, label="High"),
        RiskCategory(category="Credit Risk", subcategory="Settlement", value=0.35, label="Medium"),
        RiskCategory(category="Credit Risk", subcategory="Collateral", value=0.45, label="Medium"),
        RiskCategory(category="Credit Risk", subcategory="Concentration", value=0.55, label="Medium"),
        
        # Operational Risk
        RiskCategory(category="Operational Risk", subcategory="System", value=0.15, label="Low"),
        RiskCategory(category="Operational Risk", subcategory="Process", value=0.55, label="Medium"),
        RiskCategory(category="Operational Risk", subcategory="Model", value=0.35, label="Medium"),
        RiskCategory(category="Operational Risk", subcategory="Regulatory", value=0.25, label="Low"),
        
        # Liquidity Risk
        RiskCategory(category="Liquidity Risk", subcategory="Funding", value=0.45, label="Medium"),
        RiskCategory(category="Liquidity Risk", subcategory="Market", value=0.65, label="High"),
        RiskCategory(category="Liquidity Risk", subcategory="Asset", value=0.35, label="Medium"),
        RiskCategory(category="Liquidity Risk", subcategory="Contingent", value=0.55, label="Medium")
    ]
    
    return RiskBreakdownResponse(
        risk_data=risk_data,
        updated_at=datetime.now()
    )

@router.get("/greeks", response_model=GreeksResponse)
async def get_portfolio_greeks():
    """Get portfolio Greeks with real-time updates"""
    
    greeks = [
        Greek(
            name="Delta",
            value=125000,
            change=15000,
            change_percent=13.6,
            description="Rate of change of option price with respect to underlying"
        ),
        Greek(
            name="Gamma",
            value=8500,
            change=-1200,
            change_percent=-12.4,
            description="Rate of change of delta with respect to underlying"
        ),
        Greek(
            name="Vega",
            value=45000,
            change=5000,
            change_percent=12.5,
            description="Sensitivity to volatility changes"
        ),
        Greek(
            name="Theta",
            value=-12000,
            change=-2000,
            change_percent=20.0,
            description="Time decay of option value"
        ),
        Greek(
            name="Rho",
            value=3500,
            change=500,
            change_percent=16.7,
            description="Sensitivity to interest rate changes"
        )
    ]
    
    # Add some randomness to simulate real-time updates
    for greek in greeks:
        greek.value += random.uniform(-100, 100)
        greek.change += random.uniform(-50, 50)
    
    aggregate_value = sum(abs(g.value) for g in greeks)
    
    return GreeksResponse(
        greeks=greeks,
        aggregate_value=aggregate_value,
        updated_at=datetime.now()
    )

@router.get("/portfolio-metrics", response_model=PortfolioMetrics)
async def get_portfolio_metrics():
    """Get overall portfolio risk metrics"""
    
    # Mock data with some randomness
    base_value = 15250000
    
    metrics = PortfolioMetrics(
        total_value=base_value + random.uniform(-100000, 100000),
        value_at_risk=2100000 + random.uniform(-50000, 50000),
        stress_test_loss=-850000 + random.uniform(-20000, 20000),
        sharpe_ratio=1.25 + random.uniform(-0.1, 0.1),
        max_drawdown=-0.18 + random.uniform(-0.02, 0.02),
        volatility=0.24 + random.uniform(-0.02, 0.02),
        updated_at=datetime.now()
    )
    
    return metrics

@router.get("/strategy-health")
async def get_strategy_health():
    """Get health scores for all active strategies"""
    
    strategies = [
        StrategyHealth(
            strategy_name="Market Making Strategy",
            health_score=85,
            status="healthy",
            issues=[]
        ),
        StrategyHealth(
            strategy_name="Arbitrage Strategy",
            health_score=65,
            status="warning",
            issues=["Spread compression detected", "Execution latency increasing"]
        ),
        StrategyHealth(
            strategy_name="Momentum Strategy",
            health_score=35,
            status="critical",
            issues=["Drawdown exceeds threshold", "Win rate below target", "Risk limits breached"]
        ),
        StrategyHealth(
            strategy_name="Mean Reversion Strategy",
            health_score=72,
            status="healthy",
            issues=["Minor correlation drift"]
        )
    ]
    
    return {
        "strategies": strategies,
        "overall_health": sum(s.health_score for s in strategies) / len(strategies),
        "updated_at": datetime.now().isoformat()
    }

@router.get("/risk-limits")
async def get_risk_limits():
    """Get current risk limits and usage"""
    
    limits = {
        "position_limits": {
            "btc_options": {"limit": 1000000, "used": 750000, "percentage": 75},
            "eth_options": {"limit": 500000, "used": 320000, "percentage": 64},
            "prediction_markets": {"limit": 250000, "used": 180000, "percentage": 72}
        },
        "greek_limits": {
            "delta": {"limit": 200000, "used": 125000, "percentage": 62.5},
            "gamma": {"limit": 10000, "used": 8500, "percentage": 85},
            "vega": {"limit": 50000, "used": 45000, "percentage": 90},
            "theta": {"limit": -15000, "used": -12000, "percentage": 80}
        },
        "var_limit": {
            "limit": 2500000,
            "used": 2100000,
            "percentage": 84
        },
        "updated_at": datetime.now().isoformat()
    }
    
    return limits

@router.post("/calculate-var")
async def calculate_value_at_risk(
    confidence_level: float = Query(0.95, description="Confidence level (0.95 = 95%)"),
    time_horizon: int = Query(1, description="Time horizon in days"),
    method: str = Query("historical", description="VaR calculation method")
):
    """Calculate Value at Risk for the portfolio"""
    
    # Mock VaR calculation
    portfolio_value = 15250000
    
    if method == "historical":
        var = portfolio_value * 0.138  # ~13.8% based on historical data
    elif method == "parametric":
        var = portfolio_value * 0.145  # Slightly higher for parametric
    elif method == "monte_carlo":
        var = portfolio_value * 0.142  # Monte Carlo simulation result
    else:
        raise HTTPException(status_code=400, detail="Invalid VaR method")
    
    return {
        "value_at_risk": var,
        "confidence_level": confidence_level,
        "time_horizon": time_horizon,
        "method": method,
        "portfolio_value": portfolio_value,
        "var_percentage": (var / portfolio_value) * 100,
        "calculated_at": datetime.now().isoformat()
    }

@router.get("/historical-risk")
async def get_historical_risk_metrics(
    days: int = Query(30, description="Number of days to look back")
):
    """Get historical risk metrics over specified time period"""
    
    # Generate mock historical data
    historical_data = []
    
    for i in range(days):
        date = datetime.now() - timedelta(days=i)
        historical_data.append({
            "date": date.date().isoformat(),
            "var": 2100000 + random.uniform(-200000, 200000),
            "sharpe_ratio": 1.25 + random.uniform(-0.3, 0.3),
            "max_drawdown": -0.18 + random.uniform(-0.05, 0.05),
            "volatility": 0.24 + random.uniform(-0.04, 0.04)
        })
    
    return {
        "data": historical_data,
        "period_days": days,
        "updated_at": datetime.now().isoformat()
    }