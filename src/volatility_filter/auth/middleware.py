"""
FastAPI Authentication Middleware

This module provides authentication middleware for FastAPI applications,
integrating with Azure AD authentication service.
"""

import logging
from typing import Optional, Callable
from fastapi import FastAPI, Request, Response, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from .azure_auth import get_current_user

logger = logging.getLogger(__name__)

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)


class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    Authentication middleware that validates Azure AD tokens
    """
    
    def __init__(self, app: FastAPI, skip_auth_paths: Optional[list] = None):
        super().__init__(app)
        self.skip_auth_paths = skip_auth_paths or [
            "/api/health",
            "/health",
            "/docs",  
            "/openapi.json",
            "/redoc",
            "/favicon.ico"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and validate authentication
        
        Args:
            request: The incoming request
            call_next: The next middleware/handler
            
        Returns:
            Response from the next handler or authentication error
        """
        # Skip authentication for certain paths
        if any(request.url.path.startswith(path) for path in self.skip_auth_paths):
            return await call_next(request)
        
        # Skip authentication for static files
        if (
            request.url.path.startswith("/_next/") or
            request.url.path.startswith("/static/") or
            "." in request.url.path.split("/")[-1]
        ):
            return await call_next(request)
        
        try:
            # Get authorization header
            authorization = request.headers.get("authorization")
            
            # Validate authentication
            user = await get_current_user(authorization)
            
            # Add user information to request state
            request.state.user = user
            request.state.authenticated = True
            
            # Add user headers for downstream services
            if user:
                # Handle both real Headers objects and mock dict objects
                if hasattr(request.headers, '__dict__'):
                    # Real Headers object
                    request.headers.__dict__["_store"] = request.headers.__dict__.get("_store", [])
                    request.headers.__dict__["_store"].extend([
                        (b"x-user-id", user.get("id", "").encode()),
                        (b"x-user-email", user.get("email", "").encode()),
                        (b"x-user-name", user.get("name", "").encode()),
                        (b"x-tenant-id", user.get("tenant_id", "").encode()),
                    ])
                else:
                    # Mock dict object - add headers as string keys
                    request.headers.update({
                        "x-user-id": user.get("id", ""),
                        "x-user-email": user.get("email", ""),
                        "x-user-name": user.get("name", ""),
                        "x-tenant-id": user.get("tenant_id", ""),
                    })
            
            return await call_next(request)
            
        except HTTPException as e:
            return JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail, "authenticated": False}
            )
        except Exception as e:
            logger.error(f"Authentication middleware error: {e}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Authentication service error", "authenticated": False}
            )


async def get_current_user_dependency(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """
    FastAPI dependency to get current authenticated user
    
    Args:
        credentials: HTTP Bearer credentials
        
    Returns:
        User information dictionary
        
    Raises:
        HTTPException: If authentication fails
    """
    if credentials:
        authorization = f"Bearer {credentials.credentials}"
    else:
        authorization = None
    
    return await get_current_user(authorization)


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """
    FastAPI dependency to optionally get current user (doesn't require auth)
    
    Args:
        credentials: HTTP Bearer credentials
        
    Returns:
        User information dictionary or None if not authenticated
    """
    try:
        if credentials:
            authorization = f"Bearer {credentials.credentials}"
            return await get_current_user(authorization)
    except HTTPException:
        pass
    
    return None


def require_roles(*required_roles: str):
    """
    Decorator to require specific Azure AD roles
    
    Args:
        required_roles: List of required role names
        
    Returns:
        Dependency function that validates roles
    """
    async def check_roles(user: dict = Depends(get_current_user_dependency)) -> dict:
        user_roles = user.get("roles", [])
        
        if not any(role in user_roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required roles: {required_roles}"
            )
        
        return user
    
    return check_roles


def require_tenant(tenant_id: str):
    """
    Decorator to require specific Azure AD tenant
    
    Args:
        tenant_id: Required tenant ID
        
    Returns:
        Dependency function that validates tenant
    """
    async def check_tenant(user: dict = Depends(get_current_user_dependency)) -> dict:
        user_tenant = user.get("tenant_id")
        
        if user_tenant != tenant_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied for this tenant"
            )
        
        return user
    
    return check_tenant


def add_auth_middleware(app: FastAPI, skip_paths: Optional[list] = None) -> None:
    """
    Add authentication middleware to FastAPI app
    
    Args:
        app: FastAPI application instance
        skip_paths: List of paths to skip authentication
    """
    app.add_middleware(AuthenticationMiddleware, skip_auth_paths=skip_paths)
    logger.info("Authentication middleware added to FastAPI app")