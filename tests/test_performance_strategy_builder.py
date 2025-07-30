"""
Performance tests for strategy builder components

These tests ensure the system can handle high-throughput operations,
concurrent users, and large strategy flows efficiently.
"""

import asyncio
import json
import pytest
import tempfile
import os
import time
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import Mock, AsyncMock
from datetime import datetime

from src.volatility_filter.strategy_builder_chat_handler import StrategyBuilderChatHandler
from src.volatility_filter.real_time_strategy_service import RealTimeStrategyService
from src.volatility_filter.websocket_server import WebSocketBroadcastServer
from src.volatility_filter.database import DatabaseManager


class TestStrategyBuilderPerformance:
    """Performance tests for strategy builder system."""
    
    @pytest.fixture
    def performance_setup(self):
        """Set up system for performance testing."""
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
            
            # Mock Claude client with fast responses
            chat_handler.claude_client = Mock()
            chat_handler.claude_client.async_client = Mock()
            chat_handler.claude_client.async_client.messages = Mock()
            chat_handler.claude_client.async_client.messages.create = AsyncMock()
            
            # Fast mock response
            mock_response = Mock()
            mock_response.content = [Mock()]
            mock_response.content[0].text = "def fast_generated_code(): pass"
            chat_handler.claude_client.async_client.messages.create.return_value = mock_response
            
            yield {
                'chat_handler': chat_handler,
                'strategy_service': strategy_service,
                'websocket_server': websocket_server,
                'db_manager': db_manager
            }
            
            # Cleanup
            os.unlink(temp_db.name)
    
    @pytest.mark.asyncio
    async def test_chat_command_processing_speed(self, performance_setup):
        """Test speed of chat command processing."""
        setup = performance_setup
        chat_handler = setup['chat_handler']
        
        commands = [
            "/add-node data BTC price feed",
            "/add-node function RSI calculation",
            "/add-node strategy Trading signals",
            "/add-node risk Position sizing",
            "/add-node execution Order management"
        ]
        
        start_time = time.time()
        
        results = []
        for command in commands:
            result = await chat_handler.process_message(
                command,
                f"perf_session_{len(results)}"
            )
            results.append(result)
        
        end_time = time.time()
        total_time = end_time - start_time
        avg_time_per_command = total_time / len(commands)
        
        # Performance assertions
        assert total_time < 2.0, f"Total processing time too slow: {total_time:.2f}s"
        assert avg_time_per_command < 0.5, f"Average command time too slow: {avg_time_per_command:.2f}s"
        
        # All commands should succeed
        assert all(r['action'] != 'error' for r in results)
        
        print(f"Performance: {len(commands)} commands in {total_time:.2f}s "
              f"(avg: {avg_time_per_command:.3f}s per command)")
    
    @pytest.mark.asyncio
    async def test_concurrent_user_handling(self, performance_setup):
        """Test system performance with multiple concurrent users."""
        setup = performance_setup
        chat_handler = setup['chat_handler']
        
        async def simulate_user_session(user_id: int):
            """Simulate a user creating a strategy."""
            session_id = f"user_{user_id}_session"
            
            # Create strategy
            strategy_result = await chat_handler.process_message(
                f'/create-strategy "User {user_id} Strategy" Concurrent user test strategy',
                session_id
            )
            
            flow_id = strategy_result.get('flow_id')
            
            # Add nodes
            node_results = []
            for i in range(3):
                result = await chat_handler.process_message(
                    f"/add-node function User {user_id} calculation {i}",
                    session_id,
                    flow_id
                )
                node_results.append(result)
            
            # Connect nodes if we have multiple
            connection_results = []
            if len(node_results) >= 2:
                result = await chat_handler.process_message(
                    f"/connect {node_results[0]['node_id']} to {node_results[1]['node_id']}",
                    session_id,
                    flow_id
                )
                connection_results.append(result)
            
            return {
                'user_id': user_id,
                'strategy': strategy_result,
                'nodes': node_results,
                'connections': connection_results
            }
        
        # Simulate 10 concurrent users
        num_users = 10
        start_time = time.time()
        
        tasks = [simulate_user_session(i) for i in range(num_users)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Check for exceptions
        exceptions = [r for r in results if isinstance(r, Exception)]
        assert len(exceptions) == 0, f"Exceptions occurred: {exceptions}"
        
        # Verify all users completed successfully
        successful_results = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_results) == num_users
        
        # Performance assertions
        assert total_time < 10.0, f"Concurrent processing too slow: {total_time:.2f}s"
        
        # Verify each user created distinct strategies
        flow_ids = {r['strategy']['flow_id'] for r in successful_results}
        assert len(flow_ids) == num_users, "Each user should have unique strategy"
        
        print(f"Concurrent Performance: {num_users} users completed in {total_time:.2f}s")
    
    @pytest.mark.asyncio
    async def test_websocket_event_broadcasting_performance(self, performance_setup):
        """Test WebSocket event broadcasting performance."""
        setup = performance_setup
        strategy_service = setup['strategy_service']
        websocket_server = setup['websocket_server']
        
        # Simulate multiple strategy events
        events = []
        for i in range(50):
            event_data = {
                'flow_id': f'flow_{i}',
                'strategy_name': f'Strategy {i}',
                'node_count': i % 10 + 1,
                'nodes': [{'id': f'node_{j}', 'type': 'function'} for j in range(i % 5 + 1)],
                'connections': []
            }
            events.append(event_data)
        
        start_time = time.time()
        
        # Broadcast all events
        for i, event_data in enumerate(events):
            await strategy_service.handle_strategy_created(event_data, f"session_{i}")
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Performance assertions
        assert total_time < 2.0, f"WebSocket broadcasting too slow: {total_time:.2f}s"
        assert websocket_server.broadcast_to_subscribers.call_count == len(events)
        
        # Verify all events were broadcasted
        for call in websocket_server.broadcast_to_subscribers.call_args_list:
            message = json.loads(call[0][0])
            assert message['type'] == 'strategy_builder_event'
            assert message['event_type'] == 'strategy_created'
        
        print(f"WebSocket Performance: {len(events)} events in {total_time:.2f}s")
    
    @pytest.mark.asyncio
    async def test_large_strategy_flow_handling(self, performance_setup):
        """Test performance with large, complex strategy flows."""
        setup = performance_setup
        chat_handler = setup['chat_handler']
        db_manager = setup['db_manager']
        
        # Create a large strategy
        start_time = time.time()
        
        strategy_result = await chat_handler.process_message(
            '/create-strategy "Large Strategy" Complex multi-component trading system',
            "large_strategy_session"
        )
        
        flow_id = strategy_result['flow_id']
        
        # Add many nodes (50 nodes)
        node_results = []
        for i in range(50):
            node_type = ['data', 'function', 'strategy', 'risk', 'execution'][i % 5]
            result = await chat_handler.process_message(
                f"/add-node {node_type} Component {i} for large strategy test",
                "large_strategy_session",
                flow_id
            )
            node_results.append(result)
        
        # Create connections between nodes
        connection_results = []
        for i in range(0, len(node_results) - 1, 2):
            if i + 1 < len(node_results):
                result = await chat_handler.process_message(
                    f"/connect {node_results[i]['node_id']} to {node_results[i+1]['node_id']}",
                    "large_strategy_session",
                    flow_id
                )
                connection_results.append(result)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Performance assertions
        assert total_time < 30.0, f"Large strategy creation too slow: {total_time:.2f}s"
        assert len(node_results) == 50
        assert all(r['action'] == 'node_added' for r in node_results)
        
        # Verify database can handle large flow
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM node_properties WHERE flow_id = ?", (flow_id,))
            node_count = cursor.fetchone()[0]
            assert node_count >= 50  # Original nodes + added nodes
        
        print(f"Large Strategy Performance: 50+ nodes created in {total_time:.2f}s")
    
    @pytest.mark.asyncio
    async def test_ai_translation_performance(self, performance_setup):
        """Test AI translation performance with various request types."""
        setup = performance_setup
        chat_handler = setup['chat_handler']
        
        # Mock different response times for AI
        def mock_ai_response(delay=0.1):
            async def delayed_response(*args, **kwargs):
                await asyncio.sleep(delay)  # Simulate AI processing time
                mock_response = Mock()
                mock_response.content = [Mock()]
                mock_response.content[0].text = f"def generated_code_{time.time()}: pass"
                return mock_response
            return delayed_response
        
        # Test different AI response times
        response_times = [0.05, 0.1, 0.2, 0.3]  # Simulate different AI speeds
        
        for ai_delay in response_times:
            chat_handler.claude_client.async_client.messages.create = mock_ai_response(ai_delay)
            
            start_time = time.time()
            
            # Create strategy with AI translation
            result = await chat_handler.process_message(
                f"/add-node function AI speed test with {ai_delay}s delay",
                f"ai_perf_session_{ai_delay}"
            )
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Total time should be reasonable even with AI delay
            expected_max_time = ai_delay + 0.5  # AI delay + processing overhead
            assert total_time < expected_max_time, \
                f"Total time {total_time:.2f}s too slow for AI delay {ai_delay}s"
            
            assert result['action'] == 'node_added'
            
            print(f"AI Performance: {ai_delay}s AI delay -> {total_time:.2f}s total time")
    
    @pytest.mark.asyncio
    async def test_database_performance_under_load(self, performance_setup):
        """Test database performance under high load."""
        setup = performance_setup
        chat_handler = setup['chat_handler']
        db_manager = setup['db_manager']
        
        # Create multiple strategies and nodes rapidly
        start_time = time.time()
        
        strategy_ids = []
        for i in range(20):
            result = await chat_handler.process_message(
                f'/create-strategy "DB Load Test {i}" Database performance test strategy',
                f"db_load_session_{i}"
            )
            strategy_ids.append(result['flow_id'])
        
        # Add nodes to each strategy
        total_operations = 0
        for flow_id in strategy_ids:
            for j in range(10):  # 10 nodes per strategy
                await chat_handler.process_message(
                    f"/add-node function Node {j} for database load test",
                    f"db_load_session_{strategy_ids.index(flow_id)}",
                    flow_id
                )
                total_operations += 1
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Performance assertions
        operations_per_second = total_operations / total_time
        assert operations_per_second > 10, f"Database operations too slow: {operations_per_second:.1f} ops/sec"
        
        # Verify database integrity
        with db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check all strategies were created
            cursor.execute("SELECT COUNT(*) FROM strategy_flows")
            strategy_count = cursor.fetchone()[0]
            assert strategy_count >= 20
            
            # Check all nodes were created
            cursor.execute("SELECT COUNT(*) FROM node_properties")
            node_count = cursor.fetchone()[0]
            assert node_count >= 200  # 20 strategies * 10 nodes + initial nodes
        
        print(f"Database Performance: {total_operations} operations in {total_time:.2f}s "
              f"({operations_per_second:.1f} ops/sec)")
    
    @pytest.mark.asyncio
    async def test_memory_usage_with_large_flows(self, performance_setup):
        """Test memory usage doesn't grow excessively with large flows."""
        setup = performance_setup
        chat_handler = setup['chat_handler']
        
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create many strategies to test memory usage
        for i in range(100):
            result = await chat_handler.process_message(
                f'/create-strategy "Memory Test {i}" Memory usage test strategy',
                f"memory_session_{i}"
            )
            
            # Add a few nodes to each
            flow_id = result['flow_id']
            for j in range(5):
                await chat_handler.process_message(
                    f"/add-node function Memory test node {j}",
                    f"memory_session_{i}",
                    flow_id
                )
        
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB for this test)
        assert memory_increase < 100, f"Memory usage increased too much: {memory_increase:.1f}MB"
        
        print(f"Memory Usage: {initial_memory:.1f}MB -> {final_memory:.1f}MB "
              f"(increase: {memory_increase:.1f}MB)")
    
    @pytest.mark.asyncio
    async def test_error_handling_performance(self, performance_setup):
        """Test that error handling doesn't significantly impact performance."""
        setup = performance_setup
        chat_handler = setup['chat_handler']
        
        # Mix of valid and invalid commands
        commands = [
            "/add-node data Valid data source",
            "/add-node invalid_type Invalid command",
            "/add-node function Valid function",
            "/edit-node nonexistent property Invalid edit",
            "/add-node strategy Valid strategy",
            "/connect nonexistent to nowhere Invalid connection"
        ]
        
        start_time = time.time()
        
        results = []
        for i, command in enumerate(commands):
            result = await chat_handler.process_message(
                command,
                f"error_perf_session_{i}"
            )
            results.append(result)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should handle errors quickly
        assert total_time < 3.0, f"Error handling too slow: {total_time:.2f}s"
        
        # Verify mix of successful and error results
        successes = [r for r in results if r['action'] != 'error']
        errors = [r for r in results if r['action'] == 'error']
        
        assert len(successes) >= 3, "Should have some successful operations"
        assert len(errors) >= 3, "Should have some error operations"
        
        print(f"Error Handling Performance: {len(commands)} mixed commands in {total_time:.2f}s")


