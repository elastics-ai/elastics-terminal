#!/usr/bin/env python3
"""
Example script demonstrating option chain data integration.

This example shows how to:
1. Fetch and store option instruments
2. Monitor option trades and Greeks
3. Detect IV anomalies and changes
4. Subscribe to option-related WebSocket events
"""

import asyncio
import json
import time
from datetime import datetime
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.volatility_filter.option_filter import OptionVolatilityFilter
from src.volatility_filter.option_data_fetcher import OptionDataFetcher
from src.volatility_filter.database import DatabaseManager
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def demonstrate_option_data_fetching():
    """Demonstrate fetching option chain data."""
    print("\n=== Option Data Fetching Demo ===\n")
    
    fetcher = OptionDataFetcher()
    
    # 1. Fetch current BTC index price
    print("1. Fetching BTC index price...")
    btc_price = fetcher.fetch_index_price("BTC")
    print(f"   Current BTC price: ${btc_price:,.2f}")
    
    # 2. Fetch option instruments
    print("\n2. Fetching option instruments...")
    instruments = fetcher.fetch_option_instruments("BTC", expired=False)
    print(f"   Found {len(instruments)} active option instruments")
    
    # Show some examples
    if instruments:
        print("\n   Sample instruments:")
        for inst in instruments[:5]:
            exp_date = datetime.fromtimestamp(inst['expiry_timestamp']/1000).strftime('%Y-%m-%d')
            print(f"   - {inst['instrument_name']}: Strike ${inst['strike']:,.0f}, "
                  f"Expiry {exp_date}, Type: {inst['option_type']}")
    
    # 3. Fetch order book with Greeks for a specific option
    if instruments:
        sample_instrument = instruments[0]['instrument_name']
        print(f"\n3. Fetching order book and Greeks for {sample_instrument}...")
        order_book = fetcher.fetch_option_order_book(sample_instrument)
        
        if order_book:
            greeks = order_book.get('greeks', {})
            print(f"   Mark Price: {order_book.get('mark_price', 'N/A')}")
            print(f"   Mark IV: {order_book.get('mark_iv', 'N/A')}")
            print(f"   Greeks:")
            print(f"   - Delta: {greeks.get('delta', 'N/A')}")
            print(f"   - Gamma: {greeks.get('gamma', 'N/A')}")
            print(f"   - Vega: {greeks.get('vega', 'N/A')}")
            print(f"   - Theta: {greeks.get('theta', 'N/A')}")
    
    # 4. Fetch volatility index
    print("\n4. Fetching volatility index...")
    vol_index = fetcher.fetch_volatility_index("BTC", "1h")
    if vol_index and 'data' in vol_index and vol_index['data']:
        # The API returns nested structure: vol_index['data']['data']
        data = vol_index['data']
        if isinstance(data, dict) and 'data' in data:
            # Access the actual data array
            data_array = data['data']
            if isinstance(data_array, list) and len(data_array) > 0:
                latest = data_array[-1]
                # The data format is [timestamp, open, high, low, close]
                print(f"   Latest DVOL: {latest[1]}")
            else:
                print(f"   No volatility index data available")
        else:
            print(f"   Unexpected data format: {type(data)}")
    
    return instruments


