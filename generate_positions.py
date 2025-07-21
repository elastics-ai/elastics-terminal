#!/usr/bin/env python3
"""Generate artificial positions with Deribit options targeting $100k total delta."""

import sys
import time
import random
import uuid
from datetime import datetime, timedelta
from src.volatility_filter.database import DatabaseManager
from src.volatility_filter.option_data_fetcher import OptionDataFetcher
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def generate_position_id():
    """Generate unique position ID."""
    return f"POS_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"


def calculate_position_size(
    target_delta_usd, option_delta, underlying_price, contract_size=1
):
    """Calculate position size to achieve target delta in USD."""
    # Delta exposure = quantity * delta * underlying_price * contract_size
    # Solve for quantity: quantity = target_delta_usd / (delta * underlying_price * contract_size)
    if option_delta == 0:
        return 0
    return target_delta_usd / (abs(option_delta) * underlying_price * contract_size)


def main():
    # Initialize components
    db = DatabaseManager()
    fetcher = OptionDataFetcher()

    # Target total delta in USD
    TARGET_DELTA_USD = 100000

    logger.info("Fetching current BTC price...")
    btc_price = fetcher.fetch_index_price("BTC")
    if not btc_price:
        logger.error("Failed to fetch BTC price")
        return

    logger.info(f"Current BTC price: ${btc_price:,.2f}")

    # Fetch option instruments
    logger.info("Fetching BTC option instruments...")
    instruments = fetcher.fetch_option_instruments("BTC", expired=False)

    if not instruments:
        logger.error("No option instruments found")
        return

    # First, insert all instruments into the database
    logger.info(f"Inserting {len(instruments)} instruments into database...")
    db.insert_option_instruments(instruments)

    # Filter for liquid options (near expiries and reasonable strikes)
    current_time = time.time() * 1000
    one_week = 7 * 24 * 60 * 60 * 1000
    two_months = 60 * 24 * 60 * 60 * 1000

    # Filter instruments
    liquid_instruments = []
    for inst in instruments:
        expiry_time = inst["expiry_timestamp"]
        time_to_expiry = expiry_time - current_time

        # Only consider options expiring between 1 week and 2 months
        if one_week < time_to_expiry < two_months:
            strike = inst["strike"]
            moneyness = strike / btc_price

            # Only consider options with strikes between 70% and 130% of current price
            if 0.7 < moneyness < 1.3:
                liquid_instruments.append(inst)

    logger.info(f"Found {len(liquid_instruments)} liquid instruments")

    if len(liquid_instruments) < 10:
        logger.error("Not enough liquid instruments to create diverse portfolio")
        return

    # Select instruments for positions
    # Strategy: Mix of different strikes and expiries
    selected_instruments = random.sample(
        liquid_instruments, min(20, len(liquid_instruments))
    )

    # Fetch Greeks for selected instruments
    logger.info("Fetching Greeks for selected instruments...")
    instrument_names = [inst["instrument_name"] for inst in selected_instruments]
    greeks_data = fetcher.fetch_greeks_for_instruments(instrument_names)

    # Create positions
    positions = []
    total_delta_usd = 0
    remaining_delta = TARGET_DELTA_USD

    for inst in selected_instruments:
        inst_name = inst["instrument_name"]
        if inst_name not in greeks_data:
            continue

        greeks = greeks_data[inst_name]
        option_delta = greeks.get("delta", 0)

        if abs(option_delta) < 0.01:  # Skip options with very small delta
            continue

        # Determine position direction (long/short) randomly but bias towards balancing
        if total_delta_usd > TARGET_DELTA_USD * 0.5:
            # Bias towards short positions to reduce delta
            is_long = random.random() < 0.3
        elif total_delta_usd < -TARGET_DELTA_USD * 0.5:
            # Bias towards long positions to increase delta
            is_long = random.random() < 0.7
        else:
            # Random
            is_long = random.random() < 0.5

        # Calculate position size
        # Allocate between 5% and 20% of remaining delta to each position
        allocation_pct = random.uniform(0.05, 0.20)
        target_position_delta = abs(remaining_delta) * allocation_pct

        quantity = calculate_position_size(
            target_position_delta, option_delta, btc_price
        )

        # Round to reasonable size
        if quantity < 0.1:
            quantity = 0.1
        elif quantity > 10:
            quantity = round(quantity, 1)
        else:
            quantity = round(quantity, 2)

        # Apply direction
        if not is_long:
            quantity = -quantity

        # Calculate position metrics
        mark_price = greeks.get("mark_price", 0)
        position_delta = quantity * option_delta * btc_price  # USD delta
        position_value = quantity * mark_price * btc_price  # USD value

        position_data = {
            "position_id": generate_position_id(),
            "instrument_name": inst_name,
            "instrument_type": "option",
            "quantity": quantity,
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
            "notes": f"Artificial position - {inst['option_type'].upper()} strike {inst['strike']}",
        }

        positions.append(position_data)
        total_delta_usd += position_delta
        remaining_delta = TARGET_DELTA_USD - total_delta_usd

        logger.info(
            f"Position {len(positions)}: {inst_name} qty={quantity:.2f} "
            f"delta=${position_delta:,.0f} total_delta=${total_delta_usd:,.0f}"
        )

        # Stop if we're close enough to target
        if abs(total_delta_usd - TARGET_DELTA_USD) < 5000:
            break

    # Insert positions into database
    logger.info(f"\nInserting {len(positions)} positions into database...")
    inserted = db.insert_bulk_positions(positions)

    # Get portfolio summary
    summary = db.get_portfolio_summary()

    logger.info("\n=== Portfolio Summary ===")
    logger.info(f"Total positions: {summary['active_positions']}")
    logger.info(f"Total delta: ${summary['total_delta']:,.2f}")
    logger.info(f"Total value: ${summary['total_value']:,.2f}")
    logger.info(f"Total gamma exposure: ${summary['total_gamma_exposure']:,.2f}")
    logger.info(f"Total vega exposure: ${summary['total_vega_exposure']:,.2f}")
    logger.info(f"Total theta exposure: ${summary['total_theta_exposure']:,.2f}")

    if summary["breakdown"]:
        logger.info("\nPosition breakdown:")
        for inst_type, data in summary["breakdown"].items():
            logger.info(
                f"  {inst_type}: {data['count']} positions, ${data['value']:,.2f} value"
            )

    logger.info(f"\nTarget delta: ${TARGET_DELTA_USD:,.2f}")
    logger.info(f"Achieved delta: ${summary['total_delta']:,.2f}")
    logger.info(
        f"Difference: ${abs(summary['total_delta'] - TARGET_DELTA_USD):,.2f} "
        f"({abs(summary['total_delta'] - TARGET_DELTA_USD) / TARGET_DELTA_USD * 100:.1f}%)"
    )


if __name__ == "__main__":
    main()
