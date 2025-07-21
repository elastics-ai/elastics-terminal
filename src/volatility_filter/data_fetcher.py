"""Module for fetching historical trade data from Deribit."""

import requests
import time
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class HistoricalDataFetcher:
    """Fetch historical trade data from Deribit for backtesting."""

    def __init__(self, base_url: str = "https://www.deribit.com/api/v2/public"):
        self.base_url = base_url
        self.session = requests.Session()
        self.rate_limit_delay = 0.1  # 100ms between requests

    def fetch_trades(
        self,
        instrument: str = "BTC-PERPETUAL",
        start_timestamp: Optional[int] = None,
        end_timestamp: Optional[int] = None,
        count: int = 1000,
        max_trades: int = 10000,
    ) -> List[Dict[str, Any]]:
        """
        Fetch historical trades from Deribit REST API.

        Args:
            instrument: Trading instrument name
            start_timestamp: Start timestamp in milliseconds
            end_timestamp: End timestamp in milliseconds
            count: Number of trades per request (max 1000)
            max_trades: Maximum total trades to fetch

        Returns:
            List of trade dictionaries
        """
        if end_timestamp is None:
            end_timestamp = int(time.time() * 1000)
        if start_timestamp is None:
            start_timestamp = end_timestamp - (24 * 60 * 60 * 1000)  # 24 hours ago

        logger.info(
            f"Fetching trades for {instrument} from {datetime.fromtimestamp(start_timestamp / 1000)} "
            f"to {datetime.fromtimestamp(end_timestamp / 1000)}"
        )

        trades = []
        current_end = end_timestamp
        request_count = 0

        while current_end > start_timestamp and len(trades) < max_trades:
            url = f"{self.base_url}/get_last_trades_by_instrument_and_time"
            params = {
                "instrument_name": instrument,
                "start_timestamp": start_timestamp,
                "end_timestamp": current_end,
                "count": min(count, max_trades - len(trades)),
                "sorting": "desc",
            }

            try:
                # Rate limiting
                time.sleep(self.rate_limit_delay)

                response = self.session.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                if "result" in data and "trades" in data["result"]:
                    new_trades = data["result"]["trades"]
                    if not new_trades:
                        logger.info("No more trades available")
                        break

                    trades.extend(new_trades)
                    request_count += 1

                    # Update end timestamp for next batch
                    current_end = new_trades[-1]["timestamp"] - 1

                    logger.debug(
                        f"Fetched {len(new_trades)} trades (total: {len(trades)})"
                    )

                    # Check if we've reached the start
                    if new_trades[-1]["timestamp"] <= start_timestamp:
                        break
                else:
                    logger.error(f"Unexpected API response: {data}")
                    break

            except requests.exceptions.RequestException as e:
                logger.error(f"Request error: {e}")
                break
            except Exception as e:
                logger.error(f"Error fetching historical data: {e}")
                break

        # Sort trades by timestamp (ascending)
        trades_sorted = sorted(trades, key=lambda x: x["timestamp"])

        # Filter to exact time range
        trades_filtered = [
            t
            for t in trades_sorted
            if start_timestamp <= t["timestamp"] <= end_timestamp
        ]

        logger.info(
            f"Fetched {len(trades_filtered)} trades in {request_count} requests"
        )
        return trades_filtered

    def fetch_trades_by_date_range(
        self,
        instrument: str = "BTC-PERPETUAL",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        """
        Fetch trades for a date range.

        Args:
            instrument: Trading instrument name
            start_date: Start date (datetime)
            end_date: End date (datetime)
            **kwargs: Additional arguments for fetch_trades

        Returns:
            List of trade dictionaries
        """
        if end_date is None:
            end_date = datetime.now()
        if start_date is None:
            start_date = end_date - timedelta(days=1)

        start_timestamp = int(start_date.timestamp() * 1000)
        end_timestamp = int(end_date.timestamp() * 1000)

        return self.fetch_trades(
            instrument=instrument,
            start_timestamp=start_timestamp,
            end_timestamp=end_timestamp,
            **kwargs,
        )

    def fetch_recent_trades(
        self, instrument: str = "BTC-PERPETUAL", hours: int = 24, **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Fetch recent trades for the last N hours.

        Args:
            instrument: Trading instrument name
            hours: Number of hours to look back
            **kwargs: Additional arguments for fetch_trades

        Returns:
            List of trade dictionaries
        """
        end_date = datetime.now()
        start_date = end_date - timedelta(hours=hours)

        return self.fetch_trades_by_date_range(
            instrument=instrument, start_date=start_date, end_date=end_date, **kwargs
        )

    def fetch_instrument_info(
        self, instrument: str = "BTC-PERPETUAL"
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch instrument information.

        Args:
            instrument: Trading instrument name

        Returns:
            Instrument information dictionary or None
        """
        url = f"{self.base_url}/get_instrument"
        params = {"instrument_name": instrument}

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "result" in data:
                return data["result"]
            else:
                logger.error(f"Unexpected API response: {data}")
                return None

        except Exception as e:
            logger.error(f"Error fetching instrument info: {e}")
            return None

    def fetch_order_book(
        self, instrument: str = "BTC-PERPETUAL", depth: int = 10
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch current order book.

        Args:
            instrument: Trading instrument name
            depth: Order book depth

        Returns:
            Order book data or None
        """
        url = f"{self.base_url}/get_order_book"
        params = {"instrument_name": instrument, "depth": depth}

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "result" in data:
                return data["result"]
            else:
                logger.error(f"Unexpected API response: {data}")
                return None

        except Exception as e:
            logger.error(f"Error fetching order book: {e}")
            return None
