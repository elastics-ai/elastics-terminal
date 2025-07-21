"""
Option chain manager with WebSocket support for real-time price feeds and volatility surface fitting.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Set

import numpy as np
import websockets
from scipy.stats import norm

from .database import DatabaseManager
from .option_data_fetcher import OptionDataFetcher
from .vol_surface_fitter import OptionData, VolatilitySurfaceFitter

logger = logging.getLogger(__name__)


class OptionChainManager:
    """
    Manages real-time option chain data via WebSocket subscriptions.
    Fits volatility surfaces periodically and broadcasts updates.
    """

    def __init__(
        self,
        db_manager: DatabaseManager,
        ws_url: str = "wss://www.deribit.com/ws/api/v2",
        currency: str = "BTC",
    ):
        self.db_manager = db_manager
        self.ws_url = ws_url
        self.currency = currency
        self.option_fetcher = OptionDataFetcher()
        self.surface_fitter = VolatilitySurfaceFitter()

        # WebSocket connection
        self.ws = None
        self.subscribed_channels = set()

        # Data storage
        self.option_instruments = {}  # instrument_name -> instrument data
        self.option_prices = {}  # instrument_name -> latest price data
        self.spot_price = None
        self.last_surface_fit = None

        # Callbacks
        self.on_surface_update = None
        self.on_trade = None

        # Configuration
        self.surface_fit_interval = 60  # Fit surface every 60 seconds
        self.last_fit_time = 0
        self.min_options_for_fit = 20  # Minimum options needed for surface fit

        # Tracking
        self.message_count = 0
        self.last_log_time = time.time()

    async def start(self):
        """Start the option chain manager."""
        logger.info(f"Starting Option Chain Manager for {self.currency}")

        # Fetch initial option instruments
        await self.fetch_and_store_instruments()

        # Connect to WebSocket
        await self.connect_websocket()

        # Start periodic tasks
        asyncio.create_task(self.periodic_surface_fitting())
        asyncio.create_task(self.periodic_status_log())

    async def fetch_and_store_instruments(self):
        """Fetch option instruments and store in database."""
        try:
            instruments = self.option_fetcher.fetch_option_instruments(
                self.currency, expired=False
            )

            # Filter for near-term options (e.g., next 2 months)
            cutoff_date = datetime.utcnow() + timedelta(days=60)
            cutoff_timestamp = int(cutoff_date.timestamp() * 1000)

            filtered_instruments = [
                inst
                for inst in instruments
                if inst["expiry_timestamp"] <= cutoff_timestamp
            ]

            # Store in memory
            for inst in filtered_instruments:
                self.option_instruments[inst["instrument_name"]] = inst

            # Store in database
            if filtered_instruments:
                self.db_manager.insert_option_instruments(filtered_instruments)

            logger.info(f"Loaded {len(filtered_instruments)} option instruments")

        except Exception as e:
            logger.error(f"Error fetching option instruments: {e}")

    async def connect_websocket(self):
        """Connect to Deribit WebSocket and subscribe to channels."""
        try:
            self.ws = await websockets.connect(self.ws_url)
            logger.info("Connected to Deribit WebSocket")

            # Subscribe to ticker channels for all options
            await self.subscribe_to_option_tickers()

            # Subscribe to index price
            await self.subscribe_to_index_price()

            # Start message handler
            asyncio.create_task(self.handle_messages())

        except Exception as e:
            logger.error(f"Error connecting to WebSocket: {e}")
            raise

    async def subscribe_to_option_tickers(self):
        """Subscribe to ticker channels for all option instruments."""
        channels = []

        for instrument_name in self.option_instruments.keys():
            channels.append(f"ticker.{instrument_name}.100ms")

        # Subscribe in batches of 100
        batch_size = 100
        for i in range(0, len(channels), batch_size):
            batch = channels[i : i + batch_size]
            await self.subscribe_channels(batch)
            await asyncio.sleep(0.1)  # Rate limiting

        logger.info(f"Subscribed to {len(channels)} option ticker channels")

    async def subscribe_to_index_price(self):
        """Subscribe to index price updates."""
        channel = f"deribit_price_index.{self.currency.lower()}_usd"
        await self.subscribe_channels([channel])

    async def subscribe_channels(self, channels: List[str]):
        """Subscribe to specific channels."""
        if not self.ws:
            return

        msg = {
            "jsonrpc": "2.0",
            "method": "public/subscribe",
            "params": {"channels": channels},
            "id": int(time.time() * 1000),
        }

        await self.ws.send(json.dumps(msg))
        self.subscribed_channels.update(channels)

    async def handle_messages(self):
        """Handle incoming WebSocket messages."""
        try:
            async for message in self.ws:
                self.message_count += 1
                data = json.loads(message)

                if "params" in data:
                    await self.process_notification(data["params"])
                elif "result" in data:
                    # Handle subscription confirmations
                    pass
                elif "error" in data:
                    logger.error(f"WebSocket error: {data['error']}")

        except websockets.exceptions.ConnectionClosed:
            logger.warning("WebSocket connection closed")
            await self.reconnect()
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")

    async def process_notification(self, params: Dict):
        """Process WebSocket notifications."""
        channel = params.get("channel", "")
        data = params.get("data", {})

        if channel.startswith("ticker."):
            await self.process_ticker_update(channel, data)
        elif channel.startswith("deribit_price_index."):
            await self.process_index_update(data)

    async def process_ticker_update(self, channel: str, data: Dict):
        """Process option ticker updates."""
        try:
            instrument_name = data.get("instrument_name")
            if not instrument_name or instrument_name not in self.option_instruments:
                return

            # Extract price data
            price_data = {
                "instrument_name": instrument_name,
                "timestamp": data.get("timestamp"),
                "underlying_price": data.get("underlying_price"),
                "underlying_index": data.get("underlying_index"),
                "mark_price": data.get("mark_price"),
                "mark_iv": data.get("mark_iv"),
                "bid_iv": data.get("bid_iv"),
                "ask_iv": data.get("ask_iv"),
                "best_bid_price": data.get("best_bid_price"),
                "best_ask_price": data.get("best_ask_price"),
                "best_bid_amount": data.get("best_bid_amount"),
                "best_ask_amount": data.get("best_ask_amount"),
                "open_interest": data.get("open_interest"),
                "volume": data.get("stats", {}).get("volume"),
                "greeks": data.get("greeks", {}),
            }

            # Update local cache
            self.option_prices[instrument_name] = price_data

            # Store Greeks in database periodically (not every update)
            if (
                instrument_name not in self.option_prices
                or time.time()
                - self.option_prices[instrument_name].get("last_db_update", 0)
                > 60
            ):
                await self.store_greeks(price_data)
                price_data["last_db_update"] = time.time()

        except Exception as e:
            logger.error(f"Error processing ticker update: {e}")

    async def process_index_update(self, data: Dict):
        """Process index price updates."""
        self.spot_price = data.get("price")

    async def store_greeks(self, price_data: Dict):
        """Store option Greeks in database."""
        try:
            greeks = price_data.get("greeks", {})

            greeks_data = {
                "timestamp": price_data["timestamp"],
                "datetime": datetime.fromtimestamp(price_data["timestamp"] / 1000),
                "instrument_name": price_data["instrument_name"],
                "mark_price": price_data.get("mark_price"),
                "mark_iv": price_data.get("mark_iv"),
                "underlying_price": price_data.get("underlying_price"),
                "delta": greeks.get("delta"),
                "gamma": greeks.get("gamma"),
                "vega": greeks.get("vega"),
                "theta": greeks.get("theta"),
                "rho": greeks.get("rho"),
                "bid_iv": price_data.get("bid_iv"),
                "ask_iv": price_data.get("ask_iv"),
                "bid_price": price_data.get("best_bid_price"),
                "ask_price": price_data.get("best_ask_price"),
                "open_interest": price_data.get("open_interest"),
                "volume_24h": price_data.get("volume"),
            }

            self.db_manager.insert_option_greeks(greeks_data)

        except Exception as e:
            logger.error(f"Error storing Greeks: {e}")

    async def periodic_surface_fitting(self):
        """Periodically fit volatility surface."""
        while True:
            try:
                await asyncio.sleep(self.surface_fit_interval)

                if (
                    len(self.option_prices) >= self.min_options_for_fit
                    and self.spot_price
                ):
                    surface_data = await self.fit_volatility_surface()

                    if surface_data and self.on_surface_update:
                        await self.on_surface_update(surface_data)

            except Exception as e:
                logger.error(f"Error in periodic surface fitting: {e}")

    async def fit_volatility_surface(self) -> Optional[Dict]:
        """Fit volatility surface from current option prices."""
        try:
            # Prepare option data for fitting
            option_data_list = []
            current_time = datetime.utcnow()

            for instrument_name, price_data in self.option_prices.items():
                if not price_data.get("mark_iv") or not price_data.get("mark_price"):
                    continue

                instrument = self.option_instruments.get(instrument_name)
                if not instrument:
                    continue

                # Create OptionData object
                opt_data = OptionData(
                    strike=instrument["strike"],
                    expiry=datetime.fromtimestamp(
                        instrument["expiry_timestamp"] / 1000
                    ),
                    option_type=instrument["option_type"],
                    bid=price_data.get("best_bid_price", 0),
                    ask=price_data.get("best_ask_price", 0),
                    underlying_price=self.spot_price,
                    implied_volatility=price_data["mark_iv"],
                )

                option_data_list.append(opt_data)

            if len(option_data_list) < self.min_options_for_fit:
                logger.warning(
                    f"Insufficient options for surface fit: {len(option_data_list)}"
                )
                return None

            # Fit the surface
            surface_result = self.surface_fitter.fit_surface(
                option_data_list, current_time
            )

            if surface_result:
                # Add metadata
                surface_result["timestamp"] = int(current_time.timestamp() * 1000)
                surface_result["underlying"] = self.currency

                # Store in database
                self.db_manager.insert_volatility_surface_fit(surface_result)

                self.last_surface_fit = surface_result
                self.last_fit_time = time.time()

                logger.info(
                    f"Fitted volatility surface with {surface_result['num_options']} options"
                )
                return surface_result

        except Exception as e:
            logger.error(f"Error fitting volatility surface: {e}")
            return None

    async def periodic_status_log(self):
        """Log status periodically."""
        while True:
            await asyncio.sleep(300)  # Every 5 minutes

            active_options = len(
                [p for p in self.option_prices.values() if p.get("mark_iv")]
            )
            logger.info(
                f"Option Chain Manager Status - Messages: {self.message_count}, "
                f"Active Options: {active_options}, Spot: ${self.spot_price:.2f}"
            )

    async def reconnect(self):
        """Reconnect to WebSocket after disconnection."""
        logger.info("Attempting to reconnect to WebSocket...")
        await asyncio.sleep(5)

        try:
            await self.connect_websocket()
        except Exception as e:
            logger.error(f"Reconnection failed: {e}")
            await asyncio.sleep(30)
            await self.reconnect()

    async def subscribe_to_trades(self, instrument_names: List[str]):
        """Subscribe to trade channels for specific instruments."""
        channels = [f"trades.{name}.100ms" for name in instrument_names]
        await self.subscribe_channels(channels)

    def calculate_black_scholes_iv(
        self,
        option_price: float,
        spot: float,
        strike: float,
        time_to_expiry: float,
        risk_free_rate: float = 0.0,
        option_type: str = "call",
    ) -> Optional[float]:
        """
        Calculate implied volatility using Black-Scholes model.
        Used as fallback when mark_iv is not available.
        """
        try:
            # Implementation of Newton-Raphson method for IV calculation
            # This is a simplified version - production code would be more robust

            if time_to_expiry <= 0 or option_price <= 0:
                return None

            # Initial guess
            iv = 0.3

            for _ in range(50):  # Max iterations
                # Calculate option price with current IV guess
                d1 = (
                    np.log(spot / strike)
                    + (risk_free_rate + 0.5 * iv**2) * time_to_expiry
                ) / (iv * np.sqrt(time_to_expiry))
                d2 = d1 - iv * np.sqrt(time_to_expiry)

                if option_type == "call":
                    theoretical_price = spot * norm.cdf(d1) - strike * np.exp(
                        -risk_free_rate * time_to_expiry
                    ) * norm.cdf(d2)
                else:
                    theoretical_price = strike * np.exp(
                        -risk_free_rate * time_to_expiry
                    ) * norm.cdf(-d2) - spot * norm.cdf(-d1)

                # Calculate vega
                vega = spot * norm.pdf(d1) * np.sqrt(time_to_expiry)

                # Update IV
                price_diff = theoretical_price - option_price
                if abs(price_diff) < 0.0001:
                    return iv

                if vega > 0:
                    iv = iv - price_diff / vega
                    iv = max(0.001, min(5.0, iv))  # Bound IV

            return None

        except Exception as e:
            logger.error(f"Error calculating Black-Scholes IV: {e}")
            return None

    async def stop(self):
        """Stop the option chain manager."""
        if self.ws:
            await self.ws.close()
        logger.info("Option Chain Manager stopped")
