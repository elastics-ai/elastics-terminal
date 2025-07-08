"""Database management module for storing trade data and volatility events."""

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
import pandas as pd
from typing import Dict, Any, Optional, List
import logging
import json

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages SQLite database for storing trade data and volatility events."""
    
    def __init__(self, db_path='volatility_filter.db'):
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
            
            # Historical trades table
            cursor.execute('''
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
            ''')
            
            # Create indexes
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_hist_timestamp 
                ON historical_trades(timestamp)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_hist_datetime 
                ON historical_trades(datetime)
            ''')
            
            # Real-time trades table
            cursor.execute('''
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
            ''')
            
            # Create indexes for realtime trades
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_rt_timestamp 
                ON realtime_trades(timestamp)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_rt_datetime 
                ON realtime_trades(datetime)
            ''')
            
            # Volatility events table
            cursor.execute('''
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
            ''')
            
            # Create indexes for volatility events
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_vol_timestamp 
                ON volatility_events(timestamp)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_vol_datetime 
                ON volatility_events(datetime)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_vol_type 
                ON volatility_events(event_type)
            ''')
            
            # Filter configuration table
            cursor.execute('''
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
            ''')
            
            # Performance metrics table
            cursor.execute('''
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
            ''')
            
            # Option instruments table
            cursor.execute('''
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
            ''')
            
            # Create indexes for option instruments
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_inst_underlying 
                ON option_instruments(underlying)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_inst_expiry 
                ON option_instruments(expiry_date)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_inst_strike 
                ON option_instruments(strike)
            ''')
            
            # Option chains table (snapshots of entire option chain)
            cursor.execute('''
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
            ''')
            
            # Create indexes for option chains
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_chain_timestamp 
                ON option_chains(timestamp)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_chain_underlying 
                ON option_chains(underlying)
            ''')
            
            # Option trades table
            cursor.execute('''
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
            ''')
            
            # Create indexes for option trades
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_trade_timestamp 
                ON option_trades(timestamp)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_trade_instrument 
                ON option_trades(instrument_name)
            ''')
            
            # Option Greeks table
            cursor.execute('''
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
            ''')
            
            # Create indexes for option Greeks
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_greeks_timestamp 
                ON option_greeks(timestamp)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_greeks_instrument 
                ON option_greeks(instrument_name)
            ''')
            
            # Option volatility events table
            cursor.execute('''
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
            ''')
            
            # Create indexes for option volatility events
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_vol_event_timestamp 
                ON option_volatility_events(timestamp)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_vol_event_type 
                ON option_volatility_events(event_type)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_opt_vol_event_instrument 
                ON option_volatility_events(instrument_name)
            ''')
            
            # Volatility surface fits table
            cursor.execute('''
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
            ''')
            
            # Create indexes for volatility surface fits
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_vol_surface_timestamp 
                ON volatility_surface_fits(timestamp)
            ''')
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_vol_surface_underlying 
                ON volatility_surface_fits(underlying)
            ''')
            
            conn.commit()
            
    def insert_historical_trades(self, trades: List[Dict[str, Any]]) -> int:
        """Bulk insert historical trades."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            inserted = 0
            
            for trade in trades:
                try:
                    cursor.execute('''
                        INSERT OR IGNORE INTO historical_trades 
                        (timestamp, datetime, trade_id, price, amount, direction, tick_direction)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        trade['timestamp'],
                        datetime.fromtimestamp(trade['timestamp']/1000),
                        trade.get('trade_id', f"{trade['timestamp']}_{trade.get('trade_seq', '')}"),
                        trade['price'],
                        trade['amount'],
                        trade['direction'],
                        trade.get('tick_direction', 0)
                    ))
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
                cursor.execute('''
                    INSERT OR IGNORE INTO realtime_trades 
                    (timestamp, datetime, trade_id, price, amount, direction, 
                     tick_direction, log_return, ar_volatility)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    trade_data['timestamp'],
                    trade_data['datetime'],
                    trade_data.get('trade_id', f"{trade_data['timestamp']}"),
                    trade_data['price'],
                    trade_data['amount'],
                    trade_data['direction'],
                    trade_data.get('tick_direction', 0),
                    trade_data.get('log_return'),
                    trade_data.get('ar_volatility')
                ))
                
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
                cursor.execute('''
                    INSERT INTO volatility_events 
                    (timestamp, datetime, trade_id, price, amount, direction, 
                     volatility, threshold, window_size, ar_lag, event_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    event_data['timestamp'],
                    event_data['datetime'],
                    event_data.get('trade_id'),
                    event_data['price'],
                    event_data['amount'],
                    event_data['direction'],
                    event_data['volatility'],
                    event_data['threshold'],
                    event_data['window_size'],
                    event_data['ar_lag'],
                    event_data.get('event_type', 'threshold_exceeded')
                ))
                
                conn.commit()
                logger.info(f"Volatility event recorded: {event_data['volatility']:.4f} > {event_data['threshold']:.4f}")
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting volatility event: {e}")
                return None
            
    def save_filter_config(self, config_data: Dict[str, Any]) -> Optional[int]:
        """Save or update filter configuration."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            try:
                cursor.execute('''
                    INSERT OR REPLACE INTO filter_config 
                    (config_name, window_size, ar_lag, vol_threshold, 
                     is_optimized, optimization_method, optimization_score, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    config_data.get('config_name', 'default'),
                    config_data['window_size'],
                    config_data['ar_lag'],
                    config_data['vol_threshold'],
                    config_data.get('is_optimized', False),
                    config_data.get('optimization_method'),
                    config_data.get('optimization_score')
                ))
                
                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error saving filter config: {e}")
                return None
            
    def get_recent_trades(self, table='realtime_trades', limit=1000) -> pd.DataFrame:
        """Get recent trades from database."""
        with self.get_connection() as conn:
            query = f'''
                SELECT * FROM {table}
                ORDER BY timestamp DESC
                LIMIT ?
            '''
            df = pd.read_sql_query(query, conn, params=(limit,))
            return df
            
    def get_volatility_events(self, start_time=None, end_time=None) -> pd.DataFrame:
        """Get volatility events within a time range."""
        with self.get_connection() as conn:
            query = 'SELECT * FROM volatility_events'
            params = []
            
            conditions = []
            if start_time:
                conditions.append('timestamp >= ?')
                params.append(start_time)
            if end_time:
                conditions.append('timestamp <= ?')
                params.append(end_time)
                
            if conditions:
                query += ' WHERE ' + ' AND '.join(conditions)
                
            query += ' ORDER BY timestamp DESC'
            
            df = pd.read_sql_query(query, conn, params=params)
            return df
            
    def get_performance_summary(self, hours=24) -> Dict[str, Any]:
        """Get performance summary for the last N hours."""
        with self.get_connection() as conn:
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            # Get trade counts and volatility stats
            cursor = conn.cursor()
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_trades,
                    AVG(ar_volatility) as avg_volatility,
                    MAX(ar_volatility) as max_volatility,
                    MIN(ar_volatility) as min_volatility
                FROM realtime_trades
                WHERE datetime >= ?
            ''', (cutoff_time,))
            
            trade_stats = cursor.fetchone()
            
            # Get event counts
            cursor.execute('''
                SELECT COUNT(*) as event_count
                FROM volatility_events
                WHERE datetime >= ?
            ''', (cutoff_time,))
            
            event_stats = cursor.fetchone()
            
            return {
                'period_hours': hours,
                'total_trades': trade_stats['total_trades'] or 0,
                'volatility_events': event_stats['event_count'] or 0,
                'avg_volatility': trade_stats['avg_volatility'] or 0,
                'max_volatility': trade_stats['max_volatility'] or 0,
                'min_volatility': trade_stats['min_volatility'] or 0,
                'filter_ratio': (event_stats['event_count'] / trade_stats['total_trades'] 
                               if trade_stats['total_trades'] > 0 else 0)
            }
            
    def save_performance_metrics(self, metrics: Dict[str, Any], config_id: int) -> Optional[int]:
        """Save performance metrics."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            try:
                cursor.execute('''
                    INSERT INTO performance_metrics 
                    (total_trades, filtered_trades, filter_ratio, avg_volatility,
                     max_volatility, min_volatility, true_positives, false_positives,
                     false_negatives, true_negatives, precision_score, recall_score,
                     f1_score, config_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    metrics.get('total_trades', 0),
                    metrics.get('filtered_trades', 0),
                    metrics.get('filter_ratio', 0),
                    metrics.get('avg_volatility', 0),
                    metrics.get('max_volatility', 0),
                    metrics.get('min_volatility', 0),
                    metrics.get('true_positives', 0),
                    metrics.get('false_positives', 0),
                    metrics.get('false_negatives', 0),
                    metrics.get('true_negatives', 0),
                    metrics.get('precision_score', 0),
                    metrics.get('recall_score', 0),
                    metrics.get('f1_score', 0),
                    config_id
                ))
                
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
            for table in ['historical_trades', 'realtime_trades', 'volatility_events']:
                cursor.execute(f'''
                    DELETE FROM {table}
                    WHERE datetime < ?
                ''', (cutoff_time,))
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
                    cursor.execute('''
                        INSERT OR REPLACE INTO option_instruments 
                        (instrument_name, underlying, option_type, strike, 
                         expiry_timestamp, expiry_date, creation_timestamp,
                         tick_size, taker_commission, maker_commission, 
                         contract_size, is_active, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ''', (
                        instrument['instrument_name'],
                        instrument['underlying'],
                        instrument['option_type'],
                        instrument['strike'],
                        instrument['expiry_timestamp'],
                        datetime.fromtimestamp(instrument['expiry_timestamp']/1000).date(),
                        instrument.get('creation_timestamp'),
                        instrument.get('tick_size'),
                        instrument.get('taker_commission'),
                        instrument.get('maker_commission'),
                        instrument.get('contract_size', 1),
                        instrument.get('is_active', True)
                    ))
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
                cursor.execute('''
                    INSERT INTO option_chains 
                    (timestamp, datetime, underlying, underlying_price, 
                     underlying_index_price, snapshot_data)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    chain_data['timestamp'],
                    datetime.fromtimestamp(chain_data['timestamp']/1000),
                    chain_data['underlying'],
                    chain_data['underlying_price'],
                    chain_data.get('underlying_index_price'),
                    json.dumps(chain_data['chain_data'])
                ))
                
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
                cursor.execute('''
                    INSERT OR IGNORE INTO option_trades 
                    (timestamp, datetime, trade_id, instrument_name, 
                     price, amount, direction, tick_direction,
                     implied_volatility, index_price, underlying_price)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    trade_data['timestamp'],
                    trade_data['datetime'],
                    trade_data.get('trade_id', f"{trade_data['timestamp']}_{trade_data['instrument_name']}"),
                    trade_data['instrument_name'],
                    trade_data['price'],
                    trade_data['amount'],
                    trade_data['direction'],
                    trade_data.get('tick_direction'),
                    trade_data.get('implied_volatility'),
                    trade_data.get('index_price'),
                    trade_data.get('underlying_price')
                ))
                
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
                cursor.execute('''
                    INSERT INTO option_greeks 
                    (timestamp, datetime, instrument_name, mark_price, mark_iv,
                     underlying_price, delta, gamma, vega, theta, rho,
                     bid_iv, ask_iv, bid_price, ask_price, 
                     open_interest, volume_24h)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    greeks_data['timestamp'],
                    greeks_data['datetime'],
                    greeks_data['instrument_name'],
                    greeks_data.get('mark_price'),
                    greeks_data.get('mark_iv'),
                    greeks_data.get('underlying_price'),
                    greeks_data.get('delta'),
                    greeks_data.get('gamma'),
                    greeks_data.get('vega'),
                    greeks_data.get('theta'),
                    greeks_data.get('rho'),
                    greeks_data.get('bid_iv'),
                    greeks_data.get('ask_iv'),
                    greeks_data.get('bid_price'),
                    greeks_data.get('ask_price'),
                    greeks_data.get('open_interest'),
                    greeks_data.get('volume_24h')
                ))
                
                conn.commit()
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting option Greeks: {e}")
                return None
                
    def insert_option_volatility_event(self, event_data: Dict[str, Any]) -> Optional[int]:
        """Insert an option volatility event."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            try:
                cursor.execute('''
                    INSERT INTO option_volatility_events 
                    (timestamp, datetime, instrument_name, event_type,
                     implied_volatility, historical_volatility, iv_change,
                     iv_percentile, underlying_price, strike, days_to_expiry,
                     threshold_type, threshold_value, event_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    event_data['timestamp'],
                    event_data['datetime'],
                    event_data['instrument_name'],
                    event_data['event_type'],
                    event_data.get('implied_volatility'),
                    event_data.get('historical_volatility'),
                    event_data.get('iv_change'),
                    event_data.get('iv_percentile'),
                    event_data.get('underlying_price'),
                    event_data.get('strike'),
                    event_data.get('days_to_expiry'),
                    event_data.get('threshold_type'),
                    event_data.get('threshold_value'),
                    json.dumps(event_data.get('additional_data', {}))
                ))
                
                conn.commit()
                logger.info(f"Option volatility event recorded: {event_data['event_type']} for {event_data['instrument_name']}")
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting option volatility event: {e}")
                return None
                
    def get_active_option_instruments(self, underlying: str = 'BTC') -> pd.DataFrame:
        """Get all active option instruments for an underlying."""
        with self.get_connection() as conn:
            query = '''
                SELECT * FROM option_instruments
                WHERE underlying = ? AND is_active = TRUE
                ORDER BY expiry_date, strike
            '''
            df = pd.read_sql_query(query, conn, params=(underlying,))
            return df
            
    def get_option_chain_by_expiry(self, underlying: str, expiry_date: str) -> pd.DataFrame:
        """Get option chain for a specific expiry date."""
        with self.get_connection() as conn:
            query = '''
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
            '''
            df = pd.read_sql_query(query, conn, params=(underlying, expiry_date))
            return df
            
    def get_recent_option_trades(self, instrument_name: str = None, limit: int = 1000) -> pd.DataFrame:
        """Get recent option trades."""
        with self.get_connection() as conn:
            if instrument_name:
                query = '''
                    SELECT * FROM option_trades
                    WHERE instrument_name = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                '''
                df = pd.read_sql_query(query, conn, params=(instrument_name, limit))
            else:
                query = '''
                    SELECT * FROM option_trades
                    ORDER BY timestamp DESC
                    LIMIT ?
                '''
                df = pd.read_sql_query(query, conn, params=(limit,))
            return df
            
    def get_option_volatility_events(self, start_time=None, end_time=None, event_type=None) -> pd.DataFrame:
        """Get option volatility events within a time range."""
        with self.get_connection() as conn:
            query = 'SELECT * FROM option_volatility_events'
            params = []
            conditions = []
            
            if start_time:
                conditions.append('timestamp >= ?')
                params.append(start_time)
            if end_time:
                conditions.append('timestamp <= ?')
                params.append(end_time)
            if event_type:
                conditions.append('event_type = ?')
                params.append(event_type)
                
            if conditions:
                query += ' WHERE ' + ' AND '.join(conditions)
                
            query += ' ORDER BY timestamp DESC'
            
            df = pd.read_sql_query(query, conn, params=params)
            return df
            
    def get_iv_surface_data(self, underlying: str = 'BTC', timestamp: int = None) -> pd.DataFrame:
        """Get implied volatility surface data."""
        with self.get_connection() as conn:
            if timestamp:
                # Get IV surface at specific timestamp
                query = '''
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
                '''
                df = pd.read_sql_query(query, conn, params=(underlying, timestamp))
            else:
                # Get latest IV surface
                query = '''
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
                '''
                df = pd.read_sql_query(query, conn, params=(underlying,))
            return df
            
    def insert_volatility_surface_fit(self, surface_data: Dict[str, Any]) -> Optional[int]:
        """Insert a volatility surface fit."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            try:
                cursor.execute('''
                    INSERT INTO volatility_surface_fits 
                    (timestamp, datetime, underlying, spot_price, surface_data,
                     moneyness_grid, ttm_grid, num_options, fit_quality, atm_vol,
                     term_structure, smile_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    surface_data['timestamp'],
                    datetime.fromtimestamp(surface_data['timestamp']/1000),
                    surface_data['underlying'],
                    surface_data['spot_price'],
                    json.dumps(surface_data['surface']),
                    json.dumps(surface_data['moneyness_grid']),
                    json.dumps(surface_data['ttm_grid']),
                    surface_data.get('num_options'),
                    surface_data.get('fit_quality'),
                    surface_data.get('atm_vol'),
                    json.dumps(surface_data.get('term_structure', [])),
                    json.dumps(surface_data.get('smile', []))
                ))
                
                conn.commit()
                logger.info(f"Volatility surface fit saved for {surface_data['underlying']}")
                return cursor.lastrowid
            except Exception as e:
                logger.error(f"Error inserting volatility surface fit: {e}")
                return None
                
    def get_latest_volatility_surface(self, underlying: str = 'BTC') -> Optional[Dict[str, Any]]:
        """Get the latest volatility surface fit."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM volatility_surface_fits
                WHERE underlying = ?
                ORDER BY timestamp DESC
                LIMIT 1
            ''', (underlying,))
            
            row = cursor.fetchone()
            if row:
                return {
                    'id': row['id'],
                    'timestamp': row['timestamp'],
                    'datetime': row['datetime'],
                    'underlying': row['underlying'],
                    'spot_price': row['spot_price'],
                    'surface': json.loads(row['surface_data']),
                    'moneyness_grid': json.loads(row['moneyness_grid']),
                    'ttm_grid': json.loads(row['ttm_grid']),
                    'num_options': row['num_options'],
                    'atm_vol': row['atm_vol'],
                    'term_structure': json.loads(row['term_structure']),
                    'smile': json.loads(row['smile_data'])
                }
            return None