def demonstrate_option_filter():
    """Demonstrate the option volatility filter."""
    print("\n=== Option Volatility Filter Demo ===\n")
    
    # Create option filter
    # Note: Setting broadcast_events=False since WebSocket server is already running
    option_filter = OptionVolatilityFilter(
        currency="BTC",
        expiry_days_ahead=30,  # Track options expiring in next 30 days
        strike_range_pct=0.20,  # Track strikes within ±20% of spot
        iv_threshold_std=2.0,   # Detect IV anomalies > 2 std devs
        iv_change_threshold=0.05,  # Detect IV changes > 5%
        greeks_update_interval=30,  # Update Greeks every 30 seconds
        chain_update_interval=120,  # Update full chain every 2 minutes
        use_database=True,
        broadcast_events=False  # Don't start another WebSocket server
    )
    
    print("Starting option filter...")
    print("- Tracking options expiring in next 30 days")
    print("- Monitoring strikes within ±20% of spot price")
    print("- Detecting IV anomalies > 2 standard deviations")
    print("- Alerting on IV changes > 5%")
    print("\nPress Ctrl+C to stop\n")
    
    # Start the filter
    option_filter.start()
    
    try:
        # Run for a while and periodically show statistics
        start_time = time.time()
        while True:
            time.sleep(30)
            
            # Get and display statistics
            stats = option_filter.get_statistics()
            elapsed = time.time() - start_time
            
            print(f"\n--- Statistics after {elapsed:.0f} seconds ---")
            print(f"Tracked instruments: {stats['tracked_instruments']}")
            print(f"Total option trades: {stats['total_option_trades']}")
            print(f"IV anomalies detected: {stats['total_iv_anomalies']}")
            print(f"IV changes detected: {stats['total_iv_changes']}")
            print(f"Greeks cached: {stats['greeks_cached']}")
            print(f"Underlying price: ${stats['underlying_price']:,.2f}" if stats['underlying_price'] else "Underlying price: N/A")
            
            if 'event_breakdown' in stats:
                print(f"Event breakdown: {stats['event_breakdown']}")
                
    except KeyboardInterrupt:
        print("\nStopping option filter...")
        option_filter.stop()


def demonstrate_database_queries():
    """Demonstrate querying option data from the database."""
    print("\n=== Database Query Demo ===\n")
    
    db = DatabaseManager()
    
    # 1. Get active option instruments
    print("1. Active option instruments:")
    instruments = db.get_active_option_instruments("BTC")
    print(f"   Found {len(instruments)} active BTC options")
    
    if not instruments.empty:
        # Group by expiry
        expiries = instruments.groupby('expiry_date').size()
        print("\n   Options by expiry date:")
        for expiry, count in expiries.items():
            print(f"   - {expiry}: {count} options")
    
    # 2. Get recent option trades
    print("\n2. Recent option trades:")
    trades = db.get_recent_option_trades(limit=10)
    print(f"   Found {len(trades)} recent trades")
    
    if not trades.empty:
        print("\n   Latest trades:")
        for _, trade in trades.head(5).iterrows():
            print(f"   - {trade['instrument_name']}: ${trade['price']} "
                  f"({trade['amount']} contracts, {trade['direction']})")
    
    # 3. Get option volatility events
    print("\n3. Option volatility events:")
    events = db.get_option_volatility_events()
    print(f"   Found {len(events)} events")
    
    if not events.empty:
        # Group by event type
        event_types = events.groupby('event_type').size()
        print("\n   Events by type:")
        for event_type, count in event_types.items():
            print(f"   - {event_type}: {count} events")
    
    # 4. Get IV surface data
    print("\n4. Implied volatility surface:")
    iv_surface = db.get_iv_surface_data("BTC")
    print(f"   Found {len(iv_surface)} IV data points")
    
    if not iv_surface.empty:
        # Show IV by expiry
        expiry_ivs = iv_surface.groupby('expiry_date')['mark_iv'].mean()
        print("\n   Average IV by expiry:")
        for expiry, avg_iv in expiry_ivs.items():
            print(f"   - {expiry}: {avg_iv:.1%}")


