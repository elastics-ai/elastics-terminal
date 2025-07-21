#!/usr/bin/env python3
"""
Run the combined volatility filter with option chain integration.

This script runs both the perpetual futures volatility filter and the option
chain filter together, sharing a common WebSocket broadcast server and database.
"""

import argparse
import logging
import sys
import os
import threading
import time
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Initialize Sentry SDK for error tracking
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

from src.volatility_filter.filter import DeribitVolatilityFilter
from src.volatility_filter.option_filter import OptionVolatilityFilter
from src.volatility_filter.config import Config
from src.volatility_filter.database import DatabaseManager
from src.volatility_filter.websocket_server import WebSocketBroadcastServer

# Configure Sentry
sentry_logging = LoggingIntegration(
    level=logging.INFO,        # Capture info and above as breadcrumbs
    event_level=logging.ERROR   # Send errors as events
)

glitchtip_dsn = os.getenv('GLITCHTIP_DSN')
if glitchtip_dsn:
    sentry_sdk.init(
        dsn=glitchtip_dsn,
        integrations=[sentry_logging],
        traces_sample_rate=0.1,  # Capture 10% of transactions for performance monitoring
        environment=os.getenv('NODE_ENV', 'production'),
        release="volatility-filter@1.0.0"
    )
    logger = logging.getLogger(__name__)
    logger.info("GlitchTip error tracking initialized")
