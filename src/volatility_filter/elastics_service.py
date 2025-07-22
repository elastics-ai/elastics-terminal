"""
Elastics data service for SSVI surface fitting and risk analytics.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass

from .ssvi_model import SSVIModel
from .options_pricer import OptionsPricer
from .database import DatabaseManager
from .option_chain_manager import OptionChainManager

logger = logging.getLogger(__name__)


@dataclass
class ElasticsMetrics:
    """Container for Elastics dashboard metrics."""
    total_pnl: float
    daily_pnl: float
    sharpe_ratio: float
    max_drawdown: float
    win_rate: float
    avg_trade_size: float
    total_volume: float
    active_positions: int


class ElasticsService:
    """Service for Elastics module data aggregation and calculations."""
    
    def __init__(self, db_manager: DatabaseManager, option_chain_manager: OptionChainManager):
        self.db = db_manager
        self.option_chain = option_chain_manager
        self.ssvi_model = SSVIModel()
        self.pricer = OptionsPricer()
        
        # Cache for surface data
        self._surface_cache = {}
        self._cache_ttl = 60  # seconds
        
    def get_ssvi_surface_data(self, symbol: str = "BTC") -> Dict[str, Any]:
        """
        Get SSVI surface data for visualization.
        
        Args:
            symbol: Asset symbol (default: BTC)
            
        Returns:
            Dictionary with surface data for frontend
        """
        try:
            # Check cache
            cache_key = f"ssvi_{symbol}"
            if cache_key in self._surface_cache:
                cached_data, timestamp = self._surface_cache[cache_key]
                if (datetime.now() - timestamp).seconds < self._cache_ttl:
                    return cached_data
            
            # Get option chain data
            chain_data = self.option_chain.get_current_chain()
            if not chain_data or symbol not in chain_data:
                logger.warning(f"No option chain data for {symbol}")
                return self._generate_mock_surface()
            
            # Extract strikes, IVs, and maturities
            strikes_list = []
            ivs_list = []
            forwards = []
            ttms = []
            
            options = chain_data[symbol]
            
            # Group by expiry
            expiry_groups = {}
            for opt in options:
                expiry = opt['expiry']
                if expiry not in expiry_groups:
                    expiry_groups[expiry] = []
                expiry_groups[expiry].append(opt)
            
            # Process each expiry
            spot_price = options[0]['underlying_price'] if options else 100000
            
            for expiry, opts in expiry_groups.items():
                # Calculate time to maturity
                ttm = (expiry - datetime.now()).total_seconds() / (365.25 * 24 * 3600)
                if ttm <= 0:
                    continue
                
                # Extract strikes and IVs
                strikes = []
                ivs = []
                
                for opt in opts:
                    if opt['iv'] and opt['iv'] > 0:
                        strikes.append(opt['strike'])
                        ivs.append(opt['iv'])
                
                if len(strikes) >= 3:  # Need at least 3 points
                    strikes_list.append(np.array(strikes))
                    ivs_list.append(np.array(ivs))
                    forwards.append(spot_price)  # Simplified: use spot as forward
                    ttms.append(ttm)
            
            if not ttms:
                logger.warning("Insufficient data for SSVI fitting")
                return self._generate_mock_surface()
            
            # Fit SSVI surface
            surface_params = self.ssvi_model.fit_surface(
                strikes_list,
                ivs_list,
                np.array(forwards),
                np.array(ttms)
            )
            
            # Generate surface points for visualization
            surface_points = self.ssvi_model.generate_surface_points(
                surface_params,
                k_range=(-0.5, 0.5),
                t_range=(0.08, 2.0),
                n_strikes=50,
                n_maturities=20
            )
            
            # Prepare data for frontend
            result = {
                "type": "ssvi",
                "timestamp": datetime.now().isoformat(),
                "symbol": symbol,
                "spot": spot_price,
                "surface": {
                    "strikes": surface_points['strikes'].tolist(),
                    "maturities": surface_points['maturities'].tolist(),
                    "ivs": surface_points['ivs'].tolist(),
                    "strike_range": [
                        float(np.exp(surface_points['k_grid'].min()) * spot_price),
                        float(np.exp(surface_points['k_grid'].max()) * spot_price)
                    ],
                    "maturity_range": [
                        float(surface_points['t_grid'].min()),
                        float(surface_points['t_grid'].max())
                    ]
                },
                "parameters": {
                    "theta": float(surface_params['theta']),
                    "gamma": float(surface_params['gamma']),
                    "rho": float(surface_params['rho']),
                    "lambda": float(surface_params['lambda'])
                },
                "calibration_quality": {
                    "rmse": float(np.mean([p['rmse'] for p in surface_params['slice_params']])),
                    "n_slices": len(surface_params['slice_params'])
                }
            }
            
            # Cache result
            self._surface_cache[cache_key] = (result, datetime.now())
            
            return result
            
        except Exception as e:
            logger.error(f"Error generating SSVI surface: {e}")
            return self._generate_mock_surface()
    
    def get_risk_neutral_density(self, symbol: str = "BTC", maturity: float = 0.25) -> Dict[str, Any]:
        """
        Calculate Breeden-Litzenberger risk-neutral density.
        
        Args:
            symbol: Asset symbol
            maturity: Time to maturity in years
            
        Returns:
            Risk-neutral density data
        """
        try:
            # Get SSVI surface parameters
            surface_data = self.get_ssvi_surface_data(symbol)
            if surface_data['type'] == 'mock':
                return self._generate_mock_density()
            
            params = surface_data['parameters']
            spot = surface_data['spot']
            
            # Generate strike range
            k_range = np.linspace(-0.5, 0.5, 100)
            strikes = spot * np.exp(k_range)
            
            # Calculate implied volatilities from SSVI
            theta_t = params['theta'] * maturity ** params['gamma']
            phi = params['lambda'] / np.sqrt(theta_t)
            
            ivs = []
            for k in k_range:
                w = self.ssvi_model.ssvi_implied_variance(k, theta_t, params['rho'], phi)
                iv = np.sqrt(w / maturity)
                ivs.append(iv)
            
            ivs = np.array(ivs)
            
            # Calculate option prices
            r = 0.02  # Risk-free rate assumption
            call_prices = []
            
            for i, (K, iv) in enumerate(zip(strikes, ivs)):
                price = self.pricer.black_scholes_price(spot, K, maturity, r, iv, 'call')
                call_prices.append(price)
            
            call_prices = np.array(call_prices)
            
            # Breeden-Litzenberger formula: density = d²C/dK²
            dk = strikes[1] - strikes[0]
            density = np.gradient(np.gradient(call_prices, dk), dk) * np.exp(r * maturity)
            
            # Ensure non-negative density
            density = np.maximum(density, 0)
            
            # Normalize
            integral = np.trapz(density, strikes)
            if integral > 0:
                density = density / integral
            
            return {
                "type": "breeden_litzenberger",
                "timestamp": datetime.now().isoformat(),
                "symbol": symbol,
                "maturity": maturity,
                "strikes": strikes.tolist(),
                "density": density.tolist(),
                "statistics": {
                    "mean": float(np.trapz(strikes * density, strikes)),
                    "std": float(np.sqrt(np.trapz((strikes - spot)**2 * density, strikes))),
                    "skew": float(self._calculate_skew(strikes, density, spot)),
                    "kurtosis": float(self._calculate_kurtosis(strikes, density, spot))
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating risk-neutral density: {e}")
            return self._generate_mock_density()
    
    def calculate_option_price(
        self,
        strike: float,
        maturity: float,
        option_type: str,
        pricer_type: str = "BS",
        symbol: str = "BTC"
    ) -> Dict[str, Any]:
        """
        Calculate option price using SSVI implied volatility.
        
        Args:
            strike: Strike price
            maturity: Time to maturity in years
            option_type: 'call' or 'put'
            pricer_type: Pricing model ('BS', 'Binary', etc.)
            symbol: Asset symbol
            
        Returns:
            Pricing results with Greeks
        """
        try:
            # Get current spot price
            chain_data = self.option_chain.get_current_chain()
            spot = 100000  # Default
            
            if chain_data and symbol in chain_data and chain_data[symbol]:
                spot = chain_data[symbol][0]['underlying_price']
            
            # Get implied volatility from SSVI surface
            surface_data = self.get_ssvi_surface_data(symbol)
            params = surface_data['parameters']
            
            # Calculate IV at this strike/maturity
            k = np.log(strike / spot)
            theta_t = params['theta'] * maturity ** params['gamma']
            phi = params['lambda'] / np.sqrt(theta_t)
            
            w = self.ssvi_model.ssvi_implied_variance(k, theta_t, params['rho'], phi)
            iv = np.sqrt(w / maturity)
            
            # Risk-free rate assumption
            r = 0.02
            
            # Calculate price based on pricer type
            if pricer_type.lower() == "binary":
                price = self.pricer.calculate_binary_option_price(
                    spot, strike, maturity, r, iv, option_type
                )
                # Binary options don't have traditional Greeks
                greeks = {
                    'delta': 0.0,
                    'gamma': 0.0,
                    'vega': 0.0,
                    'theta': 0.0,
                    'rho': 0.0
                }
            else:  # Black-Scholes
                price = self.pricer.black_scholes_price(
                    spot, strike, maturity, r, iv, option_type
                )
                greeks = self.pricer.calculate_greeks(
                    spot, strike, maturity, r, iv, option_type
                )
            
            return {
                "success": True,
                "timestamp": datetime.now().isoformat(),
                "inputs": {
                    "symbol": symbol,
                    "spot": spot,
                    "strike": strike,
                    "maturity": maturity,
                    "option_type": option_type,
                    "pricer": pricer_type
                },
                "results": {
                    "price": float(price),
                    "implied_vol": float(iv),
                    "greeks": {k: float(v) for k, v in greeks.items()}
                },
                "model": {
                    "type": "SSVI",
                    "risk_free_rate": r
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating option price: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def get_elastics_metrics(self) -> ElasticsMetrics:
        """Get aggregated metrics for Elastics dashboard."""
        try:
            # Get portfolio statistics
            stats = self.db.get_portfolio_statistics()
            
            # Calculate additional metrics
            trades = self.db.get_recent_trades(days=30)
            
            # Win rate
            winning_trades = len([t for t in trades if t.get('pnl', 0) > 0])
            total_trades = len(trades)
            win_rate = winning_trades / total_trades if total_trades > 0 else 0
            
            # Average trade size
            avg_trade_size = np.mean([abs(t.get('size', 0)) for t in trades]) if trades else 0
            
            # Total volume
            total_volume = sum([abs(t.get('size', 0)) * t.get('price', 0) for t in trades])
            
            return ElasticsMetrics(
                total_pnl=stats.get('total_pnl', 0),
                daily_pnl=stats.get('daily_pnl', 0),
                sharpe_ratio=stats.get('sharpe_ratio', 0),
                max_drawdown=stats.get('max_drawdown', 0),
                win_rate=win_rate,
                avg_trade_size=avg_trade_size,
                total_volume=total_volume,
                active_positions=stats.get('active_positions', 0)
            )
            
        except Exception as e:
            logger.error(f"Error getting Elastics metrics: {e}")
            return ElasticsMetrics(0, 0, 0, 0, 0, 0, 0, 0)
    
    def _generate_mock_surface(self) -> Dict[str, Any]:
        """Generate mock SSVI surface for testing."""
        n_strikes = 50
        n_maturities = 20
        
        # Generate grids
        k_grid = np.linspace(-0.5, 0.5, n_strikes)
        t_grid = np.linspace(0.08, 2.0, n_maturities)
        K, T = np.meshgrid(k_grid, t_grid)
        
        # Mock SSVI parameters
        theta = 0.04
        gamma = 0.7
        rho = -0.3
        lambda_param = 0.4
        
        # Generate surface
        IV = np.zeros_like(K)
        for i in range(n_maturities):
            for j in range(n_strikes):
                k = K[i, j]
                t = T[i, j]
                
                # Simple approximation for demo
                base_vol = 0.2 + 0.1 * np.sqrt(t)
                skew = 0.1 * k
                smile = 0.05 * k**2
                
                IV[i, j] = base_vol + skew + smile
        
        return {
            "type": "mock",
            "timestamp": datetime.now().isoformat(),
            "symbol": "BTC",
            "spot": 100000,
            "surface": {
                "strikes": K.tolist(),
                "maturities": T.tolist(),
                "ivs": IV.tolist(),
                "strike_range": [70000, 130000],
                "maturity_range": [0.08, 2.0]
            },
            "parameters": {
                "theta": theta,
                "gamma": gamma,
                "rho": rho,
                "lambda": lambda_param
            },
            "calibration_quality": {
                "rmse": 0.01,
                "n_slices": 10
            }
        }
    
    def _generate_mock_density(self) -> Dict[str, Any]:
        """Generate mock risk-neutral density."""
        strikes = np.linspace(70000, 130000, 100)
        spot = 100000
        
        # Log-normal approximation
        sigma = 0.3
        mu = np.log(spot) - 0.5 * sigma**2 * 0.25
        
        log_strikes = np.log(strikes)
        density = (1 / (strikes * sigma * np.sqrt(2 * np.pi * 0.25))) * \
                 np.exp(-0.5 * ((log_strikes - mu) / (sigma * np.sqrt(0.25)))**2)
        
        # Normalize
        density = density / np.trapz(density, strikes)
        
        return {
            "type": "mock",
            "timestamp": datetime.now().isoformat(),
            "symbol": "BTC",
            "maturity": 0.25,
            "strikes": strikes.tolist(),
            "density": density.tolist(),
            "statistics": {
                "mean": float(spot),
                "std": float(spot * sigma * np.sqrt(0.25)),
                "skew": 0.0,
                "kurtosis": 3.0
            }
        }
    
    def _calculate_skew(self, strikes: np.ndarray, density: np.ndarray, spot: float) -> float:
        """Calculate skewness from density."""
        mean = np.trapz(strikes * density, strikes)
        var = np.trapz((strikes - mean)**2 * density, strikes)
        if var > 0:
            skew = np.trapz((strikes - mean)**3 * density, strikes) / var**1.5
            return skew
        return 0.0
    
    def _calculate_kurtosis(self, strikes: np.ndarray, density: np.ndarray, spot: float) -> float:
        """Calculate kurtosis from density."""
        mean = np.trapz(strikes * density, strikes)
        var = np.trapz((strikes - mean)**2 * density, strikes)
        if var > 0:
            kurt = np.trapz((strikes - mean)**4 * density, strikes) / var**2
            return kurt
        return 3.0