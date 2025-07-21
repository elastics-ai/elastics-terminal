import os
import pytest
import asyncio
from typing import AsyncGenerator, Generator
import tempfile
import shutil
from unittest.mock import Mock, patch

# Configure test environment
os.environ["TESTING"] = "true"
os.environ["ANTHROPIC_API_KEY"] = "test-key"

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def test_db_path() -> Generator[str, None, None]:
    """Create a temporary database for testing."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp_path = tmp.name
    
    yield tmp_path
    
    # Cleanup
    if os.path.exists(tmp_path):
        os.unlink(tmp_path)

@pytest.fixture
def mock_anthropic():
    """Mock Anthropic API responses."""
    with patch("anthropic.Anthropic") as mock:
        mock_client = Mock()
        mock.return_value = mock_client
        
        # Mock chat completion
        mock_response = Mock()
        mock_response.content = [Mock(text="This is a test response from the AI assistant.")]
        mock_client.messages.create.return_value = mock_response
        
        yield mock_client

@pytest.fixture
def api_base_url():
    """Get API base URL from environment or use default."""
    return os.getenv("API_URL", "http://localhost:8000")

@pytest.fixture
def ws_base_url():
    """Get WebSocket base URL from environment or use default."""
    return os.getenv("WS_URL", "ws://localhost:8765")

@pytest.fixture
def test_portfolio_data():
    """Sample portfolio data for testing."""
    return {
        "positions": [
            {
                "symbol": "BTC-USD",
                "quantity": 0.5,
                "entry_price": 45000,
                "current_price": 48000,
                "pnl": 1500,
                "pnl_percentage": 3.33
            },
            {
                "symbol": "ETH-USD",
                "quantity": 10,
                "entry_price": 3000,
                "current_price": 3200,
                "pnl": 2000,
                "pnl_percentage": 6.67
            }
        ],
        "total_value": 56000,
        "total_pnl": 3500,
        "total_pnl_percentage": 6.25
    }

@pytest.fixture
def test_volatility_data():
    """Sample volatility data for testing."""
    return {
        "symbol": "BTC-USD",
        "current_volatility": 0.85,
        "threshold": 0.80,
        "breach_type": "above",
        "timestamp": "2025-01-20T12:00:00Z",
        "alert_message": "Volatility breach detected for BTC-USD"
    }