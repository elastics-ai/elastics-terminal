"""
API endpoints for volatility surface and Greeks calculations
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List, Any, Optional
import numpy as np
from datetime import datetime
from pydantic import BaseModel

from ..services.ssvi_service import SSVIService
from ..services.greeks_service import GreeksService
from options.bookkeeper import Bookkeeper


class TargetGreeks(BaseModel):
    delta: float
    gamma: float
    vega: float
    theta: float
    rho: float


class OptimizationConstraints(BaseModel):
    maxPositionSize: int
    minPositionSize: int
    allowedInstruments: List[str]


class OptimizationRequest(BaseModel):
    targetGreeks: TargetGreeks
    currentGreeks: TargetGreeks
    maxCost: float
    constraints: OptimizationConstraints

router = APIRouter(prefix="/api/volatility", tags=["volatility"])

# Service instances
ssvi_service = SSVIService()
greeks_service = GreeksService()
# bookkeeper_service = BookkeeperService()


@router.post("/surface/calibrate")
async def calibrate_volatility_surface(data: Dict[str, Any]):
    """
    Calibrate SSVI volatility surface to market data
    """
    try:
        strikes = np.array(data['strikes'])
        expiries = np.array(data['expiries'])
        implied_vols = np.array(data['implied_vols'])
        spot = data.get('spot', 1.0)
        risk_free_rate = data.get('risk_free_rate', 0.0)
        
        result = ssvi_service.calibrate_surface(
            strikes=strikes,
            expiries=expiries,
            implied_vols=implied_vols,
            spot=spot,
            risk_free_rate=risk_free_rate
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/surface/display")
async def get_volatility_surface_display(
    spot: float = 100,
    min_strike: float = 80,
    max_strike: float = 120,
    min_expiry: float = 0.0833,  # 1 month
    max_expiry: float = 1.0,      # 1 year
    n_strikes: int = 50,
    n_expiries: int = 50
):
    """
    Get volatility surface data for 3D visualization
    """
    try:
        if ssvi_service.ssvi_model is None:
            raise HTTPException(
                status_code=400, 
                detail="Surface not calibrated. Call /surface/calibrate first."
            )
        
        result = ssvi_service.get_surface_for_display(
            strike_range=(min_strike, max_strike),
            expiry_range=(min_expiry, max_expiry),
            spot=spot,
            n_strikes=n_strikes,
            n_expiries=n_expiries
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/surface/arbitrage-check")
async def check_surface_arbitrage():
    """
    Check for arbitrage violations in the calibrated surface
    """
    try:
        if ssvi_service.ssvi_model is None:
            raise HTTPException(
                status_code=400,
                detail="Surface not calibrated. Call /surface/calibrate first."
            )
        
        return ssvi_service.check_arbitrage()
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/greeks/calculate")
async def calculate_option_greeks(data: Dict[str, Any]):
    """
    Calculate Greeks for a single option
    """
    try:
        greeks = greeks_service.calculate_option_greeks(
            spot=data['spot'],
            strike=data['strike'],
            time_to_expiry=data['time_to_expiry'],
            volatility=data['volatility'],
            risk_free_rate=data.get('risk_free_rate', 0.0),
            dividend_yield=data.get('dividend_yield', 0.0),
            option_type=data.get('option_type', 'call')
        )
        
        return greeks
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/greeks/portfolio")
async def calculate_portfolio_greeks(positions: List[Dict[str, Any]]):
    """
    Calculate aggregate Greeks for a portfolio
    """
    try:
        aggregate_greeks = greeks_service.aggregate_portfolio_greeks(positions)
        return aggregate_greeks
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/greeks/surface/{greek}")
async def get_greeks_surface(
    greek: str,
    spot: float = 100,
    min_strike: float = 80,
    max_strike: float = 120,
    min_expiry: float = 0.0833,
    max_expiry: float = 1.0,
    volatility: float = 0.25,
    option_type: str = 'call'
):
    """
    Get surface data for a specific Greek
    """
    try:
        result = greeks_service.calculate_greeks_surface(
            spot=spot,
            strike_range=(min_strike, max_strike),
            expiry_range=(min_expiry, max_expiry),
            volatility=volatility,
            n_strikes=30,
            n_expiries=30,
            greek=greek,
            option_type=option_type
        )
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bookkeeper/optimize")
async def optimize_portfolio(request: OptimizationRequest):
    """
    Optimize portfolio to meet target Greeks
    """
    try:
        # TODO: Get actual portfolio positions from database
        positions = []
        
        # Market data
        market_data = {
            "spot": 4500,
            "risk_free_rate": 0.05,
            "volatility": 0.20
        }
        
        # TODO: Implement bookkeeper optimization
        # For now, using mock data
        
        # Return mock data for now
        return {
            "status": "success",
            "suggestedTrades": [
                {
                    "id": "trade1",
                    "instrument": "SPX 4500C 2024-03-15",
                    "type": "BUY",
                    "quantity": 10,
                    "price": 45.50,
                    "greekImpact": {
                        "delta": 0.15,
                        "gamma": 0.02,
                        "vega": 5.5,
                        "theta": -2.1,
                        "rho": 3.2
                    },
                    "cost": 4550.00
                },
                {
                    "id": "trade2",
                    "instrument": "SPX 4400P 2024-03-15",
                    "type": "SELL",
                    "quantity": 5,
                    "price": 38.20,
                    "greekImpact": {
                        "delta": -0.08,
                        "gamma": -0.01,
                        "vega": -3.2,
                        "theta": 1.5,
                        "rho": -1.8
                    },
                    "cost": -1910.00
                }
            ],
            "newGreeks": {
                "delta": request.targetGreeks.delta,
                "gamma": request.targetGreeks.gamma,
                "vega": request.targetGreeks.vega,
                "theta": request.targetGreeks.theta,
                "rho": request.targetGreeks.rho
            },
            "cost": 2640.00
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bookkeeper/rebalancing-schedule")
async def get_rebalancing_schedule(data: Dict[str, Any]):
    """
    Calculate optimal rebalancing frequency
    """
    try:
        current_exposure = data['current_exposure']
        target_ranges = data['target_ranges']
        volatility_regime = data.get('volatility_regime', 'normal')
        
        # TODO: Implement rebalancing schedule
        result = {"status": "success", "schedule": [], "message": "Mock implementation"}
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bookkeeper/trade-impact")
async def analyze_trade_impact(data: Dict[str, Any]):
    """
    Analyze the impact of proposed trades
    """
    try:
        trades = data['trades']
        current_portfolio = data['current_portfolio']
        
        # TODO: Implement trade impact analysis  
        result = {"status": "success", "impact": {}, "message": "Mock implementation"}
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))