async def demonstrate_websocket_client():
    """Demonstrate WebSocket client for option events."""
    print("\n=== WebSocket Client Demo ===\n")
    
    import websockets
    
    async def listen_for_option_events():
        uri = 'ws://localhost:8765'
        
        try:
            async with websockets.connect(uri) as websocket:
                print(f"Connected to {uri}")
                
                # Subscribe to option events
                await websocket.send(json.dumps({
                    'type': 'subscribe',
                    'events': ['option_chain_update', 'option_volatility_event', 
                              'option_greeks_update', 'iv_surface_update']
                }))
                
                print("Subscribed to option events")
                print("Listening for events...\n")
                
                # Listen for messages
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    msg_type = data.get('type')
                    
                    if msg_type == 'option_chain_update':
                        print(f"📊 Option Chain Update:")
                        print(f"   Underlying: {data['data']['underlying']}")
                        print(f"   Price: ${data['data']['underlying_price']:,.2f}")
                        print(f"   Expiries: {data['data']['expiry_count']}")
                        print(f"   Instruments: {data['data']['total_instruments']}")
                        
                    elif msg_type == 'option_volatility_event':
                        event = data['data']
                        print(f"🚨 Option Volatility Event ({event['event_type']}):")
                        print(f"   Instrument: {event['instrument_name']}")
                        print(f"   IV: {event['implied_volatility']:.1%}")
                        if event['event_type'] == 'iv_change':
                            print(f"   Change: {event['iv_change']:+.1%}")
                        elif event['event_type'] == 'iv_anomaly':
                            z_score = event.get('additional_data', {}).get('z_score', 0)
                            print(f"   Z-score: {z_score:.2f}")
                            
                    elif msg_type == 'option_greeks_update':
                        print(f"📈 Greeks Update:")
                        print(f"   Updated {data['data']['count']} instruments")
                        
                    elif msg_type == 'iv_surface_update':
                        print(f"📉 IV Surface Update:")
                        print(f"   Data points: {len(data['data']['surface'])}")
                        
                    elif msg_type == 'connection':
                        print(f"Server: {data['message']}")
                        
                    elif msg_type == 'subscription_confirmed':
                        print(f"Subscription confirmed: {data['subscribed_events']}")
                        
        except Exception as e:
            print(f"WebSocket error: {e}")
    
    # Run the client for 60 seconds
    try:
        await asyncio.wait_for(listen_for_option_events(), timeout=60)
    except asyncio.TimeoutError:
        print("\nDemo completed")


