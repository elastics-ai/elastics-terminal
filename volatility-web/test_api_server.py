import pytest
from fastapi.testclient import TestClient
from api_server import app

client = TestClient(app)

def test_get_portfolio_summary():
    response = client.get("/api/portfolio/summary")
    assert response.status_code == 200
    data = response.json()
    
    assert "portfolio_value" in data
    assert "cumulative_pnl" in data
    assert "cumulative_return" in data
    assert "annual_return" in data
    assert "max_drawdown" in data
    assert "annual_volatility" in data
    assert "alpha" in data
    assert "beta" in data
    assert "cvar_95" in data
    assert "sharpe_ratio" in data
    assert "calmar_ratio" in data
    assert "sortino_ratio" in data

    assert isinstance(data["portfolio_value"]["value"], (int, float))
    assert isinstance(data["portfolio_value"]["change_24h"], (int, float))
    assert isinstance(data["cumulative_pnl"]["value"], (int, float))
    assert isinstance(data["cumulative_pnl"]["change_24h"], (int, float))
    assert isinstance(data["cumulative_return"]["value"], (int, float))
    assert isinstance(data["cumulative_return"]["change_24h"], (int, float))
    assert isinstance(data["annual_return"]["value"], (int, float))
    assert isinstance(data["annual_return"]["change_24h"], (int, float))
    assert isinstance(data["max_drawdown"]["value"], (int, float))
    assert isinstance(data["max_drawdown"]["change_24h"], (int, float))
    assert isinstance(data["annual_volatility"]["value"], (int, float))
    assert isinstance(data["annual_volatility"]["change_24h"], (int, float))
    assert isinstance(data["alpha"]["value"], (int, float))
    assert isinstance(data["alpha"]["change_24h"], (int, float))
    assert isinstance(data["beta"]["value"], (int, float))
    assert isinstance(data["beta"]["change_24h"], (int, float))
    assert isinstance(data["cvar_95"]["value"], (int, float))
    assert isinstance(data["cvar_95"]["change_24h"], (int, float))
    assert isinstance(data["sharpe_ratio"]["value"], (int, float))
    assert isinstance(data["sharpe_ratio"]["change_24h"], (int, float))
    assert isinstance(data["calmar_ratio"]["value"], (int, float))
    assert isinstance(data["calmar_ratio"]["change_24h"], (int, float))
    assert isinstance(data["sortino_ratio"]["value"], (int, float))
    assert isinstance(data["sortino_ratio"]["change_24h"], (int, float))
