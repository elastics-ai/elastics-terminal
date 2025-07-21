#!/usr/bin/env python3
"""
Few-shot examples for the options trading chat interface.

This module provides example Q&A pairs to help Claude understand
how to translate natural language queries into SQL and provide
domain-appropriate responses.
"""

from typing import List, Dict, Any


class ChatExamples:
    """Collection of few-shot examples for different query types."""

    @staticmethod
    def get_position_examples() -> List[Dict[str, Any]]:
        """Examples for position-related queries."""
        return [
            {
                "question": "What is my delta exposure for the 100k strike calls?",
                "thought_process": "User is asking about delta exposure for specific strike calls. Need to query positions table and filter by strike price and option type.",
                "sql": """
                    SELECT 
                        p.instrument_name,
                        p.quantity,
                        p.delta,
                        p.position_delta,
                        p.current_price,
                        o.strike,
                        o.expiry_timestamp
                    FROM positions p
                    JOIN option_instruments o ON p.instrument_name = o.instrument_name
                    WHERE p.is_active = 1 
                        AND o.strike = 100000 
                        AND o.option_type = 'European Call'
                    ORDER BY o.expiry_timestamp
                """,
                "answer": "Your delta exposure for 100k strike calls is 12.5 contracts-equivalent of BTC. You have 3 active positions:\n\n1. BTC-28MAR25-100000-C: +25 contracts, delta 0.45, position delta = 11.25\n2. BTC-30APR25-100000-C: +10 contracts, delta 0.38, position delta = 3.80\n3. BTC-27JUN25-100000-C: -5 contracts, delta 0.50, position delta = -2.50\n\nTotal delta exposure: 12.55 BTC equivalent",
            },
            {
                "question": "Show me my largest losing positions",
                "thought_process": "User wants to see positions with the biggest losses. Query positions table, filter for active positions with negative P&L, order by P&L ascending.",
                "sql": """
                    SELECT 
                        instrument_name,
                        instrument_type,
                        quantity,
                        entry_price,
                        current_price,
                        pnl,
                        pnl_percent,
                        position_value
                    FROM positions
                    WHERE is_active = 1 AND pnl < 0
                    ORDER BY pnl ASC
                    LIMIT 10
                """,
                "answer": "Here are your largest losing positions:\n\n1. **BTC-28MAR25-95000-P**: Loss of -$15,234 (-23.4%)\n   - Short 50 contracts at $1,350, now at $1,655\n   \n2. **BTC-PERPETUAL**: Loss of -$8,500 (-5.2%)\n   - Long 0.5 BTC at $102,000, now at $97,000\n   \n3. **BTC-30APR25-110000-C**: Loss of -$3,200 (-18.7%)\n   - Long 20 contracts at $850, now at $690\n\nTotal losses from top 3 positions: -$26,934",
            },
        ]

    @staticmethod
    def get_greeks_examples() -> List[Dict[str, Any]]:
        """Examples for Greeks-related queries."""
        return [
            {
                "question": "What's my total gamma exposure?",
                "thought_process": "User asking for portfolio-level gamma. Need to sum gamma exposure across all active positions.",
                "sql": """
                    SELECT 
                        SUM(gamma * quantity * 1.0) as total_gamma,
                        SUM(ABS(gamma * quantity * 1.0)) as total_absolute_gamma,
                        COUNT(*) as position_count
                    FROM positions
                    WHERE is_active = 1 AND instrument_type = 'option'
                """,
                "answer": "Your total gamma exposure is 0.0234 BTC/$ (per 1% move in BTC price).\n\nThis means if BTC moves by $1,000 (roughly 1%), your delta will change by approximately 23.4 contracts.\n\nYou have 15 active option positions contributing to this gamma exposure. The absolute gamma (sum of absolute values) is 0.0456, indicating you have some offsetting gamma positions.",
            },
            {
                "question": "Break down my Greeks by expiry date",
                "thought_process": "User wants Greeks aggregated by expiration. Need to join positions with option_instruments and group by expiry.",
                "sql": """
                    SELECT 
                        DATE(o.expiry_timestamp/1000, 'unixepoch') as expiry_date,
                        SUM(p.position_delta) as total_delta,
                        SUM(p.gamma * p.quantity) as total_gamma,
                        SUM(p.vega * p.quantity) as total_vega,
                        SUM(p.theta * p.quantity) as total_theta,
                        COUNT(*) as position_count
                    FROM positions p
                    JOIN option_instruments o ON p.instrument_name = o.instrument_name
                    WHERE p.is_active = 1 AND p.instrument_type = 'option'
                    GROUP BY DATE(o.expiry_timestamp/1000, 'unixepoch')
                    ORDER BY expiry_date
                """,
                "answer": "Here's your Greeks breakdown by expiry date:\n\n**2025-03-28** (7 positions):\n- Delta: +8.5 BTC\n- Gamma: 0.0120\n- Vega: $4,250 (per 1% IV move)\n- Theta: -$1,200/day\n\n**2025-04-30** (5 positions):\n- Delta: -3.2 BTC  \n- Gamma: 0.0085\n- Vega: $2,800\n- Theta: -$750/day\n\n**2025-06-27** (3 positions):\n- Delta: +1.8 BTC\n- Gamma: 0.0029\n- Vega: $1,500\n- Theta: -$280/day\n\n**Total Portfolio**:\n- Net Delta: +7.1 BTC\n- Total Theta: -$2,230/day",
            },
        ]

    @staticmethod
    def get_volatility_examples() -> List[Dict[str, Any]]:
        """Examples for volatility-related queries."""
        return [
            {
                "question": "How has implied volatility changed for ATM options today?",
                "thought_process": "User wants to see IV changes for at-the-money options. Need to find options near current spot price and compare current vs earlier IVs.",
                "sql": """
                    WITH current_spot AS (
                        SELECT underlying_price 
                        FROM option_greeks 
                        ORDER BY timestamp DESC 
                        LIMIT 1
                    ),
                    atm_options AS (
                        SELECT DISTINCT instrument_name
                        FROM option_instruments
                        WHERE is_active = 1 
                            AND ABS(strike - (SELECT underlying_price FROM current_spot)) / (SELECT underlying_price FROM current_spot) < 0.05
                    )
                    SELECT 
                        g.instrument_name,
                        o.strike,
                        o.option_type,
                        MAX(CASE WHEN g.timestamp > strftime('%s', 'now', '-1 hour') * 1000 THEN g.mark_iv END) as current_iv,
                        MAX(CASE WHEN g.timestamp < strftime('%s', 'now', '-23 hours') * 1000 
                                AND g.timestamp > strftime('%s', 'now', '-24 hours') * 1000 THEN g.mark_iv END) as yesterday_iv
                    FROM option_greeks g
                    JOIN option_instruments o ON g.instrument_name = o.instrument_name
                    WHERE g.instrument_name IN (SELECT instrument_name FROM atm_options)
                        AND g.timestamp > strftime('%s', 'now', '-24 hours') * 1000
                    GROUP BY g.instrument_name
                    HAVING current_iv IS NOT NULL AND yesterday_iv IS NOT NULL
                """,
                "answer": "ATM implied volatility changes over the last 24 hours:\n\n**Calls** (strikes 97k-103k):\n- Average IV: 52.3% → 54.8% (+2.5%)\n- Largest increase: BTC-28MAR25-100000-C up 4.2% (48.5% → 52.7%)\n\n**Puts** (strikes 97k-103k):  \n- Average IV: 53.1% → 56.2% (+3.1%)\n- Largest increase: BTC-28MAR25-98000-P up 5.5% (49.8% → 55.3%)\n\nThe increase in put IV relative to calls indicates growing downside protection demand. The volatility skew has steepened, suggesting market participants are pricing in higher probability of downside moves.",
            }
        ]

    @staticmethod
    def get_pnl_examples() -> List[Dict[str, Any]]:
        """Examples for P&L related queries."""
        return [
            {
                "question": "What's my P&L breakdown by instrument type?",
                "thought_process": "User wants P&L aggregated by instrument type (option, future, spot).",
                "sql": """
                    SELECT 
                        instrument_type,
                        COUNT(*) as position_count,
                        SUM(position_value) as total_value,
                        SUM(pnl) as total_pnl,
                        AVG(pnl_percent) as avg_pnl_percent,
                        MIN(pnl) as worst_position,
                        MAX(pnl) as best_position
                    FROM positions
                    WHERE is_active = 1
                    GROUP BY instrument_type
                    ORDER BY total_pnl DESC
                """,
                "answer": "Your P&L breakdown by instrument type:\n\n**Options** (23 positions):\n- Total P&L: +$45,230 (+12.8% average)\n- Total Value: $385,000\n- Best: +$18,500 | Worst: -$5,200\n\n**Futures** (2 positions):\n- Total P&L: -$8,750 (-3.2% average)\n- Total Value: $265,000\n- Best: +$1,200 | Worst: -$9,950\n\n**Spot** (1 position):\n- Total P&L: +$2,100 (+2.1%)\n- Total Value: $102,100\n\n**Portfolio Total**: +$38,580 (+5.1%)",
            }
        ]

    @staticmethod
    def get_risk_examples() -> List[Dict[str, Any]]:
        """Examples for risk analysis queries."""
        return [
            {
                "question": "Am I too exposed to any particular strike or expiry?",
                "thought_process": "User wants concentration risk analysis. Need to group positions by strike and expiry to find concentrations.",
                "sql": """
                    WITH position_concentrations AS (
                        SELECT 
                            o.strike,
                            DATE(o.expiry_timestamp/1000, 'unixepoch') as expiry_date,
                            COUNT(*) as position_count,
                            SUM(p.position_value) as total_value,
                            SUM(ABS(p.position_value)) as absolute_value,
                            SUM(p.position_delta) as total_delta
                        FROM positions p
                        JOIN option_instruments o ON p.instrument_name = o.instrument_name
                        WHERE p.is_active = 1 AND p.instrument_type = 'option'
                        GROUP BY o.strike, DATE(o.expiry_timestamp/1000, 'unixepoch')
                    ),
                    portfolio_total AS (
                        SELECT SUM(ABS(position_value)) as total_portfolio_value
                        FROM positions
                        WHERE is_active = 1
                    )
                    SELECT 
                        pc.*,
                        ROUND(pc.absolute_value * 100.0 / pt.total_portfolio_value, 1) as pct_of_portfolio
                    FROM position_concentrations pc, portfolio_total pt
                    WHERE pc.absolute_value > pt.total_portfolio_value * 0.1
                    ORDER BY pc.absolute_value DESC
                """,
                "answer": "Yes, you have significant concentration in a few strikes/expiries:\n\n**High Concentration Positions**:\n\n1. **100k strike, March 2025 expiry**: 28.5% of portfolio\n   - Total value: $215,000 (net long)\n   - Delta exposure: +8.5 BTC\n   - 5 different positions at this strike/expiry\n\n2. **95k strike, March 2025 expiry**: 15.2% of portfolio\n   - Total value: -$115,000 (net short)\n   - Delta exposure: -4.2 BTC\n   - Heavy put selling concentration\n\n3. **110k strike, April 2025 expiry**: 12.8% of portfolio\n   - Total value: $97,000\n   - Delta exposure: +3.1 BTC\n\n**Risk Assessment**: Your March 2025 exposure represents 43.7% of total portfolio value. Consider spreading risk across more expiries to reduce gamma/pin risk around March expiration.",
            }
        ]

    @staticmethod
    def get_all_examples() -> List[Dict[str, Any]]:
        """Get all examples combined."""
        examples = []
        examples.extend(ChatExamples.get_position_examples())
        examples.extend(ChatExamples.get_greeks_examples())
        examples.extend(ChatExamples.get_volatility_examples())
        examples.extend(ChatExamples.get_pnl_examples())
        examples.extend(ChatExamples.get_risk_examples())
        return examples

    @staticmethod
    def format_examples_for_prompt() -> str:
        """Format examples for inclusion in system prompt."""
        examples = ChatExamples.get_all_examples()[:3]  # Use first 3 examples

        formatted = []
        for i, example in enumerate(examples, 1):
            formatted.append(f"Example {i}:")
            formatted.append(f"User: {example['question']}")
            formatted.append(f"Assistant (thinking): {example['thought_process']}")
            formatted.append(f"Assistant (SQL): {example['sql'].strip()}")
            formatted.append(f"Assistant (response): {example['answer']}")
            formatted.append("")

        return "\n".join(formatted)
