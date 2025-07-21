"""
Deribit Volatility Filter Package

A real-time volatility filter for BTC-PERPETUAL trades using AR(1) process.
"""

__version__ = "1.0.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

from .data_fetcher import HistoricalDataFetcher
from .database import DatabaseManager
from .filter import DeribitVolatilityFilter
from .optimizer import VolatilityFilterOptimizer
from .websocket_server import WebSocketBroadcastServer

__all__ = [
    "DeribitVolatilityFilter",
    "VolatilityFilterOptimizer",
    "DatabaseManager",
    "WebSocketBroadcastServer",
    "HistoricalDataFetcher",
]
