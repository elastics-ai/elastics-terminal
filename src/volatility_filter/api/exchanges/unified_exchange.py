"""Unified interface for all exchange clients."""

import asyncio
import logging
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol, Union
from enum import Enum

from .kalshi_client import KalshiClient
from .deribit_client import DeribitClient
from ...polymarket_client import PolymarketClient

logger = logging.getLogger(__name__)


class ExchangeType(Enum):
    """Supported exchange types."""
    KALSHI = "kalshi"
    POLYMARKET = "polymarket"
    DERIBIT = "deribit"


class MarketType(Enum):
    """Types of markets across exchanges."""
    BINARY = "binary"  # Yes/No markets (Kalshi, Polymarket)
    OPTION = "option"  # Options (Deribit)
    FUTURE = "future"  # Futures (Deribit)
    PERPETUAL = "perpetual"  # Perpetual futures (Deribit)


class UnifiedMarket:
    """Unified market representation across exchanges."""
    
    def __init__(
        self,
        id: str,
        exchange: ExchangeType,
        market_type: MarketType,
        title: str,
        underlying: str,
        expiry: Optional[datetime] = None,
        strike: Optional[float] = None,
        option_type: Optional[str] = None,
        bid: float = 0,
        ask: float = 0,
        last: float = 0,
        volume: float = 0,
        open_interest: float = 0,
        **kwargs
    ):
        self.id = id
        self.exchange = exchange
        self.market_type = market_type
        self.title = title
        self.underlying = underlying
        self.expiry = expiry
        self.strike = strike
        self.option_type = option_type
        self.bid = bid
        self.ask = ask
        self.last = last
        self.volume = volume
        self.open_interest = open_interest
        self.extra = kwargs
        
    @property
    def mid_price(self) -> float:
        """Calculate mid price."""
        if self.bid and self.ask:
            return (self.bid + self.ask) / 2
        return self.last
        
    @property
    def spread(self) -> float:
        """Calculate bid-ask spread."""
        if self.bid and self.ask:
            return self.ask - self.bid
        return 0
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "exchange": self.exchange.value,
            "market_type": self.market_type.value,
            "title": self.title,
            "underlying": self.underlying,
            "expiry": self.expiry.isoformat() if self.expiry else None,
            "strike": self.strike,
            "option_type": self.option_type,
            "bid": self.bid,
            "ask": self.ask,
            "last": self.last,
            "mid_price": self.mid_price,
            "spread": self.spread,
            "volume": self.volume,
            "open_interest": self.open_interest,
            **self.extra
        }


