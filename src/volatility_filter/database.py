"""Database management module for storing trade data and volatility events."""

import json
import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages SQLite database for storing trade data and volatility events."""

    def __init__(self, db_path="volatility_filter.db"):
        self.db_path = db_path
        self.init_database()
        logger.info(f"Database initialized at {db_path}")

    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(self.db_path, timeout=30)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def init_database(self):
        """Initialize database tables."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Apply strategy builder migration
            self._apply_strategy_builder_migration(cursor)

            # Historical trades table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS historical_trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    trade_id TEXT UNIQUE,
                    price REAL NOT NULL,
                    amount REAL NOT NULL,
                    direction TEXT NOT NULL,
                    tick_direction INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_hist_timestamp
                ON historical_trades(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_hist_datetime
                ON historical_trades(datetime)
            """
            )

            # Real-time trades table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS realtime_trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    trade_id TEXT UNIQUE,
                    price REAL NOT NULL,
                    amount REAL NOT NULL,
                    direction TEXT NOT NULL,
                    tick_direction INTEGER,
                    log_return REAL,
                    ar_volatility REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for realtime trades
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_rt_timestamp
                ON realtime_trades(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_rt_datetime
                ON realtime_trades(datetime)
            """
            )

            # Volatility events table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS volatility_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    trade_id TEXT,
                    price REAL NOT NULL,
                    amount REAL NOT NULL,
                    direction TEXT NOT NULL,
                    volatility REAL NOT NULL,
                    threshold REAL NOT NULL,
                    window_size INTEGER NOT NULL,
                    ar_lag INTEGER NOT NULL,
                    event_type TEXT DEFAULT 'threshold_exceeded',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for volatility events
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_vol_timestamp
                ON volatility_events(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_vol_datetime
                ON volatility_events(datetime)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_vol_type
                ON volatility_events(event_type)
            """
            )

            # Filter configuration table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS filter_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    config_name TEXT UNIQUE NOT NULL,
                    window_size INTEGER NOT NULL,
                    ar_lag INTEGER NOT NULL,
                    vol_threshold REAL NOT NULL,
                    is_optimized BOOLEAN DEFAULT FALSE,
                    optimization_method TEXT,
                    optimization_score REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Performance metrics table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    total_trades INTEGER,
                    filtered_trades INTEGER,
                    filter_ratio REAL,
                    avg_volatility REAL,
                    max_volatility REAL,
                    min_volatility REAL,
                    true_positives INTEGER,
                    false_positives INTEGER,
                    false_negatives INTEGER,
                    true_negatives INTEGER,
                    precision_score REAL,
                    recall_score REAL,
                    f1_score REAL,
                    config_id INTEGER,
                    FOREIGN KEY (config_id) REFERENCES filter_config(id)
                )
            """
            )

            # Option instruments table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS option_instruments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    instrument_name TEXT UNIQUE NOT NULL,
                    underlying TEXT NOT NULL,
                    option_type TEXT NOT NULL CHECK(option_type IN ('call', 'put')),
                    strike REAL NOT NULL,
                    expiry_timestamp BIGINT NOT NULL,
                    expiry_date DATE NOT NULL,
                    creation_timestamp BIGINT,
                    tick_size REAL,
                    taker_commission REAL,
                    maker_commission REAL,
                    contract_size REAL,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for option instruments
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_inst_underlying
                ON option_instruments(underlying)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_inst_expiry
                ON option_instruments(expiry_date)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_inst_strike
                ON option_instruments(strike)
            """
            )

            # Option chains table (snapshots of entire option chain)
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS option_chains (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    underlying TEXT NOT NULL,
                    underlying_price REAL NOT NULL,
                    underlying_index_price REAL,
                    snapshot_data TEXT NOT NULL,  -- JSON blob of full chain
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for option chains
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_chain_timestamp
                ON option_chains(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_chain_underlying
                ON option_chains(underlying)
            """
            )

            # Option trades table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS option_trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    trade_id TEXT UNIQUE,
                    instrument_name TEXT NOT NULL,
                    price REAL NOT NULL,
                    amount REAL NOT NULL,
                    direction TEXT NOT NULL,
                    tick_direction INTEGER,
                    implied_volatility REAL,
                    index_price REAL,
                    underlying_price REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (instrument_name) REFERENCES option_instruments(instrument_name)
                )
            """
            )

            # Create indexes for option trades
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_trade_timestamp
                ON option_trades(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_trade_instrument
                ON option_trades(instrument_name)
            """
            )

            # Option Greeks table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS option_greeks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    instrument_name TEXT NOT NULL,
                    mark_price REAL,
                    mark_iv REAL,
                    underlying_price REAL,
                    delta REAL,
                    gamma REAL,
                    vega REAL,
                    theta REAL,
                    rho REAL,
                    bid_iv REAL,
                    ask_iv REAL,
                    bid_price REAL,
                    ask_price REAL,
                    open_interest REAL,
                    volume_24h REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (instrument_name) REFERENCES option_instruments(instrument_name)
                )
            """
            )

            # Create indexes for option Greeks
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_greeks_timestamp
                ON option_greeks(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_greeks_instrument
                ON option_greeks(instrument_name)
            """
            )

            # Option volatility events table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS option_volatility_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    instrument_name TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    implied_volatility REAL,
                    historical_volatility REAL,
                    iv_change REAL,
                    iv_percentile REAL,
                    underlying_price REAL,
                    strike REAL,
                    days_to_expiry REAL,
                    threshold_type TEXT,
                    threshold_value REAL,
                    event_data TEXT,  -- JSON for additional data
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (instrument_name) REFERENCES option_instruments(instrument_name)
                )
            """
            )

            # Create indexes for option volatility events
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_vol_event_timestamp
                ON option_volatility_events(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_vol_event_type
                ON option_volatility_events(event_type)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_opt_vol_event_instrument
                ON option_volatility_events(instrument_name)
            """
            )

            # Volatility surface fits table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS volatility_surface_fits (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    underlying TEXT NOT NULL,
                    spot_price REAL NOT NULL,
                    surface_data TEXT NOT NULL,  -- JSON blob of surface matrix
                    moneyness_grid TEXT NOT NULL,  -- JSON array of moneyness values
                    ttm_grid TEXT NOT NULL,  -- JSON array of time to maturity values
                    num_options INTEGER,
                    fit_quality REAL,
                    atm_vol REAL,
                    term_structure TEXT,  -- JSON array of [ttm, vol] pairs
                    smile_data TEXT,  -- JSON array of [moneyness, vol] pairs
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for volatility surface fits
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_vol_surface_timestamp
                ON volatility_surface_fits(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_vol_surface_underlying
                ON volatility_surface_fits(underlying)
            """
            )

            # Positions table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS positions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    position_id TEXT UNIQUE NOT NULL,
                    instrument_name TEXT NOT NULL,
                    instrument_type TEXT NOT NULL CHECK(instrument_type IN ('option', 'future', 'spot')),
                    quantity REAL NOT NULL,
                    entry_price REAL NOT NULL,
                    entry_timestamp BIGINT NOT NULL,
                    entry_datetime TIMESTAMP NOT NULL,
                    current_price REAL,
                    current_timestamp BIGINT,
                    underlying_price REAL,
                    mark_iv REAL,
                    delta REAL,
                    gamma REAL,
                    vega REAL,
                    theta REAL,
                    position_delta REAL,  -- quantity * delta * contract_size
                    position_value REAL,  -- quantity * current_price * contract_size
                    pnl REAL,
                    pnl_percent REAL,
                    is_active BOOLEAN DEFAULT TRUE,
                    exit_price REAL,
                    exit_timestamp BIGINT,
                    exit_datetime TIMESTAMP,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (instrument_name) REFERENCES option_instruments(instrument_name)
                )
            """
            )

            # Create indexes for positions
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_pos_position_id
                ON positions(position_id)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_pos_instrument
                ON positions(instrument_name)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_pos_active
                ON positions(is_active)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_pos_entry_timestamp
                ON positions(entry_timestamp)
            """
            )

            # Chat conversations table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    user_id TEXT,
                    title TEXT,
                    use_case TEXT,
                    parent_message_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (parent_message_id) REFERENCES chat_messages(id)
                )
            """
            )

            # Chat messages table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                    content TEXT NOT NULL,
                    metadata TEXT,  -- JSON for additional metadata
                    sql_query TEXT,
                    query_results TEXT,
                    context_snapshot TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
                )
            """
            )

            # Chat analytics table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS chat_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL,
                    use_case TEXT,
                    query_type TEXT,
                    response_time_ms INTEGER,
                    tokens_used INTEGER,
                    user_satisfaction INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
                )
            """
            )

            # Create indexes for chat tables
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_chat_conv_session
                ON chat_conversations(session_id)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_chat_conv_user
                ON chat_conversations(user_id)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_chat_msg_conv
                ON chat_messages(conversation_id)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_chat_analytics_conv
                ON chat_analytics(conversation_id)
            """
            )

            # SQL Modules table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS sql_modules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    sql_query TEXT NOT NULL UNIQUE,
                    query_hash TEXT NOT NULL UNIQUE,
                    tables_used TEXT,  -- JSON array of table names
                    columns_used TEXT,  -- JSON array of column names
                    query_type TEXT,  -- SELECT, INSERT, UPDATE, etc.
                    first_message_id INTEGER,
                    first_conversation_id INTEGER,
                    first_executed_at TIMESTAMP,
                    execution_count INTEGER DEFAULT 0,
                    avg_execution_time_ms REAL,
                    last_execution_time_ms REAL,
                    last_executed_at TIMESTAMP,
                    is_favorite BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (first_message_id) REFERENCES chat_messages(id),
                    FOREIGN KEY (first_conversation_id) REFERENCES chat_conversations(id)
                )
            """
            )

            # SQL Module Executions table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS sql_module_executions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    module_id INTEGER NOT NULL,
                    message_id INTEGER,
                    conversation_id INTEGER,
                    execution_time_ms INTEGER,
                    row_count INTEGER,
                    success BOOLEAN DEFAULT TRUE,
                    error_message TEXT,
                    query_results TEXT,  -- Stores first N rows as JSON
                    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (module_id) REFERENCES sql_modules(id),
                    FOREIGN KEY (message_id) REFERENCES chat_messages(id),
                    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
                )
            """
            )

            # Create indexes for SQL modules
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_sql_modules_hash
                ON sql_modules(query_hash)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_sql_modules_type
                ON sql_modules(query_type)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_sql_modules_favorite
                ON sql_modules(is_favorite)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_sql_module_exec_module
                ON sql_module_executions(module_id)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_sql_module_exec_time
                ON sql_module_executions(executed_at)
            """
            )

            # Portfolio metrics history table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS portfolio_metrics_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    portfolio_value REAL NOT NULL,
                    daily_pnl REAL,
                    daily_return REAL,
                    cumulative_pnl REAL,
                    cumulative_return REAL,
                    annual_return REAL,
                    annual_volatility REAL,
                    max_drawdown REAL,
                    var_95 REAL,
                    cvar_95 REAL,
                    beta REAL,
                    alpha REAL,
                    sharpe_ratio REAL,
                    net_delta REAL,
                    net_gamma REAL,
                    net_vega REAL,
                    net_theta REAL,
                    active_positions INTEGER,
                    active_strategies INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for portfolio metrics history
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_timestamp
                ON portfolio_metrics_history(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_portfolio_metrics_datetime
                ON portfolio_metrics_history(datetime)
            """
            )

            # Portfolio snapshots table for storing complete portfolio state
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS portfolio_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    snapshot_type TEXT NOT NULL CHECK(snapshot_type IN ('daily', 'intraday', 'real_time')),
                    portfolio_data TEXT NOT NULL,  -- JSON blob of complete portfolio state
                    risk_metrics TEXT,  -- JSON blob of risk calculations
                    performance_metrics TEXT,  -- JSON blob of performance stats
                    allocation_data TEXT,  -- JSON blob of asset/strategy allocations
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for portfolio snapshots
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_timestamp
                ON portfolio_snapshots(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_type
                ON portfolio_snapshots(snapshot_type)
            """
            )

            # News feed table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS news_feed (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    news_id TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    summary TEXT,
                    content TEXT,
                    source TEXT NOT NULL,
                    author TEXT,
                    url TEXT,
                    published_at TIMESTAMP NOT NULL,
                    timestamp BIGINT NOT NULL,
                    category TEXT,
                    tags TEXT,  -- JSON array of tags
                    is_critical BOOLEAN DEFAULT FALSE,
                    relevance_score REAL,
                    sentiment_score REAL,
                    impact_score REAL,
                    related_symbols TEXT,  -- JSON array of related symbols
                    is_processed BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for news feed
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_news_feed_timestamp
                ON news_feed(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_news_feed_published
                ON news_feed(published_at)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_news_feed_source
                ON news_feed(source)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_news_feed_critical
                ON news_feed(is_critical)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_news_feed_relevance
                ON news_feed(relevance_score)
            """
            )

            # AI insights table for storing AI-generated trading insights
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS ai_insights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    insight_id TEXT UNIQUE NOT NULL,
                    type TEXT NOT NULL CHECK(type IN ('opportunity', 'risk', 'market_analysis', 'strategy_suggestion')),
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
                    confidence REAL CHECK(confidence >= 0 AND confidence <= 1),
                    suggested_actions TEXT,  -- JSON array of suggested actions
                    related_instruments TEXT,  -- JSON array of related instruments
                    supporting_data TEXT,  -- JSON blob of supporting analysis
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    expiry_timestamp BIGINT,
                    is_acknowledged BOOLEAN DEFAULT FALSE,
                    acknowledged_at TIMESTAMP,
                    user_feedback TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for AI insights
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_ai_insights_timestamp
                ON ai_insights(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_ai_insights_type
                ON ai_insights(type)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_ai_insights_priority
                ON ai_insights(priority)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_ai_insights_acknowledged
                ON ai_insights(is_acknowledged)
            """
            )

            # Risk alerts table for portfolio risk notifications
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS risk_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_id TEXT UNIQUE NOT NULL,
                    type TEXT NOT NULL CHECK(type IN ('var_breach', 'concentration_risk', 'correlation_risk', 'liquidity_risk', 'margin_risk', 'custom')),
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
                    threshold_type TEXT,
                    threshold_value REAL,
                    current_value REAL,
                    breach_percentage REAL,
                    affected_positions TEXT,  -- JSON array of affected position IDs
                    recommended_actions TEXT,  -- JSON array of recommended actions
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    is_resolved BOOLEAN DEFAULT FALSE,
                    resolved_at TIMESTAMP,
                    resolution_notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for risk alerts
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_risk_alerts_timestamp
                ON risk_alerts(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_risk_alerts_type
                ON risk_alerts(type)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_risk_alerts_severity
                ON risk_alerts(severity)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_risk_alerts_resolved
                ON risk_alerts(is_resolved)
            """
            )

            # Portfolio strategies table for tracking strategy performance
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS portfolio_strategies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    strategy_id TEXT UNIQUE NOT NULL,
                    strategy_name TEXT NOT NULL,
                    description TEXT,
                    strategy_type TEXT NOT NULL,
                    allocation_percentage REAL,
                    target_allocation REAL,
                    inception_date DATE NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE,
                    risk_limit REAL,
                    max_drawdown_limit REAL,
                    benchmark TEXT,
                    parameters TEXT,  -- JSON blob of strategy parameters
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for portfolio strategies
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_portfolio_strategies_name
                ON portfolio_strategies(strategy_name)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_portfolio_strategies_active
                ON portfolio_strategies(is_active)
            """
            )

            # Strategy performance table for tracking strategy-specific metrics
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS strategy_performance (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    strategy_id TEXT NOT NULL,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    strategy_value REAL NOT NULL,
                    daily_pnl REAL,
                    daily_return REAL,
                    cumulative_pnl REAL,
                    cumulative_return REAL,
                    annual_return REAL,
                    annual_volatility REAL,
                    max_drawdown REAL,
                    sharpe_ratio REAL,
                    alpha REAL,
                    beta REAL,
                    positions_count INTEGER,
                    active_positions_count INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (strategy_id) REFERENCES portfolio_strategies(strategy_id)
                )
            """
            )

            # Create indexes for strategy performance
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_strategy_performance_strategy
                ON strategy_performance(strategy_id)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_strategy_performance_timestamp
                ON strategy_performance(timestamp)
            """
            )

            # Market indicators table for storing key market metrics
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS market_indicators (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp BIGINT NOT NULL,
                    datetime TIMESTAMP NOT NULL,
                    indicator_name TEXT NOT NULL,
                    value REAL NOT NULL,
                    previous_value REAL,
                    change_percentage REAL,
                    source TEXT,
                    category TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )

            # Create indexes for market indicators
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_market_indicators_timestamp
                ON market_indicators(timestamp)
            """
            )
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_market_indicators_name
                ON market_indicators(indicator_name)
            """
            )

            conn.commit()

    def _apply_strategy_builder_migration(self, cursor):
        """Apply strategy builder database migration."""
        try:
            # Read and execute migration SQL
            migration_path = os.path.join(
                os.path.dirname(__file__), 
                'migrations', 
                'add_strategy_builder_tables.sql'
            )
            
            if os.path.exists(migration_path):
                with open(migration_path, 'r') as f:
                    migration_sql = f.read()
                
                # Execute each statement separately
                statements = migration_sql.split(';')
                for statement in statements:
                    statement = statement.strip()
                    if statement and not statement.startswith('--'):
                        cursor.execute(statement)
                        
                logger.info("Strategy builder migration applied successfully")
            else:
                logger.warning(f"Migration file not found: {migration_path}")
                
        except Exception as e:
            logger.error(f"Error applying strategy builder migration: {e}")
            # Don't raise - continue with normal initialization
    
    def insert_historical_trades(self, trades: List[Dict[str, Any]]) -> int:
        """Bulk insert historical trades."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            inserted = 0

            for trade in trades:
                try:
                    cursor.execute(
                        """
                        INSERT OR IGNORE INTO historical_trades
                        (timestamp, datetime, trade_id, price, amount, direction, tick_direction)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                        (
                            trade["timestamp"],
                            datetime.fromtimestamp(trade["timestamp"] / 1000),
                            trade.get(
                                "trade_id",
                                f"{trade['timestamp']}_{trade.get('trade_seq', '')}",
                            ),
                            trade["price"],
                            trade["amount"],
                            trade["direction"],
                            trade.get("tick_direction", 0),
                        ),
                    )
                    if cursor.rowcount > 0:
                        inserted += 1
                except Exception as e:
                    logger.error(f"Error inserting historical trade: {e}")

            conn.commit()
            logger.info(f"Inserted {inserted} historical trades")
            return inserted

    def insert_realtime_trade(self, trade_data: Dict[str, Any]) -> Optional[int]:
        """Insert a single real-time trade."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO realtime_trades
                    (timestamp, datetime, trade_id, price, amount, direction,
                     tick_direction, log_return, ar_volatility)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        trade_data["timestamp"],
                        trade_data["datetime"],
                        trade_data.get("trade_id", f"{trade_data['timestamp']}"),
                        trade_data["price"],
                        trade_data["amount"],
                        trade_data["direction"],
                        trade_data.get("tick_direction", 0),
                        trade_data.get("log_return"),
                        trade_data.get("ar_volatility"),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting realtime trade: {e}")
                return None

    def insert_volatility_event(self, event_data: Dict[str, Any]) -> Optional[int]:
        """Insert a volatility threshold event."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO volatility_events
                    (timestamp, datetime, trade_id, price, amount, direction,
                     volatility, threshold, window_size, ar_lag, event_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        event_data["timestamp"],
                        event_data["datetime"],
                        event_data.get("trade_id"),
                        event_data["price"],
                        event_data["amount"],
                        event_data["direction"],
                        event_data["volatility"],
                        event_data["threshold"],
                        event_data["window_size"],
                        event_data["ar_lag"],
                        event_data.get("event_type", "threshold_exceeded"),
                    ),
                )

                conn.commit()
                logger.info(
                    f"Volatility event recorded: {event_data['volatility']:.4f} > {event_data['threshold']:.4f}"
                )
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting volatility event: {e}")
                return None

    def save_filter_config(self, config_data: Dict[str, Any]) -> Optional[int]:
        """Save or update filter configuration."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO filter_config
                    (config_name, window_size, ar_lag, vol_threshold,
                     is_optimized, optimization_method, optimization_score, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                    (
                        config_data.get("config_name", "default"),
                        config_data["window_size"],
                        config_data["ar_lag"],
                        config_data["vol_threshold"],
                        config_data.get("is_optimized", False),
                        config_data.get("optimization_method"),
                        config_data.get("optimization_score"),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error saving filter config: {e}")
                return None

    def get_recent_trades(self, table="realtime_trades", limit=1000) -> pd.DataFrame:
        """Get recent trades from database."""
        with self.get_connection() as conn:
            query = f"""
                SELECT * FROM {table}
                ORDER BY timestamp DESC
                LIMIT ?
            """
            df = pd.read_sql_query(query, conn, params=(limit,))
            return df

    def get_volatility_events(self, start_time=None, end_time=None) -> pd.DataFrame:
        """Get volatility events within a time range."""
        with self.get_connection() as conn:
            query = "SELECT * FROM volatility_events"
            params = []

            conditions = []
            if start_time:
                conditions.append("timestamp >= ?")
                params.append(start_time)
            if end_time:
                conditions.append("timestamp <= ?")
                params.append(end_time)

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

            query += " ORDER BY timestamp DESC"

            df = pd.read_sql_query(query, conn, params=params)
            return df

    def get_performance_summary(self, hours=24) -> Dict[str, Any]:
        """Get performance summary for the last N hours."""
        with self.get_connection() as conn:
            cutoff_time = datetime.now() - timedelta(hours=hours)

            # Get trade counts and volatility stats
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_trades,
                    AVG(ar_volatility) as avg_volatility,
                    MAX(ar_volatility) as max_volatility,
                    MIN(ar_volatility) as min_volatility
                FROM realtime_trades
                WHERE datetime >= ?
            """,
                (cutoff_time,),
            )

            trade_stats = cursor.fetchone()

            # Get event counts
            cursor.execute(
                """
                SELECT COUNT(*) as event_count
                FROM volatility_events
                WHERE datetime >= ?
            """,
                (cutoff_time,),
            )

            event_stats = cursor.fetchone()

            return {
                "period_hours": hours,
                "total_trades": trade_stats["total_trades"] or 0,
                "volatility_events": event_stats["event_count"] or 0,
                "avg_volatility": trade_stats["avg_volatility"] or 0,
                "max_volatility": trade_stats["max_volatility"] or 0,
                "min_volatility": trade_stats["min_volatility"] or 0,
                "filter_ratio": (
                    event_stats["event_count"] / trade_stats["total_trades"]
                    if trade_stats["total_trades"] > 0
                    else 0
                ),
            }

    def save_performance_metrics(
        self, metrics: Dict[str, Any], config_id: int
    ) -> Optional[int]:
        """Save performance metrics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO performance_metrics
                    (total_trades, filtered_trades, filter_ratio, avg_volatility,
                     max_volatility, min_volatility, true_positives, false_positives,
                     false_negatives, true_negatives, precision_score, recall_score,
                     f1_score, config_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        metrics.get("total_trades", 0),
                        metrics.get("filtered_trades", 0),
                        metrics.get("filter_ratio", 0),
                        metrics.get("avg_volatility", 0),
                        metrics.get("max_volatility", 0),
                        metrics.get("min_volatility", 0),
                        metrics.get("true_positives", 0),
                        metrics.get("false_positives", 0),
                        metrics.get("false_negatives", 0),
                        metrics.get("true_negatives", 0),
                        metrics.get("precision_score", 0),
                        metrics.get("recall_score", 0),
                        metrics.get("f1_score", 0),
                        config_id,
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error saving performance metrics: {e}")
                return None

    def cleanup_old_data(self, days_to_keep=30) -> int:
        """Remove old data from database."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cutoff_time = datetime.now() - timedelta(days=days_to_keep)
            total_deleted = 0

            # Cleanup each table
            for table in ["historical_trades", "realtime_trades", "volatility_events"]:
                cursor.execute(
                    f"""
                    DELETE FROM {table}
                    WHERE datetime < ?
                """,
                    (cutoff_time,),
                )
                deleted = cursor.rowcount
                total_deleted += deleted
                logger.info(f"Deleted {deleted} old records from {table}")

            conn.commit()
            return total_deleted

    def insert_option_instruments(self, instruments: List[Dict[str, Any]]) -> int:
        """Bulk insert or update option instruments."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            inserted = 0

            for instrument in instruments:
                try:
                    cursor.execute(
                        """
                        INSERT OR REPLACE INTO option_instruments
                        (instrument_name, underlying, option_type, strike,
                         expiry_timestamp, expiry_date, creation_timestamp,
                         tick_size, taker_commission, maker_commission,
                         contract_size, is_active, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    """,
                        (
                            instrument["instrument_name"],
                            instrument["underlying"],
                            instrument["option_type"],
                            instrument["strike"],
                            instrument["expiry_timestamp"],
                            datetime.fromtimestamp(
                                instrument["expiry_timestamp"] / 1000
                            ).date(),
                            instrument.get("creation_timestamp"),
                            instrument.get("tick_size"),
                            instrument.get("taker_commission"),
                            instrument.get("maker_commission"),
                            instrument.get("contract_size", 1),
                            instrument.get("is_active", True),
                        ),
                    )
                    if cursor.rowcount > 0:
                        inserted += 1
                except Exception as e:
                    logger.error(f"Error inserting option instrument: {e}")

            conn.commit()
            logger.info(f"Inserted/updated {inserted} option instruments")
            return inserted

    def insert_option_chain_snapshot(self, chain_data: Dict[str, Any]) -> Optional[int]:
        """Insert a snapshot of the entire option chain."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO option_chains
                    (timestamp, datetime, underlying, underlying_price,
                     underlying_index_price, snapshot_data)
                    VALUES (?, ?, ?, ?, ?, ?)
                """,
                    (
                        chain_data["timestamp"],
                        datetime.fromtimestamp(chain_data["timestamp"] / 1000),
                        chain_data["underlying"],
                        chain_data["underlying_price"],
                        chain_data.get("underlying_index_price"),
                        json.dumps(chain_data["chain_data"]),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting option chain snapshot: {e}")
                return None

    def insert_option_trade(self, trade_data: Dict[str, Any]) -> Optional[int]:
        """Insert a single option trade."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO option_trades
                    (timestamp, datetime, trade_id, instrument_name,
                     price, amount, direction, tick_direction,
                     implied_volatility, index_price, underlying_price)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        trade_data["timestamp"],
                        trade_data["datetime"],
                        trade_data.get(
                            "trade_id",
                            f"{trade_data['timestamp']}_{trade_data['instrument_name']}",
                        ),
                        trade_data["instrument_name"],
                        trade_data["price"],
                        trade_data["amount"],
                        trade_data["direction"],
                        trade_data.get("tick_direction"),
                        trade_data.get("implied_volatility"),
                        trade_data.get("index_price"),
                        trade_data.get("underlying_price"),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting option trade: {e}")
                return None

    def insert_option_greeks(self, greeks_data: Dict[str, Any]) -> Optional[int]:
        """Insert option Greeks data."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO option_greeks
                    (timestamp, datetime, instrument_name, mark_price, mark_iv,
                     underlying_price, delta, gamma, vega, theta, rho,
                     bid_iv, ask_iv, bid_price, ask_price,
                     open_interest, volume_24h)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        greeks_data["timestamp"],
                        greeks_data["datetime"],
                        greeks_data["instrument_name"],
                        greeks_data.get("mark_price"),
                        greeks_data.get("mark_iv"),
                        greeks_data.get("underlying_price"),
                        greeks_data.get("delta"),
                        greeks_data.get("gamma"),
                        greeks_data.get("vega"),
                        greeks_data.get("theta"),
                        greeks_data.get("rho"),
                        greeks_data.get("bid_iv"),
                        greeks_data.get("ask_iv"),
                        greeks_data.get("bid_price"),
                        greeks_data.get("ask_price"),
                        greeks_data.get("open_interest"),
                        greeks_data.get("volume_24h"),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting option Greeks: {e}")
                return None

    def insert_option_volatility_event(
        self, event_data: Dict[str, Any]
    ) -> Optional[int]:
        """Insert an option volatility event."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO option_volatility_events
                    (timestamp, datetime, instrument_name, event_type,
                     implied_volatility, historical_volatility, iv_change,
                     iv_percentile, underlying_price, strike, days_to_expiry,
                     threshold_type, threshold_value, event_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        event_data["timestamp"],
                        event_data["datetime"],
                        event_data["instrument_name"],
                        event_data["event_type"],
                        event_data.get("implied_volatility"),
                        event_data.get("historical_volatility"),
                        event_data.get("iv_change"),
                        event_data.get("iv_percentile"),
                        event_data.get("underlying_price"),
                        event_data.get("strike"),
                        event_data.get("days_to_expiry"),
                        event_data.get("threshold_type"),
                        event_data.get("threshold_value"),
                        json.dumps(event_data.get("additional_data", {})),
                    ),
                )

                conn.commit()
                logger.info(
                    f"Option volatility event recorded: {event_data['event_type']} for {event_data['instrument_name']}"
                )
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting option volatility event: {e}")
                return None

    def get_active_option_instruments(self, underlying: str = "BTC") -> pd.DataFrame:
        """Get all active option instruments for an underlying."""
        with self.get_connection() as conn:
            query = """
                SELECT * FROM option_instruments
                WHERE underlying = ? AND is_active = TRUE
                ORDER BY expiry_date, strike
            """
            df = pd.read_sql_query(query, conn, params=(underlying,))
            return df

    def get_option_chain_by_expiry(
        self, underlying: str, expiry_date: str
    ) -> pd.DataFrame:
        """Get option chain for a specific expiry date."""
        with self.get_connection() as conn:
            query = """
                SELECT oi.*, og.mark_price, og.mark_iv, og.delta, og.gamma,
                       og.vega, og.theta, og.bid_price, og.ask_price,
                       og.open_interest, og.volume_24h
                FROM option_instruments oi
                LEFT JOIN (
                    SELECT instrument_name, MAX(timestamp) as max_ts
                    FROM option_greeks
                    GROUP BY instrument_name
                ) latest ON oi.instrument_name = latest.instrument_name
                LEFT JOIN option_greeks og ON og.instrument_name = latest.instrument_name
                    AND og.timestamp = latest.max_ts
                WHERE oi.underlying = ? AND oi.expiry_date = ?
                ORDER BY oi.strike
            """
            df = pd.read_sql_query(query, conn, params=(underlying, expiry_date))
            return df

    def get_recent_option_trades(
        self, instrument_name: str = None, limit: int = 1000
    ) -> pd.DataFrame:
        """Get recent option trades."""
        with self.get_connection() as conn:
            if instrument_name:
                query = """
                    SELECT * FROM option_trades
                    WHERE instrument_name = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                """
                df = pd.read_sql_query(query, conn, params=(instrument_name, limit))
            else:
                query = """
                    SELECT * FROM option_trades
                    ORDER BY timestamp DESC
                    LIMIT ?
                """
                df = pd.read_sql_query(query, conn, params=(limit,))
            return df

    def get_option_volatility_events(
        self, start_time=None, end_time=None, event_type=None
    ) -> pd.DataFrame:
        """Get option volatility events within a time range."""
        with self.get_connection() as conn:
            query = "SELECT * FROM option_volatility_events"
            params = []
            conditions = []

            if start_time:
                conditions.append("timestamp >= ?")
                params.append(start_time)
            if end_time:
                conditions.append("timestamp <= ?")
                params.append(end_time)
            if event_type:
                conditions.append("event_type = ?")
                params.append(event_type)

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

            query += " ORDER BY timestamp DESC"

            df = pd.read_sql_query(query, conn, params=params)
            return df

    def get_iv_surface_data(
        self, underlying: str = "BTC", timestamp: int = None
    ) -> pd.DataFrame:
        """Get implied volatility surface data."""
        with self.get_connection() as conn:
            if timestamp:
                # Get IV surface at specific timestamp
                query = """
                    SELECT oi.strike, oi.expiry_date, oi.option_type,
                           og.mark_iv, og.bid_iv, og.ask_iv, og.underlying_price
                    FROM option_instruments oi
                    JOIN option_greeks og ON oi.instrument_name = og.instrument_name
                    WHERE oi.underlying = ?
                      AND og.timestamp = (
                          SELECT MAX(timestamp) FROM option_greeks
                          WHERE timestamp <= ? AND instrument_name = oi.instrument_name
                      )
                    ORDER BY oi.expiry_date, oi.strike
                """
                df = pd.read_sql_query(query, conn, params=(underlying, timestamp))
            else:
                # Get latest IV surface
                query = """
                    SELECT oi.strike, oi.expiry_date, oi.option_type,
                           og.mark_iv, og.bid_iv, og.ask_iv, og.underlying_price
                    FROM option_instruments oi
                    JOIN (
                        SELECT instrument_name, MAX(timestamp) as max_ts
                        FROM option_greeks
                        GROUP BY instrument_name
                    ) latest ON oi.instrument_name = latest.instrument_name
                    JOIN option_greeks og ON og.instrument_name = latest.instrument_name
                        AND og.timestamp = latest.max_ts
                    WHERE oi.underlying = ? AND oi.is_active = TRUE
                    ORDER BY oi.expiry_date, oi.strike
                """
                df = pd.read_sql_query(query, conn, params=(underlying,))
            return df

    def insert_volatility_surface_fit(
        self, surface_data: Dict[str, Any]
    ) -> Optional[int]:
        """Insert a volatility surface fit."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO volatility_surface_fits
                    (timestamp, datetime, underlying, spot_price, surface_data,
                     moneyness_grid, ttm_grid, num_options, fit_quality, atm_vol,
                     term_structure, smile_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        surface_data["timestamp"],
                        datetime.fromtimestamp(surface_data["timestamp"] / 1000),
                        surface_data["underlying"],
                        surface_data["spot_price"],
                        json.dumps(surface_data["surface"]),
                        json.dumps(surface_data["moneyness_grid"]),
                        json.dumps(surface_data["ttm_grid"]),
                        surface_data.get("num_options"),
                        surface_data.get("fit_quality"),
                        surface_data.get("atm_vol"),
                        json.dumps(surface_data.get("term_structure", [])),
                        json.dumps(surface_data.get("smile", [])),
                    ),
                )

                conn.commit()
                logger.info(
                    f"Volatility surface fit saved for {surface_data['underlying']}"
                )
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting volatility surface fit: {e}")
                return None

    def get_latest_volatility_surface(
        self, underlying: str = "BTC"
    ) -> Optional[Dict[str, Any]]:
        """Get the latest volatility surface fit."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM volatility_surface_fits
                WHERE underlying = ?
                ORDER BY timestamp DESC
                LIMIT 1
            """,
                (underlying,),
            )

            row = cursor.fetchone()
            if row:
                return {
                    "id": row["id"],
                    "timestamp": row["timestamp"],
                    "datetime": row["datetime"],
                    "underlying": row["underlying"],
                    "spot_price": row["spot_price"],
                    "surface": json.loads(row["surface_data"]),
                    "moneyness_grid": json.loads(row["moneyness_grid"]),
                    "ttm_grid": json.loads(row["ttm_grid"]),
                    "num_options": row["num_options"],
                    "atm_vol": row["atm_vol"],
                    "term_structure": json.loads(row["term_structure"]),
                    "smile": json.loads(row["smile_data"]),
                }
            return None

    def insert_position(self, position_data: Dict[str, Any]) -> Optional[int]:
        """Insert a new position."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO positions
                    (position_id, instrument_name, instrument_type, quantity,
                     entry_price, entry_timestamp, entry_datetime, current_price,
                     current_timestamp, underlying_price, mark_iv, delta, gamma,
                     vega, theta, position_delta, position_value, pnl, pnl_percent,
                     is_active, notes, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                    (
                        position_data["position_id"],
                        position_data["instrument_name"],
                        position_data["instrument_type"],
                        position_data["quantity"],
                        position_data["entry_price"],
                        position_data["entry_timestamp"],
                        datetime.fromtimestamp(position_data["entry_timestamp"] / 1000),
                        position_data.get("current_price"),
                        position_data.get("current_timestamp"),
                        position_data.get("underlying_price"),
                        position_data.get("mark_iv"),
                        position_data.get("delta"),
                        position_data.get("gamma"),
                        position_data.get("vega"),
                        position_data.get("theta"),
                        position_data.get("position_delta"),
                        position_data.get("position_value"),
                        position_data.get("pnl"),
                        position_data.get("pnl_percent"),
                        position_data.get("is_active", True),
                        position_data.get("notes"),
                    ),
                )

                conn.commit()
                logger.info(f"Position created: {position_data['position_id']}")
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting position: {e}")
                return None

    def update_position(self, position_id: str, update_data: Dict[str, Any]) -> bool:
        """Update an existing position."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    UPDATE positions
                    SET current_price = ?, current_timestamp = ?, underlying_price = ?,
                        mark_iv = ?, delta = ?, gamma = ?, vega = ?, theta = ?,
                        position_delta = ?, position_value = ?, pnl = ?, pnl_percent = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE position_id = ? AND is_active = TRUE
                """,
                    (
                        update_data["current_price"],
                        update_data["current_timestamp"],
                        update_data.get("underlying_price"),
                        update_data.get("mark_iv"),
                        update_data.get("delta"),
                        update_data.get("gamma"),
                        update_data.get("vega"),
                        update_data.get("theta"),
                        update_data.get("position_delta"),
                        update_data.get("position_value"),
                        update_data.get("pnl"),
                        update_data.get("pnl_percent"),
                        position_id,
                    ),
                )

                conn.commit()
                return cursor.rowcount > 0
            except Exception as e:
                logger.error(f"Error updating position: {e}")
                return False

    def close_position(
        self, position_id: str, exit_price: float, exit_timestamp: int
    ) -> bool:
        """Close an existing position."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    UPDATE positions
                    SET is_active = FALSE, exit_price = ?, exit_timestamp = ?,
                        exit_datetime = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE position_id = ? AND is_active = TRUE
                """,
                    (
                        exit_price,
                        exit_timestamp,
                        datetime.fromtimestamp(exit_timestamp / 1000),
                        position_id,
                    ),
                )

                conn.commit()
                if cursor.rowcount > 0:
                    logger.info(f"Position closed: {position_id}")
                    return True
                return False
            except Exception as e:
                logger.error(f"Error closing position: {e}")
                return False

    def get_active_positions(self, instrument_type: str = None) -> pd.DataFrame:
        """Get all active positions."""
        with self.get_connection() as conn:
            if instrument_type:
                query = """
                    SELECT * FROM positions
                    WHERE is_active = TRUE AND instrument_type = ?
                    ORDER BY entry_timestamp DESC
                """
                df = pd.read_sql_query(query, conn, params=(instrument_type,))
            else:
                query = """
                    SELECT * FROM positions
                    WHERE is_active = TRUE
                    ORDER BY entry_timestamp DESC
                """
                df = pd.read_sql_query(query, conn)
            return df

    def get_position_by_id(self, position_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific position by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM positions WHERE position_id = ?", (position_id,)
            )
            row = cursor.fetchone()

            if row:
                return dict(row)
            return None

    def get_portfolio_summary(self) -> Dict[str, Any]:
        """Get portfolio summary statistics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Get aggregate statistics
            cursor.execute(
                """
                SELECT
                    COUNT(*) as total_positions,
                    SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_positions,
                    SUM(position_value) as total_value,
                    SUM(position_delta) as total_delta,
                    SUM(pnl) as total_pnl,
                    AVG(pnl_percent) as avg_pnl_percent,
                    SUM(ABS(position_delta)) as total_absolute_delta,
                    SUM(gamma * position_value) as total_gamma_exposure,
                    SUM(vega * position_value) as total_vega_exposure,
                    SUM(theta * position_value) as total_theta_exposure
                FROM positions
                WHERE is_active = TRUE
            """
            )

            summary = cursor.fetchone()

            # Get position breakdown by type
            cursor.execute(
                """
                SELECT instrument_type, COUNT(*) as count, SUM(position_value) as value
                FROM positions
                WHERE is_active = TRUE
                GROUP BY instrument_type
            """
            )

            breakdown = cursor.fetchall()

            return {
                "total_positions": summary["total_positions"] or 0,
                "active_positions": summary["active_positions"] or 0,
                "total_value": summary["total_value"] or 0,
                "total_delta": summary["total_delta"] or 0,
                "total_pnl": summary["total_pnl"] or 0,
                "avg_pnl_percent": summary["avg_pnl_percent"] or 0,
                "total_absolute_delta": summary["total_absolute_delta"] or 0,
                "total_gamma_exposure": summary["total_gamma_exposure"] or 0,
                "total_vega_exposure": summary["total_vega_exposure"] or 0,
                "total_theta_exposure": summary["total_theta_exposure"] or 0,
                "breakdown": {
                    row["instrument_type"]: {
                        "count": row["count"],
                        "value": row["value"],
                    }
                    for row in breakdown
                },
            }

    def insert_bulk_positions(self, positions: List[Dict[str, Any]]) -> int:
        """Bulk insert multiple positions."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            inserted = 0

            for position in positions:
                try:
                    cursor.execute(
                        """
                        INSERT OR IGNORE INTO positions
                        (position_id, instrument_name, instrument_type, quantity,
                         entry_price, entry_timestamp, entry_datetime, current_price,
                         current_timestamp, underlying_price, mark_iv, delta, gamma,
                         vega, theta, position_delta, position_value, pnl, pnl_percent,
                         is_active, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                        (
                            position["position_id"],
                            position["instrument_name"],
                            position["instrument_type"],
                            position["quantity"],
                            position["entry_price"],
                            position["entry_timestamp"],
                            datetime.fromtimestamp(position["entry_timestamp"] / 1000),
                            position.get("current_price"),
                            position.get("current_timestamp"),
                            position.get("underlying_price"),
                            position.get("mark_iv"),
                            position.get("delta"),
                            position.get("gamma"),
                            position.get("vega"),
                            position.get("theta"),
                            position.get("position_delta"),
                            position.get("position_value"),
                            position.get("pnl"),
                            position.get("pnl_percent"),
                            position.get("is_active", True),
                            position.get("notes"),
                        ),
                    )
                    if cursor.rowcount > 0:
                        inserted += 1
                except Exception as e:
                    logger.error(
                        f"Error inserting position {position.get('position_id')}: {e}"
                    )

            conn.commit()
            logger.info(f"Inserted {inserted} positions")
            return inserted

    # Chat-related methods
    def create_chat_conversation(
        self, conversation_data: Dict[str, Any]
    ) -> Optional[int]:
        """Create a new chat conversation."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO chat_conversations
                    (session_id, user_id, title, use_case, parent_message_id)
                    VALUES (?, ?, ?, ?, ?)
                """,
                    (
                        conversation_data.get("session_id"),
                        conversation_data.get("user_id"),
                        conversation_data.get("title", "New Conversation"),
                        conversation_data.get("use_case"),
                        conversation_data.get("parent_message_id"),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error creating chat conversation: {e}")
                return None

    def get_chat_conversation(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get chat conversation by session ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM chat_conversations
                WHERE session_id = ? AND is_active = 1
                ORDER BY created_at DESC
                LIMIT 1
            """,
                (session_id,),
            )

            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def update_chat_conversation(
        self,
        conversation_id: int,
        title: Optional[str] = None,
        use_case: Optional[str] = None,
    ) -> bool:
        """Update chat conversation metadata."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            updates = []
            params = []

            if title is not None:
                updates.append("title = ?")
                params.append(title)

            if use_case is not None:
                updates.append("use_case = ?")
                params.append(use_case)

            if not updates:
                return True

            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(conversation_id)

            query = f"UPDATE chat_conversations SET {', '.join(updates)} WHERE id = ?"

            try:
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount > 0
            except Exception as e:
                logger.error(f"Error updating chat conversation: {e}")
                return False

    def insert_chat_message(self, message_data: Dict[str, Any]) -> Optional[int]:
        """Insert a message to a chat conversation."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO chat_messages
                    (conversation_id, role, content, metadata, sql_query, query_results, context_snapshot)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        message_data.get("conversation_id"),
                        message_data.get("role"),
                        message_data.get("content"),
                        message_data.get("metadata"),
                        message_data.get("sql_query"),
                        message_data.get("query_results"),
                        message_data.get("context_snapshot"),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting chat message: {e}")
                return None

    def add_chat_message(
        self,
        conversation_id: int,
        role: str,
        content: str,
        sql_query: Optional[str] = None,
        query_results: Optional[str] = None,
        context_snapshot: Optional[str] = None,
    ) -> Optional[int]:
        """Add a message to a chat conversation (legacy method for compatibility)."""
        return self.insert_chat_message(
            {
                "conversation_id": conversation_id,
                "role": role,
                "content": content,
                "sql_query": sql_query,
                "query_results": query_results,
                "context_snapshot": context_snapshot,
            }
        )

    def get_chat_messages(
        self, conversation_id: int, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get messages for a chat conversation."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, role, content, metadata, sql_query, query_results, created_at
                FROM chat_messages
                WHERE conversation_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """,
                (conversation_id, limit),
            )

            messages = []
            for row in cursor.fetchall():
                message = dict(row)
                # Parse metadata JSON if present
                if message.get("metadata"):
                    try:
                        message["metadata"] = json.loads(message["metadata"])
                    except (json.JSONDecodeError, TypeError):
                        message["metadata"] = None
                messages.append(message)

            # Return in chronological order
            return list(reversed(messages))

    def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get full chat history for a session."""
        conversation = self.get_chat_conversation(session_id)
        if not conversation:
            return []

        return self.get_chat_messages(conversation["id"])

    def add_chat_analytics(
        self,
        conversation_id: int,
        use_case: str,
        query_type: str,
        response_time_ms: int,
        tokens_used: int,
    ) -> Optional[int]:
        """Add analytics data for a chat interaction."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO chat_analytics
                    (conversation_id, use_case, query_type, response_time_ms, tokens_used)
                    VALUES (?, ?, ?, ?, ?)
                """,
                    (
                        conversation_id,
                        use_case,
                        query_type,
                        response_time_ms,
                        tokens_used,
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error adding chat analytics: {e}")
                return None

    def get_chat_analytics_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get chat analytics summary for the last N hours."""
        with self.get_connection() as conn:
            cutoff_time = datetime.now() - timedelta(hours=hours)

            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT
                    COUNT(DISTINCT conversation_id) as total_conversations,
                    COUNT(*) as total_queries,
                    AVG(response_time_ms) as avg_response_time,
                    SUM(tokens_used) as total_tokens,
                    use_case,
                    COUNT(*) as use_case_count
                FROM chat_analytics
                WHERE created_at >= ?
                GROUP BY use_case
            """,
                (cutoff_time,),
            )

            use_cases = {}
            total_conversations = 0
            total_queries = 0
            avg_response_time = 0
            total_tokens = 0

            for row in cursor.fetchall():
                if row["use_case"]:
                    use_cases[row["use_case"]] = row["use_case_count"]

                # Get aggregates from first row
                if total_conversations == 0:
                    total_conversations = row["total_conversations"]
                    total_queries = row["total_queries"]
                    avg_response_time = row["avg_response_time"] or 0
                    total_tokens = row["total_tokens"] or 0

            return {
                "period_hours": hours,
                "total_conversations": total_conversations,
                "total_queries": total_queries,
                "avg_response_time_ms": avg_response_time,
                "total_tokens": total_tokens,
                "use_case_breakdown": use_cases,
            }

    def get_conversations(
        self,
        user_id: Optional[str] = None,
        use_case: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Get list of conversations with optional filters."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT
                    c.id,
                    c.session_id,
                    c.user_id,
                    c.title,
                    c.use_case,
                    c.parent_message_id,
                    c.created_at,
                    c.updated_at,
                    c.is_active,
                    COUNT(m.id) as message_count,
                    MAX(m.created_at) as last_message_at
                FROM chat_conversations c
                LEFT JOIN chat_messages m ON c.id = m.conversation_id
                WHERE c.is_active = 1
            """

            params = []

            if user_id:
                query += " AND c.user_id = ?"
                params.append(user_id)

            if use_case:
                query += " AND c.use_case = ?"
                params.append(use_case)

            if search_query:
                query += """ AND (c.title LIKE ? OR EXISTS (
                    SELECT 1 FROM chat_messages m2
                    WHERE m2.conversation_id = c.id
                    AND m2.content LIKE ?
                ))"""
                search_pattern = f"%{search_query}%"
                params.extend([search_pattern, search_pattern])

            query += """
                GROUP BY c.id
                ORDER BY MAX(m.created_at) DESC
                LIMIT ? OFFSET ?
            """

            params.extend([limit, offset])

            cursor.execute(query, params)

            conversations = []
            for row in cursor.fetchall():
                conversations.append(dict(row))

            return conversations

    def get_conversation_details(
        self, conversation_id: int
    ) -> Optional[Dict[str, Any]]:
        """Get detailed information about a conversation."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT
                    c.*,
                    COUNT(m.id) as message_count,
                    MIN(m.created_at) as first_message_at,
                    MAX(m.created_at) as last_message_at
                FROM chat_conversations c
                LEFT JOIN chat_messages m ON c.id = m.conversation_id
                WHERE c.id = ?
                GROUP BY c.id
            """,
                (conversation_id,),
            )

            row = cursor.fetchone()
            if row:
                return dict(row)
            return None

    def get_conversation_tree(self, root_conversation_id: int) -> Dict[str, Any]:
        """Get conversation tree starting from a root conversation."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Recursive CTE to get all related conversations
            cursor.execute(
                """
                WITH RECURSIVE conversation_tree AS (
                    -- Base case: the root conversation
                    SELECT
                        c.id,
                        c.session_id,
                        c.title,
                        c.use_case,
                        c.parent_message_id,
                        c.created_at,
                        c.updated_at,
                        0 as depth,
                        COUNT(m.id) as message_count
                    FROM chat_conversations c
                    LEFT JOIN chat_messages m ON c.id = m.conversation_id
                    WHERE c.id = ?
                    GROUP BY c.id

                    UNION ALL

                    -- Recursive case: conversations branched from messages in the tree
                    SELECT
                        c.id,
                        c.session_id,
                        c.title,
                        c.use_case,
                        c.parent_message_id,
                        c.created_at,
                        c.updated_at,
                        t.depth + 1,
                        (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) as message_count
                    FROM chat_conversations c
                    JOIN chat_messages m ON c.parent_message_id = m.id
                    JOIN conversation_tree t ON m.conversation_id = t.id
                )
                SELECT * FROM conversation_tree
                ORDER BY depth, created_at
            """,
                (root_conversation_id,),
            )

            tree_nodes = []
            for row in cursor.fetchall():
                node_dict = dict(row)
                # Get branch info if this is a branch
                if node_dict.get("parent_message_id"):
                    cursor.execute(
                        """
                        SELECT m.content, m.role, c.title as parent_conversation_title
                        FROM chat_messages m
                        JOIN chat_conversations c ON m.conversation_id = c.id
                        WHERE m.id = ?
                        """,
                        (node_dict["parent_message_id"],),
                    )
                    branch_info = cursor.fetchone()
                    if branch_info:
                        node_dict["branch_from_message"] = dict(branch_info)
                tree_nodes.append(node_dict)

            # Build hierarchical structure
            return self._build_conversation_tree(tree_nodes)

    def _build_conversation_tree(self, nodes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build hierarchical tree structure from flat list of nodes."""
        if not nodes:
            return {}

        # Create a map of nodes by ID
        node_map = {node["id"]: {**node, "children": []} for node in nodes}

        # Root node (depth 0)
        root = None

        # Build parent-child relationships by checking parent_message_id relationships
        with self.get_connection() as conn:
            cursor = conn.cursor()

            for node in nodes:
                if node["depth"] == 0:
                    root = node_map[node["id"]]
                elif node["parent_message_id"]:
                    # Find which conversation contains the parent message
                    cursor.execute(
                        "SELECT conversation_id FROM chat_messages WHERE id = ?",
                        (node["parent_message_id"],),
                    )
                    result = cursor.fetchone()
                    if result and result["conversation_id"] in node_map:
                        parent_conv_id = result["conversation_id"]
                        node_map[parent_conv_id]["children"].append(
                            node_map[node["id"]]
                        )

        return root or {}

    def delete_conversation(self, conversation_id: int) -> bool:
        """Soft delete a conversation."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    UPDATE chat_conversations
                    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """,
                    (conversation_id,),
                )

                conn.commit()
                return cursor.rowcount > 0
            except Exception as e:
                logger.error(f"Error deleting conversation: {e}")
                return False

    def update_conversation_title(self, conversation_id: int, title: str) -> bool:
        """Update conversation title."""
        return self.update_chat_conversation(conversation_id, title=title)

    # SQL Modules methods
    def create_or_update_sql_module(
        self,
        sql_query: str,
        message_id: int,
        conversation_id: int,
        execution_time_ms: int,
        row_count: int,
        query_results: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> Optional[int]:
        """Create or update a SQL module from an executed query."""
        import hashlib
        import re

        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Generate query hash
            normalized_query = re.sub(r"\s+", " ", sql_query.strip().upper())
            query_hash = hashlib.md5(normalized_query.encode()).hexdigest()

            # Extract query type
            query_type = normalized_query.split()[0] if normalized_query else "UNKNOWN"

            # Extract table names (simple regex approach)
            table_pattern = r"FROM\s+(\w+)|JOIN\s+(\w+)|INTO\s+(\w+)|UPDATE\s+(\w+)"
            tables = set()
            for match in re.finditer(table_pattern, normalized_query):
                for group in match.groups():
                    if group:
                        tables.add(group.lower())

            tables_json = json.dumps(list(tables)) if tables else None

            try:
                # Check if module exists
                cursor.execute(
                    "SELECT id, execution_count, avg_execution_time_ms FROM sql_modules WHERE query_hash = ?",
                    (query_hash,),
                )
                existing = cursor.fetchone()

                if existing:
                    # Update existing module
                    module_id = existing["id"]
                    exec_count = existing["execution_count"] + 1
                    avg_time = (
                        existing["avg_execution_time_ms"] * existing["execution_count"]
                        + execution_time_ms
                    ) / exec_count

                    cursor.execute(
                        """
                        UPDATE sql_modules
                        SET execution_count = ?,
                            avg_execution_time_ms = ?,
                            last_execution_time_ms = ?,
                            last_executed_at = CURRENT_TIMESTAMP,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """,
                        (exec_count, avg_time, execution_time_ms, module_id),
                    )
                else:
                    # Create new module
                    cursor.execute(
                        """
                        INSERT INTO sql_modules
                        (title, description, sql_query, query_hash, tables_used,
                         query_type, first_message_id, first_conversation_id,
                         first_executed_at, execution_count, avg_execution_time_ms,
                         last_execution_time_ms, last_executed_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1, ?, ?, CURRENT_TIMESTAMP)
                    """,
                        (
                            f"{query_type} Query",  # Basic title, will be updated later
                            None,  # Description will be generated later
                            sql_query,
                            query_hash,
                            tables_json,
                            query_type,
                            message_id,
                            conversation_id,
                            execution_time_ms,
                            execution_time_ms,
                        ),
                    )
                    module_id = cursor.lastrowid

                # Record execution
                cursor.execute(
                    """
                    INSERT INTO sql_module_executions
                    (module_id, message_id, conversation_id, execution_time_ms,
                     row_count, success, error_message, query_results)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        module_id,
                        message_id,
                        conversation_id,
                        execution_time_ms,
                        row_count,
                        error_message is None,
                        error_message,
                        query_results,
                    ),
                )

                conn.commit()
                return module_id

            except Exception as e:
                logger.error(f"Error creating/updating SQL module: {e}")
                return None

    def get_sql_modules(
        self,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None,
        query_type: Optional[str] = None,
        favorites_only: bool = False,
    ) -> List[Dict[str, Any]]:
        """Get SQL modules with optional filters."""
        with self.get_connection() as conn:
            query = "SELECT * FROM sql_modules WHERE 1=1"
            params = []

            if search:
                query += " AND (title LIKE ? OR description LIKE ? OR sql_query LIKE ?)"
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern, search_pattern])

            if query_type:
                query += " AND query_type = ?"
                params.append(query_type)

            if favorites_only:
                query += " AND is_favorite = TRUE"

            query += " ORDER BY last_executed_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])

            df = pd.read_sql_query(query, conn, params=params)

            # Parse JSON fields
            modules = []
            for _, row in df.iterrows():
                module = dict(row)
                if module.get("tables_used"):
                    module["tables_used"] = json.loads(module["tables_used"])
                if module.get("columns_used"):
                    module["columns_used"] = json.loads(module["columns_used"])
                modules.append(module)

            return modules

    def get_sql_module_by_id(self, module_id: int) -> Optional[Dict[str, Any]]:
        """Get a specific SQL module by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sql_modules WHERE id = ?", (module_id,))
            row = cursor.fetchone()

            if row:
                module = dict(row)
                if module.get("tables_used"):
                    module["tables_used"] = json.loads(module["tables_used"])
                if module.get("columns_used"):
                    module["columns_used"] = json.loads(module["columns_used"])
                return module
            return None

    def get_sql_module_executions(
        self, module_id: int, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get execution history for a SQL module."""
        with self.get_connection() as conn:
            query = """
                SELECT e.*, c.title as conversation_title, c.session_id
                FROM sql_module_executions e
                LEFT JOIN chat_conversations c ON e.conversation_id = c.id
                WHERE e.module_id = ?
                ORDER BY e.executed_at DESC
                LIMIT ?
            """
            df = pd.read_sql_query(query, conn, params=(module_id, limit))

            executions = []
            for _, row in df.iterrows():
                execution = dict(row)
                if execution.get("query_results"):
                    try:
                        execution["query_results"] = json.loads(
                            execution["query_results"]
                        )
                    except (json.JSONDecodeError, TypeError):
                        pass
                executions.append(execution)

            return executions

    def update_sql_module_metadata(
        self,
        module_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
        is_favorite: Optional[bool] = None,
    ) -> bool:
        """Update SQL module metadata."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            updates = []
            params = []

            if title is not None:
                updates.append("title = ?")
                params.append(title)

            if description is not None:
                updates.append("description = ?")
                params.append(description)

            if is_favorite is not None:
                updates.append("is_favorite = ?")
                params.append(is_favorite)

            if not updates:
                return True

            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(module_id)

            query = f"UPDATE sql_modules SET {', '.join(updates)} WHERE id = ?"

            try:
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount > 0
            except Exception as e:
                logger.error(f"Error updating SQL module: {e}")
                return False

    def get_sql_module_stats(self) -> Dict[str, Any]:
        """Get overall SQL module statistics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Total modules and executions
            cursor.execute(
                """
                SELECT
                    COUNT(DISTINCT id) as total_modules,
                    SUM(execution_count) as total_executions,
                    AVG(avg_execution_time_ms) as avg_execution_time,
                    COUNT(DISTINCT CASE WHEN is_favorite THEN id END) as favorite_count
                FROM sql_modules
            """
            )

            stats = dict(cursor.fetchone())

            # Modules by type
            cursor.execute(
                """
                SELECT query_type, COUNT(*) as count
                FROM sql_modules
                GROUP BY query_type
            """
            )

            stats["by_type"] = {
                row["query_type"]: row["count"] for row in cursor.fetchall()
            }

            # Most used tables
            cursor.execute(
                """
                SELECT tables_used, execution_count
                FROM sql_modules
                WHERE tables_used IS NOT NULL
            """
            )

            table_counts = {}
            for row in cursor.fetchall():
                tables = json.loads(row["tables_used"])
                for table in tables:
                    table_counts[table] = (
                        table_counts.get(table, 0) + row["execution_count"]
                    )

            stats["most_used_tables"] = sorted(
                table_counts.items(), key=lambda x: x[1], reverse=True
            )[:10]

            return stats

    # Portfolio metrics methods
    def insert_portfolio_metrics(self, metrics_data: Dict[str, Any]) -> Optional[int]:
        """Insert portfolio metrics snapshot."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO portfolio_metrics_history
                    (timestamp, datetime, portfolio_value, daily_pnl, daily_return,
                     cumulative_pnl, cumulative_return, annual_return, annual_volatility,
                     max_drawdown, var_95, cvar_95, beta, alpha, sharpe_ratio,
                     net_delta, net_gamma, net_vega, net_theta, active_positions, active_strategies)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        metrics_data["timestamp"],
                        datetime.fromtimestamp(metrics_data["timestamp"] / 1000),
                        metrics_data["portfolio_value"],
                        metrics_data.get("daily_pnl"),
                        metrics_data.get("daily_return"),
                        metrics_data.get("cumulative_pnl"),
                        metrics_data.get("cumulative_return"),
                        metrics_data.get("annual_return"),
                        metrics_data.get("annual_volatility"),
                        metrics_data.get("max_drawdown"),
                        metrics_data.get("var_95"),
                        metrics_data.get("cvar_95"),
                        metrics_data.get("beta"),
                        metrics_data.get("alpha"),
                        metrics_data.get("sharpe_ratio"),
                        metrics_data.get("net_delta"),
                        metrics_data.get("net_gamma"),
                        metrics_data.get("net_vega"),
                        metrics_data.get("net_theta"),
                        metrics_data.get("active_positions"),
                        metrics_data.get("active_strategies"),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting portfolio metrics: {e}")
                return None

    def get_portfolio_metrics_history(
        self, start_time=None, end_time=None, limit=None
    ) -> pd.DataFrame:
        """Get portfolio metrics history."""
        with self.get_connection() as conn:
            query = "SELECT * FROM portfolio_metrics_history"
            params = []
            conditions = []

            if start_time:
                conditions.append("timestamp >= ?")
                params.append(start_time)
            if end_time:
                conditions.append("timestamp <= ?")
                params.append(end_time)

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

            query += " ORDER BY timestamp DESC"

            if limit:
                query += " LIMIT ?"
                params.append(limit)

            df = pd.read_sql_query(query, conn, params=params)
            return df

    def insert_portfolio_snapshot(self, snapshot_data: Dict[str, Any]) -> Optional[int]:
        """Insert complete portfolio snapshot."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO portfolio_snapshots
                    (timestamp, datetime, snapshot_type, portfolio_data,
                     risk_metrics, performance_metrics, allocation_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        snapshot_data["timestamp"],
                        datetime.fromtimestamp(snapshot_data["timestamp"] / 1000),
                        snapshot_data["snapshot_type"],
                        json.dumps(snapshot_data["portfolio_data"]),
                        json.dumps(snapshot_data.get("risk_metrics", {})),
                        json.dumps(snapshot_data.get("performance_metrics", {})),
                        json.dumps(snapshot_data.get("allocation_data", {})),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting portfolio snapshot: {e}")
                return None

    # News feed methods
    def insert_news_item(self, news_data: Dict[str, Any]) -> Optional[int]:
        """Insert news feed item."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO news_feed
                    (news_id, title, summary, content, source, author, url,
                     published_at, timestamp, category, tags, is_critical,
                     relevance_score, sentiment_score, impact_score,
                     related_symbols, is_processed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        news_data["news_id"],
                        news_data["title"],
                        news_data.get("summary"),
                        news_data.get("content"),
                        news_data["source"],
                        news_data.get("author"),
                        news_data.get("url"),
                        news_data["published_at"],
                        news_data["timestamp"],
                        news_data.get("category"),
                        json.dumps(news_data.get("tags", [])),
                        news_data.get("is_critical", False),
                        news_data.get("relevance_score"),
                        news_data.get("sentiment_score"),
                        news_data.get("impact_score"),
                        json.dumps(news_data.get("related_symbols", [])),
                        news_data.get("is_processed", False),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting news item: {e}")
                return None

    def get_news_feed(
        self, limit=50, source=None, is_critical=None, start_time=None
    ) -> List[Dict[str, Any]]:
        """Get news feed items."""
        with self.get_connection() as conn:
            query = "SELECT * FROM news_feed"
            params = []
            conditions = []

            if source:
                conditions.append("source = ?")
                params.append(source)
            if is_critical is not None:
                conditions.append("is_critical = ?")
                params.append(is_critical)
            if start_time:
                conditions.append("timestamp >= ?")
                params.append(start_time)

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)

            df = pd.read_sql_query(query, conn, params=params)

            # Parse JSON fields
            news_items = []
            for _, row in df.iterrows():
                item = dict(row)
                if item.get("tags"):
                    item["tags"] = json.loads(item["tags"])
                if item.get("related_symbols"):
                    item["related_symbols"] = json.loads(item["related_symbols"])
                news_items.append(item)

            return news_items

    # AI insights methods
    def insert_ai_insight(self, insight_data: Dict[str, Any]) -> Optional[int]:
        """Insert AI-generated insight."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO ai_insights
                    (insight_id, type, title, description, priority, confidence,
                     suggested_actions, related_instruments, supporting_data,
                     timestamp, datetime, expiry_timestamp, is_acknowledged)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        insight_data["insight_id"],
                        insight_data["type"],
                        insight_data["title"],
                        insight_data["description"],
                        insight_data["priority"],
                        insight_data.get("confidence"),
                        json.dumps(insight_data.get("suggested_actions", [])),
                        json.dumps(insight_data.get("related_instruments", [])),
                        json.dumps(insight_data.get("supporting_data", {})),
                        insight_data["timestamp"],
                        datetime.fromtimestamp(insight_data["timestamp"] / 1000),
                        insight_data.get("expiry_timestamp"),
                        insight_data.get("is_acknowledged", False),
                    ),
                )

                conn.commit()
                logger.info(f"AI insight created: {insight_data['title']}")
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting AI insight: {e}")
                return None

    def get_ai_insights(
        self, priority=None, acknowledged=None, limit=50
    ) -> List[Dict[str, Any]]:
        """Get AI insights."""
        with self.get_connection() as conn:
            query = "SELECT * FROM ai_insights"
            params = []
            conditions = []

            if priority:
                conditions.append("priority = ?")
                params.append(priority)
            if acknowledged is not None:
                conditions.append("is_acknowledged = ?")
                params.append(acknowledged)

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)

            df = pd.read_sql_query(query, conn, params=params)

            # Parse JSON fields
            insights = []
            for _, row in df.iterrows():
                insight = dict(row)
                if insight.get("suggested_actions"):
                    insight["suggested_actions"] = json.loads(insight["suggested_actions"])
                if insight.get("related_instruments"):
                    insight["related_instruments"] = json.loads(insight["related_instruments"])
                if insight.get("supporting_data"):
                    insight["supporting_data"] = json.loads(insight["supporting_data"])
                insights.append(insight)

            return insights

    def acknowledge_ai_insight(self, insight_id: str, user_feedback: str = None) -> bool:
        """Mark an AI insight as acknowledged."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    UPDATE ai_insights
                    SET is_acknowledged = TRUE, acknowledged_at = CURRENT_TIMESTAMP,
                        user_feedback = ?
                    WHERE insight_id = ?
                """,
                    (user_feedback, insight_id),
                )

                conn.commit()
                return cursor.rowcount > 0
            except Exception as e:
                logger.error(f"Error acknowledging AI insight: {e}")
                return False

    # Risk alerts methods
    def insert_risk_alert(self, alert_data: Dict[str, Any]) -> Optional[int]:
        """Insert risk alert."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO risk_alerts
                    (alert_id, type, title, description, severity, threshold_type,
                     threshold_value, current_value, breach_percentage,
                     affected_positions, recommended_actions, timestamp, datetime)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        alert_data["alert_id"],
                        alert_data["type"],
                        alert_data["title"],
                        alert_data["description"],
                        alert_data["severity"],
                        alert_data.get("threshold_type"),
                        alert_data.get("threshold_value"),
                        alert_data.get("current_value"),
                        alert_data.get("breach_percentage"),
                        json.dumps(alert_data.get("affected_positions", [])),
                        json.dumps(alert_data.get("recommended_actions", [])),
                        alert_data["timestamp"],
                        datetime.fromtimestamp(alert_data["timestamp"] / 1000),
                    ),
                )

                conn.commit()
                logger.info(f"Risk alert created: {alert_data['title']}")
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting risk alert: {e}")
                return None

    def resolve_risk_alert(self, alert_id: str, resolution_notes: str = None) -> bool:
        """Mark a risk alert as resolved."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    UPDATE risk_alerts
                    SET is_resolved = TRUE, resolved_at = CURRENT_TIMESTAMP,
                        resolution_notes = ?
                    WHERE alert_id = ?
                """,
                    (resolution_notes, alert_id),
                )

                conn.commit()
                return cursor.rowcount > 0
            except Exception as e:
                logger.error(f"Error resolving risk alert: {e}")
                return False

    def get_risk_alerts(
        self, resolved=None, severity=None, limit=50
    ) -> List[Dict[str, Any]]:
        """Get risk alerts."""
        with self.get_connection() as conn:
            query = "SELECT * FROM risk_alerts"
            params = []
            conditions = []

            if resolved is not None:
                conditions.append("is_resolved = ?")
                params.append(resolved)
            if severity:
                conditions.append("severity = ?")
                params.append(severity)

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)

            df = pd.read_sql_query(query, conn, params=params)

            # Parse JSON fields
            alerts = []
            for _, row in df.iterrows():
                alert = dict(row)
                if alert.get("affected_positions"):
                    alert["affected_positions"] = json.loads(alert["affected_positions"])
                if alert.get("recommended_actions"):
                    alert["recommended_actions"] = json.loads(alert["recommended_actions"])
                alerts.append(alert)

            return alerts

    # Portfolio strategies methods
    def insert_portfolio_strategy(self, strategy_data: Dict[str, Any]) -> Optional[int]:
        """Insert portfolio strategy."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT OR REPLACE INTO portfolio_strategies
                    (strategy_id, strategy_name, description, strategy_type,
                     allocation_percentage, target_allocation, inception_date,
                     is_active, risk_limit, max_drawdown_limit, benchmark,
                     parameters, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                """,
                    (
                        strategy_data["strategy_id"],
                        strategy_data["strategy_name"],
                        strategy_data.get("description"),
                        strategy_data["strategy_type"],
                        strategy_data.get("allocation_percentage"),
                        strategy_data.get("target_allocation"),
                        strategy_data["inception_date"],
                        strategy_data.get("is_active", True),
                        strategy_data.get("risk_limit"),
                        strategy_data.get("max_drawdown_limit"),
                        strategy_data.get("benchmark"),
                        json.dumps(strategy_data.get("parameters", {})),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting portfolio strategy: {e}")
                return None

    def insert_strategy_performance(self, performance_data: Dict[str, Any]) -> Optional[int]:
        """Insert strategy performance metrics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO strategy_performance
                    (strategy_id, timestamp, datetime, strategy_value, daily_pnl,
                     daily_return, cumulative_pnl, cumulative_return, annual_return,
                     annual_volatility, max_drawdown, sharpe_ratio, alpha, beta,
                     positions_count, active_positions_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        performance_data["strategy_id"],
                        performance_data["timestamp"],
                        datetime.fromtimestamp(performance_data["timestamp"] / 1000),
                        performance_data["strategy_value"],
                        performance_data.get("daily_pnl"),
                        performance_data.get("daily_return"),
                        performance_data.get("cumulative_pnl"),
                        performance_data.get("cumulative_return"),
                        performance_data.get("annual_return"),
                        performance_data.get("annual_volatility"),
                        performance_data.get("max_drawdown"),
                        performance_data.get("sharpe_ratio"),
                        performance_data.get("alpha"),
                        performance_data.get("beta"),
                        performance_data.get("positions_count"),
                        performance_data.get("active_positions_count"),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting strategy performance: {e}")
                return None

    # Market indicators methods
    def insert_market_indicator(self, indicator_data: Dict[str, Any]) -> Optional[int]:
        """Insert market indicator."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            try:
                cursor.execute(
                    """
                    INSERT INTO market_indicators
                    (timestamp, datetime, indicator_name, value, previous_value,
                     change_percentage, source, category)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (
                        indicator_data["timestamp"],
                        datetime.fromtimestamp(indicator_data["timestamp"] / 1000),
                        indicator_data["indicator_name"],
                        indicator_data["value"],
                        indicator_data.get("previous_value"),
                        indicator_data.get("change_percentage"),
                        indicator_data.get("source"),
                        indicator_data.get("category"),
                    ),
                )

                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting market indicator: {e}")
                return None

    def get_market_indicators(
        self, indicator_names=None, limit=100
    ) -> Dict[str, Any]:
        """Get latest market indicators."""
        with self.get_connection() as conn:
            if indicator_names:
                placeholders = ",".join("?" * len(indicator_names))
                query = f"""
                    SELECT indicator_name, value, previous_value, change_percentage,
                           timestamp, datetime, source
                    FROM market_indicators
                    WHERE indicator_name IN ({placeholders})
                      AND timestamp = (
                          SELECT MAX(timestamp) FROM market_indicators mi2
                          WHERE mi2.indicator_name = market_indicators.indicator_name
                      )
                    ORDER BY indicator_name
                """
                df = pd.read_sql_query(query, conn, params=indicator_names)
            else:
                query = """
                    SELECT indicator_name, value, previous_value, change_percentage,
                           timestamp, datetime, source
                    FROM market_indicators
                    WHERE timestamp = (
                        SELECT MAX(timestamp) FROM market_indicators mi2
                        WHERE mi2.indicator_name = market_indicators.indicator_name
                    )
                    ORDER BY indicator_name
                    LIMIT ?
                """
                df = pd.read_sql_query(query, conn, params=(limit,))

            # Convert to dictionary format
            indicators = {}
            for _, row in df.iterrows():
                indicators[row["indicator_name"]] = {
                    "value": row["value"],
                    "previous_value": row["previous_value"],
                    "change_percentage": row["change_percentage"],
                    "timestamp": row["timestamp"],
                    "source": row["source"],
                }

            return indicators
