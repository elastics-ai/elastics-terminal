#!/usr/bin/env python3
"""Main script to run the volatility filter."""

import sys
import os

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
)

import argparse
import logging
from volatility_filter.config import Config
from volatility_filter.filter import DeribitVolatilityFilter

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


def main():
    parser = argparse.ArgumentParser(description="Run Deribit Volatility Filter")
    parser.add_argument(
        "--optimize", action="store_true", help="Optimize threshold before starting"
    )
    parser.add_argument(
        "--window", type=int, help="Window size for rolling calculations"
    )
    parser.add_argument("--threshold", type=float, help="Initial volatility threshold")
    parser.add_argument("--no-db", action="store_true", help="Disable database storage")
    parser.add_argument(
        "--no-broadcast", action="store_true", help="Disable WebSocket broadcast"
    )
    parser.add_argument("--db-path", type=str, help="Database file path")
    parser.add_argument("--ws-host", type=str, help="WebSocket server host")
    parser.add_argument("--ws-port", type=int, help="WebSocket server port")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    # Set logging level based on debug flag
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        logging.getLogger("volatility_filter").setLevel(logging.DEBUG)

    # Create config from environment and arguments
    config = Config.from_args(args)

    # Create and run filter
    filter = DeribitVolatilityFilter(
        window_size=config.window_size,
        ar_lag=config.ar_lag,
        vol_threshold=config.vol_threshold,
        auto_optimize=config.auto_optimize,
        use_database=config.use_database,
        db_path=config.db_path,
        broadcast_events=config.broadcast_events,
        broadcast_host=config.ws_host,
        broadcast_port=config.ws_port,
    )

    print(f"\nStarting Deribit Volatility Filter")
    print(f"Configuration:")
    print(f"  Window Size: {config.window_size}")
    print(f"  AR Lag: {config.ar_lag}")
    print(f"  Threshold: {config.vol_threshold}")
    print(f"  Database: {'Enabled' if config.use_database else 'Disabled'}")
    print(f"  WebSocket: {'Enabled' if config.broadcast_events else 'Disabled'}")

    if config.broadcast_events:
        print(f"  WebSocket URL: ws://{config.ws_host}:{config.ws_port}")
        print(f"\nRun 'python examples/websocket_client.py' to receive events")

    print(f"\nPress Ctrl+C to stop\n")

    try:
        filter.start()
    except KeyboardInterrupt:
        print("\nShutting down...")
        filter.stop()


if __name__ == "__main__":
    main()
