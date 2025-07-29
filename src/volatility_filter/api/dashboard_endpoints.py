"""Enhanced dashboard API endpoints for Elastics platform."""

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import asyncio

from ..models.portfolio import (
    DashboardData, PortfolioAnalytics, PortfolioSummary,
    Position, PerformanceHistory, NewsItem, AIInsight,
    StrategyPerformance
)
from ..services.portfolio_analytics import (
    PortfolioAnalyticsService, NewsService, AIInsightService
)
from ..database import DatabaseManager


router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Initialize services
portfolio_service = PortfolioAnalyticsService()
news_service = NewsService()
insights_service = AIInsightService()


@router.get("/overview", response_model=DashboardData)
async def get_dashboard_overview():
    """Get complete dashboard data matching the design requirements."""
    
    try:
        # Get portfolio positions (mock data for now)
        positions = await get_mock_positions()
        
        # Get price history 
        price_history = await get_mock_price_history()
        
        # Calculate portfolio summary
        portfolio_summary = calculate_portfolio_summary(positions)
        
        # Calculate enhanced analytics
        portfolio_analytics = portfolio_service.calculate_portfolio_analytics(
            positions, price_history
        )
        
        # Generate performance history
        performance_history = portfolio_service.generate_performance_history(
            price_history, lookback_days=90
        )
        
        # Get news feed
        news_feed = news_service.generate_sample_news()
        
        # Get AI insights  
        ai_insights = insights_service.generate_sample_insights()
        
        # Calculate asset allocation
        asset_allocation = calculate_asset_allocation(positions)
        strategy_allocation = calculate_strategy_allocation(positions)
        
        # Market indicators
        market_indicators = get_market_indicators()
        
        return DashboardData(
            portfolio_summary=portfolio_summary,
            portfolio_analytics=portfolio_analytics,
            performance_history=performance_history,
            news_feed=news_feed,
            ai_insights=ai_insights,
            asset_allocation=asset_allocation,
            strategy_allocation=strategy_allocation,
            market_indicators=market_indicators
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating dashboard data: {str(e)}")


@router.get("/portfolio/analytics", response_model=PortfolioAnalytics)
async def get_portfolio_analytics():
    """Get detailed portfolio analytics."""
    
    try:
        positions = await get_mock_positions()
        price_history = await get_mock_price_history()
        
        analytics = portfolio_service.calculate_portfolio_analytics(
            positions, price_history
        )
        
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating analytics: {str(e)}")


@router.get("/performance/history", response_model=List[PerformanceHistory])
async def get_performance_history(days: Optional[int] = 252):
    """Get historical performance data."""
    
    try:
        price_history = await get_mock_price_history()
        
        history = portfolio_service.generate_performance_history(
            price_history, lookback_days=days
        )
        
        return history
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting performance history: {str(e)}")


@router.get("/strategies/performance", response_model=List[StrategyPerformance])
async def get_strategy_performance():
    """Get performance metrics for all strategies."""
    
    try:
        positions = await get_mock_positions()
        price_history = await get_mock_price_history()
        
        # Group positions by strategy
        strategies = {}
        for pos in positions:
            if 'strategy' in pos.instrument.lower():
                strategy_name = pos.instrument.split('-')[0]
                if strategy_name not in strategies:
                    strategies[strategy_name] = []
                strategies[strategy_name].append(pos)
        
        # Calculate performance for each strategy
        strategy_performances = []
        for strategy_name, strategy_positions in strategies.items():
            performance = portfolio_service.calculate_strategy_performance(
                strategy_name, strategy_positions, price_history
            )
            strategy_performances.append(performance)
        
        return strategy_performances
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating strategy performance: {str(e)}")


@router.get("/news", response_model=List[NewsItem])
async def get_news_feed(limit: Optional[int] = 10):
    """Get news feed items."""
    
    try:
        news_items = news_service.generate_sample_news()
        return news_items[:limit] if limit else news_items
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching news: {str(e)}")


@router.get("/insights", response_model=List[AIInsight])
async def get_ai_insights(priority: Optional[str] = None, limit: Optional[int] = 10):
    """Get AI-generated insights."""
    
    try:
        insights = insights_service.generate_sample_insights()
        
        if priority:
            insights = [i for i in insights if i.priority == priority]
        
        return insights[:limit] if limit else insights
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching insights: {str(e)}")


@router.post("/insights/{insight_id}/acknowledge")
async def acknowledge_insight(insight_id: str):
    """Mark an insight as acknowledged."""
    
    try:
        # In a real implementation, this would update the database
        return {"status": "acknowledged", "insight_id": insight_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error acknowledging insight: {str(e)}")


# Helper functions for mock data
async def get_mock_positions() -> List[Position]:
    """Generate mock positions for demonstration."""
    
    positions = [
        Position(
            instrument="BTC-29MAR24-50000-C",
            type="option",
            quantity=10,
            entry_price=2500,
            current_price=2800,
            value=28000,
            pnl=3000,
            pnl_percentage=12.0,
            delta=0.6,
            gamma=0.001,
            vega=15.2,
            theta=-12.5,
            iv=0.75
        ),
        Position(
            instrument="ETH-29MAR24-3000-P",
            type="option", 
            quantity=-5,
            entry_price=150,
            current_price=120,
            value=-600,
            pnl=150,
            pnl_percentage=20.0,
            delta=-0.3,
            gamma=0.002,
            vega=-8.5,
            theta=8.2,
            iv=0.65
        ),
        Position(
            instrument="BTC-PERP",
            type="future",
            quantity=2,
            entry_price=45000,
            current_price=47000,
            value=94000,
            pnl=4000,
            pnl_percentage=8.89,
            delta=2.0,
            gamma=0,
            vega=0,
            theta=0
        ),
        Position(
            instrument="Strategy-Alpha-01",
            type="option",
            quantity=1,
            entry_price=50000,
            current_price=52500,
            value=52500,
            pnl=2500,
            pnl_percentage=5.0,
            delta=0.25,
            gamma=0.0015,
            vega=12.8,
            theta=-8.5
        )
    ]
    
    return positions


async def get_mock_price_history() -> pd.DataFrame:
    """Generate mock price history."""
    
    dates = pd.date_range(start=datetime.now() - timedelta(days=365), end=datetime.now(), freq='D')
    
    # Generate realistic portfolio value trajectory
    np.random.seed(42)  # For reproducible results
    returns = np.random.normal(0.0008, 0.02, len(dates))  # Daily returns
    portfolio_values = 100000 * np.cumprod(1 + returns)
    
    return pd.DataFrame({
        'portfolio_value': portfolio_values
    }, index=dates)


def calculate_portfolio_summary(positions: List[Position]) -> PortfolioSummary:
    """Calculate portfolio summary from positions."""
    
    total_value = sum(pos.value for pos in positions)
    total_pnl = sum(pos.pnl for pos in positions)
    net_delta = sum(pos.delta or 0 for pos in positions)
    absolute_delta = sum(abs(pos.delta or 0) for pos in positions)
    gamma = sum(pos.gamma or 0 for pos in positions)
    vega = sum(pos.vega or 0 for pos in positions)
    theta = sum(pos.theta or 0 for pos in positions)
    
    total_pnl_percentage = (total_pnl / (total_value - total_pnl) * 100) if total_value != total_pnl else 0
    
    return PortfolioSummary(
        total_positions=len(positions),
        total_value=total_value,
        total_pnl=total_pnl,
        total_pnl_percentage=total_pnl_percentage,
        net_delta=net_delta,
        absolute_delta=absolute_delta,
        gamma=gamma,
        vega=vega,
        theta=theta
    )


def calculate_asset_allocation(positions: List[Position]) -> dict:
    """Calculate asset allocation breakdown."""
    
    allocation = {}
    total_value = sum(abs(pos.value) for pos in positions)
    
    for pos in positions:
        asset = pos.instrument.split('-')[0] if '-' in pos.instrument else pos.instrument
        if asset not in allocation:
            allocation[asset] = 0
        allocation[asset] += abs(pos.value) / total_value * 100
    
    return allocation


def calculate_strategy_allocation(positions: List[Position]) -> dict:
    """Calculate strategy allocation breakdown."""
    
    allocation = {}
    total_value = sum(abs(pos.value) for pos in positions)
    
    for pos in positions:
        if 'strategy' in pos.instrument.lower():
            strategy = pos.instrument
            if strategy not in allocation:
                allocation[strategy] = 0
            allocation[strategy] += abs(pos.value) / total_value * 100
        else:
            if 'Direct Positions' not in allocation:
                allocation['Direct Positions'] = 0
            allocation['Direct Positions'] += abs(pos.value) / total_value * 100
    
    return allocation


def get_market_indicators() -> dict:
    """Get market indicators."""
    
    return {
        'vix': 18.5,
        'btc_iv': 75.2,
        'eth_iv': 68.9,
        'skew_btc': 5.2,
        'skew_eth': 4.8,
        'funding_rate_btc': 0.01,
        'funding_rate_eth': 0.008
    }