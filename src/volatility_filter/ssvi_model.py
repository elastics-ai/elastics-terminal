"""
SSVI (Stochastic Surface Volatility Inspired) model implementation.
Based on Gatheral and Jacquier (2014) parameterization.
"""

import numpy as np
from scipy.optimize import minimize, differential_evolution
from typing import Dict, List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class SSVIModel:
    """
    SSVI volatility surface model implementation.
    
    The SSVI parameterization provides a parsimonious way to fit
    the entire implied volatility surface consistently across strikes
    and maturities while ensuring absence of calendar arbitrage.
    """
    
    def __init__(self):
        # SSVI parameters bounds
        self.param_bounds = {
            'rho': (-0.999, 0.999),      # Correlation parameter
            'lambda': (0.01, 2.0),        # Vol of vol parameter  
            'theta': (0.01, 1.0),         # Long-term variance
            'eta': (0.01, 2.0),           # Curvature parameter
            'gamma': (0.01, 1.0)          # Time decay parameter
        }
        
        # Fitting options
        self.max_iter = 1000
        self.tolerance = 1e-6
        
    def ssvi_implied_variance(
        self,
        k: float,  # Log-moneyness
        theta_t: float,  # ATM total variance
        rho: float,
        phi: float
    ) -> float:
        """
        Calculate implied variance using SSVI formula.
        
        Args:
            k: Log-moneyness (log(K/F))
            theta_t: ATM total variance (sigma_ATM^2 * T)
            rho: Correlation parameter
            phi: Vol of vol parameter scaled by theta_t
            
        Returns:
            Total implied variance
        """
        # SSVI formula: w(k) = theta_t/2 * (1 + rho*phi*k + sqrt((phi*k + rho)^2 + (1-rho^2)))
        term1 = phi * k + rho
        term2 = np.sqrt(term1**2 + (1 - rho**2))
        
        w = 0.5 * theta_t * (1 + rho * phi * k + term2)
        
        return w
    
    def fit_slice(
        self,
        strikes: np.ndarray,
        ivs: np.ndarray,
        forward: float,
        ttm: float,
        weights: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Fit SSVI parameters to a single maturity slice.
        
        Args:
            strikes: Strike prices
            ivs: Implied volatilities 
            forward: Forward price
            ttm: Time to maturity
            weights: Optional weights for weighted least squares
            
        Returns:
            Dictionary with fitted parameters
        """
        # Convert to log-moneyness
        k = np.log(strikes / forward)
        
        # Total variance
        w_market = ivs**2 * ttm
        
        # ATM variance approximation
        atm_idx = np.argmin(np.abs(k))
        theta_t = w_market[atm_idx]
        
        if weights is None:
            weights = np.ones_like(k)
        
        def objective(params):
            """Objective function for SSVI fitting."""
            rho, phi = params
            
            # Ensure parameters are in valid range
            if abs(rho) >= 1 or phi <= 0:
                return 1e10
            
            # Calculate SSVI implied variance
            w_model = np.array([
                self.ssvi_implied_variance(ki, theta_t, rho, phi)
                for ki in k
            ])
            
            # Weighted squared error
            error = np.sum(weights * (w_model - w_market)**2)
            
            return error
        
        # Initial guess
        x0 = [0.0, 0.5]  # rho=0, phi=0.5
        
        # Bounds
        bounds = [(-0.99, 0.99), (0.01, 2.0)]
        
        # Optimize
        result = minimize(
            objective,
            x0,
            bounds=bounds,
            method='L-BFGS-B',
            options={'maxiter': self.max_iter}
        )
        
        if not result.success:
            logger.warning(f"SSVI fitting did not converge: {result.message}")
        
        rho_opt, phi_opt = result.x
        
        return {
            'theta_t': theta_t,
            'rho': rho_opt,
            'phi': phi_opt,
            'ttm': ttm,
            'rmse': np.sqrt(result.fun / len(k))
        }
    
    def fit_surface(
        self,
        strikes_list: List[np.ndarray],
        ivs_list: List[np.ndarray],
        forwards: np.ndarray,
        ttms: np.ndarray,
        weights_list: Optional[List[np.ndarray]] = None
    ) -> Dict[str, np.ndarray]:
        """
        Fit SSVI surface to multiple maturity slices.
        
        Args:
            strikes_list: List of strike arrays for each maturity
            ivs_list: List of IV arrays for each maturity
            forwards: Forward prices for each maturity
            ttms: Times to maturity
            weights_list: Optional list of weight arrays
            
        Returns:
            Dictionary with fitted surface parameters
        """
        n_slices = len(ttms)
        
        # Fit each slice independently first
        slice_params = []
        for i in range(n_slices):
            weights = weights_list[i] if weights_list else None
            params = self.fit_slice(
                strikes_list[i],
                ivs_list[i],
                forwards[i],
                ttms[i],
                weights
            )
            slice_params.append(params)
        
        # Extract parameters
        theta_ts = np.array([p['theta_t'] for p in slice_params])
        rhos = np.array([p['rho'] for p in slice_params])
        phis = np.array([p['phi'] for p in slice_params])
        
        # Fit power law for theta_t: theta_t = theta * t^gamma
        def theta_power_law(t, theta, gamma):
            return theta * t**gamma
        
        # Fit theta and gamma
        log_ttms = np.log(ttms)
        log_theta_ts = np.log(theta_ts)
        
        # Linear regression in log space
        A = np.vstack([np.ones_like(log_ttms), log_ttms]).T
        theta_log, gamma = np.linalg.lstsq(A, log_theta_ts, rcond=None)[0]
        theta = np.exp(theta_log)
        
        # Fit rho and lambda as functions of time
        # For simplicity, use average values
        rho_avg = np.mean(rhos)
        lambda_avg = np.mean(phis)
        
        # Store surface parameters
        surface_params = {
            'theta': theta,
            'gamma': gamma,
            'rho': rho_avg,
            'lambda': lambda_avg,
            'ttms': ttms,
            'slice_params': slice_params
        }
        
        return surface_params
    
    def calibrate_heston_approximation(
        self,
        surface_params: Dict[str, float]
    ) -> Dict[str, float]:
        """
        Calibrate Heston model parameters from SSVI surface.
        
        This provides an approximation to map SSVI to Heston dynamics.
        
        Args:
            surface_params: SSVI surface parameters
            
        Returns:
            Approximate Heston parameters
        """
        theta = surface_params['theta']
        gamma = surface_params['gamma']
        rho = surface_params['rho']
        lambda_param = surface_params['lambda']
        
        # Heston approximation (rough mapping)
        # v0: Initial variance
        v0 = theta
        
        # kappa: Mean reversion speed
        kappa = 2.0 * (1 - gamma)
        
        # theta_heston: Long-term variance
        theta_heston = theta
        
        # sigma: Vol of vol
        sigma = lambda_param * np.sqrt(2 * kappa)
        
        # rho_heston: Correlation
        rho_heston = rho
        
        return {
            'v0': v0,
            'kappa': kappa,
            'theta': theta_heston,
            'sigma': sigma,
            'rho': rho_heston
        }
    
    def no_calendar_arbitrage_check(
        self,
        surface_params: Dict[str, float],
        ttms: np.ndarray
    ) -> bool:
        """
        Check for calendar arbitrage in the SSVI surface.
        
        Args:
            surface_params: SSVI surface parameters
            ttms: Times to maturity to check
            
        Returns:
            True if no calendar arbitrage detected
        """
        theta = surface_params['theta']
        gamma = surface_params['gamma']
        
        # Check that total variance is increasing in time
        # d(theta * t^gamma)/dt = theta * gamma * t^(gamma-1) > 0
        # This requires gamma > 0
        
        if gamma <= 0:
            logger.warning("Calendar arbitrage detected: gamma <= 0")
            return False
        
        # Check total variance is positive
        for t in ttms:
            if theta * t**gamma <= 0:
                logger.warning(f"Calendar arbitrage detected: negative total variance at t={t}")
                return False
        
        return True
    
    def compute_local_volatility(
        self,
        k: float,
        t: float,
        surface_params: Dict[str, float]
    ) -> float:
        """
        Compute local volatility from SSVI implied volatility surface.
        
        Uses Dupire's formula to extract local vol from IV surface.
        
        Args:
            k: Log-moneyness
            t: Time to maturity
            surface_params: SSVI surface parameters
            
        Returns:
            Local volatility
        """
        # Parameters
        theta = surface_params['theta'] 
        gamma = surface_params['gamma']
        rho = surface_params['rho']
        lambda_param = surface_params['lambda']
        
        # ATM total variance
        theta_t = theta * t**gamma
        phi = lambda_param / np.sqrt(theta_t)
        
        # Implied variance and its derivatives
        w = self.ssvi_implied_variance(k, theta_t, rho, phi)
        
        # Numerical derivatives (using finite differences)
        dk = 0.0001
        dt = 0.0001
        
        # dw/dk
        w_plus_k = self.ssvi_implied_variance(k + dk, theta_t, rho, phi)
        w_minus_k = self.ssvi_implied_variance(k - dk, theta_t, rho, phi)
        dw_dk = (w_plus_k - w_minus_k) / (2 * dk)
        
        # d2w/dk2  
        d2w_dk2 = (w_plus_k - 2*w + w_minus_k) / dk**2
        
        # dw/dt
        theta_t_plus = theta * (t + dt)**gamma
        phi_plus = lambda_param / np.sqrt(theta_t_plus)
        w_plus_t = self.ssvi_implied_variance(k, theta_t_plus, rho, phi_plus)
        dw_dt = (w_plus_t - w) / dt
        
        # Dupire formula
        numerator = dw_dt
        denominator = 1 - k/w * dw_dk + 0.25 * (-0.25 - 1/w + k**2/w**2) * dw_dk**2 + 0.5 * d2w_dk2
        
        if denominator <= 0:
            logger.warning(f"Invalid local volatility at k={k}, t={t}")
            return np.sqrt(w / t)  # Fallback to implied vol
        
        local_var = numerator / denominator
        
        if local_var < 0:
            logger.warning(f"Negative local variance at k={k}, t={t}")
            return np.sqrt(w / t)  # Fallback to implied vol
        
        return np.sqrt(local_var / t)
    
    def generate_surface_points(
        self,
        surface_params: Dict[str, float],
        k_range: Tuple[float, float] = (-0.5, 0.5),
        t_range: Tuple[float, float] = (0.08, 2.0),
        n_strikes: int = 50,
        n_maturities: int = 20
    ) -> Dict[str, np.ndarray]:
        """
        Generate implied volatility surface points from SSVI parameters.
        
        Args:
            surface_params: SSVI surface parameters
            k_range: Log-moneyness range
            t_range: Time to maturity range
            n_strikes: Number of strike points
            n_maturities: Number of maturity points
            
        Returns:
            Dictionary with strike, maturity, and IV grids
        """
        # Generate grids
        k_grid = np.linspace(k_range[0], k_range[1], n_strikes)
        t_grid = np.linspace(t_range[0], t_range[1], n_maturities)
        
        # Meshgrid for 3D surface
        K, T = np.meshgrid(k_grid, t_grid)
        
        # Parameters
        theta = surface_params['theta']
        gamma = surface_params['gamma']
        rho = surface_params['rho'] 
        lambda_param = surface_params['lambda']
        
        # Calculate implied volatilities
        IV = np.zeros_like(K)
        
        for i in range(n_maturities):
            for j in range(n_strikes):
                k = K[i, j]
                t = T[i, j]
                
                # ATM total variance
                theta_t = theta * t**gamma
                phi = lambda_param / np.sqrt(theta_t)
                
                # Total variance
                w = self.ssvi_implied_variance(k, theta_t, rho, phi)
                
                # Implied volatility
                IV[i, j] = np.sqrt(w / t)
        
        return {
            'strikes': K,
            'maturities': T,
            'ivs': IV,
            'k_grid': k_grid,
            't_grid': t_grid
        }