async def demonstrate_vol_surface_tui():
    """Demonstrate TUI visualization of volatility surface."""
    print("\n=== Volatility Surface TUI Demo ===\n")
    
    from textual.app import App, ComposeResult
    from textual.widgets import Header, Footer, Static, DataTable, Label
    from textual.containers import Container, Horizontal, Vertical
    from textual.reactive import reactive
    from textual.screen import Screen
    from rich.console import Console
    from rich.table import Table
    from rich.text import Text
    import websockets
    import numpy as np
    from datetime import datetime
    
    class VolSurfaceScreen(Screen):
        """Screen for displaying volatility surface."""
        
        CSS = """
        VolSurfaceScreen {
            layout: vertical;
        }
        
        #surface-container {
            height: 20;
            border: solid $primary;
            margin: 1;
            padding: 1;
        }
        
        #stats-container {
            height: 8;
            border: solid $secondary;
            margin: 1;
            padding: 1;
        }
        
        .label {
            width: auto;
            height: 1;
        }
        """
        
        surface_data = reactive(None)
        last_update = reactive("")
        
        def compose(self) -> ComposeResult:
            yield Header(show_clock=True)
            yield Container(
                Static(id="surface-display", expand=True),
                id="surface-container"
            )
            yield Container(
                Vertical(
                    Label("Spot Price: --", id="spot-price", classes="label"),
                    Label("ATM Volatility: --", id="atm-vol", classes="label"),
                    Label("Last Update: --", id="last-update", classes="label"),
                    Label("Options Used: --", id="num-options", classes="label"),
                ),
                id="stats-container"
            )
            yield Footer()
        
        def on_mount(self) -> None:
            """Start websocket connection when screen mounts."""
            self.websocket_task = asyncio.create_task(self.connect_websocket())
        
        async def connect_websocket(self) -> None:
            """Connect to websocket and listen for surface updates."""
            uri = 'ws://localhost:8765'
            
            try:
                async with websockets.connect(uri) as websocket:
                    # Subscribe to vol surface updates
                    await websocket.send(json.dumps({
                        'type': 'subscribe',
                        'events': ['vol_surface']
                    }))
                    
                    # Listen for messages
                    while True:
                        message = await websocket.recv()
                        data = json.loads(message)
                        
                        if data.get('type') == 'vol_surface':
                            self.surface_data = data['data']
                            self.update_display()
                            
            except Exception as e:
                self.query_one("#surface-display").update(f"WebSocket Error: {e}")
        
        def update_display(self) -> None:
            """Update the TUI display with new surface data."""
            if not self.surface_data:
                return
            
            # Update stats
            self.query_one("#spot-price").update(f"Spot Price: ${self.surface_data['spot_price']:,.2f}")
            self.query_one("#atm-vol").update(f"ATM Volatility: {self.surface_data['atm_vol']:.1%}")
            self.query_one("#last-update").update(f"Last Update: {datetime.now().strftime('%H:%M:%S')}")
            self.query_one("#num-options").update(f"Options Used: {self.surface_data['num_options']}")
            
            # Create surface visualization
            surface = np.array(self.surface_data['surface'])
            moneyness = np.array(self.surface_data['moneyness_grid'])
            ttm = np.array(self.surface_data['ttm_grid'])
            
            # Create ASCII heatmap
            surface_text = self._create_heatmap(surface, moneyness, ttm)
            self.query_one("#surface-display").update(surface_text)
        
        def _create_heatmap(self, surface, moneyness, ttm):
            """Create ASCII heatmap of volatility surface."""
            # Normalize surface values for coloring
            min_vol = np.min(surface)
            max_vol = np.max(surface)
            
            # Create rich table
            table = Table(title="Implied Volatility Surface", show_header=True, header_style="bold magenta")
            
            # Add TTM columns
            table.add_column("K/S", style="cyan", width=8)
            for t in ttm[::2]:  # Show every other TTM for space
                table.add_column(f"{t:.2f}y", width=8)
            
            # Add rows for each moneyness level
            for i in range(0, len(moneyness), 2):  # Show every other row for space
                row_data = [f"{np.exp(moneyness[i]):.2f}"]
                
                for j in range(0, len(ttm), 2):
                    vol = surface[i, j]
                    # Color based on volatility level
                    if vol < 0.3:
                        color = "green"
                    elif vol < 0.5:
                        color = "yellow"
                    elif vol < 0.7:
                        color = "red"
                    else:
                        color = "bright_red"
                    
                    row_data.append(Text(f"{vol:.1%}", style=color))
                
                table.add_row(*row_data)
            
            # Convert table to string
            console = Console()
            with console.capture() as capture:
                console.print(table)
            
            return capture.get()
    
    class VolSurfaceApp(App):
        """Textual app for volatility surface visualization."""
        
        BINDINGS = [
            ("q", "quit", "Quit"),
            ("r", "refresh", "Refresh"),
        ]
        
        def on_mount(self) -> None:
            self.push_screen(VolSurfaceScreen())
    
    # Run the TUI app
    app = VolSurfaceApp()
    await app.run_async()


def main():
    """Run all demonstrations."""
    print("=" * 60)
    print("Option Chain Integration Demo")
    print("=" * 60)
    
    # 1. Demonstrate data fetching
    instruments = demonstrate_option_data_fetching()
    
    # 2. Demonstrate option filter (runs for a while)
    print("\nPress Enter to start the option filter demo...")
    input()
    demonstrate_option_filter()
    
    # 3. Demonstrate database queries
    print("\nPress Enter to continue with database queries...")
    input()
    demonstrate_database_queries()
    
    # 4. Demonstrate WebSocket client
    print("\nPress Enter to start WebSocket client demo...")
    input()
    print("(This will listen for option events for 60 seconds)")
    asyncio.run(demonstrate_websocket_client())
    
    # 5. Demonstrate Volatility Surface TUI
    print("\nPress Enter to start Volatility Surface TUI demo...")
    input()
    print("(This will open a terminal UI showing real-time volatility surface)")
    print("Press 'q' to quit the TUI")
    asyncio.run(demonstrate_vol_surface_tui())
    
    print("\n" + "=" * 60)
    print("Demo completed!")
    print("=" * 60)


if __name__ == '__main__':
    main()