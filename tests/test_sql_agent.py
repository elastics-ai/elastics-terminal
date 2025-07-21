#!/usr/bin/env python3
"""
Unit tests for SQLAgent.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import sqlite3

from src.volatility_filter.sql_agent import SQLAgent, TableSchema


@pytest.fixture
def sql_agent():
    """Create SQLAgent instance."""
    return SQLAgent(db_path=":memory:")


@pytest.fixture
def mock_db_connection():
    """Mock database connection."""
    with patch("src.volatility_filter.sql_agent.sqlite3.connect") as mock_connect:
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn

        # Setup mock cursor
        mock_cursor.fetchmany.return_value = [{"id": 1, "name": "test", "value": 100}]
        mock_cursor.description = [("id",), ("name",), ("value",)]

        yield mock_connect, mock_conn, mock_cursor


class TestSQLAgent:
    """Test SQLAgent functionality."""

    @pytest.mark.unit
    def test_init(self, sql_agent):
        """Test SQLAgent initialization."""
        assert sql_agent.db_path == ":memory:"
        assert hasattr(sql_agent, "SCHEMA")
        assert "positions" in sql_agent.SCHEMA
        assert "option_instruments" in sql_agent.SCHEMA

    @pytest.mark.unit
    def test_validate_query_valid_select(self, sql_agent):
        """Test validation of valid SELECT query."""
        query = "SELECT * FROM positions WHERE is_active = 1"
        is_valid, error = sql_agent.validate_query(query)
        assert is_valid
        assert error is None

    @pytest.mark.unit
    def test_validate_query_invalid_operation(self, sql_agent):
        """Test validation rejects non-SELECT queries."""
        queries = [
            "DROP TABLE positions",
            "DELETE FROM positions",
            "INSERT INTO positions VALUES (1, 2, 3)",
            "UPDATE positions SET quantity = 0",
            "ALTER TABLE positions ADD COLUMN test",
            "CREATE TABLE test (id INT)",
            "TRUNCATE TABLE positions",
        ]

        for query in queries:
            is_valid, error = sql_agent.validate_query(query)
            assert not is_valid
            assert (
                "Only SELECT queries are allowed" in error
                or "forbidden keyword" in error
            )

    @pytest.mark.unit
    def test_validate_query_dangerous_keywords(self, sql_agent):
        """Test validation detects dangerous keywords."""
        query = "SELECT * FROM positions; DROP TABLE positions"
        is_valid, error = sql_agent.validate_query(query)
        assert not is_valid
        assert "forbidden keyword: DROP" in error

    @pytest.mark.unit
    def test_validate_query_unmatched_parentheses(self, sql_agent):
        """Test validation detects unmatched parentheses."""
        query = "SELECT COUNT(*)) FROM positions"
        is_valid, error = sql_agent.validate_query(query)
        assert not is_valid
        assert "Unmatched parentheses" in error

    @pytest.mark.unit
    def test_validate_query_unknown_table(self, sql_agent):
        """Test validation detects unknown tables."""
        query = "SELECT * FROM fake_table"
        is_valid, error = sql_agent.validate_query(query)
        assert not is_valid
        assert "Unknown table: FAKE_TABLE" in error

    @pytest.mark.unit
    def test_execute_query_success(self, sql_agent, mock_db_connection):
        """Test successful query execution."""
        _, mock_conn, mock_cursor = mock_db_connection

        query = "SELECT * FROM positions"
        result = sql_agent.execute_query(query)

        assert result["success"]
        assert len(result["data"]) == 1
        assert result["data"][0] == {"id": 1, "name": "test", "value": 100}
        assert result["columns"] == ["id", "name", "value"]
        assert result["row_count"] == 1
        assert not result.get("truncated", False)

    @pytest.mark.unit
    def test_execute_query_with_params(self, sql_agent, mock_db_connection):
        """Test query execution with parameters."""
        _, mock_conn, mock_cursor = mock_db_connection

        query = "SELECT * FROM positions WHERE id = ?"
        params = [1]
        result = sql_agent.execute_query(query, params)

        assert result["success"]
        mock_cursor.execute.assert_called_once_with(query, params)

    @pytest.mark.unit
    def test_execute_query_validation_failure(self, sql_agent):
        """Test query execution with validation failure."""
        query = "DROP TABLE positions"
        result = sql_agent.execute_query(query)

        assert not result["success"]
        assert "Only SELECT queries are allowed" in result["error"]
        assert result["data"] == []
        assert result["columns"] == []

    @pytest.mark.unit
    def test_execute_query_database_error(self, sql_agent, mock_db_connection):
        """Test query execution with database error."""
        mock_connect, _, _ = mock_db_connection
        mock_connect.side_effect = sqlite3.Error("Database error")

        query = "SELECT * FROM positions"
        result = sql_agent.execute_query(query)

        assert not result["success"]
        assert "Database error" in result["error"]

    @pytest.mark.unit
    def test_execute_query_truncation(self, sql_agent, mock_db_connection):
        """Test query result truncation."""
        _, mock_conn, mock_cursor = mock_db_connection

        # Create large result set
        large_result = [{"id": i} for i in range(sql_agent.MAX_ROWS)]
        mock_cursor.fetchmany.return_value = large_result
        mock_cursor.description = [("id",)]

        query = "SELECT * FROM positions"
        result = sql_agent.execute_query(query)

        assert result["success"]
        assert len(result["data"]) == sql_agent.MAX_ROWS
        assert result.get("truncated", False)

    @pytest.mark.unit
    def test_get_schema_context(self, sql_agent):
        """Test schema context generation."""
        context = sql_agent.get_schema_context()

        assert "Table: positions" in context
        assert "Description: Current portfolio positions" in context
        assert "instrument_name: Full instrument name" in context
        assert "Example queries:" in context
        assert "SELECT * FROM positions WHERE is_active = 1" in context

    @pytest.mark.unit
    def test_format_results_for_llm_small_results(self, sql_agent):
        """Test formatting small result sets for LLM."""
        results = {
            "success": True,
            "data": [
                {"instrument": "BTC-CALL", "price": 1000.50, "iv": 0.6543},
                {"instrument": "ETH-PUT", "price": 500.25, "iv": 0.7890},
            ],
            "columns": ["instrument", "price", "iv"],
        }

        formatted = sql_agent.format_results_for_llm(results)

        assert "instrument | price | iv" in formatted
        assert "BTC-CALL | 1,000.50 | 0.6543" in formatted
        assert "ETH-PUT | 500.25 | 0.7890" in formatted

    @pytest.mark.unit
    def test_format_results_for_llm_large_results(self, sql_agent):
        """Test formatting large result sets for LLM."""
        results = {
            "success": True,
            "data": [{"id": i, "value": i * 100} for i in range(20)],
            "columns": ["id", "value"],
        }

        formatted = sql_agent.format_results_for_llm(results)

        assert "Query returned 20 rows" in formatted
        assert "First 5 rows:" in formatted
        assert "Row 1:" in formatted
        assert "id=0, value=0" in formatted

    @pytest.mark.unit
    def test_format_results_for_llm_error(self, sql_agent):
        """Test formatting error results for LLM."""
        results = {"success": False, "error": "Invalid query syntax"}

        formatted = sql_agent.format_results_for_llm(results)
        assert formatted == "Query error: Invalid query syntax"

    @pytest.mark.unit
    def test_format_results_for_llm_empty(self, sql_agent):
        """Test formatting empty results for LLM."""
        results = {"success": True, "data": [], "columns": []}

        formatted = sql_agent.format_results_for_llm(results)
        assert formatted == "Query returned no results."

    @pytest.mark.unit
    def test_format_results_for_llm_truncated(self, sql_agent):
        """Test formatting truncated results for LLM."""
        results = {
            "success": True,
            "data": [{"id": i} for i in range(5)],
            "columns": ["id"],
            "truncated": True,
        }

        formatted = sql_agent.format_results_for_llm(results)
        assert f"(Results truncated at {sql_agent.MAX_ROWS} rows)" in formatted

    @pytest.mark.unit
    def test_suggest_query_improvements(self, sql_agent):
        """Test query improvement suggestions."""
        # Test timestamp without ORDER BY
        query = "SELECT * FROM option_trades WHERE timestamp > 1000"
        suggestions = sql_agent.suggest_query_improvements(query)
        assert any("ORDER BY timestamp DESC" in s for s in suggestions)

        # Test without LIMIT
        query = "SELECT * FROM positions"
        suggestions = sql_agent.suggest_query_improvements(query)
        assert any("LIMIT" in s for s in suggestions)

        # Test manual delta calculation
        query = "SELECT quantity * delta FROM positions"
        suggestions = sql_agent.suggest_query_improvements(query)
        assert any("position_delta" in s for s in suggestions)

        # Test positions query needing option details
        query = "SELECT * FROM positions WHERE strike = 100000"
        suggestions = sql_agent.suggest_query_improvements(query)
        assert any("option_instruments" in s for s in suggestions)

    @pytest.mark.unit
    def test_table_schema_dataclass(self):
        """Test TableSchema dataclass."""
        schema = TableSchema(
            name="test_table",
            description="Test description",
            columns={"id": "Primary key"},
            example_queries=["SELECT * FROM test_table"],
        )

        assert schema.name == "test_table"
        assert schema.description == "Test description"
        assert schema.columns["id"] == "Primary key"
        assert len(schema.example_queries) == 1

    @pytest.mark.unit
    def test_case_insensitive_validation(self, sql_agent):
        """Test case-insensitive query validation."""
        queries = [
            "select * from positions",
            "SELECT * FROM POSITIONS",
            "SeLeCt * FrOm PoSiTiOnS",
        ]

        for query in queries:
            is_valid, error = sql_agent.validate_query(query)
            assert is_valid, f"Query '{query}' should be valid"
