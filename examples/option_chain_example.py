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
    if vol_index and vol_index['data']:
        latest = vol_index['data'][-1]
        print(f"   Latest DVOL: {latest[1]}")
    
    return instruments


def demonstrate_option_filter():
    """Demonstrate the option volatility filter."""
    print("\n=== Option Volatility Filter Demo ===\n")
    
    # Create option filter
    option_filter = OptionVolatilityFilter(
        currency="BTC",
        expiry_days_ahead=30,  # Track options expiring in next 30 days
        strike_range_pct=0.20,  # Track strikes within ±20% of spot
        iv_threshold_std=2.0,   # Detect IV anomalies > 2 std devs
        iv_change_threshold=0.05,  # Detect IV changes > 5%
        greeks_update_interval=30,  # Update Greeks every 30 seconds
        chain_update_interval=120,  # Update full chain every 2 minutes
        use_database=True,
        broadcast_events=True
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
    
    print("\n" + "=" * 60)
    print("Demo completed!")
    print("=" * 60)


if __name__ == '__main__':
    main()