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
    
    def __init__(self):
        self.risk_free_rate = 0.02  # 2% annual risk-free rate
        self.trading_days_per_year = 252
    
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