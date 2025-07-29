#!/usr/bin/env python3
"""
Claude API client for intelligent portfolio and market analysis.

This module provides integration with Anthropic's Claude API for answering
questions about portfolio data, volatility events, and market conditions.
"""

import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from anthropic import Anthropic, AsyncAnthropic

from .chat_examples import ChatExamples
from .finance_glossary import FinanceGlossary
from .sql_agent import SQLAgent
from .database import DatabaseManager
from .polymarket_volatility import polymarket_vol_calculator, analyze_market_volatilities

logger = logging.getLogger(__name__)


class ClaudeClient:
    """Client for interacting with Claude API."""

    def __init__(
        self, api_key: Optional[str] = None, db_path: str = "volatility_filter.db"
    ):
        """Initialize Claude client with API key."""
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")

        if not self.api_key:
            raise ValueError(
                "No API key provided. Set ANTHROPIC_API_KEY environment variable "
                "or pass api_key parameter."
            )

        self.client = Anthropic(api_key=self.api_key)
        self.async_client = AsyncAnthropic(api_key=self.api_key)

        # Initialize SQL agent and database manager
        self.sql_agent = SQLAgent(db_path=db_path)
        self.db_manager = DatabaseManager(db_path=db_path)

        # Build enhanced system prompt
        self.system_prompt = self._build_system_prompt()

    def create_conversation_context(self, db_context: Dict[str, Any]) -> str:
        """Create context string from database data."""
        context_parts = []

        # Portfolio summary
        if "portfolio_summary" in db_context:
            summary = db_context["portfolio_summary"]
            context_parts.append(
                f"""Portfolio Summary:
- Total Positions: {summary.get("active_positions", 0)}
- Portfolio Value: ${summary.get("total_value", 0):,.2f}
- Total P&L: ${summary.get("total_pnl", 0):,.2f} ({summary.get("avg_pnl_percent", 0):.2f}%)
- Net Delta: ${summary.get("total_delta", 0):,.2f}
- Gamma Exposure: ${summary.get("total_gamma_exposure", 0):,.2f}
- Vega Exposure: ${summary.get("total_vega_exposure", 0):,.2f}
- Theta Exposure: ${summary.get("total_theta_exposure", 0):,.2f}"""
            )

        # Active positions
        if "positions" in db_context and db_context["positions"]:
            context_parts.append("\nTop Active Positions:")
            for i, pos in enumerate(db_context["positions"][:5]):
                context_parts.append(
                    f"""
Position {i + 1}: {pos.get("instrument_name")}
- Type: {pos.get("instrument_type")}
- Quantity: {pos.get("quantity")}
- Entry Price: ${pos.get("entry_price", 0):,.2f}
- Current Price: ${pos.get("current_price", 0):,.2f}
- P&L: ${pos.get("pnl", 0):,.2f} ({pos.get("pnl_percent", 0):.1f}%)
- Delta: {pos.get("delta", 0):.4f}
- IV: {pos.get("mark_iv", 0) * 100:.1f}%"""
                )

        # Recent volatility events
        if "volatility_events" in db_context and db_context["volatility_events"]:
            context_parts.append("\nRecent Volatility Events:")
            for event in db_context["volatility_events"][:5]:
                event_time = datetime.fromtimestamp(event.get("timestamp", 0) / 1000)
                context_parts.append(
                    f"""
- {event_time.strftime("%Y-%m-%d %H:%M:%S")}: Volatility = {event.get("volatility", 0):.6f}
  Price: ${event.get("price", 0):,.2f}, Volume: {event.get("volume", 0):.2f}"""
                )

        # Market statistics
        if "market_stats" in db_context:
            stats = db_context["market_stats"]
            context_parts.append(
                f"""\nMarket Statistics:
- Current Spot Price: ${stats.get("spot_price", 0):,.2f}
- ATM Volatility: {stats.get("atm_vol", 0) * 100:.1f}%
- 25-Delta Skew: {stats.get("skew", 0) * 100:.1f}%
- Options Tracked: {stats.get("num_options", 0)}"""
            )

        # Polymarket prediction markets with volatility analysis
        if "polymarket_data" in db_context and db_context["polymarket_data"]:
            context_parts.append("\nRelevant Prediction Markets:")
            
            # Calculate volatility insights for the markets
            markets_data = db_context["polymarket_data"][:5]  # Top 5 markets
            volatility_insights = analyze_market_volatilities(markets_data)
            
            # Add individual market data with volatility
            for market in markets_data:
                implied_vol = polymarket_vol_calculator.calculate_implied_volatility(market)
                vol_text = ""
                if implied_vol is not None:
                    vol_pct = implied_vol * 100
                    vol_level = "Low" if vol_pct < 20 else "Moderate" if vol_pct < 40 else "High" if vol_pct < 60 else "Very High"
                    vol_text = f"\n- Implied Volatility: {vol_pct:.1f}% ({vol_level})"
                
                context_parts.append(
                    f"""
Market: {market.get("question", "Unknown")}
- Yes: {market.get("yes_percentage", 0):.1f}% | No: {market.get("no_percentage", 0):.1f}%
- Volume: ${market.get("volume", 0):,.0f}
- Category: {market.get("category", "Unknown")}{vol_text}"""
                )
            
            # Add volatility summary if we have statistics
            if volatility_insights.get('statistics') and volatility_insights['calculable_markets'] > 0:
                stats = volatility_insights['statistics']
                context_parts.append(f"""
Volatility Analysis Summary ({volatility_insights['calculable_markets']} markets):
- Average Implied Vol: {stats['mean_iv'] * 100:.1f}%
- Volatility Range: {stats['min_iv'] * 100:.1f}% - {stats['max_iv'] * 100:.1f}%
- High volatility markets: {len(volatility_insights['high_vol_markets'])}
- Low volatility markets: {len(volatility_insights['low_vol_markets'])}"""
                )

        return "\n".join(context_parts)

    def _build_system_prompt(self) -> str:
        """Build comprehensive system prompt with schema and examples."""
        prompt_parts = []

        # Base role description
        prompt_parts.append(
            """You are a financial analysis assistant integrated into a Bloomberg Terminal-style volatility monitoring system with SQL query capabilities.

You have access to:
1. Real-time portfolio data, volatility metrics, and options market information
2. A SQL database containing detailed trading history, positions, and Greeks
3. Prediction market data from Polymarket with implied volatility calculations
4. Advanced volatility analysis tools using the elastics-options library

Your capabilities:
1. Analyze portfolio positions and risk metrics using both provided context and SQL queries
2. Generate SQL queries to answer specific questions about positions, Greeks, P&L, etc.
3. Explain volatility events and market conditions
4. Provide insights on Greeks exposure and hedging strategies
5. Answer questions about options pricing and implied volatility
6. Calculate and analyze implied volatility for Polymarket prediction market contracts
7. Correlate market volatility with prediction market probabilities
8. Compare volatility levels across different market categories and time periods

When analyzing Polymarket contracts:
- Treat them as binary options with $1 payout for the winning outcome
- Use the elastics-options library calculations for implied volatility
- Consider time to expiry, market prices, and risk-free rates
- Provide volatility insights in the context of market uncertainty and risk

IMPORTANT: When a user asks a question that requires specific data (like "what is my delta exposure for X strike"), you should:
1. First think about what SQL query would answer this question
2. Generate the SQL query
3. Wait for the query results
4. Provide a clear, interpreted answer based on the results
"""
        )

        # Add database schema
        prompt_parts.append("\n=== DATABASE SCHEMA ===")
        prompt_parts.append(self.sql_agent.get_schema_context())

        # Add finance glossary
        prompt_parts.append("\n" + FinanceGlossary.get_glossary_context())

        # Add few-shot examples
        prompt_parts.append("\n=== EXAMPLE INTERACTIONS ===")
        prompt_parts.append(ChatExamples.format_examples_for_prompt())

        # Add formatting guidelines
        prompt_parts.append(
            """
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
"""
        )

        return "\n".join(prompt_parts)

    def extract_sql_query(self, text: str) -> Optional[str]:
        """Extract SQL query from Claude's response."""
        # Look for SQL in code blocks
        sql_pattern = r"```sql\n(.*?)\n```"
        match = re.search(sql_pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()

        # Look for SELECT statements
        select_pattern = r"(SELECT\s+.*?(?:;|$))"
        match = re.search(select_pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()

        return None

    async def ask_async(
        self,
        question: str,
        db_context: Dict[str, Any],
        conversation_history: List[Dict[str, str]] = None,
    ) -> str:
        """Ask Claude a question with portfolio context and SQL capabilities."""
        try:
            # Build context
            context = self.create_conversation_context(db_context)

            # Build messages
            messages = []

            # Add context as first user message
            messages.append(
                {
                    "role": "user",
                    "content": f"Here is the current portfolio and market data:\n\n{context}",
                }
            )

            # Add conversation history if provided
            if conversation_history:
                messages.extend(conversation_history)

            # Add current question with SQL instruction
            messages.append(
                {
                    "role": "user",
                    "content": f"""{question}

If you need specific data to answer this question, please generate a SQL query. Format it as:
```sql
SELECT ...
```

Then I will execute it and provide the results.""",
                }
            )

            # First call - Claude may generate a SQL query
            response = await self.async_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                temperature=0.3,
                system=self.system_prompt,
                messages=messages,
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
                messages.append({"role": "assistant", "content": initial_response})

                # Add query results
                messages.append(
                    {
                        "role": "user",
                        "content": f"Query results:\n\n{formatted_results}\n\nNow please provide a complete answer based on these results.",
                    }
                )

                # Second call - Claude interprets results
                final_response = await self.async_client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1500,
                    temperature=0.3,
                    system=self.system_prompt,
                    messages=messages,
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
        conversation_history: List[Dict[str, str]] = None,
    ) -> str:
        """Ask Claude a question with portfolio context synchronously."""
        # Run the async version in a new event loop
        import asyncio as aio

        try:
            loop = aio.new_event_loop()
            aio.set_event_loop(loop)
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
            "What are my positions expiring this month?",
        ]

        # Add context-specific suggestions
        if db_context.get("portfolio_summary", {}).get("total_pnl", 0) < 0:
            suggestions.append("Why is my portfolio showing losses?")

        if abs(db_context.get("portfolio_summary", {}).get("total_delta", 0)) > 100000:
            suggestions.append("Is my delta exposure too high?")

        if db_context.get("volatility_events"):
            suggestions.append("What caused the recent volatility spike?")

        if db_context.get("polymarket_data"):
            suggestions.append(
                "What do prediction markets say about crypto volatility?"
            )
            suggestions.append(
                "How do Polymarket probabilities relate to my portfolio risk?"
            )
            suggestions.append(
                "What is the implied volatility of this contract?"
            )
            suggestions.append(
                "Which Polymarket contracts have the highest implied volatility?"
            )
            suggestions.append(
                "How does the implied vol compare across different market categories?"
            )

        return suggestions

    def _detect_volatility_query(self, question: str) -> bool:
        """Detect if the question is specifically about volatility calculations."""
        volatility_keywords = [
            'implied vol', 'implied volatility', 'iv', 'volatility',
            'vol surface', 'contract vol', 'market vol',
            'high vol', 'low vol', 'vol analysis', 'vol comparison'
        ]
        question_lower = question.lower()
        return any(keyword in question_lower for keyword in volatility_keywords)

    def _enhance_volatility_response(self, question: str, db_context: Dict[str, Any], base_response: str) -> str:
        """Enhance response with detailed volatility analysis if applicable."""
        if not self._detect_volatility_query(question) or not db_context.get("polymarket_data"):
            return base_response
        
        try:
            markets_data = db_context["polymarket_data"]
            volatility_insights = analyze_market_volatilities(markets_data)
            
            if volatility_insights['calculable_markets'] == 0:
                return base_response
            
            # Add detailed volatility analysis
            vol_analysis = ["\n\n**Detailed Volatility Analysis:**"]
            
            # High volatility markets
            if volatility_insights['high_vol_markets']:
                vol_analysis.append("**Highest Volatility Markets:**")
                for market in volatility_insights['high_vol_markets'][:3]:
                    vol_analysis.append(
                        f"• {market['question'][:60]}... - {market['implied_vol']*100:.1f}% IV"
                    )
            
            # Low volatility markets
            if volatility_insights['low_vol_markets']:
                vol_analysis.append("\n**Lowest Volatility Markets:**")
                for market in volatility_insights['low_vol_markets'][:3]:
                    vol_analysis.append(
                        f"• {market['question'][:60]}... - {market['implied_vol']*100:.1f}% IV"
                    )
            
            # Category analysis
            category_vols = {}
            for market in volatility_insights['market_volatilities']:
                category = market['category']
                if category not in category_vols:
                    category_vols[category] = []
                category_vols[category].append(market['implied_vol'])
            
            if len(category_vols) > 1:
                vol_analysis.append("\n**Volatility by Category:**")
                for category, vols in category_vols.items():
                    avg_vol = sum(vols) / len(vols) * 100
                    vol_analysis.append(f"• {category}: {avg_vol:.1f}% avg IV ({len(vols)} markets)")
            
            return base_response + "\n".join(vol_analysis)
        
        except Exception as e:
            logger.error(f"Error enhancing volatility response: {e}")
            return base_response

    async def ask_with_history(
        self,
        question: str,
        db_context: Dict[str, Any],
        session_id: str,
        user_id: Optional[str] = None,
        conversation_id: Optional[int] = None,
        parent_message_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Ask Claude a question with conversation history tracking and SQL module saving."""
        try:
            # Create or get conversation
            if not conversation_id:
                conversation_data = {
                    "session_id": session_id,
                    "user_id": user_id,
                    "title": question[:100] if len(question) > 100 else question,
                    "use_case": "portfolio_analysis",
                    "parent_message_id": parent_message_id,
                }
                conversation_id = self.db_manager.create_chat_conversation(conversation_data)
            
            # Store user message
            user_message_id = self.db_manager.insert_chat_message({
                "conversation_id": conversation_id,
                "role": "user",
                "content": question,
                "metadata": {"session_id": session_id, "user_id": user_id},
            })

            # Get conversation history for context
            conversation_history = self.db_manager.get_chat_messages(conversation_id, limit=10)
            
            # Convert to format expected by Claude
            claude_history = []
            for msg in conversation_history[:-1]:  # Exclude the just-added message
                claude_history.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

            # Build context
            context = self.create_conversation_context(db_context)

            # Build messages
            messages = []

            # Add context as first user message
            messages.append({
                "role": "user",
                "content": f"Here is the current portfolio and market data:\n\n{context}",
            })

            # Add conversation history if any
            if claude_history:
                messages.extend(claude_history)

            # Add current question with SQL instruction
            messages.append({
                "role": "user",
                "content": f"""{question}

If you need specific data to answer this question, please generate a SQL query. Format it as:
```sql
SELECT ...
```

Then I will execute it and provide the results.""",
            })

            # First call - Claude may generate a SQL query
            response = await self.async_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                temperature=0.3,
                system=self.system_prompt,
                messages=messages,
            )

            initial_response = response.content[0].text
            sql_query = None
            sql_results = None
            final_response = initial_response

            # Check if Claude generated a SQL query
            extracted_sql = self.extract_sql_query(initial_response)

            if extracted_sql:
                logger.info(f"Executing SQL query: {extracted_sql}")
                sql_query = extracted_sql

                # Execute the query
                results = self.sql_agent.execute_query(sql_query)
                sql_results = results

                # Format results for Claude
                formatted_results = self.sql_agent.format_results_for_llm(results)

                # Add Claude's response with SQL to history
                messages.append({"role": "assistant", "content": initial_response})

                # Add query results
                messages.append({
                    "role": "user",
                    "content": f"Query results:\n\n{formatted_results}\n\nNow please provide a complete answer based on these results.",
                })

                # Second call - Claude interprets results
                final_response_obj = await self.async_client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1500,
                    temperature=0.3,
                    system=self.system_prompt,
                    messages=messages,
                )

                final_response = final_response_obj.content[0].text

                # Save SQL module if query was successful
                if results.get("success", False):
                    try:
                        import json
                        self.db_manager.create_or_update_sql_module(
                            sql_query=sql_query,
                            message_id=user_message_id,
                            conversation_id=conversation_id,
                            execution_time_ms=results.get("execution_time_ms", 0),
                            row_count=results.get("row_count", 0),
                            query_results=json.dumps(results.get("data", [])[:10]) if results.get("data") else None,
                        )
                        logger.info(f"Saved SQL module for query: {sql_query[:50]}...")
                    except Exception as e:
                        logger.error(f"Failed to save SQL module: {e}")

            # Store assistant message
            assistant_message_id = self.db_manager.insert_chat_message({
                "conversation_id": conversation_id,
                "role": "assistant", 
                "content": final_response,
                "metadata": {"session_id": session_id},
                "sql_query": sql_query,
                "query_results": json.dumps(sql_results) if sql_results else None,
                "context_snapshot": json.dumps(db_context),
            })

            # Enhance response with volatility analysis if applicable
            enhanced_response = self._enhance_volatility_response(question, db_context, final_response)
            
            # Get suggested questions for response
            suggestions = self.get_suggested_questions(db_context)

            return {
                "response": enhanced_response,
                "timestamp": datetime.now().isoformat(),
                "conversation_id": conversation_id,
                "message_id": assistant_message_id,
                "suggestions": suggestions[:4],  # Limit to 4 suggestions
            }

        except Exception as e:
            logger.error(f"Error in ask_with_history: {e}")
            return {
                "response": f"Sorry, I encountered an error: {str(e)}",
                "timestamp": datetime.now().isoformat(),
                "error": "api_error",
            }
