#!/usr/bin/env python3
"""Run E2E tests locally (without Docker) for debugging."""

import subprocess
import sys
import os
import time

def check_service(name, url, max_retries=30):
    """Check if a service is running."""
    import requests
    
    print(f"Checking {name} at {url}...")
    for i in range(max_retries):
        try:
            response = requests.get(url, timeout=5)
            if response.status_code in [200, 404]:  # 404 is OK for root paths
                print(f"✅ {name} is running")
                return True
        except Exception as e:
            if i < max_retries - 1:
                print(f"  Waiting for {name}... ({i+1}/{max_retries})")
                time.sleep(1)
            else:
                print(f"❌ {name} failed to start: {e}")
                return False
    return False

def main():
    """Run tests locally."""
    
    # Check if services are running
    services = [
        ("API Server", "http://localhost:8000/api/health"),
        ("WebSocket Server", "http://localhost:8765"),  # Will fail but that's OK
        ("Next.js App", "http://localhost:3000"),
    ]
    
    print("Checking services...")
    all_running = True
    
    for name, url in services:
        if not check_service(name, url, max_retries=5):
            if name != "WebSocket Server":  # WebSocket doesn't respond to HTTP
                all_running = False
    
    if not all_running:
        print("\n⚠️  Some services are not running.")
        print("Please ensure all services are started:")
        print("  - API Server: python api_server.py")
        print("  - WebSocket: python -m src.volatility_filter.websocket_server")
        print("  - Next.js: npm run dev")
        return 1
    
    # Run Python tests
    print("\n🐍 Running Python E2E tests...")
    
    # Set environment variables
    env = os.environ.copy()
    env["TESTING"] = "true"
    env["API_URL"] = "http://localhost:8000"
    env["WS_URL"] = "ws://localhost:8765"
    env["ANTHROPIC_API_KEY"] = "test-key"
    
    # Add parent directory to Python path
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env["PYTHONPATH"] = parent_dir + ":" + env.get("PYTHONPATH", "")
    
    # Run pytest
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/e2e/", "-v", "-m", "e2e"],
        env=env,
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    
    if result.returncode != 0:
        print("\n❌ Python tests failed")
        return result.returncode
    
    print("\n✅ Python tests passed")
    
    # Run Playwright tests
    print("\n🎭 Running Playwright E2E tests...")
    
    # Install Playwright browsers if needed
    subprocess.run(["npx", "playwright", "install"], check=False)
    
    # Run Playwright tests
    result = subprocess.run(
        ["npx", "playwright", "test"],
        env={"BASE_URL": "http://localhost:3000", **env},
        cwd=os.path.dirname(os.path.abspath(__file__))
    )
    
    if result.returncode != 0:
        print("\n❌ Playwright tests failed")
        return result.returncode
    
    print("\n✅ All tests passed!")
    return 0

if __name__ == "__main__":
    sys.exit(main())