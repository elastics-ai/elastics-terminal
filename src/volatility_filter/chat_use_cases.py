#!/usr/bin/env python3
"""
Chat use case detection and specialized prompts for the volatility filter AI assistant.

This module provides use case detection, specialized system prompts, and contextual
suggestions based on the type of analysis the user is interested in.
"""

from datetime import datetime
from typing import Any, Dict, List


class ChatUseCases:
    """Manages use case detection and specialized prompts for different analysis types."""

    # Keywords for detecting use cases
    USE_CASE_KEYWORDS = {
        "portfolio_performance": [
            "portfolio value",
            "total value",
            "performance",
            "returns",
            "p&l",
            "pnl",
            "profit",
            "loss",
            "cumulative",
            "annual return",
            "monthly return",
            "benchmark",
            "alpha",
            "tracking",
            "attribution",
        ],
        "risk_management": [
            "risk",
            "drawdown",
            "volatility",
            "var",
            "value at risk",
            "greeks",
            "exposure",
            "hedge",
            "hedging",
            "gamma",
            "delta neutral",
            "vega",
            "concentration",
            "correlation",
            "stress test",
            "scenario",
        ],
        "market_analysis": [
            "market",
            "volatility surface",
            "implied volatility",
            "iv",
            "term structure",
            "skew",
            "smile",
            "options chain",
            "market structure",
            "microstructure",
            "order flow",
            "volume",
            "open interest",
        ],
        "portfolio_exposure": [
            "exposure",
            "allocation",
            "position",
            "breakdown",
            "composition",
            "concentration",
            "diversification",
            "rebalance",
            "weight",
            "sector",
            "asset class",
            "distribution",
        ],
        "event_driven": [
            "news",
            "event",
            "announcement",
            "economic data",
            "fed",
            "fomc",
            "earnings",
            "sentiment",
            "catalyst",
        ],
        "polymarket_volatility": [
            "prediction market",
            "polymarket",
            "binary event",
            "probability",
            "implied vol",
            "implied volatility",
            "contract vol",
            "market vol",
            "binary option",
            "contract pricing",
            "vol comparison",
            "high vol markets",
            "low vol markets",
            "volatility analysis",
            "contract risk",
            "market uncertainty",
        ],
        "options_analytics": [
            "option",
            "strike",
            "expiry",
            "expiration",
            "moneyness",
            "atm",
            "itm",
            "otm",
            "butterfly",
            "spread",
            "calendar",
            "diagonal",
            "strangle",
            "straddle",
        ],
        "trading_strategy": [
            "strategy",
            "signal",
            "entry",
            "exit",
            "stop loss",
            "take profit",
            "backtest",
            "optimization",
            "sharpe",
            "sortino",
            "calmar",
            "pair trading",
        ],
    }

    # Specialized prompts for each use case
    USE_CASE_PROMPTS = {
        "portfolio_performance": """You are analyzing portfolio performance metrics with focus on returns and benchmarking.

Key areas of analysis:
- Portfolio value changes over time
- P&L attribution by position, asset class, or strategy
- Performance vs benchmarks (BTC, ETH, S&P 500)
- Return analysis (daily, monthly, annual, risk-adjusted)
- Alpha generation and tracking error
- Performance decomposition

When analyzing performance:
1. Always show both absolute and percentage changes
2. Compare to relevant benchmarks when available
3. Highlight significant contributors/detractors
4. Consider risk-adjusted metrics (Sharpe, Sortino)
5. Identify trends and patterns in returns

Key metrics to emphasize: Portfolio Value, Cumulative PnL, Returns (various periods), Alpha, Beta""",
        "risk_management": """You are a risk analyst specializing in portfolio risk assessment and management.

Key areas of analysis:
- Drawdown analysis (current, maximum, duration, recovery)
- Volatility assessment (realized, implied, regime changes)
- Greeks exposure and sensitivities
- Concentration risk by strike, expiry, or asset
- Hedging opportunities and recommendations
- Scenario analysis and stress testing
- VaR and CVaR calculations

When analyzing risk:
1. Quantify risk in dollar terms and percentages
2. Compare current risk to historical levels
3. Identify concentrated exposures
4. Suggest specific hedging strategies when appropriate
5. Use appropriate risk metrics for the portfolio type

Key metrics to emphasize: Max Drawdown, Volatility, Greeks (especially Gamma/Vega), VaR, Concentration metrics""",
        "market_analysis": """You are a market analyst examining volatility patterns and market microstructure.

Key areas of analysis:
- Implied volatility surface dynamics
- Term structure of volatility
- Volatility skew and smile patterns
- Cross-asset volatility relationships
- Market microstructure (bid-ask, depth, flow)
- Options flow and positioning
- Volatility regime identification

When analyzing markets:
1. Compare current levels to historical ranges
2. Identify unusual patterns or dislocations
3. Explain market dynamics in context
4. Consider both spot and derivatives markets
5. Relate volatility to broader market conditions

Key metrics to emphasize: IV levels, ATM vol, Skew, Term structure, Put/Call ratios""",
        "portfolio_exposure": """You are analyzing portfolio composition and exposure distribution.

Key areas of analysis:
- Asset allocation breakdown
- Exposure by asset class, sector, or strategy
- Concentration analysis (single-name, sector, factor)
- Correlation analysis between positions
- Rebalancing opportunities
- Exposure vs target allocation
- Marginal contribution to risk

When analyzing exposure:
1. Show both absolute and percentage allocations
2. Identify concentration risks
3. Compare to typical or target allocations
4. Consider correlation effects
5. Suggest rebalancing if significantly off-target

Key metrics to emphasize: Exposure percentages, Concentration ratios, Correlation matrix, Risk contribution""",
        "event_driven": """You are analyzing event-driven opportunities and their impact on the portfolio.

Key areas of analysis:
- Economic data releases and market impact
- Central bank decisions (Fed, ECB, etc.)
- Corporate events (earnings, M&A)
- Binary event probabilities
- News sentiment and market reaction
- Prediction market insights
- Event risk in current positions

When analyzing events:
1. Quantify probability and potential impact
2. Relate events to current portfolio positions
3. Identify hedging needs for binary events
4. Compare market pricing to historical reactions
5. Suggest event-driven trade opportunities

Key metrics to emphasize: Event probability, Expected move, Portfolio sensitivity, Prediction market odds""",
        "options_analytics": """You are an options specialist providing detailed derivatives analysis.

Key areas of analysis:
- Individual option pricing and Greeks
- Options strategies and combinations
- Strike/expiry concentration
- Volatility arbitrage opportunities
- Options flow and positioning
- Greeks aggregation and netting
- Roll and expiry management

When analyzing options:
1. Always show key Greeks for positions
2. Identify mispricings or opportunities
3. Suggest appropriate strategies for views
4. Consider pin risk and expiry effects
5. Analyze vol surface for trade ideas

Key metrics to emphasize: Option Greeks, IV vs HV, Moneyness, Time decay, Break-even analysis""",
        "trading_strategy": """You are a quantitative strategist focused on systematic trading approaches.

Key areas of analysis:
- Strategy performance metrics
- Signal generation and validation
- Entry/exit optimization
- Risk-adjusted returns
- Backtesting results
- Parameter sensitivity
- Strategy correlation and diversification

When analyzing strategies:
1. Focus on risk-adjusted performance
2. Consider transaction costs and slippage
3. Analyze drawdown periods
4. Test parameter stability
5. Suggest improvements based on data

Key metrics to emphasize: Sharpe ratio, Win rate, Average win/loss, Maximum drawdown, Calmar ratio""",
    }

    # Context-specific suggestions for each use case
    USE_CASE_SUGGESTIONS = {
        "portfolio_performance": [
            "How has my portfolio performed vs BTC over the last month?",
            "Show me my top 5 performing positions",
            "What's driving my portfolio returns this week?",
            "Calculate my Sharpe ratio for the year",
            "Break down my P&L by asset class",
            "Which positions have generated the most alpha?",
            "Show me my daily returns for the last 30 days",
            "Compare my performance to major indices",
        ],
        "risk_management": [
            "What's my current maximum drawdown?",
            "Show me my gamma exposure by expiry",
            "Am I overexposed to any particular strike?",
            "Calculate my portfolio VaR at 95% confidence",
            "What would happen if BTC drops 20%?",
            "Suggest hedges for my current portfolio",
            "Show me my correlation matrix",
            "Analyze my tail risk exposure",
        ],
        "market_analysis": [
            "How has BTC implied volatility changed today?",
            "Show me the current volatility term structure",
            "What's the put/call skew telling us?",
            "Compare current IV to realized volatility",
            "Identify any volatility arbitrage opportunities",
            "What's the options flow saying about direction?",
            "Show me unusual options activity",
            "Analyze the volatility smile for near-term expiries",
        ],
        "portfolio_exposure": [
            "Break down my exposure by asset class",
            "Show me my concentration risk",
            "What percentage of my portfolio is in options?",
            "Am I overweight any particular sector?",
            "Show me my exposure heatmap",
            "How correlated are my positions?",
            "Suggest rebalancing to reduce concentration",
            "What's my net crypto exposure?",
        ],
        "event_driven": [
            "What economic events are coming this week?",
            "How sensitive is my portfolio to Fed decisions?",
            "How did my portfolio react to the last CPI print?",
            "What's the expected move for upcoming events?",
            "Identify event-driven trading opportunities",
            "Show me news sentiment for my positions",
        ],
        "polymarket_volatility": [
            "What is the implied volatility of this contract?",
            "Which Polymarket contracts have the highest implied volatility?",
            "How does implied vol compare across different market categories?",
            "What are prediction markets saying about crypto volatility?",
            "Show me high-probability binary events with low volatility",
            "Analyze the volatility of Bitcoin prediction markets",
            "Compare contract risk across different time horizons",
            "Which markets show the most uncertainty right now?",
            "How do Polymarket volatilities correlate with options markets?",
            "Find underpriced volatility in prediction markets",
        ],
        "options_analytics": [
            "Show me all my 100k strike positions",
            "What's my theta decay for this week?",
            "Which options are most sensitive to IV changes?",
            "Analyze my put spread positions",
            "Show me my expiry calendar",
            "What's my net vega exposure?",
            "Identify rolls needed before expiry",
            "Calculate break-evens for my options",
        ],
        "trading_strategy": [
            "How is my volatility strategy performing?",
            "Show me win/loss statistics for my trades",
            "What's the optimal position size for this strategy?",
            "Backtest a delta-neutral approach",
            "Analyze my entry and exit timing",
            "Show me strategy correlation analysis",
            "What parameters should I adjust?",
            "Compare strategy performance across assets",
        ],
    }

    @classmethod
    def detect_use_case(cls, question: str, context: Dict[str, Any]) -> str:
        """
        Detect the most likely use case based on the user's question and context.

        Args:
            question: The user's question
            context: Current portfolio context

        Returns:
            The detected use case key
        """
        question_lower = question.lower()

        # Count keyword matches for each use case
        scores = {}
        for use_case, keywords in cls.USE_CASE_KEYWORDS.items():
            score = sum(1 for keyword in keywords if keyword in question_lower)
            if score > 0:
                scores[use_case] = score

        # If we have matches, return the highest scoring use case
        if scores:
            return max(scores.items(), key=lambda x: x[1])[0]

        # Default fallback based on context
        if context.get("positions"):
            # If user has positions, default to portfolio performance
            return "portfolio_performance"
        else:
            # Otherwise, default to market analysis
            return "market_analysis"

    @classmethod
    def get_use_case_prompt(cls, use_case: str) -> str:
        """Get the specialized prompt for a use case."""
        return cls.USE_CASE_PROMPTS.get(use_case, "")

    @classmethod
    def get_contextual_suggestions(
        cls, use_case: str, context: Dict[str, Any]
    ) -> List[str]:
        """
        Get contextual suggestions based on use case and current portfolio state.

        Args:
            use_case: The detected or selected use case
            context: Current portfolio context

        Returns:
            List of suggested questions
        """
        base_suggestions = cls.USE_CASE_SUGGESTIONS.get(use_case, [])
        contextual_suggestions = []

        # Add context-specific suggestions
        portfolio_summary = context.get("portfolio_summary", {})

        if use_case == "portfolio_performance":
            if portfolio_summary.get("total_pnl", 0) < 0:
                contextual_suggestions.append("Why am I showing losses today?")
                contextual_suggestions.append("Which positions are my biggest losers?")
            elif portfolio_summary.get("total_pnl", 0) > 0:
                contextual_suggestions.append("What's driving my gains today?")
                contextual_suggestions.append(
                    "Should I take profits on winning positions?"
                )

        elif use_case == "risk_management":
            if abs(portfolio_summary.get("total_delta", 0)) > 100000:
                contextual_suggestions.append("My delta seems high - should I hedge?")
            if portfolio_summary.get("total_gamma_exposure", 0) > 50000:
                contextual_suggestions.append("How can I reduce my gamma exposure?")

        elif use_case == "market_analysis":
            if context.get("volatility_events"):
                contextual_suggestions.append(
                    "What caused the recent volatility spike?"
                )
                contextual_suggestions.append("Is this volatility regime sustainable?")

        # Combine base and contextual suggestions
        all_suggestions = contextual_suggestions + base_suggestions

        # Return unique suggestions, prioritizing contextual ones
        seen = set()
        unique_suggestions = []
        for suggestion in all_suggestions:
            if suggestion not in seen:
                seen.add(suggestion)
                unique_suggestions.append(suggestion)
                if len(unique_suggestions) >= 8:
                    break

        return unique_suggestions

    @classmethod
    def extract_query_type(cls, question: str) -> str:
        """
        Extract the type of query (position, greeks, pnl, etc.) from the question.

        Args:
            question: The user's question

        Returns:
            The query type
        """
        question_lower = question.lower()

        if any(word in question_lower for word in ["position", "holding", "exposure"]):
            return "position_query"
        elif any(
            word in question_lower
            for word in ["greek", "delta", "gamma", "vega", "theta"]
        ):
            return "greeks_query"
        elif any(
            word in question_lower
            for word in ["pnl", "p&l", "profit", "loss", "return"]
        ):
            return "pnl_query"
        elif any(
            word in question_lower for word in ["volatility", "vol", "iv", "implied"]
        ):
            return "volatility_query"
        elif any(
            word in question_lower for word in ["risk", "var", "drawdown", "exposure"]
        ):
            return "risk_query"
        elif any(word in question_lower for word in ["event", "news", "announcement"]):
            return "event_query"
        else:
            return "general_query"

    @classmethod
    def generate_conversation_title(cls, use_case: str, first_question: str) -> str:
        """
        Generate a conversation title based on use case and first question.

        Args:
            use_case: The detected use case
            first_question: The first question in the conversation

        Returns:
            A concise conversation title
        """
        # Clean up the question
        title = first_question.strip()

        # Remove common words
        remove_words = ["what", "how", "show", "me", "my", "the", "is", "are", "tell"]
        words = title.lower().split()
        filtered_words = [w for w in words if w not in remove_words]

        if filtered_words:
            # Capitalize first letter of each word and join
            title = " ".join(word.capitalize() for word in filtered_words[:5])

        # Add use case prefix if title is too generic
        if len(title) < 10:
            use_case_names = {
                "portfolio_performance": "Performance",
                "risk_management": "Risk",
                "market_analysis": "Market",
                "portfolio_exposure": "Exposure",
                "event_driven": "Events",
                "options_analytics": "Options",
                "trading_strategy": "Strategy",
            }
            prefix = use_case_names.get(use_case, "Analysis")
            title = f"{prefix}: {title}"

        # Truncate if too long
        if len(title) > 50:
            title = title[:47] + "..."

        return title

    @classmethod
    def build_use_case_context(cls, use_case: str, db_context: Dict[str, Any]) -> str:
        """
        Build specialized context based on use case.

        Args:
            use_case: The detected use case
            db_context: Database context dictionary

        Returns:
            Formatted context string
        """
        context_parts = []

        if use_case == "portfolio_performance":
            # Focus on performance metrics
            summary = db_context.get("portfolio_summary", {})
            context_parts.append("=== PERFORMANCE CONTEXT ===")
            context_parts.append(
                f"Portfolio Value: ${summary.get('total_value', 0):,.2f}"
            )
            context_parts.append(
                f"Total P&L: ${summary.get('total_pnl', 0):,.2f} ({summary.get('avg_pnl_percent', 0):.1f}%)"
            )

            # Add top performers/losers
            positions = db_context.get("positions", [])
            if positions:
                sorted_positions = sorted(
                    positions, key=lambda x: x.get("pnl", 0), reverse=True
                )
                context_parts.append("\nTop Performers:")
                for pos in sorted_positions[:3]:
                    context_parts.append(
                        f"- {pos['instrument_name']}: ${pos['pnl']:,.0f} ({pos['pnl_percent']:.1f}%)"
                    )

                context_parts.append("\nWorst Performers:")
                for pos in sorted_positions[-3:]:
                    context_parts.append(
                        f"- {pos['instrument_name']}: ${pos['pnl']:,.0f} ({pos['pnl_percent']:.1f}%)"
                    )

        elif use_case == "risk_management":
            # Focus on risk metrics
            summary = db_context.get("portfolio_summary", {})
            context_parts.append("=== RISK CONTEXT ===")
            context_parts.append(f"Net Delta: ${summary.get('total_delta', 0):,.0f}")
            context_parts.append(
                f"Gamma Exposure: ${summary.get('total_gamma_exposure', 0):,.0f}"
            )
            context_parts.append(
                f"Vega Exposure: ${summary.get('total_vega_exposure', 0):,.0f}"
            )
            context_parts.append(
                f"Theta Exposure: ${summary.get('total_theta_exposure', 0):,.0f}"
            )

            # Add concentration info
            positions = db_context.get("positions", [])
            if positions:
                total_value = sum(abs(p.get("position_value", 0)) for p in positions)
                largest_position = max(
                    positions, key=lambda x: abs(x.get("position_value", 0))
                )
                concentration = (
                    abs(largest_position.get("position_value", 0)) / total_value * 100
                    if total_value > 0
                    else 0
                )
                context_parts.append(
                    f"\nLargest Position: {largest_position['instrument_name']} ({concentration:.1f}% of portfolio)"
                )

        elif use_case == "market_analysis":
            # Focus on market data
            market_stats = db_context.get("market_stats", {})
            context_parts.append("=== MARKET CONTEXT ===")
            context_parts.append(
                f"Spot Price: ${market_stats.get('spot_price', 0):,.2f}"
            )
            context_parts.append(
                f"ATM Volatility: {market_stats.get('atm_vol', 0) * 100:.1f}%"
            )
            context_parts.append(
                f"25-Delta Skew: {market_stats.get('skew', 0) * 100:.1f}%"
            )

            # Add recent volatility events
            vol_events = db_context.get("volatility_events", [])
            if vol_events:
                context_parts.append("\nRecent Volatility Events:")
                for event in vol_events[:3]:
                    event_time = datetime.fromtimestamp(
                        event["timestamp"] / 1000
                    ).strftime("%H:%M:%S")
                    context_parts.append(
                        f"- {event_time}: Vol={event['volatility']:.4f}, Price=${event['price']:,.0f}"
                    )

        return "\n".join(context_parts)
