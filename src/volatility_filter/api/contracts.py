"""
Contracts API endpoints for screening and matching
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/contracts", tags=["contracts"])

class Contract(BaseModel):
    id: str
    contract: str
    price: float
    size: int
    value: float
    pnl: float
    delta: float
    gamma: float
    theta: float
    vega: float
    tags: List[str]
    exchange: str

class ContractMatch(BaseModel):
    id: str
    event: str
    kalshi_price: Optional[float]
    polymarket_price: Optional[float]
    deribit_price: Optional[float]
    spread: float
    spread_percent: float
    recommendation: str
    potential_profit: float
    tags: List[str]

class ContractScreenerResponse(BaseModel):
    contracts: List[Contract]
    total: int
    stats: Dict[str, Any]

class ContractMatcherResponse(BaseModel):
    matches: List[ContractMatch]
    total: int
    stats: Dict[str, Any]

@router.get("/screener", response_model=ContractScreenerResponse)
async def get_contract_screener(
    exchange: Optional[str] = Query(None, description="Filter by exchange"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    min_value: Optional[float] = Query(None, description="Minimum contract value"),
    max_value: Optional[float] = Query(None, description="Maximum contract value"),
    sort_by: Optional[str] = Query("value", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)")
):
    """Get screened contracts with filtering and sorting"""
    
    # Mock data for now
    contracts = [
        Contract(
            id="1",
            contract="BTC_Above_100k",
            price=420,
            size=10000,
            value=42000,
            pnl=1800,
            delta=0.85,
            gamma=5.2,
            theta=-0.19,
            vega=11,
            tags=["btc", "binary"],
            exchange="Polymarket"
        ),
        Contract(
            id="2",
            contract="ETH_Over_5k",
            price=470,
            size=7500,
            value=35250,
            pnl=-320,
            delta=0.78,
            gamma=4.8,
            theta=-0.1,
            vega=9,
            tags=["eth", "binary"],
            exchange="Polymarket"
        ),
        Contract(
            id="3",
            contract="Trump_Win_2024",
            price=580,
            size=12500,
            value=72500,
            pnl=2500,
            delta=0.92,
            gamma=6.0,
            theta=-0.2,
            vega=14,
            tags=["politics", "binary"],
            exchange="Kalshi"
        ),
        Contract(
            id="4",
            contract="US_Recession_2024",
            price=330,
            size=9000,
            value=29700,
            pnl=-1200,
            delta=0.65,
            gamma=3.6,
            theta=-0.06,
            vega=7,
            tags=["macro", "binary"],
            exchange="Kalshi"
        ),
        Contract(
            id="5",
            contract="ETH_50d_Call",
            price=1500,
            size=60,
            value=90000,
            pnl=-150,
            delta=0.51,
            gamma=0.03,
            theta=-2.1,
            vega=4.5,
            tags=["eth", "options", "call"],
            exchange="Deribit"
        ),
        Contract(
            id="6",
            contract="BTC_75k_Call",
            price=185,
            size=50,
            value=92500,
            pnl=-700,
            delta=0.62,
            gamma=0.07,
            theta=-1.6,
            vega=3.2,
            tags=["btc", "options", "call"],
            exchange="Deribit"
        )
    ]
    
    # Apply filters
    filtered_contracts = contracts
    
    if exchange:
        filtered_contracts = [c for c in filtered_contracts if c.exchange == exchange]
    
    if tags:
        filtered_contracts = [c for c in filtered_contracts if any(tag in c.tags for tag in tags)]
    
    if min_value is not None:
        filtered_contracts = [c for c in filtered_contracts if c.value >= min_value]
    
    if max_value is not None:
        filtered_contracts = [c for c in filtered_contracts if c.value <= max_value]
    
    # Sort
    if sort_by in ["price", "value", "pnl", "delta", "gamma", "theta", "vega"]:
        reverse = sort_order == "desc"
        filtered_contracts.sort(key=lambda x: getattr(x, sort_by), reverse=reverse)
    
    # Calculate stats
    total_value = sum(c.value for c in filtered_contracts)
    total_pnl = sum(c.pnl for c in filtered_contracts)
    avg_delta = sum(c.delta for c in filtered_contracts) / len(filtered_contracts) if filtered_contracts else 0
    
    return ContractScreenerResponse(
        contracts=filtered_contracts,
        total=len(filtered_contracts),
        stats={
            "total_value": total_value,
            "total_pnl": total_pnl,
            "avg_delta": avg_delta,
            "total_contracts": len(filtered_contracts)
        }
    )

@router.get("/matcher", response_model=ContractMatcherResponse)
async def get_contract_matcher(
    min_spread: Optional[float] = Query(5.0, description="Minimum spread percentage"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags")
):
    """Get matched contracts across exchanges with arbitrage opportunities"""
    
    # Mock data for now
    matches = [
        ContractMatch(
            id="1",
            event="Trump Win 2024",
            kalshi_price=48,
            polymarket_price=52,
            deribit_price=None,
            spread=4,
            spread_percent=8.3,
            recommendation="Buy Kalshi, Sell Polymarket",
            potential_profit=400,
            tags=["arbitrage", "politics"]
        ),
        ContractMatch(
            id="2",
            event="BTC Above 100k",
            kalshi_price=32,
            polymarket_price=35,
            deribit_price=38,
            spread=6,
            spread_percent=18.8,
            recommendation="Buy Kalshi, Sell Deribit",
            potential_profit=600,
            tags=["crypto", "spread"]
        ),
        ContractMatch(
            id="3",
            event="Fed Rate Cut Q2",
            kalshi_price=65,
            polymarket_price=58,
            deribit_price=None,
            spread=7,
            spread_percent=10.8,
            recommendation="Buy Polymarket, Sell Kalshi",
            potential_profit=700,
            tags=["macro", "arbitrage"]
        ),
        ContractMatch(
            id="4",
            event="ETH Above 5k",
            kalshi_price=42,
            polymarket_price=45,
            deribit_price=41,
            spread=4,
            spread_percent=9.8,
            recommendation="Buy Deribit, Sell Polymarket",
            potential_profit=400,
            tags=["crypto", "spread"]
        ),
        ContractMatch(
            id="5",
            event="US Recession 2024",
            kalshi_price=28,
            polymarket_price=33,
            deribit_price=None,
            spread=5,
            spread_percent=17.9,
            recommendation="Buy Kalshi, Sell Polymarket",
            potential_profit=500,
            tags=["macro", "bearish"]
        )
    ]
    
    # Apply filters
    filtered_matches = matches
    
    if min_spread:
        filtered_matches = [m for m in filtered_matches if m.spread_percent >= min_spread]
    
    if tags:
        filtered_matches = [m for m in filtered_matches if any(tag in m.tags for tag in tags)]
    
    # Calculate stats
    avg_spread = sum(m.spread_percent for m in filtered_matches) / len(filtered_matches) if filtered_matches else 0
    total_potential_profit = sum(m.potential_profit for m in filtered_matches)
    highest_spread = max((m.spread_percent for m in filtered_matches), default=0)
    
    return ContractMatcherResponse(
        matches=filtered_matches,
        total=len(filtered_matches),
        stats={
            "avg_spread": avg_spread,
            "total_potential_profit": total_potential_profit,
            "highest_spread": highest_spread,
            "total_matches": len(filtered_matches)
        }
    )

@router.post("/execute-trade/{contract_id}")
async def execute_trade(
    contract_id: str,
    action: str = Query(..., description="buy or sell"),
    quantity: int = Query(..., description="Quantity to trade")
):
    """Execute a trade for a specific contract"""
    
    # Mock implementation
    return {
        "success": True,
        "contract_id": contract_id,
        "action": action,
        "quantity": quantity,
        "executed_at": datetime.now().isoformat(),
        "message": f"Successfully executed {action} order for {quantity} contracts"
    }