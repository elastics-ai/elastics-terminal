"""Module for fetching option chain data from Deribit."""

import requests
import time
from typing import List, Dict, Any, Optional, Set
import logging
from datetime import datetime, timedelta
import numpy as np

logger = logging.getLogger(__name__)


class OptionDataFetcher:
    """Fetch option chain data from Deribit."""

    def __init__(self, base_url: str = "https://www.deribit.com/api/v2/public"):
        self.base_url = base_url
        self.session = requests.Session()
        self.rate_limit_delay = 0.1  # 100ms between requests
        self.instruments_cache = {}
        self.last_cache_update = 0
        self.cache_duration = 3600  # 1 hour cache for instruments

    def fetch_option_instruments(
        self, currency: str = "BTC", expired: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fetch all option instruments for a currency.

        Args:
            currency: Currency symbol (BTC, ETH)
            expired: Include expired instruments

        Returns:
            List of option instrument dictionaries
        """
        cache_key = f"{currency}_{expired}"
        current_time = time.time()

        # Check cache
        if cache_key in self.instruments_cache:
            if current_time - self.last_cache_update < self.cache_duration:
                return self.instruments_cache[cache_key]

        url = f"{self.base_url}/get_instruments"
        params = {
            "currency": currency,
            "kind": "option",
            "expired": str(expired).lower(),
        }

        try:
            time.sleep(self.rate_limit_delay)
            response = self.session.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "result" in data:
                instruments = data["result"]
                # Parse instrument details
                parsed_instruments = []
                for inst in instruments:
                    parsed = self._parse_instrument(inst)
                    if parsed:
                        parsed_instruments.append(parsed)

                # Update cache
                self.instruments_cache[cache_key] = parsed_instruments
                self.last_cache_update = current_time

                logger.info(
                    f"Fetched {len(parsed_instruments)} option instruments for {currency}"
                )
                return parsed_instruments
            else:
                logger.error(f"Unexpected API response: {data}")
                return []

        except Exception as e:
            logger.error(f"Error fetching option instruments: {e}")
            return []

    def _parse_instrument(self, inst: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parse instrument data into standardized format."""
        try:
            instrument_name = inst["instrument_name"]
            # Parse option type from name (e.g., BTC-29DEC23-45000-C)
            parts = instrument_name.split("-")
            if len(parts) >= 4:
                option_type = "call" if parts[-1] == "C" else "put"
                strike = float(parts[-2])
            else:
                return None

            return {
                "instrument_name": instrument_name,
                "underlying": inst["base_currency"],
                "option_type": option_type,
                "strike": strike,
                "expiry_timestamp": inst["expiration_timestamp"],
                "creation_timestamp": inst.get("creation_timestamp"),
                "tick_size": inst.get("tick_size", 0.0001),
                "taker_commission": inst.get("taker_commission"),
                "maker_commission": inst.get("maker_commission"),
                "contract_size": inst.get("contract_size", 1),
                "is_active": inst.get("is_active", True),
            }
        except Exception as e:
            logger.error(f"Error parsing instrument {inst.get('instrument_name')}: {e}")
            return None

    def fetch_option_chain(
        self, currency: str = "BTC", expiry_dates: List[str] = None
    ) -> Dict[str, Any]:
        """
        Fetch complete option chain for given expiry dates.

        Args:
            currency: Currency symbol
            expiry_dates: List of expiry dates to fetch (DMMMYY format)

        Returns:
            Dictionary with option chain data
        """
        # Get all active instruments
        instruments = self.fetch_option_instruments(currency, expired=False)

        # Filter by expiry dates if provided
        if expiry_dates:
            expiry_timestamps = set()
            for date_str in expiry_dates:
                try:
                    # Parse DMMMYY format
                    dt = datetime.strptime(date_str, "%d%b%y").replace(
                        hour=8
                    )  # 8 AM UTC expiry
                    expiry_timestamps.add(int(dt.timestamp() * 1000))
                except Exception as e:
                    logger.error(f"Error parsing expiry date {date_str}: {e}")

            instruments = [
                i for i in instruments if i["expiry_timestamp"] in expiry_timestamps
            ]

        # Get current index price
        index_price = self.fetch_index_price(currency)

        # Organize by expiry and strike
        chain_data = {
            "currency": currency,
            "index_price": index_price,
            "timestamp": int(time.time() * 1000),
            "expiries": {},
        }

        for inst in instruments:
            expiry_ts = inst["expiry_timestamp"]
            expiry_date = datetime.fromtimestamp(expiry_ts / 1000).strftime("%Y-%m-%d")

            if expiry_date not in chain_data["expiries"]:
                chain_data["expiries"][expiry_date] = {
                    "expiry_timestamp": expiry_ts,
                    "strikes": {},
                }

            strike = inst["strike"]
            if strike not in chain_data["expiries"][expiry_date]["strikes"]:
                chain_data["expiries"][expiry_date]["strikes"][strike] = {
                    "call": None,
                    "put": None,
                }

            chain_data["expiries"][expiry_date]["strikes"][strike][
                inst["option_type"]
            ] = inst

        logger.info(f"Fetched option chain with {len(chain_data['expiries'])} expiries")
        return chain_data

    def fetch_option_order_book(
        self, instrument_name: str, depth: int = 10
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch order book for an option instrument.

        Args:
            instrument_name: Option instrument name
            depth: Order book depth

        Returns:
            Order book data with Greeks
        """
        url = f"{self.base_url}/get_order_book"
        params = {"instrument_name": instrument_name, "depth": depth}

        try:
            time.sleep(self.rate_limit_delay)
            response = self.session.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "result" in data:
                result = data["result"]
                # Extract Greeks and market data
                return {
                    "instrument_name": instrument_name,
                    "timestamp": result.get("timestamp"),
                    "underlying_price": result.get("underlying_price"),
                    "underlying_index": result.get("underlying_index"),
                    "mark_price": result.get("mark_price"),
                    "mark_iv": result.get("mark_iv"),
                    "bid_iv": result.get("bid_iv"),
                    "ask_iv": result.get("ask_iv"),
                    "best_bid_price": result.get("best_bid_price"),
                    "best_ask_price": result.get("best_ask_price"),
                    "best_bid_amount": result.get("best_bid_amount"),
                    "best_ask_amount": result.get("best_ask_amount"),
                    "open_interest": result.get("open_interest"),
                    "volume": result.get("stats", {}).get("volume"),
                    "greeks": result.get("greeks", {}),
                    "bids": result.get("bids", []),
                    "asks": result.get("asks", []),
                }
            else:
                logger.error(f"Unexpected API response: {data}")
                return None

        except Exception as e:
            logger.error(f"Error fetching option order book: {e}")
            return None

    def fetch_option_trades(
        self,
        instrument_name: str,
        start_timestamp: Optional[int] = None,
        end_timestamp: Optional[int] = None,
        count: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Fetch option trades for an instrument.

        Args:
            instrument_name: Option instrument name
            start_timestamp: Start timestamp in milliseconds
            end_timestamp: End timestamp in milliseconds
            count: Number of trades to fetch

        Returns:
            List of option trades
        """
        if end_timestamp is None:
            end_timestamp = int(time.time() * 1000)
        if start_timestamp is None:
            start_timestamp = end_timestamp - (60 * 60 * 1000)  # 1 hour ago

        url = f"{self.base_url}/get_last_trades_by_instrument_and_time"
        params = {
            "instrument_name": instrument_name,
            "start_timestamp": start_timestamp,
            "end_timestamp": end_timestamp,
            "count": count,
            "sorting": "desc",
        }

        try:
            time.sleep(self.rate_limit_delay)
            response = self.session.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "result" in data and "trades" in data["result"]:
                trades = data["result"]["trades"]
                # Add instrument name to each trade
                for trade in trades:
                    trade["instrument_name"] = instrument_name
                return trades
            else:
                logger.error(f"Unexpected API response: {data}")
                return []

        except Exception as e:
            logger.error(f"Error fetching option trades: {e}")
            return []

    def fetch_greeks_for_instruments(
        self, instrument_names: List[str]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Fetch Greeks for multiple option instruments.

        Args:
            instrument_names: List of option instrument names

        Returns:
            Dictionary mapping instrument names to Greeks data
        """
        greeks_data = {}

        for instrument_name in instrument_names:
            order_book = self.fetch_option_order_book(instrument_name, depth=1)
            if order_book and "greeks" in order_book:
                greeks = order_book["greeks"]
                greeks_data[instrument_name] = {
                    "timestamp": order_book["timestamp"],
                    "mark_price": order_book.get("mark_price"),
                    "mark_iv": order_book.get("mark_iv"),
                    "underlying_price": order_book.get("underlying_price"),
                    "delta": greeks.get("delta"),
                    "gamma": greeks.get("gamma"),
                    "vega": greeks.get("vega"),
                    "theta": greeks.get("theta"),
                    "rho": greeks.get("rho"),
                    "bid_iv": order_book.get("bid_iv"),
                    "ask_iv": order_book.get("ask_iv"),
                    "bid_price": order_book.get("best_bid_price"),
                    "ask_price": order_book.get("best_ask_price"),
                    "open_interest": order_book.get("open_interest"),
                    "volume_24h": order_book.get("volume"),
                }

        logger.info(f"Fetched Greeks for {len(greeks_data)} instruments")
        return greeks_data

    def fetch_index_price(self, currency: str = "BTC") -> Optional[float]:
        """
        Fetch current index price for a currency.

        Args:
            currency: Currency symbol

        Returns:
            Current index price
        """
        url = f"{self.base_url}/get_index_price"
        params = {"index_name": f"{currency.lower()}_usd"}

        try:
            time.sleep(self.rate_limit_delay)
            response = self.session.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "result" in data:
                return data["result"]["index_price"]
            else:
                logger.error(f"Unexpected API response: {data}")
                return None

        except Exception as e:
            logger.error(f"Error fetching index price: {e}")
            return None

    def fetch_volatility_index(
        self, currency: str = "BTC", resolution: str = "1h"
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch volatility index history.

        Args:
            currency: Currency symbol
            resolution: Time resolution (1h, 1d, etc.)

        Returns:
            Volatility index data
        """
        url = f"{self.base_url}/get_volatility_index_data"
        end_timestamp = int(time.time() * 1000)
        start_timestamp = end_timestamp - (30 * 24 * 60 * 60 * 1000)  # 30 days

        params = {
            "currency": currency,
            "start_timestamp": start_timestamp,
            "end_timestamp": end_timestamp,
            "resolution": resolution,
        }

        try:
            time.sleep(self.rate_limit_delay)
            response = self.session.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "result" in data:
                return {
                    "currency": currency,
                    "resolution": resolution,
                    "data": data["result"],
                }
            else:
                logger.error(f"Unexpected API response: {data}")
                return None

        except Exception as e:
            logger.error(f"Error fetching volatility index: {e}")
            return None

    def calculate_iv_percentile(
        self, instrument_name: str, current_iv: float, lookback_days: int = 30
    ) -> Optional[float]:
        """
        Calculate IV percentile for an option.

        Args:
            instrument_name: Option instrument name
            current_iv: Current implied volatility
            lookback_days: Number of days to look back

        Returns:
            IV percentile (0-100)
        """
        # This would require historical IV data storage
        # For now, return None as placeholder
        logger.warning("IV percentile calculation requires historical data storage")
        return None

    def detect_iv_anomalies(
        self, chain_data: Dict[str, Any], threshold_std: float = 2.0
    ) -> List[Dict[str, Any]]:
        """
        Detect implied volatility anomalies in option chain.

        Args:
            chain_data: Option chain data
            threshold_std: Number of standard deviations for anomaly detection

        Returns:
            List of detected anomalies
        """
        anomalies = []

        for expiry_date, expiry_data in chain_data["expiries"].items():
            # Collect all IVs for this expiry
            ivs = []
            strikes = []

            for strike, options in expiry_data["strikes"].items():
                for option_type, option_data in options.items():
                    if option_data and "mark_iv" in option_data:
                        ivs.append(option_data["mark_iv"])
                        strikes.append(strike)

            if len(ivs) < 5:  # Need minimum data points
                continue

            # Calculate statistics
            iv_array = np.array(ivs)
            mean_iv = np.mean(iv_array)
            std_iv = np.std(iv_array)

            # Detect anomalies
            for i, (iv, strike) in enumerate(zip(ivs, strikes)):
                z_score = abs((iv - mean_iv) / std_iv) if std_iv > 0 else 0

                if z_score > threshold_std:
                    anomalies.append(
                        {
                            "expiry_date": expiry_date,
                            "strike": strike,
                            "implied_volatility": iv,
                            "mean_iv": mean_iv,
                            "std_iv": std_iv,
                            "z_score": z_score,
                            "timestamp": chain_data["timestamp"],
                        }
                    )

        return anomalies
