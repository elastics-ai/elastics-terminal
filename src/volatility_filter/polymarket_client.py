#!/usr/bin/env python3
"""
Polymarket API client for fetching prediction market data.

This module provides integration with Polymarket's gamma API to fetch
market data, prices, and trading information, including order book
and historical price data.
"""

import asyncio
import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Callable
from collections import deque

import httpx
import websockets

logger = logging.getLogger(__name__)


class PolymarketClient:
    """Client for interacting with Polymarket API."""

    BASE_URL = "https://gamma-api.polymarket.com"

    def __init__(self):
        """Initialize Polymarket client."""
        self.client = httpx.AsyncClient(timeout=30.0)
        self._markets_cache = {}  # Cache per category
        self._last_fetch = {}  # Last fetch time per category
        self._cache_duration = 60  # Cache for 60 seconds

    async def get_markets(
        self,
        active_only: bool = True,
        closed: bool = False,
        limit: int = 100,
        offset: int = 0,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch markets from Polymarket API.

        Args:
            active_only: If True, only return active markets
            closed: If True, return closed markets
            limit: Maximum number of markets to return
            offset: Offset for pagination
            category: If specified, only return markets from this category (case-insensitive)

        Returns:
            List of processed market dictionaries
        """
        try:
            # Check cache
            cache_key = f"{category or 'all'}_{active_only}_{closed}"
            if cache_key in self._markets_cache and cache_key in self._last_fetch:
                if (
                    datetime.now() - self._last_fetch[cache_key]
                ).seconds < self._cache_duration:
                    return self._markets_cache[cache_key]

            # Build query parameters
            params = {"limit": limit, "offset": offset}

            if active_only and not closed:
                params["active"] = "true"
                params["closed"] = "false"
            elif closed:
                params["closed"] = "true"

            # Make request
            response = await self.client.get(f"{self.BASE_URL}/markets", params=params)
            response.raise_for_status()

            # Parse response
            markets = response.json()

            # Process markets
            processed_markets = []
            for market in markets:
                processed_market = self._process_market(market)
                if processed_market:
                    # Apply category filter if specified
                    if category:
                        market_category = processed_market.get("category", "")
                        if market_category.lower() == category.lower():
                            processed_markets.append(processed_market)
                    else:
                        processed_markets.append(processed_market)

            # Update cache
            cache_key = f"{category or 'all'}_{active_only}_{closed}"
            self._markets_cache[cache_key] = processed_markets
            self._last_fetch[cache_key] = datetime.now()

            return processed_markets

        except Exception as e:
            logger.error(f"Error fetching markets: {e}")
            return []

    def _process_market(self, market: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process raw market data into standardized format."""
        try:
            # Extract key fields
            market_id = market.get("id", "")
            question = market.get("question", "Unknown")

            # Get outcome tokens
            tokens = market.get("tokens", [])
            if len(tokens) >= 2:
                yes_token = tokens[0]
                no_token = tokens[1]
            else:
                return None

            # Extract prices
            yes_price = float(yes_token.get("price", 0))
            no_price = float(no_token.get("price", 0))

            # Calculate volume
            volume = float(market.get("volume", 0))
            liquidity = float(market.get("liquidity", 0))

            # Extract dates
            end_date = market.get("end_date_iso")
            if end_date:
                end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                days_until_end = (end_dt - datetime.now()).days
            else:
                days_until_end = -1

            # Get tags and metadata
            tags = market.get("tags", [])
            category = market.get("category", "Other")

            # Check if active
            active = market.get("active", False)
            closed = market.get("closed", False)
            resolved = market.get("resolved", False)

            return {
                "id": market_id,
                "question": question,
                "yes_price": yes_price,
                "no_price": no_price,
                "yes_outcome": yes_token.get("outcome", "Yes"),
                "no_outcome": no_token.get("outcome", "No"),
                "volume": volume,
                "liquidity": liquidity,
                "end_date": end_date,
                "days_until_end": days_until_end,
                "tags": tags,
                "category": category,
                "active": active,
                "closed": closed,
                "resolved": resolved,
                "url": f"https://polymarket.com/event/{market_id}",
                "last_update": datetime.now(),
            }

        except Exception as e:
            logger.error(f"Error processing market {market.get('id', 'unknown')}: {e}")
            return None

    async def get_market_by_id(self, market_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific market."""
        try:
            response = await self.client.get(f"{self.BASE_URL}/markets/{market_id}")
            response.raise_for_status()

            market = response.json()
            return self._process_market(market)

        except Exception as e:
            logger.error(f"Error fetching market {market_id}: {e}")
            return None

    async def search_markets(
        self, query: str, category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search markets by query string.

        Args:
            query: Search query string
            category: If specified, only search within this category

        Returns:
            List of markets matching the query
        """
        try:
            # For now, fetch all markets and filter client-side
            # (Polymarket API doesn't have a search endpoint)
            all_markets = await self.get_markets(limit=500, category=category)

            query_lower = query.lower()
            filtered = []

            for market in all_markets:
                if query_lower in market["question"].lower():
                    filtered.append(market)
                elif any(query_lower in tag.lower() for tag in market.get("tags", [])):
                    filtered.append(market)
                elif query_lower in market.get("category", "").lower():
                    filtered.append(market)

            return filtered

        except Exception as e:
            logger.error(f"Error searching markets: {e}")
            return []

    def format_market_table(self, markets: List[Dict[str, Any]]) -> List[List[str]]:
        """Format markets for table display."""
        rows = []

        for market in markets:
            # Truncate question if too long
            question = market["question"]
            if len(question) > 50:
                question = question[:47] + "..."

            # Format prices as percentages
            yes_pct = f"{market['yes_price'] * 100:.1f}%"
            no_pct = f"{market['no_price'] * 100:.1f}%"

            # Format volume
            if market["volume"] >= 1_000_000:
                volume_str = f"${market['volume'] / 1_000_000:.1f}M"
            elif market["volume"] >= 1_000:
                volume_str = f"${market['volume'] / 1_000:.1f}K"
            else:
                volume_str = f"${market['volume']:.0f}"

            # Days until end
            days = market["days_until_end"]
            if days < 0:
                days_str = "Ended"
            elif days == 0:
                days_str = "Today"
            elif days == 1:
                days_str = "1 day"
            else:
                days_str = f"{days} days"

            # Category
            category = market["category"][:10]  # Truncate

            rows.append(
                [
                    question,
                    yes_pct,
                    no_pct,
                    volume_str,
                    days_str,
                    category,
                    "✓" if market["active"] else "✗",
                ]
            )

        return rows

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def get_orderbook(self, market_id: str) -> Dict[str, Any]:
        """Get order book for a specific market.
        
        Args:
            market_id: Market identifier
            
        Returns:
            Order book data with bids and asks
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/markets/{market_id}/orderbook"
            )
            response.raise_for_status()
            
            data = response.json()
            orderbook = data.get("orderbook", {})
            
            # Process order book
            yes_book = orderbook.get("yes", {})
            no_book = orderbook.get("no", {})
            
            yes_bids = yes_book.get("bids", [])
            yes_asks = yes_book.get("asks", [])
            no_bids = no_book.get("bids", [])
            no_asks = no_book.get("asks", [])
            
            # Calculate spread
            best_yes_bid = yes_bids[0]["price"] if yes_bids else 0
            best_yes_ask = yes_asks[0]["price"] if yes_asks else 0
            spread = best_yes_ask - best_yes_bid if best_yes_bid and best_yes_ask else 0
            
            return {
                "market_id": market_id,
                "yes_bids": yes_bids,
                "yes_asks": yes_asks,
                "no_bids": no_bids,
                "no_asks": no_asks,
                "spread": spread,
                "timestamp": data.get("timestamp", datetime.now().isoformat()),
                "total_yes_bid_size": sum(b.get("size", 0) for b in yes_bids),
                "total_yes_ask_size": sum(a.get("size", 0) for a in yes_asks),
                "total_no_bid_size": sum(b.get("size", 0) for b in no_bids),
                "total_no_ask_size": sum(a.get("size", 0) for a in no_asks),
            }
            
        except Exception as e:
            logger.error(f"Error fetching orderbook for {market_id}: {e}")
            return {}
    
    async def get_price_history(
        self,
        market_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        interval: str = "1h"
    ) -> List[Dict[str, Any]]:
        """Get historical price data for a market.
        
        Args:
            market_id: Market identifier
            start_time: Start time in ISO format
            end_time: End time in ISO format
            interval: Time interval (1m, 5m, 15m, 1h, 1d)
            
        Returns:
            List of historical price points
        """
        try:
            params = {"interval": interval}
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
                    "timestamp": point.get("timestamp"),
                    "yes_price": point.get("yes_price", 0),
                    "no_price": point.get("no_price", 0),
                    "volume": point.get("volume", 0),
                    "trades": point.get("trades", 0),
                    "open": point.get("open", 0),
                    "high": point.get("high", 0),
                    "low": point.get("low", 0),
                    "close": point.get("close", 0),
                })
                
            return processed_history
            
        except Exception as e:
            logger.error(f"Error fetching price history for {market_id}: {e}")
            return []
    
    async def get_trades(
        self,
        market_id: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent trades for a market.
        
        Args:
            market_id: Market identifier
            limit: Maximum number of trades to return
            
        Returns:
            List of recent trades
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/markets/{market_id}/trades",
                params={"limit": limit}
            )
            response.raise_for_status()
            
            data = response.json()
            trades = data.get("trades", [])
            
            # Process trades
            processed_trades = []
            for trade in trades:
                processed_trades.append({
                    "id": trade.get("id"),
                    "timestamp": trade.get("timestamp"),
                    "side": trade.get("side"),  # "yes" or "no"
                    "outcome": trade.get("outcome"),
                    "price": trade.get("price", 0),
                    "size": trade.get("size", 0),
                    "value": trade.get("price", 0) * trade.get("size", 0),
                    "maker": trade.get("maker"),
                    "taker": trade.get("taker"),
                })
                
            return processed_trades
            
        except Exception as e:
            logger.error(f"Error fetching trades for {market_id}: {e}")
            return []
    
    async def subscribe_to_market(
        self,
        market_id: str,
        callback: Callable[[Dict[str, Any]], None]
    ):
        """Subscribe to real-time updates for a market via WebSocket.
        
        Args:
            market_id: Market identifier
            callback: Function to call with updates
        """
        ws_url = f"wss://ws.polymarket.com/markets/{market_id}"
        
        try:
            async with websockets.connect(ws_url) as websocket:
                # Send subscription message
                await websocket.send(json.dumps({
                    "type": "subscribe",
                    "market_id": market_id,
                    "channels": ["trades", "orderbook", "ticker"]
                }))
                
                logger.info(f"Subscribed to market {market_id}")
                
                # Listen for updates
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        if data.get("type") == "update":
                            callback(data.get("data", {}))
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON received: {message}")
                    except Exception as e:
                        logger.error(f"Error processing WebSocket message: {e}")
                        
        except Exception as e:
            logger.error(f"WebSocket connection error for {market_id}: {e}")
    
    def calculate_implied_probability(
        self,
        yes_price: float,
        no_price: float
    ) -> Dict[str, float]:
        """Calculate implied probabilities from prices.
        
        Args:
            yes_price: Price of YES outcome
            no_price: Price of NO outcome
            
        Returns:
            Dictionary with implied probabilities
        """
        # Normalize prices to ensure they sum to 1
        total = yes_price + no_price
        
        if total > 0:
            yes_prob = yes_price / total
            no_prob = no_price / total
        else:
            yes_prob = 0.5
            no_prob = 0.5
            
        return {
            "yes_probability": yes_prob,
            "no_probability": no_prob,
            "confidence": abs(yes_prob - 0.5) * 2,  # 0 = uncertain, 1 = certain
        }
    
    def get_market_metrics(self, market: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate various metrics for a market.
        
        Args:
            market: Market data
            
        Returns:
            Dictionary with calculated metrics
        """
        yes_price = market.get("yes_price", 0)
        no_price = market.get("no_price", 0)
        volume = market.get("volume", 0)
        liquidity = market.get("liquidity", 0)
        
        prob = self.calculate_implied_probability(yes_price, no_price)
        
        # Calculate additional metrics
        price_sum = yes_price + no_price
        price_deviation = abs(1.0 - price_sum) if price_sum > 0 else 0
        
        # Volume to liquidity ratio (activity indicator)
        activity_ratio = volume / liquidity if liquidity > 0 else 0
        
        return {
            "yes_probability": prob["yes_probability"],
            "no_probability": prob["no_probability"],
            "confidence": prob["confidence"],
            "price_deviation": price_deviation,
            "activity_ratio": activity_ratio,
            "liquidity_depth": liquidity,
            "total_volume": volume,
            "is_balanced": price_deviation < 0.02,  # Prices sum close to $1
            "is_liquid": liquidity > 10000,  # $10k+ liquidity
            "is_active": activity_ratio > 2,  # Volume > 2x liquidity
        }
    
    def __del__(self):
        """Cleanup on deletion."""
        # Don't try to create async tasks during cleanup
        # The close() method should be called explicitly
        pass
