#!/usr/bin/env python3
"""
Polymarket API client for fetching prediction market data.

This module provides integration with Polymarket's gamma API to fetch
market data, prices, and trading information.
"""

import asyncio
import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

import httpx

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

    def __del__(self):
        """Cleanup on deletion."""
        # Don't try to create async tasks during cleanup
        # The close() method should be called explicitly
        pass
