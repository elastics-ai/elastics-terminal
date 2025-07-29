"""
Options pricing engine with Black-Scholes model and Greeks calculations.
"""

import numpy as np
from scipy.stats import norm
from typing import Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class OptionsPricer:
    """Black-Scholes options pricing model with Greeks calculations."""
    
    def __init__(self):
        self.precision = 1e-10
    
    def black_scholes_price(
        self,
        S: float,  # Current price
        K: float,  # Strike price
        T: float,  # Time to maturity
        r: float,  # Risk-free rate
        sigma: float,  # Volatility
        option_type: str = 'call'
    ) -> float:
        """
        Calculate Black-Scholes option price.
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (in years)
            r: Risk-free interest rate
            sigma: Implied volatility
            option_type: 'call' or 'put'
            
        Returns:
            Option price
        """
        if T <= 0:
            # Option expired
            if option_type.lower() == 'call':
                return max(S - K, 0)
            else:
                return max(K - S, 0)
        
        d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        
        if option_type.lower() == 'call':
            price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        else:  # put
            price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
        
        return price
    
    def calculate_greeks(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float,
        option_type: str = 'call'
    ) -> Dict[str, float]:
        """
        Calculate all Greeks for an option.
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (in years)
            r: Risk-free interest rate
            sigma: Implied volatility
            option_type: 'call' or 'put'
            
        Returns:
            Dictionary with Greeks values
        """
        if T <= 0:
            # Handle expired options
            is_call = option_type.lower() == 'call'
            moneyness = S - K if is_call else K - S
            
            return {
                'delta': 1.0 if moneyness > 0 and is_call else (0.0 if is_call else (-1.0 if moneyness > 0 else 0.0)),
                'gamma': 0.0,
                'vega': 0.0,
                'theta': 0.0,
                'rho': 0.0
            }
        
        d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        
        # Common calculations
        pdf_d1 = norm.pdf(d1)
        cdf_d1 = norm.cdf(d1)
        cdf_d2 = norm.cdf(d2)
        sqrt_T = np.sqrt(T)
        
        greeks = {}
        
        # Delta
        if option_type.lower() == 'call':
            greeks['delta'] = cdf_d1
        else:
            greeks['delta'] = cdf_d1 - 1
        
        # Gamma (same for calls and puts)
        greeks['gamma'] = pdf_d1 / (S * sigma * sqrt_T)
        
        # Vega (same for calls and puts, return per 1% change)
        greeks['vega'] = S * pdf_d1 * sqrt_T / 100
        
        # Theta (return per day)
        if option_type.lower() == 'call':
            greeks['theta'] = (-S * pdf_d1 * sigma / (2 * sqrt_T) 
                              - r * K * np.exp(-r * T) * cdf_d2) / 365
        else:
            greeks['theta'] = (-S * pdf_d1 * sigma / (2 * sqrt_T) 
                              + r * K * np.exp(-r * T) * norm.cdf(-d2)) / 365
        
        # Rho (per 1% change)
        if option_type.lower() == 'call':
            greeks['rho'] = K * T * np.exp(-r * T) * cdf_d2 / 100
        else:
            greeks['rho'] = -K * T * np.exp(-r * T) * norm.cdf(-d2) / 100
        
        return greeks
    
    def implied_volatility(
        self,
        option_price: float,
        S: float,
        K: float,
        T: float,
        r: float,
        option_type: str = 'call',
        initial_guess: float = 0.3
    ) -> Optional[float]:
        """
        Calculate implied volatility using Newton-Raphson method.
        
        Args:
            option_price: Market price of the option
            S: Current underlying price
            K: Strike price
            T: Time to maturity (in years)
            r: Risk-free interest rate
            option_type: 'call' or 'put'
            initial_guess: Starting point for iteration
            
        Returns:
            Implied volatility or None if convergence fails
        """
        if T <= 0:
            return None
        
        # Check for intrinsic value bounds
        intrinsic = max(S - K, 0) if option_type.lower() == 'call' else max(K - S, 0)
        if option_price < intrinsic:
            logger.warning(f"Option price {option_price} below intrinsic value {intrinsic}")
            return None
        
        sigma = initial_guess
        max_iterations = 100
        tolerance = 1e-6
        
        for i in range(max_iterations):
            price = self.black_scholes_price(S, K, T, r, sigma, option_type)
            greeks = self.calculate_greeks(S, K, T, r, sigma, option_type)
            vega = greeks['vega'] * 100  # Convert back from per 1% to per unit
            
            if abs(vega) < self.precision:
                logger.warning("Vega too small, cannot converge")
                return None
            
            price_diff = option_price - price
            
            if abs(price_diff) < tolerance:
                return sigma
            
            # Newton-Raphson update
            sigma = sigma + price_diff / vega
            
            # Ensure sigma stays positive
            if sigma <= 0:
                sigma = 0.001
        
        logger.warning("Implied volatility calculation did not converge")
        return None
    
    def calculate_binary_option_price(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        sigma: float,
        option_type: str = 'call'
    ) -> float:
        """
        Calculate binary (digital) option price.
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (in years)
            r: Risk-free interest rate
            sigma: Implied volatility
            option_type: 'call' or 'put'
            
        Returns:
            Binary option price (between 0 and 1)
        """
        if T <= 0:
            if option_type.lower() == 'call':
                return 1.0 if S > K else 0.0
            else:
                return 1.0 if S < K else 0.0
        
        d2 = (np.log(S / K) + (r - 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        
        if option_type.lower() == 'call':
            price = np.exp(-r * T) * norm.cdf(d2)
        else:
            price = np.exp(-r * T) * norm.cdf(-d2)
        
        return price
    
    def price_option_with_divs(
        self,
        S: float,
        K: float,
        T: float,
        r: float,
        q: float,  # Dividend yield
        sigma: float,
        option_type: str = 'call'
    ) -> Tuple[float, Dict[str, float]]:
        """
        Price option with continuous dividend yield.
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (in years)
            r: Risk-free interest rate
            q: Continuous dividend yield
            sigma: Implied volatility
            option_type: 'call' or 'put'
            
        Returns:
            Tuple of (option price, greeks dictionary)
        """
        # Adjust spot price for dividends
        S_adjusted = S * np.exp(-q * T)
        
        # Calculate price with adjusted spot
        price = self.black_scholes_price(S_adjusted, K, T, r, sigma, option_type)
        
        # Calculate Greeks with dividend adjustment
        d1 = (np.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        
        pdf_d1 = norm.pdf(d1)
        cdf_d1 = norm.cdf(d1)
        cdf_d2 = norm.cdf(d2)
        sqrt_T = np.sqrt(T)
        
        greeks = {}
        
        # Adjusted Greeks for dividends
        if option_type.lower() == 'call':
            greeks['delta'] = np.exp(-q * T) * cdf_d1
            greeks['theta'] = (-S * np.exp(-q * T) * pdf_d1 * sigma / (2 * sqrt_T)
                              - r * K * np.exp(-r * T) * cdf_d2
                              + q * S * np.exp(-q * T) * cdf_d1) / 365
        else:
            greeks['delta'] = np.exp(-q * T) * (cdf_d1 - 1)
            greeks['theta'] = (-S * np.exp(-q * T) * pdf_d1 * sigma / (2 * sqrt_T)
                              + r * K * np.exp(-r * T) * norm.cdf(-d2)
                              - q * S * np.exp(-q * T) * norm.cdf(-d1)) / 365
        
        greeks['gamma'] = np.exp(-q * T) * pdf_d1 / (S * sigma * sqrt_T)
        greeks['vega'] = S * np.exp(-q * T) * pdf_d1 * sqrt_T / 100
        greeks['rho'] = K * T * np.exp(-r * T) * (cdf_d2 if option_type.lower() == 'call' else -norm.cdf(-d2)) / 100
        
        return price, greeks