"""
Unit tests for portfolio analytics service
"""

import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

from src.volatility_filter.services.portfolio_analytics import (
    PortfolioAnalyticsService,
    RiskMetrics,
    NewsService,
    AIInsightService
)
from src.volatility_filter.models.portfolio import (
    Position,
    PortfolioAnalytics,
    StrategyPerformance,
    PerformanceHistory,
    NewsItem,
    AIInsight
)
from src.volatility_filter.database import DatabaseManager


class TestPortfolioAnalyticsService:
    """Test portfolio analytics calculations"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database manager"""
        return Mock(spec=DatabaseManager)
    
    @pytest.fixture
    def service(self, mock_db):
        """Create portfolio analytics service with mocked database"""
        return PortfolioAnalyticsService(db_manager=mock_db)
    
    @pytest.fixture
    def sample_positions(self):
        """Sample portfolio positions"""
        return [
            Position(
                instrument="BTC-USD",
                type="spot",
                quantity=1.5,
                entry_price=50000,
                current_price=52000,
                value=78000,
                pnl=3000,
                pnl_percentage=4.0,
                delta=1.0,
                gamma=0.0,
                vega=0.0,
                theta=0.0,
                iv=None
            ),
            Position(
                instrument="ETH-CALL-3000-20241201",
                type="option",
                quantity=10,
                entry_price=500,
                current_price=600,
                value=6000,
                pnl=1000,
                pnl_percentage=20.0,
                delta=0.7,
                gamma=0.001,
                vega=50,
                theta=-5,
                iv=0.8
            ),
            Position(
                instrument="BTC-PUT-45000-20241115",
                type="option",
                quantity=-5,
                entry_price=800,
                current_price=400,
                value=-2000,
                pnl=2000,
                pnl_percentage=50.0,
                delta=-0.3,
                gamma=0.0005,
                vega=-25,
                theta=3,
                iv=0.6
            )
        ]
    
    @pytest.fixture
    def sample_price_history(self):
        """Sample price history data"""
        dates = pd.date_range(start='2024-01-01', end='2024-01-31', freq='D')
        
        # Create realistic portfolio value progression
        base_value = 100000
        returns = np.random.normal(0.001, 0.02, len(dates))  # 0.1% daily return, 2% volatility
        
        portfolio_values = [base_value]
        for ret in returns[1:]:
            portfolio_values.append(portfolio_values[-1] * (1 + ret))
        
        return pd.DataFrame({
            'portfolio_value': portfolio_values
        }, index=dates)
    
    def test_calculate_portfolio_analytics_basic(self, service, sample_positions, sample_price_history):
        """Test basic portfolio analytics calculation"""
        analytics = service.calculate_portfolio_analytics(
            positions=sample_positions,
            price_history=sample_price_history
        )
        
        assert isinstance(analytics, PortfolioAnalytics)
        assert analytics.portfolio_value == 82000  # 78000 + 6000 - 2000
        assert analytics.net_delta == 1.4  # 1.0 + 0.7 - 0.3
        assert analytics.net_gamma == 0.0015  # 0.0 + 0.001 + 0.0005
        assert analytics.net_vega == 25  # 0 + 50 - 25
        assert analytics.net_theta == -2  # 0 - 5 + 3
        assert analytics.active_strategies == 0  # No strategy positions
        
        # Check that risk metrics are calculated
        assert analytics.var_95 is not None
        assert analytics.cvar_95 is not None
        assert analytics.max_drawdown is not None
        assert analytics.annual_volatility is not None
    
    def test_calculate_portfolio_analytics_empty_positions(self, service):
        """Test portfolio analytics with empty positions"""
        price_history = pd.DataFrame({
            'portfolio_value': [100000, 101000, 99000]
        }, index=pd.date_range('2024-01-01', periods=3))
        
        analytics = service.calculate_portfolio_analytics(
            positions=[],
            price_history=price_history
        )
        
        assert analytics.portfolio_value == 0
        assert analytics.net_delta == 0
        assert analytics.net_gamma == 0
        assert analytics.net_vega == 0
        assert analytics.net_theta == 0
    
    def test_calculate_strategy_performance(self, service, sample_price_history):
        """Test strategy performance calculation"""
        strategy_positions = [
            Position(
                instrument="strategy-momentum-v1",
                type="spot",  # Use valid enum value
                quantity=1,
                entry_price=10000,
                current_price=12000,
                value=12000,
                pnl=2000,
                pnl_percentage=20.0,
                delta=None,
                gamma=None,
                vega=None,
                theta=None,
                iv=None
            )
        ]
        
        performance = service.calculate_strategy_performance(
            strategy_name="momentum-v1",
            strategy_positions=strategy_positions,
            price_history=sample_price_history
        )
        
        assert isinstance(performance, StrategyPerformance)
        assert performance.strategy_name == "momentum-v1"
        assert performance.active == True
        assert isinstance(performance.total_return, float)
        assert isinstance(performance.cumulative_return, float)
    
    def test_generate_performance_history(self, service, sample_price_history):
        """Test performance history generation"""
        # Ensure price history has proper datetime index and recent dates
        recent_dates = pd.date_range(end=datetime.now(), periods=30, freq='D')
        recent_price_history = pd.DataFrame({
            'portfolio_value': np.linspace(100000, 105000, 30)
        }, index=recent_dates)
        
        history = service.generate_performance_history(
            price_history=recent_price_history,
            lookback_days=30
        )
        
        assert isinstance(history, list)
        assert len(history) > 0
        assert all(isinstance(point, PerformanceHistory) for point in history)
        
        # Check first point
        first_point = history[0]
        assert isinstance(first_point.date, (datetime, pd.Timestamp))
        assert first_point.portfolio_value > 0
        assert isinstance(first_point.daily_return, float)
    
    def test_risk_metrics_calculation(self, service):
        """Test risk metrics calculation"""
        # Create sample returns with known characteristics
        returns = pd.Series([0.01, -0.02, 0.015, -0.005, 0.008, -0.01, 0.003])
        
        risk_metrics = service._calculate_risk_metrics(returns)
        
        assert isinstance(risk_metrics, RiskMetrics)
        assert risk_metrics.var_95 < 0  # VaR should be negative
        assert risk_metrics.cvar_95 < risk_metrics.var_95  # CVaR should be more negative than VaR
        assert risk_metrics.max_drawdown <= 0  # Max drawdown should be negative or zero
        assert risk_metrics.annual_volatility > 0  # Volatility should be positive
    
    def test_risk_metrics_empty_returns(self, service):
        """Test risk metrics with empty returns"""
        empty_returns = pd.Series([])
        
        risk_metrics = service._calculate_risk_metrics(empty_returns)
        
        assert risk_metrics.var_95 == 0
        assert risk_metrics.cvar_95 == 0
        assert risk_metrics.max_drawdown == 0
        assert risk_metrics.sharpe_ratio == 0
        assert risk_metrics.sortino_ratio == 0
        assert risk_metrics.beta == 0
        assert risk_metrics.alpha == 0
        assert risk_metrics.annual_volatility == 0
    
    def test_beta_alpha_calculation_with_benchmark(self, service):
        """Test beta and alpha calculation with benchmark data"""
        portfolio_returns = pd.Series([0.01, -0.02, 0.015, -0.005, 0.008])
        benchmark_returns = pd.DataFrame({
            'benchmark': [0.008, -0.015, 0.012, -0.003, 0.006]
        }, index=portfolio_returns.index)
        
        risk_metrics = service._calculate_risk_metrics(portfolio_returns, benchmark_returns)
        
        assert risk_metrics.beta != 0  # Should calculate actual beta
        assert risk_metrics.alpha != 0  # Should calculate actual alpha
    
    def test_annualize_return(self, service):
        """Test return annualization"""
        # 252 days of 0.1% daily returns
        daily_returns = pd.Series([0.001] * 252)
        
        annual_return = service._annualize_return(daily_returns)
        
        # Should be approximately 28.8% (compound growth)
        assert 0.25 < annual_return < 0.35
    
    def test_calculate_max_drawdown(self, service):
        """Test maximum drawdown calculation"""
        # Returns that create a 20% drawdown
        returns = pd.Series([0.1, 0.05, -0.1, -0.15, -0.05, 0.1])
        
        max_dd = service._calculate_max_drawdown(returns)
        
        assert max_dd < 0  # Drawdown should be negative
        assert abs(max_dd) > 0.15  # Should capture the significant drawdown
    
    def test_sharpe_ratio_calculation(self, service):
        """Test Sharpe ratio calculation"""
        # High return, low volatility scenario
        good_returns = pd.Series([0.01] * 100)  # Consistent 1% returns
        
        sharpe = service._calculate_sharpe_ratio(good_returns)
        
        assert sharpe > 2  # Should have high Sharpe ratio
    
    def test_sortino_ratio_calculation(self, service):
        """Test Sortino ratio calculation"""
        # Mixed returns with some negative
        returns = pd.Series([0.02, 0.01, -0.01, 0.015, -0.005, 0.02])
        
        sortino = service._calculate_sortino_ratio(returns)
        
        assert isinstance(sortino, float)
        assert sortino != 0


