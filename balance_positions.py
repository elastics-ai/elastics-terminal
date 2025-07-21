#!/usr/bin/env python3
"""Balance portfolio to achieve target delta."""


import time
import random
import uuid
from datetime import datetime
from src.volatility_filter.database import DatabaseManager
from src.volatility_filter.option_data_fetcher import OptionDataFetcher
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def generate_position_id():
    """Generate unique position ID."""
    return f"POS_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"


def main():
    db = DatabaseManager()
    fetcher = OptionDataFetcher()

    # Get current portfolio status
    summary = db.get_portfolio_summary()
    current_delta = summary["total_delta"]
    target_delta = 100000
    delta_needed = target_delta - current_delta

    logger.info(f"Current portfolio delta: ${current_delta:,.2f}")
    logger.info(f"Target delta: ${target_delta:,.2f}")
    logger.info(f"Delta needed: ${delta_needed:,.2f}")

    if abs(delta_needed) < 5000:
        logger.info("Portfolio already close to target!")
        return

    # Fetch BTC price
    btc_price = fetcher.fetch_index_price("BTC")
    logger.info(f"Current BTC price: ${btc_price:,.2f}")

    # We need to add long positions since delta is negative
    # Fetch ATM call options
    logger.info("Fetching option instruments...")
    instruments = fetcher.fetch_option_instruments("BTC", expired=False)

    # Filter for ATM calls
    current_time = time.time() * 1000
    one_week = 7 * 24 * 60 * 60 * 1000
    one_month = 30 * 24 * 60 * 60 * 1000

    atm_calls = []
    for inst in instruments:
        if inst["option_type"] == "call":
            expiry_time = inst["expiry_timestamp"]
            time_to_expiry = expiry_time - current_time

            if one_week < time_to_expiry < one_month:
                strike = inst["strike"]
                moneyness = strike / btc_price

                # ATM options (95% to 105% of spot)
                if 0.95 < moneyness < 1.05:
                    atm_calls.append(inst)

    logger.info(f"Found {len(atm_calls)} ATM call options")

    # Select a few ATM calls
    selected = random.sample(atm_calls, min(5, len(atm_calls)))

    # Fetch Greeks
    instrument_names = [inst["instrument_name"] for inst in selected]
    greeks_data = fetcher.fetch_greeks_for_instruments(instrument_names)

    # Create long call positions
    positions = []
    remaining_delta = delta_needed

    for inst in selected:
        inst_name = inst["instrument_name"]
        if inst_name not in greeks_data:
            continue

        greeks = greeks_data[inst_name]
        option_delta = greeks.get("delta", 0)

        if option_delta < 0.3:  # Skip if delta too small
            continue

        # Calculate quantity needed
        # We want to add about 1/3 of remaining delta with each position
        target_position_delta = remaining_delta / 3
        quantity = target_position_delta / (option_delta * btc_price)

        # Reasonable size limits
        quantity = max(0.5, min(quantity, 5.0))
        quantity = round(quantity, 2)

        mark_price = greeks.get("mark_price", 0)
        position_delta = quantity * option_delta * btc_price
        position_value = quantity * mark_price * btc_price

        position_data = {
            "position_id": generate_position_id(),
            "instrument_name": inst_name,
            "instrument_type": "option",
            "quantity": quantity,  # Long position
            "entry_price": mark_price,
            "entry_timestamp": int(current_time),
            "current_price": mark_price,
            "current_timestamp": int(current_time),
            "underlying_price": btc_price,
            "mark_iv": greeks.get("mark_iv"),
            "delta": option_delta,
            "gamma": greeks.get("gamma"),
            "vega": greeks.get("vega"),
            "theta": greeks.get("theta"),
            "position_delta": position_delta,
            "position_value": position_value,
            "pnl": 0,
            "pnl_percent": 0,
            "is_active": True,
            "notes": f"Balancing position - CALL strike {inst['strike']}",
        }

        positions.append(position_data)
        remaining_delta -= position_delta

        logger.info(
            f"Adding: {inst_name} qty={quantity:.2f} delta=${position_delta:,.0f}"
        )

        if remaining_delta < 10000:
            break

    # Insert positions
    if positions:
        logger.info(f"\nInserting {len(positions)} balancing positions...")
        db.insert_bulk_positions(positions)

        # Get updated summary
        summary = db.get_portfolio_summary()
        logger.info("\n=== Updated Portfolio Summary ===")
        logger.info(f"Total positions: {summary['active_positions']}")
        logger.info(f"Total delta: ${summary['total_delta']:,.2f}")
        logger.info(f"Target delta: ${target_delta:,.2f}")
        logger.info(f"Difference: ${abs(summary['total_delta'] - target_delta):,.2f}")


if __name__ == "__main__":
    main()
