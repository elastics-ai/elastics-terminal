import sqlite3
from datetime import datetime, timedelta
import random
from typing import List, Dict, Any

def create_test_database(db_path: str):
    """Create and populate test database with sample data."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create tables matching the main database schema
    cursor.executescript("""
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
            position_delta REAL,
            position_value REAL,
            pnl REAL,
            pnl_percent REAL,
            is_active BOOLEAN DEFAULT TRUE,
            exit_price REAL,
            exit_timestamp BIGINT,
            exit_datetime TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            side TEXT NOT NULL,
            quantity REAL NOT NULL,
            price REAL NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
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
        );
        
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
        );
        
        CREATE TABLE IF NOT EXISTS chat_conversations (
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted BOOLEAN DEFAULT FALSE
        );
        
        CREATE TABLE IF NOT EXISTS chat_messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            parent_message_id TEXT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
        );
        
        CREATE TABLE IF NOT EXISTS sql_modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            sql_query TEXT NOT NULL,
            query_type TEXT,
            is_favorite BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_executed_at TIMESTAMP,
            execution_count INTEGER DEFAULT 0,
            message_id INTEGER,
            conversation_id INTEGER,
            execution_time_ms INTEGER,
            row_count INTEGER,
            query_results TEXT
        );
    """)
    
    # Insert test data
    insert_test_positions(cursor)
    insert_test_trades(cursor)
    insert_test_realtime_trades(cursor)
    insert_test_volatility_alerts(cursor)
    insert_test_conversations(cursor)
    insert_test_sql_modules(cursor)
    
    conn.commit()
    conn.close()

def insert_test_positions(cursor):
    """Insert test positions."""
    import time
    positions = [
        ("BTC-USD", "spot", 0.5, 45000, 48000),
        ("ETH-USD", "spot", 10, 3000, 3200),
        ("SOL-USD", "spot", 50, 100, 95),
        ("AAPL", "spot", 100, 150, 155),
        ("GOOGL", "spot", 20, 2800, 2850),
    ]
    
    for i, (symbol, inst_type, quantity, entry_price, current_price) in enumerate(positions):
        entry_timestamp = int(time.time() * 1000) - (86400000 * (5 - i))  # Stagger entry times
        current_timestamp = int(time.time() * 1000)
        position_value = quantity * current_price
        pnl = (current_price - entry_price) * quantity
        pnl_percent = ((current_price - entry_price) / entry_price) * 100
        
        cursor.execute("""
            INSERT INTO positions (
                position_id, instrument_name, instrument_type, quantity,
                entry_price, entry_timestamp, entry_datetime,
                current_price, current_timestamp,
                position_value, pnl, pnl_percent,
                position_delta, delta, gamma, vega, theta,
                is_active
            ) VALUES (?, ?, ?, ?, ?, ?, datetime(?, 'unixepoch'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"POS_{symbol}_{i}", symbol, inst_type, quantity,
            entry_price, entry_timestamp, entry_timestamp / 1000,
            current_price, current_timestamp,
            position_value, pnl, pnl_percent,
            quantity * 0.5, 0.5, 0.01, 0.02, -0.05,  # Mock Greeks
            True
        ))

def insert_test_trades(cursor):
    """Insert test trades."""
    now = datetime.now()
    trades = []
    
    # Generate trades for the last 7 days
    for i in range(50):
        timestamp = now - timedelta(days=random.randint(0, 7), hours=random.randint(0, 23))
        symbol = random.choice(["BTC-USD", "ETH-USD", "SOL-USD", "AAPL", "GOOGL"])
        side = random.choice(["buy", "sell"])
        quantity = random.uniform(0.1, 10)
        price = random.uniform(100, 50000)
        
        trades.append((symbol, side, quantity, price, timestamp))
    
    cursor.executemany("""
        INSERT INTO trades (symbol, side, quantity, price, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, trades)

def insert_test_realtime_trades(cursor):
    """Insert test realtime trades."""
    import time
    now = datetime.now()
    trades = []
    
    # Generate trades for the last 2 hours
    for i in range(100):
        timestamp_ms = int((now.timestamp() - random.randint(0, 7200)) * 1000)
        trade_id = f"RT_{timestamp_ms}_{i}"
        price = random.uniform(40000, 50000)  # BTC price range
        amount = random.uniform(0.001, 0.1)
        direction = random.choice(["buy", "sell"])
        tick_direction = random.choice([-1, 0, 1])
        ar_volatility = random.uniform(0.5, 1.2)
        
        trades.append((
            timestamp_ms, datetime.fromtimestamp(timestamp_ms / 1000),
            trade_id, price, amount, direction, tick_direction,
            random.uniform(-0.01, 0.01), ar_volatility
        ))
    
    cursor.executemany("""
        INSERT INTO realtime_trades (timestamp, datetime, trade_id, price, amount, 
                                   direction, tick_direction, log_return, ar_volatility)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, trades)

