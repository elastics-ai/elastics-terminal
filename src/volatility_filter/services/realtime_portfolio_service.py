"""Real-time portfolio update service for WebSocket broadcasting."""

import asyncio
import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from dataclasses import asdict

from ..websocket_server import WebSocketBroadcastServer
from ..portfolio_manager import PortfolioManager
from .portfolio_analytics import PortfolioAnalyticsService, NewsService, AIInsightService
from ..models.portfolio import DashboardData, PortfolioSummary
from ..database import DatabaseManager

logger = logging.getLogger(__name__)


class RealtimePortfolioService:
    """Service for broadcasting real-time portfolio updates via WebSocket."""
    
    def __init__(
        self,
        websocket_server: WebSocketBroadcastServer,
        portfolio_manager: PortfolioManager,
        db_path: str = "volatility_filter.db",
        update_interval: int = 5  # seconds
    ):
        self.websocket_server = websocket_server
        self.portfolio_manager = portfolio_manager
        self.db_path = db_path
        self.update_interval = update_interval
        
        # Services
        self.analytics_service = PortfolioAnalyticsService()
        self.news_service = NewsService()
        self.ai_insight_service = AIInsightService()
        
        # State tracking
        self.last_update_time = None
        self.last_portfolio_value = None
        self.last_pnl = None
        self.is_running = False
        self._update_task = None
        
    async def start(self):
        """Start the real-time update service."""
        if self.is_running:
            logger.warning("Real-time portfolio service is already running")
            return
            
        self.is_running = True
        logger.info(f"Starting real-time portfolio service with {self.update_interval}s intervals")
        
        # Start the update loop
        self._update_task = asyncio.create_task(self._update_loop())
        
    async def stop(self):
        """Stop the real-time update service."""
        self.is_running = False
        
        if self._update_task:
            self._update_task.cancel()
            try:
                await self._update_task
            except asyncio.CancelledError:
                pass
                
        logger.info("Real-time portfolio service stopped")
        
    async def _update_loop(self):
        """Main update loop that fetches data and broadcasts updates."""
        while self.is_running:
            try:
                await self._fetch_and_broadcast_updates()
                await asyncio.sleep(self.update_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in portfolio update loop: {e}")
                await asyncio.sleep(self.update_interval)
                
    async def _fetch_and_broadcast_updates(self):
        """Fetch latest portfolio data and broadcast updates."""
        try:
            # Get dashboard data
            dashboard_data = await self._get_dashboard_data()
            
            if not dashboard_data:
                return
                
            current_time = datetime.now()
            
            # Check if significant changes occurred
            portfolio_analytics = dashboard_data.portfolio_analytics
            current_value = portfolio_analytics.portfolio_value
            current_pnl = portfolio_analytics.cumulative_pnl
            
            # Always broadcast full portfolio update every minute
            if (self.last_update_time is None or 
                (current_time - self.last_update_time).total_seconds() >= 60):
                
                await self._broadcast_full_update(dashboard_data)
                self.last_update_time = current_time
                
            # Broadcast incremental updates for significant changes
            elif self._has_significant_change(current_value, current_pnl):
                await self._broadcast_incremental_update(dashboard_data)
                
            # Update state
            self.last_portfolio_value = current_value
            self.last_pnl = current_pnl
            
        except Exception as e:
            logger.error(f"Error fetching and broadcasting portfolio updates: {e}")
            
    async def _get_dashboard_data(self) -> Optional[DashboardData]:
        """Get comprehensive dashboard data."""
        try:
            # Get positions from portfolio manager
            positions = await asyncio.get_event_loop().run_in_executor(
                None, self.portfolio_manager.get_positions
            )
            
            if not positions:
                return None
                
            # Calculate portfolio summary
            total_positions = len(positions)
            total_value = sum(pos.value for pos in positions)
            total_pnl = sum(pos.pnl for pos in positions)
            total_pnl_percentage = (total_pnl / (total_value - total_pnl) * 100) if (total_value - total_pnl) != 0 else 0
            
            # Calculate Greeks
            net_delta = sum(pos.delta or 0 for pos in positions)
            absolute_delta = sum(abs(pos.delta or 0) for pos in positions)
            gamma = sum(pos.gamma or 0 for pos in positions)
            vega = sum(pos.vega or 0 for pos in positions)
            theta = sum(pos.theta or 0 for pos in positions)
            
            portfolio_summary = PortfolioSummary(
                total_positions=total_positions,
                total_value=total_value,
                total_pnl=total_pnl,
                total_pnl_percentage=total_pnl_percentage,
                net_delta=net_delta,
                absolute_delta=absolute_delta,
                gamma=gamma,
                vega=vega,
                theta=theta
            )
            
            # Generate mock price history for analytics (in production, this would come from database)
            price_history = self._generate_mock_price_history(total_value)
            
            # Calculate analytics
            portfolio_analytics = self.analytics_service.calculate_portfolio_analytics(
                positions, price_history
            )
            
            # Generate performance history
            performance_history = self.analytics_service.generate_performance_history(
                price_history, lookback_days=30
            )
            
            # Get news and insights
            news_feed = self.news_service.generate_sample_news()
            ai_insights = self.ai_insight_service.generate_sample_insights()
            
            # Generate asset allocation
            asset_allocation = self._calculate_asset_allocation(positions)
            strategy_allocation = self._calculate_strategy_allocation(positions)
            
            # Market indicators (mock data)
            market_indicators = {
                "vix": 18.5,
                "btc_iv": 75.2
            }
            
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
            logger.error(f"Error generating dashboard data: {e}")
            return None
            
    def _generate_mock_price_history(self, current_value: float) -> pd.DataFrame:
        """Generate mock price history for analytics calculations."""
        # Generate 30 days of mock data
        dates = pd.date_range(end=datetime.now(), periods=30, freq='D')
        
        # Simulate portfolio value changes (random walk with slight upward trend)
        np = pd.np if hasattr(pd, 'np') else __import__('numpy')
        returns = np.random.normal(0.001, 0.02, 30)  # 0.1% daily return, 2% volatility
        
        # Calculate portfolio values
        initial_value = current_value * 0.95  # Start 5% lower
        portfolio_values = [initial_value]
        
        for ret in returns[1:]:
            portfolio_values.append(portfolio_values[-1] * (1 + ret))
            
        # Ensure last value matches current
        portfolio_values[-1] = current_value
        
        return pd.DataFrame({
            'portfolio_value': portfolio_values
        }, index=dates)
        
    def _calculate_asset_allocation(self, positions) -> Dict[str, float]:
        """Calculate asset allocation percentages."""
        total_value = sum(pos.value for pos in positions)
        if total_value == 0:
            return {}
            
        allocation = {}
        for pos in positions:
            # Simplified asset classification
            asset_type = "Other"
            instrument = pos.instrument.upper()
            
            if "BTC" in instrument:
                asset_type = "BTC"
            elif "ETH" in instrument:
                asset_type = "ETH"
            elif "OPTION" in instrument:
                asset_type = "Options"
            elif "CASH" in instrument:
                asset_type = "Cash"
                
            if asset_type not in allocation:
                allocation[asset_type] = 0
            allocation[asset_type] += pos.value
            
        # Convert to percentages
        for asset_type in allocation:
            allocation[asset_type] = (allocation[asset_type] / total_value) * 100
            
        return allocation
        
    def _calculate_strategy_allocation(self, positions) -> Dict[str, float]:
        """Calculate strategy allocation percentages."""
        total_value = sum(pos.value for pos in positions)
        if total_value == 0:
            return {}
            
        allocation = {}
        for pos in positions:
            # Simplified strategy classification
            strategy = "Direct Positions"
            instrument = pos.instrument.upper()
            
            if "STRATEGY" in instrument or "ALPHA" in instrument:
                strategy = pos.instrument
                
            if strategy not in allocation:
                allocation[strategy] = 0
            allocation[strategy] += pos.value
            
        # Convert to percentages
        for strategy in allocation:
            allocation[strategy] = (allocation[strategy] / total_value) * 100
            
        return allocation
        
    def _has_significant_change(self, current_value: float, current_pnl: float) -> bool:
        """Check if portfolio has significant changes worth broadcasting."""
        if self.last_portfolio_value is None or self.last_pnl is None:
            return True
            
        # Check for 0.5% value change or $1000 PnL change
        value_change_pct = abs(current_value - self.last_portfolio_value) / self.last_portfolio_value * 100
        pnl_change = abs(current_pnl - self.last_pnl)
        
        return value_change_pct > 0.5 or pnl_change > 1000
        
    async def _broadcast_full_update(self, dashboard_data: DashboardData):
        """Broadcast full portfolio update."""
        try:
            # Convert to dict for JSON serialization
            dashboard_dict = asdict(dashboard_data)
            
            # Broadcast different event types
            self.websocket_server.broadcast_portfolio_update({
                "portfolio_summary": dashboard_dict["portfolio_summary"],
                "asset_allocation": dashboard_dict["asset_allocation"],
                "strategy_allocation": dashboard_dict["strategy_allocation"]
            })
            
            self.websocket_server.broadcast_portfolio_analytics(
                dashboard_dict["portfolio_analytics"]
            )
            
            self.websocket_server.broadcast_performance_update({
                "performance_history": dashboard_dict["performance_history"][-10:],  # Last 10 days
                "market_indicators": dashboard_dict["market_indicators"]
            })
            
            self.websocket_server.broadcast_news_update({
                "news_feed": dashboard_dict["news_feed"][:3]  # Latest 3 news items
            })
            
            # Check for unacknowledged insights
            unacknowledged_insights = [
                insight for insight in dashboard_data.ai_insights 
                if not insight.acknowledged
            ]
            
            if unacknowledged_insights:
                self.websocket_server.broadcast_ai_insight({
                    "insights": [asdict(insight) for insight in unacknowledged_insights[:2]]
                })
                
            logger.debug("Broadcasted full portfolio update")
            
        except Exception as e:
            logger.error(f"Error broadcasting full update: {e}")
            
    async def _broadcast_incremental_update(self, dashboard_data: DashboardData):
        """Broadcast incremental portfolio update for significant changes."""
        try:
            # Broadcast only essential metrics for frequent updates
            self.websocket_server.broadcast_portfolio_analytics({
                "portfolio_value": dashboard_data.portfolio_analytics.portfolio_value,
                "cumulative_pnl": dashboard_data.portfolio_analytics.cumulative_pnl,
                "cumulative_return": dashboard_data.portfolio_analytics.cumulative_return,
                "net_delta": dashboard_data.portfolio_analytics.net_delta,
                "net_gamma": dashboard_data.portfolio_analytics.net_gamma,
                "net_vega": dashboard_data.portfolio_analytics.net_vega,
                "net_theta": dashboard_data.portfolio_analytics.net_theta,
                "update_type": "incremental"
            })
            
            logger.debug("Broadcasted incremental portfolio update")
            
        except Exception as e:
            logger.error(f"Error broadcasting incremental update: {e}")
            
    def force_update(self):
        """Force an immediate update broadcast."""
        if self.is_running:
            # Reset last update time to force full update
            self.last_update_time = None
            logger.info("Forced portfolio update triggered")
            
    def get_stats(self) -> Dict[str, Any]:
        """Get service statistics."""
        return {
            "is_running": self.is_running,
            "update_interval": self.update_interval,
            "last_update_time": self.last_update_time.isoformat() if self.last_update_time else None,
            "last_portfolio_value": self.last_portfolio_value,
            "last_pnl": self.last_pnl,
            "websocket_clients": self.websocket_server.get_client_count(),
            "subscription_stats": self.websocket_server.get_subscription_stats()
        }