class TestPortfolioAnalyticsDatabase:
    """Test database integration for portfolio analytics"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database with return values"""
        db = Mock(spec=DatabaseManager)
        db.insert_portfolio_metrics.return_value = 1
        db.insert_portfolio_snapshot.return_value = 1
        return db
    
    @pytest.fixture
    def service(self, mock_db):
        """Service with mocked database"""
        return PortfolioAnalyticsService(db_manager=mock_db)
    
    @pytest.fixture
    def sample_analytics(self):
        """Sample portfolio analytics"""
        return PortfolioAnalytics(
            portfolio_value=100000,
            cumulative_pnl=5000,
            cumulative_return=5.0,
            annual_return=12.0,
            max_drawdown=-8.5,
            annual_volatility=15.0,
            active_strategies=2,
            var_95=-1500,
            cvar_95=-2000,
            beta=1.2,
            alpha=2.5,
            net_delta=150,
            net_gamma=5.2,
            net_vega=800,
            net_theta=-25
        )
    
    def test_save_portfolio_metrics_to_db(self, service, sample_analytics, mock_db):
        """Test saving portfolio metrics to database"""
        positions = [
            Position(
                instrument="BTC-USD",
                type="spot",
                quantity=1.0,
                entry_price=50000,
                current_price=52000,
                value=52000,
                pnl=2000,
                pnl_percentage=4.0,
                delta=1.0,
                gamma=0.0,
                vega=0.0,
                theta=0.0,
                iv=None
            )
        ]
        
        result = service.save_portfolio_metrics_to_db(sample_analytics, positions)
        
        assert result == True
        mock_db.insert_portfolio_metrics.assert_called_once()
        
        # Check the call arguments
        call_args = mock_db.insert_portfolio_metrics.call_args[0][0]
        assert call_args["portfolio_value"] == 100000
        assert call_args["cumulative_pnl"] == 5000
        assert call_args["annual_return"] == 12.0
        assert call_args["net_delta"] == 150
        assert call_args["active_positions"] == 1
        assert call_args["active_strategies"] == 2
    
    def test_save_portfolio_snapshot(self, service, sample_analytics, mock_db):
        """Test saving portfolio snapshot to database"""
        positions = [
            Position(
                instrument="BTC-USD",
                type="spot",
                quantity=1.0,
                entry_price=50000,
                current_price=52000,
                value=52000,
                pnl=2000,
                pnl_percentage=4.0,
                delta=1.0,
                gamma=0.0,
                vega=0.0,
                theta=0.0,
                iv=None
            )
        ]
        
        result = service.save_portfolio_snapshot(positions, sample_analytics)
        
        assert result == True
        mock_db.insert_portfolio_snapshot.assert_called_once()
        
        # Check the call arguments
        call_args = mock_db.insert_portfolio_snapshot.call_args[0][0]
        assert call_args["snapshot_type"] == "real_time"
        assert "portfolio_data" in call_args
        assert "risk_metrics" in call_args
        assert "performance_metrics" in call_args
        assert "allocation_data" in call_args
    
    def test_calculate_allocations(self, service):
        """Test allocation calculations"""
        positions = [
            Position(
                instrument="BTC-USD", type="spot", quantity=1.0,
                entry_price=50000, current_price=52000, value=52000,
                pnl=2000, pnl_percentage=4.0, delta=1.0, gamma=0.0, vega=0.0, theta=0.0, iv=None
            ),
            Position(
                instrument="ETH-USD", type="spot", quantity=10.0,
                entry_price=3000, current_price=3200, value=32000,
                pnl=2000, pnl_percentage=6.7, delta=1.0, gamma=0.0, vega=0.0, theta=0.0, iv=None
            ),
            Position(
                instrument="momentum-strategy-v1", type="spot", quantity=1.0,
                entry_price=16000, current_price=16800, value=16800,
                pnl=800, pnl_percentage=5.0, delta=None, gamma=None, vega=None, theta=None, iv=None
            )
        ]
        
        allocations = service._calculate_allocations(positions)
        
        assert "asset_allocation" in allocations
        assert "strategy_allocation" in allocations
        
        # Check asset allocation percentages sum to ~100%
        asset_total = sum(allocations["asset_allocation"].values())
        assert 99 < asset_total < 101
        
        # Check strategy allocation
        strategy_allocation = allocations["strategy_allocation"]
        assert "momentum-strategy-v1" in strategy_allocation
        assert "Direct Positions" in strategy_allocation


