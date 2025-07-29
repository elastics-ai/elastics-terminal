"""
Service wrapper for elastics-options Greeks calculations
"""
import numpy as np
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime

# Import from elastics-options
from options.greeks import (
    delta, gamma, vega, theta, rho,
    vanna, volga, charm, speed
)
from options.vanilla import vanilla_european

logger = logging.getLogger(__name__)


class GreeksService:
    """Service wrapper for Greeks calculations using elastics-options"""
    
    def calculate_option_greeks(
        self,
        spot: float,
        strike: float,
        time_to_expiry: float,
        volatility: float,
        risk_free_rate: float = 0.0,
        dividend_yield: float = 0.0,
        option_type: str = 'call'
    ) -> Dict[str, float]:
        """
        Calculate all Greeks for a single option
        
        Args:
            spot: Current spot price
            strike: Strike price
            time_to_expiry: Time to expiry in years
            volatility: Implied volatility
            risk_free_rate: Risk-free rate
            dividend_yield: Dividend yield
            option_type: 'call' or 'put'
            
        Returns:
            Dictionary containing all Greeks
        """
        try:
            # Create the pricing function with call/put flag
            call_put_flag = 1 if option_type.lower() == 'call' else -1
            
            # Calculate option price
            price = vanilla_european(
                spot, strike, dividend_yield, risk_free_rate, 
                volatility, time_to_expiry, call_put_flag
            )
            
            # Create Greek calculators using the generic functions
            delta_calc = delta(vanilla_european)
            gamma_calc = gamma(vanilla_european)
            vega_calc = vega(vanilla_european)
            theta_calc = theta(vanilla_european)
            rho_calc = rho(vanilla_european)
            
            # Calculate Greeks
            option_delta = delta_calc(
                spot, strike, dividend_yield, risk_free_rate,
                volatility, time_to_expiry, call_put_flag
            )
            option_gamma = gamma_calc(
                spot, strike, dividend_yield, risk_free_rate,
                volatility, time_to_expiry, call_put_flag
            )
            option_vega = vega_calc(
                spot, strike, dividend_yield, risk_free_rate,
                volatility, time_to_expiry, call_put_flag
            )
            option_theta = theta_calc(
                spot, strike, dividend_yield, risk_free_rate,
                volatility, time_to_expiry, call_put_flag
            )
            option_rho = rho_calc(
                spot, strike, dividend_yield, risk_free_rate,
                volatility, time_to_expiry, call_put_flag
            )
            
            # Second-order Greeks 
            vanna_calc = vanna(vanilla_european)
            volga_calc = volga(vanilla_european)
            charm_calc = charm(vanilla_european)
            speed_calc = speed(vanilla_european)
            
            option_vanna = vanna_calc(
                spot, strike, dividend_yield, risk_free_rate,
                volatility, time_to_expiry, call_put_flag
            )
            option_volga = volga_calc(
                spot, strike, dividend_yield, risk_free_rate,
                volatility, time_to_expiry, call_put_flag
            )
            option_charm = charm_calc(
                spot, strike, dividend_yield, risk_free_rate,
                volatility, time_to_expiry, call_put_flag
            )
            option_speed = speed_calc(
                spot, strike, dividend_yield, risk_free_rate,
                volatility, time_to_expiry, call_put_flag
            )
            
            return {
                "price": float(price),
                "delta": float(option_delta),
                "gamma": float(option_gamma),
                "vega": float(option_vega),
                "theta": float(option_theta),
                "rho": float(option_rho),
                "vanna": float(option_vanna),
                "volga": float(option_volga),
                "charm": float(option_charm),
                "speed": float(option_speed)
            }
            
        except Exception as e:
            logger.error(f"Error calculating Greeks: {e}")
            raise
    
    def aggregate_portfolio_greeks(
        self,
        positions: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """
        Calculate aggregate Greeks for a portfolio of options
        
        Args:
            positions: List of position dictionaries containing:
                - spot: float
                - strike: float
                - time_to_expiry: float
                - volatility: float
                - quantity: float (positive for long, negative for short)
                - option_type: 'call' or 'put'
                - risk_free_rate: float (optional)
                - dividend_yield: float (optional)
                
        Returns:
            Dictionary containing aggregate Greeks
        """
        aggregate_greeks = {
            "delta": 0.0,
            "gamma": 0.0,
            "vega": 0.0,
            "theta": 0.0,
            "rho": 0.0,
            "vanna": 0.0,
            "volga": 0.0,
            "charm": 0.0,
            "vomma": 0.0,
            "speed": 0.0
        }
        
        total_value = 0.0
        
        for position in positions:
            # Calculate Greeks for this position
            greeks = self.calculate_option_greeks(
                spot=position['spot'],
                strike=position['strike'],
                time_to_expiry=position['time_to_expiry'],
                volatility=position['volatility'],
                risk_free_rate=position.get('risk_free_rate', 0.0),
                dividend_yield=position.get('dividend_yield', 0.0),
                option_type=position['option_type']
            )
            
            # Scale by position quantity
            quantity = position['quantity']
            for greek in aggregate_greeks:
                if greek in greeks:
                    aggregate_greeks[greek] += greeks[greek] * quantity
            
            total_value += greeks['price'] * quantity
        
        # Add total portfolio value
        aggregate_greeks['total_value'] = total_value
        
        return aggregate_greeks
    
    def calculate_greeks_surface(
        self,
        spot: float,
        strike_range: tuple,
        expiry_range: tuple,
        volatility: float,
        risk_free_rate: float = 0.0,
        dividend_yield: float = 0.0,
        n_strikes: int = 20,
        n_expiries: int = 20,
        greek: str = 'delta',
        option_type: str = 'call'
    ) -> Dict[str, Any]:
        """
        Calculate a surface of Greek values across strikes and expiries
        
        Args:
            spot: Current spot price
            strike_range: (min_strike, max_strike)
            expiry_range: (min_expiry, max_expiry) in years
            volatility: Implied volatility
            risk_free_rate: Risk-free rate
            dividend_yield: Dividend yield
            n_strikes: Number of strike points
            n_expiries: Number of expiry points
            greek: Which Greek to calculate ('delta', 'gamma', 'vega', etc.)
            option_type: 'call' or 'put'
            
        Returns:
            Dictionary with surface data
        """
        strikes = np.linspace(strike_range[0], strike_range[1], n_strikes)
        expiries = np.linspace(expiry_range[0], expiry_range[1], n_expiries)
        
        surface = np.zeros((n_expiries, n_strikes))
        
        for i, t in enumerate(expiries):
            for j, k in enumerate(strikes):
                greeks = self.calculate_option_greeks(
                    spot=spot,
                    strike=k,
                    time_to_expiry=t,
                    volatility=volatility,
                    risk_free_rate=risk_free_rate,
                    dividend_yield=dividend_yield,
                    option_type=option_type
                )
                surface[i, j] = greeks.get(greek.lower(), 0.0)
        
        return {
            "strikes": strikes.tolist(),
            "expiries": (expiries * 365).tolist(),  # Convert to days
            "surface": surface.tolist(),
            "greek": greek,
            "option_type": option_type,
            "spot": spot,
            "volatility": volatility
        }
    
    def calculate_greeks_by_moneyness(
        self,
        spot: float,
        moneyness_range: tuple,
        time_to_expiry: float,
        volatility: float,
        risk_free_rate: float = 0.0,
        dividend_yield: float = 0.0,
        n_points: int = 50,
        option_type: str = 'call'
    ) -> Dict[str, Any]:
        """
        Calculate Greeks across different moneyness levels
        
        Args:
            spot: Current spot price
            moneyness_range: (min_moneyness, max_moneyness) as K/S ratio
            time_to_expiry: Time to expiry in years
            volatility: Implied volatility
            risk_free_rate: Risk-free rate
            dividend_yield: Dividend yield
            n_points: Number of moneyness points
            option_type: 'call' or 'put'
            
        Returns:
            Dictionary with Greeks by moneyness
        """
        moneyness = np.linspace(moneyness_range[0], moneyness_range[1], n_points)
        strikes = spot * moneyness
        
        greeks_data = {
            "moneyness": moneyness.tolist(),
            "strikes": strikes.tolist(),
            "delta": [],
            "gamma": [],
            "vega": [],
            "theta": [],
            "rho": []
        }
        
        for strike in strikes:
            greeks = self.calculate_option_greeks(
                spot=spot,
                strike=strike,
                time_to_expiry=time_to_expiry,
                volatility=volatility,
                risk_free_rate=risk_free_rate,
                dividend_yield=dividend_yield,
                option_type=option_type
            )
            
            for greek in ['delta', 'gamma', 'vega', 'theta', 'rho']:
                greeks_data[greek].append(greeks[greek])
        
        return greeks_data