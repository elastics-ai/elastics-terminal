"""Main volatility filter module."""

import json
import websocket
import numpy as np
from statsmodels.tsa.ar_model import AutoReg
from collections import deque
from datetime import datetime
import threading
import time
from typing import Dict, Any, Optional, List
import logging

from .database import DatabaseManager
from .websocket_server import WebSocketBroadcastServer
from .data_fetcher import HistoricalDataFetcher
from .optimizer import VolatilityFilterOptimizer

logger = logging.getLogger(__name__)


class DeribitVolatilityFilter:
    """Real-time volatility filter for Deribit BTC-PERPETUAL trades."""

    def __init__(
        self,
        window_size: int = 100,
        ar_lag: int = 1,
        vol_threshold: float = 0.02,
        auto_optimize: bool = False,
        use_database: bool = True,
        db_path: str = "volatility_filter.db",
        broadcast_events: bool = True,
        broadcast_host: str = "localhost",
        broadcast_port: int = 8765,
        broadcast_server=None,
    ):
        """
        Initialize the volatility filter.

        Args:
            window_size: Number of trades to keep in rolling window
            ar_lag: Lag for AR model (1 for AR(1))
            vol_threshold: Threshold for volatility filter
            auto_optimize: Whether to automatically optimize threshold on startup
            use_database: Whether to store data in SQLite database
            db_path: Path to SQLite database file
            broadcast_events: Whether to broadcast events via WebSocket
            broadcast_host: Host for WebSocket broadcast server
            broadcast_port: Port for WebSocket broadcast server
            broadcast_server: Existing WebSocketBroadcastServer instance to use
        """
        self.ws_url = "wss://www.deribit.com/ws/api/v2"
        self.window_size = window_size
        self.ar_lag = ar_lag
        self.vol_threshold = vol_threshold
        self.auto_optimize = auto_optimize
        self.use_database = use_database
        self.broadcast_events = broadcast_events

        # Data storage
        self.trades_buffer = deque(maxlen=window_size)
        self.returns_buffer = deque(maxlen=window_size)
        self.filtered_trades = []
        self.current_volatility = 0.0

        # WebSocket connection
        self.ws = None
        self.is_running = False

        # Optimization
        self.optimizer = None
        self.is_optimized = False

        # Database
        self.db_manager = None
        if use_database:
            self.db_manager = DatabaseManager(db_path)
            self.save_config()

        # Broadcast server
        if broadcast_server:
            # Use provided broadcast server
            self.broadcast_server = broadcast_server
        elif broadcast_events:
            # Create new broadcast server
            self.broadcast_server = WebSocketBroadcastServer(
                broadcast_host, broadcast_port
            )
            self.broadcast_server.start()
        else:
            self.broadcast_server = None

        # Statistics tracking
        self.stats_update_interval = 30  # seconds
        self.last_stats_update = 0
        self.total_trades_processed = 0
        self.total_events_detected = 0

        if auto_optimize:
            self.optimize_threshold_on_startup()

        logger.info(
            f"Volatility filter initialized with threshold={vol_threshold:.4f}, "
            f"window={window_size}, ar_lag={ar_lag}"
        )

    def save_config(self):
        """Save current filter configuration to database."""
        if self.db_manager:
            config_data = {
                "config_name": "current",
                "window_size": self.window_size,
                "ar_lag": self.ar_lag,
                "vol_threshold": self.vol_threshold,
                "is_optimized": self.is_optimized,
                "optimization_method": getattr(
                    self.optimizer, "optimization_results", {}
                ).get("method"),
                "optimization_score": getattr(
                    self.optimizer, "optimization_results", {}
                ).get("best_f1_score"),
            }
            self.db_manager.save_filter_config(config_data)

    def on_message(self, ws, message):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(message)

            # Debug logging to see message structure
            if "method" in data:
                logger.debug(f"Received method: {data.get('method')}")

            # Handle instrument query response
            if "id" in data and data.get("id") == 41:
                if "error" in data:
                    logger.error(f"Instrument query error: {data['error']}")
                else:
                    instruments = data.get("result", [])
                    btc_perp = [
                        i
                        for i in instruments
                        if i.get("instrument_name") == "BTC-PERPETUAL"
                    ]
                    if btc_perp:
                        logger.info("BTC-PERPETUAL instrument found")
                        logger.debug(
                            f"BTC-PERPETUAL info: {json.dumps(btc_perp[0], indent=2)}"
                        )
                    else:
                        logger.warning("BTC-PERPETUAL not found in instruments")
                        logger.info(
                            f"Available perpetual instruments: {[i.get('instrument_name') for i in instruments]}"
                        )

            # Handle recent trades response
            elif "id" in data and data.get("id") == 40:
                if "error" in data:
                    logger.error(f"Recent trades error: {data['error']}")
                else:
                    trades = data.get("result", {}).get("trades", [])
                    if trades:
                        logger.info(
                            f"✅ API is working! Received {len(trades)} recent trades"
                        )
                        logger.info(
                            f"Latest trade: Price=${trades[0]['price']}, Amount={trades[0]['amount']}"
                        )
                    else:
                        logger.warning("No recent trades returned")

            # Handle subscription confirmation
            elif "id" in data and data.get("id") == 42:
                if "error" in data:
                    logger.error(f"Subscription error: {data['error']}")
                else:
                    result = data.get("result", [])
                    if result:
                        logger.info(f"Successfully subscribed to channels: {result}")
                        print(
                            f"\n✅ Connected to Deribit! Subscribed to: {result}\nWaiting for trades...\n"
                        )
                    else:
                        logger.warning(
                            "Subscription returned empty result - no channels subscribed"
                        )
                        print(
                            "\n⚠️  WARNING: No channels were subscribed. Checking channel format...\n"
                        )
                    logger.debug(f"Subscription response: {json.dumps(data, indent=2)}")

            # Handle trade data - check for subscription method
            elif data.get("method") == "subscription" and "params" in data:
                params = data["params"]
                channel = params.get("channel", "")

                # Log channel info
                logger.debug(f"Received data from channel: {channel}")

                if (
                    "trades" in channel
                    and "BTC-PERPETUAL" in channel
                    and "data" in params
                ):
                    trades = params["data"]
                    logger.info(
                        f"Received {len(trades)} trades from channel: {channel}"
                    )
                    for trade in trades:
                        self.process_trade(trade)

            # Handle heartbeat
            elif data.get("method") == "heartbeat":
                # Respond to heartbeat to keep connection alive
                if data.get("params", {}).get("type") == "test_request":
                    heartbeat_response = {
                        "jsonrpc": "2.0",
                        "id": data.get("id"),
                        "method": "public/test",
                        "params": {},
                    }
                    ws.send(json.dumps(heartbeat_response))
                    logger.debug("Responded to heartbeat")
            else:
                # Log unhandled messages for debugging
                logger.debug(f"Unhandled message type: {json.dumps(data)[:200]}")

        except Exception as e:
            logger.error(f"Error processing message: {e}")
            logger.debug(f"Problematic message: {message[:500]}")

    def process_trade(self, trade: Dict[str, Any]):
        """Process individual trade and apply volatility filter."""
        try:
            # Extract trade information
            timestamp = trade["timestamp"]
            price = trade["price"]
            amount = trade["amount"]
            direction = trade["direction"]

            # Log incoming trade data to stdout
            trade_time = datetime.fromtimestamp(timestamp / 1000).strftime(
                "%Y-%m-%d %H:%M:%S.%f"
            )[:-3]
            print(
                f"[TRADE] {trade_time} | Price: ${price:,.2f} | Amount: {amount:,.4f} | Direction: {direction}"
            )
        except KeyError as e:
            logger.error(f"Missing field in trade data: {e}")
            logger.debug(f"Trade data structure: {json.dumps(trade, indent=2)}")
            return

        # Add to buffer
        trade_data = {
            "timestamp": timestamp,
            "price": price,
            "amount": amount,
            "direction": direction,
            "datetime": datetime.fromtimestamp(timestamp / 1000),
            "trade_id": trade.get(
                "trade_id", f"{timestamp}_{trade.get('trade_seq', '')}"
            ),
        }
        self.trades_buffer.append(trade_data)
        self.total_trades_processed += 1

        # Broadcast all trades if clients are subscribed
        if self.broadcast_server:
            self.broadcast_server.broadcast_trade(
                {
                    "timestamp": timestamp,
                    "price": price,
                    "amount": amount,
                    "direction": direction,
                }
            )

        # Calculate returns if we have enough data
        log_return = None
        ar_volatility = None

        if len(self.trades_buffer) >= 2:
            # Calculate log returns
            current_price = self.trades_buffer[-1]["price"]
            previous_price = self.trades_buffer[-2]["price"]
            log_return = np.log(current_price / previous_price)
            self.returns_buffer.append(log_return)

            # Apply AR(1) volatility filter if we have enough returns
            if len(self.returns_buffer) >= 20:  # Minimum for AR model
                ar_volatility = self.current_volatility = (
                    self.calculate_current_volatility()
                )
                filtered = ar_volatility > self.vol_threshold

                # Log volatility calculation
                print(
                    f"[VOLATILITY] {trade_time} | Current: {ar_volatility:.6f} | Threshold: {self.vol_threshold:.6f} | Filtered: {filtered}"
                )

                # Broadcast volatility estimate
                if self.broadcast_server and ar_volatility > 0:
                    self.broadcast_server.broadcast_volatility_estimate(
                        {
                            "timestamp": timestamp,
                            "volatility": ar_volatility,
                            "threshold": self.vol_threshold,
                            "price": current_price,
                        }
                    )

                if filtered:
                    trade_data["filtered"] = True
                    trade_data["volatility"] = ar_volatility
                    self.filtered_trades.append(trade_data)
                    self.total_events_detected += 1

                    # Prepare event data for broadcast
                    event_data = {
                        "timestamp": timestamp,
                        "datetime": trade_data["datetime"].isoformat(),
                        "trade_id": trade_data["trade_id"],
                        "price": price,
                        "amount": amount,
                        "direction": direction,
                        "volatility": ar_volatility,
                        "threshold": self.vol_threshold,
                        "excess_ratio": ar_volatility / self.vol_threshold,
                        "window_size": self.window_size,
                        "ar_lag": self.ar_lag,
                    }

                    # Broadcast threshold breach event
                    if self.broadcast_server:
                        self.broadcast_server.broadcast_threshold_breach(event_data)

                    # Store volatility event in database
                    if self.db_manager:
                        db_event_data = {
                            **trade_data,
                            "threshold": self.vol_threshold,
                            "window_size": self.window_size,
                            "ar_lag": self.ar_lag,
                        }
                        self.db_manager.insert_volatility_event(db_event_data)

                    self.on_filtered_trade(trade_data)

        # Store trade in database
        if self.db_manager:
            trade_data["log_return"] = log_return
            trade_data["ar_volatility"] = ar_volatility
            self.db_manager.insert_realtime_trade(trade_data)

        # Periodically broadcast statistics
        current_time = time.time()
        if current_time - self.last_stats_update > self.stats_update_interval:
            self.broadcast_statistics()
            self.last_stats_update = current_time

    def calculate_current_volatility(self) -> float:
        """Calculate current AR(1) based volatility."""
        try:
            # Convert returns to numpy array
            returns = np.array(list(self.returns_buffer))

            # Fit AR(1) model - this happens fresh with every tick
            logger.debug(
                f"Refitting AR({self.ar_lag}) model with {len(returns)} returns"
            )
            model = AutoReg(returns, lags=self.ar_lag, trend="c")
            fitted_model = model.fit()

            # Get residuals
            residuals = fitted_model.resid

            # Calculate rolling volatility (standard deviation of residuals)
            if len(residuals) >= 10:
                recent_vol = np.std(residuals[-10:])
                return recent_vol

        except Exception as e:
            logger.debug(f"AR model error: {e}")

        return 0.0

    def broadcast_statistics(self):
        """Broadcast current statistics to connected clients."""
        if self.broadcast_server:
            stats = self.get_statistics()
            self.broadcast_server.broadcast_statistics(stats)

    def on_filtered_trade(self, trade: Dict[str, Any]):
        """Callback for filtered trades - override this in subclasses."""
        logger.info(
            f"Filtered Trade: {trade['datetime']} | "
            f"Price: ${trade['price']:.2f} | "
            f"Amount: {trade['amount']} | "
            f"Direction: {trade['direction']} | "
            f"Volatility: {trade['volatility']:.4f}"
        )

    def on_error(self, ws, error):
        """Handle WebSocket errors."""
        logger.error(f"WebSocket error: {error}")

    def on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket close."""
        logger.info("WebSocket connection closed")
        self.is_running = False

    def on_open(self, ws):
        """Handle WebSocket open and subscribe to trades channel."""
        logger.info("WebSocket connection opened")

        # Enable heartbeat to keep connection alive
        heartbeat_msg = {
            "jsonrpc": "2.0",
            "id": 9929,
            "method": "public/set_heartbeat",
            "params": {"interval": 10},
        }
        ws.send(json.dumps(heartbeat_msg))
        logger.debug("Heartbeat enabled")

        # First, get instrument info to verify BTC-PERPETUAL exists
        get_instrument_msg = {
            "jsonrpc": "2.0",
            "id": 41,
            "method": "public/get_instruments",
            "params": {"currency": "BTC", "kind": "future", "expired": False},
        }
        ws.send(json.dumps(get_instrument_msg))
        logger.debug("Requesting available instruments...")

        # Wait a moment before subscribing
        import time

        time.sleep(0.5)

        # First, try to get recent trades to verify connectivity
        get_trades_msg = {
            "jsonrpc": "2.0",
            "id": 40,
            "method": "public/get_last_trades_by_instrument",
            "params": {"instrument_name": "BTC-PERPETUAL", "count": 5},
        }
        ws.send(json.dumps(get_trades_msg))
        logger.info("Fetching recent trades to verify API connectivity...")

        # Subscribe to BTC-PERPETUAL trades with the simplest format
        subscribe_msg = {
            "jsonrpc": "2.0",
            "id": 42,
            "method": "public/subscribe",
            "params": {"channels": ["trades.BTC-PERPETUAL.100ms"]},
        }
        ws.send(json.dumps(subscribe_msg))
        logger.info(f"Attempting to subscribe to: trades.BTC-PERPETUAL.100ms")

    def optimize_threshold_on_startup(self):
        """Optimize volatility threshold using historical data before starting."""
        logger.info("Optimizing volatility threshold using historical data...")

        # Fetch historical data
        fetcher = HistoricalDataFetcher()
        end_time = int(time.time() * 1000)
        start_time = end_time - (7 * 24 * 60 * 60 * 1000)  # 7 days of data

        logger.info("Fetching historical trades...")
        trades = fetcher.fetch_trades(
            instrument="BTC-PERPETUAL",
            start_timestamp=start_time,
            end_timestamp=end_time,
        )

        if len(trades) < 1000:
            logger.warning(
                f"Only {len(trades)} trades fetched. Optimization may not be reliable."
            )
            return

        # Store historical trades in database
        if self.db_manager:
            logger.info("Storing historical trades in database...")
            rows_inserted = self.db_manager.insert_historical_trades(trades)
            logger.info(f"Inserted {rows_inserted} historical trades")

        # Optimize threshold
        self.optimizer = VolatilityFilterOptimizer(
            window_size=self.window_size, ar_lag=self.ar_lag
        )

        logger.info(f"Preparing {len(trades)} trades for optimization...")
        self.optimizer.prepare_historical_data(trades)

        logger.info("Running optimization...")
        optimized_threshold = self.optimizer.optimize_threshold(method="grid_search")

        # Backtest the optimized threshold
        metrics = self.optimizer.backtest_threshold(optimized_threshold)

        logger.info(f"\nOptimization Results:")
        logger.info(f"Original threshold: {self.vol_threshold:.4f}")
        logger.info(f"Optimized threshold: {optimized_threshold:.4f}")
        logger.info(f"Backtest metrics:")
        logger.info(f"  - Precision: {metrics['precision']:.3f}")
        logger.info(f"  - Recall: {metrics['recall']:.3f}")
        logger.info(f"  - F1 Score: {metrics['f1_score']:.3f}")
        logger.info(f"  - Accuracy: {metrics['accuracy']:.3f}")

        # Update threshold
        self.vol_threshold = optimized_threshold
        self.is_optimized = True

        # Save configuration to database
        self.save_config()

        # Save results
        self.optimizer.save_optimization_results()
        logger.info(f"Threshold updated to: {self.vol_threshold:.4f}")

    def load_optimized_threshold(
        self, filename: str = "vol_threshold_optimization.pkl"
    ) -> bool:
        """Load previously optimized threshold from file."""
        try:
            import pickle

            with open(filename, "rb") as f:
                data = pickle.load(f)
                self.vol_threshold = data["optimization_results"]["best_threshold"]
                self.is_optimized = True
                logger.info(f"Loaded optimized threshold: {self.vol_threshold:.4f}")
                return True
        except Exception as e:
            logger.error(f"Could not load optimized threshold: {e}")
            return False

    def start(self):
        """Start the WebSocket connection and data processing."""
        self.is_running = True

        # Setup WebSocket
        self.ws = websocket.WebSocketApp(
            self.ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close,
        )

        # Run WebSocket in a separate thread
        ws_thread = threading.Thread(target=self.ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()

        logger.info("Volatility filter started. Press Ctrl+C to stop.")

        try:
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("\nStopping volatility filter...")
            self.stop()

    def stop(self):
        """Stop the WebSocket connection and broadcast server."""
        self.is_running = False
        if self.ws:
            self.ws.close()
        if self.broadcast_server:
            self.broadcast_server.stop()

        # Save final statistics if database is enabled
        if self.db_manager:
            stats = self.get_statistics()
            logger.info(f"Final statistics: {stats}")

    def get_statistics(self) -> Dict[str, Any]:
        """Get current statistics of the filter."""
        total_trades = len(self.trades_buffer)
        filtered_trades = len(self.filtered_trades)

        if total_trades > 0:
            filter_ratio = filtered_trades / total_trades
        else:
            filter_ratio = 0

        stats = {
            "total_trades": total_trades,
            "filtered_trades": filtered_trades,
            "filter_ratio": filter_ratio,
            "current_volatility": self.current_volatility,
            "total_processed": self.total_trades_processed,
            "total_events": self.total_events_detected,
            "overall_ratio": self.total_events_detected / self.total_trades_processed
            if self.total_trades_processed > 0
            else 0,
        }

        # Add database statistics if available
        if self.db_manager:
            db_stats = self.db_manager.get_performance_summary(hours=24)
            stats["db_stats_24h"] = db_stats

        # Add WebSocket server statistics if available
        if self.broadcast_server:
            stats["ws_clients"] = self.broadcast_server.get_client_count()
            stats["ws_subscriptions"] = self.broadcast_server.get_subscription_stats()

        return stats

    def generate_report(self, output_file: str = "volatility_report.html"):
        """Generate an HTML report of filter performance."""
        if not self.db_manager:
            logger.error("Database not enabled. Cannot generate report.")
            return

        # Get data from database
        recent_trades = self.db_manager.get_recent_trades(limit=1000)
        vol_events = self.db_manager.get_volatility_events()
        perf_24h = self.db_manager.get_performance_summary(hours=24)
        perf_7d = self.db_manager.get_performance_summary(hours=168)

        # Create HTML report
        html_content = f"""
        <html>
        <head>
            <title>Volatility Filter Report - {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                table {{ border-collapse: collapse; width: 100%; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
                .metric {{ background-color: #e7f3ff; padding: 10px; margin: 10px 0; }}
                .chart {{ margin: 20px 0; }}
            </style>
        </head>
        <body>
            <h1>Volatility Filter Performance Report</h1>
            <p>Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
            
            <h2>Configuration</h2>
            <div class="metric">
                <p>Window Size: {self.window_size}</p>
                <p>AR Lag: {self.ar_lag}</p>
                <p>Volatility Threshold: {self.vol_threshold:.4f}</p>
                <p>Optimized: {self.is_optimized}</p>
                <p>Database: {self.use_database}</p>
                <p>WebSocket Broadcasting: {self.broadcast_events}</p>
            </div>
            
            <h2>24-Hour Performance</h2>
            <div class="metric">
                <p>Total Trades: {perf_24h["total_trades"]:,}</p>
                <p>Volatility Events: {perf_24h["volatility_events"]:,}</p>
                <p>Filter Ratio: {perf_24h["filter_ratio"]:.2%}</p>
                <p>Average Volatility: {perf_24h["avg_volatility"]:.4f}</p>
                <p>Max Volatility: {perf_24h["max_volatility"]:.4f}</p>
                <p>Min Volatility: {perf_24h["min_volatility"]:.4f}</p>
            </div>
            
            <h2>7-Day Performance</h2>
            <div class="metric">
                <p>Total Trades: {perf_7d["total_trades"]:,}</p>
                <p>Volatility Events: {perf_7d["volatility_events"]:,}</p>
                <p>Filter Ratio: {perf_7d["filter_ratio"]:.2%}</p>
            </div>
            
            <h2>Recent Volatility Events (Last 20)</h2>
            <table>
                <tr>
                    <th>Timestamp</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Direction</th>
                    <th>Volatility</th>
                    <th>Threshold</th>
                    <th>Excess</th>
                </tr>
        """

        for _, event in vol_events.head(20).iterrows():
            excess = event["volatility"] / event["threshold"]
            html_content += f"""
                <tr>
                    <td>{event["datetime"]}</td>
                    <td>${event["price"]:.2f}</td>
                    <td>{event["amount"]}</td>
                    <td>{event["direction"]}</td>
                    <td>{event["volatility"]:.4f}</td>
                    <td>{event["threshold"]:.4f}</td>
                    <td>{excess:.2f}x</td>
                </tr>
            """

        html_content += """
            </table>
            
            <h2>Volatility Distribution</h2>
            <div class="metric">
                <p>Note: For detailed volatility distribution charts, consider using a visualization library.</p>
            </div>
        </body>
        </html>
        """

        with open(output_file, "w") as f:
            f.write(html_content)

        logger.info(f"Report saved to: {output_file}")


def main():
    """Main entry point for the module."""
    import argparse

    parser = argparse.ArgumentParser(description="Deribit Volatility Filter")
    parser.add_argument("--window", type=int, default=100, help="Window size")
    parser.add_argument(
        "--threshold", type=float, default=0.015, help="Volatility threshold"
    )
    parser.add_argument("--optimize", action="store_true", help="Optimize threshold")

    args = parser.parse_args()

    filter = DeribitVolatilityFilter(
        window_size=args.window,
        vol_threshold=args.threshold,
        auto_optimize=args.optimize,
    )

    filter.start()


if __name__ == "__main__":
    main()
