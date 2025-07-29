-- Migration: Add strategy builder tables
-- Description: Adds tables for node properties, strategy flows, and node templates

-- Node templates for different types of strategy components
CREATE TABLE IF NOT EXISTS node_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'data', 'function', 'strategy', 'risk', 'execution'
    name TEXT NOT NULL,
    description TEXT,
    default_properties TEXT, -- JSON string of default properties
    python_template TEXT, -- Python code template with placeholders
    sql_template TEXT, -- SQL template with placeholders
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(type, name)
);

-- Strategy flows containing the visual flow definition
CREATE TABLE IF NOT EXISTS strategy_flows (
    id TEXT PRIMARY KEY, -- UUID
    name TEXT NOT NULL,
    description TEXT,
    flow_json TEXT NOT NULL, -- JSON representation of the flow (nodes, edges, positions)
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'inactive', 'testing'
    version INTEGER DEFAULT 1,
    parent_flow_id TEXT, -- For flow versioning
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_flow_id) REFERENCES strategy_flows(id)
);

-- Node properties for individual nodes in strategy flows
CREATE TABLE IF NOT EXISTS node_properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flow_id TEXT NOT NULL,
    node_id TEXT NOT NULL, -- Node ID within the flow
    property_name TEXT NOT NULL,
    natural_description TEXT, -- User's natural language description
    generated_code TEXT, -- Generated Python/SQL code
    code_type TEXT, -- 'python', 'sql', 'config'
    validation_status TEXT DEFAULT 'pending', -- 'pending', 'valid', 'invalid'
    validation_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flow_id) REFERENCES strategy_flows(id) ON DELETE CASCADE,
    UNIQUE(flow_id, node_id, property_name)
);

-- Generated strategy modules from flows
CREATE TABLE IF NOT EXISTS strategy_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flow_id TEXT NOT NULL,
    module_name TEXT NOT NULL,
    module_code TEXT NOT NULL, -- Complete generated Python module
    module_metadata TEXT, -- JSON metadata (dependencies, entry points, etc.)
    execution_stats TEXT, -- JSON stats (runs, success rate, avg time, etc.)
    status TEXT DEFAULT 'generated', -- 'generated', 'tested', 'deployed', 'failed'
    last_test_result TEXT, -- JSON test results
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flow_id) REFERENCES strategy_flows(id) ON DELETE CASCADE,
    UNIQUE(flow_id, module_name)
);

-- Translation history for natural language to code conversions
CREATE TABLE IF NOT EXISTS translation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    node_property_id INTEGER NOT NULL,
    natural_input TEXT NOT NULL,
    generated_output TEXT NOT NULL,
    translation_type TEXT NOT NULL, -- 'python', 'sql', 'config'
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    tokens_used INTEGER,
    translation_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (node_property_id) REFERENCES node_properties(id) ON DELETE CASCADE
);

-- Insert default node templates
INSERT OR IGNORE INTO node_templates (type, name, description, default_properties, python_template, sql_template) VALUES
('data', 'Market Data Source', 'Connect to real-time market data feeds', 
 '{"symbol": "", "exchange": "", "data_type": "price", "update_frequency": "1s"}',
 'class MarketDataSource:\n    def __init__(self, symbol="{symbol}", exchange="{exchange}"):\n        self.symbol = symbol\n        self.exchange = exchange\n    \n    def get_data(self):\n        # {natural_description}\n        pass',
 'SELECT * FROM market_data WHERE symbol = "{symbol}" AND exchange = "{exchange}"'),

('function', 'Technical Indicator', 'Calculate technical indicators from price data',
 '{"indicator_type": "SMA", "period": 20, "input_field": "close"}',
 'def calculate_{indicator_type.lower()}(data, period={period}):\n    # {natural_description}\n    return data["{input_field}"].rolling(window=period).mean()',
 'SELECT symbol, timestamp, AVG(close) OVER (ORDER BY timestamp ROWS {period-1} PRECEDING) as {indicator_type}_value FROM price_data'),

('function', 'Options Greeks Calculator', 'Calculate option Greeks (delta, gamma, theta, vega)',
 '{"option_type": "call", "calculation_method": "black_scholes"}',
 'from elastics_options import Greeks\n\ndef calculate_greeks(spot, strike, rate, vol, time_to_exp):\n    # {natural_description}\n    greeks = Greeks()\n    return greeks.calculate_{option_type}(spot, strike, rate, vol, time_to_exp)',
 NULL),

('strategy', 'Mean Reversion Strategy', 'Trade based on mean reversion principles',
 '{"lookback_period": 20, "entry_threshold": 2.0, "exit_threshold": 0.5}',
 'class MeanReversionStrategy:\n    def __init__(self, lookback={lookback_period}, entry_thresh={entry_threshold}):\n        self.lookback = lookback\n        self.entry_thresh = entry_thresh\n    \n    def generate_signals(self, prices):\n        # {natural_description}\n        pass',
 'SELECT * FROM signals WHERE abs(z_score) > {entry_threshold} AND lookback_period = {lookback_period}'),

('risk', 'Position Sizing', 'Calculate optimal position sizes based on risk parameters',
 '{"max_position_pct": 5.0, "risk_per_trade": 1.0, "volatility_adjustment": true}',
 'def calculate_position_size(account_value, risk_pct={risk_per_trade}, volatility=None):\n    # {natural_description}\n    base_size = account_value * (risk_pct / 100)\n    return base_size * volatility_adjustment if volatility else base_size',
 'SELECT portfolio_value * ({risk_per_trade}/100) / abs(stop_loss_pct) as position_size FROM portfolio_state'),

('execution', 'Order Management', 'Execute and manage trading orders',
 '{"order_type": "limit", "timeout_minutes": 5, "partial_fills": true}',
 'class OrderManager:\n    def __init__(self, order_type="{order_type}", timeout={timeout_minutes}):\n        self.order_type = order_type\n        self.timeout = timeout\n    \n    def place_order(self, symbol, quantity, price=None):\n        # {natural_description}\n        pass',
 'INSERT INTO orders (symbol, quantity, order_type, price, status) VALUES ("{symbol}", {quantity}, "{order_type}", {price}, "pending")');