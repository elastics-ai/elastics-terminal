#!/usr/bin/env python3
"""
Entry point for running the volatility surface TUI monitor.

Usage:
    python scripts/run_vol_surface_tui.py [--host HOST] [--port PORT]
"""

import sys
import os
import argparse
import asyncio

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.volatility_filter.vol_surface_tui import VolSurfaceApp


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Run the volatility surface TUI monitor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                     # Connect to localhost:8765
  %(prog)s --host 192.168.1.10 # Connect to specific host
  %(prog)s --port 8080         # Use different port
  
Keyboard shortcuts:
  q - Quit application
  r - Refresh display
  d - Toggle dark/light mode
  h - Show help
        """
    )
    
    parser.add_argument(
        '--host',
        default='localhost',
        help='WebSocket server host (default: localhost)'
    )
    
    parser.add_argument(
        '--port',
        type=int,
        default=8765,
        help='WebSocket server port (default: 8765)'
    )
    
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Enable debug mode'
    )
    
    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_arguments()
    
    # Configure WebSocket connection
    # Note: In a real implementation, we would pass these to the app
    # For now, the WebSocket URI is hardcoded in the TUI
    
    print("Starting Volatility Surface TUI Monitor...")
    print(f"Connecting to WebSocket at {args.host}:{args.port}")
    print("\nPress 'q' to quit, 'h' for help")
    print("-" * 50)
    
    try:
        # Run the TUI application
        app = VolSurfaceApp()
        app.run()
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as e:
        print(f"\nError: {e}")
        if args.debug:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()