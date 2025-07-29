"""
Enhanced Natural Language Translator for Strategy Builder

This module provides sophisticated translation of natural language descriptions
into executable Python/SQL code for trading strategies, with full context understanding.
"""

import json
import logging
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from .claude_client import ClaudeClient
from .database import DatabaseManager

logger = logging.getLogger(__name__)


class StrategyChatTranslator:
    """Enhanced translator for strategy-level natural language understanding."""
    
    def __init__(self, claude_client: ClaudeClient, db_manager: DatabaseManager):
        self.claude_client = claude_client
        self.db_manager = db_manager
        
        # Strategy patterns for intelligent parsing
        self.strategy_patterns = {
            'momentum': {
                'keywords': ['momentum', 'trend', 'breakout', 'rsi', 'macd', 'moving average'],
                'typical_nodes': ['data', 'function', 'strategy', 'execution'],
                'indicators': ['RSI', 'MACD', 'SMA', 'EMA']
            },
            'mean_reversion': {
                'keywords': ['mean reversion', 'bollinger', 'oversold', 'overbought', 'z-score'],
                'typical_nodes': ['data', 'function', 'strategy', 'risk', 'execution'],
                'indicators': ['Bollinger Bands', 'Z-Score', 'Standard Deviation']
            },
            'arbitrage': {
                'keywords': ['arbitrage', 'spread', 'pairs', 'correlation', 'difference'],
                'typical_nodes': ['data', 'data', 'function', 'strategy', 'execution'],
                'indicators': ['Price Ratio', 'Correlation', 'Spread']
            },
            'volatility': {
                'keywords': ['volatility', 'iv', 'implied vol', 'vix', 'surface'],
                'typical_nodes': ['data', 'function', 'strategy', 'risk', 'execution'],
                'indicators': ['Implied Volatility', 'SSVI', 'Vol Surface']
            },
            'options': {
                'keywords': ['options', 'calls', 'puts', 'greeks', 'delta', 'gamma'],
                'typical_nodes': ['data', 'function', 'function', 'strategy', 'risk', 'execution'],
                'indicators': ['Greeks', 'Delta', 'Gamma', 'Theta', 'Vega']
            }
        }
        
        # Node templates for common patterns
        self.node_templates = {
            'data_source': {
                'deribit': 'Connect to Deribit WebSocket for real-time {symbol} data',
                'binance': 'Fetch {symbol} price data from Binance API',
                'twitter': 'Monitor Twitter sentiment for {symbol} mentions',
                'news': 'Aggregate news sentiment for {symbol}'
            },
            'indicators': {
                'rsi': 'Calculate RSI with {period}-period lookback for {symbol}',
                'macd': 'Calculate MACD(12,26,9) for {symbol} price data',
                'bollinger': 'Calculate Bollinger Bands (20, 2) for {symbol}',
                'sma': 'Calculate {period}-period Simple Moving Average for {symbol}',
                'volatility': 'Calculate realized volatility using {method} for {symbol}'
            },
            'signals': {
                'buy': 'Generate BUY signal when {condition}',
                'sell': 'Generate SELL signal when {condition}',
                'hedge': 'Generate HEDGE signal when risk threshold exceeded'
            }
        }
    
    async def translate_complete_strategy(self, description: str, strategy_name: str) -> Dict[str, Any]:
        """
        Translate a complete strategy description into nodes and connections.
        
        Args:
            description: Natural language strategy description
            strategy_name: Name for the strategy
            
        Returns:
            Dict containing nodes, connections, and metadata
        """
        try:
            # 1. Analyze strategy type and intent
            strategy_analysis = await self._analyze_strategy_intent(description)
            
            # 2. Extract key components (assets, indicators, conditions)
            components = await self._extract_strategy_components(description)
            
            # 3. Plan node structure
            node_plan = await self._plan_node_structure(strategy_analysis, components)
            
            # 4. Generate individual nodes with code
            nodes = []
            for i, node_spec in enumerate(node_plan['nodes']):
                node_code = await self._generate_node_code(node_spec, components)
                nodes.append({
                    'id': f"node_{i+1}",
                    'type': node_spec['type'],
                    'name': node_spec['name'],
                    'description': node_spec['description'],
                    'python_code': node_code['python_code'],
                    'sql_code': node_code.get('sql_code', ''),
                    'position': {'x': 100 + (i % 4) * 200, 'y': 100 + (i // 4) * 150},
                    'config': node_spec.get('config', {})
                })
            
            # 5. Generate connections based on data flow
            connections = self._generate_connections(nodes, strategy_analysis)
            
            return {
                'strategy_name': strategy_name,
                'description': description,
                'strategy_type': strategy_analysis['type'],
                'nodes': nodes,
                'connections': connections,
                'components': components,
                'risk_level': strategy_analysis.get('risk_level', 'medium'),
                'estimated_complexity': len(nodes),
                'suggested_testing': self._suggest_testing_approach(strategy_analysis),
                'metadata': {
                    'created_at': datetime.now().isoformat(),
                    'translation_confidence': strategy_analysis.get('confidence', 0.8),
                    'requires_review': len(nodes) > 6 or strategy_analysis.get('risk_level') == 'high'
                }
            }
            
        except Exception as e:
            logger.error(f"Error translating strategy: {e}")
            return {
                'error': str(e),
                'strategy_name': strategy_name,
                'description': description,
                'nodes': [],
                'connections': []
            }
    
    async def translate_node_modification(self, node_id: str, flow_id: str, 
                                        modification_description: str) -> Dict[str, Any]:
        """
        Translate a natural language modification to existing node.
        
        Args:
            node_id: ID of node to modify
            flow_id: ID of containing flow
            modification_description: What to change
            
        Returns:
            Dict containing updated code and configuration
        """
        try:
            # Get current node context
            current_node = await self._get_node_context(flow_id, node_id)
            if not current_node:
                return {'error': f'Node {node_id} not found'}
            
            # Analyze modification intent
            modification_analysis = await self._analyze_modification_intent(
                modification_description, current_node
            )
            
            # Generate updated code
            updated_code = await self._generate_modified_code(
                current_node, modification_analysis
            )
            
            return {
                'node_id': node_id,
                'modification_type': modification_analysis['type'],
                'updated_code': updated_code,
                'impact_analysis': modification_analysis.get('impact', {}),
                'requires_retesting': modification_analysis.get('requires_retesting', True),
                'affected_connections': modification_analysis.get('affected_connections', [])
            }
            
        except Exception as e:
            logger.error(f"Error translating node modification: {e}")
            return {'error': str(e), 'node_id': node_id}
    
    async def suggest_node_additions(self, flow_id: str, intent: str) -> Dict[str, Any]:
        """
        Suggest nodes to add based on current flow and user intent.
        
        Args:
            flow_id: Current strategy flow ID
            intent: What user wants to add/improve
            
        Returns:
            Dict containing suggested nodes and reasoning
        """
        try:
            # Get current flow context
            current_flow = await self._get_flow_context(flow_id)
            
            # Analyze what's missing
            gap_analysis = await self._analyze_flow_gaps(current_flow, intent)
            
            # Generate suggestions
            suggestions = await self._generate_node_suggestions(gap_analysis, current_flow)
            
            return {
                'suggestions': suggestions,
                'reasoning': gap_analysis['reasoning'],
                'priority': gap_analysis['priority'],
                'estimated_improvement': gap_analysis.get('improvement', 'moderate')
            }
            
        except Exception as e:
            logger.error(f"Error generating suggestions: {e}")
            return {'error': str(e), 'suggestions': []}
    
    async def _analyze_strategy_intent(self, description: str) -> Dict[str, Any]:
        """Analyze the overall strategy intent and type."""
        prompt = f"""
        Analyze this trading strategy description and identify:
        1. Strategy type (momentum, mean_reversion, arbitrage, volatility, options, other)
        2. Primary assets/instruments mentioned
        3. Key indicators or signals
        4. Risk level (low, medium, high)
        5. Confidence in understanding (0.0-1.0)
        
        Strategy: "{description}"
        
        Return as JSON with keys: type, assets, indicators, risk_level, confidence, reasoning
        """
        
        try:
            response = await self.claude_client.async_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            analysis_text = response.content[0].text.strip()
            
            # Try to parse as JSON, fallback to text analysis
            try:
                return json.loads(analysis_text)
            except json.JSONDecodeError:
                # Fallback analysis
                return self._fallback_strategy_analysis(description)
                
        except Exception as e:
            logger.error(f"Error in strategy analysis: {e}")
            return self._fallback_strategy_analysis(description)
    
    def _fallback_strategy_analysis(self, description: str) -> Dict[str, Any]:
        """Fallback strategy analysis using pattern matching."""
        desc_lower = description.lower()
        
        # Detect strategy type
        strategy_type = 'other'
        confidence = 0.6
        
        for stype, patterns in self.strategy_patterns.items():
            if any(keyword in desc_lower for keyword in patterns['keywords']):
                strategy_type = stype
                confidence = 0.7
                break
        
        # Extract assets
        assets = []
        asset_patterns = ['btc', 'eth', 'bitcoin', 'ethereum', 'spy', 'qqq']
        for asset in asset_patterns:
            if asset in desc_lower:
                assets.append(asset.upper())
        
        # Determine risk level
        risk_indicators = {
            'high': ['leverage', 'short', 'derivative', 'margin'],
            'low': ['limit', 'stop', 'hedge', 'conservative']
        }
        
        risk_level = 'medium'
        for level, indicators in risk_indicators.items():
            if any(indicator in desc_lower for indicator in indicators):
                risk_level = level
                break
        
        return {
            'type': strategy_type,
            'assets': assets or ['BTC'],  # Default to BTC
            'indicators': [],
            'risk_level': risk_level,
            'confidence': confidence,
            'reasoning': f'Pattern-based analysis detected {strategy_type} strategy'
        }
    
    async def _extract_strategy_components(self, description: str) -> Dict[str, Any]:
        """Extract specific components like timeframes, thresholds, etc."""
        prompt = f"""
        Extract specific trading parameters from this strategy description:
        
        Strategy: "{description}"
        
        Identify and extract:
        1. Timeframes mentioned (1m, 5m, 1h, 1d, etc.)
        2. Numerical thresholds (RSI > 70, stop loss 5%, etc.)
        3. Specific exchanges or data sources
        4. Position sizing rules
        5. Entry/exit conditions
        
        Return as JSON with keys: timeframes, thresholds, exchanges, position_sizing, conditions
        """
        
        try:
            response = await self.claude_client.async_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}]
            )
            
            components_text = response.content[0].text.strip()
            
            try:
                return json.loads(components_text)
            except json.JSONDecodeError:
                return self._extract_components_regex(description)
                
        except Exception as e:
            logger.error(f"Error extracting components: {e}")
            return self._extract_components_regex(description)
    
    def _extract_components_regex(self, description: str) -> Dict[str, Any]:
        """Fallback component extraction using regex."""
        components = {
            'timeframes': [],
            'thresholds': [],
            'exchanges': [],
            'position_sizing': [],
            'conditions': []
        }
        
        # Extract timeframes
        timeframe_pattern = r'\b(\d+[mhd]|\d+\s*(?:minute|hour|day)s?)\b'
        components['timeframes'] = re.findall(timeframe_pattern, description, re.IGNORECASE)
        
        # Extract percentage thresholds
        percentage_pattern = r'\b(\d+(?:\.\d+)?%)\b'
        components['thresholds'] = re.findall(percentage_pattern, description)
        
        # Extract exchanges
        exchanges = ['deribit', 'binance', 'coinbase', 'kraken', 'ftx']
        for exchange in exchanges:
            if exchange in description.lower():
                components['exchanges'].append(exchange.title())
        
        return components
    
    async def _plan_node_structure(self, strategy_analysis: Dict[str, Any], 
                                 components: Dict[str, Any]) -> Dict[str, Any]:
        """Plan the node structure for the strategy."""
        strategy_type = strategy_analysis.get('type', 'other')
        assets = strategy_analysis.get('assets', ['BTC'])
        
        # Get base node structure for strategy type
        base_nodes = self.strategy_patterns.get(strategy_type, {}).get('typical_nodes', 
                                                                      ['data', 'function', 'strategy', 'execution'])
        
        nodes = []
        
        # Data source nodes
        exchanges = components.get('exchanges', ['Deribit'])
        for i, asset in enumerate(assets[:2]):  # Limit to 2 assets
            for exchange in exchanges[:1]:  # One exchange per asset
                nodes.append({
                    'type': 'data',
                    'name': f'{asset} Data Source',
                    'description': f'Real-time {asset} price data from {exchange}',
                    'config': {'symbol': asset, 'exchange': exchange}
                })
        
        # Function nodes (indicators/calculations)
        if strategy_type == 'momentum':
            nodes.extend([
                {
                    'type': 'function',
                    'name': 'RSI Calculator',
                    'description': 'Calculate 14-period RSI indicator',
                    'config': {'indicator': 'RSI', 'period': 14}
                },
                {
                    'type': 'function',
                    'name': 'MACD Calculator',
                    'description': 'Calculate MACD(12,26,9) indicator',
                    'config': {'indicator': 'MACD', 'fast': 12, 'slow': 26, 'signal': 9}
                }
            ])
        elif strategy_type == 'volatility':
            nodes.extend([
                {
                    'type': 'function',
                    'name': 'IV Calculator',
                    'description': 'Calculate implied volatility from options data',
                    'config': {'calculation': 'black_scholes'}
                },
                {
                    'type': 'function',
                    'name': 'Vol Surface',
                    'description': 'Build volatility surface using SSVI model',
                    'config': {'model': 'SSVI'}
                }
            ])
        else:
            # Generic function node
            nodes.append({
                'type': 'function',
                'name': 'Signal Calculator',
                'description': 'Calculate trading signals based on price data',
                'config': {'method': 'generic'}
            })
        
        # Strategy logic node
        nodes.append({
            'type': 'strategy',
            'name': f'{strategy_type.title()} Strategy',
            'description': f'Main {strategy_type} trading logic and signal generation',
            'config': {'strategy_type': strategy_type}
        })
        
        # Risk management (if high risk or mentioned)
        if strategy_analysis.get('risk_level') == 'high' or 'stop' in components.get('conditions', []):
            nodes.append({
                'type': 'risk',
                'name': 'Risk Manager',
                'description': 'Position sizing and stop-loss management',
                'config': {'max_risk': 0.02, 'stop_loss': 0.05}
            })
        
        # Execution node
        nodes.append({
            'type': 'execution',
            'name': 'Order Manager',
            'description': 'Execute trades and manage orders',
            'config': {'order_type': 'limit', 'slippage': 0.001}
        })
        
        return {'nodes': nodes}
    
    async def _generate_node_code(self, node_spec: Dict[str, Any], 
                                components: Dict[str, Any]) -> Dict[str, Any]:
        """Generate Python code for a specific node."""
        node_type = node_spec['type']
        node_name = node_spec['name']
        description = node_spec['description']
        config = node_spec.get('config', {})
        
        # Create context-aware prompt
        prompt = f"""
        Generate production-ready Python code for a {node_type} node in a trading strategy.
        
        Node Name: {node_name}
        Description: {description}
        Configuration: {json.dumps(config)}
        Strategy Components: {json.dumps(components)}
        
        Requirements:
        1. Use appropriate trading libraries (pandas, numpy, elastics-options for Greeks)
        2. Include proper error handling and logging
        3. Follow clean code practices with type hints
        4. Make it modular and testable
        5. Add docstring with clear parameter descriptions
        
        Generate ONLY the Python code, no explanations.
        """
        
        try:
            response = await self.claude_client.async_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            
            python_code = response.content[0].text.strip()
            
            # Clean up code formatting
            if python_code.startswith('```python'):
                python_code = python_code[9:]
            if python_code.endswith('```'):
                python_code = python_code[:-3]
            
            # Generate SQL code if data-related
            sql_code = ""
            if node_type == 'data':
                sql_code = self._generate_sql_for_data_node(config)
            
            return {
                'python_code': python_code.strip(),
                'sql_code': sql_code,
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Error generating node code: {e}")
            return {
                'python_code': self._generate_fallback_code(node_spec),
                'sql_code': "",
                'status': 'error',
                'error': str(e)
            }
    
    def _generate_sql_for_data_node(self, config: Dict[str, Any]) -> str:
        """Generate SQL query for data nodes."""
        symbol = config.get('symbol', 'BTC')
        exchange = config.get('exchange', 'deribit')
        
        return f"""
        SELECT 
            timestamp,
            price,
            volume,
            direction
        FROM market_data 
        WHERE symbol = '{symbol}' 
            AND exchange = '{exchange.lower()}'
            AND timestamp >= datetime('now', '-1 day')
        ORDER BY timestamp DESC
        LIMIT 1000;
        """
    
    def _generate_fallback_code(self, node_spec: Dict[str, Any]) -> str:
        """Generate fallback code when AI generation fails."""
        node_type = node_spec['type']
        node_name = node_spec['name']
        
        templates = {
            'data': f"""
class {node_name.replace(' ', '')}:
    def __init__(self):
        self.symbol = "{node_spec.get('config', {}).get('symbol', 'BTC')}"
        
    def get_data(self):
        # Fetch real-time data for {self.symbol}
        return {{}}
            """,
            'function': f"""
def {node_name.lower().replace(' ', '_')}(data):
    '''
    {node_spec['description']}
    '''
    # Implement calculation logic here
    return data
            """,
            'strategy': f"""
class {node_name.replace(' ', '')}:
    def __init__(self):
        self.name = "{node_name}"
        
    def generate_signals(self, data):
        '''Generate trading signals'''
        return {{'signal': 'hold', 'confidence': 0.5}}
            """,
            'risk': f"""
def calculate_position_size(account_balance, risk_per_trade=0.02):
    '''Calculate position size based on risk parameters'''
    return account_balance * risk_per_trade
            """,
            'execution': f"""
class OrderManager:
    def __init__(self):
        self.orders = []
        
    def place_order(self, symbol, side, quantity, price=None):
        '''Place trading order'''
        order = {{
            'symbol': symbol,
            'side': side,
            'quantity': quantity,
            'price': price,
            'status': 'pending'
        }}
        self.orders.append(order)
        return order
            """
        }
        
        return templates.get(node_type, "# Generated code placeholder")
    
    def _generate_connections(self, nodes: List[Dict[str, Any]], 
                            strategy_analysis: Dict[str, Any]) -> List[Dict[str, str]]:
        """Generate logical connections between nodes."""
        connections = []
        
        # Create basic data flow: data -> function -> strategy -> execution
        data_nodes = [n for n in nodes if n['type'] == 'data']
        function_nodes = [n for n in nodes if n['type'] == 'function']
        strategy_nodes = [n for n in nodes if n['type'] == 'strategy']
        risk_nodes = [n for n in nodes if n['type'] == 'risk']
        execution_nodes = [n for n in nodes if n['type'] == 'execution']
        
        # Connect data to functions
        for data_node in data_nodes:
            for func_node in function_nodes:
                connections.append({
                    'from': data_node['id'],
                    'to': func_node['id']
                })
        
        # Connect functions to strategy
        for func_node in function_nodes:
            for strategy_node in strategy_nodes:
                connections.append({
                    'from': func_node['id'],
                    'to': strategy_node['id']
                })
        
        # Connect strategy to risk (if exists)
        for strategy_node in strategy_nodes:
            if risk_nodes:
                for risk_node in risk_nodes:
                    connections.append({
                        'from': strategy_node['id'],
                        'to': risk_node['id']
                    })
            else:
                # Direct to execution if no risk node
                for exec_node in execution_nodes:
                    connections.append({
                        'from': strategy_node['id'],
                        'to': exec_node['id']
                    })
        
        # Connect risk to execution
        for risk_node in risk_nodes:
            for exec_node in execution_nodes:
                connections.append({
                    'from': risk_node['id'],
                    'to': exec_node['id']
                })
        
        return connections
    
    def _suggest_testing_approach(self, strategy_analysis: Dict[str, Any]) -> List[str]:
        """Suggest testing approach based on strategy type."""
        strategy_type = strategy_analysis.get('type', 'other')
        risk_level = strategy_analysis.get('risk_level', 'medium')
        
        suggestions = [
            "Start with paper trading to validate signals",
            "Backtest on at least 6 months of historical data",
            "Test with small position sizes initially"
        ]
        
        if strategy_type == 'volatility':
            suggestions.append("Validate Greeks calculations with market data")
        
        if risk_level == 'high':
            suggestions.extend([
                "Implement comprehensive risk limits",
                "Monitor drawdown carefully",
                "Consider additional hedging mechanisms"
            ])
        
        return suggestions
    
    # Placeholder methods for remaining functionality
    async def _get_node_context(self, flow_id: str, node_id: str) -> Optional[Dict[str, Any]]:
        """Get current node context from database."""
        return {'id': node_id, 'type': 'function', 'description': 'Sample node'}
    
    async def _analyze_modification_intent(self, description: str, current_node: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze what modification is being requested."""
        return {'type': 'parameter_change', 'requires_retesting': True}
    
    async def _generate_modified_code(self, current_node: Dict[str, Any], 
                                    modification: Dict[str, Any]) -> Dict[str, Any]:
        """Generate modified code for node."""
        return {'python_code': '# Modified code', 'status': 'success'}
    
    async def _get_flow_context(self, flow_id: str) -> Dict[str, Any]:
        """Get current flow context."""
        return {'nodes': [], 'connections': []}
    
    async def _analyze_flow_gaps(self, current_flow: Dict[str, Any], intent: str) -> Dict[str, Any]:
        """Analyze gaps in current flow."""
        return {'reasoning': 'Analysis complete', 'priority': 'medium'}
    
    async def _generate_node_suggestions(self, gap_analysis: Dict[str, Any], 
                                       current_flow: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate node suggestions."""
        return [{'type': 'risk', 'description': 'Add risk management', 'priority': 'high'}]