#!/usr/bin/env python3
"""
Finance glossary and domain-specific definitions for options trading.

This module provides comprehensive definitions and explanations of financial
terms used in options trading to help the LLM understand and use them correctly.
"""

from typing import Dict, List


class FinanceGlossary:
    """Comprehensive glossary of options trading terms."""

    TERMS = {
        # Greeks
        "delta": {
            "definition": "The rate of change of option price with respect to underlying price",
            "range": "Calls: 0 to 1, Puts: -1 to 0",
            "interpretation": "Delta of 0.5 means option price changes by $0.50 for every $1 move in underlying",
            "database_column": "delta (per-contract), position_delta (total position)",
        },
        "gamma": {
            "definition": "The rate of change of delta with respect to underlying price",
            "interpretation": "High gamma means delta changes quickly, creating more risk/opportunity",
            "units": "Delta change per $1 move in underlying",
            "database_column": "gamma",
        },
        "vega": {
            "definition": "Sensitivity of option price to changes in implied volatility",
            "interpretation": "Vega of 50 means option gains/loses $50 for each 1% change in IV",
            "units": "$ per 1% IV change",
            "database_column": "vega",
        },
        "theta": {
            "definition": "Time decay - the rate at which option value decreases as time passes",
            "interpretation": "Theta of -20 means option loses $20 in value per day",
            "units": "$ per day",
            "database_column": "theta",
        },
        "rho": {
            "definition": "Sensitivity of option price to interest rate changes",
            "interpretation": "Usually less important for crypto options",
            "units": "$ per 1% interest rate change",
            "database_column": "rho",
        },
        # Volatility terms
        "implied_volatility": {
            "definition": "Market expectation of future volatility derived from option prices",
            "interpretation": "Higher IV means market expects larger price moves",
            "units": "Annualized percentage (0.50 = 50% annual vol)",
            "database_column": "mark_iv, implied_volatility",
        },
        "realized_volatility": {
            "definition": "Actual historical volatility calculated from price movements",
            "interpretation": "Compare with IV to find over/underpriced options",
            "units": "Annualized percentage",
            "database_column": "ar_volatility (for real-time), historical_volatility",
        },
        "volatility_skew": {
            "definition": "Difference in IV between different strikes",
            "interpretation": "Negative skew means puts have higher IV than calls",
            "calculation": "Compare IV of 25-delta puts vs 25-delta calls",
        },
        "term_structure": {
            "definition": "Implied volatility across different expiration dates",
            "interpretation": "Upward sloping = market expects volatility to increase",
            "visualization": "Plot IV vs time to expiry",
        },
        # Position terms
        "delta_exposure": {
            "definition": "Total delta-weighted exposure across all positions",
            "calculation": "Sum of (quantity × delta × contract_size) for all positions",
            "interpretation": "Measures directional risk in underlying units",
            "database_column": "position_delta",
        },
        "delta_notional": {
            "definition": "Dollar value of delta exposure",
            "calculation": "Delta exposure × underlying price",
            "interpretation": "Dollar amount of underlying exposure",
            "example": "5 delta × $100k BTC price = $500k notional exposure",
        },
        "gamma_exposure": {
            "definition": "Total gamma risk across portfolio",
            "calculation": "Sum of (quantity × gamma × contract_size)",
            "interpretation": "Rate at which your delta changes",
            "risk": "High gamma means P&L accelerates in both directions",
        },
        # Market structure
        "moneyness": {
            "definition": "Relationship between strike price and underlying price",
            "types": {
                "ATM": "At-the-money: strike ≈ spot price",
                "ITM": "In-the-money: calls with strike < spot, puts with strike > spot",
                "OTM": "Out-of-the-money: calls with strike > spot, puts with strike < spot",
            },
            "calculation": "ln(strike/spot) for normalized moneyness",
            "database_usage": "Used in volatility surface modeling",
        },
        "time_to_expiry": {
            "definition": "Time remaining until option expiration",
            "units": "Can be expressed in days or years (years for Black-Scholes)",
            "calculation": "(expiry_timestamp - current_timestamp) / (365.25 × 24 × 3600 × 1000)",
            "database_column": "Calculated from expiry_timestamp",
        },
        # Trading terms
        "mark_price": {
            "definition": "Fair value price used for P&L calculations",
            "calculation": "Usually (bid + ask) / 2 or model-based price",
            "usage": "Used for margin calculations and position valuation",
            "database_column": "mark_price",
        },
        "open_interest": {
            "definition": "Total number of outstanding option contracts",
            "interpretation": "High OI indicates liquid markets",
            "units": "Number of contracts",
            "database_column": "open_interest",
        },
        "pin_risk": {
            "definition": "Risk of underlying settling exactly at strike price at expiry",
            "concern": "Causes maximum gamma exposure and uncertain exercise",
            "mitigation": "Close positions before expiry or hedge gamma",
        },
        # Risk metrics
        "var": {
            "definition": "Value at Risk - potential loss at given confidence level",
            "example": "95% 1-day VaR of $10k means 5% chance of losing >$10k in a day",
            "calculation": "Can use delta-normal, historical simulation, or Monte Carlo",
        },
        "max_pain": {
            "definition": "Strike price where option buyers lose the most money",
            "theory": "Market makers may push price toward max pain at expiry",
            "calculation": "Strike where total option payoff is minimized",
        },
    }

    FORMULAS = {
        "black_scholes_call": {
            "formula": "C = S×N(d1) - K×e^(-r×T)×N(d2)",
            "where": {
                "C": "Call option price",
                "S": "Spot price",
                "K": "Strike price",
                "r": "Risk-free rate",
                "T": "Time to expiry",
                "N()": "Cumulative normal distribution",
                "d1": "(ln(S/K) + (r + σ²/2)×T) / (σ×√T)",
                "d2": "d1 - σ×√T",
            },
        },
        "delta_calculation": {
            "call_delta": "N(d1)",
            "put_delta": "N(d1) - 1",
            "interpretation": "Probability of finishing in-the-money (risk-neutral)",
        },
        "gamma_calculation": {
            "formula": "φ(d1) / (S × σ × √T)",
            "where": "φ() is standard normal PDF",
            "maximum": "Gamma highest for ATM options near expiry",
        },
        "implied_volatility_estimation": {
            "method": "Newton-Raphson iteration",
            "objective": "Find σ such that Black-Scholes price = market price",
            "convergence": "Usually within 3-5 iterations",
        },
    }

    @classmethod
    def get_glossary_context(cls) -> str:
        """Format glossary for LLM context."""
        lines = ["=== OPTIONS TRADING GLOSSARY ===\n"]

        for term, details in cls.TERMS.items():
            lines.append(f"\n{term.upper().replace('_', ' ')}:")
            lines.append(f"Definition: {details['definition']}")

            if "interpretation" in details:
                lines.append(f"Interpretation: {details['interpretation']}")

            if "database_column" in details:
                lines.append(f"Database column: {details['database_column']}")

            if "calculation" in details:
                lines.append(f"Calculation: {details['calculation']}")

        return "\n".join(lines)

    @classmethod
    def get_quick_reference(cls) -> Dict[str, str]:
        """Get quick reference mapping of terms to database columns."""
        mapping = {}

        for term, details in cls.TERMS.items():
            if "database_column" in details:
                mapping[term] = details["database_column"]

        # Add common variations
        mapping.update(
            {
                "iv": "mark_iv",
                "vol": "mark_iv or ar_volatility",
                "pnl": "pnl",
                "p&l": "pnl",
                "profit": "pnl",
                "loss": "pnl",
                "exposure": "position_value or position_delta",
                "contracts": "quantity",
                "size": "quantity",
                "price": "current_price or mark_price",
            }
        )

        return mapping

    @classmethod
    def explain_calculation(cls, term: str) -> str:
        """Get detailed explanation of how to calculate a specific term."""
        explanations = {
            "delta_notional": """
                Delta Notional = Position Delta × Underlying Price
                
                Example: 
                - Position has delta of 0.5
                - Quantity is 10 contracts  
                - Underlying BTC price is $100,000
                - Position Delta = 0.5 × 10 = 5.0
                - Delta Notional = 5.0 × $100,000 = $500,000
                
                This means the position behaves like owning $500,000 worth of BTC.
            """,
            "total_greek_exposure": """
                For any Greek across the portfolio:
                Total Exposure = Σ(quantity × greek_value × contract_size)
                
                Example for total gamma:
                Position 1: 10 contracts × 0.0005 gamma × 1.0 BTC = 0.005
                Position 2: -5 contracts × 0.0008 gamma × 1.0 BTC = -0.004
                Total Gamma = 0.005 + (-0.004) = 0.001
            """,
            "breakeven": """
                For a long call: Breakeven = Strike + Premium Paid
                For a long put: Breakeven = Strike - Premium Paid
                
                Account for transaction costs and contract multiplier.
            """,
        }

        return explanations.get(term, f"No detailed calculation available for {term}")

    @classmethod
    def get_risk_interpretation(cls, metric: str, value: float) -> str:
        """Provide interpretation of risk metrics."""
        interpretations = {
            "delta": {
                "high": (10, "Very high directional exposure - consider hedging"),
                "medium": (5, "Moderate directional exposure"),
                "low": (2, "Low directional exposure"),
            },
            "gamma": {
                "high": (0.01, "High gamma risk - P&L will accelerate quickly"),
                "medium": (0.005, "Moderate gamma exposure"),
                "low": (0.002, "Low gamma risk"),
            },
            "theta": {
                "high": (-1000, "Losing significant value to time decay daily"),
                "medium": (-500, "Moderate time decay"),
                "low": (-200, "Low time decay exposure"),
            },
            "vega": {
                "high": (5000, "Very sensitive to IV changes"),
                "medium": (2000, "Moderate IV sensitivity"),
                "low": (1000, "Low IV sensitivity"),
            },
        }

        if metric in interpretations:
            for level, (threshold, message) in interpretations[metric].items():
                if metric == "theta":  # Theta is negative
                    if value <= threshold:
                        return message
                else:
                    if abs(value) >= threshold:
                        return message
            return "Minimal exposure"

        return "Unable to interpret this metric"
