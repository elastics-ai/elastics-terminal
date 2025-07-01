"""Database management module for storing trade data and volatility events."""

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
import pandas as pd
from typing import Dict, Any, Optional, List
import logging

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