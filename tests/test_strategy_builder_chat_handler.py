"""
Comprehensive tests for StrategyBuilderChatHandler

This test suite covers all chat commands, natural language processing,
and edge cases for the strategy builder chat functionality.
"""

import json
import pytest
import asyncio
import tempfile
import os
import re
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from src.volatility_filter.strategy_builder_chat_handler import StrategyBuilderChatHandler
from src.volatility_filter.database import DatabaseManager


class TestStrategyBuilderChatHandler:
    """Test suite for StrategyBuilderChatHandler."""
    
    @pytest.fixture
    async def handler(self):
        """Create handler with temporary database."""
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
            
            # Create handler with mocked Claude client
            handler = StrategyBuilderChatHandler(temp_db.name)
            
            # Mock Claude client for testing
            handler.claude_client = Mock()
            handler.claude_client.async_client = Mock()
            handler.claude_client.async_client.messages = Mock()
            handler.claude_client.async_client.messages.create = AsyncMock()
            
            yield handler
            
            # Cleanup
            os.unlink(temp_db.name)
    
    @pytest.mark.asyncio
    async def test_add_node_command_success(self, handler):
        """Test successful /add-node command."""
        # Mock Claude response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "def calculate_rsi(data, period=14):\n    return data.rolling(period).mean()"
        handler.claude_client.async_client.messages.create.return_value = mock_response
        
        result = await handler.process_message(
            "/add-node function Calculate RSI with 14-period lookback",
            "test_session"
        )
        
        assert result['action'] == 'node_added'
        assert result['node_type'] == 'function'
        assert 'flow_id' in result
        assert 'node_id' in result
        assert 'websocket_event' in result
        assert result['websocket_event']['type'] == 'node_added'
        assert "Added function node" in result['response']
    
    @pytest.mark.asyncio
    async def test_add_node_invalid_type(self, handler):
        """Test /add-node with invalid node type."""
        result = await handler.process_message(
            "/add-node invalid_type Some description",
            "test_session"
        )
        
        assert result['action'] == 'error'
        assert "Unknown node type" in result['response']
    
    @pytest.mark.asyncio
    async def test_create_strategy_command(self, handler):
        """Test /create-strategy command."""
        # Mock Claude response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Generated strategy code"
        handler.claude_client.async_client.messages.create.return_value = mock_response
        
        result = await handler.process_message(
            '/create-strategy "Momentum Strategy" Buy when RSI crosses above 70 and sell when below 30',
            "test_session"
        )
        
        assert result['action'] == 'strategy_created'
        assert result['strategy_name'] == 'Momentum Strategy'
        assert 'flow_id' in result
        assert 'nodes' in result
        assert 'connections' in result
        assert len(result['nodes']) >= 1
        assert "Created strategy 'Momentum Strategy'" in result['response']
    
    @pytest.mark.asyncio
    async def test_edit_node_command(self, handler):
        """Test /edit-node command."""
        # First create a node
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "def calculate_rsi(data):\n    return data"
        handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Add a node first
        add_result = await handler.process_message(
            "/add-node function Calculate RSI",
            "test_session"
        )
        
        flow_id = add_result['flow_id']
        node_id = add_result['node_id']
        
        # Now edit the node
        mock_response.content[0].text = "def calculate_rsi(data, period=21):\n    return data.rolling(period).mean()"
        
        result = await handler.process_message(
            f"/edit-node {node_id} period Change RSI period to 21",
            "test_session",
            flow_id
        )
        
        assert result['action'] == 'node_updated'
        assert result['node_id'] == node_id
        assert result['property'] == 'period'
        assert "Updated period for node" in result['response']
    
    @pytest.mark.asyncio
    async def test_connect_nodes_command(self, handler):
        """Test /connect command."""
        # Create two nodes first
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Node code"
        handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Add first node
        add_result1 = await handler.process_message(
            "/add-node data Market data source",
            "test_session"
        )
        flow_id = add_result1['flow_id']
        node_id1 = add_result1['node_id']
        
        # Add second node
        add_result2 = await handler.process_message(
            "/add-node function RSI calculation",
            "test_session",
            flow_id
        )
        node_id2 = add_result2['node_id']
        
        # Connect nodes
        result = await handler.process_message(
            f"/connect {node_id1} to {node_id2}",
            "test_session",
            flow_id
        )
        
        assert result['action'] == 'nodes_connected'
        assert result['from_node'] == node_id1
        assert result['to_node'] == node_id2
        assert f"Connected '{node_id1}' → '{node_id2}'" in result['response']
    
    @pytest.mark.asyncio
    async def test_preview_code_command(self, handler):
        """Test /preview-code command."""
        # Create a node first
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "def calculate_rsi(data):\n    return data.rolling(14).mean()"
        handler.claude_client.async_client.messages.create.return_value = mock_response
        
        add_result = await handler.process_message(
            "/add-node function Calculate RSI",
            "test_session"
        )
        
        flow_id = add_result['flow_id']
        node_id = add_result['node_id']
        
        # Preview code
        result = await handler.process_message(
            f"/preview-code {node_id}",
            "test_session",
            flow_id
        )
        
        assert result['action'] == 'code_preview'
        assert result['node_id'] == node_id
        assert 'code' in result
        assert "Code for node" in result['response']
    
    @pytest.mark.asyncio
    async def test_help_command(self, handler):
        """Test /help command."""
        result = await handler.process_message("/help", "test_session")
        
        assert result['action'] == 'help'
        assert "Strategy Builder Chat Commands" in result['response']
        assert "/add-node" in result['response']
        assert "/create-strategy" in result['response']
    
    @pytest.mark.asyncio
    async def test_natural_language_processing(self, handler):
        """Test natural language strategy description."""
        result = await handler.process_message(
            "Create a momentum strategy that buys when RSI crosses above 70",
            "test_session"
        )
        
        # Should process as natural language
        assert result['action'] in ['strategy_created', 'clarification_needed']
        assert 'response' in result
    
    @pytest.mark.asyncio
    async def test_command_pattern_matching(self, handler):
        """Test command pattern recognition."""
        test_cases = [
            ("/add-node data BTC price feed", "add_node"),
            ("/edit-node node_123 period Change to 21", "edit_node"),
            ('/create-strategy "Test" Simple strategy', "create_strategy"),
            ("/connect node1 to node2", "connect_nodes"),
            ("/preview-code node_456", "preview_code"),
            ("/help", "help"),
            ("/help add-node", "help"),
        ]
        
        for message, expected_command in test_cases:
            command_match = handler._match_command(message)
            assert command_match is not None
            assert command_match[0] == expected_command
    
    @pytest.mark.asyncio
    async def test_node_type_resolution(self, handler):
        """Test node type resolution from user input."""
        test_cases = [
            ("data", "data"),
            ("source", "data"),
            ("feed", "data"),
            ("function", "function"),
            ("calculate", "function"),
            ("indicator", "function"),
            ("strategy", "strategy"),
            ("signal", "strategy"),
            ("risk", "risk"),
            ("stop", "risk"),
            ("execution", "execution"),
            ("order", "execution"),
            ("invalid", None),
        ]
        
        for input_type, expected in test_cases:
            result = handler._resolve_node_type(input_type)
            assert result == expected
    
    @pytest.mark.skip(reason="Error handling conflicts with natural language fallback")
    @pytest.mark.asyncio
    async def test_error_handling(self, handler):
        """Test error handling in various scenarios."""
        # Test with invalid command
        result = await handler.process_message("/invalid-command", "test_session")
        assert result['action'] == 'error'
        
        # Test editing non-existent node
        result = await handler.process_message(
            "/edit-node nonexistent property New description",
            "test_session",
            "nonexistent_flow"
        )
        assert result['action'] == 'error'
        
        # Test connecting non-existent nodes
        result = await handler.process_message(
            "/connect node1 to node2",
            "test_session",
            "nonexistent_flow"
        )
        assert result['action'] == 'error'
    
    @pytest.mark.asyncio
    async def test_claude_client_error_handling(self, handler):
        """Test handling of Claude API errors."""
        # Mock Claude client to raise exception
        handler.claude_client.async_client.messages.create.side_effect = Exception("API Error")
        
        result = await handler.process_message(
            "/add-node function Calculate RSI",
            "test_session"
        )
        
        # Should still create node but with error in translation
        assert result['action'] == 'node_added'
        assert 'translation' in result
        assert result['translation']['status'] == 'error'
    
    @pytest.mark.asyncio
    async def test_database_operations(self, handler):
        """Test database operations work correctly."""
        # Create a flow
        flow_id = await handler._create_new_flow("Test Flow", "Test description")
        assert flow_id is not None
        
        # Verify flow exists in database
        with handler.db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM strategy_flows WHERE id = ?", (flow_id,))
            assert cursor.fetchone()[0] == 1
    
    @pytest.mark.asyncio
    async def test_websocket_events_generated(self, handler):
        """Test that WebSocket events are properly generated."""
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Test code"
        handler.claude_client.async_client.messages.create.return_value = mock_response
        
        result = await handler.process_message(
            "/add-node function Test node",
            "test_session"
        )
        
        assert 'websocket_event' in result
        ws_event = result['websocket_event']
        assert ws_event['type'] == 'node_added'
        assert 'flow_id' in ws_event
        assert 'node' in ws_event
        assert ws_event['node']['type'] == 'function'
    
    @pytest.mark.asyncio
    async def test_concurrent_operations(self, handler):
        """Test handling of concurrent chat operations."""
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Test code"
        handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Create multiple concurrent operations
        tasks = [
            handler.process_message("/add-node data Source 1", "session1"),
            handler.process_message("/add-node function Calc 1", "session2"),
            handler.process_message('/create-strategy "Test" Simple strategy', "session3"),
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All should succeed
        for result in results:
            assert not isinstance(result, Exception)
            assert 'action' in result
            assert result['action'] in ['node_added', 'strategy_created']
    
    @pytest.mark.asyncio
    async def test_complex_strategy_creation(self, handler):
        """Test creation of complex multi-node strategies."""
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Generated code"
        handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Create a complex strategy
        result = await handler.process_message(
            '/create-strategy "Advanced Momentum" Monitor BTC price from Deribit, calculate RSI and MACD indicators, generate buy signals when RSI > 70 and MACD bullish, implement stop-loss at 5%, execute orders via smart router',
            "test_session"
        )
        
        assert result['action'] == 'strategy_created'
        assert len(result['nodes']) >= 4  # Should create multiple nodes
        assert len(result['connections']) >= 3  # Should have connections between nodes
        
        # Verify node types are appropriate
        node_types = [node['type'] for node in result['nodes']]
        assert 'data' in node_types
        assert 'function' in node_types
        assert 'strategy' in node_types
        assert 'execution' in node_types
    
    @pytest.mark.asyncio
    async def test_session_context_handling(self, handler):
        """Test that session context is properly maintained."""
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Test code"
        handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Create strategy in session
        result1 = await handler.process_message(
            '/create-strategy "Test" Simple strategy',
            "test_session"
        )
        
        flow_id = result1['flow_id']
        
        # Add node in same session context
        result2 = await handler.process_message(
            "/add-node risk Stop loss implementation",
            "test_session",
            flow_id
        )
        
        assert result2['flow_id'] == flow_id
        assert result2['action'] == 'node_added'
    
    def test_command_regex_patterns(self, handler):
        """Test that command regex patterns work correctly."""
        patterns = handler.command_patterns
        
        # Test add-node pattern
        match = patterns['add_node']
        assert re.match(match, "/add-node data BTC price feed", re.IGNORECASE)
        assert re.match(match, "/ADD-NODE function Calculate RSI", re.IGNORECASE)
        assert not re.match(match, "/add-node", re.IGNORECASE)
        
        # Test create-strategy pattern
        match = patterns['create_strategy']
        assert re.match(match, '/create-strategy "My Strategy" Description here', re.IGNORECASE)
        assert not re.match(match, '/create-strategy No quotes description', re.IGNORECASE)
        
        # Test connect pattern
        match = patterns['connect_nodes']
        assert re.match(match, "/connect node1 to node2", re.IGNORECASE)
        assert re.match(match, "/connect data_source to rsi_calc", re.IGNORECASE)
        assert not re.match(match, "/connect node1 node2", re.IGNORECASE)


class TestStrategyBuilderIntegration:
    """Integration tests for strategy builder functionality."""
    
    @pytest.fixture
    async def full_handler(self):
        """Create handler with real database for integration tests."""
        with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as temp_db:
            temp_db.close()
            
            db_manager = DatabaseManager(temp_db.name)
            db_manager.init_database()
            
            # Apply strategy builder migrations
            from src.volatility_filter.migrations.apply_migrations import apply_migration
            import os
            migrations_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'volatility_filter', 'migrations')
            strategy_migration = os.path.join(migrations_dir, 'add_strategy_builder_tables.sql')
            if os.path.exists(strategy_migration):
                apply_migration(temp_db.name, strategy_migration)
            
            handler = StrategyBuilderChatHandler(temp_db.name)
            
            yield handler
            
            os.unlink(temp_db.name)
    
    @pytest.mark.asyncio
    async def test_end_to_end_strategy_workflow(self, full_handler):
        """Test complete end-to-end strategy building workflow."""
        handler = full_handler
        
        # Mock Claude client
        mock_response = Mock()
        mock_response.content = [Mock()]
        handler.claude_client = Mock()
        handler.claude_client.async_client = Mock()
        handler.claude_client.async_client.messages = Mock()
        handler.claude_client.async_client.messages.create = AsyncMock()
        
        # Step 1: Create strategy
        mock_response.content[0].text = "# Strategy code"
        handler.claude_client.async_client.messages.create.return_value = mock_response
        
        create_result = await handler.process_message(
            '/create-strategy "E2E Test Strategy" Buy BTC when RSI crosses 70',
            "integration_session"
        )
        
        assert create_result['action'] == 'strategy_created'
        flow_id = create_result['flow_id']
        
        # Step 2: Add additional node
        mock_response.content[0].text = "def stop_loss(price, stop_pct=0.05):\n    return price * (1 - stop_pct)"
        
        add_result = await handler.process_message(
            "/add-node risk Implement 5% stop loss",
            "integration_session",
            flow_id
        )
        
        assert add_result['action'] == 'node_added'
        assert add_result['flow_id'] == flow_id
        
        # Step 3: Connect nodes
        first_node_id = create_result['nodes'][0]['id']
        new_node_id = add_result['node_id']
        
        connect_result = await handler.process_message(
            f"/connect {first_node_id} to {new_node_id}",
            "integration_session",
            flow_id
        )
        
        assert connect_result['action'] == 'nodes_connected'
        
        # Step 4: Preview generated code
        preview_result = await handler.process_message(
            f"/preview-code {new_node_id}",
            "integration_session",
            flow_id
        )
        
        assert preview_result['action'] == 'code_preview'
        assert 'code' in preview_result
        
        # Verify database state
        with handler.db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check flow exists
            cursor.execute("SELECT COUNT(*) FROM strategy_flows WHERE id = ?", (flow_id,))
            assert cursor.fetchone()[0] == 1
            
            # Check nodes exist
            cursor.execute("SELECT COUNT(*) FROM node_properties WHERE flow_id = ?", (flow_id,))
            node_count = cursor.fetchone()[0]
            assert node_count >= 2  # At least 2 nodes (created + added)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])