class TestNewsService:
    """Test news service functionality"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database manager"""
        db = Mock(spec=DatabaseManager)
        db.insert_news_item.return_value = 1
        db.get_news_feed.return_value = [
            {
                "news_id": "news_1",
                "title": "Test News",
                "summary": "Test summary",
                "source": "Test Source",
                "timestamp": int(datetime.now().timestamp() * 1000),
                "is_critical": False,
                "relevance_score": 0.8,
                "related_symbols": ["BTC", "ETH"]
            }
        ]
        return db
    
    @pytest.fixture
    def service(self, mock_db):
        """News service with mocked database"""
        return NewsService(db_manager=mock_db)
    
    def test_generate_sample_news(self, service, mock_db):
        """Test sample news generation"""
        news_items = service.generate_sample_news()
        
        assert len(news_items) > 0
        assert all(isinstance(item, NewsItem) for item in news_items)
        
        # Check that news items were saved to database
        assert mock_db.insert_news_item.call_count == len(news_items)
        
        # Check first news item
        first_item = news_items[0]
        assert first_item.title == "Polymarket data feed offline"
        assert first_item.source == "Polymarket"
        assert first_item.is_critical == True
        assert 0.8 < first_item.relevance_score < 0.9
    
    def test_save_news_item_to_db(self, service, mock_db):
        """Test saving individual news item"""
        news_item = NewsItem(
            id="test_news",
            title="Test News",
            summary="Test summary",
            source="Test Source",
            relevance_score=0.75,
            symbols=["BTC"],
            timestamp=datetime.now(),
            is_critical=False
        )
        
        result = service.save_news_item_to_db(news_item)
        
        assert result == True
        mock_db.insert_news_item.assert_called_once()
        
        # Check call arguments
        call_args = mock_db.insert_news_item.call_args[0][0]
        assert call_args["news_id"] == "test_news"
        assert call_args["title"] == "Test News"
        assert call_args["source"] == "Test Source"
        assert call_args["is_critical"] == False
        assert call_args["relevance_score"] == 0.75
    
    def test_get_news_feed_from_db(self, service, mock_db):
        """Test retrieving news feed from database"""
        news_items = service.get_news_feed_from_db(limit=10)
        
        assert len(news_items) == 1
        assert isinstance(news_items[0], NewsItem)
        
        mock_db.get_news_feed.assert_called_once_with(
            limit=10, source=None, is_critical=None
        )
        
        # Check news item properties
        item = news_items[0]
        assert item.id == "news_1"
        assert item.title == "Test News"
        assert item.source == "Test Source"


