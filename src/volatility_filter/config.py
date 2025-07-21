"""Configuration management for the volatility filter."""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    """Configuration settings for the volatility filter."""

    # WebSocket settings
    ws_host: str = os.getenv("WS_HOST", "localhost")
    ws_port: int = int(os.getenv("WS_PORT", 8765))

    # Database settings
    db_path: str = os.getenv("DB_PATH", "volatility_filter.db")

    # Filter settings
    window_size: int = int(os.getenv("WINDOW_SIZE", 100))
    ar_lag: int = int(os.getenv("AR_LAG", 1))
    vol_threshold: float = float(os.getenv("VOL_THRESHOLD", 0.015))

    # Features
    auto_optimize: bool = os.getenv("AUTO_OPTIMIZE", "false").lower() == "true"
    use_database: bool = os.getenv("USE_DATABASE", "true").lower() == "true"
    broadcast_events: bool = os.getenv("BROADCAST_EVENTS", "true").lower() == "true"

    # Deribit settings
    deribit_ws_url: str = "wss://www.deribit.com/ws/api/v2"
    deribit_rest_url: str = "https://www.deribit.com/api/v2/public"

    # Optimization settings
    optimization_days: int = 7
    backtest_window: int = 14

    # Option settings
    option_currency: str = os.getenv("OPTION_CURRENCY", "BTC")
    option_expiry_days: int = int(os.getenv("OPTION_EXPIRY_DAYS", 60))
    option_strike_range: float = float(os.getenv("OPTION_STRIKE_RANGE", 0.25))
    option_iv_threshold: float = float(os.getenv("OPTION_IV_THRESHOLD", 2.0))
    option_iv_change_threshold: float = float(
        os.getenv("OPTION_IV_CHANGE_THRESHOLD", 0.1)
    )
    option_greeks_interval: int = int(os.getenv("OPTION_GREEKS_INTERVAL", 60))
    option_chain_interval: int = int(os.getenv("OPTION_CHAIN_INTERVAL", 300))
    enable_options: bool = os.getenv("ENABLE_OPTIONS", "false").lower() == "true"

    # Volatility surface settings
    vol_surface_fit_interval: int = int(os.getenv("VOL_SURFACE_FIT_INTERVAL", 60))
    vol_surface_min_options: int = int(os.getenv("VOL_SURFACE_MIN_OPTIONS", 20))
    vol_surface_smoothing: float = float(os.getenv("VOL_SURFACE_SMOOTHING", 0.1))
    vol_surface_moneyness_range: float = float(
        os.getenv("VOL_SURFACE_MONEYNESS_RANGE", 0.5)
    )
    vol_surface_max_ttm: float = float(os.getenv("VOL_SURFACE_MAX_TTM", 2.0))

    @classmethod
    def from_args(cls, args):
        """Create config from command line arguments."""
        config = cls()

        # Override with command line arguments
        if hasattr(args, "window") and args.window:
            config.window_size = args.window
        if hasattr(args, "threshold") and args.threshold:
            config.vol_threshold = args.threshold
        if hasattr(args, "optimize"):
            config.auto_optimize = args.optimize
        if hasattr(args, "no_db"):
            config.use_database = not args.no_db
        if hasattr(args, "no_broadcast"):
            config.broadcast_events = not args.no_broadcast
        if hasattr(args, "db_path") and args.db_path:
            config.db_path = args.db_path
        if hasattr(args, "ws_host") and args.ws_host:
            config.ws_host = args.ws_host
        if hasattr(args, "ws_port") and args.ws_port:
            config.ws_port = args.ws_port
        if hasattr(args, "enable_options"):
            config.enable_options = args.enable_options

        return config
