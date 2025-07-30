"""
Greeks calculation service using elastics-options with JAX autodiff.

This service provides:
- Fast vectorized Greeks calculations using JAX autodiff
- Real-time portfolio Greeks aggregation and risk monitoring
- Greeks surface visualization and analysis
- Integration with SSVI volatility surfaces
- Risk scenario analysis and sensitivity calculations
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple, Callable
import logging
from datetime import datetime
from dataclasses import dataclass

# Import from elastics-options (private repo)
try:
    from options.greeks import (
        delta, gamma, vega, theta, rho, carry,
        vanna, volga, charm, speed, color, zomma,
        ultima, veta
    )
    from options.vanilla import vanilla_european
    OPTIONS_AVAILABLE = True
except ImportError:
    OPTIONS_AVAILABLE = False
    # Mock functions for CI testing
    delta = gamma = vega = theta = rho = carry = lambda *args, **kwargs: 0.0
    vanna = volga = charm = speed = color = zomma = lambda *args, **kwargs: 0.0
    ultima = veta = lambda *args, **kwargs: 0.0
    vanilla_european = lambda *args, **kwargs: 0.0
from ..database import DatabaseManager
from ..models.portfolio import Position

logger = logging.getLogger(__name__)


@dataclass
class GreeksSnapshot:
    """Snapshot of portfolio Greeks at a point in time."""
    timestamp: datetime
    portfolio_value: float
    net_delta: float
    net_gamma: float
    net_vega: float
    net_theta: float
    net_rho: float
    net_vanna: float
    net_volga: float
    net_charm: float
    net_speed: float
    delta_adjusted_exposure: float
    gamma_adjusted_exposure: float
    largest_position_delta: float
    largest_position_gamma: float
    concentration_risk: float


@dataclass
class GreeksRiskLimits:
    """Risk limits for portfolio Greeks."""
    max_delta: float = 1000.0
    max_gamma: float = 500.0
    max_vega: float = 10000.0
    max_theta: float = -500.0
    concentration_limit: float = 0.25  # 25% max position size


class GreeksService:
    """Service for comprehensive Greeks calculations and portfolio risk monitoring."""
    
    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        self.db = db_manager or DatabaseManager()
        self.risk_limits = GreeksRiskLimits()
        self.greeks_history: List[GreeksSnapshot] = []
        
        # Cache commonly used Greek calculators
        self._delta_calc = delta(vanilla_european)
        self._gamma_calc = gamma(vanilla_european)
        self._vega_calc = vega(vanilla_european)
        self._theta_calc = theta(vanilla_european)
        self._rho_calc = rho(vanilla_european)
        self._carry_calc = carry(vanilla_european)
        
        # Second-order Greeks
        self._vanna_calc = vanna(vanilla_european)
        self._volga_calc = volga(vanilla_european)
        self._charm_calc = charm(vanilla_european)
        self._speed_calc = speed(vanilla_european)
        self._color_calc = color(vanilla_european)
        self._zomma_calc = zomma(vanilla_european)
        
        # Third-order Greeks
        self._ultima_calc = ultima(vanilla_european)
        self._veta_calc = veta(vanilla_european)
    
    def calculate_option_greeks(
        self,
        spot: float,
        strike: float,
        time_to_expiry: float,
        volatility: float,
        risk_free_rate: float = 0.0,
        dividend_yield: float = 0.0,
        option_type: str = 'call',
        include_third_order: bool = False
    ) -> Dict[str, float]:
        """
        Calculate comprehensive Greeks for a single option using cached calculators.
        
        Args:
            spot: Current spot price
            strike: Strike price
            time_to_expiry: Time to expiry in years
            volatility: Implied volatility
            risk_free_rate: Risk-free rate
            dividend_yield: Dividend yield
            option_type: 'call' or 'put'
            include_third_order: Whether to include third-order Greeks
            
        Returns:
            Dictionary containing all Greeks
        """
        try:
            # Create the pricing function arguments
            call_put_flag = 1 if option_type.lower() == 'call' else -1
            args = (spot, strike, dividend_yield, risk_free_rate, volatility, time_to_expiry, call_put_flag)
            
            # Calculate option price
            price = vanilla_european(*args)
            
            # First-order Greeks (cached calculators)
            greeks = {
                "price": float(price),
                "delta": float(self._delta_calc(*args)),
                "gamma": float(self._gamma_calc(*args)),
                "vega": float(self._vega_calc(*args)),
                "theta": float(self._theta_calc(*args)),
                "rho": float(self._rho_calc(*args)),
                "carry": float(self._carry_calc(*args))
            }
            
            # Second-order Greeks
            greeks.update({
                "vanna": float(self._vanna_calc(*args)),
                "volga": float(self._volga_calc(*args)),
                "charm": float(self._charm_calc(*args)),
                "speed": float(self._speed_calc(*args)),
                "color": float(self._color_calc(*args)),
                "zomma": float(self._zomma_calc(*args))
            })
            
            # Third-order Greeks (optional for performance)
            if include_third_order:
                greeks.update({
                    "ultima": float(self._ultima_calc(*args)),
                    "veta": float(self._veta_calc(*args))
                })
            
            return greeks
            
        except Exception as e:
            logger.error(f"Error calculating Greeks: {e}")
            raise
    
    def calculate_portfolio_greeks(
        self,
        positions: List[Position],
        include_concentration_risk: bool = True
    ) -> GreeksSnapshot:
        """
        Calculate comprehensive portfolio Greeks from Position objects.
        
        Args:
            positions: List of Position objects
            include_concentration_risk: Whether to calculate concentration metrics
            
        Returns:
            GreeksSnapshot with portfolio-level Greeks
        """
        timestamp = datetime.now()
        
        # Initialize aggregates
        portfolio_greeks = {
            "portfolio_value": 0.0,
            "net_delta": 0.0,
            "net_gamma": 0.0,
            "net_vega": 0.0,
            "net_theta": 0.0,
            "net_rho": 0.0,
            "net_vanna": 0.0,
            "net_volga": 0.0,
            "net_charm": 0.0,
            "net_speed": 0.0
        }
        
        position_deltas = []
        position_gammas = []
        position_values = []
        
        for position in positions:
            # Skip positions without Greeks (e.g., spot positions)
            if position.delta is None:
                portfolio_greeks["portfolio_value"] += position.value
                continue
                
            # Use position Greeks if available, otherwise calculate
            if all(getattr(position, greek) is not None for greek in ['delta', 'gamma', 'vega', 'theta']):
                pos_greeks = {
                    "delta": position.delta,
                    "gamma": position.gamma,
                    "vega": position.vega,
                    "theta": position.theta,
                    "rho": 0.0,  # Not typically stored in Position
                    "vanna": 0.0,
                    "volga": 0.0,
                    "charm": 0.0,
                    "speed": 0.0
                }
            else:
                # Calculate Greeks if not available (requires market data)
                logger.warning(f"Greeks not available for position {position.instrument}, using stored values")
                pos_greeks = {
                    "delta": position.delta or 0.0,
                    "gamma": position.gamma or 0.0,
                    "vega": position.vega or 0.0,
                    "theta": position.theta or 0.0,
                    "rho": 0.0,
                    "vanna": 0.0,
                    "volga": 0.0,
                    "charm": 0.0,
                    "speed": 0.0
                }
            
            # Scale by position quantity and aggregate
            quantity = position.quantity
            portfolio_greeks["portfolio_value"] += position.value
            portfolio_greeks["net_delta"] += pos_greeks["delta"] * quantity
            portfolio_greeks["net_gamma"] += pos_greeks["gamma"] * quantity
            portfolio_greeks["net_vega"] += pos_greeks["vega"] * quantity
            portfolio_greeks["net_theta"] += pos_greeks["theta"] * quantity
            portfolio_greeks["net_rho"] += pos_greeks["rho"] * quantity
            portfolio_greeks["net_vanna"] += pos_greeks["vanna"] * quantity
            portfolio_greeks["net_volga"] += pos_greeks["volga"] * quantity
            portfolio_greeks["net_charm"] += pos_greeks["charm"] * quantity
            portfolio_greeks["net_speed"] += pos_greeks["speed"] * quantity
            
            # Store for concentration analysis
            if include_concentration_risk:
                position_deltas.append(abs(pos_greeks["delta"] * quantity))
                position_gammas.append(abs(pos_greeks["gamma"] * quantity))
                position_values.append(abs(position.value))
        
        # Calculate exposure-adjusted metrics
        total_value = abs(portfolio_greeks["portfolio_value"])
        delta_adjusted_exposure = (
            abs(portfolio_greeks["net_delta"]) / total_value if total_value > 0 else 0.0
        )
        gamma_adjusted_exposure = (
            abs(portfolio_greeks["net_gamma"]) / total_value if total_value > 0 else 0.0
        )
        
        # Concentration risk metrics
        largest_position_delta = max(position_deltas) if position_deltas else 0.0
        largest_position_gamma = max(position_gammas) if position_gammas else 0.0
        concentration_risk = (
            max(position_values) / total_value if total_value > 0 and position_values else 0.0
        )
        
        return GreeksSnapshot(
            timestamp=timestamp,
            portfolio_value=portfolio_greeks["portfolio_value"],
            net_delta=portfolio_greeks["net_delta"],
            net_gamma=portfolio_greeks["net_gamma"],
            net_vega=portfolio_greeks["net_vega"],
            net_theta=portfolio_greeks["net_theta"],
            net_rho=portfolio_greeks["net_rho"],
            net_vanna=portfolio_greeks["net_vanna"],
            net_volga=portfolio_greeks["net_volga"],
            net_charm=portfolio_greeks["net_charm"],
            net_speed=portfolio_greeks["net_speed"],
            delta_adjusted_exposure=delta_adjusted_exposure,
            gamma_adjusted_exposure=gamma_adjusted_exposure,
            largest_position_delta=largest_position_delta,
            largest_position_gamma=largest_position_gamma,
            concentration_risk=concentration_risk
        )
    
    def check_risk_limits(self, snapshot: GreeksSnapshot) -> Dict[str, Any]:
        """
        Check portfolio Greeks against risk limits.
        
        Args:
            snapshot: Current Greeks snapshot
            
        Returns:
            Dictionary with limit check results and alerts
        """
        violations = []
        warnings = []
        
        # Check delta limit
        if abs(snapshot.net_delta) > self.risk_limits.max_delta:
            violations.append({
                "type": "delta_limit",
                "current": snapshot.net_delta,
                "limit": self.risk_limits.max_delta,
                "severity": "critical"
            })
        elif abs(snapshot.net_delta) > self.risk_limits.max_delta * 0.8:
            warnings.append({
                "type": "delta_warning", 
                "current": snapshot.net_delta,
                "limit": self.risk_limits.max_delta * 0.8,
                "severity": "warning"
            })
        
        # Check gamma limit
        if abs(snapshot.net_gamma) > self.risk_limits.max_gamma:
            violations.append({
                "type": "gamma_limit",
                "current": snapshot.net_gamma,
                "limit": self.risk_limits.max_gamma,
                "severity": "critical"
            })
        
        # Check vega limit
        if abs(snapshot.net_vega) > self.risk_limits.max_vega:
            violations.append({
                "type": "vega_limit",
                "current": snapshot.net_vega,
                "limit": self.risk_limits.max_vega,
                "severity": "critical"
            })
        
        # Check theta limit (negative theta means time decay loss)
        if snapshot.net_theta < self.risk_limits.max_theta:
            violations.append({
                "type": "theta_limit",
                "current": snapshot.net_theta,
                "limit": self.risk_limits.max_theta,
                "severity": "high"
            })
        
        # Check concentration risk
        if snapshot.concentration_risk > self.risk_limits.concentration_limit:
            violations.append({
                "type": "concentration_risk",
                "current": snapshot.concentration_risk,
                "limit": self.risk_limits.concentration_limit,
                "severity": "high"
            })
        
        return {
            "compliant": len(violations) == 0,
            "violations": violations,
            "warnings": warnings,
            "risk_score": min(10, len(violations) * 2 + len(warnings)),
            "timestamp": snapshot.timestamp
        }
    
    def calculate_scenario_greeks(
        self,
        positions: List[Position],
        spot_shocks: List[float] = [-0.1, -0.05, 0.0, 0.05, 0.1],
        vol_shocks: List[float] = [-0.2, -0.1, 0.0, 0.1, 0.2],
        time_decay_days: List[int] = [0, 1, 7, 30]
    ) -> Dict[str, Any]:
        """
        Calculate Greeks under various market scenarios.
        
        Args:
            positions: List of Position objects
            spot_shocks: List of relative spot price changes
            vol_shocks: List of relative volatility changes  
            time_decay_days: List of days for time decay analysis
            
        Returns:
            Dictionary with scenario analysis results
        """
        base_snapshot = self.calculate_portfolio_greeks(positions)
        scenario_results = {
            "base_case": base_snapshot,
            "spot_scenarios": {},
            "vol_scenarios": {},
            "time_decay_scenarios": {}
        }
        
        # Spot scenarios (simplified - would need market data for full calculation)
        for shock in spot_shocks:
            shock_pct = shock * 100
            estimated_pnl = base_snapshot.net_delta * shock * base_snapshot.portfolio_value
            estimated_pnl += 0.5 * base_snapshot.net_gamma * (shock * base_snapshot.portfolio_value) ** 2
            
            scenario_results["spot_scenarios"][f"{shock_pct:+.1f}%"] = {
                "spot_shock": shock,
                "estimated_pnl": estimated_pnl,
                "estimated_delta": base_snapshot.net_delta + base_snapshot.net_gamma * shock * base_snapshot.portfolio_value
            }
        
        # Volatility scenarios
        for vol_shock in vol_shocks:
            vol_shock_pct = vol_shock * 100
            estimated_pnl = base_snapshot.net_vega * vol_shock
            
            scenario_results["vol_scenarios"][f"{vol_shock_pct:+.1f}%"] = {
                "vol_shock": vol_shock,
                "estimated_pnl": estimated_pnl
            }
        
        # Time decay scenarios
        for days in time_decay_days:
            time_decay_pnl = base_snapshot.net_theta * days
            
            scenario_results["time_decay_scenarios"][f"{days}d"] = {
                "days": days,
                "estimated_pnl": time_decay_pnl,
                "theta_impact": time_decay_pnl / base_snapshot.portfolio_value if base_snapshot.portfolio_value > 0 else 0
            }
        
        return scenario_results
    
    def generate_greeks_report(self, snapshot: GreeksSnapshot) -> Dict[str, Any]:
        """
        Generate comprehensive Greeks analysis report.
        
        Args:
            snapshot: Greeks snapshot to analyze
            
        Returns:
            Comprehensive analysis report
        """
        risk_check = self.check_risk_limits(snapshot)
        
        return {
            "timestamp": snapshot.timestamp.isoformat(),
            "summary": {
                "portfolio_value": snapshot.portfolio_value,
                "net_delta": snapshot.net_delta,
                "net_gamma": snapshot.net_gamma,
                "net_vega": snapshot.net_vega,
                "net_theta": snapshot.net_theta,
                "delta_adjusted_exposure": snapshot.delta_adjusted_exposure,
                "gamma_adjusted_exposure": snapshot.gamma_adjusted_exposure
            },
            "risk_analysis": risk_check,
            "concentration_metrics": {
                "largest_position_delta": snapshot.largest_position_delta,
                "largest_position_gamma": snapshot.largest_position_gamma,
                "concentration_risk": snapshot.concentration_risk
            },
            "advanced_greeks": {
                "net_vanna": snapshot.net_vanna,
                "net_volga": snapshot.net_volga,
                "net_charm": snapshot.net_charm,
                "net_speed": snapshot.net_speed
            },
            "interpretations": self._generate_interpretations(snapshot)
        }
    
    def _generate_interpretations(self, snapshot: GreeksSnapshot) -> List[str]:
        """Generate human-readable interpretations of Greeks."""
        interpretations = []
        
        # Delta interpretation
        if abs(snapshot.net_delta) > 100:
            direction = "bullish" if snapshot.net_delta > 0 else "bearish"
            interpretations.append(f"Portfolio has significant {direction} exposure (Δ = {snapshot.net_delta:.0f})")
        
        # Gamma interpretation
        if abs(snapshot.net_gamma) > 50:
            interpretations.append(f"High gamma exposure (Γ = {snapshot.net_gamma:.1f}) - delta will change rapidly with spot moves")
        
        # Vega interpretation  
        if abs(snapshot.net_vega) > 1000:
            sensitivity = "gains" if snapshot.net_vega > 0 else "loses"
            interpretations.append(f"High volatility sensitivity - portfolio {sensitivity} ${abs(snapshot.net_vega):.0f} per 1% vol change")
        
        # Theta interpretation
        if snapshot.net_theta < -100:
            interpretations.append(f"Significant time decay exposure - losing ${abs(snapshot.net_theta):.0f} per day")
        
        # Concentration risk
        if snapshot.concentration_risk > 0.2:
            interpretations.append(f"High concentration risk - largest position is {snapshot.concentration_risk:.1%} of portfolio")
        
        return interpretations
    
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