class TestAIInsightService:
    """Test AI insight service functionality"""
    
    @pytest.fixture
    def mock_db(self):
        """Mock database manager"""
        db = Mock(spec=DatabaseManager)
        db.insert_ai_insight.return_value = 1
        db.get_ai_insights.return_value = [
            {
                "insight_id": "insight_1",
                "type": "risk",
                "title": "Test Insight",
                "description": "Test description",
                "priority": "high",
                "confidence": 0.85,
                "suggested_actions": ["Action 1", "Action 2"],
                "related_instruments": ["BTC", "ETH"]
            }
        ]
        db.acknowledge_ai_insight.return_value = True
        return db
    
    @pytest.fixture
    def service(self, mock_db):
        """AI insight service with mocked database"""
        return AIInsightService(db_manager=mock_db)
    
    def test_generate_sample_insights(self, service, mock_db):
        """Test sample AI insights generation"""
        insights = service.generate_sample_insights()
        
        assert len(insights) > 0
        assert all(isinstance(insight, AIInsight) for insight in insights)
        
        # Check that insights were saved to database
        assert mock_db.insert_ai_insight.call_count == len(insights)
        
        # Check first insight
        first_insight = insights[0]
        assert first_insight.type == "risk"
        assert first_insight.title == "Suggest a constraint to reduce portfolio Vega by 40%"
        assert first_insight.priority == "high"
        assert 0.8 < first_insight.confidence < 0.9
    
    def test_save_ai_insight_to_db(self, service, mock_db):
        """Test saving individual AI insight"""
        insight = AIInsight(
            id="test_insight",
            type="opportunity",
            title="Test Insight",
            description="Test description",
            confidence=0.9,
            priority="medium",
            suggested_actions=["Test action"],
            related_positions=["BTC-USD"]
        )
        
        result = service.save_ai_insight_to_db(insight)
        
        assert result == True
        mock_db.insert_ai_insight.assert_called_once()
        
        # Check call arguments
        call_args = mock_db.insert_ai_insight.call_args[0][0]
        assert call_args["insight_id"] == "test_insight"
        assert call_args["type"] == "opportunity"
        assert call_args["priority"] == "medium"
        assert call_args["confidence"] == 0.9
    
    def test_get_ai_insights_from_db(self, service, mock_db):
        """Test retrieving AI insights from database"""
        insights = service.get_ai_insights_from_db(priority="high", limit=10)
        
        assert len(insights) == 1
        assert isinstance(insights[0], AIInsight)
        
        mock_db.get_ai_insights.assert_called_once_with(
            priority="high", acknowledged=None, limit=10
        )
        
        # Check insight properties
        insight = insights[0]
        assert insight.id == "insight_1"
        assert insight.type == "risk"
        assert insight.priority == "high"
    
    def test_acknowledge_insight(self, service, mock_db):
        """Test acknowledging AI insight"""
        result = service.acknowledge_insight("insight_1", "User feedback")
        
        assert result == True
        mock_db.acknowledge_ai_insight.assert_called_once_with("insight_1", "User feedback")


