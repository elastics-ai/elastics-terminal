#!/usr/bin/env python3
"""
Bloomberg-style TUI for real-time volatility surface visualization.

This module provides a professional terminal interface for monitoring
the implied volatility surface of Bitcoin options in real-time.
"""

import asyncio
import json
import numpy as np
from datetime import datetime
from typing import Optional, Dict, Any

from textual.app import App, ComposeResult
from textual.widgets import Header, Footer, Static, DataTable, Label, Sparkline
from textual.containers import Container, Horizontal, Vertical, Grid
from textual.reactive import reactive
from textual.screen import Screen
from textual.timer import Timer
from rich.console import Console, ConsoleOptions, RenderResult
from rich.table import Table
from rich.text import Text
from rich.panel import Panel
from rich.layout import Layout
from rich.style import Style
import websockets


class VolatilitySurfaceWidget(Static):
    """Custom widget for rendering the volatility surface as a heatmap."""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.surface_data = None
        self.color_map = [
            (0.0, "green"),
            (0.3, "green3"),
            (0.4, "yellow"),
            (0.5, "yellow3"),
            (0.6, "orange3"),
            (0.7, "red"),
            (0.8, "red3"),
            (1.0, "bright_red"),
        ]
    
    def update_surface(self, surface_data: Dict[str, Any]) -> None:
        """Update the surface data and refresh display."""
        self.surface_data = surface_data
        self.refresh()
    
    def render(self) -> RenderResult:
        """Render the volatility surface."""
        if not self.surface_data:
            return Panel("Waiting for surface data...", title="Volatility Surface")
        
        surface = np.array(self.surface_data['surface'])
        moneyness = np.array(self.surface_data['moneyness_grid'])
        ttm = np.array(self.surface_data['ttm_grid'])
        
        # Create the table
        table = Table(
            title="BTC Implied Volatility Surface",
            show_header=True,
            header_style="bold white on blue",
            border_style="bright_blue",
            title_style="bold white",
            caption=f"Last Update: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            caption_style="dim white"
        )
        
        # Add columns
        table.add_column("Strike/Spot", style="bold cyan", width=12)
        
        # Adaptive column display based on terminal width
        ttm_step = max(1, len(ttm) // 10)  # Show max 10 TTM columns
        ttm_display = ttm[::ttm_step]
        
        for t in ttm_display:
            if t < 1/365:  # Less than 1 day
                label = f"{t*365:.0f}d"
            elif t < 1/12:  # Less than 1 month
                label = f"{t*365:.0f}d"
            elif t < 1:  # Less than 1 year
                label = f"{t*12:.1f}m"
            else:
                label = f"{t:.1f}y"
            table.add_column(label, width=8, justify="right")
        
        # Add rows
        moneyness_step = max(1, len(moneyness) // 15)  # Show max 15 rows
        for i in range(0, len(moneyness), moneyness_step):
            strike_ratio = np.exp(moneyness[i])
            row_data = [f"{strike_ratio:.2f}"]
            
            for j in range(0, len(ttm), ttm_step):
                vol = surface[i, j]
                color = self._get_color_for_vol(vol)
                vol_text = Text(f"{vol:.1%}", style=color)
                row_data.append(vol_text)
            
            table.add_row(*row_data)
        
        # Add summary statistics
        atm_vol = self.surface_data.get('atm_vol', 0)
        spot_price = self.surface_data.get('spot_price', 0)
        
        summary = f"\nSpot: ${spot_price:,.2f} | ATM Vol: {atm_vol:.1%} | " \
                  f"Options: {self.surface_data.get('num_options', 0)}"
        
        return Panel(
            Vertical(table, Static(summary)),
            title="📊 Volatility Surface Monitor",
            border_style="bright_blue"
        )
    
    def _get_color_for_vol(self, vol: float) -> str:
        """Get color based on volatility level."""
        for threshold, color in self.color_map:
            if vol <= threshold:
                return color
        return self.color_map[-1][1]


class MarketStatsWidget(Static):
    """Widget for displaying market statistics."""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.stats = {
            'spot_price': 0,
            'atm_vol': 0,
            'skew': 0,
            'term_structure': [],
            'num_options': 0,
            'last_update': None
        }
    
    def update_stats(self, surface_data: Dict[str, Any]) -> None:
        """Update market statistics from surface data."""
        self.stats['spot_price'] = surface_data.get('spot_price', 0)
        self.stats['atm_vol'] = surface_data.get('atm_vol', 0)
        self.stats['num_options'] = surface_data.get('num_options', 0)
        self.stats['last_update'] = datetime.now()
        
        # Calculate skew and term structure if available
        if 'surface' in surface_data:
            surface = np.array(surface_data['surface'])
            moneyness = np.array(surface_data['moneyness_grid'])
            ttm = np.array(surface_data['ttm_grid'])
            
            # Find ATM index
            atm_idx = np.argmin(np.abs(moneyness))
            
            # Calculate 25-delta skew approximation
            if len(moneyness) > atm_idx + 5 and atm_idx >= 5:
                otm_put_vol = surface[atm_idx - 5, 0]  # 25-delta put
                otm_call_vol = surface[atm_idx + 5, 0]  # 25-delta call
                self.stats['skew'] = otm_put_vol - otm_call_vol
            
            # Extract term structure at ATM
            self.stats['term_structure'] = surface[atm_idx, :].tolist()
        
        self.refresh()
    
    def render(self) -> RenderResult:
        """Render market statistics."""
        stats_table = Table(show_header=False, box=None, padding=(0, 1))
        stats_table.add_column("Metric", style="cyan")
        stats_table.add_column("Value", style="white")
        
        stats_table.add_row("Spot Price", f"${self.stats['spot_price']:,.2f}")
        stats_table.add_row("ATM Volatility", f"{self.stats['atm_vol']:.1%}")
        stats_table.add_row("25Δ Skew", f"{self.stats['skew']:.1%}")
        stats_table.add_row("Options Count", f"{self.stats['num_options']:,}")
        
        if self.stats['last_update']:
            update_time = self.stats['last_update'].strftime('%H:%M:%S')
            stats_table.add_row("Last Update", update_time)
        
        return Panel(stats_table, title="📈 Market Statistics", border_style="green")


class TermStructureWidget(Static):
    """Widget for displaying volatility term structure."""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.term_structure = []
        self.ttm_grid = []
    
    def update_data(self, surface_data: Dict[str, Any]) -> None:
        """Update term structure data."""
        if 'surface' in surface_data and 'ttm_grid' in surface_data:
            surface = np.array(surface_data['surface'])
            moneyness = np.array(surface_data['moneyness_grid'])
            self.ttm_grid = np.array(surface_data['ttm_grid'])
            
            # Find ATM index
            atm_idx = np.argmin(np.abs(moneyness))
            self.term_structure = surface[atm_idx, :]
            
        self.refresh()
    
    def render(self) -> RenderResult:
        """Render term structure chart."""
        if len(self.term_structure) == 0:
            return Panel("Waiting for data...", title="Term Structure")
        
        # Create ASCII chart
        chart_height = 10
        chart_width = 40
        
        # Normalize values for chart
        min_vol = np.min(self.term_structure)
        max_vol = np.max(self.term_structure)
        vol_range = max_vol - min_vol
        
        # Create chart grid
        chart = []
        for i in range(chart_height):
            row = []
            threshold = max_vol - (i / chart_height) * vol_range
            
            for j in range(len(self.term_structure)):
                if self.term_structure[j] >= threshold:
                    row.append("█")
                else:
                    row.append(" ")
            chart.append("".join(row))
        
        # Add axis labels
        chart_text = "\n".join(chart)
        
        # Add scale
        scale = f"Max: {max_vol:.1%}\n{chart_text}\nMin: {min_vol:.1%}"
        
        return Panel(
            scale,
            title="📉 ATM Term Structure",
            border_style="yellow"
        )


class VolSurfaceScreen(Screen):
    """Main screen for volatility surface TUI."""
    
    CSS = """
    VolSurfaceScreen {
        layout: grid;
        grid-size: 3 2;
        grid-rows: 3fr 1fr;
    }
    
    #surface-widget {
        column-span: 2;
        border: solid $primary;
        margin: 1;
    }
    
    #stats-widget {
        border: solid $secondary;
        margin: 1;
    }
    
    #term-structure-widget {
        column-span: 2;
        border: solid $warning;
        margin: 1;
    }
    
    #alerts-widget {
        border: solid $error;
        margin: 1;
    }
    """
    
    def compose(self) -> ComposeResult:
        """Compose the screen layout."""
        yield Header(show_clock=True)
        yield VolatilitySurfaceWidget(id="surface-widget")
        yield MarketStatsWidget(id="stats-widget")
        yield TermStructureWidget(id="term-structure-widget")
        yield Container(
            Static("Recent Alerts", classes="title"),
            Static("No alerts", id="alerts-content"),
            id="alerts-widget"
        )
        yield Footer()
    
    def on_mount(self) -> None:
        """Start websocket connection when screen mounts."""
        self.websocket_task = asyncio.create_task(self.connect_websocket())
        self.set_interval(1, self.update_clock)
    
    async def connect_websocket(self) -> None:
        """Connect to websocket and listen for surface updates."""
        uri = 'ws://localhost:8765'
        retry_delay = 5
        
        while True:
            try:
                self.notify("Connecting to WebSocket...", severity="information")
                
                async with websockets.connect(uri) as websocket:
                    self.notify("Connected to WebSocket", severity="information")
                    
                    # Subscribe to vol surface updates
                    await websocket.send(json.dumps({
                        'type': 'subscribe',
                        'events': ['vol_surface', 'option_volatility_event']
                    }))
                    
                    # Listen for messages
                    while True:
                        message = await websocket.recv()
                        data = json.loads(message)
                        
                        if data.get('type') == 'vol_surface':
                            await self.handle_surface_update(data['data'])
                        elif data.get('type') == 'option_volatility_event':
                            await self.handle_volatility_event(data['data'])
                            
            except websockets.exceptions.WebSocketException as e:
                self.notify(f"WebSocket error: {e}", severity="error")
                await asyncio.sleep(retry_delay)
            except Exception as e:
                self.notify(f"Unexpected error: {e}", severity="error")
                await asyncio.sleep(retry_delay)
    
    async def handle_surface_update(self, surface_data: Dict[str, Any]) -> None:
        """Handle volatility surface update."""
        # Update surface widget
        surface_widget = self.query_one("#surface-widget", VolatilitySurfaceWidget)
        surface_widget.update_surface(surface_data)
        
        # Update stats widget
        stats_widget = self.query_one("#stats-widget", MarketStatsWidget)
        stats_widget.update_stats(surface_data)
        
        # Update term structure widget
        term_widget = self.query_one("#term-structure-widget", TermStructureWidget)
        term_widget.update_data(surface_data)
    
    async def handle_volatility_event(self, event_data: Dict[str, Any]) -> None:
        """Handle volatility event alerts."""
        alerts_content = self.query_one("#alerts-content", Static)
        
        # Format alert message
        event_type = event_data.get('event_type', 'unknown')
        instrument = event_data.get('instrument_name', 'N/A')
        iv = event_data.get('implied_volatility', 0)
        
        alert_msg = f"[{datetime.now().strftime('%H:%M:%S')}] "
        
        if event_type == 'iv_anomaly':
            z_score = event_data.get('additional_data', {}).get('z_score', 0)
            alert_msg += f"🚨 IV Anomaly: {instrument} @ {iv:.1%} (Z={z_score:.1f})"
        elif event_type == 'iv_change':
            change = event_data.get('iv_change', 0)
            alert_msg += f"📊 IV Change: {instrument} {change:+.1%} to {iv:.1%}"
        else:
            alert_msg += f"📌 {event_type}: {instrument} @ {iv:.1%}"
        
        # Update alerts (keep last 5)
        current_text = alerts_content.renderable
        if isinstance(current_text, str) and current_text == "No alerts":
            alerts_content.update(alert_msg)
        else:
            lines = str(current_text).split('\n')
            lines.append(alert_msg)
            if len(lines) > 5:
                lines = lines[-5:]
            alerts_content.update('\n'.join(lines))
    
    def update_clock(self) -> None:
        """Update the clock in the header."""
        self.refresh()


class VolSurfaceApp(App):
    """Main TUI application for volatility surface monitoring."""
    
    TITLE = "BTC Options Volatility Surface Monitor"
    CSS_PATH = None
    
    BINDINGS = [
        ("q", "quit", "Quit"),
        ("r", "refresh", "Refresh"),
        ("d", "toggle_dark", "Toggle Dark Mode"),
        ("h", "help", "Help"),
    ]
    
    def on_mount(self) -> None:
        """Mount the main screen."""
        self.push_screen(VolSurfaceScreen())
    
    def action_refresh(self) -> None:
        """Refresh the display."""
        self.notify("Refreshing display...", severity="information")
        self.refresh()
    
    def action_help(self) -> None:
        """Show help information."""
        help_text = """
        Keyboard Shortcuts:
        
        q - Quit application
        r - Refresh display
        d - Toggle dark/light mode
        h - Show this help
        
        This monitor displays real-time implied volatility
        surface data for Bitcoin options.
        """
        self.notify(help_text, severity="information", timeout=10)


def main():
    """Run the volatility surface TUI."""
    app = VolSurfaceApp()
    app.run()


if __name__ == "__main__":
    main()