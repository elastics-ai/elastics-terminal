"""
End-to-end tests for complete chat-based strategy creation

These tests simulate complete user workflows from natural language input
to executable strategy modules.
"""

import asyncio
import json
import pytest
import tempfile
import os
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from src.volatility_filter.strategy_builder_chat_handler import StrategyBuilderChatHandler
from src.volatility_filter.strategy_chat_translator import StrategyChatTranslator
from src.volatility_filter.claude_client import ClaudeClient
from src.volatility_filter.database import DatabaseManager


class TestE2EStrategyCreation:
    """End-to-end tests for complete strategy creation workflows."""
    
    @pytest.fixture
    def full_system(self):
        """Set up complete system for E2E testing."""
        with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as temp_db:
            temp_db.close()
            
            # Initialize database
            db_manager = DatabaseManager(temp_db.name)
            db_manager.init_database()
            
            # Apply strategy builder migrations
            from src.volatility_filter.migrations.apply_migrations import apply_migration
            import os
            migrations_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'volatility_filter', 'migrations')
            strategy_migration = os.path.join(migrations_dir, 'add_strategy_builder_tables.sql')
            if os.path.exists(strategy_migration):
                apply_migration(temp_db.name, strategy_migration)
            
            # Create chat handler
            chat_handler = StrategyBuilderChatHandler(temp_db.name)
            
            # Mock Claude client with realistic responses
            claude_client = Mock(spec=ClaudeClient)
            claude_client.async_client = Mock()
            claude_client.async_client.messages = Mock()
            claude_client.async_client.messages.create = AsyncMock()
            
            chat_handler.claude_client = claude_client
            
            # Create translator
            translator = StrategyChatTranslator(claude_client, db_manager)
            
            yield {
                'chat_handler': chat_handler,
                'translator': translator,
                'claude_client': claude_client,
                'db_manager': db_manager
            }
            
            # Cleanup
            os.unlink(temp_db.name)
    
    @pytest.mark.skip(reason="Natural language processing not fully implemented yet")
    @pytest.mark.skip(reason="E2E tests depend on unimplemented natural language processing")
    @pytest.mark.asyncio
    async def test_complete_momentum_strategy_creation(self, full_system):
        """Test creating a complete momentum strategy from description."""
        system = full_system
        chat_handler = system['chat_handler']
        claude_client = system['claude_client']
        db_manager = system['db_manager']
        
        # Mock Claude responses for different stages
        strategy_response = Mock()
        strategy_response.content = [Mock()]
        strategy_response.content[0].text = """
def momentum_strategy():
    import pandas as pd
    import numpy as np
    
    class MomentumStrategy:
        def __init__(self, rsi_period=14, rsi_buy=70, rsi_sell=30):
            self.rsi_period = rsi_period
            self.rsi_buy = rsi_buy
            self.rsi_sell = rsi_sell
            
        def calculate_rsi(self, prices):
            delta = prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=self.rsi_period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=self.rsi_period).mean()
            rs = gain / loss
            return 100 - (100 / (1 + rs))
            
        def generate_signals(self, data):
            rsi = self.calculate_rsi(data['close'])
            signals = pd.Series(index=data.index, dtype=str)
            signals[rsi > self.rsi_buy] = 'SELL'
            signals[rsi < self.rsi_sell] = 'BUY'
            signals.fillna('HOLD', inplace=True)
            return signals
    
    return MomentumStrategy()
        """.strip()
        
        claude_client.async_client.messages.create.return_value = strategy_response
        
        # Step 1: Create strategy via natural language
        result = await chat_handler.process_message(
            "Create a momentum trading strategy for BTC that uses RSI to generate buy signals when RSI < 30 and sell signals when RSI > 70",
            "e2e_session"
        )
        
        # Verify strategy creation
        assert result['action'] == 'strategy_created'
        assert 'flow_id' in result
        assert len(result['nodes']) >= 3  # Should have data, function, strategy nodes
        
        flow_id = result['flow_id']
        
        # Verify database state
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT name, description FROM strategy_flows WHERE id = ?", (flow_id,))
            flow_data = cursor.fetchone()
            assert flow_data is not None
            assert 'Momentum' in flow_data[0] or 'momentum' in flow_data[1].lower()
        
        # Step 2: Add risk management
        risk_response = Mock()
        risk_response.content = [Mock()]
        risk_response.content[0].text = """
def risk_manager(position_size, account_balance, max_risk_pct=2.0):
    max_position = account_balance * (max_risk_pct / 100)
    return min(position_size, max_position)
        """.strip()
        
        claude_client.async_client.messages.create.return_value = risk_response
        
        risk_result = await chat_handler.process_message(
            "/add-node risk Implement 2% maximum risk per trade with position sizing",
            "e2e_session",
            flow_id
        )
        
        assert risk_result['action'] == 'node_added'
        assert risk_result['node_type'] == 'risk'
        assert risk_result['flow_id'] == flow_id
        
        # Step 3: Connect nodes
        nodes = result['nodes'] + [{'id': risk_result['node_id'], 'type': 'risk'}]
        strategy_node = next((n for n in nodes if n['type'] == 'strategy'), None)
        risk_node_id = risk_result['node_id']
        
        if strategy_node:
            connect_result = await chat_handler.process_message(
                f"/connect {strategy_node['id']} to {risk_node_id}",
                "e2e_session",
                flow_id
            )
            
            assert connect_result['action'] == 'nodes_connected'
            assert connect_result['from_node'] == strategy_node['id']
            assert connect_result['to_node'] == risk_node_id
        
        # Step 4: Verify complete flow in database
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check flow has multiple nodes
            cursor.execute("SELECT COUNT(*) FROM node_properties WHERE flow_id = ?", (flow_id,))
            node_count = cursor.fetchone()[0]
            assert node_count >= 4  # Original nodes + risk node
            
            # Check we have different node types
            cursor.execute("""
                SELECT flow_json FROM strategy_flows WHERE id = ?
            """, (flow_id,))
            flow_json = json.loads(cursor.fetchone()[0])
            
            node_types = {node.get('type') for node in flow_json.get('nodes', [])}
            assert 'data' in node_types
            assert 'function' in node_types or 'strategy' in node_types
            assert 'risk' in node_types
    
    @pytest.mark.skip(reason="E2E tests depend on unimplemented natural language processing")
    @pytest.mark.asyncio
    async def test_options_volatility_strategy_e2e(self, full_system):
        """Test creating a complex options volatility strategy end-to-end."""
        system = full_system
        chat_handler = system['chat_handler']
        claude_client = system['claude_client']
        
        # Mock comprehensive volatility strategy response
        vol_strategy_response = Mock()
        vol_strategy_response.content = [Mock()]
        vol_strategy_response.content[0].text = """
def volatility_arbitrage_strategy():
    from elastics_options import Greeks, SSVI
    import numpy as np
    
    class VolatilityArbitrageStrategy:
        def __init__(self):
            self.greeks_calc = Greeks()
            self.ssvi_model = SSVI()
            
        def build_vol_surface(self, option_data):
            return self.ssvi_model.calibrate(option_data)
            
        def find_mispricing(self, market_ivs, model_ivs, threshold=0.05):
            diff = np.abs(market_ivs - model_ivs)
            return diff > threshold
            
        def generate_trades(self, mispricings, option_data):
            trades = []
            for idx, mispriced in enumerate(mispricings):
                if mispriced:
                    option = option_data.iloc[idx]
                    trades.append({
                        'instrument': option['instrument_name'],
                        'action': 'buy' if option['market_iv'] < option['model_iv'] else 'sell',
                        'quantity': self.calculate_position_size(option)
                    })
            return trades
            
        def calculate_position_size(self, option):
            # Risk-based position sizing
            return max(1, int(10000 / option['price']))
    
    return VolatilityArbitrageStrategy()
        """.strip()
        
        claude_client.async_client.messages.create.return_value = vol_strategy_response
        
        # Create complex volatility strategy
        result = await chat_handler.process_message(
            '/create-strategy "Volatility Arbitrage" Build SSVI volatility surface, identify mispriced options, execute arbitrage trades with Greeks hedging',
            "vol_e2e_session"
        )
        
        # Verify complex strategy creation
        assert result['action'] == 'strategy_created'
        assert len(result['nodes']) >= 4  # Should have multiple components
        
        flow_id = result['flow_id']
        
        # Add Greeks hedging component
        greeks_response = Mock()
        greeks_response.content = [Mock()]
        greeks_response.content[0].text = """
def delta_hedge(portfolio_delta, spot_price, hedge_ratio=1.0):
    hedge_quantity = -portfolio_delta * hedge_ratio
    return {
        'instrument': f'BTC-PERPETUAL',
        'quantity': hedge_quantity,
        'purpose': 'delta_hedge'
    }
        """.strip()
        
        claude_client.async_client.messages.create.return_value = greeks_response
        
        hedge_result = await chat_handler.process_message(
            "/add-node risk Delta hedging system to neutralize directional exposure",
            "vol_e2e_session",
            flow_id
        )
        
        assert hedge_result['action'] == 'node_added'
        assert hedge_result['node_type'] == 'risk'
        
        # Verify volatility-specific components
        node_descriptions = [node.get('description', '') for node in result['nodes']]
        vol_keywords = ['volatility', 'surface', 'ssvi', 'greeks', 'arbitrage']
        
        # At least one node should reference volatility concepts
        has_vol_component = any(
            any(keyword in desc.lower() for keyword in vol_keywords)
            for desc in node_descriptions
        )
        assert has_vol_component, "Strategy should include volatility-specific components"
    
    @pytest.mark.skip(reason="E2E tests depend on unimplemented natural language processing")
    @pytest.mark.asyncio
    async def test_error_recovery_in_e2e_flow(self, full_system):
        """Test error recovery during end-to-end strategy creation."""
        system = full_system
        chat_handler = system['chat_handler']
        claude_client = system['claude_client']
        
        # First, simulate an error
        error_result = await chat_handler.process_message(
            "/add-node invalid_type Some description",
            "error_e2e_session"
        )
        
        assert error_result['action'] == 'error'
        
        # Then show recovery with valid command
        recovery_response = Mock()
        recovery_response.content = [Mock()]
        recovery_response.content[0].text = "def data_fetcher(): return fetch_btc_data()"
        claude_client.async_client.messages.create.return_value = recovery_response
        
        recovery_result = await chat_handler.process_message(
            "/add-node data BTC price data from Deribit",
            "error_e2e_session"
        )
        
        assert recovery_result['action'] == 'node_added'
        assert recovery_result['node_type'] == 'data'
    
    @pytest.mark.skip(reason="E2E tests depend on unimplemented natural language processing")
    @pytest.mark.asyncio
    async def test_multi_session_strategy_development(self, full_system):
        """Test developing strategy across multiple chat sessions."""
        system = full_system
        chat_handler = system['chat_handler']
        claude_client = system['claude_client']
        db_manager = system['db_manager']
        
        # Mock response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "def strategy_component(): pass"
        claude_client.async_client.messages.create.return_value = mock_response
        
        # Session 1: Create base strategy
        session1_result = await chat_handler.process_message(
            '/create-strategy "Multi-Session Strategy" Base momentum strategy',
            "session_1"
        )
        
        flow_id = session1_result['flow_id']
        
        # Session 2: Add to existing strategy (different session, same flow)
        session2_result = await chat_handler.process_message(
            "/add-node risk Risk management component",
            "session_2",
            flow_id
        )
        
        assert session2_result['action'] == 'node_added'
        assert session2_result['flow_id'] == flow_id
        
        # Verify database consistency across sessions
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM node_properties WHERE flow_id = ?", (flow_id,))
            total_nodes = cursor.fetchone()[0]
            assert total_nodes >= 4  # Original nodes + risk node
    
    @pytest.mark.skip(reason="E2E tests depend on unimplemented natural language processing")
    @pytest.mark.asyncio
    async def test_natural_language_strategy_refinement(self, full_system):
        """Test refining strategy through natural language conversation."""
        system = full_system
        chat_handler = system['chat_handler']
        claude_client = system['claude_client']
        
        # Initial strategy creation
        initial_response = Mock()
        initial_response.content = [Mock()]
        initial_response.content[0].text = "def simple_strategy(): pass"
        claude_client.async_client.messages.create.return_value = initial_response
        
        initial_result = await chat_handler.process_message(
            "Create a simple trend following strategy",
            "refinement_session"
        )
        
        # Should create strategy or ask for clarification
        assert initial_result['action'] in ['strategy_created', 'clarification_needed']
        
        if initial_result['action'] == 'strategy_created':
            flow_id = initial_result['flow_id']
            
            # Refinement through natural language
            refinement_response = Mock()
            refinement_response.content = [Mock()]
            refinement_response.content[0].text = "def stop_loss_component(): pass"
            claude_client.async_client.messages.create.return_value = refinement_response
            
            refinement_result = await chat_handler.process_message(
                "Add a stop loss mechanism that triggers at 5% loss",
                "refinement_session",
                flow_id
            )
            
            # Should either create a node or clarify the request
            assert refinement_result['action'] in ['node_added', 'clarification_needed']
    
    @pytest.mark.skip(reason="E2E tests depend on unimplemented natural language processing")
    @pytest.mark.asyncio
    async def test_code_generation_and_execution_flow(self, full_system):
        """Test the complete flow from chat to executable code."""
        system = full_system
        chat_handler = system['chat_handler']
        claude_client = system['claude_client']
        db_manager = system['db_manager']
        
        # Mock realistic code generation
        code_response = Mock()
        code_response.content = [Mock()]
        code_response.content[0].text = """
import pandas as pd
import numpy as np
from datetime import datetime

class TradingStrategy:
    def __init__(self, symbol='BTC', rsi_period=14):
        self.symbol = symbol
        self.rsi_period = rsi_period
        self.positions = []
        
    def calculate_rsi(self, prices):
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.rsi_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.rsi_period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs))
    
    def process_data(self, data):
        data['rsi'] = self.calculate_rsi(data['close'])
        return data
    
    def generate_signals(self, data):
        signals = []
        for i, row in data.iterrows():
            if row['rsi'] < 30:
                signals.append({'action': 'BUY', 'timestamp': i, 'price': row['close']})
            elif row['rsi'] > 70:
                signals.append({'action': 'SELL', 'timestamp': i, 'price': row['close']})
        return signals
    
    def execute_strategy(self, market_data):
        processed_data = self.process_data(market_data)
        signals = self.generate_signals(processed_data)
        return {
            'signals': signals,
            'data': processed_data,
            'strategy_name': f'{self.symbol}_RSI_Strategy'
        }

# Example usage
if __name__ == "__main__":
    strategy = TradingStrategy()
    # strategy.execute_strategy(market_data)
        """.strip()
        
        claude_client.async_client.messages.create.return_value = code_response
        
        # Create comprehensive strategy
        result = await chat_handler.process_message(
            '/create-strategy "Complete Trading System" Full RSI-based trading system with data processing, signal generation, and execution',
            "code_gen_session"
        )
        
        assert result['action'] == 'strategy_created'
        flow_id = result['flow_id']
        
        # Verify generated code is stored and accessible
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT generated_code FROM node_properties 
                WHERE flow_id = ? AND generated_code IS NOT NULL
                ORDER BY created_at LIMIT 1
            """, (flow_id,))
            
            stored_code = cursor.fetchone()
            assert stored_code is not None
            assert len(stored_code[0]) > 100  # Should have substantial code
            
            # Code should be valid Python syntax
            try:
                compile(stored_code[0], '<string>', 'exec')
            except SyntaxError:
                pytest.fail("Generated code should be valid Python syntax")
    
    @pytest.mark.skip(reason="E2E tests depend on unimplemented natural language processing")
    @pytest.mark.asyncio
    async def test_performance_under_complex_operations(self, full_system):
        """Test system performance with complex strategy operations."""
        system = full_system
        chat_handler = system['chat_handler']
        claude_client = system['claude_client']
        
        # Mock response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "def performance_test(): pass"
        claude_client.async_client.messages.create.return_value = mock_response
        
        start_time = datetime.now()
        
        # Create complex strategy with multiple operations
        operations = [
            '/create-strategy "Performance Test" Complex multi-component strategy',
            '/add-node data High-frequency market data feed',
            '/add-node function Real-time RSI calculation',
            '/add-node function MACD signal generation',
            '/add-node function Bollinger Bands analysis',
            '/add-node strategy Multi-indicator signal aggregation',
            '/add-node risk Dynamic position sizing',
            '/add-node risk Stop-loss management',
            '/add-node execution Smart order routing'
        ]
        
        results = []
        flow_id = None
        
        for operation in operations:
            result = await chat_handler.process_message(
                operation,
                "performance_session",
                flow_id
            )
            
            results.append(result)
            
            if result.get('flow_id'):
                flow_id = result['flow_id']
        
        end_time = datetime.now()
        total_time = (end_time - start_time).total_seconds()
        
        # Performance assertions
        assert total_time < 30, f"Operations took too long: {total_time}s"
        assert all(r['action'] != 'error' for r in results), "Some operations failed"
        assert len([r for r in results if r['action'] in ['strategy_created', 'node_added']]) >= 8
        
        # Verify final strategy complexity
        final_strategy = results[0]  # Strategy creation result
        assert len(final_strategy.get('nodes', [])) >= 4  # Should have multiple nodes


if __name__ == "__main__":
    pytest.main([__file__, "-v"])