class TestPortfolioAnalyticsIntegration:
    """Integration tests for portfolio analytics with real data flows"""
    
    @pytest.fixture
    def service(self):
        """Service with real database (will be mocked in tests)"""
        return PortfolioAnalyticsService()
    
    def test_full_analytics_workflow(self, service):
        """Test complete analytics workflow"""
        # Create realistic test data
        positions = [
            Position(
                instrument="BTC-USD", type="spot", quantity=2.0,
                entry_price=45000, current_price=50000, value=100000,
                pnl=10000, pnl_percentage=11.11, delta=1.0, gamma=0.0, vega=0.0, theta=0.0, iv=None
            ),
            Position(
                instrument="ETH-CALL-3500-20241201", type="option", quantity=5,
                entry_price=200, current_price=300, value=1500,
                pnl=500, pnl_percentage=50.0, delta=0.6, gamma=0.002, vega=30, theta=-2, iv=0.7
            )
        ]
        
        # Create price history
        dates = pd.date_range(start='2024-01-01', periods=30)
        base_values = np.linspace(90000, 101500, 30)  # Gradual increase
        price_history = pd.DataFrame({
            'portfolio_value': base_values
        }, index=dates)
        
        # Calculate analytics
        analytics = service.calculate_portfolio_analytics(positions, price_history)
        
        # Verify comprehensive results
        assert analytics.portfolio_value == 101500
        assert analytics.cumulative_pnl == 11500  # Updated expected value
        assert analytics.net_delta == 1.6  # 1.0 + 0.6
        assert analytics.net_vega == 30
        assert analytics.active_strategies == 0
        
        # Verify risk metrics are reasonable
        assert analytics.max_drawdown <= 0
        assert analytics.annual_volatility > 0
        assert isinstance(analytics.var_95, float)
        assert isinstance(analytics.cvar_95, float)
    
    @patch('src.volatility_filter.services.portfolio_analytics.DatabaseManager')
    def test_end_to_end_with_database(self, mock_db_class):
        """Test end-to-end flow with database operations"""
        # Setup mock database
        mock_db = Mock()
        mock_db.insert_portfolio_metrics.return_value = 1
        mock_db.insert_portfolio_snapshot.return_value = 1
        mock_db_class.return_value = mock_db
        
        service = PortfolioAnalyticsService()
        
        positions = [
            Position(
                instrument="BTC-USD", type="spot", quantity=1.0,
                entry_price=48000, current_price=50000, value=50000,
                pnl=2000, pnl_percentage=4.17, delta=1.0, gamma=0.0, vega=0.0, theta=0.0, iv=None
            )
        ]
        
        # Create basic price history
        price_history = pd.DataFrame({
            'portfolio_value': [48000, 49000, 50000]
        }, index=pd.date_range('2024-01-01', periods=3))
        
        # Calculate analytics
        analytics = service.calculate_portfolio_analytics(positions, price_history)
        
        # Save to database
        metrics_saved = service.save_portfolio_metrics_to_db(analytics, positions)
        snapshot_saved = service.save_portfolio_snapshot(positions, analytics)
        
        # Verify database operations
        assert metrics_saved == True
        assert snapshot_saved == True
        mock_db.insert_portfolio_metrics.assert_called_once()
        mock_db.insert_portfolio_snapshot.assert_called_once()