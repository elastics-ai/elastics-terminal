#!/usr/bin/env python3
"""
Database context provider for Claude chat integration.

This module provides methods to extract relevant context from the database
for Claude to analyze and answer questions about portfolio and market data.
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from .database import DatabaseManager
from .portfolio_manager import PortfolioManager
from .polymarket_client import PolymarketClient
from .sql_agent import SQLAgent

logger = logging.getLogger(__name__)


class DatabaseContextProvider:
    """Provides database context for Claude chat."""

    def __init__(self, db_path: str = "volatility_filter.db"):
        """Initialize with database connection."""
        self.db = DatabaseManager(db_path)
        self.portfolio_manager = PortfolioManager(db_path)
        self.polymarket_client = PolymarketClient()
        self.sql_agent = SQLAgent(db_path)

    def get_full_context(self, hours_back: int = 24) -> Dict[str, Any]:
        """Get comprehensive context from database."""
        context = {}

        try:
            # Portfolio summary
            context["portfolio_summary"] = self.db.get_portfolio_summary()

            # Active positions
            positions_df = self.db.get_active_positions()
            if not positions_df.empty:
                # Convert to list of dicts and sort by absolute value
                positions = positions_df.to_dict("records")
                positions.sort(
                    key=lambda x: abs(x.get("position_value", 0)), reverse=True
                )
                context["positions"] = positions
            else:
                context["positions"] = []

            # Recent volatility events
            start_time = int(
                (datetime.now() - timedelta(hours=hours_back)).timestamp() * 1000
            )
            events = self.db.get_threshold_breaches(start_time=start_time, limit=20)
            context["volatility_events"] = events

            # Performance summary
            context["performance"] = self.db.get_performance_summary(hours=hours_back)

            # Risk matrix
            context["risk_matrix"] = self.portfolio_manager.get_risk_matrix()

            # Market stats (if available from recent events)
            context["market_stats"] = self._extract_market_stats(events)

            # Option volatility events
            option_events = self.db.get_option_volatility_events(
                start_time=start_time, limit=10
            )
            context["option_events"] = option_events

            # Concentration metrics
            if not positions_df.empty:
                context["concentration"] = (
                    self.portfolio_manager._calculate_concentration(positions_df)
                )

            # Get relevant polymarket data
            try:
                import asyncio

                polymarket_data = asyncio.run(self._get_relevant_polymarket_data())
                if polymarket_data:
                    context["polymarket_data"] = polymarket_data
            except Exception as e:
                logger.warning(f"Could not fetch polymarket data: {e}")

        except Exception as e:
            logger.error(f"Error getting database context: {e}")

        return context

    def get_position_context(
        self, instrument_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get context focused on positions."""
        context = {}

        try:
            if instrument_name:
                # Get specific position
                positions_df = self.db.get_active_positions()
                if not positions_df.empty:
                    position = positions_df[
                        positions_df["instrument_name"] == instrument_name
                    ]
                    if not position.empty:
                        context["position"] = position.iloc[0].to_dict()

                        # Get recent trades for this instrument
                        # Note: This would require a method to get trades by instrument
                        context["recent_trades"] = []
            else:
                # Get all positions with analytics
                context["portfolio_summary"] = self.db.get_portfolio_summary()
                context["positions"] = self.portfolio_manager.get_positions_data()
                context["risk_matrix"] = self.portfolio_manager.get_risk_matrix()

        except Exception as e:
            logger.error(f"Error getting position context: {e}")

        return context

    def get_volatility_context(self, hours_back: int = 6) -> Dict[str, Any]:
        """Get context focused on volatility events and analysis."""
        context = {}

        try:
            start_time = int(
                (datetime.now() - timedelta(hours=hours_back)).timestamp() * 1000
            )

            # Recent volatility events
            events = self.db.get_threshold_breaches(start_time=start_time)
            context["volatility_events"] = events

            # Calculate volatility statistics
            if events:
                vols = [e["volatility"] for e in events]
                context["volatility_stats"] = {
                    "mean": sum(vols) / len(vols),
                    "max": max(vols),
                    "min": min(vols),
                    "current": vols[-1] if vols else 0,
                    "breach_count": len(events),
                }

            # Option volatility events
            option_events = self.db.get_option_volatility_events(start_time=start_time)
            context["option_volatility_events"] = option_events

            # Extract IV statistics from option events
            if option_events:
                context["iv_stats"] = self._calculate_iv_stats(option_events)

        except Exception as e:
            logger.error(f"Error getting volatility context: {e}")

        return context

    def get_greeks_context(self) -> Dict[str, Any]:
        """Get context focused on Greeks and risk metrics."""
        context = {}

        try:
            # Portfolio-level Greeks
            summary = self.db.get_portfolio_summary()
            context["portfolio_greeks"] = {
                "delta": summary.get("total_delta", 0),
                "gamma": summary.get("total_gamma_exposure", 0),
                "vega": summary.get("total_vega_exposure", 0),
                "theta": summary.get("total_theta_exposure", 0),
                "absolute_delta": summary.get("total_absolute_delta", 0),
            }

            # Risk matrix by expiry
            context["risk_by_expiry"] = self.portfolio_manager.get_risk_matrix()

            # Position-level Greeks for top positions
            positions = self.portfolio_manager.get_positions_data()
            if positions:
                context["position_greeks"] = [
                    {
                        "instrument": p["instrument"],
                        "delta": p.get("delta", 0),
                        "gamma": p.get("gamma", 0),
                        "vega": p.get("vega", 0),
                        "theta": p.get("theta", 0),
                        "position_delta": p.get("position_delta", 0),
                    }
                    for p in positions[:10]  # Top 10 positions
                ]

        except Exception as e:
            logger.error(f"Error getting Greeks context: {e}")

        return context

    def _extract_market_stats(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract market statistics from recent events."""
        if not events:
            return {}

        # Get latest price
        latest_price = events[-1].get("price", 0) if events else 0

        # Calculate price range
        prices = [e.get("price", 0) for e in events if e.get("price")]
        price_range = (min(prices), max(prices)) if prices else (0, 0)

        # Get latest volatility
        latest_vol = events[-1].get("volatility", 0) if events else 0

        return {
            "spot_price": latest_price,
            "price_range_24h": price_range,
            "current_volatility": latest_vol,
            "last_update": datetime.now(),
        }

    def _calculate_iv_stats(
        self, option_events: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Calculate implied volatility statistics from option events."""
        if not option_events:
            return {}

        # Group by event type
        iv_anomalies = [e for e in option_events if e.get("event_type") == "iv_anomaly"]
        iv_changes = [e for e in option_events if e.get("event_type") == "iv_change"]

        # Calculate stats
        all_ivs = [e.get("implied_volatility", 0) for e in option_events]

        stats = {
            "mean_iv": sum(all_ivs) / len(all_ivs) if all_ivs else 0,
            "max_iv": max(all_ivs) if all_ivs else 0,
            "min_iv": min(all_ivs) if all_ivs else 0,
            "anomaly_count": len(iv_anomalies),
            "change_count": len(iv_changes),
        }

        # Add anomaly details if any
        if iv_anomalies:
            stats["largest_anomaly"] = max(
                iv_anomalies,
                key=lambda x: abs(x.get("additional_data", {}).get("z_score", 0)),
            )

        return stats

    async def _get_relevant_polymarket_data(self) -> List[Dict[str, Any]]:
        """Get relevant prediction markets based on portfolio context."""
        try:
            # Search for crypto-related markets
            btc_markets = await self.polymarket_client.search_markets("BTC")
            crypto_markets = await self.polymarket_client.search_markets("crypto")

            # Combine and deduplicate
            all_markets = btc_markets + crypto_markets
            seen_ids = set()
            unique_markets = []

            for market in all_markets:
                if market["id"] not in seen_ids:
                    seen_ids.add(market["id"])
                    unique_markets.append(market)

            # Sort by volume
            unique_markets.sort(key=lambda x: x.get("volume", 0), reverse=True)

            # Return top 10
            return unique_markets[:10]

        except Exception as e:
            logger.error(f"Error fetching polymarket data: {e}")
            return []

    def format_for_chat(self, context: Dict[str, Any]) -> str:
        """Format context for chat display."""
        lines = []

        if "portfolio_summary" in context:
            s = context["portfolio_summary"]
            lines.append("=== PORTFOLIO SUMMARY ===")
            lines.append(f"Positions: {s.get('active_positions', 0)}")
            lines.append(f"Value: ${s.get('total_value', 0):,.2f}")
            lines.append(f"P&L: ${s.get('total_pnl', 0):,.2f}")
            lines.append("")

        if "risk_matrix" in context and context["risk_matrix"].get("totals"):
            lines.append("=== RISK BY EXPIRY ===")
            for expiry, totals in context["risk_matrix"]["totals"].items():
                lines.append(
                    f"{expiry}: Δ${totals['delta']:,.0f}, θ${totals['theta']:,.0f}"
                )
            lines.append("")

        return "\n".join(lines)

    def execute_query(
        self, query: str, params: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        """Execute a SQL query safely and return results."""
        return self.sql_agent.execute_query(query, params)

    def get_schema_info(self) -> str:
        """Get database schema information."""
        return self.sql_agent.get_schema_context()

    def suggest_queries_for_topic(self, topic: str) -> List[str]:
        """Suggest relevant SQL queries for a given topic."""
        topic_lower = topic.lower()
        suggestions = []

        if "delta" in topic_lower or "exposure" in topic_lower:
            suggestions.extend(
                [
                    "SELECT SUM(position_delta) as total_delta FROM positions WHERE is_active = 1",
                    "SELECT instrument_name, position_delta FROM positions WHERE is_active = 1 ORDER BY ABS(position_delta) DESC LIMIT 10",
                    "SELECT o.strike, SUM(p.position_delta) as strike_delta FROM positions p JOIN option_instruments o ON p.instrument_name = o.instrument_name WHERE p.is_active = 1 GROUP BY o.strike",
                ]
            )

        if "gamma" in topic_lower:
            suggestions.extend(
                [
                    "SELECT SUM(gamma * quantity) as total_gamma FROM positions WHERE is_active = 1 AND instrument_type = 'option'",
                    "SELECT instrument_name, gamma, quantity, gamma * quantity as position_gamma FROM positions WHERE is_active = 1 AND gamma > 0.0001 ORDER BY gamma * quantity DESC",
                ]
            )

        if "pnl" in topic_lower or "profit" in topic_lower or "loss" in topic_lower:
            suggestions.extend(
                [
                    "SELECT SUM(pnl) as total_pnl, AVG(pnl_percent) as avg_pnl_pct FROM positions WHERE is_active = 1",
                    "SELECT instrument_name, pnl, pnl_percent FROM positions WHERE is_active = 1 ORDER BY pnl ASC LIMIT 10",
                    "SELECT instrument_type, SUM(pnl) as type_pnl FROM positions WHERE is_active = 1 GROUP BY instrument_type",
                ]
            )

        if "vol" in topic_lower or "iv" in topic_lower:
            suggestions.extend(
                [
                    "SELECT AVG(mark_iv) as avg_iv FROM positions WHERE is_active = 1 AND instrument_type = 'option' AND mark_iv > 0",
                    "SELECT instrument_name, mark_iv FROM positions WHERE is_active = 1 AND instrument_type = 'option' ORDER BY mark_iv DESC LIMIT 10",
                    "SELECT o.strike, AVG(p.mark_iv) as avg_iv FROM positions p JOIN option_instruments o ON p.instrument_name = o.instrument_name WHERE p.is_active = 1 GROUP BY o.strike",
                ]
            )

        return suggestions
