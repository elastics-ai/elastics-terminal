"""
Strategy Builder Chat Handler

This module provides intelligent chat command processing for creating and editing
trading strategy flows through natural language conversation.
"""

import json
import logging
import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from .claude_client import ClaudeClient
from .database import DatabaseManager

logger = logging.getLogger(__name__)


class StrategyBuilderChatHandler:
    """Handles chat commands for strategy builder functionality."""
    
    def __init__(self, db_path: str = "volatility_filter.db"):
        self.db_manager = DatabaseManager(db_path)
        self.claude_client = ClaudeClient(db_path=db_path)
        
        # Command patterns
        self.command_patterns = {
            'add_node': r'/add-node\s+(\w+)\s+(.+)',
            'edit_node': r'/edit-node\s+([a-zA-Z0-9_-]+)\s+(\w+)\s+(.+)',
            'create_strategy': r'/create-strategy\s+"([^"]+)"\s+(.+)',
            'connect_nodes': r'/connect\s+([a-zA-Z0-9_-]+)\s+to\s+([a-zA-Z0-9_-]+)',
            'preview_code': r'/preview-code\s+([a-zA-Z0-9_-]+)',
            'test_strategy': r'/test-strategy\s+([a-zA-Z0-9_-]+)',
            'show_flow': r'/show-flow\s+([a-zA-Z0-9_-]+)',
            'list_nodes': r'/list-nodes(?:\s+([a-zA-Z0-9_-]+))?',
            'delete_node': r'/delete-node\s+([a-zA-Z0-9_-]+)',
            'help': r'/help(?:\s+(\w+))?'
        }
        
        # Node type mappings
        self.node_types = {
            'data': ['data', 'source', 'feed', 'input'],
            'function': ['function', 'calculate', 'indicator', 'transform'],
            'strategy': ['strategy', 'signal', 'logic', 'rule'],
            'risk': ['risk', 'limit', 'stop', 'hedge', 'protection'],
            'execution': ['execution', 'order', 'trade', 'engine']
        }
        
    async def process_message(self, message: str, session_id: str, 
                            flow_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process incoming chat message and execute appropriate command.
        
        Args:
            message: User message content
            session_id: Chat session identifier
            flow_id: Current strategy flow ID (if in context)
            
        Returns:
            Dict containing response message, actions, and metadata
        """
        try:
            # Check if message is a command
            command_match = self._match_command(message)
            
            if command_match:
                command_type, params = command_match
                return await self._execute_command(command_type, params, session_id, flow_id)
            else:
                # Natural language strategy creation/editing
                return await self._process_natural_language(message, session_id, flow_id)
                
        except Exception as e:
            logger.error(f"Error processing chat message: {e}")
            return {
                'response': f"Sorry, I encountered an error: {str(e)}",
                'action': 'error',
                'error': str(e)
            }
    
    def _match_command(self, message: str) -> Optional[Tuple[str, Dict[str, Any]]]:
        """Match message against command patterns."""
        for command_type, pattern in self.command_patterns.items():
            match = re.match(pattern, message.strip(), re.IGNORECASE)
            if match:
                return command_type, {'groups': match.groups(), 'message': message}
        return None
    
    async def _execute_command(self, command_type: str, params: Dict[str, Any], 
                             session_id: str, flow_id: Optional[str]) -> Dict[str, Any]:
        """Execute specific chat command."""
        command_handlers = {
            'add_node': self._handle_add_node,
            'edit_node': self._handle_edit_node,
            'create_strategy': self._handle_create_strategy,
            'connect_nodes': self._handle_connect_nodes,
            'preview_code': self._handle_preview_code,
            'test_strategy': self._handle_test_strategy,
            'show_flow': self._handle_show_flow,
            'list_nodes': self._handle_list_nodes,
            'delete_node': self._handle_delete_node,
            'help': self._handle_help
        }
        
        handler = command_handlers.get(command_type)
        if handler:
            return await handler(params, session_id, flow_id)
        else:
            return {
                'response': f"Unknown command: {command_type}",
                'action': 'error'
            }
    
    async def _handle_add_node(self, params: Dict[str, Any], session_id: str, 
                             flow_id: Optional[str]) -> Dict[str, Any]:
        """Handle /add-node command."""
        groups = params['groups']
        node_type_input = groups[0].lower()
        description = groups[1]
        
        # Map input to standard node type
        node_type = self._resolve_node_type(node_type_input)
        if not node_type:
            return {
                'response': f"Unknown node type '{node_type_input}'. Available types: data, function, strategy, risk, execution",
                'action': 'error'
            }
        
        # Create or get current flow
        if not flow_id:
            flow_id = await self._create_new_flow(f"Strategy {datetime.now().strftime('%Y%m%d_%H%M%S')}")
        
        # Generate node ID
        node_id = f"node_{uuid.uuid4().hex[:8]}"
        
        # Translate description to code
        translation_result = await self._translate_node_description(
            node_type, description, node_id
        )
        
        # Add node to flow
        await self._add_node_to_flow(flow_id, node_id, node_type, description, translation_result)
        
        return {
            'response': f"✅ Added {node_type} node '{node_id}' to your strategy flow.\n\n**Description:** {description}\n\n**Generated Code Preview:**\n```python\n{translation_result.get('python_code', 'No code generated')[:200]}...\n```",
            'action': 'node_added',
            'flow_id': flow_id,
            'node_id': node_id,
            'node_type': node_type,
            'translation': translation_result,
            'websocket_event': {
                'type': 'node_added',
                'flow_id': flow_id,
                'node': {
                    'id': node_id,
                    'type': node_type,
                    'description': description,
                    'position': {'x': 250 + len(description) % 300, 'y': 100 + len(description) % 200}
                }
            }
        }
    
    async def _handle_edit_node(self, params: Dict[str, Any], session_id: str, 
                              flow_id: Optional[str]) -> Dict[str, Any]:
        """Handle /edit-node command."""
        groups = params['groups']
        node_id = groups[0]
        property_name = groups[1]
        new_description = groups[2]
        
        if not flow_id:
            return {
                'response': "Please specify a strategy flow first or create a new one.",
                'action': 'error'
            }
        
        # Check if node exists
        node_exists = await self._node_exists_in_flow(flow_id, node_id)
        if not node_exists:
            return {
                'response': f"Node '{node_id}' not found in current flow. Use /list-nodes to see available nodes.",
                'action': 'error'
            }
        
        # Update node property
        translation_result = await self._translate_property_description(
            node_id, property_name, new_description
        )
        
        await self._update_node_property(flow_id, node_id, property_name, new_description, translation_result)
        
        return {
            'response': f"✅ Updated {property_name} for node '{node_id}'.\n\n**New Description:** {new_description}\n\n**Generated Code:**\n```python\n{translation_result.get('python_code', 'No code generated')}\n```",
            'action': 'node_updated',
            'flow_id': flow_id,
            'node_id': node_id,
            'property': property_name,
            'translation': translation_result,
            'websocket_event': {
                'type': 'node_updated',
                'flow_id': flow_id,
                'node_id': node_id,
                'property': property_name
            }
        }
    
    async def _handle_create_strategy(self, params: Dict[str, Any], session_id: str, 
                                    flow_id: Optional[str]) -> Dict[str, Any]:
        """Handle /create-strategy command."""
        groups = params['groups']
        strategy_name = groups[0]
        strategy_description = groups[1]
        
        # Create new flow
        new_flow_id = await self._create_new_flow(strategy_name, strategy_description)
        
        # Parse strategy description into multiple nodes
        strategy_plan = await self._plan_strategy_nodes(strategy_description)
        
        # Create nodes based on plan
        created_nodes = []
        for i, node_plan in enumerate(strategy_plan.get('nodes', [])):
            node_id = f"node_{uuid.uuid4().hex[:8]}"
            
            translation_result = await self._translate_node_description(
                node_plan['type'], node_plan['description'], node_id
            )
            
            await self._add_node_to_flow(
                new_flow_id, node_id, node_plan['type'], 
                node_plan['description'], translation_result
            )
            
            created_nodes.append({
                'id': node_id,
                'type': node_plan['type'],
                'description': node_plan['description'],
                'position': {'x': 100 + (i % 3) * 250, 'y': 100 + (i // 3) * 150}
            })
        
        # Create connections between nodes
        connections = []
        for connection in strategy_plan.get('connections', []):
            if connection['from'] < len(created_nodes) and connection['to'] < len(created_nodes):
                await self._connect_nodes_in_flow(
                    new_flow_id,
                    created_nodes[connection['from']]['id'],
                    created_nodes[connection['to']]['id']
                )
                connections.append({
                    'from': created_nodes[connection['from']]['id'],
                    'to': created_nodes[connection['to']]['id']
                })
        
        return {
            'response': f"🚀 Created strategy '{strategy_name}' with {len(created_nodes)} nodes!\n\n**Strategy:** {strategy_description}\n\n**Nodes Created:**\n" + 
                       "\n".join([f"• {node['type'].title()}: {node['description'][:50]}..." for node in created_nodes]),
            'action': 'strategy_created',
            'flow_id': new_flow_id,
            'strategy_name': strategy_name,
            'nodes': created_nodes,
            'connections': connections,
            'websocket_event': {
                'type': 'strategy_created',
                'flow_id': new_flow_id,
                'name': strategy_name,
                'nodes': created_nodes,
                'connections': connections
            }
        }
    
    async def _handle_connect_nodes(self, params: Dict[str, Any], session_id: str, 
                                  flow_id: Optional[str]) -> Dict[str, Any]:
        """Handle /connect command."""
        groups = params['groups']
        from_node = groups[0]
        to_node = groups[1]
        
        if not flow_id:
            return {
                'response': "Please specify a strategy flow first.",
                'action': 'error'
            }
        
        # Validate nodes exist
        if not await self._node_exists_in_flow(flow_id, from_node):
            return {'response': f"Source node '{from_node}' not found.", 'action': 'error'}
        
        if not await self._node_exists_in_flow(flow_id, to_node):
            return {'response': f"Target node '{to_node}' not found.", 'action': 'error'}
        
        # Create connection
        await self._connect_nodes_in_flow(flow_id, from_node, to_node)
        
        return {
            'response': f"🔗 Connected '{from_node}' → '{to_node}'",
            'action': 'nodes_connected',
            'flow_id': flow_id,
            'from_node': from_node,
            'to_node': to_node,
            'websocket_event': {
                'type': 'nodes_connected',
                'flow_id': flow_id,
                'connection': {'from': from_node, 'to': to_node}
            }
        }
    
    async def _handle_preview_code(self, params: Dict[str, Any], session_id: str, 
                                 flow_id: Optional[str]) -> Dict[str, Any]:
        """Handle /preview-code command."""
        groups = params['groups']
        node_id = groups[0]
        
        if not flow_id or not await self._node_exists_in_flow(flow_id, node_id):
            return {
                'response': f"Node '{node_id}' not found.",
                'action': 'error'
            }
        
        # Get node code
        node_code = await self._get_node_code(flow_id, node_id)
        
        return {
            'response': f"💻 Code for node '{node_id}':\n\n```python\n{node_code.get('python_code', 'No Python code')}\n```\n\n```sql\n{node_code.get('sql_code', 'No SQL code')}\n```",
            'action': 'code_preview',
            'flow_id': flow_id,
            'node_id': node_id,
            'code': node_code
        }
    
    async def _handle_help(self, params: Dict[str, Any], session_id: str, 
                         flow_id: Optional[str]) -> Dict[str, Any]:
        """Handle /help command."""
        groups = params['groups']
        specific_command = groups[0] if groups[0] else None
        
        if specific_command:
            return self._get_command_help(specific_command)
        
        help_text = """
🤖 **Strategy Builder Chat Commands**

**Node Management:**
• `/add-node <type> <description>` - Add a new node
• `/edit-node <node-id> <property> <description>` - Edit node property
• `/delete-node <node-id>` - Remove a node
• `/list-nodes [flow-id]` - List all nodes in flow

**Strategy Creation:**
• `/create-strategy "name" <description>` - Create complete strategy
• `/connect <node1> to <node2>` - Connect two nodes
• `/show-flow <flow-id>` - Display flow structure

**Code & Testing:**
• `/preview-code <node-id>` - Show generated code
• `/test-strategy <strategy-id>` - Run strategy simulation

**Node Types:** data, function, strategy, risk, execution

**Natural Language:** You can also describe strategies in plain English!
Example: "Create a momentum strategy that buys when RSI crosses above 70"

Type `/help <command>` for specific command details.
        """
        
        return {
            'response': help_text,
            'action': 'help'
        }
    
    # Additional helper methods continue...
    async def _process_natural_language(self, message: str, session_id: str, 
                                      flow_id: Optional[str]) -> Dict[str, Any]:
        """Process natural language strategy description."""
        # Use Claude to understand intent and convert to strategy plan
        strategy_plan = await self._analyze_natural_language_intent(message, flow_id)
        
        if strategy_plan['intent'] == 'create_strategy':
            # Similar to create_strategy command but from natural language
            return await self._execute_natural_language_strategy_creation(
                strategy_plan, session_id, flow_id
            )
        elif strategy_plan['intent'] == 'modify_existing':
            return await self._execute_natural_language_modification(
                strategy_plan, session_id, flow_id
            )
        else:
            return {
                'response': f"I understand you want to {strategy_plan['intent']}. Could you be more specific or use a command like `/create-strategy \"name\" description`?",
                'action': 'clarification_needed',
                'suggestions': strategy_plan.get('suggestions', [])
            }
    
    # Database interaction methods
    async def _create_new_flow(self, name: str, description: str = "") -> str:
        """Create a new strategy flow in database."""
        flow_id = str(uuid.uuid4())
        
        with self.db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO strategy_flows (id, name, description, flow_json, status)
                VALUES (?, ?, ?, ?, 'draft')
            """, (flow_id, name, description, json.dumps({'nodes': [], 'edges': []})))
            conn.commit()
        
        return flow_id
    
    async def _add_node_to_flow(self, flow_id: str, node_id: str, node_type: str, 
                              description: str, translation_result: Dict[str, Any]) -> None:
        """Add node to strategy flow."""
        with self.db_manager.get_connection() as conn:
            cursor = conn.cursor()
            
            # Add node property
            cursor.execute("""
                INSERT INTO node_properties 
                (flow_id, node_id, property_name, natural_description, generated_code, code_type)
                VALUES (?, ?, 'main', ?, ?, 'python')
            """, (flow_id, node_id, description, translation_result.get('python_code', '')))
            
            # Update flow JSON
            cursor.execute("SELECT flow_json FROM strategy_flows WHERE id = ?", (flow_id,))
            flow_data = json.loads(cursor.fetchone()[0])
            
            flow_data['nodes'].append({
                'id': node_id,
                'type': node_type,
                'description': description,
                'position': {'x': 250, 'y': 100}
            })
            
            cursor.execute("""
                UPDATE strategy_flows 
                SET flow_json = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            """, (json.dumps(flow_data), flow_id))
            
            conn.commit()
    
    # Translation and AI methods
    async def _translate_node_description(self, node_type: str, description: str, 
                                        node_id: str) -> Dict[str, Any]:
        """Translate natural language description to code."""
        system_prompt = f"""
        You are an expert trading strategy developer. Convert the natural language description 
        into working Python code for a {node_type} node in a trading strategy.
        
        Node Type: {node_type}
        Description: {description}
        
        Generate clean, executable Python code that:
        1. Follows trading strategy best practices
        2. Includes proper error handling
        3. Uses appropriate libraries (pandas, numpy, etc.)
        4. Has clear variable names and comments
        
        Return only the Python code without explanations.
        """
        
        try:
            response = await self.claude_client.async_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1500,
                messages=[{"role": "user", "content": system_prompt}]
            )
            
            python_code = response.content[0].text.strip()
            
            return {
                'python_code': python_code,
                'status': 'success',
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Translation error: {e}")
            return {
                'python_code': f"# Error generating code: {str(e)}",
                'status': 'error',
                'error': str(e)
            }
    
    def _resolve_node_type(self, input_type: str) -> Optional[str]:
        """Resolve user input to standard node type."""
        input_lower = input_type.lower()
        
        for standard_type, aliases in self.node_types.items():
            if input_lower in aliases:
                return standard_type
        
        return None
    
    # Placeholder methods for remaining functionality
    async def _node_exists_in_flow(self, flow_id: str, node_id: str) -> bool:
        """Check if node exists in flow."""
        with self.db_manager.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM node_properties 
                WHERE flow_id = ? AND node_id = ?
            """, (flow_id, node_id))
            return cursor.fetchone()[0] > 0
    
    async def _plan_strategy_nodes(self, description: str) -> Dict[str, Any]:
        """Plan nodes needed for strategy description."""
        # Simplified implementation - should use Claude for better planning
        return {
            'nodes': [
                {'type': 'data', 'description': 'Market data source'},
                {'type': 'function', 'description': 'Signal calculation'},
                {'type': 'strategy', 'description': 'Trading logic'},
                {'type': 'execution', 'description': 'Order execution'}
            ],
            'connections': [
                {'from': 0, 'to': 1},
                {'from': 1, 'to': 2},
                {'from': 2, 'to': 3}
            ]
        }
    
    # Additional placeholder methods...
    async def _connect_nodes_in_flow(self, flow_id: str, from_node: str, to_node: str) -> None:
        """Connect two nodes in flow."""
        pass
    
    async def _update_node_property(self, flow_id: str, node_id: str, property_name: str, 
                                  description: str, translation_result: Dict[str, Any]) -> None:
        """Update node property."""
        pass
    
    async def _translate_property_description(self, node_id: str, property_name: str, 
                                            description: str) -> Dict[str, Any]:
        """Translate property description to code."""
        return {'python_code': f"# {description}", 'status': 'success'}
    
    async def _get_node_code(self, flow_id: str, node_id: str) -> Dict[str, Any]:
        """Get generated code for node."""
        return {'python_code': '# Node code here', 'sql_code': '-- SQL code here'}
    
    async def _analyze_natural_language_intent(self, message: str, flow_id: Optional[str]) -> Dict[str, Any]:
        """Analyze natural language intent."""
        return {'intent': 'create_strategy', 'confidence': 0.8}
    
    async def _execute_natural_language_strategy_creation(self, strategy_plan: Dict[str, Any], 
                                                        session_id: str, flow_id: Optional[str]) -> Dict[str, Any]:
        """Execute natural language strategy creation."""
        return {'response': 'Strategy created from natural language', 'action': 'strategy_created'}
    
    async def _execute_natural_language_modification(self, strategy_plan: Dict[str, Any], 
                                                   session_id: str, flow_id: Optional[str]) -> Dict[str, Any]:
        """Execute natural language modification."""
        return {'response': 'Strategy modified', 'action': 'strategy_modified'}
    
    def _get_command_help(self, command: str) -> Dict[str, Any]:
        """Get help for specific command."""
        return {'response': f'Help for {command} command', 'action': 'help'}
    
    async def _handle_show_flow(self, params: Dict[str, Any], session_id: str, flow_id: Optional[str]) -> Dict[str, Any]:
        """Handle show flow command."""
        return {'response': 'Flow structure displayed', 'action': 'show_flow'}
    
    async def _handle_list_nodes(self, params: Dict[str, Any], session_id: str, flow_id: Optional[str]) -> Dict[str, Any]:
        """Handle list nodes command."""
        return {'response': 'Nodes listed', 'action': 'list_nodes'}
    
    async def _handle_delete_node(self, params: Dict[str, Any], session_id: str, flow_id: Optional[str]) -> Dict[str, Any]:
        """Handle delete node command."""
        return {'response': 'Node deleted', 'action': 'node_deleted'}
    
    async def _handle_test_strategy(self, params: Dict[str, Any], session_id: str, flow_id: Optional[str]) -> Dict[str, Any]:
        """Handle test strategy command."""
        return {'response': 'Strategy test results', 'action': 'strategy_tested'}