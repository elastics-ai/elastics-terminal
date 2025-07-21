#!/usr/bin/env python3
"""
SQL Query Agent for options trading database.

This module provides a safe SQL query executor with schema awareness,
validation, and domain-specific understanding for the chat interface.
"""

import logging
import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class TableSchema:
    """Schema definition for a database table."""

    name: str
    description: str
    columns: Dict[str, str]  # column_name -> description
    example_queries: List[str]


class SQLAgent:
    """SQL query agent with domain-specific knowledge for options trading."""

    # Define database schema with descriptions
    SCHEMA = {
        "positions": TableSchema(
            name="positions",
            description="Current portfolio positions including options, futures, and spot",
            columns={
                "position_id": "Unique identifier for the position",
                "instrument_name": "Full instrument name (e.g., BTC-28MAR25-140000-C)",
                "instrument_type": "Type: option, future, or spot",
                "quantity": "Number of contracts (negative for short positions)",
                "entry_price": "Average entry price",
                "entry_timestamp": "Entry time in milliseconds",
                "current_price": "Current mark price",
                "underlying_price": "Current price of underlying asset",
                "mark_iv": "Current implied volatility (as decimal, e.g., 0.5 = 50%)",
                "delta": "Option delta (rate of change vs underlying)",
                "gamma": "Option gamma (rate of delta change)",
                "vega": "Option vega (sensitivity to volatility)",
                "theta": "Option theta (time decay)",
                "position_delta": "Total delta exposure (quantity * delta * contract_size)",
                "position_value": "Current position value (quantity * current_price * contract_size)",
                "pnl": "Profit/Loss in USD",
                "pnl_percent": "Profit/Loss as percentage",
                "is_active": "Whether position is currently active (1) or closed (0)",
            },
            example_queries=[
                "SELECT * FROM positions WHERE is_active = 1 AND instrument_type = 'option'",
                "SELECT SUM(position_delta) as total_delta FROM positions WHERE is_active = 1",
                "SELECT * FROM positions WHERE instrument_name LIKE '%-100000-%' AND is_active = 1",
            ],
        ),
        "option_instruments": TableSchema(
            name="option_instruments",
            description="Option contract specifications",
            columns={
                "instrument_name": "Full option name (e.g., BTC-28MAR25-140000-C)",
                "underlying": "Underlying asset (e.g., BTC)",
                "expiry_timestamp": "Expiration time in milliseconds",
                "strike": "Strike price",
                "option_type": "Type: European Call or European Put",
                "contract_size": "Contract size (e.g., 1.0 for BTC)",
                "is_active": "Whether option is still tradeable",
            },
            example_queries=[
                "SELECT * FROM option_instruments WHERE strike = 100000 AND option_type = 'European Call'",
                "SELECT DISTINCT strike FROM option_instruments WHERE expiry_timestamp > ? ORDER BY strike",
            ],
        ),
        "option_greeks": TableSchema(
            name="option_greeks",
            description="Latest Greeks and pricing data for options",
            columns={
                "timestamp": "Data timestamp in milliseconds",
                "instrument_name": "Option instrument name",
                "mark_price": "Current mark price",
                "mark_iv": "Mark implied volatility",
                "underlying_price": "Underlying asset price",
                "delta": "Option delta",
                "gamma": "Option gamma",
                "vega": "Option vega (per 1% IV change)",
                "theta": "Option theta (daily decay)",
                "bid_price": "Best bid price",
                "ask_price": "Best ask price",
                "open_interest": "Open interest",
                "volume_24h": "24-hour trading volume",
            },
            example_queries=[
                "SELECT * FROM option_greeks WHERE instrument_name = ? ORDER BY timestamp DESC LIMIT 1",
                "SELECT AVG(mark_iv) FROM option_greeks WHERE timestamp > ?",
            ],
        ),
        "option_trades": TableSchema(
            name="option_trades",
            description="Historical option trades",
            columns={
                "timestamp": "Trade timestamp in milliseconds",
                "trade_id": "Unique trade identifier",
                "instrument_name": "Option instrument name",
                "price": "Trade price",
                "amount": "Trade size",
                "direction": "Trade direction: buy or sell",
                "implied_volatility": "IV at time of trade",
                "underlying_price": "Underlying price at time of trade",
            },
            example_queries=[
                "SELECT * FROM option_trades WHERE instrument_name = ? ORDER BY timestamp DESC LIMIT 10",
                "SELECT AVG(implied_volatility) FROM option_trades WHERE timestamp > ?",
            ],
        ),
        "option_volatility_events": TableSchema(
            name="option_volatility_events",
            description="Significant volatility events and anomalies",
            columns={
                "timestamp": "Event timestamp",
                "instrument_name": "Option instrument name",
                "event_type": "Type of event (iv_anomaly, iv_change, etc.)",
                "implied_volatility": "IV at time of event",
                "iv_change": "Change in IV",
                "iv_percentile": "IV percentile rank",
                "strike": "Option strike price",
                "days_to_expiry": "Days until expiration",
            },
            example_queries=[
                "SELECT * FROM option_volatility_events WHERE event_type = 'iv_anomaly' ORDER BY timestamp DESC",
                "SELECT COUNT(*) FROM option_volatility_events WHERE timestamp > ?",
            ],
        ),
        "realtime_trades": TableSchema(
            name="realtime_trades",
            description="Real-time spot/perpetual trades",
            columns={
                "timestamp": "Trade timestamp",
                "price": "Trade price",
                "amount": "Trade size",
                "direction": "Buy or sell",
                "ar_volatility": "Realized volatility estimate",
            },
            example_queries=[
                "SELECT AVG(price) FROM realtime_trades WHERE timestamp > ?",
                "SELECT MAX(ar_volatility) FROM realtime_trades WHERE timestamp > ?",
            ],
        ),
    }

    # Allowed SQL operations (read-only)
    ALLOWED_OPERATIONS = ["SELECT"]

    # Maximum query execution time (seconds)
    MAX_QUERY_TIME = 5

    # Maximum result rows
    MAX_ROWS = 1000

    def __init__(self, db_path: str = "volatility_filter.db"):
        """Initialize SQL agent with database connection."""
        self.db_path = db_path

    def validate_query(self, query: str) -> Tuple[bool, Optional[str]]:
        """
        Validate SQL query for safety and correctness.

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Convert to uppercase for checking
        query_upper = query.upper().strip()

        # Check if it's a SELECT query
        if not any(query_upper.startswith(op) for op in self.ALLOWED_OPERATIONS):
            return False, "Only SELECT queries are allowed"

        # Check for dangerous keywords
        dangerous_keywords = [
            "DROP",
            "DELETE",
            "INSERT",
            "UPDATE",
            "ALTER",
            "CREATE",
            "TRUNCATE",
        ]
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                return False, f"Query contains forbidden keyword: {keyword}"

        # Basic syntax check
        if query_upper.count("(") != query_upper.count(")"):
            return False, "Unmatched parentheses in query"

        # Check table names are valid
        tables_in_query = re.findall(r"FROM\s+(\w+)", query_upper)
        tables_in_query.extend(re.findall(r"JOIN\s+(\w+)", query_upper))

        for table in tables_in_query:
            if table.lower() not in self.SCHEMA:
                return False, f"Unknown table: {table}"

        return True, None

    def execute_query(
        self, query: str, params: Optional[List[Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a validated SQL query and return results.

        Args:
            query: SQL query to execute
            params: Optional query parameters

        Returns:
            Dict with 'success', 'data', 'columns', and 'error' keys
        """
        import time

        # Validate query first
        is_valid, error = self.validate_query(query)
        if not is_valid:
            return {"success": False, "error": error, "data": [], "columns": []}

        start_time = time.time()

        try:
            # Connect with timeout
            conn = sqlite3.connect(self.db_path, timeout=self.MAX_QUERY_TIME)
            conn.row_factory = sqlite3.Row

            # Execute query
            cursor = conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)

            # Fetch results (limited)
            results = cursor.fetchmany(self.MAX_ROWS)

            # Get column names
            columns = (
                [description[0] for description in cursor.description]
                if cursor.description
                else []
            )

            # Convert to list of dicts
            data = [dict(row) for row in results]

            # Check if we hit the limit
            if len(results) == self.MAX_ROWS:
                logger.warning(f"Query result truncated at {self.MAX_ROWS} rows")

            conn.close()

            # Calculate execution time
            execution_time_ms = int((time.time() - start_time) * 1000)

            return {
                "success": True,
                "data": data,
                "columns": columns,
                "row_count": len(data),
                "truncated": len(results) == self.MAX_ROWS,
                "execution_time_ms": execution_time_ms,
            }

        except Exception as e:
            logger.error(f"Error executing query: {e}")
            return {"success": False, "error": str(e), "data": [], "columns": []}

    def get_schema_context(self) -> str:
        """Get schema information formatted for LLM context."""
        schema_parts = []

        for table_name, table_schema in self.SCHEMA.items():
            schema_parts.append(f"\nTable: {table_name}")
            schema_parts.append(f"Description: {table_schema.description}")
            schema_parts.append("Columns:")

            for col_name, col_desc in table_schema.columns.items():
                schema_parts.append(f"  - {col_name}: {col_desc}")

            if table_schema.example_queries:
                schema_parts.append("Example queries:")
                for example in table_schema.example_queries[:2]:
                    schema_parts.append(f"  - {example}")

        return "\n".join(schema_parts)

    def format_results_for_llm(self, results: Dict[str, Any]) -> str:
        """Format query results for LLM consumption."""
        if not results["success"]:
            return f"Query error: {results['error']}"

        if not results["data"]:
            return "Query returned no results."

        # Format as a simple table for small results
        if len(results["data"]) <= 10:
            lines = []

            # Header
            columns = results["columns"]
            lines.append(" | ".join(columns))
            lines.append("-" * (len(" | ".join(columns))))

            # Data rows
            for row in results["data"]:
                values = []
                for col in columns:
                    val = row[col]
                    # Format numbers nicely
                    if isinstance(val, float):
                        if "price" in col or "value" in col or "pnl" in col:
                            values.append(f"{val:,.2f}")
                        elif "iv" in col or "volatility" in col:
                            values.append(f"{val:.4f}")
                        else:
                            values.append(f"{val:.4f}")
                    else:
                        values.append(str(val))
                lines.append(" | ".join(values))

            result_text = "\n".join(lines)

            if results.get("truncated"):
                result_text += f"\n\n(Results truncated at {self.MAX_ROWS} rows)"

            return result_text

        # For larger results, summarize
        else:
            summary = f"Query returned {len(results['data'])} rows.\n"
            summary += f"Columns: {', '.join(results['columns'])}\n\n"

            # Show first 5 rows
            summary += "First 5 rows:\n"
            for i, row in enumerate(results["data"][:5]):
                summary += f"Row {i + 1}: "
                summary += ", ".join(f"{k}={v}" for k, v in row.items())
                summary += "\n"

            if results.get("truncated"):
                summary += f"\n(Results truncated at {self.MAX_ROWS} rows)"

            return summary

    def suggest_query_improvements(self, query: str) -> List[str]:
        """Suggest improvements or alternatives to a query."""
        suggestions = []
        query_upper = query.upper()

        # Suggest adding ORDER BY for time-series data
        if "timestamp" in query.lower() and "ORDER BY" not in query_upper:
            suggestions.append(
                "Consider adding ORDER BY timestamp DESC to see most recent data first"
            )

        # Suggest limiting results
        if "LIMIT" not in query_upper:
            suggestions.append("Consider adding LIMIT to restrict result size")

        # Suggest using position_delta instead of calculating
        if "quantity * delta" in query.lower():
            suggestions.append(
                "Use position_delta column instead of calculating quantity * delta"
            )

        # Suggest joining with option_instruments for option details
        if "positions" in query.lower() and "option_instruments" not in query.lower():
            if any(
                term in query.lower() for term in ["strike", "expiry", "option_type"]
            ):
                suggestions.append(
                    "Consider joining with option_instruments table to get strike/expiry details"
                )

        return suggestions
