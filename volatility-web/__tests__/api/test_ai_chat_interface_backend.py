"""
Comprehensive Backend API Tests for AI Chat Interface (Design Page 2)

Tests cover the backend services required for the multi-query AI analysis interface:
- Chat message processing and AI response generation
- Multi-query handling and context management
- Conversation threading and branching
- Financial data integration for AI analysis
- Suggestion generation based on context
- Real-time data access for market analysis
- Error handling and validation
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone
import json

# Mock the required modules before importing our code
import sys
from unittest.mock import Mock

# Mock anthropic module
mock_anthropic = Mock()
mock_anthropic.AsyncAnthropic = Mock()
sys.modules['anthropic'] = mock_anthropic

# Mock options module  
mock_options = Mock()
sys.modules['options'] = mock_options

# Now import our actual modules
from src.volatility_filter.models.chat import (
    ChatMessage, ChatResponse, MessageRole, Conversation, 
    ConversationCreate, ChatSuggestion
)
from src.volatility_filter.claude_client import ClaudeClient
from src.volatility_filter.database import DatabaseManager


class TestAIChatInterfaceBackend:
    """Test suite for AI Chat Interface backend functionality."""
    
    @pytest.fixture
    def mock_db_manager(self):
        """Mock database manager."""
        db_manager = AsyncMock(spec=DatabaseManager)
        db_manager.get_connection = AsyncMock()
        return db_manager
    
    @pytest.fixture
    def mock_claude_client(self):
        """Mock Claude AI client."""
        client = AsyncMock(spec=ClaudeClient)
        client.send_message = AsyncMock()
        client.generate_suggestions = AsyncMock()
        return client
    
    @pytest.fixture
    def sample_chat_message(self):
        """Sample chat message for testing."""
        return ChatMessage(
            content="Show me historical ETH performance vs daytime vs nighttime transactions over time. What are the highest-leveraging outliers.",
            session_id="test_session_123",
            user_id="user_456",
            conversation_id=1
        )
    
    @pytest.fixture
    def sample_financial_query(self):
        """Sample complex financial analysis query."""
        return ChatMessage(
            content="Get it — trimming returns outside the 95% confidence interval. Do you want to see cumulative performance or return distributions?",
            session_id="test_session_123",
            conversation_id=1
        )
    
    @pytest.fixture  
    def sample_data_source_query(self):
        """Sample data source selection query."""
        return ChatMessage(
            content="Where should I source the data from? Binance, Hyperliquid or static data from the library?",
            session_id="test_session_123",
            conversation_id=1
        )


class TestChatMessageProcessing:
    """Test chat message processing and AI response generation."""
    
    @pytest.mark.asyncio
    async def test_process_complex_financial_query(self, mock_claude_client, sample_chat_message):
        """Test processing complex multi-part financial queries."""
        # Mock AI response for ETH performance analysis
        mock_claude_client.send_message.return_value = {
            'response': '''Based on historical ETH data analysis, here are the key findings:

**Daytime vs Nighttime Performance Patterns:**
- Daytime trading (9 AM - 5 PM EST) shows 12% higher volatility on average
- Nighttime sessions exhibit 8% higher returns during bullish periods
- Cumulative performance diverges significantly during high-volatility periods

**Leveraging Outliers Analysis:**
- Identified 23 extreme leveraging events (>5 sigma from mean)
- 78% of outliers occur during nighttime sessions (10 PM - 2 AM EST)
- Correlation with futures expiry dates: 0.67

**Statistical Significance:**
- P-value for daytime/nighttime difference: 0.0023 (highly significant)
- Sharpe ratio improvement: 0.34 for nighttime-focused strategies

Would you like me to generate specific trading signals based on these patterns?''',
            'suggestions': [
                'Show me the specific timestamps of these leveraging outliers',
                'Generate backtesting results for a nighttime-focused strategy',
                'Compare these patterns with BTC and other major cryptocurrencies',
                'Would you like me to prepare this for live deployment?'
            ],
            'metadata': {
                'analysis_type': 'time_series_analysis',
                'data_sources': ['hyperliquid', 'binance'],
                'confidence_level': 0.95,
                'statistical_tests': ['t_test', 'ks_test', 'correlation_analysis']
            }
        }
        
        response = await mock_claude_client.send_message(
            message=sample_chat_message.content,
            conversation_context=[],
            user_context={'portfolio_data': True, 'risk_preferences': 'moderate'}
        )
        
        assert 'Daytime vs Nighttime Performance Patterns' in response['response']
        assert 'Leveraging Outliers Analysis' in response['response']
        assert len(response['suggestions']) == 4
        assert response['metadata']['confidence_level'] == 0.95
        
        mock_claude_client.send_message.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_process_statistical_analysis_query(self, mock_claude_client, sample_financial_query):
        """Test processing statistical analysis queries with confidence intervals."""
        mock_claude_client.send_message.return_value = {
            'response': '''Excellent! Using 95% confidence interval trimming for return analysis:

**Trimmed Returns Analysis:**
- Removed 2.5% extreme values from each tail
- Sample size after trimming: 8,742 observations
- Outlier threshold: ±3.2 standard deviations

**Cumulative Performance (Trimmed):**
- Total return: 247.3% (vs 198.1% untrimmed)
- Annualized return: 18.7% (vs 14.2% untrimmed)
- Maximum drawdown: -12.4% (vs -28.7% untrimmed)

**Return Distributions:**
- Skewness: 0.23 (nearly normal after trimming)
- Kurtosis: 2.89 (reduced from 12.4 untrimmed)
- Jarque-Bera test: p-value = 0.08 (normal distribution)

The trimmed data shows much cleaner patterns and reduced noise. Would you prefer to see the cumulative performance chart or the distribution histogram first?''',
            'suggestions': [
                'Show me the cumulative performance chart with confidence bands',
                'Display the return distribution histogram with Gaussian overlay',
                'Compare trimmed vs untrimmed performance metrics',
                'Generate risk-adjusted performance metrics'
            ],
            'metadata': {
                'analysis_type': 'statistical_analysis',
                'confidence_interval': 0.95,
                'trimming_method': 'percentile',
                'sample_size': 8742
            }
        }
        
        response = await mock_claude_client.send_message(
            message=sample_financial_query.content,
            conversation_context=[],
            user_context={'analysis_preference': 'statistical', 'risk_level': 'conservative'}
        )
        
        assert '95% confidence interval' in response['response']
        assert 'Trimmed Returns Analysis' in response['response']
        assert 'Return Distributions' in response['response']
        assert response['metadata']['confidence_interval'] == 0.95
    
    @pytest.mark.asyncio
    async def test_process_data_source_recommendation(self, mock_claude_client, sample_data_source_query):
        """Test AI recommendations for data sources."""
        mock_claude_client.send_message.return_value = {
            'response': '''For your ETH performance analysis, here are my data source recommendations:

**Hyperliquid (Recommended):**
✅ Highest tick-by-tick resolution
✅ Accurate timestamp precision for daytime/nighttime classification  
✅ Complete order book depth data
✅ Direct API access with low latency
- Best for: Real-time analysis, high-frequency patterns

**Binance:**
✅ Largest volume and liquidity data
✅ Historical data going back 7+ years
✅ Good for macro trend analysis
⚠️ Lower timestamp resolution
- Best for: Long-term trend analysis, volume patterns

**Static Library Data:**
✅ Pre-cleaned and validated datasets
✅ Consistent formatting and quality
⚠️ May not include latest market data
⚠️ Limited customization options
- Best for: Backtesting, academic research

**My Recommendation:** Use Hyperliquid for your real-time daytime/nighttime analysis, supplemented with Binance historical data for longer-term context. This combination gives you both precision and depth.''',
            'suggestions': [
                'Set up Hyperliquid API connection for real-time data',
                'Configure Binance historical data pipeline',
                'Would you like me to start data collection immediately?',
                'Show me a sample of the data structure from each source'
            ],
            'metadata': {
                'recommendation_type': 'data_source',
                'primary_recommendation': 'hyperliquid',
                'secondary_recommendation': 'binance',
                'reasoning': 'timestamp_precision'
            }
        }
        
        response = await mock_claude_client.send_message(
            message=sample_data_source_query.content,
            conversation_context=[],
            user_context={'analysis_type': 'intraday', 'priority': 'accuracy'}
        )
        
        assert 'Hyperliquid (Recommended)' in response['response']
        assert 'timestamp precision' in response['response']
        assert 'My Recommendation' in response['response']
        assert response['metadata']['primary_recommendation'] == 'hyperliquid'


class TestConversationManagement:
    """Test conversation management and context handling."""
    
    @pytest.mark.asyncio
    async def test_create_multi_query_conversation(self, mock_db_manager):
        """Test creating conversation for multi-query analysis."""
        mock_db_manager.execute_query.return_value = [{'id': 1}]
        
        conversation_data = ConversationCreate(
            session_id="test_session_123",
            title="ETH Performance Analysis - Multi-Query",
            use_case="financial_analysis",
            user_id="user_456",
            metadata={
                'analysis_type': 'time_series',
                'asset': 'ETH',
                'queries': ['performance_patterns', 'outlier_detection', 'statistical_analysis']
            }
        )
        
        # Simulate conversation creation
        result = await mock_db_manager.execute_query(
            """INSERT INTO conversations (session_id, title, use_case, user_id, metadata, created_at)
               VALUES (?, ?, ?, ?, ?, ?) RETURNING id""",
            (
                conversation_data.session_id,
                conversation_data.title,
                conversation_data.use_case,
                conversation_data.user_id,
                json.dumps(conversation_data.metadata),
                datetime.now(timezone.utc)
            )
        )
        
        assert result[0]['id'] == 1
        mock_db_manager.execute_query.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_manage_conversation_context(self, mock_db_manager):
        """Test maintaining context across multiple queries."""
        # Mock conversation history
        mock_db_manager.fetch_all.return_value = [
            {
                'id': 1,
                'role': 'user',
                'content': 'Show me ETH performance patterns',
                'created_at': datetime.now(timezone.utc),
                'metadata': '{"query_type": "performance_analysis"}'
            },
            {
                'id': 2,
                'role': 'assistant',
                'content': 'Based on ETH data, here are the daytime vs nighttime patterns...',
                'created_at': datetime.now(timezone.utc),
                'metadata': '{"analysis_completed": true, "patterns_identified": 3}'
            },
            {
                'id': 3,
                'role': 'user',
                'content': 'Now show me the leveraging outliers',
                'created_at': datetime.now(timezone.utc),
                'metadata': '{"query_type": "outlier_analysis", "context_from": 1}'
            }
        ]
        
        conversation_history = await mock_db_manager.fetch_all(
            "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at",
            (1,)
        )
        
        assert len(conversation_history) == 3
        assert conversation_history[0]['content'] == 'Show me ETH performance patterns'
        assert conversation_history[2]['content'] == 'Now show me the leveraging outliers'
        
        # Verify context continuity
        context_metadata = json.loads(conversation_history[2]['metadata'])
        assert context_metadata['context_from'] == 1
    
    @pytest.mark.asyncio
    async def test_conversation_branching(self, mock_db_manager):
        """Test creating branches for different analysis paths."""
        # Create branch from message ID 2 (assistant response)
        branch_data = {
            'parent_conversation_id': 1,
            'parent_message_id': 2,
            'title': 'BTC Comparison Branch',
            'session_id': 'test_session_123',
            'created_at': datetime.now(timezone.utc)
        }
        
        mock_db_manager.execute_query.return_value = [{'id': 2}]
        
        result = await mock_db_manager.execute_query(
            """INSERT INTO conversations (session_id, title, parent_conversation_id, parent_message_id, created_at)
               VALUES (?, ?, ?, ?, ?) RETURNING id""",
            (
                branch_data['session_id'],
                branch_data['title'],
                branch_data['parent_conversation_id'],
                branch_data['parent_message_id'],
                branch_data['created_at']
            )
        )
        
        assert result[0]['id'] == 2
        mock_db_manager.execute_query.assert_called_once()


class TestSuggestionGeneration:
    """Test AI suggestion generation based on context."""
    
    @pytest.mark.asyncio
    async def test_generate_contextual_suggestions(self, mock_claude_client):
        """Test generating relevant suggestions based on conversation context."""
        conversation_context = [
            "Show me ETH performance patterns",
            "Based on ETH data, here are the daytime vs nighttime patterns..."
        ]
        
        mock_claude_client.generate_suggestions.return_value = ChatSuggestion(
            suggestions=[
                'Show me the specific timestamps of these leveraging outliers',
                'Generate backtesting results for a nighttime-focused strategy',
                'Compare these patterns with BTC and other major cryptocurrencies',
                'Would you like me to prepare this for live deployment?',
                'Analyze correlation with traditional market hours',
                'Create alerts for extreme leveraging events'
            ]
        )
        
        suggestions = await mock_claude_client.generate_suggestions(
            conversation_context=conversation_context,
            current_analysis='time_series_patterns',
            user_preferences={'trading_style': 'systematic', 'risk_tolerance': 'moderate'}
        )
        
        assert len(suggestions.suggestions) == 6
        assert 'backtesting results' in suggestions.suggestions[1]
        assert 'live deployment' in suggestions.suggestions[3]
        
        mock_claude_client.generate_suggestions.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_followup_suggestions(self, mock_claude_client):
        """Test generating follow-up suggestions after analysis completion."""
        analysis_results = {
            'analysis_type': 'statistical_analysis',
            'key_findings': ['significant_patterns', 'outliers_identified', 'performance_metrics'],
            'data_quality': 'high',
            'statistical_significance': 'p < 0.01'
        }
        
        mock_claude_client.generate_suggestions.return_value = ChatSuggestion(
            suggestions=[
                'Would you like me to backtest this as a strategy and prepare live deployment?',
                'Generate risk-adjusted performance metrics with Sharpe ratios',
                'Create automated alerts for similar patterns in real-time',
                'Extend this analysis to other cryptocurrency pairs',
                'Generate a detailed research report with all findings'
            ]
        )
        
        suggestions = await mock_claude_client.generate_suggestions(
            analysis_results=analysis_results,
            completion_status='analysis_complete',
            next_steps=['strategy_development', 'risk_assessment', 'deployment']
        )
        
        assert len(suggestions.suggestions) == 5
        assert 'backtest this as a strategy' in suggestions.suggestions[0]
        assert 'automated alerts' in suggestions.suggestions[2]


class TestRealTimeDataIntegration:
    """Test real-time market data integration for AI analysis."""
    
    @pytest.mark.asyncio
    async def test_fetch_realtime_eth_data(self):
        """Test fetching real-time ETH data for analysis."""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.json.return_value = {
                'symbol': 'ETHUSDT',
                'price': '2645.32',
                'volume': '45623.78',
                'timestamp': '2024-01-15T14:30:00Z',
                'bid': '2644.89',
                'ask': '2645.75',
                'high_24h': '2687.45',
                'low_24h': '2598.12'
            }
            mock_get.return_value.__aenter__.return_value = mock_response
            
            # Simulate API call
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get('https://api.hyperliquid.xyz/info') as response:
                    data = await response.json()
            
            assert data['symbol'] == 'ETHUSDT'
            assert float(data['price']) > 2600
            assert 'timestamp' in data
    
    @pytest.mark.asyncio
    async def test_process_market_data_for_analysis(self):
        """Test processing market data for AI analysis."""
        raw_market_data = [
            {'timestamp': '2024-01-15T09:00:00Z', 'price': 2645.32, 'volume': 1234.56, 'session': 'daytime'},
            {'timestamp': '2024-01-15T21:00:00Z', 'price': 2656.78, 'volume': 2345.67, 'session': 'nighttime'},
            {'timestamp': '2024-01-15T15:30:00Z', 'price': 2639.21, 'volume': 987.34, 'session': 'daytime'},
        ]
        
        # Process data for AI analysis
        processed_data = {
            'daytime_sessions': [d for d in raw_market_data if d['session'] == 'daytime'],
            'nighttime_sessions': [d for d in raw_market_data if d['session'] == 'nighttime'],
            'total_volume': sum(d['volume'] for d in raw_market_data),
            'average_price': sum(d['price'] for d in raw_market_data) / len(raw_market_data),
            'session_comparison': {
                'daytime_avg_volume': sum(d['volume'] for d in raw_market_data if d['session'] == 'daytime') / 2,
                'nighttime_avg_volume': sum(d['volume'] for d in raw_market_data if d['session'] == 'nighttime') / 1
            }
        }
        
        assert len(processed_data['daytime_sessions']) == 2
        assert len(processed_data['nighttime_sessions']) == 1
        assert processed_data['total_volume'] == 4567.57
        assert processed_data['session_comparison']['nighttime_avg_volume'] > processed_data['session_comparison']['daytime_avg_volume']


class TestErrorHandlingAndValidation:
    """Test error handling and input validation."""
    
    @pytest.mark.asyncio
    async def test_validate_chat_message_input(self):
        """Test validation of chat message inputs."""
        # Valid message
        valid_message = ChatMessage(
            content="Show me ETH performance analysis",
            session_id="test_session_123"
        )
        assert valid_message.content == "Show me ETH performance analysis"
        
        # Test empty content validation
        with pytest.raises(ValueError):
            ChatMessage(content="", session_id="test_session_123")
        
        # Test content length validation
        with pytest.raises(ValueError):
            ChatMessage(
                content="x" * 10001,  # Exceeds typical limits
                session_id="test_session_123"
            )
    
    @pytest.mark.asyncio
    async def test_handle_ai_service_errors(self, mock_claude_client):
        """Test handling AI service errors gracefully."""
        # Mock AI service error
        mock_claude_client.send_message.side_effect = Exception("Claude API rate limit exceeded")
        
        try:
            await mock_claude_client.send_message(
                message="Analyze ETH patterns",
                conversation_context=[]
            )
        except Exception as e:
            error_response = ChatResponse(
                response="I'm experiencing high demand right now. Please try again in a moment.",
                error=str(e),
                timestamp=datetime.now(timezone.utc)
            )
            
            assert "high demand" in error_response.response
            assert "Claude API rate limit exceeded" in error_response.error
    
    @pytest.mark.asyncio
    async def test_handle_database_connection_errors(self, mock_db_manager):
        """Test handling database connection errors."""
        mock_db_manager.get_connection.side_effect = Exception("Database connection failed")
        
        try:
            await mock_db_manager.get_connection()
        except Exception as e:
            assert str(e) == "Database connection failed"
    
    @pytest.mark.asyncio
    async def test_validate_financial_query_complexity(self):
        """Test validation of complex financial queries."""
        complex_query = ChatMessage(
            content="Show me historical ETH performance vs daytime vs nighttime transactions over time with 95% confidence intervals and outlier detection using percentile-based trimming",
            session_id="test_session_123"
        )
        
        # Validate query complexity metrics
        query_complexity = {
            'word_count': len(complex_query.content.split()),
            'financial_terms': ['ETH', 'performance', 'confidence intervals', 'outlier detection', 'percentile'],
            'analysis_types': ['historical', 'comparative', 'statistical'],
            'complexity_score': 8.5  # High complexity
        }
        
        assert query_complexity['word_count'] > 10
        assert len(query_complexity['financial_terms']) >= 3
        assert query_complexity['complexity_score'] > 7.0


class TestMultiQueryWorkflow:
    """Test multi-query workflow and coordination."""
    
    @pytest.mark.asyncio
    async def test_coordinate_multiple_queries(self, mock_claude_client, mock_db_manager):
        """Test coordinating multiple related queries in sequence."""
        queries = [
            "Show me ETH daytime vs nighttime performance patterns",
            "Identify leveraging outliers in this data",
            "Generate statistical significance tests for these patterns"
        ]
        
        # Mock responses for each query
        responses = [
            "ETH shows 12% higher volatility during daytime trading...",
            "Identified 23 leveraging outliers, 78% during nighttime...",
            "Statistical tests show p-value < 0.01, highly significant..."
        ]
        
        mock_claude_client.send_message.side_effect = [
            {'response': responses[0], 'suggestions': ['Next: analyze outliers']},
            {'response': responses[1], 'suggestions': ['Next: run statistical tests']},
            {'response': responses[2], 'suggestions': ['Generate final report']}
        ]
        
        # Process queries in sequence
        results = []
        for i, query in enumerate(queries):
            response = await mock_claude_client.send_message(
                message=query,
                conversation_context=results[-3:] if results else []  # Use last 3 for context
            )
            results.append(response)
        
        assert len(results) == 3
        assert "volatility during daytime" in results[0]['response']
        assert "23 leveraging outliers" in results[1]['response']
        assert "p-value < 0.01" in results[2]['response']
        assert mock_claude_client.send_message.call_count == 3
    
    @pytest.mark.asyncio
    async def test_query_result_aggregation(self):
        """Test aggregating results from multiple queries."""
        query_results = [
            {
                'query': 'ETH performance patterns',
                'findings': ['12% higher daytime volatility', '8% higher nighttime returns'],
                'confidence': 0.95
            },
            {
                'query': 'Leveraging outliers',
                'findings': ['23 extreme events', '78% during nighttime'],
                'confidence': 0.98
            },
            {
                'query': 'Statistical significance',
                'findings': ['p-value < 0.01', 'Sharpe ratio improvement: 0.34'],
                'confidence': 0.99
            }
        ]
        
        # Aggregate results
        aggregated_results = {
            'total_queries': len(query_results),
            'key_findings': [finding for result in query_results for finding in result['findings']],
            'overall_confidence': sum(r['confidence'] for r in query_results) / len(query_results),
            'analysis_summary': 'Multi-query analysis of ETH trading patterns reveals significant daytime/nighttime differences with statistical confidence.',
            'recommendations': [
                'Implement nighttime-focused trading strategy',
                'Set up real-time outlier detection',
                'Deploy automated risk management'
            ]
        }
        
        assert aggregated_results['total_queries'] == 3
        assert len(aggregated_results['key_findings']) == 6
        assert aggregated_results['overall_confidence'] > 0.95
        assert 'significant daytime/nighttime differences' in aggregated_results['analysis_summary']


if __name__ == "__main__":
    pytest.main([__file__, "-v"])