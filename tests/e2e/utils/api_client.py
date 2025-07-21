import httpx
from typing import Dict, Any, Optional
import asyncio
from contextlib import asynccontextmanager

class APIClient:
    """Test client for API requests."""
    
    def __init__(self, base_url: str, timeout: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=self.timeout,
            headers={"Content-Type": "application/json"}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._client:
            await self._client.aclose()
    
    async def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> httpx.Response:
        """Make GET request."""
        return await self._client.get(path, params=params)
    
    async def post(self, path: str, json: Optional[Dict[str, Any]] = None) -> httpx.Response:
        """Make POST request."""
        return await self._client.post(path, json=json)
    
    async def put(self, path: str, json: Optional[Dict[str, Any]] = None) -> httpx.Response:
        """Make PUT request."""
        return await self._client.put(path, json=json)
    
    async def delete(self, path: str) -> httpx.Response:
        """Make DELETE request."""
        return await self._client.delete(path)
    
    async def health_check(self, max_retries: int = 30, retry_delay: float = 1.0) -> bool:
        """Check if API is healthy."""
        for i in range(max_retries):
            try:
                response = await self.get("/api/health")
                if response.status_code == 200:
                    return True
            except Exception:
                pass
            
            if i < max_retries - 1:
                await asyncio.sleep(retry_delay)
        
        return False

@asynccontextmanager
async def api_client(base_url: str):
    """Context manager for API client."""
    async with APIClient(base_url) as client:
        yield client