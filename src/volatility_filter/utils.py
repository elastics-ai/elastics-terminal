"""Utility functions for the volatility filter."""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def calculate_returns(prices: List[float], method: str = "log") -> List[float]:
    """
    Calculate returns from price series.

    Args:
        prices: List of prices
        method: 'log' for log returns, 'simple' for arithmetic returns

    Returns:
        List of returns
    """
    if len(prices) < 2:
        return []

    prices_array = np.array(prices)

    if method == "log":
        returns = np.log(prices_array[1:] / prices_array[:-1])
    else:  # simple
        returns = (prices_array[1:] - prices_array[:-1]) / prices_array[:-1]

    return returns.tolist()


def calculate_rolling_volatility(returns: List[float], window: int = 20) -> List[float]:
    """
    Calculate rolling volatility.

    Args:
        returns: List of returns
        window: Rolling window size

    Returns:
        List of volatility values
    """
    if len(returns) < window:
        return []

    returns_array = np.array(returns)
    volatilities = []

    for i in range(window, len(returns) + 1):
        vol = np.std(returns_array[i - window : i])
        volatilities.append(vol)

    return volatilities


def format_trade_data(trade: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format trade data for consistent structure.

    Args:
        trade: Raw trade data

    Returns:
        Formatted trade dictionary
    """
    return {
        "timestamp": trade.get("timestamp"),
        "datetime": datetime.fromtimestamp(trade.get("timestamp", 0) / 1000),
        "trade_id": trade.get(
            "trade_id", f"{trade.get('timestamp')}_{trade.get('trade_seq', '')}"
        ),
        "price": float(trade.get("price", 0)),
        "amount": float(trade.get("amount", 0)),
        "direction": trade.get("direction", "unknown"),
        "tick_direction": trade.get("tick_direction", 0),
    }


def calculate_price_statistics(trades: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Calculate price statistics from trades.

    Args:
        trades: List of trade dictionaries

    Returns:
        Dictionary of statistics
    """
    if not trades:
        return {}

    prices = [t.get("price", 0) for t in trades]
    amounts = [t.get("amount", 0) for t in trades]

    # Volume-weighted average price
    vwap = (
        sum(p * a for p, a in zip(prices, amounts)) / sum(amounts)
        if sum(amounts) > 0
        else 0
    )

    return {
        "count": len(trades),
        "min": min(prices),
        "max": max(prices),
        "mean": np.mean(prices),
        "std": np.std(prices),
        "vwap": vwap,
        "total_volume": sum(amounts),
        "total_value": sum(p * a for p, a in zip(prices, amounts)),
    }


def detect_outliers(
    values: List[float], method: str = "iqr", threshold: float = 1.5
) -> List[int]:
    """
    Detect outliers in a series of values.

    Args:
        values: List of values
        method: 'iqr' for interquartile range, 'zscore' for z-score
        threshold: Threshold for outlier detection

    Returns:
        List of outlier indices
    """
    if len(values) < 4:
        return []

    values_array = np.array(values)
    outlier_indices = []

    if method == "iqr":
        q1 = np.percentile(values_array, 25)
        q3 = np.percentile(values_array, 75)
        iqr = q3 - q1
        lower_bound = q1 - threshold * iqr
        upper_bound = q3 + threshold * iqr

        for i, val in enumerate(values_array):
            if val < lower_bound or val > upper_bound:
                outlier_indices.append(i)

    elif method == "zscore":
        mean = np.mean(values_array)
        std = np.std(values_array)

        for i, val in enumerate(values_array):
            z_score = abs((val - mean) / std) if std > 0 else 0
            if z_score > threshold:
                outlier_indices.append(i)

    return outlier_indices


def create_time_buckets(
    trades: List[Dict[str, Any]], bucket_size: str = "1H"
) -> pd.DataFrame:
    """
    Group trades into time buckets.

    Args:
        trades: List of trade dictionaries
        bucket_size: Pandas frequency string (e.g., '1H', '5T', '1D')

    Returns:
        DataFrame with bucketed statistics
    """
    if not trades:
        return pd.DataFrame()

    # Convert to DataFrame
    df = pd.DataFrame(trades)
    df["datetime"] = pd.to_datetime(df["timestamp"], unit="ms")
    df.set_index("datetime", inplace=True)

    # Calculate statistics for each bucket
    buckets = df.resample(bucket_size).agg(
        {"price": ["mean", "min", "max", "std", "count"], "amount": "sum"}
    )

    # Flatten column names
    buckets.columns = ["_".join(col).strip() for col in buckets.columns.values]

    return buckets


def estimate_spread(trades: List[Dict[str, Any]], window: int = 100) -> float:
    """
    Estimate bid-ask spread from trades.

    Args:
        trades: List of trade dictionaries
        window: Number of recent trades to consider

    Returns:
        Estimated spread as percentage
    """
    if len(trades) < 2:
        return 0.0

    recent_trades = trades[-window:] if len(trades) > window else trades

    # Separate buy and sell trades
    buy_prices = [t["price"] for t in recent_trades if t.get("direction") == "buy"]
    sell_prices = [t["price"] for t in recent_trades if t.get("direction") == "sell"]

    if not buy_prices or not sell_prices:
        return 0.0

    # Estimate spread
    avg_buy = np.mean(buy_prices)
    avg_sell = np.mean(sell_prices)
    mid_price = (avg_buy + avg_sell) / 2

    spread = abs(avg_buy - avg_sell) / mid_price if mid_price > 0 else 0

    return spread


def calculate_trade_intensity(
    trades: List[Dict[str, Any]], time_window: int = 300000
) -> List[Tuple[int, int]]:
    """
    Calculate trade intensity over time.

    Args:
        trades: List of trade dictionaries
        time_window: Time window in milliseconds (default: 5 minutes)

    Returns:
        List of (timestamp, count) tuples
    """
    if not trades:
        return []

    # Sort trades by timestamp
    sorted_trades = sorted(trades, key=lambda x: x["timestamp"])

    intensity = []
    current_window_start = sorted_trades[0]["timestamp"]

    while current_window_start <= sorted_trades[-1]["timestamp"]:
        window_end = current_window_start + time_window
        count = sum(
            1
            for t in sorted_trades
            if current_window_start <= t["timestamp"] < window_end
        )

        intensity.append((current_window_start, count))
        current_window_start = window_end

    return intensity


def validate_trade_data(trade: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validate trade data structure.

    Args:
        trade: Trade dictionary to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    required_fields = ["timestamp", "price", "amount", "direction"]

    for field in required_fields:
        if field not in trade:
            return False, f"Missing required field: {field}"

    if not isinstance(trade["timestamp"], (int, float)):
        return False, "Timestamp must be numeric"

    if trade["price"] <= 0:
        return False, "Price must be positive"

    if trade["amount"] <= 0:
        return False, "Amount must be positive"

    if trade["direction"] not in ["buy", "sell"]:
        return False, "Direction must be 'buy' or 'sell'"

    return True, None


def format_number(value: float, decimals: int = 4) -> str:
    """
    Format number for display.

    Args:
        value: Numeric value
        decimals: Number of decimal places

    Returns:
        Formatted string
    """
    if abs(value) >= 1e6:
        return f"{value / 1e6:.{decimals}f}M"
    elif abs(value) >= 1e3:
        return f"{value / 1e3:.{decimals}f}K"
    else:
        return f"{value:.{decimals}f}"
