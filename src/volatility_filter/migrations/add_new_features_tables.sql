-- Migration to add tables for new features
-- Run this script to update the database schema

-- Data Sources table for Data Library
CREATE TABLE IF NOT EXISTS data_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    publisher TEXT NOT NULL,
    region TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'deprecated')),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    schema_type TEXT NOT NULL,
    available_history TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Source Tags
CREATE TABLE IF NOT EXISTS data_source_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data_source_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (data_source_id) REFERENCES data_sources(id) ON DELETE CASCADE,
    UNIQUE(data_source_id, tag)
);

-- Contracts table for screening
CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id TEXT UNIQUE NOT NULL,
    contract_name TEXT NOT NULL,
    exchange TEXT NOT NULL,
    price REAL NOT NULL,
    size INTEGER NOT NULL,
    value REAL NOT NULL,
    pnl REAL,
    delta REAL,
    gamma REAL,
    theta REAL,
    vega REAL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contract Tags
CREATE TABLE IF NOT EXISTS contract_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    UNIQUE(contract_id, tag)
);

-- Contract Matches for arbitrage opportunities
CREATE TABLE IF NOT EXISTS contract_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    kalshi_price REAL,
    polymarket_price REAL,
    deribit_price REAL,
    spread REAL NOT NULL,
    spread_percent REAL NOT NULL,
    recommendation TEXT,
    potential_profit REAL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON
);

-- Risk Metrics table
CREATE TABLE IF NOT EXISTS risk_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_date DATE NOT NULL,
    total_value REAL NOT NULL,
    value_at_risk REAL NOT NULL,
    stress_test_loss REAL,
    sharpe_ratio REAL,
    max_drawdown REAL,
    volatility REAL,
    delta_exposure REAL,
    gamma_exposure REAL,
    vega_exposure REAL,
    theta_exposure REAL,
    rho_exposure REAL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_date)
);

-- Rebalancing Log
CREATE TABLE IF NOT EXISTS rebalancing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rebalance_type TEXT NOT NULL CHECK (rebalance_type IN ('automatic', 'manual')),
    trades_executed INTEGER NOT NULL,
    total_value REAL NOT NULL,
    reason TEXT NOT NULL,
    config JSON,
    trades JSON,
    user_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Module Categories enhancement
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- These will fail if columns already exist, which is expected
-- Using PRAGMA to check if columns exist would require separate script

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_sources_status ON data_sources(status);
CREATE INDEX IF NOT EXISTS idx_data_sources_publisher ON data_sources(publisher);
CREATE INDEX IF NOT EXISTS idx_contracts_exchange ON contracts(exchange);
CREATE INDEX IF NOT EXISTS idx_contracts_updated ON contracts(last_updated);
CREATE INDEX IF NOT EXISTS idx_risk_metrics_date ON risk_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_rebalancing_type ON rebalancing_log(rebalance_type);
CREATE INDEX IF NOT EXISTS idx_rebalancing_timestamp ON rebalancing_log(timestamp);

-- Sample data for development
INSERT OR IGNORE INTO data_sources (name, publisher, region, version, status, schema_type, available_history, metadata) VALUES
    ('US Stock Market Data', 'NYSE', 'Americas', '2.1.0', 'active', 'OHLCV', '10 years', '{"tags": ["equities", "realtime", "nyse"]}'),
    ('Crypto Options Data', 'Deribit', 'Global', '1.5.2', 'active', 'Options', '3 years', '{"tags": ["crypto", "options", "derivatives"]}'),
    ('Prediction Market Data', 'Polymarket', 'Global', '3.0.1', 'active', 'Events', '2 years', '{"tags": ["prediction", "events", "binary"]}'),
    ('Election Markets', 'Kalshi', 'US', '1.2.0', 'active', 'Events', '1 year', '{"tags": ["elections", "events", "regulated"]}');

-- Insert tags for sample data sources
INSERT OR IGNORE INTO data_source_tags (data_source_id, tag) 
SELECT d.id, t.tag FROM data_sources d
CROSS JOIN (
    SELECT 'equities' as tag UNION SELECT 'realtime' UNION SELECT 'nyse'
) t
WHERE d.name = 'US Stock Market Data';