def insert_test_volatility_alerts(cursor):
    """Insert test volatility alerts."""
    import time
    now = datetime.now()
    events = []
    
    # Generate alerts for the last 24 hours
    for i in range(20):
        timestamp_s = now.timestamp() - random.randint(0, 86400)
        timestamp_ms = int(timestamp_s * 1000)
        trade_id = f"VOL_{timestamp_ms}_{i}"
        price = random.uniform(40000, 50000)
        amount = random.uniform(0.01, 0.5)
        direction = random.choice(["buy", "sell"])
        volatility = random.uniform(0.5, 1.2)
        threshold = 0.8
        
        events.append((
            timestamp_ms, datetime.fromtimestamp(timestamp_s),
            trade_id, price, amount, direction,
            volatility, threshold, 60, 10, 'threshold_exceeded'
        ))
    
    cursor.executemany("""
        INSERT INTO volatility_events (timestamp, datetime, trade_id, price, amount, 
                                     direction, volatility, threshold, window_size, ar_lag, event_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, events)

def insert_test_conversations(cursor):
    """Insert test chat conversations."""
    conversations = [
        ("conv1", "Portfolio Analysis Discussion"),
        ("conv2", "Market Volatility Questions"),
        ("conv3", "Trading Strategy Consultation"),
    ]
    
    for conv_id, title in conversations:
        cursor.execute("""
            INSERT INTO chat_conversations (id, title)
            VALUES (?, ?)
        """, (conv_id, title))
        
        # Add sample messages
        messages = [
            (f"{conv_id}_msg1", conv_id, None, "user", "What's my current portfolio performance?"),
            (f"{conv_id}_msg2", conv_id, f"{conv_id}_msg1", "assistant", "Your portfolio is up 6.25% with a total P&L of $3,500."),
            (f"{conv_id}_msg3", conv_id, f"{conv_id}_msg2", "user", "Which positions are performing best?"),
            (f"{conv_id}_msg4", conv_id, f"{conv_id}_msg3", "assistant", "ETH-USD is your best performer with a 6.67% gain."),
        ]
        
        cursor.executemany("""
            INSERT INTO chat_messages (id, conversation_id, parent_message_id, role, content)
            VALUES (?, ?, ?, ?, ?)
        """, messages)

def insert_test_sql_modules(cursor):
    """Insert test SQL modules."""
    modules = [
        ("Portfolio Summary", "Get current portfolio overview", 
         "SELECT instrument_name, quantity, entry_price, current_price, pnl FROM positions WHERE is_active = 1", 
         "portfolio", True, 15),
        ("Recent Trades", "Show trades from last 24 hours", 
         "SELECT * FROM trades WHERE timestamp > datetime('now', '-1 day') ORDER BY timestamp DESC", 
         "trading", False, 8),
        ("Volatility Alerts", "Get recent volatility breaches", 
         "SELECT * FROM volatility_events WHERE timestamp > datetime('now', '-1 day') AND event_type = 'threshold_exceeded' ORDER BY timestamp DESC", 
         "risk", True, 12),
        ("Position Performance", "Calculate position performance metrics", 
         "SELECT instrument_name, quantity, entry_price, current_price, pnl_percent FROM positions WHERE is_active = 1", 
         "portfolio", False, 5),
    ]
    
    for name, desc, query, category, is_fav, exec_count in modules:
        cursor.execute("""
            INSERT INTO sql_modules (title, description, sql_query, query_type, is_favorite, execution_count)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (name, desc, query, category, is_fav, exec_count))