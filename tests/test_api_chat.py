#!/usr/bin/env python3
"""
Unit tests for API chat endpoints.
"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
import sys
from pathlib import Path
from datetime import datetime
import json

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))


@pytest.fixture
def mock_claude_client():
    """Mock ClaudeClient."""
    with patch("volatility-web.api_server.ClaudeClient") as mock_claude:
        mock_instance = Mock()
        mock_instance.ask.return_value = "Test response from Claude"
        mock_claude.return_value = mock_instance
        yield mock_claude, mock_instance


@pytest.fixture
def mock_portfolio_manager():
    """Mock PortfolioManager."""
    with patch("volatility-web.api_server.PortfolioManager") as mock_pm:
        mock_instance = Mock()
        mock_instance.get_portfolio_context_dict.return_value = {
            "portfolio_summary": {
                "active_positions": 5,
                "total_value": 100000.0,
                "total_pnl": 5000.0,
            }
        }
        mock_pm.return_value = mock_instance
        yield mock_pm, mock_instance


@pytest.fixture
def mock_db():
    """Mock database."""
    with patch("volatility-web.api_server.get_db") as mock_get_db:
        mock_conn = AsyncMock()
        mock_cursor = AsyncMock()

        # Mock execute results
        mock_cursor.fetchone.return_value = {
            "position_count": 10,
            "total_pnl": 5000.0,
            "total_delta": 1500.0,
        }

        mock_conn.execute.return_value = mock_cursor
        mock_conn.__aenter__.return_value = mock_conn
        mock_conn.__aexit__.return_value = None

        mock_get_db.return_value = mock_conn
        yield mock_get_db, mock_conn


@pytest.fixture
def test_client(mock_portfolio_manager, mock_db):
    """Create test client with mocked dependencies."""
    from volatility_web.api_server import app

    return TestClient(app)


class TestAPIChatEndpoints:
    """Test API chat endpoints."""

    @pytest.mark.unit
    def test_send_chat_message_success(
        self, test_client, mock_claude_client, monkeypatch
    ):
        """Test successful chat message send."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        response = test_client.post(
            "/api/chat/send", json={"content": "What is my portfolio value?"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["response"] == "Test response from Claude"
        assert "timestamp" in data
        assert "error" not in data

    @pytest.mark.unit
    def test_send_chat_message_no_api_key(self, test_client):
        """Test chat message without API key."""
        response = test_client.post(
            "/api/chat/send", json={"content": "What is my portfolio value?"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "ANTHROPIC_API_KEY" in data["response"]
        assert data["error"] == "no_api_key"

    @pytest.mark.unit
    def test_send_chat_message_api_error(
        self, test_client, mock_claude_client, monkeypatch
    ):
        """Test chat message with API error."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        # Make Claude client raise an exception
        _, mock_instance = mock_claude_client
        mock_instance.ask.side_effect = Exception("API Error")

        response = test_client.post("/api/chat/send", json={"content": "Test message"})

        assert response.status_code == 200
        data = response.json()
        assert "Sorry, I encountered an error" in data["response"]
        assert "API Error" in data["response"]
        assert data["error"] == "api_error"

    @pytest.mark.unit
    def test_send_chat_message_empty_content(
        self, test_client, mock_claude_client, monkeypatch
    ):
        """Test chat message with empty content."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        response = test_client.post("/api/chat/send", json={"content": ""})

        assert response.status_code == 200
        # Claude client should still be called with empty string
        _, mock_instance = mock_claude_client
        mock_instance.ask.assert_called_once()

    @pytest.mark.unit
    def test_send_chat_message_with_portfolio_context(
        self, test_client, mock_claude_client, mock_portfolio_manager, monkeypatch
    ):
        """Test chat message includes portfolio context."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        response = test_client.post(
            "/api/chat/send", json={"content": "Show my positions"}
        )

        assert response.status_code == 200

        # Verify portfolio context was fetched
        _, mock_pm_instance = mock_portfolio_manager
        mock_pm_instance.get_portfolio_context_dict.assert_called_once()

        # Verify Claude was called with context
        _, mock_claude_instance = mock_claude_client
        call_args = mock_claude_instance.ask.call_args
        assert call_args[0][0] == "Show my positions"
        assert call_args[0][1]["portfolio_summary"]["active_positions"] == 5

    @pytest.mark.unit
    async def test_get_chat_suggestions_with_positions(self, test_client, mock_db):
        """Test getting chat suggestions with active positions."""
        response = test_client.get("/api/chat/suggestions")

        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert len(data["suggestions"]) > 0
        assert "What's my current portfolio exposure?" in data["suggestions"]

        # Should include profit-specific suggestion
        assert any("profitable" in s for s in data["suggestions"])

    @pytest.mark.unit
    async def test_get_chat_suggestions_high_delta(self, test_client, mock_db):
        """Test suggestions with high delta exposure."""
        _, mock_conn = mock_db
        mock_cursor = mock_conn.execute.return_value
        mock_cursor.fetchone.return_value = {
            "position_count": 10,
            "total_pnl": -5000.0,  # Negative P&L
            "total_delta": 2000.0,  # High delta
        }

        response = test_client.get("/api/chat/suggestions")

        assert response.status_code == 200
        data = response.json()

        # Should suggest hedging due to high delta
        assert any("hedge" in s and "delta" in s for s in data["suggestions"])
        # Should ask about improving performance due to losses
        assert any("improve" in s and "performance" in s for s in data["suggestions"])

    @pytest.mark.unit
    async def test_get_chat_suggestions_no_positions(self, test_client, mock_db):
        """Test suggestions with no positions."""
        _, mock_conn = mock_db
        mock_cursor = mock_conn.execute.return_value
        mock_cursor.fetchone.return_value = {
            "position_count": 0,
            "total_pnl": 0.0,
            "total_delta": 0.0,
        }

        response = test_client.get("/api/chat/suggestions")

        assert response.status_code == 200
        data = response.json()
        assert len(data["suggestions"]) == 4  # Base suggestions only

    @pytest.mark.unit
    async def test_get_chat_suggestions_database_error(self, test_client, mock_db):
        """Test suggestions with database error."""
        _, mock_conn = mock_db
        mock_conn.execute.side_effect = Exception("Database error")

        response = test_client.get("/api/chat/suggestions")

        assert response.status_code == 200
        data = response.json()
        # Should return default suggestions on error
        assert len(data["suggestions"]) == 4
        assert "What's my current portfolio status?" in data["suggestions"]

    @pytest.mark.unit
    def test_chat_endpoint_validates_json(self, test_client, monkeypatch):
        """Test chat endpoint validates JSON input."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        # Send invalid JSON
        response = test_client.post("/api/chat/send", data="invalid json")

        assert response.status_code == 422  # Unprocessable Entity

    @pytest.mark.unit
    def test_chat_endpoint_handles_missing_content(self, test_client, monkeypatch):
        """Test chat endpoint handles missing content field."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        response = test_client.post(
            "/api/chat/send", json={"message": "Wrong field name"}
        )

        assert response.status_code == 200
        # Should use empty string as default
        data = response.json()
        assert "response" in data

    @pytest.mark.unit
    @pytest.mark.asyncio
    async def test_asyncio_threading_integration(
        self, test_client, mock_claude_client, monkeypatch
    ):
        """Test asyncio to threading integration works correctly."""
        monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

        # Make multiple concurrent requests
        import asyncio
        import httpx

        async def make_request():
            async with httpx.AsyncClient(
                app=test_client.app, base_url="http://test"
            ) as client:
                response = await client.post(
                    "/api/chat/send", json={"content": "Test concurrent request"}
                )
                return response

        # Run multiple requests concurrently
        responses = await asyncio.gather(*[make_request() for _ in range(3)])

        # All should succeed
        for response in responses:
            assert response.status_code == 200
            data = response.json()
            assert data["response"] == "Test response from Claude"
