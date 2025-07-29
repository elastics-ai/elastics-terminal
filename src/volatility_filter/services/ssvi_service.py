"""
Service wrapper for elastics-options SSVI model
"""
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import logging
from datetime import datetime

# Import from elastics-options
from options.ssvi import SSVI

logger = logging.getLogger(__name__)


class SSVIService:
    """Service wrapper for SSVI volatility surface calculations using elastics-options"""
    
    def __init__(self):
        # Define theta function for SSVI
        self.theta_fn = lambda tau, params: params[0] * tau ** params[1]
        
        # Define phi function for SSVI  
        self.phi_fn = lambda theta, params: params[2] / (theta ** params[3])
        
        self.ssvi_model = None
        self.last_calibration_time = None
        
    def calibrate_surface(
        self,
        strikes: np.ndarray,
        expiries: np.ndarray,
        implied_vols: np.ndarray,
        spot: float = 1.0,
        risk_free_rate: float = 0.0
    ) -> Dict[str, Any]:
        """
        Calibrate SSVI surface to market data
        
        Args:
            strikes: Array of strike prices
            expiries: Array of expiries in years
            implied_vols: 2D array of implied volatilities
            spot: Current spot price
            risk_free_rate: Risk-free rate
            
        Returns:
            Dictionary containing calibration results and surface data
        """
        try:
            # Convert strikes to log-moneyness
            k = np.log(strikes / spot)
            
            # Initialize SSVI model
            self.ssvi_model = SSVI(self.theta_fn, self.phi_fn)
            
            # Initial parameter guess
            init_params = np.array([0.1, 0.5, 1.0, 0.5, 0.0])  # [theta_0, gamma, phi_0, eta, rho]
            
            # Fit the surface
            self.ssvi_model.fit(
                k, 
                expiries, 
                implied_vols,
                init_params=init_params,
                butterfly_constraint=True,
                calendar_constraint=True
            )
            
            self.last_calibration_time = datetime.utcnow()
            
            # Generate surface for visualization
            k_grid = np.linspace(k.min(), k.max(), 50)
            t_grid = np.linspace(expiries.min(), expiries.max(), 50)
            
            surface = np.zeros((len(t_grid), len(k_grid)))
            for i, t in enumerate(t_grid):
                for j, k_val in enumerate(k_grid):
                    surface[i, j] = self.ssvi_model.implied_vol(k_val, t)
            
            return {
                "success": True,
                "params": self.ssvi_model.params.tolist(),
                "rho": float(self.ssvi_model.rho),
                "strikes": strikes.tolist(),
                "expiries": expiries.tolist(),
                "surface": surface.tolist(),
                "k_grid": k_grid.tolist(),
                "t_grid": t_grid.tolist(),
                "calibration_time": self.last_calibration_time.isoformat(),
                "model": "SSVI"
            }
            
        except Exception as e:
            logger.error(f"Error calibrating SSVI surface: {e}")
            return {
                "success": False,
                "error": str(e),
                "model": "SSVI"
            }
    
    def get_implied_vol(self, strike: float, expiry: float, spot: float = 1.0) -> float:
        """
        Get implied volatility for a given strike and expiry
        
        Args:
            strike: Strike price
            expiry: Time to expiry in years
            spot: Current spot price
            
        Returns:
            Implied volatility
        """
        if self.ssvi_model is None:
            raise ValueError("Model not calibrated. Call calibrate_surface first.")
        
        k = np.log(strike / spot)
        return self.ssvi_model.implied_vol(k, expiry)
    
    def get_total_variance(self, strike: float, expiry: float, spot: float = 1.0) -> float:
        """
        Get total variance for a given strike and expiry
        
        Args:
            strike: Strike price
            expiry: Time to expiry in years
            spot: Current spot price
            
        Returns:
            Total variance
        """
        if self.ssvi_model is None:
            raise ValueError("Model not calibrated. Call calibrate_surface first.")
        
        k = np.log(strike / spot)
        return self.ssvi_model.total_variance(k, expiry)
    
    def get_surface_for_display(
        self,
        strike_range: Tuple[float, float],
        expiry_range: Tuple[float, float],
        spot: float = 1.0,
        n_strikes: int = 50,
        n_expiries: int = 50
    ) -> Dict[str, Any]:
        """
        Generate volatility surface data for 3D visualization
        
        Args:
            strike_range: (min_strike, max_strike)
            expiry_range: (min_expiry, max_expiry) in years
            spot: Current spot price
            n_strikes: Number of strike points
            n_expiries: Number of expiry points
            
        Returns:
            Dictionary with surface data for visualization
        """
        if self.ssvi_model is None:
            raise ValueError("Model not calibrated. Call calibrate_surface first.")
        
        strikes = np.linspace(strike_range[0], strike_range[1], n_strikes)
        expiries = np.linspace(expiry_range[0], expiry_range[1], n_expiries)
        
        # Convert to moneyness
        moneyness = strikes / spot
        
        # Generate surface
        surface = np.zeros((n_expiries, n_strikes))
        for i, t in enumerate(expiries):
            for j, K in enumerate(strikes):
                k = np.log(K / spot)
                surface[i, j] = self.ssvi_model.implied_vol(k, t)
        
        return {
            "strikes": strikes.tolist(),
            "expiries": (expiries * 365).tolist(),  # Convert to days
            "moneyness": moneyness.tolist(),
            "surface": surface.tolist(),
            "spot": spot,
            "model": "SSVI",
            "params": {
                "rho": float(self.ssvi_model.rho),
                "params": self.ssvi_model.params.tolist()
            }
        }
    
    def check_arbitrage(self) -> Dict[str, bool]:
        """
        Check for arbitrage violations in the calibrated surface
        
        Returns:
            Dictionary with arbitrage check results
        """
        if self.ssvi_model is None:
            raise ValueError("Model not calibrated. Call calibrate_surface first.")
        
        # Check butterfly arbitrage
        k_test = np.linspace(-0.5, 0.5, 100)
        t_test = np.linspace(0.01, 1.0, 20)
        
        butterfly_ok = self.ssvi_model.butterfly_constraint(
            self.ssvi_model.params, k_test, t_test
        )
        
        # Check calendar arbitrage
        calendar_ok = self.ssvi_model.calendar_constraint(
            self.ssvi_model.params, t_test
        )
        
        return {
            "butterfly_arbitrage_free": bool(butterfly_ok),
            "calendar_arbitrage_free": bool(calendar_ok),
            "overall_arbitrage_free": bool(butterfly_ok and calendar_ok)
        }