#!/usr/bin/env python3
"""
Polymarket Volatility Calculator

This module provides functions to calculate implied volatility for Polymarket prediction
market contracts using the elastics-options library. It treats Polymarket contracts
as binary options and extracts implied volatility from market prices.
"""

import logging
import sys
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
import traceback

import numpy as np
from dateutil import parser

# Add the elastics-options package to the path
elastics_options_path = os.path.join(os.path.dirname(__file__), '..', '..', 'elastics-options')
if elastics_options_path not in sys.path:
    sys.path.insert(0, elastics_options_path)

try:
    import jax.numpy as jnp
    from options.binary import binary_european, binary_american
    from options.implied_vol import implied_vol, iv_seed
    JAX_AVAILABLE = True
except ImportError as e:
    JAX_AVAILABLE = False
    jnp = None
    binary_european = None
    binary_american = None
    implied_vol = None
    iv_seed = None
    print(f"Warning: JAX/elastics-options not available: {e}")

logger = logging.getLogger(__name__)


class PolymarketVolatilityCalculator:
    """Calculator for implied volatility of Polymarket contracts."""
    
    def __init__(self, risk_free_rate: float = 0.02, dividend_yield: float = 0.0):
        """
        Initialize the volatility calculator.
        
        Args:
            risk_free_rate: Risk-free interest rate (default: 2%)
            dividend_yield: Dividend yield (default: 0%)
        """
        self.risk_free_rate = risk_free_rate
        self.dividend_yield = dividend_yield
        
        if not JAX_AVAILABLE:
            logger.warning("JAX/elastics-options not available. Volatility calculations will be disabled.")
    
    def convert_polymarket_to_option_params(self, market: Dict[str, Any]) -> Optional[Dict[str, float]]:
        """
        Convert Polymarket contract data to Black-Scholes option parameters.
        
        Args:
            market: Dictionary containing Polymarket contract data
            
        Returns:
            Dictionary with option parameters or None if conversion fails
        """
        try:
            # Extract market data
            yes_percentage = market.get('yes_percentage', 0)
            no_percentage = market.get('no_percentage', 0)
            end_date = market.get('end_date', '')
            
            if not end_date:
                logger.warning(f"Market {market.get('id', 'unknown')} missing end date")
                return None
            
            # Convert percentages to probabilities (prices)
            yes_price = yes_percentage / 100.0
            no_price = no_percentage / 100.0
            
            # Validate probabilities
            if yes_price <= 0 or yes_price >= 1:
                logger.warning(f"Invalid yes price: {yes_price}")
                return None
            
            # Parse end date and calculate time to expiry
            try:
                if isinstance(end_date, str):
                    end_dt = parser.parse(end_date)
                else:
                    end_dt = end_date
                
                # Ensure timezone aware
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(tzinfo=timezone.utc)
                
                now = datetime.now(timezone.utc)
                time_to_expiry = (end_dt - now).total_seconds() / (365.25 * 24 * 3600)
                
                if time_to_expiry <= 0:
                    logger.warning(f"Market {market.get('id', 'unknown')} has expired")
                    return None
                
            except Exception as e:
                logger.error(f"Error parsing end date '{end_date}': {e}")
                return None
            
            # Binary option parameters
            # For a binary option paying $1 if event occurs:
            # S = current market price (probability)
            # K = strike = $1 (payout)
            # T = time to expiry in years
            # price = market price
            
            params = {
                'S': yes_price,  # Current "spot" price (market probability)
                'K': 1.0,        # Strike price ($1 payout)
                'T': time_to_expiry,
                'r': self.risk_free_rate,
                'q': self.dividend_yield,
                'price': yes_price,  # Market price equals probability for binary
                'call_or_put': 1     # Call option (Yes outcome)
            }
            
            return params
            
        except Exception as e:
            logger.error(f"Error converting market to option params: {e}")
            logger.error(traceback.format_exc())
            return None
    
    def calculate_implied_volatility(self, market: Dict[str, Any], use_american: bool = False) -> Optional[float]:
        """
        Calculate implied volatility for a Polymarket contract.
        
        Args:
            market: Dictionary containing Polymarket contract data
            use_american: Whether to use American binary option pricing (default: False)
            
        Returns:
            Implied volatility as a float, or None if calculation fails
        """
        if not JAX_AVAILABLE:
            logger.warning("Cannot calculate IV: JAX/elastics-options not available")
            return None
        
        try:
            # Convert to option parameters
            params = self.convert_polymarket_to_option_params(market)
            if not params:
                return None
            
            # Select binary option pricer
            pricer = binary_american if use_american else binary_european
            
            # Extract parameters
            S = params['S']
            K = params['K']
            T = params['T']
            r = params['r']
            q = params['q']
            price = params['price']
            cp = params['call_or_put']
            
            # Convert to JAX arrays
            S_jax = jnp.array(S)
            K_jax = jnp.array(K)
            T_jax = jnp.array(T)
            r_jax = jnp.array(r)
            q_jax = jnp.array(q)
            price_jax = jnp.array(price)
            cp_jax = jnp.array(cp)
            
            # Calculate implied volatility
            iv = implied_vol(
                S=S_jax,
                K=K_jax,
                q=q_jax,
                r=r_jax,
                T=T_jax,
                cp=cp_jax,
                price=price_jax,
                pricer=pricer,
                solver="newton",  # Most stable for binary options
                n_steps=1000,
                tol=1e-8,
                seed_func=iv_seed
            )
            
            # Convert back to Python float
            iv_float = float(iv)
            
            # Validate result
            if np.isnan(iv_float) or np.isinf(iv_float) or iv_float <= 0:
                logger.warning(f"Invalid IV result: {iv_float}")
                return None
            
            # Reasonable bounds check (0.1% to 500% vol)
            if iv_float < 0.001 or iv_float > 5.0:
                logger.warning(f"IV outside reasonable bounds: {iv_float}")
                return None
            
            return iv_float
            
        except Exception as e:
            logger.error(f"Error calculating implied volatility: {e}")
            logger.error(traceback.format_exc())
            return None
    
    def get_volatility_insights(self, markets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate volatility insights for a list of markets.
        
        Args:
            markets: List of Polymarket contract data
            
        Returns:
            Dictionary containing volatility insights
        """
        insights = {
            'total_markets': len(markets),
            'calculable_markets': 0,
            'volatilities': [],
            'market_volatilities': [],
            'statistics': {},
            'high_vol_markets': [],
            'low_vol_markets': [],
            'warnings': []
        }
        
        if not JAX_AVAILABLE:
            insights['warnings'].append("JAX/elastics-options not available - using mock data")
            return self._generate_mock_insights(markets, insights)
        
        # Calculate IV for each market
        for market in markets:
            try:
                iv = self.calculate_implied_volatility(market)
                if iv is not None:
                    insights['calculable_markets'] += 1
                    insights['volatilities'].append(iv)
                    insights['market_volatilities'].append({
                        'id': market.get('id', 'unknown'),
                        'question': market.get('question', 'Unknown'),
                        'category': market.get('category', 'Other'),
                        'implied_vol': iv,
                        'yes_percentage': market.get('yes_percentage', 0),
                        'volume': market.get('volume', 0),
                        'end_date': market.get('end_date', '')
                    })
            except Exception as e:
                logger.error(f"Error processing market {market.get('id', 'unknown')}: {e}")
        
        # Calculate statistics
        if insights['volatilities']:
            vols = np.array(insights['volatilities'])
            insights['statistics'] = {
                'mean_iv': float(np.mean(vols)),
                'median_iv': float(np.median(vols)),
                'std_iv': float(np.std(vols)),
                'min_iv': float(np.min(vols)),
                'max_iv': float(np.max(vols)),
                'q25_iv': float(np.percentile(vols, 25)),
                'q75_iv': float(np.percentile(vols, 75))
            }
            
            # Identify high and low volatility markets
            q75 = insights['statistics']['q75_iv']
            q25 = insights['statistics']['q25_iv']
            
            for mv in insights['market_volatilities']:
                if mv['implied_vol'] >= q75:
                    insights['high_vol_markets'].append(mv)
                elif mv['implied_vol'] <= q25:
                    insights['low_vol_markets'].append(mv)
            
            # Sort by volatility
            insights['high_vol_markets'].sort(key=lambda x: x['implied_vol'], reverse=True)
            insights['low_vol_markets'].sort(key=lambda x: x['implied_vol'])
        
        return insights
    
    def _generate_mock_insights(self, markets: List[Dict[str, Any]], insights: Dict[str, Any]) -> Dict[str, Any]:
        """Generate mock volatility insights when JAX is not available."""
        np.random.seed(42)  # For reproducible mock data
        
        for market in markets:
            # Generate reasonable mock volatility based on market characteristics
            yes_pct = market.get('yes_percentage', 50)
            
            # Higher volatility for markets near 50/50 (more uncertain)
            uncertainty = 1 - abs(yes_pct - 50) / 50
            base_vol = 0.15 + uncertainty * 0.35  # 15% to 50% volatility
            
            # Add some randomness
            mock_iv = base_vol * (0.8 + 0.4 * np.random.random())
            
            insights['calculable_markets'] += 1
            insights['volatilities'].append(mock_iv)
            insights['market_volatilities'].append({
                'id': market.get('id', 'unknown'),
                'question': market.get('question', 'Unknown'),
                'category': market.get('category', 'Other'),
                'implied_vol': mock_iv,
                'yes_percentage': yes_pct,
                'volume': market.get('volume', 0),
                'end_date': market.get('end_date', ''),
                'is_mock': True
            })
        
        # Calculate mock statistics
        if insights['volatilities']:
            vols = np.array(insights['volatilities'])
            insights['statistics'] = {
                'mean_iv': float(np.mean(vols)),
                'median_iv': float(np.median(vols)),
                'std_iv': float(np.std(vols)),
                'min_iv': float(np.min(vols)),
                'max_iv': float(np.max(vols)),
                'q25_iv': float(np.percentile(vols, 25)),
                'q75_iv': float(np.percentile(vols, 75)),
                'is_mock': True
            }
        
        return insights
    
    def format_volatility_for_chat(self, market: Dict[str, Any], iv: float) -> str:
        """
        Format volatility information for chat responses.
        
        Args:
            market: Market data
            iv: Implied volatility
            
        Returns:
            Formatted string for chat
        """
        vol_pct = iv * 100
        
        # Categorize volatility level
        if vol_pct < 20:
            vol_level = "Low"
        elif vol_pct < 40:
            vol_level = "Moderate"
        elif vol_pct < 60:
            vol_level = "High"
        else:
            vol_level = "Very High"
        
        return f"""**{market.get('question', 'Unknown Market')}**
- **Implied Volatility**: {vol_pct:.1f}% ({vol_level})
- **Current Odds**: Yes {market.get('yes_percentage', 0):.1f}% / No {market.get('no_percentage', 0):.1f}%
- **Category**: {market.get('category', 'Other')}
- **Volume**: ${market.get('volume', 0):,.0f}"""


# Global instance for easy access
polymarket_vol_calculator = PolymarketVolatilityCalculator()


def calculate_contract_implied_vol(market: Dict[str, Any], use_american: bool = False) -> Optional[float]:
    """
    Convenience function to calculate implied volatility for a single contract.
    
    Args:
        market: Polymarket contract data
        use_american: Whether to use American binary option pricing
        
    Returns:
        Implied volatility or None if calculation fails
    """
    return polymarket_vol_calculator.calculate_implied_volatility(market, use_american)


def analyze_market_volatilities(markets: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Convenience function to analyze volatilities across multiple markets.
    
    Args:
        markets: List of Polymarket contract data
        
    Returns:
        Volatility analysis results
    """
    return polymarket_vol_calculator.get_volatility_insights(markets)