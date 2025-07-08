# Bitcoin Option Chain Volatility Surface

This document describes the new option chain volatility surface feature that fetches Bitcoin option data from Deribit, fits volatility surfaces, and displays them in real-time.

## Overview

The system now supports:
- Real-time option price feeds via WebSocket
- Volatility surface fitting every minute
- 3D visualization of implied volatility surfaces
- Storage of all option data and fitted surfaces

## Quick Start

1. **Run the combined system with options enabled:**
   ```bash
   python scripts/run_combined_with_options.py --enable-options
   ```

2. **Open the JavaScript client in a browser:**
   ```bash
   open examples/javascript_client.html
   ```

   You'll see:
   - Left panel: Real-time realized volatility chart
   - Right panel: 3D implied volatility surface

## Configuration

### Environment Variables

```bash
# Enable option chain monitoring
ENABLE_OPTIONS=true

# Option currency (BTC or ETH)
OPTION_CURRENCY=BTC

# Volatility surface settings
VOL_SURFACE_FIT_INTERVAL=60      # Fit surface every 60 seconds
VOL_SURFACE_MIN_OPTIONS=20       # Minimum options needed for fitting
VOL_SURFACE_SMOOTHING=0.1        # RBF smoothing parameter
VOL_SURFACE_MONEYNESS_RANGE=0.5  # Moneyness range for surface
VOL_SURFACE_MAX_TTM=2.0          # Maximum time to maturity in years
```

### Command Line Arguments

```bash
python scripts/run_combined_with_options.py \
    --enable-options \
    --option-currency BTC \
    --debug
```

## Architecture

### New Components

1. **OptionChainManager** (`option_chain_manager.py`)
   - Manages WebSocket subscriptions to option tickers
   - Collects real-time option prices and Greeks
   - Triggers periodic volatility surface fitting

2. **VolatilitySurfaceFitter** (`vol_surface_fitter.py`)
   - Fits implied volatility surfaces using RBF interpolation
   - Calculates moneyness and time to maturity
   - Produces surface matrices for visualization

3. **Database Tables**
   - `option_instruments`: Option contract metadata
   - `option_greeks`: Real-time Greeks and prices
   - `volatility_surface_fits`: Fitted surface data

### Data Flow

1. Option price updates arrive via WebSocket
2. Greeks and prices are stored in the database
3. Every minute, the surface fitter runs:
   - Collects current option prices
   - Fits volatility surface using RBF interpolation
   - Stores surface in database
   - Broadcasts to WebSocket clients
4. JavaScript client receives and displays the 3D surface

## WebSocket Events

### Subscribe to Volatility Surface Updates

```javascript
ws.send(JSON.stringify({
    type: 'subscribe',
    events: ['vol_surface']
}));
```

### Surface Data Format

```javascript
{
    type: 'vol_surface',
    timestamp: 1234567890,
    data: {
        surface: [[...], [...]],        // 2D array of IV values
        moneyness_grid: [...],          // X-axis: ln(K/S)
        ttm_grid: [...],                // Y-axis: time to maturity
        spot_price: 45000.0,
        atm_vol: 0.65,
        num_options: 150
    }
}
```

## Visualization

The JavaScript client uses Plotly.js to render the volatility surface:
- X-axis: Moneyness (ln(K/S))
- Y-axis: Time to Maturity (years)
- Z-axis: Implied Volatility
- Color gradient shows volatility levels
- Hover tooltips display exact values

## Database Queries

### Get Latest Volatility Surface

```python
from volatility_filter.database import DatabaseManager

db = DatabaseManager()
surface = db.get_latest_volatility_surface('BTC')
```

### Query Historical Surfaces

```sql
SELECT * FROM volatility_surface_fits 
WHERE underlying = 'BTC' 
ORDER BY timestamp DESC 
LIMIT 10;
```

## Monitoring

Watch the logs for:
- Option instrument loading
- WebSocket subscription status
- Surface fitting results
- Broadcast confirmations

```
INFO - Loaded 150 option instruments
INFO - Subscribed to 150 option ticker channels
INFO - Fitted volatility surface with 145 options
INFO - Volatility surface updated with 145 options
```

## Troubleshooting

1. **No surface displayed**: Check that enough options have valid IVs (minimum 20)
2. **WebSocket errors**: Ensure Deribit connection is stable
3. **Surface fitting errors**: Check for extreme IV values or insufficient data
4. **Performance issues**: Reduce the number of monitored expiries in config

## Future Enhancements

- Greeks-based trading signals
- Volatility arbitrage detection
- Option flow analysis
- Surface change alerts
- Historical surface playback