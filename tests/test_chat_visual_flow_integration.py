"""
Integration tests for chat-to-visual-flow synchronization

These tests ensure that chat commands properly synchronize with the visual
flow builder through WebSocket events and database state.
"""

import asyncio
import json
import pytest
import tempfile
import os
import websockets
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from src.volatility_filter.strategy_builder_chat_handler import StrategyBuilderChatHandler
from src.volatility_filter.real_time_strategy_service import RealTimeStrategyService
from src.volatility_filter.websocket_server import WebSocketBroadcastServer
from src.volatility_filter.database import DatabaseManager


class TestChatVisualFlowIntegration:
    """Integration tests for chat and visual flow synchronization."""
    
    @pytest.fixture
    def setup_services(self):
        """Set up all services needed for integration testing."""
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
            
            # Mock WebSocket server
            websocket_server = Mock(spec=WebSocketBroadcastServer)
            websocket_server.broadcast_to_subscribers = AsyncMock()
            
            # Create services
            strategy_service = RealTimeStrategyService(websocket_server, db_manager)
            chat_handler = StrategyBuilderChatHandler(temp_db.name)
            
            # Mock Claude client
            chat_handler.claude_client = Mock()
            chat_handler.claude_client.async_client = Mock()
            chat_handler.claude_client.async_client.messages = Mock()
            chat_handler.claude_client.async_client.messages.create = AsyncMock()
            
            yield {
                'chat_handler': chat_handler,
                'strategy_service': strategy_service,
                'websocket_server': websocket_server,
                'db_manager': db_manager
            }
            
            # Cleanup
            os.unlink(temp_db.name)
    
    @pytest.mark.asyncio
    async def test_chat_strategy_creation_triggers_websocket_events(self, setup_services):
        """Test that creating a strategy via chat triggers proper WebSocket events."""
        services = setup_services
        chat_handler = services['chat_handler']
        strategy_service = services['strategy_service']
        websocket_server = services['websocket_server']
        
        # Mock Claude response for strategy creation
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Generated strategy code"
        chat_handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Process chat command
        result = await chat_handler.process_message(
            '/create-strategy "Test Strategy" Simple momentum strategy with RSI',
            "test_session"
        )
        
        # Verify chat handler response
        assert result['action'] == 'strategy_created'
        assert 'flow_id' in result
        assert 'nodes' in result
        assert len(result['nodes']) >= 1
        
        # Simulate WebSocket event broadcast
        await strategy_service.handle_strategy_created(result, "test_session")
        
        # Verify WebSocket event was broadcasted
        websocket_server.broadcast_to_subscribers.assert_called_once()
        call_args = websocket_server.broadcast_to_subscribers.call_args[0]
        broadcast_message = json.loads(call_args[0])
        
        assert broadcast_message['type'] == 'strategy_builder_event'
        assert broadcast_message['event_type'] == 'strategy_created'
        assert broadcast_message['session_id'] == "test_session"
        assert broadcast_message['data']['flow_id'] == result['flow_id']
    
    @pytest.mark.asyncio
    async def test_chat_node_addition_synchronizes_with_visual_flow(self, setup_services):
        """Test that adding nodes via chat properly synchronizes with visual flow."""
        services = setup_services
        chat_handler = services['chat_handler']
        strategy_service = services['strategy_service']
        websocket_server = services['websocket_server']
        
        # Mock Claude response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "def calculate_rsi(data, period=14):\n    return data.rolling(period).mean()"
        chat_handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # First create a strategy
        strategy_result = await chat_handler.process_message(
            '/create-strategy "Base Strategy" Basic strategy',
            "test_session"
        )
        
        flow_id = strategy_result['flow_id']
        
        # Add a node to the existing strategy
        node_result = await chat_handler.process_message(
            "/add-node risk Implement 5% stop loss protection",
            "test_session",
            flow_id
        )
        
        # Verify node was added
        assert node_result['action'] == 'node_added'
        assert node_result['flow_id'] == flow_id
        assert node_result['node_type'] == 'risk'
        assert 'node_id' in node_result
        
        # Simulate WebSocket event
        await strategy_service.handle_node_added(node_result, flow_id, "test_session")
        
        # Verify WebSocket event
        websocket_server.broadcast_to_subscribers.assert_called()
        calls = websocket_server.broadcast_to_subscribers.call_args_list
        node_event_call = calls[-1]  # Latest call
        
        broadcast_message = json.loads(node_event_call[0][0])
        assert broadcast_message['event_type'] == 'node_added'
        assert broadcast_message['data']['node']['type'] == 'risk'
        assert broadcast_message['data']['flow_id'] == flow_id
    
    @pytest.mark.asyncio
    async def test_node_connection_chat_to_visual_sync(self, setup_services):
        """Test that connecting nodes via chat synchronizes with visual representation."""
        services = setup_services
        chat_handler = services['chat_handler']
        strategy_service = services['strategy_service']
        websocket_server = services['websocket_server']
        
        # Mock Claude response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Node code"
        chat_handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Create strategy with multiple nodes
        strategy_result = await chat_handler.process_message(
            '/create-strategy "Multi-Node Strategy" Strategy with data, function, and execution nodes',
            "test_session"
        )
        
        flow_id = strategy_result['flow_id']
        nodes = strategy_result['nodes']
        
        if len(nodes) >= 2:
            node1_id = nodes[0]['id']
            node2_id = nodes[1]['id']
            
            # Connect the nodes
            connect_result = await chat_handler.process_message(
                f"/connect {node1_id} to {node2_id}",
                "test_session",
                flow_id
            )
            
            # Verify connection
            assert connect_result['action'] == 'nodes_connected'
            assert connect_result['from_node'] == node1_id
            assert connect_result['to_node'] == node2_id
            
            # Simulate WebSocket event
            await strategy_service.handle_nodes_connected(connect_result, flow_id, "test_session")
            
            # Verify WebSocket event
            websocket_server.broadcast_to_subscribers.assert_called()
            calls = websocket_server.broadcast_to_subscribers.call_args_list
            connect_event_call = calls[-1]
            
            broadcast_message = json.loads(connect_event_call[0][0])
            assert broadcast_message['event_type'] == 'nodes_connected'
            assert broadcast_message['data']['connection']['from'] == node1_id
            assert broadcast_message['data']['connection']['to'] == node2_id
    
    @pytest.mark.asyncio
    async def test_code_generation_events_sync_properly(self, setup_services):
        """Test that code generation events properly sync between chat and visual."""
        services = setup_services
        chat_handler = services['chat_handler']
        strategy_service = services['strategy_service']
        websocket_server = services['websocket_server']
        
        # Mock Claude response with code
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = """
def advanced_rsi(data, period=14, smoothing=2):
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.rolling(window=smoothing).mean()
        """.strip()
        chat_handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Add a node
        node_result = await chat_handler.process_message(
            "/add-node function Advanced RSI calculation with smoothing",
            "test_session"
        )
        
        flow_id = node_result['flow_id']
        node_id = node_result['node_id']
        
        # Simulate code generation completion
        code_data = {
            'code_type': 'python',
            'status': 'success',
            'python_code': mock_response.content[0].text,
            'translation_time_ms': 1250
        }
        
        await strategy_service.handle_code_generated(code_data, node_id, flow_id, "test_session")
        
        # Verify WebSocket event
        websocket_server.broadcast_to_subscribers.assert_called()
        calls = websocket_server.broadcast_to_subscribers.call_args_list
        code_event_call = calls[-1]
        
        broadcast_message = json.loads(code_event_call[0][0])
        assert broadcast_message['event_type'] == 'code_generated'
        assert broadcast_message['data']['node_id'] == node_id
        assert broadcast_message['data']['generation_status'] == 'success'
        assert 'code_preview' in broadcast_message['data']
    
    @pytest.mark.asyncio
    async def test_error_handling_propagates_correctly(self, setup_services):
        """Test that errors in chat commands propagate correctly to visual interface."""
        services = setup_services
        chat_handler = services['chat_handler']
        strategy_service = services['strategy_service']
        websocket_server = services['websocket_server']
        
        # Test error scenario - invalid node type
        error_result = await chat_handler.process_message(
            "/add-node invalid_type Some description",
            "test_session"
        )
        
        assert error_result['action'] == 'error'
        assert 'Unknown node type' in error_result['response']
        
        # Simulate error event
        error_data = {
            'error_type': 'invalid_command',
            'message': error_result['response'],
            'component': 'chat_handler',
            'recoverable': True
        }
        
        await strategy_service.handle_error_occurred(error_data, "test_session")
        
        # Verify error event
        websocket_server.broadcast_to_subscribers.assert_called()
        calls = websocket_server.broadcast_to_subscribers.call_args_list[-1]
        
        broadcast_message = json.loads(calls[0][0])
        assert broadcast_message['event_type'] == 'error_occurred'
        assert broadcast_message['data']['error_type'] == 'invalid_command'
        assert broadcast_message['data']['recoverable'] is True
    
    @pytest.mark.asyncio
    async def test_database_state_consistency(self, setup_services):
        """Test that database state remains consistent between chat operations."""
        services = setup_services
        chat_handler = services['chat_handler']
        db_manager = services['db_manager']
        
        # Mock Claude response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Test code"
        chat_handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Create strategy
        strategy_result = await chat_handler.process_message(
            '/create-strategy "DB Test Strategy" Test database consistency',
            "test_session"
        )
        
        flow_id = strategy_result['flow_id']
        
        # Verify strategy exists in database
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM strategy_flows WHERE id = ?", (flow_id,))
            assert cursor.fetchone()[0] == 1
        
        # Add node
        node_result = await chat_handler.process_message(
            "/add-node function Test node for consistency",
            "test_session",
            flow_id
        )
        
        node_id = node_result['node_id']
        
        # Verify node properties in database
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM node_properties 
                WHERE flow_id = ? AND node_id = ?
            """, (flow_id, node_id))
            assert cursor.fetchone()[0] == 1
        
        # Edit node
        edit_result = await chat_handler.process_message(
            f"/edit-node {node_id} parameter Update test parameter",
            "test_session",
            flow_id
        )
        
        assert edit_result['action'] == 'node_updated'
        
        # Verify update in database
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM node_properties 
                WHERE flow_id = ? AND node_id = ? AND property_name = 'parameter'
            """, (flow_id, node_id))
            # Should have original property plus new parameter property
            assert cursor.fetchone()[0] >= 1
    
    @pytest.mark.asyncio
    async def test_concurrent_chat_operations(self, setup_services):
        """Test that concurrent chat operations don't cause race conditions."""
        services = setup_services
        chat_handler = services['chat_handler']
        
        # Mock Claude response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Concurrent test code"
        chat_handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Create multiple concurrent operations
        tasks = [
            chat_handler.process_message(f"/add-node data Data source {i}", f"session_{i}")
            for i in range(5)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # All operations should succeed
        for result in results:
            assert not isinstance(result, Exception)
            assert result['action'] == 'node_added'
            assert 'flow_id' in result
            assert 'node_id' in result
        
        # Each should have created a separate flow
        flow_ids = {result['flow_id'] for result in results}
        assert len(flow_ids) == 5  # All unique flows
    
    @pytest.mark.asyncio
    async def test_natural_language_to_visual_sync(self, setup_services):
        """Test that natural language strategy descriptions sync with visual flow."""
        services = setup_services
        chat_handler = services['chat_handler']
        strategy_service = services['strategy_service']
        websocket_server = services['websocket_server']
        
        # Mock Claude response for natural language processing
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Natural language generated strategy"
        chat_handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Process natural language input
        result = await chat_handler.process_message(
            "Create a momentum trading strategy that monitors BTC price, calculates RSI, and executes trades when RSI crosses 70/30 thresholds",
            "test_session"
        )
        
        # Should create strategy or ask for clarification
        assert result['action'] in ['strategy_created', 'clarification_needed']
        
        if result['action'] == 'strategy_created':
            # Verify the strategy has appropriate nodes
            assert 'nodes' in result
            assert len(result['nodes']) >= 3  # Should have data, function, strategy nodes
            
            # Node types should be appropriate for momentum strategy
            node_types = {node['type'] for node in result['nodes']}
            assert 'data' in node_types
            assert 'function' in node_types or 'strategy' in node_types
    
    @pytest.mark.asyncio
    async def test_websocket_event_ordering(self, setup_services):
        """Test that WebSocket events are sent in correct order."""
        services = setup_services
        chat_handler = services['chat_handler']
        strategy_service = services['strategy_service']
        websocket_server = services['websocket_server']
        
        # Mock Claude response
        mock_response = Mock()
        mock_response.content = [Mock()]
        mock_response.content[0].text = "# Test code"
        chat_handler.claude_client.async_client.messages.create.return_value = mock_response
        
        # Perform sequence of operations
        strategy_result = await chat_handler.process_message(
            '/create-strategy "Event Order Test" Test event ordering',
            "test_session"
        )
        
        await strategy_service.handle_strategy_created(strategy_result, "test_session")
        
        flow_id = strategy_result['flow_id']
        
        node_result = await chat_handler.process_message(
            "/add-node function Test node",
            "test_session",
            flow_id
        )
        
        await strategy_service.handle_node_added(node_result, flow_id, "test_session")
        
        # Verify events were sent in order
        calls = websocket_server.broadcast_to_subscribers.call_args_list
        assert len(calls) >= 2
        
        # First event should be strategy_created
        first_message = json.loads(calls[0][0][0])
        assert first_message['event_type'] == 'strategy_created'
        
        # Second event should be node_added
        second_message = json.loads(calls[1][0][0])
        assert second_message['event_type'] == 'node_added'
        
        # Timestamps should be in order
        first_time = datetime.fromisoformat(first_message['timestamp'])
        second_time = datetime.fromisoformat(second_message['timestamp'])
        assert first_time <= second_time


if __name__ == "__main__":
    pytest.main([__file__, "-v"])