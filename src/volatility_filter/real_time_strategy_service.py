"""
Real-time Strategy Service for WebSocket Events

This service handles real-time communication between the chat interface and 
the visual flow builder, ensuring synchronization of strategy building activities.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
import uuid

from .websocket_server import WebSocketBroadcastServer
from .database import DatabaseManager

logger = logging.getLogger(__name__)


class RealTimeStrategyService:
    """Service for broadcasting strategy builder events via WebSocket."""
    
    def __init__(self, websocket_server: WebSocketBroadcastServer, 
                 db_manager: DatabaseManager):
        self.websocket_server = websocket_server
        self.db_manager = db_manager
        
        # Track active strategy builder sessions
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        
        # Strategy builder event types
        self.event_types = {
            'strategy_created',
            'strategy_updated',
            'strategy_deleted',
            'node_added',
            'node_updated',
            'node_deleted',
            'nodes_connected',
            'nodes_disconnected',
            'code_generated',
            'code_updated',
            'strategy_tested',
            'flow_validated',
            'chat_message_processed',
            'translation_completed',
            'error_occurred'
        }
    
    async def broadcast_strategy_event(self, event_type: str, event_data: Dict[str, Any], 
                                     session_id: Optional[str] = None) -> None:
        """
        Broadcast strategy builder event to all subscribed clients.
        
        Args:
            event_type: Type of event (from self.event_types)
            event_data: Event payload data
            session_id: Optional session ID to filter recipients
        """
        if event_type not in self.event_types:
            logger.warning(f"Unknown event type: {event_type}")
            return
        
        try:
            # Create standardized event message
            message = {
                'type': 'strategy_builder_event',
                'event_type': event_type,
                'timestamp': datetime.now().isoformat(),
                'session_id': session_id,
                'data': event_data,
                'message_id': str(uuid.uuid4())
            }
            
            # Add metadata
            message['metadata'] = {
                'source': 'strategy_service',
                'version': '1.0',
                'requires_ui_update': self._requires_ui_update(event_type)
            }
            
            # Broadcast to all strategy builder subscribers
            await self.websocket_server.broadcast_to_subscribers(
                json.dumps(message),
                subscription_filter='strategy_builder'
            )
            
            # Log event for debugging
            logger.info(f"Broadcasted {event_type} event for session {session_id}")
            
            # Store event in database for replay/history
            await self._store_event_history(event_type, event_data, session_id)
            
        except Exception as e:
            logger.error(f"Error broadcasting strategy event: {e}")
    
    async def handle_strategy_created(self, strategy_data: Dict[str, Any], 
                                    session_id: str) -> None:
        """Handle strategy creation event."""
        event_data = {
            'flow_id': strategy_data['flow_id'],
            'strategy_name': strategy_data['strategy_name'],
            'nodes': strategy_data['nodes'],
            'connections': strategy_data['connections'],
            'created_by': 'chat_interface',
            'node_count': len(strategy_data['nodes'])
        }
        
        await self.broadcast_strategy_event('strategy_created', event_data, session_id)
        
        # Update session tracking
        self.active_sessions[session_id] = {
            'flow_id': strategy_data['flow_id'],
            'last_activity': datetime.now(),
            'node_count': len(strategy_data['nodes'])
        }
    
    async def handle_node_added(self, node_data: Dict[str, Any], 
                              flow_id: str, session_id: str) -> None:
        """Handle node addition event."""
        event_data = {
            'flow_id': flow_id,
            'node': {
                'id': node_data['node_id'],
                'type': node_data['node_type'],
                'description': node_data.get('description', ''),
                'position': node_data.get('position', {'x': 250, 'y': 100})
            },
            'translation_status': node_data.get('translation', {}).get('status', 'pending'),
            'has_generated_code': bool(node_data.get('translation', {}).get('python_code'))
        }
        
        await self.broadcast_strategy_event('node_added', event_data, session_id)
        
        # Update session tracking
        if session_id in self.active_sessions:
            self.active_sessions[session_id]['node_count'] += 1
            self.active_sessions[session_id]['last_activity'] = datetime.now()
    
    async def handle_node_updated(self, node_data: Dict[str, Any], 
                                flow_id: str, session_id: str) -> None:
        """Handle node update event."""
        event_data = {
            'flow_id': flow_id,
            'node_id': node_data['node_id'],
            'updated_property': node_data.get('property'),
            'new_description': node_data.get('description'),
            'translation_status': node_data.get('translation', {}).get('status', 'pending'),
            'requires_retesting': True
        }
        
        await self.broadcast_strategy_event('node_updated', event_data, session_id)
    
    async def handle_nodes_connected(self, connection_data: Dict[str, Any], 
                                   flow_id: str, session_id: str) -> None:
        """Handle node connection event."""
        event_data = {
            'flow_id': flow_id,
            'connection': {
                'from': connection_data['from_node'],
                'to': connection_data['to_node']
            },
            'connection_type': 'data_flow',
            'created_by': 'chat_command'
        }
        
        await self.broadcast_strategy_event('nodes_connected', event_data, session_id)
    
    async def handle_code_generated(self, code_data: Dict[str, Any], 
                                  node_id: str, flow_id: str, session_id: str) -> None:
        """Handle code generation completion."""
        event_data = {
            'flow_id': flow_id,
            'node_id': node_id,
            'code_type': code_data.get('code_type', 'python'),
            'generation_status': code_data.get('status', 'success'),
            'has_error': 'error' in code_data,
            'code_preview': code_data.get('python_code', '')[:200] + '...' if code_data.get('python_code') else '',
            'translation_time_ms': code_data.get('translation_time_ms', 0)
        }
        
        await self.broadcast_strategy_event('code_generated', event_data, session_id)
    
    async def handle_chat_message_processed(self, message_data: Dict[str, Any], 
                                          session_id: str) -> None:
        """Handle chat message processing completion."""
        event_data = {
            'message_id': message_data.get('message_id'),
            'command_type': message_data.get('action'),
            'processing_time_ms': message_data.get('processing_time_ms', 0),
            'success': message_data.get('action') != 'error',
            'affects_flow': message_data.get('flow_id') is not None,
            'response_preview': message_data.get('response', '')[:100] + '...' if message_data.get('response') else ''
        }
        
        await self.broadcast_strategy_event('chat_message_processed', event_data, session_id)
    
    async def handle_strategy_tested(self, test_data: Dict[str, Any], 
                                   flow_id: str, session_id: str) -> None:
        """Handle strategy testing completion."""
        event_data = {
            'flow_id': flow_id,
            'test_status': test_data.get('status', 'completed'),
            'test_type': test_data.get('test_type', 'simulation'),
            'success_rate': test_data.get('success_rate', 0.0),
            'total_trades': test_data.get('total_trades', 0),
            'profit_loss': test_data.get('profit_loss', 0.0),
            'test_duration_seconds': test_data.get('duration_seconds', 0),
            'errors': test_data.get('errors', [])
        }
        
        await self.broadcast_strategy_event('strategy_tested', event_data, session_id)
    
    async def handle_error_occurred(self, error_data: Dict[str, Any], 
                                  session_id: str) -> None:
        """Handle error event."""
        event_data = {
            'error_type': error_data.get('error_type', 'unknown'),
            'error_message': error_data.get('message', ''),
            'component': error_data.get('component', 'strategy_service'),
            'flow_id': error_data.get('flow_id'),
            'node_id': error_data.get('node_id'),
            'recoverable': error_data.get('recoverable', True),
            'suggested_action': error_data.get('suggested_action', 'retry')
        }
        
        await self.broadcast_strategy_event('error_occurred', event_data, session_id)
    
    async def get_session_state(self, session_id: str) -> Dict[str, Any]:
        """Get current state of a strategy builder session."""
        if session_id not in self.active_sessions:
            return {'exists': False}
        
        session_data = self.active_sessions[session_id]
        
        # Get current flow data from database
        flow_data = await self._get_flow_data(session_data['flow_id'])
        
        return {
            'exists': True,
            'session_id': session_id,
            'flow_id': session_data['flow_id'],
            'last_activity': session_data['last_activity'].isoformat(),
            'node_count': session_data['node_count'],
            'flow_data': flow_data,
            'status': 'active'
        }
    
    async def cleanup_inactive_sessions(self, max_inactive_hours: int = 24) -> int:
        """Clean up inactive sessions."""
        current_time = datetime.now()
        inactive_sessions = []
        
        for session_id, session_data in self.active_sessions.items():
            hours_inactive = (current_time - session_data['last_activity']).total_seconds() / 3600
            if hours_inactive > max_inactive_hours:
                inactive_sessions.append(session_id)
        
        # Remove inactive sessions
        for session_id in inactive_sessions:
            del self.active_sessions[session_id]
            logger.info(f"Cleaned up inactive session: {session_id}")
        
        return len(inactive_sessions)
    
    async def get_active_sessions_summary(self) -> Dict[str, Any]:
        """Get summary of all active strategy builder sessions."""
        return {
            'total_sessions': len(self.active_sessions),
            'sessions': [
                {
                    'session_id': session_id,
                    'flow_id': data['flow_id'],
                    'node_count': data['node_count'],
                    'last_activity': data['last_activity'].isoformat()
                }
                for session_id, data in self.active_sessions.items()
            ]
        }
    
    def _requires_ui_update(self, event_type: str) -> bool:
        """Determine if event requires UI update."""
        ui_update_events = {
            'strategy_created', 'node_added', 'node_updated', 
            'nodes_connected', 'nodes_disconnected', 'node_deleted'
        }
        return event_type in ui_update_events
    
    async def _store_event_history(self, event_type: str, event_data: Dict[str, Any], 
                                 session_id: Optional[str]) -> None:
        """Store event in database for history/replay."""
        try:
            with self.db_manager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO strategy_builder_events 
                    (event_type, event_data, session_id, created_at)
                    VALUES (?, ?, ?, ?)
                """, (
                    event_type,
                    json.dumps(event_data),
                    session_id,
                    datetime.now()
                ))
                conn.commit()
        except Exception as e:
            # Don't fail the main operation if history storage fails
            logger.warning(f"Failed to store event history: {e}")
    
    async def _get_flow_data(self, flow_id: str) -> Optional[Dict[str, Any]]:
        """Get flow data from database."""
        try:
            with self.db_manager.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT name, description, flow_json, status 
                    FROM strategy_flows 
                    WHERE id = ?
                """, (flow_id,))
                
                row = cursor.fetchone()
                if row:
                    return {
                        'name': row[0],
                        'description': row[1],
                        'flow_json': json.loads(row[2]),
                        'status': row[3]
                    }
        except Exception as e:
            logger.error(f"Error getting flow data: {e}")
        
        return None


class StrategyBuilderWebSocketHandler:
    """WebSocket handler specifically for strategy builder events."""
    
    def __init__(self, strategy_service: RealTimeStrategyService):
        self.strategy_service = strategy_service
    
    async def handle_client_message(self, websocket, message: str) -> None:
        """Handle incoming WebSocket messages from strategy builder clients."""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'subscribe_strategy_builder':
                await self._handle_subscribe(websocket, data)
            elif message_type == 'get_session_state':
                await self._handle_get_session_state(websocket, data)
            elif message_type == 'ping':
                await self._handle_ping(websocket, data)
            else:
                logger.warning(f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from WebSocket client")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
    
    async def _handle_subscribe(self, websocket, data: Dict[str, Any]) -> None:
        """Handle strategy builder subscription."""
        session_id = data.get('session_id')
        
        # Add client to strategy builder subscribers
        if hasattr(websocket, 'subscriptions'):
            websocket.subscriptions.add('strategy_builder')
        
        # Send current session state if session_id provided
        if session_id:
            session_state = await self.strategy_service.get_session_state(session_id)
            await websocket.send(json.dumps({
                'type': 'session_state',
                'data': session_state
            }))
        
        # Send subscription confirmation
        await websocket.send(json.dumps({
            'type': 'subscription_confirmed',
            'subscription': 'strategy_builder',
            'timestamp': datetime.now().isoformat()
        }))
    
    async def _handle_get_session_state(self, websocket, data: Dict[str, Any]) -> None:
        """Handle session state request."""
        session_id = data.get('session_id')
        
        if session_id:
            session_state = await self.strategy_service.get_session_state(session_id)
            await websocket.send(json.dumps({
                'type': 'session_state',
                'data': session_state
            }))
        else:
            await websocket.send(json.dumps({
                'type': 'error',
                'message': 'session_id required'
            }))
    
    async def _handle_ping(self, websocket, data: Dict[str, Any]) -> None:
        """Handle ping message."""
        await websocket.send(json.dumps({
            'type': 'pong',
            'timestamp': datetime.now().isoformat(),
            'original_message': data
        }))


# Add table for event history to migration
EVENT_HISTORY_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS strategy_builder_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    event_data TEXT NOT NULL,
    session_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_strategy_events_session 
ON strategy_builder_events(session_id);

CREATE INDEX IF NOT EXISTS idx_strategy_events_type 
ON strategy_builder_events(event_type);
"""