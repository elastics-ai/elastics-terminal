#!/usr/bin/env python3
"""Test API endpoints with mock data."""

import sys
import os
from pathlib import Path
import asyncio
import aiosqlite
import json

# Add parent directory to Python path
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from tests.e2e.fixtures.database import create_test_database

async def test_portfolio_summary():
    """Test portfolio summary query directly."""
    test_db_path = "/tmp/test_api_mock.db"
    create_test_database(test_db_path)
    
    async with aiosqlite.connect(test_db_path) as conn:
        conn.row_factory = aiosqlite.Row
        
        # Test the portfolio summary query
        cursor = await conn.execute("""
            SELECT COUNT(*) as total_positions,
                   SUM(position_value) as total_value,
                   SUM(pnl) as total_pnl,
                   SUM(position_delta) as net_delta,
                   SUM(ABS(position_delta)) as absolute_delta,
                   SUM(gamma * quantity * 100) as total_gamma,
                   SUM(vega * quantity * 100) as total_vega,
                   SUM(theta * quantity * 100) as total_theta
            FROM positions
            WHERE is_active = 1
        """)
        
        summary = await cursor.fetchone()
        print("Portfolio Summary Query Result:")
        if summary:
            for key in summary.keys():
                print(f"  {key}: {summary[key]}")
        else:
            print("  No data returned")
        
        # Check positions table structure
        cursor = await conn.execute("PRAGMA table_info(positions)")
        columns = await cursor.fetchall()
        print("\nPositions table columns:")
        for col in columns:
            print(f"  {col['name']} ({col['type']})")
        
        # Check if there are any positions
        cursor = await conn.execute("SELECT COUNT(*) as count FROM positions")
        count = await cursor.fetchone()
        print(f"\nTotal positions in table: {count['count']}")
        
        # Try to fetch actual positions
        cursor = await conn.execute("SELECT * FROM positions LIMIT 5")
        positions = await cursor.fetchall()
        print(f"\nSample positions: {len(positions)}")
        
        # Test volatility alerts query
        cursor = await conn.execute("""
            SELECT 
                timestamp,
                datetime,
                price,
                volatility as current_volatility,
                threshold,
                CASE 
                    WHEN volatility > threshold THEN 'above'
                    ELSE 'below'
                END as breach_type
            FROM volatility_events
            WHERE event_type = 'threshold_exceeded'
            ORDER BY timestamp DESC
            LIMIT 10
        """)
        
        alerts = await cursor.fetchall()
        print(f"\nVolatility alerts: {len(alerts)}")
        
        # Test SQL modules table
        cursor = await conn.execute("SELECT COUNT(*) as count FROM sql_modules")
        modules_count = await cursor.fetchone()
        print(f"\nSQL modules: {modules_count['count']}")

if __name__ == "__main__":
    asyncio.run(test_portfolio_summary())