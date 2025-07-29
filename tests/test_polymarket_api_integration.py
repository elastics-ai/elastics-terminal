"""Integration tests for Polymarket API endpoint."""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
import json
from fastapi.testclient import TestClient
from fastapi import FastAPI

# Import the endpoint function and client
from src.volatility_filter.api_server import get_polymarket_markets
from src.volatility_filter.polymarket_client import PolymarketClient


class TestPolymarketAPIEndpoint:
    """Test the Polymarket API endpoint integration."""

    @pytest.fixture
    def mock_polymarket_client(self):
        """Create a mock Polymarket client."""
        client = Mock(spec=PolymarketClient)
        client.get_markets = AsyncMock()
        return client

    @pytest.fixture
    def test_app(self, mock_polymarket_client):
        """Create a test FastAPI app with the endpoint."""
        app = FastAPI()
        
        # Add the endpoint with mock client
        @app.get("/api/polymarket/markets")
        async def test_get_polymarket_markets(
            active_only: bool = True, 
            limit: int = 50, 
            search: str = None
        ):
            # Mock the polymarket_client global
            with patch('volatility_filter.api_server.polymarket_client', mock_polymarket_client):
                return await get_polymarket_markets(active_only, limit, search)
        
        return app

    @pytest.fixture
    def client(self, test_app):
        """Create a test client."""
        return TestClient(test_app)

    def test_endpoint_returns_demo_data_when_no_real_data(self, client, mock_polymarket_client):
        """Test that endpoint returns demo data when polymarket client returns no data."""
        mock_polymarket_client.get_markets.return_value = []

        response = client.get("/api/polymarket/markets")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "markets" in data
        assert "total" in data
        assert "last_update" in data
        assert "is_mock" in data
        assert data["is_mock"] == True
        assert len(data["markets"]) > 0
        
        # Check demo data structure
        market = data["markets"][0]
        assert "id" in market
        assert "question" in market
        assert "yes_percentage" in market
        assert "no_percentage" in market
        assert "volume" in market
        assert "category" in market
        assert "active" in market

    def test_endpoint_formats_real_data_correctly(self, client, mock_polymarket_client):
        """Test that endpoint correctly formats real data from Polymarket client."""
        mock_real_data = [
            {
                "id": "real-market-1",
                "question": "Will Bitcoin reach $100k?",
                "yes_price": 0.352,  # Note: price format from client
                "no_price": 0.648,
                "volume": 1250000,
                "end_date": "2024-12-31",
                "category": "Crypto",
                "tags": ["bitcoin", "crypto"],
                "active": True
            }
        ]
        
        mock_polymarket_client.get_markets.return_value = mock_real_data

        response = client.get("/api/polymarket/markets")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_mock"] == False
        assert len(data["markets"]) == 1
        
        market = data["markets"][0]
        assert market["id"] == "real-market-1"
        assert market["question"] == "Will Bitcoin reach $100k?"
        assert market["yes_percentage"] == 35.2  # Converted from 0.352
        assert market["no_percentage"] == 64.8   # Converted from 0.648
        assert market["volume"] == 1250000
        assert market["category"] == "Crypto"
        assert market["tags"] == ["bitcoin", "crypto"]
        assert market["active"] == True

    def test_endpoint_handles_search_parameter(self, client, mock_polymarket_client):
        """Test that endpoint properly handles search parameter."""
        mock_polymarket_client.get_markets.return_value = []

        # Test with search parameter
        response = client.get("/api/polymarket/markets?search=bitcoin")
        
        assert response.status_code == 200
        mock_polymarket_client.get_markets.assert_called_with(
            active_only=True, 
            limit=50
        )

    def test_endpoint_handles_query_parameters(self, client, mock_polymarket_client):
        """Test that endpoint handles all query parameters correctly."""
        mock_polymarket_client.get_markets.return_value = []

        response = client.get("/api/polymarket/markets?active_only=false&limit=100")
        
        assert response.status_code == 200
        mock_polymarket_client.get_markets.assert_called_with(
            active_only=False, 
            limit=100
        )

    def test_endpoint_filters_by_search_term(self, client, mock_polymarket_client):
        """Test that endpoint filters results by search term."""
        # Return demo data (when real data is empty)
        mock_polymarket_client.get_markets.return_value = []

        response = client.get("/api/polymarket/markets?search=bitcoin")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should only return markets matching search term
        bitcoin_markets = [
            m for m in data["markets"] 
            if "bitcoin" in m["question"].lower() or 
               "bitcoin" in m.get("category", "").lower() or
               any("bitcoin" in tag.lower() for tag in m.get("tags", []))
        ]
        
        # All returned markets should match the search
        assert len(data["markets"]) == len(bitcoin_markets)

    def test_endpoint_handles_client_exception(self, client, mock_polymarket_client):
        """Test that endpoint handles Polymarket client exceptions gracefully."""
        mock_polymarket_client.get_markets.side_effect = Exception("API Error")

        response = client.get("/api/polymarket/markets")
        
        assert response.status_code == 200  # Should not fail
        data = response.json()
        
        # Should return demo data as fallback
        assert data["is_mock"] == True
        assert len(data["markets"]) > 0

    def test_endpoint_applies_active_only_filter(self, client, mock_polymarket_client):
        """Test that endpoint applies active_only filter to demo data."""
        mock_polymarket_client.get_markets.return_value = []

        # Test with active_only=True (default)
        response = client.get("/api/polymarket/markets?active_only=true")
        
        assert response.status_code == 200
        data = response.json()
        
        # All returned markets should be active
        active_markets = [m for m in data["markets"] if m.get("active", True)]
        assert len(data["markets"]) == len(active_markets)

    def test_endpoint_applies_limit(self, client, mock_polymarket_client):
        """Test that endpoint applies limit parameter."""
        mock_polymarket_client.get_markets.return_value = []

        response = client.get("/api/polymarket/markets?limit=2")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return at most 2 markets
        assert len(data["markets"]) <= 2

    def test_endpoint_returns_proper_response_structure(self, client, mock_polymarket_client):
        """Test that endpoint returns the expected response structure."""
        mock_polymarket_client.get_markets.return_value = []

        response = client.get("/api/polymarket/markets")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        required_fields = ["markets", "total", "last_update", "is_mock"]
        for field in required_fields:
            assert field in data
        
        # Check market structure
        if data["markets"]:
            market = data["markets"][0]
            market_fields = [
                "id", "question", "yes_percentage", "no_percentage", 
                "volume", "end_date", "category", "tags", "active"
            ]
            for field in market_fields:
                assert field in market

    def test_endpoint_percentage_conversion_accuracy(self, client, mock_polymarket_client):
        """Test that price to percentage conversion is accurate."""
        mock_real_data = [
            {
                "id": "test",
                "question": "Test?",
                "yes_price": 0.1234,
                "no_price": 0.8766,
                "volume": 1000,
                "end_date": "2024-12-31",
                "category": "Test",
                "tags": [],
                "active": True
            }
        ]
        
        mock_polymarket_client.get_markets.return_value = mock_real_data

        response = client.get("/api/polymarket/markets")
        
        assert response.status_code == 200
        data = response.json()
        
        market = data["markets"][0]
        assert market["yes_percentage"] == 12.34  # 0.1234 * 100
        assert market["no_percentage"] == 87.66   # 0.8766 * 100

    def test_endpoint_handles_missing_fields_gracefully(self, client, mock_polymarket_client):
        """Test that endpoint handles missing fields in real data gracefully."""
        mock_incomplete_data = [
            {
                "id": "incomplete",
                "question": "Incomplete market?",
                # Missing yes_price, no_price
                "volume": 1000,
                # Missing end_date, category, tags, active
            }
        ]
        
        mock_polymarket_client.get_markets.return_value = mock_incomplete_data

        response = client.get("/api/polymarket/markets")
        
        assert response.status_code == 200
        data = response.json()
        
        market = data["markets"][0]
        assert market["id"] == "incomplete"
        assert market["question"] == "Incomplete market?"
        assert market["yes_percentage"] == 0  # Default for missing yes_price
        assert market["no_percentage"] == 0   # Default for missing no_price
        assert market["category"] == "Other"  # Default category
        assert market["tags"] == []           # Default tags
        assert market["active"] == True       # Default active status