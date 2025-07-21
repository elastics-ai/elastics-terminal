#!/usr/bin/env python3
"""
Claude API client for intelligent portfolio and market analysis.

This module provides integration with Anthropic's Claude API for answering
questions about portfolio data, volatility events, and market conditions.
"""

import os
import asyncio
import logging
import json
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from anthropic import AsyncAnthropic, Anthropic

from .sql_agent import SQLAgent
from .chat_examples import ChatExamples
from .finance_glossary import FinanceGlossary

logger = logging.getLogger(__name__)


class ClaudeClient:
    """Client for interacting with Claude API."""
    
    def __init__(self, api_key: Optional[str] = None, db_path: str = 'volatility_filter.db'):
        """Initialize Claude client with API key."""
        self.api_key = api_key or os.environ.get('ANTHROPIC_API_KEY')
        
        if not self.api_key:
            raise ValueError(
                "No API key provided. Set ANTHROPIC_API_KEY environment variable "
                "or pass api_key parameter."
            )
        
        self.client = Anthropic(api_key=self.api_key)
        self.async_client = AsyncAnthropic(api_key=self.api_key)
        
        # Initialize SQL agent
        self.sql_agent = SQLAgent(db_path=db_path)
        
        # Build enhanced system prompt
        self.system_prompt = self._build_system_prompt()
    
    def create_conversation_context(self, db_context: Dict[str, Any]) -> str:
        """Create context string from database data."""
        context_parts = []
        
        # Portfolio summary
        if 'portfolio_summary' in db_context:
            summary = db_context['portfolio_summary']
            context_parts.append(f"""Portfolio Summary:
- Total Positions: {summary.get('active_positions', 0)}
- Portfolio Value: ${summary.get('total_value', 0):,.2f}
- Total P&L: ${summary.get('total_pnl', 0):,.2f} ({summary.get('avg_pnl_percent', 0):.2f}%)
- Net Delta: ${summary.get('total_delta', 0):,.2f}
- Gamma Exposure: ${summary.get('total_gamma_exposure', 0):,.2f}
- Vega Exposure: ${summary.get('total_vega_exposure', 0):,.2f}
- Theta Exposure: ${summary.get('total_theta_exposure', 0):,.2f}""")
        
        # Active positions
        if 'positions' in db_context and db_context['positions']:
            context_parts.append("\nTop Active Positions:")
            for i, pos in enumerate(db_context['positions'][:5]):
                context_parts.append(f"""
Position {i+1}: {pos.get('instrument_name')}
- Type: {pos.get('instrument_type')}
- Quantity: {pos.get('quantity')}
- Entry Price: ${pos.get('entry_price', 0):,.2f}
- Current Price: ${pos.get('current_price', 0):,.2f}
- P&L: ${pos.get('pnl', 0):,.2f} ({pos.get('pnl_percent', 0):.1f}%)
- Delta: {pos.get('delta', 0):.4f}
- IV: {pos.get('mark_iv', 0)*100:.1f}%""")
        
        # Recent volatility events
        if 'volatility_events' in db_context and db_context['volatility_events']:
            context_parts.append("\nRecent Volatility Events:")
            for event in db_context['volatility_events'][:5]:
                event_time = datetime.fromtimestamp(event.get('timestamp', 0) / 1000)
                context_parts.append(f"""
- {event_time.strftime('%Y-%m-%d %H:%M:%S')}: Volatility = {event.get('volatility', 0):.6f}
  Price: ${event.get('price', 0):,.2f}, Volume: {event.get('volume', 0):.2f}""")
        
        # Market statistics
        if 'market_stats' in db_context:
            stats = db_context['market_stats']
            context_parts.append(f"""\nMarket Statistics:
- Current Spot Price: ${stats.get('spot_price', 0):,.2f}
- ATM Volatility: {stats.get('atm_vol', 0)*100:.1f}%
- 25-Delta Skew: {stats.get('skew', 0)*100:.1f}%
- Options Tracked: {stats.get('num_options', 0)}""")
        
        # Polymarket prediction markets
        if 'polymarket_data' in db_context and db_context['polymarket_data']:
            context_parts.append("\nRelevant Prediction Markets:")
            for market in db_context['polymarket_data'][:5]:  # Top 5 markets
                context_parts.append(f"""
Market: {market.get('question', 'Unknown')}
- Yes: {market.get('yes_price', 0)*100:.1f}% | No: {market.get('no_price', 0)*100:.1f}%
- Volume: ${market.get('volume', 0):,.0f}
- Category: {market.get('category', 'Unknown')}""")
        
        return "\n".join(context_parts)
    
    def _build_system_prompt(self) -> str:
        """Build comprehensive system prompt with schema and examples."""
        prompt_parts = []
        
        # Base role description
        prompt_parts.append("""You are a financial analysis assistant integrated into a Bloomberg Terminal-style volatility monitoring system with SQL query capabilities.

You have access to:
1. Real-time portfolio data, volatility metrics, and options market information
2. A SQL database containing detailed trading history, positions, and Greeks
3. Prediction market data from Polymarket

Your capabilities:
1. Analyze portfolio positions and risk metrics using both provided context and SQL queries
2. Generate SQL queries to answer specific questions about positions, Greeks, P&L, etc.
3. Explain volatility events and market conditions
4. Provide insights on Greeks exposure and hedging strategies
5. Answer questions about options pricing and implied volatility
6. Correlate market volatility with prediction market probabilities

IMPORTANT: When a user asks a question that requires specific data (like "what is my delta exposure for X strike"), you should:
1. First think about what SQL query would answer this question
2. Generate the SQL query
3. Wait for the query results
4. Provide a clear, interpreted answer based on the results
""")
        
        # Add database schema
        prompt_parts.append("\n=== DATABASE SCHEMA ===")
        prompt_parts.append(self.sql_agent.get_schema_context())
        
        # Add finance glossary
        prompt_parts.append("\n" + FinanceGlossary.get_glossary_context())
        
        # Add few-shot examples
        prompt_parts.append("\n=== EXAMPLE INTERACTIONS ===")
        prompt_parts.append(ChatExamples.format_examples_for_prompt())
        
        # Add formatting guidelines
        prompt_parts.append("""
=== RESPONSE GUIDELINES ===

1. For data queries, ALWAYS use SQL when possible rather than relying only on context
2. Format numbers appropriately:
   - Prices: $X,XXX.XX with commas
   - Percentages: X.X% 
   - Greeks: Show appropriate decimal places
   - Always include units

3. When showing query results:
   - Summarize key findings first
   - Show relevant details in a structured format
   - Explain what the numbers mean in context

4. Risk warnings:
   - Highlight concentrated positions (>20% of portfolio)
   - Warn about high gamma exposure near expiry
   - Note unusual volatility patterns

5. Terminal formatting:
   - Use markdown for structure
   - Keep lines reasonably short
   - Use bullet points for lists
   - Bold important numbers with **text**
""")
        
        return "\n".join(prompt_parts)
    
    def extract_sql_query(self, text: str) -> Optional[str]:
        """Extract SQL query from Claude's response."""
        # Look for SQL in code blocks
        sql_pattern = r'```sql\n(.*?)\n```'
        match = re.search(sql_pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        
        # Look for SELECT statements
        select_pattern = r'(SELECT\s+.*?(?:;|$))'
        match = re.search(select_pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        
        return None
    
    async def ask_async(
        self, 
        question: str, 
        db_context: Dict[str, Any],
        conversation_history: List[Dict[str, str]] = None
    ) -> str:
        """Ask Claude a question with portfolio context and SQL capabilities."""
        try:
            # Build context
            context = self.create_conversation_context(db_context)
            
            # Build messages
            messages = []
            
            # Add context as first user message
            messages.append({
                "role": "user",
                "content": f"Here is the current portfolio and market data:\n\n{context}"
            })
            
            # Add conversation history if provided
            if conversation_history:
                messages.extend(conversation_history)
            
            # Add current question with SQL instruction
            messages.append({
                "role": "user",
                "content": f"""{question}

If you need specific data to answer this question, please generate a SQL query. Format it as:
```sql
SELECT ...
```

Then I will execute it and provide the results."""
            })
            
            # First call - Claude may generate a SQL query
            response = await self.async_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1000,
                temperature=0.3,
                system=self.system_prompt,
                messages=messages
            )
            
            initial_response = response.content[0].text
            
            # Check if Claude generated a SQL query
            sql_query = self.extract_sql_query(initial_response)
            
            if sql_query:
                logger.info(f"Executing SQL query: {sql_query}")
                
                # Execute the query
                results = self.sql_agent.execute_query(sql_query)
                
                # Format results for Claude
                formatted_results = self.sql_agent.format_results_for_llm(results)
                
                # Add Claude's response with SQL to history
                messages.append({
                    "role": "assistant",
                    "content": initial_response
                })
                
                # Add query results
                messages.append({
                    "role": "user",
                    "content": f"Query results:\n\n{formatted_results}\n\nNow please provide a complete answer based on these results."
                })
                
                # Second call - Claude interprets results
                final_response = await self.async_client.messages.create(
                    model="claude-3-5-sonnet-20240620",
                    max_tokens=1500,
                    temperature=0.3,
                    system=self.system_prompt,
                    messages=messages
                )
                
                return final_response.content[0].text
            else:
                # No SQL query needed, return initial response
                return initial_response
            
        except Exception as e:
            logger.error(f"Error in ask_async: {e}")
            return f"Error: Unable to process request. {str(e)}"
    
    def ask(
        self, 
        question: str, 
        db_context: Dict[str, Any],
        conversation_history: List[Dict[str, str]] = None
    ) -> str:
        """Ask Claude a question with portfolio context synchronously."""
        # Run the async version in a new event loop
        import asyncio
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(
                self.ask_async(question, db_context, conversation_history)
            )
            return result
        finally:
            loop.close()
    
    def get_suggested_questions(self, db_context: Dict[str, Any]) -> List[str]:
        """Get suggested questions based on current portfolio state."""
        suggestions = [
            "What is my delta exposure for 100k strike calls?",
            "Show me my largest losing positions",
            "What's my total gamma exposure?",
            "Break down my P&L by instrument type",
            "Am I too exposed to any particular strike or expiry?",
            "How has implied volatility changed for ATM options today?",
            "Analyze my portfolio's Greeks and suggest hedging strategies",
            "What are my positions expiring this month?"
        ]
        
        # Add context-specific suggestions
        if db_context.get('portfolio_summary', {}).get('total_pnl', 0) < 0:
            suggestions.append("Why is my portfolio showing losses?")
            
        if abs(db_context.get('portfolio_summary', {}).get('total_delta', 0)) > 100000:
            suggestions.append("Is my delta exposure too high?")
            
        if db_context.get('volatility_events'):
            suggestions.append("What caused the recent volatility spike?")
            
        if db_context.get('polymarket_data'):
            suggestions.append("What do prediction markets say about crypto volatility?")
            suggestions.append("How do Polymarket probabilities relate to my portfolio risk?")
            
        return suggestions