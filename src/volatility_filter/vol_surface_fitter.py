"""
Volatility surface fitting module for option chains.
Fits implied volatility surfaces using interpolation methods.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy import interpolate
from scipy.optimize import minimize_scalar

logger = logging.getLogger(__name__)


@dataclass
class OptionData:
    """Container for option data"""

    strike: float
    expiry: datetime
    option_type: str  # 'call' or 'put'
    bid: float
    ask: float
    underlying_price: float
    implied_volatility: Optional[float] = None


class VolatilitySurfaceFitter:
    """
    Fits and interpolates implied volatility surfaces for options.
    """

    def __init__(self):
        self.surface = None
        self.strikes = None
        self.expiries = None
        self.last_fit_time = None

    def calculate_moneyness(self, strike: float, spot: float) -> float:
        """Calculate log-moneyness: ln(K/S)"""
        return np.log(strike / spot)

    def calculate_time_to_expiry(
        self, expiry: datetime, current_time: datetime
    ) -> float:
        """Calculate time to expiry in years"""
        time_diff = expiry - current_time
        return time_diff.total_seconds() / (365.25 * 24 * 3600)

    def fit_surface(
        self, option_data: List[OptionData], current_time: Optional[datetime] = None
    ) -> Dict:
        """
        Fit volatility surface from option data.

        Args:
            option_data: List of option data points with implied volatilities
            current_time: Current time for TTM calculation

        Returns:
            Dictionary containing surface data and metadata
        """
        if current_time is None:
            current_time = datetime.utcnow()

        # Filter options with valid IVs
        valid_options = [
            opt
            for opt in option_data
            if opt.implied_volatility is not None and opt.implied_volatility > 0
        ]

        if len(valid_options) < 10:
            logger.warning(
                f"Insufficient valid options for surface fitting: {len(valid_options)}"
            )
            return None

        # Extract data points
        moneyness = []
        ttm = []
        ivs = []
        spot_price = valid_options[0].underlying_price

        for opt in valid_options:
            m = self.calculate_moneyness(opt.strike, spot_price)
            t = self.calculate_time_to_expiry(opt.expiry, current_time)

            if t > 0:  # Only include non-expired options
                moneyness.append(m)
                ttm.append(t)
                ivs.append(opt.implied_volatility)

        if len(moneyness) < 10:
            logger.warning("Insufficient data points after filtering")
            return None

        # Convert to numpy arrays
        moneyness = np.array(moneyness)
        ttm = np.array(ttm)
        ivs = np.array(ivs)

        # Create interpolation grid
        unique_moneyness = np.unique(moneyness)
        unique_ttm = np.unique(ttm)

        # Use RBF (Radial Basis Function) interpolation for smooth surface
        try:
            rbf = interpolate.Rbf(
                moneyness, ttm, ivs, function="thin_plate", smooth=0.1
            )

            # Create evaluation grid
            m_min, m_max = moneyness.min(), moneyness.max()
            t_min, t_max = ttm.min(), ttm.max()

            # Create grid with reasonable bounds
            m_grid = np.linspace(max(m_min, -0.5), min(m_max, 0.5), 50)
            t_grid = np.linspace(t_min, min(t_max, 2.0), 30)  # Cap at 2 years

            M_grid, T_grid = np.meshgrid(m_grid, t_grid)

            # Evaluate surface
            IV_surface = rbf(M_grid.ravel(), T_grid.ravel()).reshape(M_grid.shape)

            # Ensure positive IVs and reasonable bounds
            IV_surface = np.clip(IV_surface, 0.05, 3.0)  # 5% to 300% vol

            self.surface = IV_surface
            self.strikes = m_grid
            self.expiries = t_grid
            self.last_fit_time = current_time

            # Calculate surface statistics
            atm_index = np.argmin(np.abs(m_grid))
            atm_vols = IV_surface[:, atm_index]

            # Term structure (ATM vols across expiries)
            term_structure = list(zip(t_grid.tolist(), atm_vols.tolist()))

            # Smile for nearest expiry
            smile = list(zip(m_grid.tolist(), IV_surface[0, :].tolist()))

            result = {
                "surface": IV_surface.tolist(),
                "moneyness_grid": m_grid.tolist(),
                "ttm_grid": t_grid.tolist(),
                "spot_price": spot_price,
                "fit_time": current_time.isoformat(),
                "num_options": len(valid_options),
                "term_structure": term_structure,
                "smile": smile,
                "atm_vol": float(atm_vols[0]),
            }

            logger.info(
                f"Successfully fitted volatility surface with {len(valid_options)} options"
            )
            return result

        except Exception as e:
            logger.error(f"Error fitting volatility surface: {e}")
            return None

    def interpolate_vol(
        self,
        strike: float,
        expiry: datetime,
        spot: float,
        current_time: Optional[datetime] = None,
    ) -> Optional[float]:
        """
        Interpolate implied volatility for a given strike and expiry.

        Args:
            strike: Option strike price
            expiry: Option expiry datetime
            spot: Current spot price
            current_time: Current time for TTM calculation

        Returns:
            Interpolated implied volatility or None if surface not fitted
        """
        if self.surface is None:
            return None

        if current_time is None:
            current_time = datetime.utcnow()

        m = self.calculate_moneyness(strike, spot)
        t = self.calculate_time_to_expiry(expiry, current_time)

        # Check bounds
        if (
            m < self.strikes.min()
            or m > self.strikes.max()
            or t < self.expiries.min()
            or t > self.expiries.max()
        ):
            logger.warning(
                f"Interpolation point outside surface bounds: m={m:.3f}, t={t:.3f}"
            )
            return None

        # Bilinear interpolation
        interp = interpolate.RegularGridInterpolator(
            (self.expiries, self.strikes), self.surface
        )

        try:
            iv = float(interp([[t, m]])[0])
            return iv
        except Exception as e:
            logger.error(f"Error interpolating volatility: {e}")
            return None

    def get_surface_matrix(self) -> Optional[Dict]:
        """
        Get the fitted surface as a matrix suitable for visualization.

        Returns:
            Dictionary with surface data or None if not fitted
        """
        if self.surface is None:
            return None

        return {
            "z": self.surface.tolist(),  # Volatility values
            "x": self.strikes.tolist(),  # Moneyness
            "y": self.expiries.tolist(),  # Time to maturity
            "type": "surface",
        }
