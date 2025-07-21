#!/usr/bin/env python3
"""
Portfolio Manager for real-time position tracking and analytics.

This module provides portfolio analytics, position management, and risk calculations
for the Bloomberg-style TUI interface.
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import pandas as pd
import numpy as np

from .database import DatabaseManager
from .option_data_fetcher import OptionDataFetcher

logger = logging.getLogger(__name__)


class PortfolioManager:
    """Manages portfolio data and provides analytics for the TUI."""

    def __init__(self, db_path: str = "volatility_filter.db"):
        """Initialize portfolio manager with database connection."""
        self.db = DatabaseManager(db_path)
        self.option_fetcher = OptionDataFetcher()
        self._portfolio_cache = None
        self._positions_cache = None
        self._last_update = None

    def get_portfolio_overview(self) -> Dict[str, Any]:
        """Get comprehensive portfolio overview with formatting for TUI display."""
        try:
            # Get summary from database
            summary = self.db.get_portfolio_summary()

            # Get active positions for additional analytics
            positions_df = self.db.get_active_positions()

            # Calculate additional metrics
            overview = {
                "summary": {
                    "total_positions": summary["active_positions"],
                    "total_value": summary["total_value"],
                    "total_pnl": summary["total_pnl"],
                    "pnl_percent": summary["avg_pnl_percent"],
                    "last_update": datetime.now(),
                },
                "risk_metrics": {
                    "delta": summary["total_delta"],
                    "gamma": summary["total_gamma_exposure"],
                    "vega": summary["total_vega_exposure"],
                    "theta": summary["total_theta_exposure"],
                    "delta_adjusted": summary["total_absolute_delta"],
                },
                "breakdown": summary["breakdown"],
                "concentration": self._calculate_concentration(positions_df),
                "largest_positions": self._get_largest_positions(positions_df, n=5),
                "pnl_breakdown": self._calculate_pnl_breakdown(positions_df),
            }

            self._portfolio_cache = overview
            self._last_update = datetime.now()

            return overview

        except Exception as e:
            logger.error(f"Error getting portfolio overview: {e}")
            return self._get_empty_overview()

    def get_positions_data(
        self, instrument_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get formatted position data for display."""
        try:
            positions_df = self.db.get_active_positions(instrument_type)

            if positions_df.empty:
                return []

            # Convert to list of dicts with formatted values
            positions = []
            for _, row in positions_df.iterrows():
                position = {
                    "id": row["position_id"],
                    "instrument": row["instrument_name"],
                    "type": row["instrument_type"],
                    "quantity": row["quantity"],
                    "entry_price": row["entry_price"],
                    "current_price": row["current_price"],
                    "value": row["position_value"],
                    "pnl": row["pnl"],
                    "pnl_pct": row["pnl_percent"],
                    "delta": row.get("delta", 0),
                    "gamma": row.get("gamma", 0),
                    "vega": row.get("vega", 0),
                    "theta": row.get("theta", 0),
                    "iv": row.get("mark_iv", 0),
                    "position_delta": row.get("position_delta", 0),
                    "entry_time": row["entry_datetime"],
                    "last_update": row.get("current_timestamp", datetime.now()),
                }

                # Parse expiry and strike for options
                if position["type"] == "option":
                    position.update(self._parse_option_details(row["instrument_name"]))

                positions.append(position)

            # Sort by absolute value descending
            positions.sort(key=lambda x: abs(x["value"]), reverse=True)

            self._positions_cache = positions
            return positions

        except Exception as e:
            logger.error(f"Error getting positions data: {e}")
            return []

    def get_risk_matrix(self) -> Dict[str, Any]:
        """Calculate risk matrix by expiry and strike."""
        try:
            positions_df = self.db.get_active_positions("option")

            if positions_df.empty:
                return {"matrix": {}, "totals": {}}

            # Create risk matrix
            matrix = {}

            for _, row in positions_df.iterrows():
                details = self._parse_option_details(row["instrument_name"])
                expiry = details.get("expiry", "Unknown")
                strike = details.get("strike", 0)

                if expiry not in matrix:
                    matrix[expiry] = {}

                if strike not in matrix[expiry]:
                    matrix[expiry][strike] = {
                        "delta": 0,
                        "gamma": 0,
                        "vega": 0,
                        "theta": 0,
                        "value": 0,
                        "count": 0,
                    }

                # Aggregate risk
                matrix[expiry][strike]["delta"] += row.get("position_delta", 0)
                matrix[expiry][strike]["gamma"] += row.get("gamma", 0) * row["quantity"]
                matrix[expiry][strike]["vega"] += row.get("vega", 0) * row["quantity"]
                matrix[expiry][strike]["theta"] += row.get("theta", 0) * row["quantity"]
                matrix[expiry][strike]["value"] += row["position_value"]
                matrix[expiry][strike]["count"] += 1

            # Calculate totals by expiry
            totals = {}
            for expiry, strikes in matrix.items():
                totals[expiry] = {
                    "delta": sum(s["delta"] for s in strikes.values()),
                    "gamma": sum(s["gamma"] for s in strikes.values()),
                    "vega": sum(s["vega"] for s in strikes.values()),
                    "theta": sum(s["theta"] for s in strikes.values()),
                    "value": sum(s["value"] for s in strikes.values()),
                    "count": sum(s["count"] for s in strikes.values()),
                }

            return {"matrix": matrix, "totals": totals}

        except Exception as e:
            logger.error(f"Error calculating risk matrix: {e}")
            return {"matrix": {}, "totals": {}}

    def format_for_tui(self, data_type: str) -> List[List[str]]:
        """Format data for TUI table display."""
        if data_type == "positions":
            return self._format_positions_table()
        elif data_type == "summary":
            return self._format_summary_table()
        elif data_type == "risk":
            return self._format_risk_table()
        else:
            return []

    def _calculate_concentration(self, positions_df: pd.DataFrame) -> Dict[str, float]:
        """Calculate position concentration metrics."""
        if positions_df.empty:
            return {"top_1": 0, "top_3": 0, "top_5": 0}

        # Sort by absolute value
        positions_df["abs_value"] = positions_df["position_value"].abs()
        sorted_df = positions_df.sort_values("abs_value", ascending=False)

        total_value = sorted_df["abs_value"].sum()
        if total_value == 0:
            return {"top_1": 0, "top_3": 0, "top_5": 0}

        return {
            "top_1": (sorted_df.iloc[0]["abs_value"] / total_value * 100)
            if len(sorted_df) >= 1
            else 0,
            "top_3": (sorted_df.iloc[:3]["abs_value"].sum() / total_value * 100)
            if len(sorted_df) >= 3
            else 100,
            "top_5": (sorted_df.iloc[:5]["abs_value"].sum() / total_value * 100)
            if len(sorted_df) >= 5
            else 100,
        }

    def _get_largest_positions(
        self, positions_df: pd.DataFrame, n: int = 5
    ) -> List[Dict[str, Any]]:
        """Get the n largest positions by absolute value."""
        if positions_df.empty:
            return []

        positions_df["abs_value"] = positions_df["position_value"].abs()
        sorted_df = positions_df.sort_values("abs_value", ascending=False).head(n)

        positions = []
        for _, row in sorted_df.iterrows():
            positions.append(
                {
                    "instrument": row["instrument_name"],
                    "value": row["position_value"],
                    "pnl": row["pnl"],
                    "pnl_pct": row["pnl_percent"],
                    "delta": row.get("position_delta", 0),
                }
            )

        return positions

    def _calculate_pnl_breakdown(self, positions_df: pd.DataFrame) -> Dict[str, float]:
        """Calculate P&L breakdown by instrument type."""
        if positions_df.empty:
            return {"option": 0, "future": 0, "spot": 0, "total": 0}

        breakdown = positions_df.groupby("instrument_type")["pnl"].sum().to_dict()
        breakdown["total"] = positions_df["pnl"].sum()

        # Ensure all types are present
        for inst_type in ["option", "future", "spot"]:
            if inst_type not in breakdown:
                breakdown[inst_type] = 0

        return breakdown

    def _parse_option_details(self, instrument_name: str) -> Dict[str, Any]:
        """Parse option details from instrument name."""
        # Format: BTC-28MAR25-140000-C
        try:
            parts = instrument_name.split("-")
            if len(parts) >= 4:
                return {
                    "underlying": parts[0],
                    "expiry": parts[1],
                    "strike": int(parts[2]),
                    "type": parts[3],  # C or P
                }
        except:
            pass

        return {"underlying": "", "expiry": "", "strike": 0, "type": ""}

    def _format_positions_table(self) -> List[List[str]]:
        """Format positions for table display."""
        positions = self._positions_cache or self.get_positions_data()

        headers = [
            "Instrument",
            "Type",
            "Qty",
            "Entry",
            "Current",
            "Value",
            "P&L",
            "P&L%",
            "Delta",
            "IV",
        ]
        rows = [headers]

        for pos in positions:
            # Color coding for P&L
            pnl_str = f"${pos['pnl']:,.0f}"
            pnl_pct_str = f"{pos['pnl_pct']:.1f}%"

            row = [
                pos["instrument"][:20],  # Truncate long names
                pos["type"].upper()[:3],
                f"{pos['quantity']:,.0f}",
                f"${pos['entry_price']:,.0f}",
                f"${pos['current_price']:,.0f}",
                f"${pos['value']:,.0f}",
                pnl_str,
                pnl_pct_str,
                f"{pos['position_delta']:,.0f}",
                f"{pos['iv'] * 100:.1f}%" if pos["iv"] > 0 else "-",
            ]
            rows.append(row)

        return rows

    def _format_summary_table(self) -> List[List[str]]:
        """Format portfolio summary for display."""
        overview = self._portfolio_cache or self.get_portfolio_overview()
        summary = overview["summary"]
        risk = overview["risk_metrics"]

        rows = [
            ["Metric", "Value"],
            ["Total Positions", f"{summary['total_positions']}"],
            ["Portfolio Value", f"${summary['total_value']:,.0f}"],
            ["Total P&L", f"${summary['total_pnl']:,.0f}"],
            ["P&L %", f"{summary['pnl_percent']:.2f}%"],
            ["", ""],  # Spacer
            ["Net Delta", f"${risk['delta']:,.0f}"],
            ["Gamma Risk", f"${risk['gamma']:,.0f}"],
            ["Vega Risk", f"${risk['vega']:,.0f}"],
            ["Theta Risk", f"${risk['theta']:,.0f}"],
        ]

        return rows

    def _format_risk_table(self) -> List[List[str]]:
        """Format risk metrics for display."""
        risk_matrix = self.get_risk_matrix()

        if not risk_matrix["totals"]:
            return [["No option positions"]]

        headers = ["Expiry", "Positions", "Value", "Delta", "Gamma", "Vega", "Theta"]
        rows = [headers]

        # Sort by expiry
        sorted_expiries = sorted(risk_matrix["totals"].keys())

        for expiry in sorted_expiries:
            totals = risk_matrix["totals"][expiry]
            row = [
                expiry,
                f"{totals['count']}",
                f"${totals['value']:,.0f}",
                f"${totals['delta']:,.0f}",
                f"{totals['gamma']:,.0f}",
                f"{totals['vega']:,.0f}",
                f"{totals['theta']:,.0f}",
            ]
            rows.append(row)

        return rows

    def _get_empty_overview(self) -> Dict[str, Any]:
        """Return empty overview structure."""
        return {
            "summary": {
                "total_positions": 0,
                "total_value": 0,
                "total_pnl": 0,
                "pnl_percent": 0,
                "last_update": datetime.now(),
            },
            "risk_metrics": {
                "delta": 0,
                "gamma": 0,
                "vega": 0,
                "theta": 0,
                "delta_adjusted": 0,
            },
            "breakdown": {
                "option": {"count": 0, "value": 0},
                "future": {"count": 0, "value": 0},
                "spot": {"count": 0, "value": 0},
            },
            "concentration": {"top_1": 0, "top_3": 0, "top_5": 0},
            "largest_positions": [],
            "pnl_breakdown": {"option": 0, "future": 0, "spot": 0, "total": 0},
        }

    async def subscribe_to_updates(self, websocket_uri: str, callback):
        """Subscribe to portfolio updates via WebSocket."""
        # This would connect to the WebSocket server and listen for portfolio updates
        # For now, it's a placeholder for future implementation
        pass

    def get_portfolio_context(self) -> str:
        """Get portfolio context for AI chat integration."""
        try:
            # Get portfolio overview
            overview = self.get_portfolio_overview()
            summary = overview["summary"]
            risk = overview["risk_metrics"]
            breakdown = overview["pnl_breakdown"]

            # Get top positions
            positions = self.get_positions_data()
            top_positions = positions[:5] if positions else []

            # Build context string
            context_parts = [
                "Current Portfolio Status:",
                f"- Total Positions: {summary['total_positions']}",
                f"- Portfolio Value: ${summary['total_value']:,.0f}",
                f"- Total P&L: ${summary['total_pnl']:,.0f} ({summary['pnl_percent']:.1f}%)",
                "",
                "Risk Metrics:",
                f"- Net Delta: ${risk['delta']:,.0f}",
                f"- Gamma: ${risk['gamma']:,.0f}",
                f"- Vega: ${risk['vega']:,.0f}",
                f"- Theta: ${risk['theta']:,.0f}",
                "",
                "P&L Breakdown:",
                f"- Options: ${breakdown['option']:,.0f}",
                f"- Futures: ${breakdown['future']:,.0f}",
                f"- Spot: ${breakdown['spot']:,.0f}",
                "",
            ]

            if top_positions:
                context_parts.append("Top 5 Positions:")
                for pos in top_positions:
                    context_parts.append(
                        f"- {pos['instrument']}: ${pos['value']:,.0f} "
                        f"(P&L: ${pos['pnl']:,.0f}, {pos['pnl_pct']:.1f}%)"
                    )

            return "\n".join(context_parts)

        except Exception as e:
            logger.error(f"Error generating portfolio context: {e}")
            return "Portfolio data unavailable."

    def get_portfolio_context_dict(self) -> Dict[str, Any]:
        """Get portfolio context as dictionary for Claude API."""
        try:
            # Get portfolio overview
            overview = self.get_portfolio_overview()
            summary = overview["summary"]
            risk = overview["risk_metrics"]

            # Get positions data
            positions_data = self.get_positions_data()

            # Format positions for Claude
            positions_formatted = []
            for pos in positions_data[:20]:  # Limit to top 20
                positions_formatted.append(
                    {
                        "instrument_name": pos["instrument"],
                        "instrument_type": pos["type"],
                        "quantity": pos["quantity"],
                        "entry_price": pos["entry_price"],
                        "current_price": pos["current_price"],
                        "pnl": pos["pnl"],
                        "pnl_percent": pos["pnl_pct"],
                        "delta": pos.get("delta", 0),
                        "mark_iv": pos.get("iv", 0),
                    }
                )

            # Get recent volatility events from database
            volatility_events = []
            try:
                with self.db.get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT timestamp, price, volatility, amount as volume
                        FROM volatility_events
                        WHERE event_type = 'threshold_exceeded'
                        ORDER BY timestamp DESC
                        LIMIT 10
                    """)
                    for row in cursor.fetchall():
                        volatility_events.append(
                            {
                                "timestamp": row[0],
                                "price": row[1],
                                "volatility": row[2],
                                "volume": row[3],
                            }
                        )
            except Exception as e:
                logger.error(f"Error fetching volatility events: {e}")

            # Build context dictionary
            context = {
                "portfolio_summary": {
                    "active_positions": summary["total_positions"],
                    "total_value": summary["total_value"],
                    "total_pnl": summary["total_pnl"],
                    "avg_pnl_percent": summary["pnl_percent"],
                    "total_delta": risk["delta"],
                    "total_gamma_exposure": risk["gamma"],
                    "total_vega_exposure": risk["vega"],
                    "total_theta_exposure": risk["theta"],
                },
                "positions": positions_formatted,
                "volatility_events": volatility_events,
                "market_stats": {
                    "spot_price": positions_data[0]["current_price"]
                    if positions_data
                    else 0,
                    "atm_vol": 0.5,  # Placeholder
                    "skew": 0,  # Placeholder
                    "num_options": len(
                        [p for p in positions_data if p["type"] == "option"]
                    ),
                },
            }

            return context

        except Exception as e:
            logger.error(f"Error generating portfolio context dict: {e}")
            return {}