class TestRealTimePerformance:
    """Performance tests specifically for real-time features."""
    
    @pytest.fixture
    def realtime_setup(self):
        """Set up for real-time performance testing."""
        with tempfile.NamedTemporaryFile(delete=False, suffix='.db') as temp_db:
            temp_db.close()
            
            db_manager = DatabaseManager(temp_db.name)
            db_manager.init_database()
            
            # Mock WebSocket server with performance tracking
            websocket_server = Mock(spec=WebSocketBroadcastServer)
            websocket_server.broadcast_to_subscribers = AsyncMock()
            
            strategy_service = RealTimeStrategyService(websocket_server, db_manager)
            
            yield {
                'strategy_service': strategy_service,
                'websocket_server': websocket_server,
                'db_manager': db_manager
            }
            
            os.unlink(temp_db.name)
    
    @pytest.mark.asyncio
    async def test_websocket_event_latency(self, realtime_setup):
        """Test WebSocket event latency under load."""
        setup = realtime_setup
        strategy_service = setup['strategy_service']
        
        # Measure event processing latency
        latencies = []
        
        for i in range(100):
            event_data = {
                'flow_id': f'latency_flow_{i}',
                'node_id': f'node_{i}',
                'node_type': 'function'
            }
            
            start_time = time.time()
            await strategy_service.handle_node_added(event_data, f'flow_{i}', f'session_{i}')
            end_time = time.time()
            
            latency = (end_time - start_time) * 1000  # Convert to milliseconds
            latencies.append(latency)
        
        # Latency statistics
        avg_latency = sum(latencies) / len(latencies)
        max_latency = max(latencies)
        min_latency = min(latencies)
        
        # Performance assertions
        assert avg_latency < 10.0, f"Average latency too high: {avg_latency:.2f}ms"
        assert max_latency < 50.0, f"Max latency too high: {max_latency:.2f}ms"
        
        print(f"WebSocket Latency: avg={avg_latency:.2f}ms, "
              f"min={min_latency:.2f}ms, max={max_latency:.2f}ms")
    
    @pytest.mark.asyncio
    async def test_session_state_performance(self, realtime_setup):
        """Test session state management performance."""
        setup = realtime_setup
        strategy_service = setup['strategy_service']
        
        # Create many active sessions
        session_ids = [f'perf_session_{i}' for i in range(1000)]
        
        start_time = time.time()
        
        # Simulate session activity
        for session_id in session_ids:
            strategy_service.active_sessions[session_id] = {
                'flow_id': f'flow_{session_id}',
                'last_activity': datetime.now(),
                'node_count': 5
            }
        
        # Get session summaries
        summary = await strategy_service.get_active_sessions_summary()
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Performance assertions
        assert processing_time < 1.0, f"Session management too slow: {processing_time:.2f}s"
        assert summary['total_sessions'] == len(session_ids)
        
        # Test session cleanup performance
        cleanup_start = time.time()
        cleaned = await strategy_service.cleanup_inactive_sessions(max_inactive_hours=0)
        cleanup_time = time.time() - cleanup_start
        
        assert cleanup_time < 0.5, f"Session cleanup too slow: {cleanup_time:.2f}s"
        assert cleaned == len(session_ids)  # All sessions should be cleaned (0 hour threshold)
        
        print(f"Session Performance: {len(session_ids)} sessions managed in {processing_time:.2f}s, "
              f"cleanup in {cleanup_time:.2f}s")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])