else:
    logger = logging.getLogger(__name__)
    logger.warning("GLITCHTIP_DSN not set, error tracking disabled")

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class CombinedVolatilityFilter:
    """Combined filter for both perpetual futures and options."""

    def __init__(self, config: Config):
        self.config = config
        self.futures_filter = None
        self.option_filter = None
        self.broadcast_server = None
        self.db_manager = None
        self.is_running = False

    def initialize(self):
        """Initialize all components."""
        logger.info("Initializing combined volatility filter...")

        # Initialize database if enabled
        if self.config.use_database:
            self.db_manager = DatabaseManager(self.config.db_path)
            logger.info(f"Database initialized at {self.config.db_path}")

        # Initialize shared broadcast server if enabled
        if self.config.broadcast_events:
            self.broadcast_server = WebSocketBroadcastServer(
                host=self.config.ws_host, port=self.config.ws_port
            )
            self.broadcast_server.start()
            logger.info(
                f"WebSocket server started on ws://{self.config.ws_host}:{self.config.ws_port}"
            )

        # Initialize perpetual futures filter
        self.futures_filter = DeribitVolatilityFilter(
            window_size=self.config.window_size,
            ar_lag=self.config.ar_lag,
            vol_threshold=self.config.vol_threshold,
            auto_optimize=self.config.auto_optimize,
            use_database=self.config.use_database,
            db_path=self.config.db_path,
            broadcast_events=self.config.broadcast_events,
            broadcast_host=self.config.ws_host,
            broadcast_port=self.config.ws_port,
            broadcast_server=self.broadcast_server,
        )

        # Initialize option filter if enabled
        if self.config.enable_options:
            self.option_filter = OptionVolatilityFilter(
                currency=self.config.option_currency,
                expiry_days_ahead=self.config.option_expiry_days,
                strike_range_pct=self.config.option_strike_range,
                iv_threshold_std=self.config.option_iv_threshold,
                iv_change_threshold=self.config.option_iv_change_threshold,
                greeks_update_interval=self.config.option_greeks_interval,
                chain_update_interval=self.config.option_chain_interval,
                use_database=self.config.use_database,
                db_path=self.config.db_path,
                broadcast_events=self.config.broadcast_events,
                broadcast_server=self.broadcast_server,  # Share the broadcast server
            )
            logger.info("Option filter initialized")

    def start(self):
        """Start both filters."""
        self.is_running = True

        logger.info("Starting combined volatility filter...")
        print("\n" + "=" * 60)
        print("Combined Volatility Filter Started")
        print("=" * 60)
        print(f"Perpetual Futures: BTC-PERPETUAL")
        print(f"Volatility Threshold: {self.config.vol_threshold:.4f}")
        print(f"Window Size: {self.config.window_size}")

        if self.config.enable_options:
            print(f"\nOptions: {self.config.option_currency} Options")
            print(f"Expiry Range: {self.config.option_expiry_days} days")
            print(f"Strike Range: ±{self.config.option_strike_range * 100:.0f}%")
            print(f"IV Anomaly Threshold: {self.config.option_iv_threshold} std devs")

        print(f"\nWebSocket Server: ws://{self.config.ws_host}:{self.config.ws_port}")
        print(f"Database: {'Enabled' if self.config.use_database else 'Disabled'}")
        print("\nPress Ctrl+C to stop")
        print("=" * 60 + "\n")

        # Start futures filter in main thread
        futures_thread = threading.Thread(target=self._run_futures_filter)
        futures_thread.daemon = True
        futures_thread.start()

        # Start option filter if enabled
        if self.config.enable_options and self.option_filter:
            option_thread = threading.Thread(target=self._run_option_filter)
            option_thread.daemon = True
            option_thread.start()

        # Start statistics display thread
        stats_thread = threading.Thread(target=self._display_statistics)
        stats_thread.daemon = True
        stats_thread.start()

        try:
            # Keep main thread alive
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("\nShutting down...")
            self.stop()

    def _run_futures_filter(self):
        """Run the futures filter."""
        try:
            self.futures_filter.start()
        except Exception as e:
            logger.error(f"Futures filter error: {e}")

    def _run_option_filter(self):
        """Run the option filter."""
        try:
            self.option_filter.start()
        except Exception as e:
            logger.error(f"Option filter error: {e}")

    def _display_statistics(self):
        """Periodically display combined statistics."""
        time.sleep(10)  # Initial delay

        while self.is_running:
            try:
                print(f"\n--- Statistics at {datetime.now().strftime('%H:%M:%S')} ---")

                # Futures statistics
                if self.futures_filter:
                    futures_stats = self.futures_filter.get_statistics()
                    print(f"\nPerpetual Futures:")
                    print(f"  Total trades: {futures_stats['total_processed']:,}")
                    print(f"  Volatility events: {futures_stats['total_events']:,}")
                    print(f"  Filter ratio: {futures_stats['overall_ratio']:.2%}")
                    print(
                        f"  Current volatility: {futures_stats['current_volatility']:.6f}"
                    )

                # Option statistics
                if self.config.enable_options and self.option_filter:
                    option_stats = self.option_filter.get_statistics()
                    print(f"\nOptions:")
                    print(
                        f"  Tracked instruments: {option_stats['tracked_instruments']}"
                    )
                    print(f"  Total trades: {option_stats['total_option_trades']:,}")
                    print(f"  IV anomalies: {option_stats['total_iv_anomalies']}")
                    print(f"  IV changes: {option_stats['total_iv_changes']}")
                    print(f"  Greeks cached: {option_stats['greeks_cached']}")

                # WebSocket statistics
                if self.broadcast_server:
                    print(f"\nWebSocket Server:")
                    print(
                        f"  Connected clients: {self.broadcast_server.get_client_count()}"
                    )
                    subs = self.broadcast_server.get_subscription_stats()
                    if subs:
                        print(f"  Subscriptions: {dict(subs)}")

                # Database statistics
                if self.db_manager:
                    perf_24h = self.db_manager.get_performance_summary(hours=24)
                    print(f"\nDatabase (24h):")
                    print(f"  Perpetual trades: {perf_24h['total_trades']:,}")
                    print(f"  Volatility events: {perf_24h['volatility_events']:,}")

                    if self.config.enable_options:
                        option_events = self.db_manager.get_option_volatility_events(
                            start_time=int((time.time() - 24 * 3600) * 1000)
                        )
                        print(f"  Option events: {len(option_events):,}")

                print("-" * 50)

            except Exception as e:
                logger.error(f"Error displaying statistics: {e}")

            # Wait before next update
            time.sleep(60)  # Update every minute

    def stop(self):
        """Stop all components."""
        self.is_running = False

        # Stop filters
        if self.futures_filter:
            self.futures_filter.stop()

        if self.option_filter:
            self.option_filter.stop()

        # Stop broadcast server if we started it
        if self.broadcast_server and self.futures_filter:
            # Only stop if futures filter didn't create its own
            if (
                not self.futures_filter.broadcast_server
                or self.futures_filter.broadcast_server == self.broadcast_server
            ):
                self.broadcast_server.stop()

        logger.info("Combined volatility filter stopped")

    def generate_report(self, output_file: str = "combined_report.html"):
        """Generate a combined HTML report."""
        if not self.db_manager:
            logger.error("Database not enabled. Cannot generate report.")
            return

        # TODO: Implement combined report generation
        logger.info("Combined report generation not yet implemented")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Run combined volatility filter with option chain integration"
    )

    # Filter parameters
    parser.add_argument(
        "--window", type=int, help="Window size for volatility calculation"
    )
    parser.add_argument("--ar-lag", type=int, help="AR model lag")
    parser.add_argument("--threshold", type=float, help="Volatility threshold")
    parser.add_argument(
        "--optimize", action="store_true", help="Auto-optimize threshold on startup"
    )

    # Option parameters
    parser.add_argument(
        "--enable-options", action="store_true", help="Enable option chain monitoring"
    )
    parser.add_argument(
        "--option-currency", type=str, help="Option currency (BTC, ETH)"
    )
    parser.add_argument(
        "--option-expiry-days", type=int, help="Days ahead to track option expiries"
    )
    parser.add_argument(
        "--option-strike-range",
        type=float,
        help="Strike range percentage (e.g., 0.25 for ±25%)",
    )
    parser.add_argument(
        "--option-iv-threshold", type=float, help="IV anomaly threshold in std devs"
    )

    # Infrastructure parameters
    parser.add_argument("--no-db", action="store_true", help="Disable database storage")
    parser.add_argument(
        "--no-broadcast", action="store_true", help="Disable WebSocket broadcasting"
    )
    parser.add_argument("--db-path", type=str, help="Database file path")
    parser.add_argument("--ws-host", type=str, help="WebSocket server host")
    parser.add_argument("--ws-port", type=int, help="WebSocket server port")

    # Logging
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")

    args = parser.parse_args()

    # Set logging level
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)

    # Create configuration
    config = Config.from_args(args)

    # Override enable_options from command line
    if args.enable_options:
        config.enable_options = True

    # Create and run combined filter
    filter = CombinedVolatilityFilter(config)
    filter.initialize()
    filter.start()


if __name__ == "__main__":
    main()
