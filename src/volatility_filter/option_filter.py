"""Option volatility filter module for tracking and analyzing option chain data."""

import json
import websocket
import numpy as np
from collections import deque, defaultdict
from datetime import datetime, timedelta
import threading
import time
from typing import Dict, Any, Optional, List, Set
import logging

from .database import DatabaseManager
from .websocket_server import WebSocketBroadcastServer
from .option_data_fetcher import OptionDataFetcher

logger = logging.getLogger(__name__)


class OptionVolatilityFilter:
    """Real-time option volatility filter for Deribit options."""
    
    def __init__(self,
                 currency: str = "BTC",
                 expiry_days_ahead: int = 60,
                 strike_range_pct: float = 0.25,
                 iv_threshold_std: float = 2.0,
                 iv_change_threshold: float = 0.1,
                 greeks_update_interval: int = 60,
                 chain_update_interval: int = 300,
                 use_database: bool = True,
                 db_path: str = 'volatility_filter.db',
                 broadcast_events: bool = True,
                 broadcast_server: Optional[WebSocketBroadcastServer] = None):
        """
        Initialize the option volatility filter.
        
        Args:
            currency: Underlying currency (BTC, ETH)
            expiry_days_ahead: Number of days ahead to track expiries
            strike_range_pct: Percentage range around ATM to track (0.25 = ±25%)
            iv_threshold_std: Standard deviations for IV anomaly detection
            iv_change_threshold: Threshold for IV change events (0.1 = 10%)
            greeks_update_interval: Seconds between Greeks updates
            chain_update_interval: Seconds between full chain updates
            use_database: Whether to store data in database
            db_path: Path to database file
            broadcast_events: Whether to broadcast events
            broadcast_server: Optional shared WebSocket server
        """
        self.currency = currency
        self.expiry_days_ahead = expiry_days_ahead
        self.strike_range_pct = strike_range_pct
        self.iv_threshold_std = iv_threshold_std
        self.iv_change_threshold = iv_change_threshold
        self.greeks_update_interval = greeks_update_interval
        self.chain_update_interval = chain_update_interval
        self.use_database = use_database
        self.broadcast_events = broadcast_events
        
        # WebSocket URLs
        self.ws_url = "wss://www.deribit.com/ws/api/v2"
        
        # Data storage
        self.active_instruments = {}  # instrument_name -> instrument_data
        self.tracked_instruments = set()  # Set of instruments we're tracking
        self.iv_history = defaultdict(lambda: deque(maxlen=100))  # IV history per instrument
        self.greeks_cache = {}  # Latest Greeks per instrument
        self.last_chain_snapshot = None
        self.underlying_price = None
        
        # WebSocket connection
        self.ws = None
        self.is_running = False
        
        # Data fetcher
        self.data_fetcher = OptionDataFetcher()
        
        # Database
        self.db_manager = None
        if use_database:
            self.db_manager = DatabaseManager(db_path)
            
        # Broadcast server (can be shared with main filter)
        self.broadcast_server = broadcast_server
        self.owns_broadcast_server = False
        if broadcast_events and not broadcast_server:
            # Create our own broadcast server
            self.broadcast_server = WebSocketBroadcastServer()
            self.broadcast_server.start()
            self.owns_broadcast_server = True
            
        # Update timers
        self.last_greeks_update = 0
        self.last_chain_update = 0
        
        # Statistics
        self.total_option_trades = 0
        self.total_iv_anomalies = 0
        self.total_iv_changes = 0
        
        logger.info(f"Option volatility filter initialized for {currency}")
        
    def start(self):
        """Start the option filter with WebSocket connection."""
        self.is_running = True
        
        # Initial setup - fetch instruments and subscribe
        self._initial_setup()
        
        # Setup WebSocket
        self.ws = websocket.WebSocketApp(
            self.ws_url,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        
        # Run WebSocket in a separate thread
        ws_thread = threading.Thread(target=self.ws.run_forever)
        ws_thread.daemon = True
        ws_thread.start()
        
        # Start update threads
        update_thread = threading.Thread(target=self._update_loop)
        update_thread.daemon = True
        update_thread.start()
        
        logger.info("Option volatility filter started")
        
    def _initial_setup(self):
        """Perform initial setup - fetch instruments and current data."""
        logger.info("Performing initial setup...")
        
        # Fetch all option instruments
        instruments = self.data_fetcher.fetch_option_instruments(self.currency)
        
        if self.db_manager:
            # Store instruments in database
            self.db_manager.insert_option_instruments(instruments)
            
        # Filter instruments to track
        self._update_tracked_instruments(instruments)
        
        # Fetch initial Greeks for tracked instruments
        if self.tracked_instruments:
            instrument_list = list(self.tracked_instruments)[:50]  # Limit initial fetch
            greeks_data = self.data_fetcher.fetch_greeks_for_instruments(instrument_list)
            self._process_greeks_update(greeks_data)
            
        logger.info(f"Setup complete. Tracking {len(self.tracked_instruments)} instruments")
        
    def _update_tracked_instruments(self, instruments: List[Dict[str, Any]]):
        """Update the set of instruments we're actively tracking."""
        # Get current underlying price
        self.underlying_price = self.data_fetcher.fetch_index_price(self.currency)
        if not self.underlying_price:
            logger.warning("Could not fetch underlying price")
            return
            
        # Calculate strike range
        min_strike = self.underlying_price * (1 - self.strike_range_pct)
        max_strike = self.underlying_price * (1 + self.strike_range_pct)
        
        # Calculate expiry range
        current_time = time.time() * 1000
        max_expiry_time = current_time + (self.expiry_days_ahead * 24 * 60 * 60 * 1000)
        
        # Filter instruments
        self.tracked_instruments.clear()
        for inst in instruments:
            if (inst['is_active'] and 
                min_strike <= inst['strike'] <= max_strike and
                inst['expiry_timestamp'] <= max_expiry_time):
                
                self.active_instruments[inst['instrument_name']] = inst
                self.tracked_instruments.add(inst['instrument_name'])
                
        logger.info(f"Updated tracked instruments: {len(self.tracked_instruments)} "
                   f"(strikes: {min_strike:.0f}-{max_strike:.0f})")
        
    def on_message(self, ws, message):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(message)
            
            # Handle subscription confirmation
            if 'id' in data and data.get('id') in [100, 101, 102]:
                if 'error' in data:
                    logger.error(f"Subscription error: {data['error']}")
                else:
                    logger.info(f"Subscription confirmed: {data.get('result', [])}")
                    
            # Handle subscription data
            elif data.get('method') == 'subscription' and 'params' in data:
                params = data['params']
                channel = params.get('channel', '')
                
                if 'trades' in channel and 'option' in channel and 'data' in params:
                    # Option trades
                    trades = params['data']
                    for trade in trades:
                        self._process_option_trade(trade)
                        
                elif 'ticker' in channel and 'option' in channel and 'data' in params:
                    # Option ticker updates (includes Greeks)
                    ticker_data = params['data']
                    self._process_ticker_update(ticker_data)
                    
                elif 'book' in channel and 'option' in channel and 'data' in params:
                    # Order book updates
                    book_data = params['data']
                    self._process_book_update(book_data)
                    
            # Handle heartbeat
            elif data.get('method') == 'heartbeat':
                if data.get('params', {}).get('type') == 'test_request':
                    heartbeat_response = {
                        "jsonrpc": "2.0",
                        "id": data.get('id'),
                        "method": "public/test",
                        "params": {}
                    }
                    ws.send(json.dumps(heartbeat_response))
                    
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            
    def _process_option_trade(self, trade: Dict[str, Any]):
        """Process individual option trade."""
        try:
            instrument_name = trade.get('instrument_name')
            if not instrument_name or instrument_name not in self.tracked_instruments:
                return
                
            timestamp = trade['timestamp']
            price = trade['price']
            amount = trade['amount']
            direction = trade['direction']
            iv = trade.get('iv')
            
            self.total_option_trades += 1
            
            # Prepare trade data
            trade_data = {
                'timestamp': timestamp,
                'datetime': datetime.fromtimestamp(timestamp/1000),
                'instrument_name': instrument_name,
                'price': price,
                'amount': amount,
                'direction': direction,
                'implied_volatility': iv,
                'index_price': trade.get('index_price'),
                'underlying_price': self.underlying_price
            }
            
            # Store in database
            if self.db_manager:
                self.db_manager.insert_option_trade(trade_data)
                
            # Broadcast trade
            if self.broadcast_server:
                self.broadcast_server.broadcast_option_trade(trade_data)
                
            # Check for IV anomalies
            if iv:
                self._check_iv_anomaly(instrument_name, iv, trade_data)
                
        except Exception as e:
            logger.error(f"Error processing option trade: {e}")
            
    def _process_ticker_update(self, ticker_data: Dict[str, Any]):
        """Process option ticker update (includes Greeks)."""
        try:
            instrument_name = ticker_data.get('instrument_name')
            if not instrument_name or instrument_name not in self.tracked_instruments:
                return
                
            timestamp = ticker_data['timestamp']
            
            # Extract Greeks
            greeks = ticker_data.get('greeks', {})
            if greeks:
                greeks_data = {
                    'timestamp': timestamp,
                    'datetime': datetime.fromtimestamp(timestamp/1000),
                    'instrument_name': instrument_name,
                    'mark_price': ticker_data.get('mark_price'),
                    'mark_iv': ticker_data.get('mark_iv'),
                    'underlying_price': ticker_data.get('underlying_price'),
                    'delta': greeks.get('delta'),
                    'gamma': greeks.get('gamma'),
                    'vega': greeks.get('vega'),
                    'theta': greeks.get('theta'),
                    'rho': greeks.get('rho'),
                    'bid_iv': ticker_data.get('bid_iv'),
                    'ask_iv': ticker_data.get('ask_iv'),
                    'bid_price': ticker_data.get('best_bid_price'),
                    'ask_price': ticker_data.get('best_ask_price'),
                    'open_interest': ticker_data.get('open_interest'),
                    'volume_24h': ticker_data.get('stats', {}).get('volume')
                }
                
                # Update cache
                self.greeks_cache[instrument_name] = greeks_data
                
                # Store in database
                if self.db_manager:
                    self.db_manager.insert_option_greeks(greeks_data)
                    
                # Check for IV changes
                mark_iv = ticker_data.get('mark_iv')
                if mark_iv:
                    self._check_iv_change(instrument_name, mark_iv, greeks_data)
                    
        except Exception as e:
            logger.error(f"Error processing ticker update: {e}")
            
    def _process_book_update(self, book_data: Dict[str, Any]):
        """Process order book update."""
        # For now, we mainly care about the implied volatilities from the book
        # which are already captured in ticker updates
        pass
        
    def _check_iv_anomaly(self, instrument_name: str, iv: float, trade_data: Dict[str, Any]):
        """Check for IV anomalies based on historical data."""
        # Add to history
        self.iv_history[instrument_name].append(iv)
        
        # Need sufficient history
        if len(self.iv_history[instrument_name]) < 20:
            return
            
        # Calculate statistics
        iv_array = np.array(self.iv_history[instrument_name])
        mean_iv = np.mean(iv_array)
        std_iv = np.std(iv_array)
        
        if std_iv == 0:
            return
            
        z_score = abs((iv - mean_iv) / std_iv)
        
        if z_score > self.iv_threshold_std:
            self.total_iv_anomalies += 1
            
            # Get instrument details
            inst_data = self.active_instruments.get(instrument_name, {})
            
            event_data = {
                'timestamp': trade_data['timestamp'],
                'datetime': trade_data['datetime'],
                'instrument_name': instrument_name,
                'event_type': 'iv_anomaly',
                'implied_volatility': iv,
                'historical_volatility': mean_iv,
                'iv_change': iv - mean_iv,
                'iv_percentile': None,  # Could calculate if we store more history
                'underlying_price': self.underlying_price,
                'strike': inst_data.get('strike'),
                'days_to_expiry': self._calculate_days_to_expiry(inst_data.get('expiry_timestamp')),
                'threshold_type': 'z_score',
                'threshold_value': self.iv_threshold_std,
                'additional_data': {
                    'z_score': z_score,
                    'std_iv': std_iv,
                    'sample_size': len(iv_array)
                }
            }
            
            # Store in database
            if self.db_manager:
                self.db_manager.insert_option_volatility_event(event_data)
                
            # Broadcast event
            if self.broadcast_server:
                self.broadcast_server.broadcast_option_volatility_event(event_data)
                
            logger.info(f"IV anomaly detected: {instrument_name} IV={iv:.1%} "
                       f"(mean={mean_iv:.1%}, z-score={z_score:.2f})")
            
    def _check_iv_change(self, instrument_name: str, current_iv: float, greeks_data: Dict[str, Any]):
        """Check for significant IV changes."""
        # Get previous IV from history
        if instrument_name in self.iv_history and len(self.iv_history[instrument_name]) > 0:
            previous_iv = self.iv_history[instrument_name][-1]
            iv_change = (current_iv - previous_iv) / previous_iv if previous_iv > 0 else 0
            
            if abs(iv_change) > self.iv_change_threshold:
                self.total_iv_changes += 1
                
                # Get instrument details
                inst_data = self.active_instruments.get(instrument_name, {})
                
                event_data = {
                    'timestamp': greeks_data['timestamp'],
                    'datetime': greeks_data['datetime'],
                    'instrument_name': instrument_name,
                    'event_type': 'iv_change',
                    'implied_volatility': current_iv,
                    'historical_volatility': previous_iv,
                    'iv_change': iv_change,
                    'iv_percentile': None,
                    'underlying_price': self.underlying_price,
                    'strike': inst_data.get('strike'),
                    'days_to_expiry': self._calculate_days_to_expiry(inst_data.get('expiry_timestamp')),
                    'threshold_type': 'pct_change',
                    'threshold_value': self.iv_change_threshold,
                    'additional_data': {
                        'delta': greeks_data.get('delta'),
                        'gamma': greeks_data.get('gamma'),
                        'vega': greeks_data.get('vega')
                    }
                }
                
                # Store in database
                if self.db_manager:
                    self.db_manager.insert_option_volatility_event(event_data)
                    
                # Broadcast event
                if self.broadcast_server:
                    self.broadcast_server.broadcast_option_volatility_event(event_data)
                    
                logger.info(f"IV change detected: {instrument_name} "
                           f"{previous_iv:.1%} -> {current_iv:.1%} ({iv_change:+.1%})")
                           
        # Update history
        self.iv_history[instrument_name].append(current_iv)
        
    def _calculate_days_to_expiry(self, expiry_timestamp: Optional[int]) -> Optional[float]:
        """Calculate days to expiry from timestamp."""
        if not expiry_timestamp:
            return None
            
        current_time = time.time() * 1000
        days = (expiry_timestamp - current_time) / (24 * 60 * 60 * 1000)
        return max(0, days)
        
    def _process_greeks_update(self, greeks_data: Dict[str, Dict[str, Any]]):
        """Process batch Greeks update."""
        timestamp = int(time.time() * 1000)
        
        for instrument_name, data in greeks_data.items():
            if instrument_name in self.tracked_instruments:
                # Add timestamp and datetime
                data['timestamp'] = data.get('timestamp', timestamp)
                data['datetime'] = datetime.fromtimestamp(data['timestamp']/1000)
                data['instrument_name'] = instrument_name
                
                # Update cache
                self.greeks_cache[instrument_name] = data
                
                # Store in database
                if self.db_manager:
                    self.db_manager.insert_option_greeks(data)
                    
        # Broadcast Greeks update
        if self.broadcast_server:
            self.broadcast_server.broadcast_option_greeks_update({
                'timestamp': timestamp,
                'count': len(greeks_data),
                'instruments': list(greeks_data.keys())[:10]  # Sample for notification
            })
            
    def _update_loop(self):
        """Background thread for periodic updates."""
        while self.is_running:
            try:
                current_time = time.time()
                
                # Update Greeks
                if current_time - self.last_greeks_update > self.greeks_update_interval:
                    self._update_greeks()
                    self.last_greeks_update = current_time
                    
                # Update full chain snapshot
                if current_time - self.last_chain_update > self.chain_update_interval:
                    self._update_chain_snapshot()
                    self.last_chain_update = current_time
                    
            except Exception as e:
                logger.error(f"Error in update loop: {e}")
                
            time.sleep(1)
            
    def _update_greeks(self):
        """Update Greeks for tracked instruments."""
        if not self.tracked_instruments:
            return
            
        # Batch fetch Greeks
        instrument_list = list(self.tracked_instruments)
        batch_size = 50
        
        for i in range(0, len(instrument_list), batch_size):
            batch = instrument_list[i:i+batch_size]
            greeks_data = self.data_fetcher.fetch_greeks_for_instruments(batch)
            self._process_greeks_update(greeks_data)
            
    def _update_chain_snapshot(self):
        """Update full option chain snapshot."""
        try:
            # Fetch current chain
            chain_data = self.data_fetcher.fetch_option_chain(self.currency)
            
            # Add Greeks from cache
            for expiry_date, expiry_data in chain_data['expiries'].items():
                for strike, options in expiry_data['strikes'].items():
                    for option_type, option_data in options.items():
                        if option_data and 'instrument_name' in option_data:
                            inst_name = option_data['instrument_name']
                            if inst_name in self.greeks_cache:
                                option_data.update(self.greeks_cache[inst_name])
                                
            # Store snapshot in database
            if self.db_manager:
                snapshot_data = {
                    'timestamp': chain_data['timestamp'],
                    'underlying': self.currency,
                    'underlying_price': self.underlying_price or chain_data.get('index_price'),
                    'underlying_index_price': chain_data.get('index_price'),
                    'chain_data': chain_data
                }
                self.db_manager.insert_option_chain_snapshot(snapshot_data)
                
            # Calculate IV surface
            iv_surface = self._calculate_iv_surface(chain_data)
            
            # Broadcast updates
            if self.broadcast_server:
                # Simplified chain update
                self.broadcast_server.broadcast_option_chain_update({
                    'timestamp': chain_data['timestamp'],
                    'underlying': self.currency,
                    'underlying_price': self.underlying_price,
                    'expiry_count': len(chain_data['expiries']),
                    'total_instruments': len(self.tracked_instruments)
                })
                
                # IV surface update
                if iv_surface:
                    self.broadcast_server.broadcast_iv_surface_update(iv_surface)
                    
            self.last_chain_snapshot = chain_data
            
        except Exception as e:
            logger.error(f"Error updating chain snapshot: {e}")
            
    def _calculate_iv_surface(self, chain_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Calculate implied volatility surface from chain data."""
        try:
            surface_data = {
                'timestamp': chain_data['timestamp'],
                'underlying': self.currency,
                'underlying_price': self.underlying_price,
                'surface': []
            }
            
            for expiry_date, expiry_data in chain_data['expiries'].items():
                expiry_timestamp = expiry_data['expiry_timestamp']
                days_to_expiry = self._calculate_days_to_expiry(expiry_timestamp)
                
                if days_to_expiry is None or days_to_expiry <= 0:
                    continue
                    
                for strike, options in expiry_data['strikes'].items():
                    # Get call and put IVs
                    call_iv = None
                    put_iv = None
                    
                    if options.get('call') and 'mark_iv' in options['call']:
                        call_iv = options['call']['mark_iv']
                    if options.get('put') and 'mark_iv' in options['put']:
                        put_iv = options['put']['mark_iv']
                        
                    # Use average of call and put IV if both available
                    if call_iv and put_iv:
                        iv = (call_iv + put_iv) / 2
                    else:
                        iv = call_iv or put_iv
                        
                    if iv:
                        surface_data['surface'].append({
                            'strike': strike,
                            'days_to_expiry': days_to_expiry,
                            'expiry_date': expiry_date,
                            'implied_volatility': iv,
                            'moneyness': strike / self.underlying_price if self.underlying_price else None
                        })
                        
            return surface_data if surface_data['surface'] else None
            
        except Exception as e:
            logger.error(f"Error calculating IV surface: {e}")
            return None
            
    def on_error(self, ws, error):
        """Handle WebSocket errors."""
        logger.error(f"WebSocket error: {error}")
        
    def on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket close."""
        logger.info("WebSocket connection closed")
        self.is_running = False
        
    def on_open(self, ws):
        """Handle WebSocket open and subscribe to option channels."""
        logger.info("Option filter WebSocket connection opened")
        
        # Enable heartbeat
        heartbeat_msg = {
            "jsonrpc": "2.0",
            "id": 9929,
            "method": "public/set_heartbeat",
            "params": {
                "interval": 10
            }
        }
        ws.send(json.dumps(heartbeat_msg))
        
        # Subscribe to option trades for tracked instruments
        if self.tracked_instruments:
            # Sample some instruments to avoid overwhelming subscriptions
            sample_size = min(20, len(self.tracked_instruments))
            sample_instruments = list(self.tracked_instruments)[:sample_size]
            
            # Subscribe to trades
            trade_channels = [f"trades.{inst}.100ms" for inst in sample_instruments]
            subscribe_trades = {
                "jsonrpc": "2.0",
                "id": 100,
                "method": "public/subscribe",
                "params": {
                    "channels": trade_channels
                }
            }
            ws.send(json.dumps(subscribe_trades))
            logger.info(f"Subscribing to {len(trade_channels)} option trade channels")
            
            # Subscribe to ticker (includes Greeks)
            ticker_channels = [f"ticker.{inst}.100ms" for inst in sample_instruments]
            subscribe_ticker = {
                "jsonrpc": "2.0",
                "id": 101,
                "method": "public/subscribe",
                "params": {
                    "channels": ticker_channels
                }
            }
            ws.send(json.dumps(subscribe_ticker))
            logger.info(f"Subscribing to {len(ticker_channels)} option ticker channels")
            
    def stop(self):
        """Stop the option filter."""
        self.is_running = False
        if self.ws:
            self.ws.close()
            
        # Stop broadcast server if we own it
        if self.owns_broadcast_server and self.broadcast_server:
            self.broadcast_server.stop()
            
        logger.info("Option volatility filter stopped")
        
    def get_statistics(self) -> Dict[str, Any]:
        """Get current statistics of the option filter."""
        stats = {
            'currency': self.currency,
            'tracked_instruments': len(self.tracked_instruments),
            'active_instruments': len(self.active_instruments),
            'total_option_trades': self.total_option_trades,
            'total_iv_anomalies': self.total_iv_anomalies,
            'total_iv_changes': self.total_iv_changes,
            'greeks_cached': len(self.greeks_cache),
            'iv_histories': len(self.iv_history),
            'underlying_price': self.underlying_price
        }
        
        # Add database statistics if available
        if self.db_manager:
            try:
                # Get recent option events
                recent_events = self.db_manager.get_option_volatility_events(
                    start_time=int((time.time() - 24*3600) * 1000)
                )
                stats['option_events_24h'] = len(recent_events)
                
                # Event type breakdown
                if not recent_events.empty:
                    event_types = recent_events['event_type'].value_counts().to_dict()
                    stats['event_breakdown'] = event_types
                    
            except Exception as e:
                logger.error(f"Error getting database statistics: {e}")
                
        return stats