class ExchangeAdapter(ABC):
    """Abstract base class for exchange adapters."""
    
    @abstractmethod
    async def get_markets(
        self,
        underlying: Optional[str] = None,
        market_type: Optional[MarketType] = None,
        **kwargs
    ) -> List[UnifiedMarket]:
        """Get markets from the exchange."""
        pass
        
    @abstractmethod
    async def get_orderbook(
        self,
        market_id: str,
        depth: int = 10
    ) -> Dict[str, Any]:
        """Get orderbook for a market."""
        pass
        
    @abstractmethod
    async def get_price_history(
        self,
        market_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Get historical price data."""
        pass


class KalshiAdapter(ExchangeAdapter):
    """Adapter for Kalshi exchange."""
    
    def __init__(self, client: KalshiClient):
        self.client = client
        
    async def get_markets(
        self,
        underlying: Optional[str] = None,
        market_type: Optional[MarketType] = None,
        **kwargs
    ) -> List[UnifiedMarket]:
        """Get markets from Kalshi."""
        # Kalshi only has binary markets
        if market_type and market_type != MarketType.BINARY:
            return []
            
        raw_markets = await self.client.get_markets(**kwargs)
        
        unified_markets = []
        for market in raw_markets:
            unified = UnifiedMarket(
                id=market["id"],
                exchange=ExchangeType.KALSHI,
                market_type=MarketType.BINARY,
                title=market["title"],
                underlying=market.get("event_ticker", ""),
                expiry=datetime.fromisoformat(market["close_time"].replace("Z", "+00:00")) if market.get("close_time") else None,
                bid=market.get("yes_bid", 0),
                ask=market.get("yes_ask", 0),
                last=market.get("last_price", 0),
                volume=market.get("volume_24h", 0),
                open_interest=market.get("open_interest", 0),
                yes_price=market.get("yes_price", 0),
                no_price=market.get("no_price", 0),
                status=market.get("status", "")
            )
            
            if not underlying or underlying.upper() in unified.underlying.upper():
                unified_markets.append(unified)
                
        return unified_markets
        
    async def get_orderbook(self, market_id: str, depth: int = 10) -> Dict[str, Any]:
        """Get orderbook from Kalshi."""
        return await self.client.get_market_orderbook(market_id)
        
    async def get_price_history(
        self,
        market_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Get price history from Kalshi."""
        return await self.client.get_market_history(market_id, start_time, end_time)


class PolymarketAdapter(ExchangeAdapter):
    """Adapter for Polymarket exchange."""
    
    def __init__(self, client: PolymarketClient):
        self.client = client
        
    async def get_markets(
        self,
        underlying: Optional[str] = None,
        market_type: Optional[MarketType] = None,
        **kwargs
    ) -> List[UnifiedMarket]:
        """Get markets from Polymarket."""
        # Polymarket only has binary markets
        if market_type and market_type != MarketType.BINARY:
            return []
            
        category = kwargs.get("category")
        raw_markets = await self.client.get_markets(category=category)
        
        unified_markets = []
        for market in raw_markets:
            unified = UnifiedMarket(
                id=market["id"],
                exchange=ExchangeType.POLYMARKET,
                market_type=MarketType.BINARY,
                title=market["question"],
                underlying=market.get("category", ""),
                expiry=datetime.fromisoformat(market["end_date"].replace("Z", "+00:00")) if market.get("end_date") else None,
                bid=market.get("yes_price", 0) - 0.01,  # Approximate bid
                ask=market.get("yes_price", 0) + 0.01,  # Approximate ask
                last=market.get("yes_price", 0),
                volume=market.get("volume", 0),
                open_interest=0,  # Not available
                yes_price=market.get("yes_price", 0),
                no_price=market.get("no_price", 0),
                liquidity=market.get("liquidity", 0),
                tags=market.get("tags", [])
            )
            
            if not underlying or any(underlying.upper() in tag.upper() for tag in unified.extra.get("tags", [])):
                unified_markets.append(unified)
                
        return unified_markets
        
    async def get_orderbook(self, market_id: str, depth: int = 10) -> Dict[str, Any]:
        """Get orderbook from Polymarket."""
        return await self.client.get_orderbook(market_id)
        
    async def get_price_history(
        self,
        market_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Get price history from Polymarket."""
        return await self.client.get_price_history(market_id, start_time, end_time)


class DeribitAdapter(ExchangeAdapter):
    """Adapter for Deribit exchange."""
    
    def __init__(self, client: DeribitClient):
        self.client = client
        
    async def get_markets(
        self,
        underlying: Optional[str] = None,
        market_type: Optional[MarketType] = None,
        **kwargs
    ) -> List[UnifiedMarket]:
        """Get markets from Deribit."""
        if not underlying:
            underlying = "BTC"  # Default to BTC
            
        # Map market type to Deribit kind
        kind = "all"
        if market_type == MarketType.OPTION:
            kind = "option"
        elif market_type in [MarketType.FUTURE, MarketType.PERPETUAL]:
            kind = "future"
            
        raw_instruments = await self.client.get_instruments(underlying, kind=kind)
        
        unified_markets = []
        for inst in raw_instruments:
            # Get ticker data for pricing
            ticker = await self.client._get_ticker(inst["instrument_name"])
            
            # Determine market type
            if inst["type"] == "option":
                mkt_type = MarketType.OPTION
            elif "PERPETUAL" in inst["instrument_name"]:
                mkt_type = MarketType.PERPETUAL
            else:
                mkt_type = MarketType.FUTURE
                
            unified = UnifiedMarket(
                id=inst["instrument_name"],
                exchange=ExchangeType.DERIBIT,
                market_type=mkt_type,
                title=inst["instrument_name"],
                underlying=inst["currency"],
                expiry=datetime.fromtimestamp(inst["expiration_timestamp"] / 1000) if inst.get("expiration_timestamp") else None,
                strike=inst.get("strike"),
                option_type=inst.get("option_type"),
                bid=ticker.get("bid_price", 0),
                ask=ticker.get("ask_price", 0),
                last=ticker.get("last_price", 0),
                volume=ticker.get("stats", {}).get("volume", 0),
                open_interest=ticker.get("open_interest", 0),
                mark_price=ticker.get("mark_price", 0),
                iv=ticker.get("mark_iv", 0) * 100 if inst["type"] == "option" else None
            )
            
            unified_markets.append(unified)
            
        return unified_markets
        
    async def get_orderbook(self, market_id: str, depth: int = 10) -> Dict[str, Any]:
        """Get orderbook from Deribit."""
        return await self.client.get_orderbook(market_id, depth)
        
    async def get_price_history(
        self,
        market_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """Get price history from Deribit."""
        # Deribit doesn't have a direct price history endpoint
        # Would need to use trades or index data
        return []


class UnifiedExchangeClient:
    """Unified client for accessing multiple exchanges."""
    
    def __init__(self):
        self.adapters: Dict[ExchangeType, ExchangeAdapter] = {}
        self._clients: Dict[ExchangeType, Any] = {}
        
    async def add_exchange(
        self,
        exchange: ExchangeType,
        **credentials
    ):
        """Add an exchange with credentials."""
        if exchange == ExchangeType.KALSHI:
            client = KalshiClient()
            if credentials:
                await client.authenticate(
                    credentials.get("email", ""),
                    credentials.get("password", "")
                )
            self._clients[exchange] = client
            self.adapters[exchange] = KalshiAdapter(client)
            
        elif exchange == ExchangeType.POLYMARKET:
            client = PolymarketClient()
            self._clients[exchange] = client
            self.adapters[exchange] = PolymarketAdapter(client)
            
        elif exchange == ExchangeType.DERIBIT:
            client = DeribitClient(test_net=credentials.get("test_net", False))
            if credentials.get("client_id") and credentials.get("client_secret"):
                await client.authenticate(
                    credentials["client_id"],
                    credentials["client_secret"]
                )
            self._clients[exchange] = client
            self.adapters[exchange] = DeribitAdapter(client)
            
        logger.info(f"Added {exchange.value} exchange")
        
    async def get_all_markets(
        self,
        underlying: Optional[str] = None,
        market_type: Optional[MarketType] = None,
        exchanges: Optional[List[ExchangeType]] = None
    ) -> List[UnifiedMarket]:
        """Get markets from all configured exchanges."""
        if not exchanges:
            exchanges = list(self.adapters.keys())
            
        tasks = []
        for exchange in exchanges:
            if exchange in self.adapters:
                tasks.append(
                    self.adapters[exchange].get_markets(underlying, market_type)
                )
                
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_markets = []
        for result in results:
            if isinstance(result, list):
                all_markets.extend(result)
            else:
                logger.error(f"Error fetching markets: {result}")
                
        return all_markets
        
    async def get_orderbook(
        self,
        exchange: ExchangeType,
        market_id: str,
        depth: int = 10
    ) -> Dict[str, Any]:
        """Get orderbook for a specific market."""
        if exchange not in self.adapters:
            raise ValueError(f"Exchange {exchange.value} not configured")
            
        return await self.adapters[exchange].get_orderbook(market_id, depth)
        
    async def search_markets(
        self,
        query: str,
        market_type: Optional[MarketType] = None,
        exchanges: Optional[List[ExchangeType]] = None
    ) -> List[UnifiedMarket]:
        """Search for markets across exchanges."""
        all_markets = await self.get_all_markets(
            underlying=query,
            market_type=market_type,
            exchanges=exchanges
        )
        
        # Additional filtering by title
        filtered = []
        query_lower = query.lower()
        for market in all_markets:
            if (query_lower in market.title.lower() or
                query_lower in market.underlying.lower() or
                any(query_lower in tag.lower() for tag in market.extra.get("tags", []))):
                filtered.append(market)
                
        return filtered
        
    async def close(self):
        """Close all client connections."""
        for client in self._clients.values():
            if hasattr(client, 'close'):
                await client.close()
                
    def get_supported_exchanges(self) -> List[ExchangeType]:
        """Get list of supported exchanges."""
        return list(ExchangeType)
        
    def get_configured_exchanges(self) -> List[ExchangeType]:
        """Get list of configured exchanges."""
        return list(self.adapters.keys())