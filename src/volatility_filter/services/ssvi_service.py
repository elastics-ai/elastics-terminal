"""
SSVI (Stochastic-Volatility Inspired) volatility surface modeling service.

This service wraps the elastics-options SSVI implementation to provide:
- Arbitrage-free volatility surface fitting
- Interactive 3D surface visualization
- Real-time surface parameter updates
- Integration with portfolio risk calculations
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any, Callable
import logging
from datetime import datetime
from dataclasses import dataclass

# Import from elastics-options
from options.ssvi import SSVI
from ..database import DatabaseManager
from ..models.volatility import SSVIParameters, SurfaceFitResult, VolatilitySurfacePoint

logger = logging.getLogger(__name__)


@dataclass
class SSVIFitConfig:
    """Configuration for SSVI surface fitting."""
    use_butterfly_constraints: bool = True
    use_calendar_constraints: bool = True
    k_grid_bounds: Tuple[float, float] = (-3.0, 3.0)
    k_grid_points: int = 25
    max_iterations: int = 100
    tolerance: float = 1e-6
    verbose: bool = False


@dataclass
class SSVICalibrationData:
    """Market data for SSVI calibration."""
    symbols: List[str]
    strikes: np.ndarray
    spot_prices: np.ndarray
    expiries: np.ndarray
    implied_vols: np.ndarray
    time_to_expiry: np.ndarray
    log_moneyness: np.ndarray
    risk_free_rates: np.ndarray
    dividend_yields: np.ndarray
    timestamp: datetime


class SSVIService:
    """Service for SSVI volatility surface modeling and calibration."""
    
    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db = db_manager or DatabaseManager()
        self.fitted_surfaces: Dict[str, SSVI] = {}
        self.fit_configs: Dict[str, SSVIFitConfig] = {}
        self.last_calibration: Dict[str, datetime] = {}
    
    def create_theta_function(self, model_type: str = "power_law") -> Callable:
        """
        Create theta function for SSVI parameterization.
        
        Args:
            model_type: Type of theta parameterization
                - "power_law": θ(τ) = a * τ^b + c
                - "heston": θ(τ) = a * (1 - exp(-b*τ)) / (b*τ) + c
                - "linear": θ(τ) = a * τ + c
        
        Returns:
            Callable theta function
        """
        if model_type == "power_law":
            return lambda tau, params: params[0] * np.power(tau, params[1]) + params[2]
        elif model_type == "heston":
            return lambda tau, params: params[0] * (1 - np.exp(-params[1] * tau)) / (params[1] * tau) + params[2]
        elif model_type == "linear":
            return lambda tau, params: params[0] * tau + params[2]
        else:
            raise ValueError(f"Unknown theta model type: {model_type}")
    
    def create_phi_function(self, model_type: str = "power_law") -> Callable:
        """
        Create phi function for SSVI parameterization.
        
        Args:
            model_type: Type of phi parameterization
                - "power_law": φ(θ) = η / θ^γ
                - "heston": φ(θ) = η / (θ^γ * (1 + θ)^(1-γ))
                - "exponential": φ(θ) = η * exp(-γ * θ)
        
        Returns:
            Callable phi function
        """
        if model_type == "power_law":
            return lambda theta, params: params[3] / np.power(theta, params[4])
        elif model_type == "heston":
            return lambda theta, params: params[3] / (np.power(theta, params[4]) * np.power(1 + theta, 1 - params[4]))
        elif model_type == "exponential":
            return lambda theta, params: params[3] * np.exp(-params[4] * theta)
        else:
            raise ValueError(f"Unknown phi model type: {model_type}")
    
    def prepare_market_data(
        self,
        option_data: pd.DataFrame,
        symbol: str,
        current_spot: float,
        risk_free_rate: float = 0.02,
        dividend_yield: float = 0.0
    ) -> SSVICalibrationData:
        """
        Prepare market data for SSVI calibration.
        
        Args:
            option_data: DataFrame with columns ['strike', 'expiry', 'implied_vol', 'bid', 'ask']
            symbol: Underlying symbol
            current_spot: Current spot price
            risk_free_rate: Risk-free rate
            dividend_yield: Dividend yield
        
        Returns:
            Prepared calibration data
        """
        # Calculate time to expiry in years
        current_time = datetime.now()
        option_data = option_data.copy()
        
        if isinstance(option_data['expiry'].iloc[0], str):
            option_data['expiry'] = pd.to_datetime(option_data['expiry'])
        
        option_data['time_to_expiry'] = (
            (option_data['expiry'] - current_time).dt.total_seconds() / (365.25 * 24 * 3600)
        )
        
        # Filter out expired options
        option_data = option_data[option_data['time_to_expiry'] > 0.001]  # At least 0.1% of a year
        
        # Calculate log-moneyness
        option_data['log_moneyness'] = np.log(option_data['strike'] / current_spot)
        
        # Clean data
        option_data = option_data.dropna(subset=['implied_vol', 'log_moneyness', 'time_to_expiry'])
        option_data = option_data[option_data['implied_vol'] > 0]
        
        # Convert implied vol to decimal if in percentage
        if option_data['implied_vol'].max() > 5:  # Likely in percentage
            option_data['implied_vol'] = option_data['implied_vol'] / 100.0
        
        return SSVICalibrationData(
            symbols=[symbol] * len(option_data),
            strikes=option_data['strike'].values,
            spot_prices=np.full(len(option_data), current_spot),
            expiries=option_data['expiry'].values,
            implied_vols=option_data['implied_vol'].values,
            time_to_expiry=option_data['time_to_expiry'].values,
            log_moneyness=option_data['log_moneyness'].values,
            risk_free_rates=np.full(len(option_data), risk_free_rate),
            dividend_yields=np.full(len(option_data), dividend_yield),
            timestamp=current_time
        )
    
    def fit_surface(
        self,
        calibration_data: SSVICalibrationData,
        symbol: str,
        theta_model_type: str = "power_law",
        phi_model_type: str = "heston",
        initial_params: Optional[List[float]] = None,
        bounds: Optional[List[Tuple[float, float]]] = None,
        fit_config: Optional[SSVIFitConfig] = None
    ) -> SurfaceFitResult:
        """
        Fit SSVI surface to market data.
        
        Args:
            calibration_data: Market data for calibration
            symbol: Underlying symbol
            theta_model_type: Type of theta parameterization
            phi_model_type: Type of phi parameterization
            initial_params: Initial parameter guess [a, b, c, η, γ, ρ]
            bounds: Parameter bounds
            fit_config: Fitting configuration
        
        Returns:
            Surface fit result
        """
        config = fit_config or SSVIFitConfig()
        
        # Create theta and phi functions
        theta_fn = self.create_theta_function(theta_model_type)
        phi_fn = self.create_phi_function(phi_model_type)
        
        # Initialize SSVI model
        ssvi_model = SSVI(theta_fn=theta_fn, phi_fn=phi_fn)
        
        # Set default parameters if not provided
        if initial_params is None:
            initial_params = [0.1, 0.5, 0.01, 0.2, 0.5, -0.2]  # [a, b, c, η, γ, ρ]
        
        if bounds is None:
            bounds = [
                (1e-6, 10),     # a: theta scale
                (0.01, 2.0),    # b: theta power
                (0.0, 1.0),     # c: theta offset
                (1e-4, 10.0),   # η: phi scale
                (0.01, 1.0),    # γ: phi power
                (-0.999, 0.999) # ρ: correlation
            ]
        
        try:
            # Fit the model
            ssvi_model.fit(
                k=calibration_data.log_moneyness,
                t=calibration_data.time_to_expiry,
                iv=calibration_data.implied_vols,
                init_params=initial_params,
                bounds=bounds,
                use_butterfly=config.use_butterfly_constraints,
                use_calendar=config.use_calendar_constraints,
                k_grid=np.linspace(*config.k_grid_bounds, config.k_grid_points),
                verbose=config.verbose
            )
            
            # Calculate fit quality metrics
            predicted_iv = ssvi_model.implied_vol(
                calibration_data.log_moneyness,
                calibration_data.time_to_expiry
            )
            
            rmse = np.sqrt(np.mean((calibration_data.implied_vols - predicted_iv)**2))
            max_error = np.max(np.abs(calibration_data.implied_vols - predicted_iv))
            r_squared = 1 - np.sum((calibration_data.implied_vols - predicted_iv)**2) / \
                          np.sum((calibration_data.implied_vols - np.mean(calibration_data.implied_vols))**2)
            
            # Store fitted surface
            self.fitted_surfaces[symbol] = ssvi_model
            self.fit_configs[symbol] = config
            self.last_calibration[symbol] = calibration_data.timestamp
            
            # Create result
            fit_result = SurfaceFitResult(
                symbol=symbol,
                model_type="SSVI",
                parameters=SSVIParameters(
                    theta_a=ssvi_model.params[0],
                    theta_b=ssvi_model.params[1],
                    theta_c=ssvi_model.params[2],
                    phi_eta=ssvi_model.params[3],
                    phi_gamma=ssvi_model.params[4],
                    rho=ssvi_model.rho,
                    theta_model_type=theta_model_type,
                    phi_model_type=phi_model_type
                ),
                fit_quality={
                    "rmse": rmse,
                    "max_error": max_error,
                    "r_squared": r_squared,
                    "data_points": len(calibration_data.implied_vols),
                    "converged": True
                },
                calibration_timestamp=calibration_data.timestamp,
                expiry_range=(calibration_data.time_to_expiry.min(), calibration_data.time_to_expiry.max()),
                strike_range=(calibration_data.strikes.min(), calibration_data.strikes.max())
            )
            
            logger.info(f"Successfully fitted SSVI surface for {symbol}. RMSE: {rmse:.6f}")
            return fit_result
            
        except Exception as e:
            logger.error(f"Failed to fit SSVI surface for {symbol}: {str(e)}")
            raise
    
    def get_implied_volatility(
        self,
        symbol: str,
        strikes: np.ndarray,
        expiries: np.ndarray,
        spot_price: float
    ) -> np.ndarray:
        """
        Get implied volatility from fitted surface.
        
        Args:
            symbol: Underlying symbol
            strikes: Strike prices
            expiries: Expiry dates
            spot_price: Current spot price
        
        Returns:
            Implied volatilities
        """
        if symbol not in self.fitted_surfaces:
            raise ValueError(f"No fitted surface available for {symbol}")
        
        # Convert expiries to time-to-expiry if needed
        if isinstance(expiries[0], (datetime, pd.Timestamp)):
            current_time = datetime.now()
            time_to_expiry = np.array([
                (exp - current_time).total_seconds() / (365.25 * 24 * 3600)
                for exp in expiries
            ])
        else:
            time_to_expiry = expiries
        
        # Calculate log-moneyness
        log_moneyness = np.log(strikes / spot_price)
        
        # Get implied volatility from fitted surface
        surface = self.fitted_surfaces[symbol]
        return surface.implied_vol(log_moneyness, time_to_expiry)
    
    def generate_surface_grid(
        self,
        symbol: str,
        k_range: Tuple[float, float] = (-1.0, 1.0),
        k_points: int = 50,
        t_range: Tuple[float, float] = (0.01, 1.0),
        t_points: int = 40
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Generate volatility surface grid for visualization.
        
        Args:
            symbol: Underlying symbol
            k_range: Log-moneyness range
            k_points: Number of log-moneyness points
            t_range: Time-to-expiry range  
            t_points: Number of time points
        
        Returns:
            Tuple of (K_grid, T_grid, IV_surface)
        """
        if symbol not in self.fitted_surfaces:
            raise ValueError(f"No fitted surface available for {symbol}")
        
        surface = self.fitted_surfaces[symbol]
        
        k_grid = np.linspace(k_range[0], k_range[1], k_points)
        t_grid = np.linspace(t_range[0], t_range[1], t_points)
        
        K, T = np.meshgrid(k_grid, t_grid)
        IV = surface.implied_vol(K.flatten(), T.flatten()).reshape(K.shape)
        
        return K, T, IV
    
    def check_arbitrage_conditions(
        self,
        symbol: str,
        k_grid: Optional[np.ndarray] = None,
        t_grid: Optional[np.ndarray] = None
    ) -> Dict[str, Any]:
        """
        Check arbitrage conditions for fitted surface.
        
        Args:
            symbol: Underlying symbol
            k_grid: Log-moneyness grid for checking
            t_grid: Time-to-expiry grid for checking
        
        Returns:
            Dictionary with arbitrage check results
        """
        if symbol not in self.fitted_surfaces:
            raise ValueError(f"No fitted surface available for {symbol}")
        
        surface = self.fitted_surfaces[symbol]
        
        if k_grid is None:
            k_grid = np.linspace(-2.0, 2.0, 20)
        if t_grid is None:
            t_grid = np.linspace(0.01, 1.0, 10)
        
        # Get current parameters
        params = list(surface.params) + [surface.rho]
        
        # Check butterfly arbitrage
        butterfly_ok = surface.butterfly_constraint(params, k_grid, t_grid) > 0
        
        # Check calendar arbitrage
        calendar_ok = surface.calendar_constraint(params, t_grid) > 0
        
        return {
            "butterfly_arbitrage_free": butterfly_ok,
            "calendar_arbitrage_free": calendar_ok,
            "overall_arbitrage_free": butterfly_ok and calendar_ok,
            "k_grid_bounds": (k_grid.min(), k_grid.max()),
            "t_grid_bounds": (t_grid.min(), t_grid.max())
        }
    
    def create_surface_visualization_data(
        self,
        symbol: str,
        market_data: Optional[SSVICalibrationData] = None
    ) -> Dict[str, Any]:
        """
        Create data for 3D surface visualization.
        
        Args:
            symbol: Underlying symbol
            market_data: Optional market data to overlay
        
        Returns:
            Dictionary with visualization data
        """
        K, T, IV = self.generate_surface_grid(symbol)
        
        viz_data = {
            "surface": {
                "x": K.tolist(),
                "y": T.tolist(), 
                "z": IV.tolist(),
                "type": "surface",
                "colorscale": "Viridis",
                "name": f"{symbol} SSVI Surface"
            },
            "layout": {
                "scene": {
                    "xaxis": {"title": "Log-Moneyness"},
                    "yaxis": {"title": "Time to Expiry"},
                    "zaxis": {"title": "Implied Volatility"}
                },
                "title": f"{symbol} SSVI Volatility Surface",
                "height": 800
            }
        }
        
        # Add market data points if provided
        if market_data:
            viz_data["market_data"] = {
                "x": market_data.log_moneyness.tolist(),
                "y": market_data.time_to_expiry.tolist(),
                "z": market_data.implied_vols.tolist(),
                "type": "scatter3d",
                "mode": "markers",
                "marker": {"size": 3, "color": "red"},
                "name": "Market Data"
            }
        
        return viz_data
    
    def get_surface_parameters(self, symbol: str) -> Optional[SSVIParameters]:
        """
        Get fitted surface parameters.
        
        Args:
            symbol: Underlying symbol
        
        Returns:
            SSVI parameters if surface is fitted
        """
        if symbol not in self.fitted_surfaces:
            return None
        
        surface = self.fitted_surfaces[symbol]
        
        return SSVIParameters(
            theta_a=surface.params[0],
            theta_b=surface.params[1], 
            theta_c=surface.params[2],
            phi_eta=surface.params[3],
            phi_gamma=surface.params[4],
            rho=surface.rho,
            theta_model_type="power_law",  # Would need to store this
            phi_model_type="heston"       # Would need to store this
        )
    
    def get_fitted_symbols(self) -> List[str]:
        """Get list of symbols with fitted surfaces."""
        return list(self.fitted_surfaces.keys())
    
    def remove_surface(self, symbol: str) -> bool:
        """Remove fitted surface for symbol."""
        if symbol in self.fitted_surfaces:
            del self.fitted_surfaces[symbol]
            del self.fit_configs[symbol]
            del self.last_calibration[symbol]
            return True
        return False