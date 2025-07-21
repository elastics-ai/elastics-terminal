#!/usr/bin/env python3
"""Main script to run the volatility filter with option chain integration."""

import sys
import os

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src"))
)

import argparse
import logging
import asyncio
import threading
from volatility_filter.config import Config
from volatility_filter.filter import DeribitVolatilityFilter
from volatility_filter.option_chain_manager import OptionChainManager
from volatility_filter.database import DatabaseManager

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


class CombinedVolatilitySystem:
    """Combined system for perpetual volatility filtering and option chain analysis."""

    def __init__(self, config: Config):
        self.config = config
        self.db_manager = (
            DatabaseManager(config.db_path) if config.use_database else None
        )

        # Create perpetual filter
        self.filter = DeribitVolatilityFilter(
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

        # Create option chain manager if enabled
        self.option_manager = None
        if config.enable_options:
            self.option_manager = OptionChainManager(
                db_manager=self.db_manager, currency=config.option_currency
            )

            # Configure option manager
            self.option_manager.surface_fit_interval = config.vol_surface_fit_interval
            self.option_manager.min_options_for_fit = config.vol_surface_min_options

            # Set callback for surface updates
            self.option_manager.on_surface_update = self.on_surface_update

    async def on_surface_update(self, surface_data):
        """Handle volatility surface updates."""
        if self.filter.broadcast_server:
            # Broadcast the surface data
            self.filter.broadcast_server.broadcast_vol_surface(
                {
                    "surface": surface_data["surface"],
                    "moneyness_grid": surface_data["moneyness_grid"],
                    "ttm_grid": surface_data["ttm_grid"],
                    "spot_price": surface_data["spot_price"],
                    "atm_vol": surface_data.get("atm_vol"),
                    "num_options": surface_data.get("num_options"),
                    "timestamp": surface_data["timestamp"],
                }
            )

        logger.info(
            f"Volatility surface updated with {surface_data.get('num_options', 0)} options"
        )

    def run_option_manager(self):
        """Run option manager in asyncio event loop."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            loop.run_until_complete(self.option_manager.start())
            loop.run_forever()
        except Exception as e:
            logger.error(f"Option manager error: {e}")
        finally:
            loop.close()

    def start(self):
        """Start the combined system."""
        # Start option manager in separate thread if enabled
        if self.option_manager:
            option_thread = threading.Thread(target=self.run_option_manager)
            option_thread.daemon = True
            option_thread.start()
            logger.info("Option chain manager started")

        # Start perpetual filter
        self.filter.start()

    def stop(self):
        """Stop the combined system."""
        self.filter.stop()

        if self.option_manager:
            asyncio.run(self.option_manager.stop())


def main():
    parser = argparse.ArgumentParser(
        description="Run Deribit Volatility Filter with Option Chain Integration"
    )
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
    parser.add_argument(
        "--enable-options", action="store_true", help="Enable option chain monitoring"
    )
    parser.add_argument(
        "--option-currency", type=str, default="BTC", help="Option currency (BTC/ETH)"
    )
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    # Set logging level based on debug flag
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        logging.getLogger("volatility_filter").setLevel(logging.DEBUG)

    # Create config from environment and arguments
    config = Config.from_args(args)

    # Override enable_options if specified
    if args.enable_options:
        config.enable_options = True
    if args.option_currency:
        config.option_currency = args.option_currency

    # Create combined system
    system = CombinedVolatilitySystem(config)

    print(f"\nStarting Deribit Volatility Filter")
    print(f"Configuration:")
    print(f"  Window Size: {config.window_size}")
    print(f"  AR Lag: {config.ar_lag}")
    print(f"  Threshold: {config.vol_threshold}")
    print(f"  Database: {'Enabled' if config.use_database else 'Disabled'}")
    print(f"  WebSocket: {'Enabled' if config.broadcast_events else 'Disabled'}")
    print(f"  Options: {'Enabled' if config.enable_options else 'Disabled'}")

    if config.enable_options:
        print(f"  Option Currency: {config.option_currency}")
        print(f"  Surface Fit Interval: {config.vol_surface_fit_interval}s")
        print(f"  Min Options for Fit: {config.vol_surface_min_options}")

    if config.broadcast_events:
        print(f"  WebSocket URL: ws://{config.ws_host}:{config.ws_port}")
        print(f"\nRun 'python examples/websocket_client.py' to receive events")
        print(
            f"Open 'examples/javascript_client.html' in browser to view volatility surface"
        )

    print(f"\nPress Ctrl+C to stop\n")

    try:
        system.start()
    except KeyboardInterrupt:
        print("\nShutting down...")
        system.stop()


if __name__ == "__main__":
    main()
