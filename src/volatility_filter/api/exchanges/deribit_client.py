"""Deribit API client for options and futures trading."""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable
from collections import defaultdict
import math

import httpx
import websockets

logger = logging.getLogger(__name__)


class DeribitClient:
    """Client for interacting with Deribit derivatives exchange API."""

    def __init__(self, test_net: bool = False):
        """Initialize Deribit client.
        
        Args:
            test_net: If True, use testnet API endpoints
        """
        self.test_net = test_net
        if test_net:
            self.BASE_URL = "https://test.deribit.com/api/v2"
            self.WS_URL = "wss://test.deribit.com/ws/api/v2"
        else:
            self.BASE_URL = "https://www.deribit.com/api/v2"
            self.WS_URL = "wss://www.deribit.com/ws/api/v2"
            
        self.client = httpx.AsyncClient(timeout=30.0)
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self._instruments_cache = {}
        self._cache_ttl = 300  # Cache for 5 minutes
        self._last_cache_update = {}
        
    async def authenticate(self, client_id: str, client_secret: str) -> bool:
        """Authenticate with Deribit API.
        
        Args:
            client_id: API client ID
            client_secret: API client secret
            
        Returns:
            True if authentication successful, False otherwise
        """
        try:
            response = await self.client.post(
                f"{self.BASE_URL}/public/auth",
                params={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "grant_type": "client_credentials"
                }
            )
            response.raise_for_status()
            
            data = response.json()
            result = data.get("result", {})
            
            self.access_token = result.get("access_token")
            self.refresh_token = result.get("refresh_token")
            
            # Set auth header for future requests
            if self.access_token:
                self.client.headers["Authorization"] = f"Bearer {self.access_token}"
                
            logger.info("Successfully authenticated with Deribit")
            return True
            
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return False
    
    async def get_instruments(
        self,
        currency: str,
        kind: str = "all",
        expired: bool = False
    ) -> List[Dict[str, Any]]:
        """Get available instruments.
        
        Args:
            currency: Currency (BTC, ETH, etc.)
            kind: Instrument type (all, future, option)
            expired: Include expired instruments
            
        Returns:
            List of instruments
        """
        try:
            params = {
                "currency": currency,
                "kind": kind if kind != "all" else None,
                "expired": expired
            }
            
            # Remove None values
            params = {k: v for k, v in params.items() if v is not None}
            
            response = await self.client.get(
                f"{self.BASE_URL}/public/get_instruments",
                params=params
            )
            response.raise_for_status()
            
            data = response.json()
            instruments = data.get("result", [])
            
            # Process instruments
            processed = []
            for inst in instruments:
                processed_inst = self._process_instrument(inst)
                if processed_inst:
                    processed.append(processed_inst)
                    
            return processed
            
        except Exception as e:
            logger.error(f"Error fetching instruments: {e}")
            return []
    
    def _process_instrument(self, inst: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process raw instrument data."""
        try:
            instrument_name = inst.get("instrument_name", "")
            kind = inst.get("kind", "")
            
            base_data = {
                "instrument_name": instrument_name,
                "type": kind,
                "currency": inst.get("base_currency", ""),
                "is_active": inst.get("is_active", False),
                "contract_size": inst.get("contract_size", 0),
                "min_trade_amount": inst.get("min_trade_amount", 0),
                "tick_size": inst.get("tick_size", 0),
                "creation_timestamp": inst.get("creation_timestamp"),
                "expiration_timestamp": inst.get("expiration_timestamp"),
            }
            
            if kind == "option":
                base_data.update({
                    "strike": inst.get("strike", 0),
                    "option_type": inst.get("option_type", ""),
                    "settlement_period": inst.get("settlement_period", ""),
                })
            elif kind == "future":
                base_data.update({
                    "settlement_period": inst.get("settlement_period", ""),
                })
                
            return base_data
            
        except Exception as e:
            logger.error(f"Error processing instrument: {e}")
            return None
    
    async def get_option_chain(
        self,
        currency: str,
        expiry: Optional[str] = None
    ) -> Dict[float, Dict[str, Any]]:
        """Get option chain data.
        
        Args:
            currency: Currency (BTC, ETH)
            expiry: Expiry date filter (e.g., "29MAR24")
            
        Returns:
            Dictionary mapping strikes to call/put data
        """
        try:
            # Get all option instruments
            instruments = await self.get_instruments(currency, kind="option")
            
            # Filter by expiry if specified
            if expiry:
                instruments = [i for i in instruments if expiry in i["instrument_name"]]
            
            # Get ticker data for all options
            chain = defaultdict(lambda: {"call": None, "put": None})
            
            for inst in instruments:
                ticker_data = await self._get_ticker(inst["instrument_name"])
                if ticker_data:
                    strike = inst["strike"]
                    option_type = inst["option_type"]
                    
                    option_data = {
                        "instrument_name": inst["instrument_name"],
                        "bid": ticker_data.get("bid_price", 0),
                        "ask": ticker_data.get("ask_price", 0),
                        "mark": ticker_data.get("mark_price", 0),
                        "last": ticker_data.get("last_price", 0),
                        "volume": ticker_data.get("stats", {}).get("volume", 0),
                        "open_interest": ticker_data.get("open_interest", 0),
                        "delta": ticker_data.get("greeks", {}).get("delta", 0),
                        "gamma": ticker_data.get("greeks", {}).get("gamma", 0),
                        "vega": ticker_data.get("greeks", {}).get("vega", 0),
                        "theta": ticker_data.get("greeks", {}).get("theta", 0),
                        "rho": ticker_data.get("greeks", {}).get("rho", 0),
                        "iv": ticker_data.get("mark_iv", 0),
                    }
                    
                    chain[strike][option_type] = option_data
                    
            return dict(chain)
            
        except Exception as e:
            logger.error(f"Error fetching option chain: {e}")
            return {}
    
    async def _get_ticker(self, instrument_name: str) -> Dict[str, Any]:
        """Get ticker data for an instrument."""
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/public/ticker",
                params={"instrument_name": instrument_name}
            )
            response.raise_for_status()
            
            data = response.json()
            return data.get("result", {})
            
        except Exception as e:
            logger.error(f"Error fetching ticker for {instrument_name}: {e}")
            return {}
    
    async def get_orderbook(
        self,
        instrument_name: str,
        depth: int = 10
    ) -> Dict[str, Any]:
        """Get orderbook for an instrument.
        
        Args:
            instrument_name: Instrument identifier
            depth: Number of price levels
            
        Returns:
            Orderbook data
        """
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/public/get_order_book",
                params={
                    "instrument_name": instrument_name,
                    "depth": depth
                }
            )
            response.raise_for_status()
            
            data = response.json()
            result = data.get("result", {})
            
            # Process orderbook
            bids = []
            asks = []
            
            for bid in result.get("bids", []):
                bids.append({
                    "price": bid[0],
                    "amount": bid[1]
                })
                
            for ask in result.get("asks", []):
                asks.append({
                    "price": ask[0],
                    "amount": ask[1]
                })
                
            # Calculate spread and mid price
            best_bid = bids[0]["price"] if bids else 0
            best_ask = asks[0]["price"] if asks else 0
            spread = best_ask - best_bid if best_bid and best_ask else 0
            mid_price = (best_bid + best_ask) / 2 if best_bid and best_ask else 0
            
            return {
                "instrument_name": instrument_name,
                "bids": bids,
                "asks": asks,
                "spread": spread,
                "mid_price": mid_price,
                "mark_price": result.get("mark_price", 0),
                "last_price": result.get("last_price", 0),
                "timestamp": result.get("timestamp"),
                "state": result.get("state", ""),
                "stats": result.get("stats", {}),
            }
            
        except Exception as e:
            logger.error(f"Error fetching orderbook for {instrument_name}: {e}")
            return {}
    
    async def get_greeks(self, instrument_name: str) -> Dict[str, float]:
        """Get Greeks for an option.
        
        Args:
            instrument_name: Option instrument name
            
        Returns:
            Greeks data
        """
        try:
            ticker = await self._get_ticker(instrument_name)
            greeks = ticker.get("greeks", {})
            
            return {
                "delta": greeks.get("delta", 0),
                "gamma": greeks.get("gamma", 0),
                "vega": greeks.get("vega", 0),
                "theta": greeks.get("theta", 0),
                "rho": greeks.get("rho", 0),
                "iv": ticker.get("mark_iv", 0) * 100,  # Convert to percentage
            }
            
        except Exception as e:
            logger.error(f"Error fetching Greeks for {instrument_name}: {e}")
            return {}
    
    async def get_volatility_index(
        self,
        currency: str,
        resolution: str = "1h",
        start_time: Optional[int] = None,
        end_time: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Get volatility index data (DVOL).
        
        Args:
            currency: Currency (BTC, ETH)
            resolution: Time resolution (1h, 1d)
            start_time: Start timestamp in milliseconds
            end_time: End timestamp in milliseconds
            
        Returns:
            List of volatility index data points
        """
        try:
            index_name = f"{currency.lower()}_dvol"
            
            # Default to last 24 hours if no time range specified
            if not end_time:
                end_time = int(datetime.now().timestamp() * 1000)
            if not start_time:
                start_time = end_time - (24 * 3600 * 1000)
                
            # Map resolution to API format
            resolution_map = {
                "1m": 60,
                "5m": 300,
                "15m": 900,
                "1h": 3600,
                "1d": 86400
            }
            resolution_seconds = resolution_map.get(resolution, 3600)
            
            response = await self.client.get(
                f"{self.BASE_URL}/public/get_volatility_index_data",
                params={
                    "currency": currency,
                    "resolution": resolution_seconds,
                    "start_timestamp": start_time,
                    "end_timestamp": end_time
                }
            )
            response.raise_for_status()
            
            data = response.json()
            result = data.get("result", {})
            
            # Process data points
            vol_data = []
            for point in result.get("data", []):
                vol_data.append({
                    "timestamp": point[0],
                    "value": point[1],
                    "datetime": datetime.fromtimestamp(point[0] / 1000)
                })
                
            return vol_data
            
        except Exception as e:
            logger.error(f"Error fetching volatility index: {e}")
            return []
    
    async def get_historical_volatility(
        self,
        currency: str,
        period: int = 30
    ) -> Dict[str, Any]:
        """Calculate historical volatility metrics.
        
        Args:
            currency: Currency (BTC, ETH)
            period: Period in days
            
        Returns:
            Historical volatility data
        """
        try:
            # Get ATM options to calculate IV metrics
            instruments = await self.get_instruments(currency, kind="option")
            
            # Get current spot price
            index_price = await self._get_index_price(currency)
            
            # Find ATM options
            atm_options = []
            for inst in instruments:
                if abs(inst["strike"] - index_price) / index_price < 0.05:  # Within 5% of spot
                    ticker = await self._get_ticker(inst["instrument_name"])
                    if ticker and ticker.get("mark_iv"):
                        atm_options.append({
                            "strike": inst["strike"],
                            "iv": ticker["mark_iv"] * 100,
                            "volume": ticker.get("stats", {}).get("volume", 0),
                            "option_type": inst["option_type"],
                            "expiry": inst.get("expiration_timestamp")
                        })
            
            # Calculate ATM IV (volume weighted)
            total_volume = sum(opt["volume"] for opt in atm_options)
            if total_volume > 0:
                atm_iv = sum(opt["iv"] * opt["volume"] for opt in atm_options) / total_volume
            else:
                atm_iv = sum(opt["iv"] for opt in atm_options) / len(atm_options) if atm_options else 0
                
            # Create IV smile data
            iv_smile = []
            strikes = sorted(set(opt["strike"] for opt in atm_options))
            for strike in strikes:
                strike_options = [opt for opt in atm_options if opt["strike"] == strike]
                if strike_options:
                    avg_iv = sum(opt["iv"] for opt in strike_options) / len(strike_options)
                    iv_smile.append({
                        "strike": strike,
                        "iv": avg_iv,
                        "moneyness": strike / index_price
                    })
                    
            return {
                "currency": currency,
                "period_days": period,
                "spot_price": index_price,
                "atm_iv": atm_iv,
                "iv_smile": iv_smile,
                "num_options": len(atm_options),
                "timestamp": datetime.now()
            }
            
        except Exception as e:
            logger.error(f"Error calculating historical volatility: {e}")
            return {}
    
    async def _get_index_price(self, currency: str) -> float:
        """Get current index price for a currency."""
        try:
            response = await self.client.get(
                f"{self.BASE_URL}/public/get_index_price",
                params={"index_name": f"{currency.lower()}_usd"}
            )
            response.raise_for_status()
            
            data = response.json()
            return data.get("result", {}).get("index_price", 0)
            
        except Exception as e:
            logger.error(f"Error fetching index price: {e}")
            return 0
    
    async def get_futures_data(self, currency: str) -> List[Dict[str, Any]]:
        """Get futures data for a currency.
        
        Args:
            currency: Currency (BTC, ETH)
            
        Returns:
            List of futures data
        """
        try:
            instruments = await self.get_instruments(currency, kind="future")
            
            futures_data = []
            for inst in instruments:
                ticker = await self._get_ticker(inst["instrument_name"])
                if ticker:
                    futures_data.append({
                        "instrument_name": inst["instrument_name"],
                        "expiry": inst.get("expiration_timestamp"),
                        "bid": ticker.get("bid_price", 0),
                        "ask": ticker.get("ask_price", 0),
                        "mark": ticker.get("mark_price", 0),
                        "last": ticker.get("last_price", 0),
                        "volume": ticker.get("stats", {}).get("volume", 0),
                        "open_interest": ticker.get("open_interest", 0),
                        "funding_rate": ticker.get("funding_8h", 0),
                        "index_price": ticker.get("index_price", 0),
                    })
                    
            return futures_data
            
        except Exception as e:
            logger.error(f"Error fetching futures data: {e}")
            return []
    
    async def subscribe_to_ticker(
        self,
        instrument_name: str,
        callback: Callable[[Dict[str, Any]], None]
    ):
        """Subscribe to ticker updates via WebSocket.
        
        Args:
            instrument_name: Instrument to subscribe to
            callback: Function to call with updates
        """
        try:
            async with websockets.connect(self.WS_URL) as websocket:
                # Subscribe to ticker channel
                subscribe_msg = {
                    "jsonrpc": "2.0",
                    "method": "public/subscribe",
                    "params": {
                        "channels": [f"ticker.{instrument_name}.100ms"]
                    },
                    "id": 1
                }
                
                await websocket.send(json.dumps(subscribe_msg))
                logger.info(f"Subscribed to ticker for {instrument_name}")
                
                # Listen for updates
                async for message in websocket:
                    try:
                        data = json.loads(message)
                        if "params" in data and "data" in data["params"]:
                            callback(data["params"]["data"])
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON received: {message}")
                    except Exception as e:
                        logger.error(f"Error processing WebSocket message: {e}")
                        
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    def calculate_iv_surface(
        self,
        option_chain: Dict[float, Dict[str, Any]],
        spot_price: float
    ) -> Dict[str, Any]:
        """Calculate implied volatility surface from option chain.
        
        Args:
            option_chain: Option chain data
            spot_price: Current spot price
            
        Returns:
            IV surface data
        """
        strikes = []
        call_ivs = []
        put_ivs = []
        
        for strike, options in sorted(option_chain.items()):
            if options.get("call") and options["call"].get("iv"):
                strikes.append(strike)
                call_ivs.append(options["call"]["iv"])
                
            if options.get("put") and options["put"].get("iv"):
                if strike not in strikes:
                    strikes.append(strike)
                put_ivs.append(options["put"]["iv"])
                
        # Calculate moneyness
        moneyness = [strike / spot_price for strike in strikes]
        
        # Find ATM IV
        atm_idx = min(range(len(moneyness)), key=lambda i: abs(moneyness[i] - 1.0))
        atm_iv = (call_ivs[atm_idx] + put_ivs[atm_idx]) / 2 if atm_idx < len(put_ivs) else call_ivs[atm_idx]
        
        return {
            "strikes": strikes,
            "moneyness": moneyness,
            "call_ivs": call_ivs,
            "put_ivs": put_ivs,
            "atm_strike": strikes[atm_idx],
            "atm_iv": atm_iv,
            "spot_price": spot_price,
        }