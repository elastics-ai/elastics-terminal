"""Portfolio analytics service for calculating performance metrics."""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from ..models.portfolio import (
    PortfolioAnalytics, StrategyPerformance, PerformanceHistory,
    Position, DashboardData, PortfolioSummary, NewsItem, AIInsight
)
from ..database import DatabaseManager


@dataclass
class RiskMetrics:
    """Risk calculation results."""
    var_95: float
    cvar_95: float
    max_drawdown: float
    sharpe_ratio: float
    sortino_ratio: float
    beta: float
    alpha: float
    annual_volatility: float


class PortfolioAnalyticsService:
    """Service for calculating portfolio performance and risk metrics."""
    
    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.risk_free_rate = 0.02  # 2% annual risk-free rate
        self.trading_days_per_year = 252
        self.db = db_manager or DatabaseManager()
    
    def calculate_portfolio_analytics(
        self,
        positions: List[Position],
        price_history: pd.DataFrame,
        benchmark_history: Optional[pd.DataFrame] = None
    ) -> PortfolioAnalytics:
        """Calculate comprehensive portfolio analytics."""
        
        # Calculate current portfolio value and Greeks
        total_value = sum(pos.value for pos in positions)
        net_delta = sum(pos.delta or 0 for pos in positions)
        net_gamma = sum(pos.gamma or 0 for pos in positions)
        net_vega = sum(pos.vega or 0 for pos in positions)
        net_theta = sum(pos.theta or 0 for pos in positions)
        
        # Calculate performance metrics from price history
        returns = self._calculate_returns(price_history)
        risk_metrics = self._calculate_risk_metrics(returns, benchmark_history)
        
        # Calculate cumulative metrics
        cumulative_return = (price_history['portfolio_value'].iloc[-1] / 
                           price_history['portfolio_value'].iloc[0] - 1) * 100
        
        cumulative_pnl = price_history['portfolio_value'].iloc[-1] - price_history['portfolio_value'].iloc[0]
        
        return PortfolioAnalytics(
            portfolio_value=total_value,
            cumulative_pnl=cumulative_pnl,
            cumulative_return=cumulative_return,
            annual_return=risk_metrics.alpha * 100,
            max_drawdown=risk_metrics.max_drawdown * 100,
            annual_volatility=risk_metrics.annual_volatility * 100,
            active_strategies=len(set(pos.instrument for pos in positions if 'strategy' in pos.instrument.lower())),
            var_95=risk_metrics.var_95,
            cvar_95=risk_metrics.cvar_95,
            beta=risk_metrics.beta,
            alpha=risk_metrics.alpha,
            sharpe_ratio=risk_metrics.sharpe_ratio,
            sortino_ratio=risk_metrics.sortino_ratio,
            calmar_ratio=risk_metrics.alpha / abs(risk_metrics.max_drawdown) if risk_metrics.max_drawdown != 0 else 0,
            net_delta=net_delta,
            net_gamma=net_gamma,
            net_vega=net_vega,
            net_theta=net_theta
        )
    
    def calculate_strategy_performance(
        self,
        strategy_name: str,
        strategy_positions: List[Position],
        price_history: pd.DataFrame
    ) -> StrategyPerformance:
        """Calculate performance metrics for a specific strategy."""
        
        if strategy_positions:
            strategy_value = sum(pos.value for pos in strategy_positions)
            strategy_pnl = sum(pos.pnl for pos in strategy_positions)
            
            # Filter price history for this strategy
            strategy_returns = self._calculate_strategy_returns(strategy_name, price_history)
            
            if len(strategy_returns) > 0:
                total_return = strategy_returns.sum()
                annual_return = self._annualize_return(strategy_returns)
                volatility = strategy_returns.std() * np.sqrt(self.trading_days_per_year)
                max_dd = self._calculate_max_drawdown(strategy_returns)
                sharpe = self._calculate_sharpe_ratio(strategy_returns)
                sortino = self._calculate_sortino_ratio(strategy_returns)
                
                # Calculate win rate
                profitable_trades = (strategy_returns > 0).sum()
                total_trades = len(strategy_returns)
                win_rate = (profitable_trades / total_trades * 100) if total_trades > 0 else 0
                
                # Calculate profit factor
                gross_profit = strategy_returns[strategy_returns > 0].sum()
                gross_loss = abs(strategy_returns[strategy_returns < 0].sum())
                profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else 0
                
            else:
                total_return = annual_return = volatility = max_dd = 0
                sharpe = sortino = win_rate = profit_factor = 0
        else:
            total_return = annual_return = volatility = max_dd = 0
            sharpe = sortino = win_rate = profit_factor = 0
        
        return StrategyPerformance(
            strategy_name=strategy_name,
            total_return=total_return * 100,
            cumulative_return=total_return * 100,
            annual_return=annual_return * 100,
            max_drawdown=max_dd * 100,
            sharpe_ratio=sharpe,
            sortino_ratio=sortino,
            annual_volatility=volatility * 100,
            win_rate=win_rate,
            profit_factor=profit_factor,
            active=len(strategy_positions) > 0
        )
    
    def generate_performance_history(
        self,
        price_history: pd.DataFrame,
        lookback_days: int = 252
    ) -> List[PerformanceHistory]:
        """Generate historical performance data points."""
        
        # Ensure we have a datetime index
        if not isinstance(price_history.index, pd.DatetimeIndex):
            price_history.index = pd.to_datetime(price_history.index)
        
        # Limit to lookback period
        cutoff_date = datetime.now() - timedelta(days=lookback_days)
        recent_history = price_history[price_history.index >= cutoff_date].copy()
        
        if len(recent_history) == 0:
            return []
        
        # Calculate metrics
        recent_history['daily_return'] = recent_history['portfolio_value'].pct_change()
        recent_history['cumulative_return'] = (
            recent_history['portfolio_value'] / recent_history['portfolio_value'].iloc[0] - 1
        ) * 100
        
        # Calculate rolling drawdown
        recent_history['peak'] = recent_history['portfolio_value'].expanding().max()
        recent_history['drawdown'] = (
            (recent_history['portfolio_value'] - recent_history['peak']) / recent_history['peak']
        ) * 100
        
        # Calculate rolling volatility (20-day)
        recent_history['volatility'] = (
            recent_history['daily_return'].rolling(20).std() * np.sqrt(self.trading_days_per_year) * 100
        )
        
        # Convert to PerformanceHistory objects
        history_points = []
        for date, row in recent_history.iterrows():
            if pd.isna(row['daily_return']):
                continue
                
            history_points.append(PerformanceHistory(
                date=date,
                portfolio_value=row['portfolio_value'],
                daily_return=row['daily_return'] * 100,
                cumulative_return=row['cumulative_return'],
                drawdown=row['drawdown'],
                volatility=row['volatility'] if not pd.isna(row['volatility']) else 0,
                benchmark_return=0  # TODO: Add benchmark comparison
            ))
        
        return history_points
    
    def _calculate_returns(self, price_history: pd.DataFrame) -> pd.Series:
        """Calculate daily returns from price history."""
        return price_history['portfolio_value'].pct_change().dropna()
    
    def _calculate_strategy_returns(self, strategy_name: str, price_history: pd.DataFrame) -> pd.Series:
        """Calculate returns for a specific strategy."""
        # This would be implemented based on how strategy data is stored
        # For now, return overall portfolio returns
        return self._calculate_returns(price_history)
    
    def _calculate_risk_metrics(
        self,
        returns: pd.Series,
        benchmark_returns: Optional[pd.DataFrame] = None
    ) -> RiskMetrics:
        """Calculate comprehensive risk metrics."""
        
        if len(returns) == 0:
            return RiskMetrics(0, 0, 0, 0, 0, 0, 0, 0)
        
        # VaR and CVaR at 95% confidence
        var_95 = np.percentile(returns, 5)  # 5th percentile for 95% VaR
        cvar_95 = returns[returns <= var_95].mean()
        
        # Maximum drawdown
        cumulative = (1 + returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = drawdown.min()
        
        # Sharpe ratio
        excess_returns = returns - self.risk_free_rate / self.trading_days_per_year
        sharpe_ratio = (
            excess_returns.mean() / excess_returns.std() * np.sqrt(self.trading_days_per_year)
            if excess_returns.std() > 0 else 0
        )
        
        # Sortino ratio
        negative_returns = returns[returns < 0]
        downside_deviation = negative_returns.std() if len(negative_returns) > 0 else 0
        sortino_ratio = (
            excess_returns.mean() / downside_deviation * np.sqrt(self.trading_days_per_year)
            if downside_deviation > 0 else 0
        )
        
        # Beta and Alpha (vs benchmark)
        beta = alpha = 0
        if benchmark_returns is not None and len(benchmark_returns) > 0:
            # Align returns with benchmark
            aligned_data = pd.concat([returns, benchmark_returns], axis=1).dropna()
            if len(aligned_data) > 1:
                portfolio_rets = aligned_data.iloc[:, 0]
                benchmark_rets = aligned_data.iloc[:, 1]
                
                covariance = np.cov(portfolio_rets, benchmark_rets)[0, 1]
                benchmark_variance = np.var(benchmark_rets)
                
                beta = covariance / benchmark_variance if benchmark_variance > 0 else 0
                alpha = portfolio_rets.mean() - beta * benchmark_rets.mean()
        
        # Annual volatility
        annual_volatility = returns.std() * np.sqrt(self.trading_days_per_year)
        
        return RiskMetrics(
            var_95=var_95,
            cvar_95=cvar_95,
            max_drawdown=max_drawdown,
            sharpe_ratio=sharpe_ratio,
            sortino_ratio=sortino_ratio,
            beta=beta,
            alpha=alpha,
            annual_volatility=annual_volatility
        )
    
    def save_portfolio_metrics_to_db(
        self,
        analytics: PortfolioAnalytics,
        positions: List[Position],
        timestamp: Optional[int] = None
    ) -> bool:
        """Save portfolio metrics to database."""
        if timestamp is None:
            timestamp = int(datetime.now().timestamp() * 1000)
        
        metrics_data = {
            "timestamp": timestamp,
            "portfolio_value": analytics.portfolio_value,
            "daily_pnl": 0,  # Would be calculated from previous day
            "daily_return": 0,  # Would be calculated from previous day  
            "cumulative_pnl": analytics.cumulative_pnl,
            "cumulative_return": analytics.cumulative_return,
            "annual_return": analytics.annual_return,
            "annual_volatility": analytics.annual_volatility,
            "max_drawdown": analytics.max_drawdown,
            "var_95": analytics.var_95,
            "cvar_95": analytics.cvar_95,
            "beta": analytics.beta,
            "alpha": analytics.alpha,
            "sharpe_ratio": 0,  # Would be calculated from risk metrics
            "net_delta": analytics.net_delta,
            "net_gamma": analytics.net_gamma,
            "net_vega": analytics.net_vega,
            "net_theta": analytics.net_theta,
            "active_positions": len(positions),
            "active_strategies": analytics.active_strategies
        }
        
        result = self.db.insert_portfolio_metrics(metrics_data)
        return result is not None

    def save_portfolio_snapshot(
        self,
        positions: List[Position],
        analytics: PortfolioAnalytics,
        snapshot_type: str = "real_time",
        timestamp: Optional[int] = None
    ) -> bool:
        """Save complete portfolio snapshot to database."""
        if timestamp is None:
            timestamp = int(datetime.now().timestamp() * 1000)
        
        # Prepare portfolio data
        portfolio_data = {
            "positions": [
                {
                    "instrument": pos.instrument,
                    "type": pos.type,
                    "quantity": pos.quantity,
                    "entry_price": pos.entry_price,
                    "current_price": pos.current_price,
                    "value": pos.value,
                    "pnl": pos.pnl,
                    "pnl_percentage": pos.pnl_percentage,
                    "delta": pos.delta,
                    "gamma": pos.gamma,
                    "vega": pos.vega,
                    "theta": pos.theta,
                    "iv": pos.iv
                }
                for pos in positions
            ],
            "total_positions": len(positions),
            "total_value": analytics.portfolio_value
        }
        
        # Prepare risk metrics
        risk_metrics = {
            "var_95": analytics.var_95,
            "cvar_95": analytics.cvar_95,
            "max_drawdown": analytics.max_drawdown,
            "beta": analytics.beta,
            "alpha": analytics.alpha,
            "net_delta": analytics.net_delta,
            "net_gamma": analytics.net_gamma,
            "net_vega": analytics.net_vega,
            "net_theta": analytics.net_theta
        }
        
        # Prepare performance metrics
        performance_metrics = {
            "cumulative_pnl": analytics.cumulative_pnl,
            "cumulative_return": analytics.cumulative_return,
            "annual_return": analytics.annual_return,
            "annual_volatility": analytics.annual_volatility
        }
        
        # Calculate allocations
        allocation_data = self._calculate_allocations(positions)
        
        snapshot_data = {
            "timestamp": timestamp,
            "snapshot_type": snapshot_type,
            "portfolio_data": portfolio_data,
            "risk_metrics": risk_metrics,
            "performance_metrics": performance_metrics,
            "allocation_data": allocation_data
        }
        
        result = self.db.insert_portfolio_snapshot(snapshot_data)
        return result is not None

    def _calculate_allocations(self, positions: List[Position]) -> Dict[str, Dict]:
        """Calculate asset and strategy allocations."""
        total_value = sum(abs(pos.value) for pos in positions)
        if total_value == 0:
            return {"asset_allocation": {}, "strategy_allocation": {}}
        
        # Asset allocation
        asset_allocation = {}
        for pos in positions:
            asset = pos.instrument.split('-')[0] if '-' in pos.instrument else pos.instrument
            if asset not in asset_allocation:
                asset_allocation[asset] = 0
            asset_allocation[asset] += abs(pos.value) / total_value * 100
        
        # Strategy allocation
        strategy_allocation = {}
        for pos in positions:
            if 'strategy' in pos.instrument.lower():
                strategy = pos.instrument
                if strategy not in strategy_allocation:
                    strategy_allocation[strategy] = 0
                strategy_allocation[strategy] += abs(pos.value) / total_value * 100
            else:
                if 'Direct Positions' not in strategy_allocation:
                    strategy_allocation['Direct Positions'] = 0
                strategy_allocation['Direct Positions'] += abs(pos.value) / total_value * 100
        
        return {
            "asset_allocation": asset_allocation,
            "strategy_allocation": strategy_allocation
        }
    
    def _annualize_return(self, returns: pd.Series) -> float:
        """Annualize returns."""
        if len(returns) == 0:
            return 0
        total_return = (1 + returns).prod() - 1
        years = len(returns) / self.trading_days_per_year
        return (1 + total_return) ** (1 / years) - 1 if years > 0 else 0
    
    def _calculate_max_drawdown(self, returns: pd.Series) -> float:
        """Calculate maximum drawdown."""
        cumulative = (1 + returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        return drawdown.min()
    
    def _calculate_sharpe_ratio(self, returns: pd.Series) -> float:
        """Calculate Sharpe ratio."""
        excess_returns = returns - self.risk_free_rate / self.trading_days_per_year
        return (
            excess_returns.mean() / excess_returns.std() * np.sqrt(self.trading_days_per_year)
            if excess_returns.std() > 0 else 0
        )
    
    def _calculate_sortino_ratio(self, returns: pd.Series) -> float:
        """Calculate Sortino ratio."""
        excess_returns = returns - self.risk_free_rate / self.trading_days_per_year
        negative_returns = excess_returns[excess_returns < 0]
        downside_deviation = negative_returns.std() if len(negative_returns) > 0 else 0
        return (
            excess_returns.mean() / downside_deviation * np.sqrt(self.trading_days_per_year)
            if downside_deviation > 0 else 0
        )


class NewsService:
    """Service for generating news feed items."""
    
    def generate_sample_news(self) -> List[NewsItem]:
        """Generate sample news items matching the design."""
        
        sample_news = [
            NewsItem(
                id="news_1",
                title="Polymarket data feed offline",
                summary="We Are 5G announced DD limit service for on to integrat Copilot across Azure ecosystem.",
                source="Polymarket",
                relevance_score=0.85,
                symbols=["POLY", "PREDICTION"],
                timestamp=datetime.now() - timedelta(hours=2),
                is_critical=True
            ),
            NewsItem(
                id="news_2", 
                title="Overpriced vs skew",
                summary="Kalshi discounted model shows value on Polymarket relative to skew.",
                source="Kalshi",
                relevance_score=0.72,
                symbols=["KALSHI", "POLYMARKET"],
                timestamp=datetime.now() - timedelta(hours=4),
                is_critical=False
            ),
            NewsItem(
                id="news_3",
                title="Latency spike on Deribit API",  
                summary="Users report 5x expected latency on calls to retrieve data; underlying spreads up 5 bp in pre-market.",
                source="Deribit",
                relevance_score=0.65,
                symbols=["DERIBIT", "BTC", "ETH"],
                timestamp=datetime.now() - timedelta(hours=6),
                is_critical=False
            ),
            NewsItem(
                id="news_4",
                title="Latency spike on Deribit API",
                summary="OpenAI API announces new partnership with OpenAI to integrate CoPilot across Azure ecosystem.",
                source="Deribit", 
                relevance_score=0.90,
                symbols=["BTC", "ETH"],
                timestamp=datetime.now() - timedelta(hours=8),
                is_critical=False
            )
        ]
        
        return sample_news


class AIInsightService:
    """Service for generating AI insights."""
    
    def generate_sample_insights(self) -> List[AIInsight]:
        """Generate sample AI insights matching the design."""
        
        sample_insights = [
            AIInsight(
                id="insight_1",
                type="risk",
                title="Suggest a constraint to reduce portfolio Vega by 40%",
                description="Current vega exposure is above risk limits. Consider reducing position sizes in high-vega instruments.",
                confidence=0.85,
                priority="high",
                suggested_actions=["Reduce BTC options positions", "Hedge with short vega trades"],
                related_positions=["BTC-OPTIONS", "ETH-OPTIONS"]
            ),
            AIInsight(
                id="insight_2",
                type="opportunity", 
                title="Compare Alpha vs Beta across all strategies",
                description="Strategy performance analysis shows opportunity for rebalancing.",
                confidence=0.72,
                priority="medium",
                suggested_actions=["Rebalance strategy allocation", "Review underperforming strategies"],
                related_positions=["STRATEGY-A", "STRATEGY-B"]
            ),
            AIInsight(
                id="insight_3",
                type="alert",
                title="Explain health metrics",
                description="Portfolio health metrics require attention for optimal performance.",
                confidence=0.65,
                priority="low", 
                suggested_actions=["Review health dashboard", "Update risk parameters"],
                related_positions=[]
            ),
            AIInsight(
                id="insight_4",
                type="opportunity",
                title="Breakdown risk contribution by tag",
                description="Risk analysis shows concentration in specific asset classes.",
                confidence=0.78,
                priority="medium",
                suggested_actions=["Diversify across asset classes", "Review tag-based allocation"],
                related_positions=["BTC", "ETH", "DEFI"]
            )
        ]
        
        return sample_insights


class NewsService:
    """Service for managing news feed items."""
    
    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db = db_manager or DatabaseManager()

    def generate_sample_news(self) -> List[NewsItem]:
        """Generate sample news items matching the design."""
        
        sample_news = [
            NewsItem(
                id="news_1",
                title="Polymarket data feed offline",
                summary="We Are 5G announced DD limit service for on to integrat Copilot across Azure ecosystem.",
                source="Polymarket",
                relevance_score=0.85,
                symbols=["POLY", "PREDICTION"],
                timestamp=datetime.now() - timedelta(hours=2),
                is_critical=True
            ),
            NewsItem(
                id="news_2", 
                title="Overpriced vs skew",
                summary="Kalshi discounted model shows value on Polymarket relative to skew.",
                source="Kalshi",
                relevance_score=0.72,
                symbols=["KALSHI", "POLYMARKET"],
                timestamp=datetime.now() - timedelta(hours=4),
                is_critical=False
            ),
            NewsItem(
                id="news_3",
                title="Latency spike on Deribit API",  
                summary="Users report 5x expected latency on calls to retrieve data; underlying spreads up 5 bp in pre-market.",
                source="Deribit",
                relevance_score=0.65,
                symbols=["DERIBIT", "BTC", "ETH"],
                timestamp=datetime.now() - timedelta(hours=6),
                is_critical=False
            ),
            NewsItem(
                id="news_4",
                title="Latency spike on Deribit API",
                summary="OpenAI API announces new partnership with OpenAI to integrate CoPilot across Azure ecosystem.",
                source="Deribit", 
                relevance_score=0.90,
                symbols=["BTC", "ETH"],
                timestamp=datetime.now() - timedelta(hours=8),
                is_critical=False
            )
        ]
        
        # Save to database
        for news_item in sample_news:
            self.save_news_item_to_db(news_item)
        
        return sample_news

    def save_news_item_to_db(self, news_item: NewsItem) -> bool:
        """Save news item to database."""
        news_data = {
            "news_id": news_item.id,
            "title": news_item.title,
            "summary": news_item.summary,
            "source": news_item.source,
            "published_at": news_item.timestamp,
            "timestamp": int(news_item.timestamp.timestamp() * 1000),
            "is_critical": news_item.is_critical,
            "relevance_score": news_item.relevance_score,
            "related_symbols": news_item.symbols,
            "tags": [],
            "is_processed": False
        }
        
        result = self.db.insert_news_item(news_data)
        return result is not None

    def get_news_feed_from_db(
        self, 
        limit: int = 50, 
        source: Optional[str] = None,
        is_critical: Optional[bool] = None
    ) -> List[NewsItem]:
        """Get news feed from database."""
        news_items_data = self.db.get_news_feed(
            limit=limit, 
            source=source, 
            is_critical=is_critical
        )
        
        news_items = []
        for item_data in news_items_data:
            news_items.append(NewsItem(
                id=item_data["news_id"],
                title=item_data["title"],
                summary=item_data["summary"],
                source=item_data["source"],
                relevance_score=item_data.get("relevance_score", 0),
                symbols=item_data.get("related_symbols", []),
                timestamp=datetime.fromtimestamp(item_data["timestamp"] / 1000),
                is_critical=item_data.get("is_critical", False)
            ))
        
        return news_items


class AIInsightService:
    """Service for managing AI insights."""
    
    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db = db_manager or DatabaseManager()

    def generate_sample_insights(self) -> List[AIInsight]:
        """Generate sample AI insights matching the design."""
        
        sample_insights = [
            AIInsight(
                id="insight_1",
                type="risk",
                title="Suggest a constraint to reduce portfolio Vega by 40%",
                description="Current vega exposure is above risk limits. Consider reducing position sizes in high-vega instruments.",
                confidence=0.85,
                priority="high",
                suggested_actions=["Reduce BTC options positions", "Hedge with short vega trades"],
                related_positions=["BTC-OPTIONS", "ETH-OPTIONS"]
            ),
            AIInsight(
                id="insight_2",
                type="opportunity", 
                title="Compare Alpha vs Beta across all strategies",
                description="Strategy performance analysis shows opportunity for rebalancing.",
                confidence=0.72,
                priority="medium",
                suggested_actions=["Rebalance strategy allocation", "Review underperforming strategies"],
                related_positions=["STRATEGY-A", "STRATEGY-B"]
            ),
            AIInsight(
                id="insight_3",
                type="alert",
                title="Explain health metrics",
                description="Portfolio health metrics require attention for optimal performance.",
                confidence=0.65,
                priority="low", 
                suggested_actions=["Review health dashboard", "Update risk parameters"],
                related_positions=[]
            ),
            AIInsight(
                id="insight_4",
                type="opportunity",
                title="Breakdown risk contribution by tag",
                description="Risk analysis shows concentration in specific asset classes.",
                confidence=0.78,
                priority="medium",
                suggested_actions=["Diversify across asset classes", "Review tag-based allocation"],
                related_positions=["BTC", "ETH", "DEFI"]
            )
        ]
        
        # Save to database
        for insight in sample_insights:
            self.save_ai_insight_to_db(insight)
        
        return sample_insights

    def save_ai_insight_to_db(self, insight: AIInsight) -> bool:
        """Save AI insight to database."""
        insight_data = {
            "insight_id": insight.id,
            "type": insight.type,
            "title": insight.title,
            "description": insight.description,
            "priority": insight.priority,
            "confidence": insight.confidence,
            "suggested_actions": insight.suggested_actions,
            "related_instruments": insight.related_positions,
            "supporting_data": {},
            "timestamp": int(datetime.now().timestamp() * 1000),
            "is_acknowledged": False
        }
        
        result = self.db.insert_ai_insight(insight_data)
        return result is not None

    def get_ai_insights_from_db(
        self, 
        priority: Optional[str] = None,
        acknowledged: Optional[bool] = None,
        limit: int = 50
    ) -> List[AIInsight]:
        """Get AI insights from database."""
        insights_data = self.db.get_ai_insights(
            priority=priority,
            acknowledged=acknowledged,
            limit=limit
        )
        
        insights = []
        for insight_data in insights_data:
            insights.append(AIInsight(
                id=insight_data["insight_id"],
                type=insight_data["type"],
                title=insight_data["title"],
                description=insight_data["description"],
                confidence=insight_data.get("confidence", 0),
                priority=insight_data["priority"],
                suggested_actions=insight_data.get("suggested_actions", []),
                related_positions=insight_data.get("related_instruments", [])
            ))
        
        return insights

    def acknowledge_insight(self, insight_id: str, user_feedback: Optional[str] = None) -> bool:
        """Mark an AI insight as acknowledged."""
        return self.db.acknowledge_ai_insight(insight_id, user_feedback)