#!/usr/bin/env python3
"""Run API integration tests locally."""

import subprocess
import sys
import os
import asyncio
from pathlib import Path

# Add parent directory to Python path
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

# Set test environment
os.environ["TESTING"] = "true"
os.environ["ANTHROPIC_API_KEY"] = "test-key"
os.environ["API_URL"] = "http://localhost:8000"
os.environ["WS_URL"] = "ws://localhost:8765"

# Create test database if needed
from tests.e2e.fixtures.database import create_test_database

test_db_path = "/tmp/test_volatility.db"
print(f"Creating test database at {test_db_path}")
create_test_database(test_db_path)

# Set database path
os.environ["DB_PATH"] = test_db_path

# Run specific test
async def run_test():
    """Run a single test to check for issues."""
    from tests.e2e.utils.api_client import api_client
    
    print("\nTesting API health endpoint...")
    async with api_client("http://localhost:8000") as client:
        try:
            response = await client.get("/api/health")
            print(f"Health check: {response.status_code}")
            if response.status_code == 200:
                print("✅ API is healthy")
            else:
                print(f"❌ API returned {response.status_code}")
        except Exception as e:
            print(f"❌ Failed to connect: {e}")
            print("\nMake sure the API server is running:")
            print("  python api_server.py")
            return False
    
    print("\nTesting portfolio summary endpoint...")
    async with api_client("http://localhost:8000") as client:
        try:
            response = await client.get("/api/portfolio/summary")
            print(f"Portfolio summary: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Got portfolio data: {list(data.keys())}")
            else:
                print(f"❌ API returned {response.status_code}")
                print(f"Response: {response.text}")
        except Exception as e:
            print(f"❌ Error: {e}")
            return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(run_test())
    sys.exit(0 if success else 1)