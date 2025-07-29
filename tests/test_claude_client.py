#!/usr/bin/env python3
"""
Unit tests for ClaudeClient.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import asyncio
from datetime import datetime

from src.volatility_filter.claude_client import ClaudeClient


@pytest.fixture
def mock_anthropic():
    """Mock Anthropic client."""
    with patch("src.volatility_filter.claude_client.Anthropic") as mock_anthropic:
        with patch(
            "src.volatility_filter.claude_client.AsyncAnthropic"
        ) as mock_async_anthropic:
            # Setup mock responses
            mock_response = Mock()
            mock_response.content = [Mock(text="Test response from Claude")]

            # Setup sync client
            mock_client = Mock()
            mock_client.messages.create.return_value = mock_response
            mock_anthropic.return_value = mock_client

            # Setup async client
            mock_async_client = Mock()
            mock_async_client.messages.create = Mock(return_value=asyncio.Future())
            mock_async_client.messages.create.return_value.set_result(mock_response)
            mock_async_anthropic.return_value = mock_async_client

            yield mock_anthropic, mock_async_anthropic, mock_client, mock_async_client


@pytest.fixture
def mock_sql_agent():
    """Mock SQL agent."""
    with patch("src.volatility_filter.claude_client.SQLAgent") as mock_sql:
        mock_agent = Mock()
        mock_agent.get_schema_context.return_value = "Test schema context"
        mock_agent.execute_query.return_value = {
            "success": True,
            "data": [{"test": "data"}],
            "columns": ["test"],
            "row_count": 1,
        }
        mock_agent.format_results_for_llm.return_value = "Formatted results"
        mock_sql.return_value = mock_agent
        yield mock_sql, mock_agent


@pytest.fixture
def db_context():
    """Sample database context."""
    return {
        "portfolio_summary": {
            "active_positions": 5,
            "total_value": 100000.0,
            "total_pnl": 5000.0,
            "avg_pnl_percent": 5.0,
            "total_delta": 1000.0,
            "total_gamma_exposure": 50.0,
            "total_vega_exposure": 100.0,
            "total_theta_exposure": -20.0,
        },
        "positions": [
            {
                "instrument_name": "BTC-28MAR25-100000-C",
                "instrument_type": "option",
                "quantity": 10,
                "entry_price": 2000.0,
                "current_price": 2100.0,
                "pnl": 1000.0,
                "pnl_percent": 5.0,
                "delta": 0.5,
                "mark_iv": 0.6,
            }
        ],
        "volatility_events": [
            {
                "timestamp": 1700000000000,
                "volatility": 0.02,
                "price": 50000.0,
                "volume": 100.0,
            }
        ],
        "market_stats": {
            "spot_price": 50000.0,
            "atm_vol": 0.6,
            "skew": 0.05,
            "num_options": 100,
        },
    }


class TestClaudeClient:
    """Test ClaudeClient functionality."""

    @pytest.mark.unit
    def test_init_with_api_key(self, mock_anthropic, mock_sql_agent):
        """Test initialization with API key."""
        client = ClaudeClient(api_key="test-key", db_path="test.db")
        assert client.api_key == "test-key"
        mock_anthropic[0].assert_called_once_with(api_key="test-key")
        mock_anthropic[1].assert_called_once_with(api_key="test-key")

    @pytest.mark.unit
    def test_init_with_env_key(self, mock_anthropic, mock_sql_agent, monkeypatch):
        """Test initialization with environment variable."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "env-test-key")
        client = ClaudeClient(db_path="test.db")
        assert client.api_key == "env-test-key"

    @pytest.mark.unit
    def test_init_without_key_raises_error(self, mock_sql_agent, monkeypatch):
        """Test initialization without API key raises error."""
        # Ensure no API key is available from environment
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        
        with pytest.raises(ValueError, match="No API key provided"):
            ClaudeClient(db_path="test.db")

    @pytest.mark.unit
    def test_create_conversation_context(
        self, mock_anthropic, mock_sql_agent, db_context
    ):
        """Test conversation context creation."""
        client = ClaudeClient(api_key="test-key")
        context = client.create_conversation_context(db_context)

        assert "Portfolio Summary:" in context
        assert "Total Positions: 5" in context
        assert "Portfolio Value: $100,000.00" in context
        assert "Total P&L: $5,000.00 (5.00%)" in context
        assert "BTC-28MAR25-100000-C" in context
        assert "Recent Volatility Events:" in context
        assert "Market Statistics:" in context

    @pytest.mark.unit
    def test_extract_sql_query_with_code_block(self, mock_anthropic, mock_sql_agent):
        """Test SQL query extraction from code block."""
        client = ClaudeClient(api_key="test-key")
        text = """Here is the SQL query:
```sql
SELECT * FROM positions WHERE is_active = 1
```
This will get all active positions."""

        query = client.extract_sql_query(text)
        assert query == "SELECT * FROM positions WHERE is_active = 1"

    @pytest.mark.unit
    def test_extract_sql_query_without_code_block(self, mock_anthropic, mock_sql_agent):
        """Test SQL query extraction without code block."""
        client = ClaudeClient(api_key="test-key")
        text = "Run this query: SELECT COUNT(*) FROM positions;"

        query = client.extract_sql_query(text)
        assert query == "SELECT COUNT(*) FROM positions;"

    @pytest.mark.unit
    def test_extract_sql_query_no_query(self, mock_anthropic, mock_sql_agent):
        """Test SQL query extraction when no query present."""
        client = ClaudeClient(api_key="test-key")
        text = "Your portfolio looks good with positive P&L."

        query = client.extract_sql_query(text)
        assert query is None

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_ask_async_without_sql(
        self, mock_anthropic, mock_sql_agent, db_context
    ):
        """Test async ask without SQL query generation."""
        _, _, _, mock_async_client = mock_anthropic
        client = ClaudeClient(api_key="test-key")

        response = await client.ask_async("What is my portfolio value?", db_context)

        assert response == "Test response from Claude"
        mock_async_client.messages.create.assert_called_once()
        call_args = mock_async_client.messages.create.call_args
        assert call_args.kwargs["model"] == "claude-3-5-sonnet-20241022"
        assert len(call_args.kwargs["messages"]) == 2

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_ask_async_with_sql(self, mock_anthropic, mock_sql_agent, db_context):
        """Test async ask with SQL query generation."""
        _, _, _, mock_async_client = mock_anthropic
        _, mock_agent = mock_sql_agent

        # First response contains SQL query
        first_response = Mock()
        first_response.content = [
            Mock(text="Let me query that:\n```sql\nSELECT * FROM positions\n```")
        ]

        # Second response interprets results
        second_response = Mock()
        second_response.content = [
            Mock(text="Based on the results, you have 5 positions.")
        ]

        # Setup mock to return different responses
        first_future = asyncio.Future()
        second_future = asyncio.Future()
        first_future.set_result(first_response)
        second_future.set_result(second_response)
        
        mock_async_client.messages.create.side_effect = [
            first_future,
            second_future,
        ]

        client = ClaudeClient(api_key="test-key")
        response = await client.ask_async("Show me all my positions", db_context)

        assert response == "Based on the results, you have 5 positions."
        assert mock_async_client.messages.create.call_count == 2
        mock_agent.execute_query.assert_called_once_with("SELECT * FROM positions")
        mock_agent.format_results_for_llm.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_ask_async_with_error(
        self, mock_anthropic, mock_sql_agent, db_context
    ):
        """Test async ask with error handling."""
        _, _, _, mock_async_client = mock_anthropic
        mock_async_client.messages.create.side_effect = Exception("API Error")

        client = ClaudeClient(api_key="test-key")
        response = await client.ask_async("Test query", db_context)

        assert "Error: Unable to process request" in response
        assert "API Error" in response

    @pytest.mark.unit
    def test_ask_sync(self, mock_anthropic, mock_sql_agent, db_context):
        """Test synchronous ask method."""
        client = ClaudeClient(api_key="test-key")

        with patch.object(
            client, "ask_async", return_value="Sync response"
        ) as mock_ask_async:
            response = client.ask("Test question", db_context)

        assert response == "Sync response"
        mock_ask_async.assert_called_once_with("Test question", db_context, None)

    @pytest.mark.unit
    def test_get_suggested_questions(self, mock_anthropic, mock_sql_agent, db_context):
        """Test getting suggested questions."""
        client = ClaudeClient(api_key="test-key")
        suggestions = client.get_suggested_questions(db_context)

        assert len(suggestions) > 0
        assert "What is my delta exposure for 100k strike calls?" in suggestions
        assert (
            "Why is my portfolio showing losses?" not in suggestions
        )  # Since P&L is positive

        # Test with negative P&L
        db_context["portfolio_summary"]["total_pnl"] = -5000
        suggestions = client.get_suggested_questions(db_context)
        assert "Why is my portfolio showing losses?" in suggestions

    @pytest.mark.unit
    def test_system_prompt_building(self, mock_anthropic, mock_sql_agent):
        """Test system prompt includes all necessary components."""
        client = ClaudeClient(api_key="test-key")

        assert "financial analysis assistant" in client.system_prompt
        assert "SQL database" in client.system_prompt
        assert "DATABASE SCHEMA" in client.system_prompt
        assert "OPTIONS TRADING GLOSSARY" in client.system_prompt
        assert "EXAMPLE INTERACTIONS" in client.system_prompt
        assert "RESPONSE GUIDELINES" in client.system_prompt

    @pytest.mark.unit
    def test_conversation_history(self, mock_anthropic, mock_sql_agent, db_context):
        """Test handling of conversation history."""
        _, _, _, mock_async_client = mock_anthropic
        client = ClaudeClient(api_key="test-key")

        history = [
            {"role": "user", "content": "Previous question"},
            {"role": "assistant", "content": "Previous answer"},
        ]

        asyncio.run(client.ask_async("New question", db_context, history))

        call_args = mock_async_client.messages.create.call_args
        messages = call_args.kwargs["messages"]

        # Should have context + history + new question
        assert len(messages) == 4
        assert messages[1]["content"] == "Previous question"
        assert messages[2]["content"] == "Previous answer"
        assert "New question" in messages[3]["content"]
