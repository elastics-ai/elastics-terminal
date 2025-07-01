"""Configuration management for the volatility filter."""

import os
from dataclasses import dataclass
from typing import Optional
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
    
    @classmethod
    def from_args(cls, args):
        """Create config from command line arguments."""
        config = cls()
        
        # Override with command line arguments
        if hasattr(args, 'window') and args.window:
            config.window_size = args.window
        if hasattr(args, 'threshold') and args.threshold:
            config.vol_threshold = args.threshold
        if hasattr(args, 'optimize'):
            config.auto_optimize = args.optimize
        if hasattr(args, 'no_db'):
            config.use_database = not args.no_db
        if hasattr(args, 'no_broadcast'):
            config.broadcast_events = not args.no_broadcast
        if hasattr(args, 'db_path') and args.db_path:
            config.db_path = args.db_path
        if hasattr(args, 'ws_host') and args.ws_host:
            config.ws_host = args.ws_host
        if hasattr(args, 'ws_port') and args.ws_port:
            config.ws_port = args.ws_port
            
        return config