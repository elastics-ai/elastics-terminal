"""Kalshi API client for prediction market data and trading."""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

logger = logging.getLogger(__name__)


class KalshiClient:
    """Client for interacting with Kalshi prediction markets API."""

    BASE_URL = "https://api.elections.kalshi.com/v1"
    
    def __init__(self):
        """Initialize Kalshi client."""
        self.client = httpx.AsyncClient(timeout=30.0)
        self.auth_token: Optional[str] = None
        self.member_id: Optional[str] = None
        self._markets_cache = {}
        self._cache_ttl = 60  # Cache for 60 seconds
        self._last_cache_update = {}
        
    async def authenticate(self, email: str, password: str) -> bool:
        """Authenticate with Kalshi API.
        
        Args:
            email: User email
            password: User password
            
        Returns:
            True if authentication successful, False otherwise
        """
        try:
            response = await self.client.post(
                f"{self.BASE_URL}/login",
                json={"email": email, "password": password}
            )
            response.raise_for_status()
            
            data = response.json()
            self.auth_token = data.get("token")
            self.member_id = data.get("member_id")
            
            # Set auth header for future requests
            self.client.headers["Authorization"] = f"Bearer {self.auth_token}"
            
            logger.info(f"Successfully authenticated with Kalshi as member {self.member_id}")
            return True
            
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return False
    
    async def get_markets(
        self,
        limit: int = 100,
        cursor: Optional[str] = None,
        event_ticker: Optional[str] = None,
        series_ticker: Optional[str] = None,
        status: Optional[str] = None,
        tickers: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Fetch markets from Kalshi.
        
        Args:
            limit: Maximum number of markets to return
            cursor: Pagination cursor
            event_ticker: Filter by event ticker
            series_ticker: Filter by series ticker  
            status: Filter by market status (active, closed, settled)
            tickers: List of specific market tickers to fetch
            
        Returns:
            List of processed market dictionaries
        """
        try:
            # Build query parameters
            params = {"limit": limit}
            if cursor:
                params["cursor"] = cursor
            if event_ticker:
                params["event_ticker"] = event_ticker
            if series_ticker:
                params["series_ticker"] = series_ticker
            if status:
                params["status"] = status
            if tickers:
                params["tickers"] = ",".join(tickers)
                
            response = await self.client.get(f"{self.BASE_URL}/markets", params=params)
            response.raise_for_status()
            
            data = response.json()
            markets = data.get("markets", [])
            
            # Process markets into standardized format
            processed_markets = []
            for market in markets:
                processed_market = self._process_market(market)
                if processed_market:
                    processed_markets.append(processed_market)
                    
            return processed_markets
            
        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return []
    
    def _process_market(self, market: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process raw market data into standardized format."""
        try:
            # Extract key fields
            market_id = market.get("id", "")
            ticker = market.get("ticker", "")
            title = market.get("title", "")
            
            # Calculate mid prices
            yes_bid = market.get("yes_bid", 0)
            yes_ask = market.get("yes_ask", 0) 
            no_bid = market.get("no_bid", 0)
            no_ask = market.get("no_ask", 0)
            
            yes_price = (yes_bid + yes_ask) / 2 if yes_bid and yes_ask else market.get("last_price", 0)
            no_price = (no_bid + no_ask) / 2 if no_bid and no_ask else (1 - yes_price)
            
            # Extract dates
            close_time = market.get("close_time")
            if close_time:
                close_dt = datetime.fromisoformat(close_time.replace("Z", "+00:00"))
                days_until_close = (close_dt - datetime.now()).days
            else:
                days_until_close = -1
                
            return {
                "id": market_id,
                "ticker": ticker,
                "title": title,
                "event_ticker": market.get("event_ticker", ""),
                "market_type": market.get("market_type", "binary"),
                "yes_price": yes_price,
                "no_price": no_price,
                "yes_bid": yes_bid,
                "yes_ask": yes_ask,
                "no_bid": no_bid, 
                "no_ask": no_ask,
                "last_price": market.get("last_price", 0),
                "volume": market.get("volume", 0),
                "volume_24h": market.get("volume_24h", 0),
                "liquidity": market.get("liquidity", 0),
                "open_interest": market.get("open_interest", 0),
                "status": market.get("status", ""),
                "close_time": close_time,
                "days_until_close": days_until_close,
                "url": f"https://kalshi.com/markets/{ticker}",
                "last_update": datetime.now()
            }
            
        except Exception as e:
            logger.error(f"Error processing market {market.get('id', 'unknown')}: {e}")
            return None
    
    async def get_event_markets(self, event_ticker: str) -> List[Dict[str, Any]]:
        """Get all markets for a specific event.
        
        Args:
            event_ticker: Event ticker (e.g., "FED", "CPI", "INX")
            
        Returns:
            List of markets for the event
        """
        return await self.get_markets(event_ticker=event_ticker)
    
    async def get_market_orderbook(self, market_id: str) -> Dict[str, Any]:
        """Get orderbook for a specific market.
        
        Args:
            market_id: Market identifier
            
        Returns:
            Orderbook data with bids and asks
        """
        try:
            response = await self.client.get(f"{self.BASE_URL}/markets/{market_id}/orderbook")
            response.raise_for_status()
            
            data = response.json()
            orderbook = data.get("orderbook", {})
            
            # Process orderbook
            yes_bids = orderbook.get("yes", [])
            no_bids = orderbook.get("no", [])
            
            # Calculate spread
            best_yes_ask = yes_bids[0]["price"] if yes_bids else 0
            best_no_ask = no_bids[0]["price"] if no_bids else 0
            spread = abs(best_no_ask - best_yes_ask) if best_yes_ask and best_no_ask else 0
            
            return {
                "market_id": market_id,
                "yes_bids": yes_bids,
                "no_bids": no_bids,
                "spread": spread,
                "timestamp": data.get("timestamp", datetime.now().isoformat())
            }
            
        except Exception as e:
            logger.error(f"Error fetching orderbook for {market_id}: {e}")
            return {}
    
    async def get_market_history(
        self,
        market_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Get price history for a market.
        
        Args:
            market_id: Market identifier
            start_time: Start time in ISO format
            end_time: End time in ISO format  
            limit: Maximum number of data points
            
        Returns:
            List of historical price points
        """
        try:
            params = {"limit": limit}
            if start_time:
                params["start_time"] = start_time
            if end_time:
                params["end_time"] = end_time
                
            response = await self.client.get(
                f"{self.BASE_URL}/markets/{market_id}/history",
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            history = data.get("history", [])
            
            # Process history points
            processed_history = []
            for point in history:
                processed_history.append({
                    "timestamp": point.get("ts"),
                    "yes_price": point.get("yes_price", 0),
                    "no_price": point.get("no_price", 0),
                    "volume": point.get("volume", 0)
                })
                
            return processed_history
            
        except Exception as e:
            logger.error(f"Error fetching history for {market_id}: {e}")
            return []
    
    async def search_markets(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search markets by query string.
        
        Args:
            query: Search query
            limit: Maximum results
            
        Returns:
            List of matching markets
        """
        try:
            params = {"query": query, "limit": limit}
            response = await self.client.get(f"{self.BASE_URL}/markets/search", params=params)
            response.raise_for_status()
            
            data = response.json()
            markets = data.get("markets", [])
            
            # Process search results
            results = []
            for market in markets:
                processed = self._process_market(market)
                if processed:
                    results.append(processed)
                    
            return results
            
        except Exception as e:
            logger.error(f"Error searching markets: {e}")
            return []
    
    async def get_portfolio_positions(self) -> List[Dict[str, Any]]:
        """Get current portfolio positions.
        
        Returns:
            List of positions
        """
        if not self.auth_token:
            logger.error("Not authenticated. Call authenticate() first.")
            return []
            
        try:
            response = await self.client.get(f"{self.BASE_URL}/portfolio/positions")
            response.raise_for_status()
            
            data = response.json()
            positions = data.get("positions", [])
            
            # Process positions
            processed_positions = []
            for pos in positions:
                processed_positions.append({
                    "market_id": pos.get("market_id"),
                    "market_ticker": pos.get("market_ticker"),
                    "side": pos.get("side"),
                    "quantity": pos.get("position", 0),
                    "entry_price": pos.get("average_price", 0),
                    "current_price": pos.get("current_price", 0),
                    "pnl": pos.get("pnl", 0),
                    "pnl_percent": pos.get("pnl_percent", 0)
                })
                
            return processed_positions
            
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            return []
    
    async def place_order(
        self,
        market_id: str,
        side: str,
        quantity: int,
        price: float,
        order_type: str = "limit"
    ) -> Dict[str, Any]:
        """Place an order.
        
        Args:
            market_id: Market identifier
            side: "yes" or "no"
            quantity: Number of contracts
            price: Limit price (0-1)
            order_type: "limit" or "market"
            
        Returns:
            Order details
        """
        if not self.auth_token:
            logger.error("Not authenticated. Call authenticate() first.")
            return {}
            
        try:
            order_data = {
                "market_id": market_id,
                "side": side,
                "quantity": quantity,
                "type": order_type
            }
            
            if order_type == "limit":
                order_data["price"] = price
                
            response = await self.client.post(
                f"{self.BASE_URL}/orders",
                json=order_data
            )
            response.raise_for_status()
            
            data = response.json()
            order = data.get("order", {})
            
            return {
                "order_id": order.get("order_id"),
                "market_id": order.get("market_id"),
                "side": order.get("side"),
                "quantity": order.get("quantity"),
                "price": order.get("price"),
                "status": order.get("status"),
                "filled_quantity": order.get("filled_quantity", 0),
                "average_fill_price": order.get("average_fill_price", 0),
                "created_at": order.get("created_at")
            }
            
        except Exception as e:
            logger.error(f"Error placing order: {e}")
            return {}
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    def format_market_table(self, markets: List[Dict[str, Any]]) -> List[List[str]]:
        """Format markets for table display."""
        rows = []
        
        for market in markets:
            # Truncate title if too long
            title = market["title"]
            if len(title) > 50:
                title = title[:47] + "..."
                
            # Format prices as percentages
            yes_pct = f"{market['yes_price'] * 100:.1f}%"
            no_pct = f"{market['no_price'] * 100:.1f}%"
            
            # Format volume
            if market["volume_24h"] >= 1_000_000:
                volume_str = f"${market['volume_24h'] / 1_000_000:.1f}M"
            elif market["volume_24h"] >= 1_000:
                volume_str = f"${market['volume_24h'] / 1_000:.1f}K"
            else:
                volume_str = f"${market['volume_24h']:.0f}"
                
            # Days until close
            days = market["days_until_close"]
            if days < 0:
                days_str = "Closed"
            elif days == 0:
                days_str = "Today"
            elif days == 1:
                days_str = "1 day"
            else:
                days_str = f"{days} days"
                
            rows.append([
                market["ticker"],
                title,
                yes_pct,
                no_pct,
                volume_str,
                days_str,
                market["status"].capitalize()
            ])
            
        return rows