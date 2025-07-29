"""
Tests for FastAPI authentication middleware
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from fastapi import FastAPI, Request, HTTPException, status, Depends
from fastapi.security import HTTPAuthorizationCredentials
from starlette.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from src.volatility_filter.auth.middleware import (
    AuthenticationMiddleware,
    get_current_user_dependency,
    get_optional_user,
    require_roles,
    require_tenant,
    add_auth_middleware
)
from tests.fixtures.auth_fixtures import (
    MOCK_AZURE_USER,
    MOCK_LOCAL_DEV_USER,
    create_mock_request,
    create_mock_credentials,
    create_mock_jwt_token,
    UNPROTECTED_PATHS,
    PROTECTED_PATHS,
    mock_azure_env_vars,
    mock_local_dev_env_vars
)


class TestAuthenticationMiddleware:
    """Test cases for AuthenticationMiddleware"""
    
    @pytest.fixture
    def app(self):
        """Create a test FastAPI app"""
        app = FastAPI()
        
        @app.get("/test")
        async def test_endpoint():
            return {"message": "test"}
        
        return app
    
    @pytest.fixture
    def middleware(self, app):
        """Create middleware instance"""
        return AuthenticationMiddleware(app)
    
    @pytest.mark.asyncio
    async def test_skip_auth_paths(self, middleware):
        """Test that authentication is skipped for configured paths"""
        async def mock_call_next(request):
            return JSONResponse({"message": "success"})
        
        for path in UNPROTECTED_PATHS:
            request = create_mock_request(path)
            response = await middleware.dispatch(request, mock_call_next)
            
            assert response.status_code == 200
            # Verify that authentication was skipped (user remains None/unchanged)
            assert request.state.user is None
    
    @pytest.mark.asyncio
    async def test_static_files_skip_auth(self, middleware):
        """Test that static files skip authentication"""
        async def mock_call_next(request):
            return JSONResponse({"message": "success"})
        
        static_paths = [
            "/_next/static/chunk.js",
            "/static/style.css",
            "/favicon.ico",
            "/api/data.json"
        ]
        
        for path in static_paths:
            request = create_mock_request(path)
            response = await middleware.dispatch(request, mock_call_next)
            
            assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_protected_path_with_valid_auth(self, middleware, mock_azure_env_vars):
        """Test protected path with valid authentication"""
        async def mock_call_next(request):
            return JSONResponse({"message": "success"})
        
        valid_token = create_mock_jwt_token()
        headers = {"authorization": f"Bearer {valid_token}"}
        request = create_mock_request("/api/protected", headers)
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.return_value = MOCK_AZURE_USER
            
            response = await middleware.dispatch(request, mock_call_next)
            
            assert response.status_code == 200
            assert request.state.user == MOCK_AZURE_USER
            assert request.state.authenticated is True
    
    @pytest.mark.asyncio
    async def test_protected_path_without_auth(self, middleware, mock_azure_env_vars):
        """Test protected path without authentication"""
        async def mock_call_next(request):
            return JSONResponse({"message": "success"})
        
        request = create_mock_request("/api/protected")
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.side_effect = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required"
            )
            
            response = await middleware.dispatch(request, mock_call_next)
            
            assert response.status_code == 401
            # Parse JSON response
            import json
            content = json.loads(response.body.decode())
            assert content["detail"] == "Authorization header required"
            assert content["authenticated"] is False
    
    @pytest.mark.asyncio
    async def test_protected_path_with_invalid_token(self, middleware, mock_azure_env_vars):
        """Test protected path with invalid token"""
        async def mock_call_next(request):
            return JSONResponse({"message": "success"})
        
        headers = {"authorization": "Bearer invalid-token"}
        request = create_mock_request("/api/protected", headers)
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.side_effect = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
            
            response = await middleware.dispatch(request, mock_call_next)
            
            assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_middleware_adds_user_headers(self, middleware, mock_azure_env_vars):
        """Test that middleware adds user information to request headers"""
        async def mock_call_next(request):
            # Check that user headers were added (mock dict format)
            assert "x-user-id" in request.headers
            assert "x-user-email" in request.headers
            assert "x-user-name" in request.headers
            assert "x-tenant-id" in request.headers
            return JSONResponse({"message": "success"})
        
        valid_token = create_mock_jwt_token()
        headers = {"authorization": f"Bearer {valid_token}"}
        request = create_mock_request("/api/protected", headers)
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.return_value = MOCK_AZURE_USER
            
            response = await middleware.dispatch(request, mock_call_next)
            
            assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_middleware_handles_general_exception(self, middleware):
        """Test middleware handles general exceptions gracefully"""
        async def mock_call_next(request):
            return JSONResponse({"message": "success"})
        
        request = create_mock_request("/api/protected", {"authorization": "Bearer test-token"})
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.side_effect = Exception("Unexpected error")
            
            response = await middleware.dispatch(request, mock_call_next)
            
            assert response.status_code == 500
            import json
            content = json.loads(response.body.decode())
            assert content["detail"] == "Authentication service error"
            assert content["authenticated"] is False
    
    def test_custom_skip_paths(self):
        """Test middleware with custom skip paths"""
        app = FastAPI()
        custom_skip_paths = ["/custom/skip", "/another/skip"]
        
        middleware = AuthenticationMiddleware(app, skip_auth_paths=custom_skip_paths)
        
        assert middleware.skip_auth_paths == custom_skip_paths


class TestGetCurrentUserDependency:
    """Test cases for get_current_user_dependency"""
    
    @pytest.mark.asyncio
    async def test_with_valid_credentials(self, mock_azure_env_vars):
        """Test dependency with valid credentials"""
        valid_token = create_mock_jwt_token()
        credentials = create_mock_credentials(valid_token)
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.return_value = MOCK_AZURE_USER
            
            result = await get_current_user_dependency(credentials)
            
            assert result == MOCK_AZURE_USER
            mock_get_user.assert_called_once_with(f"Bearer {valid_token}")
    
    @pytest.mark.asyncio
    async def test_without_credentials(self, mock_local_dev_env_vars):
        """Test dependency without credentials"""
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.return_value = MOCK_LOCAL_DEV_USER
            
            result = await get_current_user_dependency(None)
            
            assert result == MOCK_LOCAL_DEV_USER
            mock_get_user.assert_called_once_with(None)
    
    @pytest.mark.asyncio
    async def test_with_authentication_error(self, mock_azure_env_vars):
        """Test dependency when authentication fails"""
        credentials = create_mock_credentials("invalid-token")
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.side_effect = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
            
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user_dependency(credentials)
            
            assert exc_info.value.status_code == 401
            assert exc_info.value.detail == "Invalid token"


class TestGetOptionalUser:
    """Test cases for get_optional_user"""
    
    @pytest.mark.asyncio
    async def test_with_valid_credentials(self, mock_azure_env_vars):
        """Test optional user with valid credentials"""
        valid_token = create_mock_jwt_token()
        credentials = create_mock_credentials(valid_token)
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.return_value = MOCK_AZURE_USER
            
            result = await get_optional_user(credentials)
            
            assert result == MOCK_AZURE_USER
    
    @pytest.mark.asyncio
    async def test_with_invalid_credentials(self, mock_azure_env_vars):
        """Test optional user with invalid credentials"""
        credentials = create_mock_credentials("invalid-token")
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.side_effect = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
            
            result = await get_optional_user(credentials)
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_without_credentials(self):
        """Test optional user without credentials"""
        result = await get_optional_user(None)
        
        assert result is None


class TestRequireRoles:
    """Test cases for require_roles decorator"""
    
    @pytest.mark.asyncio
    async def test_user_has_required_role(self):
        """Test user with required role"""
        user_with_role = {**MOCK_AZURE_USER, "roles": ["Admin", "User"]}
        
        check_roles = require_roles("Admin")
        
        result = await check_roles(user_with_role)
        
        assert result == user_with_role
    
    @pytest.mark.asyncio
    async def test_user_has_one_of_required_roles(self):
        """Test user with one of multiple required roles"""
        user_with_role = {**MOCK_AZURE_USER, "roles": ["User"]}
        
        check_roles = require_roles("Admin", "User", "Manager")
        
        result = await check_roles(user_with_role)
        
        assert result == user_with_role
    
    @pytest.mark.asyncio
    async def test_user_missing_required_role(self):
        """Test user without required role"""
        user_without_role = {**MOCK_AZURE_USER, "roles": ["User"]}
        
        check_roles = require_roles("Admin")
        
        with pytest.raises(HTTPException) as exc_info:
            await check_roles(user_without_role)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Insufficient permissions" in str(exc_info.value.detail)
        assert "Admin" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_user_no_roles_attribute(self):
        """Test user without roles attribute"""
        user_no_roles = {**MOCK_AZURE_USER}
        user_no_roles.pop("roles", None)
        
        check_roles = require_roles("Admin")
        
        with pytest.raises(HTTPException) as exc_info:
            await check_roles(user_no_roles)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


class TestRequireTenant:
    """Test cases for require_tenant decorator"""
    
    @pytest.mark.asyncio
    async def test_user_in_correct_tenant(self):
        """Test user in correct tenant"""
        user_correct_tenant = {**MOCK_AZURE_USER, "tenant_id": "test-tenant-id"}
        
        check_tenant = require_tenant("test-tenant-id")
        
        result = await check_tenant(user_correct_tenant)
        
        assert result == user_correct_tenant
    
    @pytest.mark.asyncio
    async def test_user_in_wrong_tenant(self):
        """Test user in wrong tenant"""
        user_wrong_tenant = {**MOCK_AZURE_USER, "tenant_id": "wrong-tenant-id"}
        
        check_tenant = require_tenant("test-tenant-id")
        
        with pytest.raises(HTTPException) as exc_info:
            await check_tenant(user_wrong_tenant)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
        assert "Access denied for this tenant" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_user_no_tenant_attribute(self):
        """Test user without tenant_id attribute"""
        user_no_tenant = {**MOCK_AZURE_USER}
        user_no_tenant.pop("tenant_id", None)
        
        check_tenant = require_tenant("test-tenant-id")
        
        with pytest.raises(HTTPException) as exc_info:
            await check_tenant(user_no_tenant)
        
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN


class TestAddAuthMiddleware:
    """Test cases for add_auth_middleware function"""
    
    def test_add_auth_middleware_default_paths(self):
        """Test adding middleware with default skip paths"""
        app = FastAPI()
        
        # Mock the add_middleware method
        app.add_middleware = Mock()
        
        add_auth_middleware(app)
        
        app.add_middleware.assert_called_once_with(
            AuthenticationMiddleware,
            skip_auth_paths=None
        )
    
    def test_add_auth_middleware_custom_paths(self):
        """Test adding middleware with custom skip paths"""
        app = FastAPI()
        custom_paths = ["/custom/skip"]
        
        # Mock the add_middleware method
        app.add_middleware = Mock()
        
        add_auth_middleware(app, skip_paths=custom_paths)
        
        app.add_middleware.assert_called_once_with(
            AuthenticationMiddleware,
            skip_auth_paths=custom_paths
        )


class TestIntegrationScenarios:
    """Integration test scenarios for middleware"""
    
    @pytest.mark.asyncio
    async def test_full_auth_flow_azure_mode(self, mock_azure_env_vars):
        """Test complete authentication flow in Azure mode"""
        app = FastAPI()
        middleware = AuthenticationMiddleware(app)
        
        # Mock successful authentication
        async def mock_call_next(request):
            return JSONResponse({
                "user_id": request.state.user["id"],
                "authenticated": request.state.authenticated
            })
        
        valid_token = create_mock_jwt_token()
        headers = {"authorization": f"Bearer {valid_token}"}
        request = create_mock_request("/api/user/profile", headers)
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.return_value = MOCK_AZURE_USER
            
            response = await middleware.dispatch(request, mock_call_next)
            
            assert response.status_code == 200
            import json
            content = json.loads(response.body.decode())
            assert content["user_id"] == MOCK_AZURE_USER["id"]
            assert content["authenticated"] is True
    
    @pytest.mark.asyncio
    async def test_full_auth_flow_local_dev_mode(self, mock_local_dev_env_vars):
        """Test complete authentication flow in local development mode"""
        app = FastAPI()
        middleware = AuthenticationMiddleware(app)
        
        async def mock_call_next(request):
            return JSONResponse({
                "user_id": request.state.user["id"],
                "authenticated": request.state.authenticated
            })
        
        # No authorization header in local dev mode
        request = create_mock_request("/api/user/profile")
        
        with patch('src.volatility_filter.auth.middleware.get_current_user') as mock_get_user:
            mock_get_user.return_value = MOCK_LOCAL_DEV_USER
            
            response = await middleware.dispatch(request, mock_call_next)
            
            assert response.status_code == 200
            import json
            content = json.loads(response.body.decode())
            assert content["user_id"] == MOCK_LOCAL_DEV_USER["id"]
            assert content["authenticated"] is True
    
    @pytest.mark.asyncio
    async def test_role_based_access_control(self):
        """Test role-based access control integration"""
        admin_user = {**MOCK_AZURE_USER, "roles": ["Admin"]}
        regular_user = {**MOCK_AZURE_USER, "roles": ["User"]}
        
        # Test admin access
        check_admin_role = require_roles("Admin")
        result = await check_admin_role(admin_user)
        assert result == admin_user
        
        # Test regular user denied admin access
        with pytest.raises(HTTPException) as exc_info:
            await check_admin_role(regular_user)
        assert exc_info.value.status_code == 403