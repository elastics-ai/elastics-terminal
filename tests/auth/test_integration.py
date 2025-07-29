"""
Integration tests for the complete authentication flow
"""

import pytest
import os
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.testclient import TestClient
from starlette.responses import JSONResponse

from src.volatility_filter.auth import (
    add_auth_middleware,
    get_current_user_dependency,
    get_optional_user,
    require_roles,
    require_tenant
)
from tests.fixtures.auth_fixtures import (
    MOCK_AZURE_USER,
    MOCK_LOCAL_DEV_USER,
    create_mock_jwt_token,
    AuthTestScenarios,
    mock_azure_env_vars,
    mock_local_dev_env_vars,
    UNPROTECTED_PATHS,
    PROTECTED_PATHS
)


class TestEndToEndAuthFlow:
    """End-to-end authentication flow tests"""
    
    @pytest.fixture
    def test_app(self):
        """Create a test FastAPI app with authentication"""
        app = FastAPI()
        
        @app.get("/api/health")
        async def health_check():
            return {"status": "healthy"}
        
        @app.get("/api/public")
        async def public_endpoint():
            return {"message": "public access"}
        
        @app.get("/api/protected")
        async def protected_endpoint(user: dict = Depends(get_current_user_dependency)):
            return {
                "message": "protected access",
                "user_id": user["id"],
                "user_email": user["email"]
            }
        
        @app.get("/api/optional-auth")
        async def optional_auth_endpoint(user: dict = Depends(get_optional_user)):
            if user:
                return {"message": "authenticated access", "user_id": user["id"]}
            else:
                return {"message": "anonymous access"}
        
        @app.get("/api/admin")
        async def admin_endpoint(user: dict = Depends(require_roles("Admin"))):
            return {"message": "admin access", "user_id": user["id"]}
        
        @app.get("/api/tenant-specific")
        async def tenant_endpoint(user: dict = Depends(require_tenant("test-tenant-id"))):
            return {"message": "tenant access", "user_id": user["id"]}
        
        # Add authentication middleware
        add_auth_middleware(app)
        
        return app
    
    @pytest.fixture
    def client(self, test_app):
        """Create test client"""
        return TestClient(test_app)
    
    def test_health_check_no_auth_required(self, client):
        """Test health check endpoint doesn't require authentication"""
        response = client.get("/api/health")
        
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
    
    def test_public_endpoint_accessible(self, client):
        """Test public endpoint is accessible without auth"""
        response = client.get("/api/public")
        
        assert response.status_code == 200
        assert response.json() == {"message": "public access"}
    
    @patch.dict(os.environ, {
        "AUTH_AZURE_AD_CLIENT_ID": "test-client-id",
        "AUTH_AZURE_AD_CLIENT_SECRET": "test-secret",
        "AUTH_AZURE_AD_TENANT_ID": "test-tenant-id"
    })
    def test_protected_endpoint_azure_mode_valid_token(self, client):
        """Test protected endpoint with valid Azure AD token"""
        valid_token = create_mock_jwt_token()
        
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = MOCK_AZURE_USER
            
            response = client.get(
                "/api/protected",
                headers={"Authorization": f"Bearer {valid_token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "protected access"
            assert data["user_id"] == MOCK_AZURE_USER["id"]
            assert data["user_email"] == MOCK_AZURE_USER["email"]
    
    @patch.dict(os.environ, {
        "AUTH_AZURE_AD_CLIENT_ID": "test-client-id",
        "AUTH_AZURE_AD_CLIENT_SECRET": "test-secret",
        "AUTH_AZURE_AD_TENANT_ID": "test-tenant-id"
    })
    def test_protected_endpoint_azure_mode_invalid_token(self, client):
        """Test protected endpoint with invalid Azure AD token"""
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.side_effect = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
            
            response = client.get(
                "/api/protected",
                headers={"Authorization": "Bearer invalid-token"}
            )
            
            assert response.status_code == 401
            assert response.json()["detail"] == "Invalid token"
    
    @patch.dict(os.environ, {
        "AUTH_AZURE_AD_CLIENT_ID": "",
        "AUTH_AZURE_AD_CLIENT_SECRET": "",
        "AUTH_AZURE_AD_TENANT_ID": ""
    })
    def test_protected_endpoint_local_dev_mode(self, client):
        """Test protected endpoint in local development mode"""
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.has_azure_config', False):
            with patch('src.volatility_filter.auth.azure_auth.azure_auth_service._get_local_dev_user') as mock_local_user:
                mock_local_user.return_value = MOCK_LOCAL_DEV_USER
                
                response = client.get("/api/protected")
                
                assert response.status_code == 200
                data = response.json()
                assert data["user_id"] == MOCK_LOCAL_DEV_USER["id"]
                assert data["user_email"] == MOCK_LOCAL_DEV_USER["email"]
    
    @patch.dict(os.environ, {
        "AUTH_AZURE_AD_CLIENT_ID": "",
        "AUTH_AZURE_AD_CLIENT_SECRET": "",
        "AUTH_AZURE_AD_TENANT_ID": ""
    })
    def test_optional_auth_endpoint_without_token(self, client):
        """Test optional auth endpoint without token"""
        response = client.get("/api/optional-auth")
        
        assert response.status_code == 200
        assert response.json() == {"message": "anonymous access"}
    
    @patch.dict(os.environ, {
        "AUTH_AZURE_AD_CLIENT_ID": "test-client-id",
        "AUTH_AZURE_AD_CLIENT_SECRET": "test-secret",
        "AUTH_AZURE_AD_TENANT_ID": "test-tenant-id"
    })
    def test_optional_auth_endpoint_with_token(self, client):
        """Test optional auth endpoint with valid token"""
        valid_token = create_mock_jwt_token()
        
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = MOCK_AZURE_USER
            
            response = client.get(
                "/api/optional-auth",
                headers={"Authorization": f"Bearer {valid_token}"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "authenticated access"
            assert data["user_id"] == MOCK_AZURE_USER["id"]
    
    def test_role_based_access_admin_user(self, client):
        """Test role-based access with admin user"""
        admin_user = {**MOCK_AZURE_USER, "roles": ["Admin", "User"]}
        
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = admin_user
            
            response = client.get(
                "/api/admin",
                headers={"Authorization": "Bearer valid-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "admin access"
            assert data["user_id"] == admin_user["id"]
    
    def test_role_based_access_regular_user(self, client):
        """Test role-based access with regular user (should be denied)"""
        regular_user = {**MOCK_AZURE_USER, "roles": ["User"]}
        
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = regular_user
            
            response = client.get(
                "/api/admin",
                headers={"Authorization": "Bearer valid-token"}
            )
            
            assert response.status_code == 403
            assert "Insufficient permissions" in response.json()["detail"]
    
    def test_tenant_based_access_correct_tenant(self, client):
        """Test tenant-based access with correct tenant"""
        tenant_user = {**MOCK_AZURE_USER, "tenant_id": "test-tenant-id"}
        
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = tenant_user
            
            response = client.get(
                "/api/tenant-specific",
                headers={"Authorization": "Bearer valid-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "tenant access"
    
    def test_tenant_based_access_wrong_tenant(self, client):
        """Test tenant-based access with wrong tenant"""
        wrong_tenant_user = {**MOCK_AZURE_USER, "tenant_id": "wrong-tenant-id"}
        
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = wrong_tenant_user
            
            response = client.get(
                "/api/tenant-specific",
                headers={"Authorization": "Bearer valid-token"}
            )
            
            assert response.status_code == 403
            assert "Access denied for this tenant" in response.json()["detail"]


class TestFullApplicationFlow:
    """Test complete application authentication flow"""
    
    @pytest.fixture
    def full_app(self):
        """Create a more complete test application"""
        app = FastAPI(title="Elastics Terminal API")
        
        # Health endpoints (no auth required)
        @app.get("/api/health")
        async def health():
            return {"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}
        
        @app.get("/health")
        async def health_alt():
            return {"status": "healthy"}
        
        # User endpoints
        @app.get("/api/user/profile")
        async def get_user_profile(user: dict = Depends(get_current_user_dependency)):
            return {
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "roles": user.get("roles", []),
                    "tenant_id": user.get("tenant_id")
                }
            }
        
        @app.get("/api/user/settings")
        async def get_user_settings(user: dict = Depends(get_current_user_dependency)):
            return {
                "settings": {
                    "theme": "dark",
                    "notifications": True,
                    "language": "en"
                },
                "user_id": user["id"]
            }
        
        # Portfolio endpoints (role-based)
        @app.get("/api/portfolio")
        async def get_portfolio(user: dict = Depends(require_roles("User", "Admin"))):
            return {
                "portfolio": {
                    "total_value": 100000,
                    "positions": [],
                    "performance": {}
                },
                "user_id": user["id"]
            }
        
        @app.get("/api/admin/users")
        async def get_all_users(user: dict = Depends(require_roles("Admin"))):
            return {
                "users": [
                    {"id": "1", "name": "User 1", "email": "user1@example.com"},
                    {"id": "2", "name": "User 2", "email": "user2@example.com"}
                ],
                "admin_id": user["id"]
            }
        
        # Optional auth endpoint
        @app.get("/api/news")
        async def get_news(user: dict = Depends(get_optional_user)):
            news_items = [
                {"title": "Market Update", "content": "..."},
                {"title": "Economic News", "content": "..."}
            ]
            
            if user:
                # Add personalized news for authenticated users
                news_items.append({
                    "title": f"Hello {user['name']}, here's your personalized update",
                    "content": "..."
                })
            
            return {"news": news_items}
        
        # Add authentication middleware
        add_auth_middleware(app)
        
        return app
    
    @pytest.fixture
    def full_client(self, full_app):
        """Create test client for full app"""
        return TestClient(full_app)
    
    @pytest.mark.parametrize("endpoint", [
        "/api/health",
        "/health"
    ])
    def test_health_endpoints_no_auth(self, full_client, endpoint):
        """Test health endpoints don't require authentication"""
        response = full_client.get(endpoint)
        assert response.status_code == 200
        assert "status" in response.json()
    
    @patch.dict(os.environ, {
        "AUTH_AZURE_AD_CLIENT_ID": "test-client-id",
        "AUTH_AZURE_AD_CLIENT_SECRET": "test-secret", 
        "AUTH_AZURE_AD_TENANT_ID": "test-tenant-id"
    })
    def test_user_profile_authenticated(self, full_client):
        """Test user profile endpoint with authentication"""
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = MOCK_AZURE_USER
            
            response = full_client.get(
                "/api/user/profile",
                headers={"Authorization": "Bearer valid-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["user"]["id"] == MOCK_AZURE_USER["id"]
            assert data["user"]["email"] == MOCK_AZURE_USER["email"]
            assert data["user"]["roles"] == MOCK_AZURE_USER["roles"]
    
    @patch.dict(os.environ, {
        "AUTH_AZURE_AD_CLIENT_ID": "test-client-id",
        "AUTH_AZURE_AD_CLIENT_SECRET": "test-secret", 
        "AUTH_AZURE_AD_TENANT_ID": "test-tenant-id"
    })
    def test_user_profile_unauthenticated(self, full_client):
        """Test user profile endpoint without authentication"""
        response = full_client.get("/api/user/profile")
        
        assert response.status_code == 401
    
    def test_portfolio_with_user_role(self, full_client):
        """Test portfolio endpoint with User role"""
        user_with_role = {**MOCK_AZURE_USER, "roles": ["User"]}
        
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = user_with_role
            
            response = full_client.get(
                "/api/portfolio",
                headers={"Authorization": "Bearer valid-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "portfolio" in data
            assert data["user_id"] == user_with_role["id"]
    
    def test_portfolio_with_admin_role(self, full_client):
        """Test portfolio endpoint with Admin role"""
        admin_user = {**MOCK_AZURE_USER, "roles": ["Admin"]}
        
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = admin_user
            
            response = full_client.get(
                "/api/portfolio",
                headers={"Authorization": "Bearer valid-token"}
            )
            
            assert response.status_code == 200
    
    def test_admin_endpoint_access_denied(self, full_client):
        """Test admin endpoint denies access to regular users"""
        regular_user = {**MOCK_AZURE_USER, "roles": ["User"]}
        
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = regular_user
            
            response = full_client.get(
                "/api/admin/users",
                headers={"Authorization": "Bearer valid-token"}
            )
            
            assert response.status_code == 403
    
    def test_admin_endpoint_access_allowed(self, full_client):
        """Test admin endpoint allows access to admin users"""
        admin_user = {**MOCK_AZURE_USER, "roles": ["Admin"]}
        
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = admin_user
            
            response = full_client.get(
                "/api/admin/users",
                headers={"Authorization": "Bearer valid-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "users" in data
            assert data["admin_id"] == admin_user["id"]
    
    def test_news_endpoint_anonymous(self, full_client):
        """Test news endpoint for anonymous users"""
        response = full_client.get("/api/news")
        
        assert response.status_code == 200
        data = response.json()
        news_items = data["news"]
        assert len(news_items) == 2  # No personalized news
        assert all("Hello" not in item["title"] for item in news_items)
    
    def test_news_endpoint_authenticated(self, full_client):
        """Test news endpoint for authenticated users"""
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.return_value = MOCK_AZURE_USER
            
            response = full_client.get(
                "/api/news",
                headers={"Authorization": "Bearer valid-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            news_items = data["news"]
            assert len(news_items) == 3  # Includes personalized news
            personalized_item = news_items[-1]
            assert MOCK_AZURE_USER["name"] in personalized_item["title"]


class TestErrorScenarios:
    """Test various error scenarios in authentication flow"""
    
    @pytest.fixture
    def error_app(self):
        """Create app for testing error scenarios"""
        app = FastAPI()
        
        @app.get("/api/test")
        async def test_endpoint(user: dict = Depends(get_current_user_dependency)):
            return {"user_id": user["id"]}
        
        add_auth_middleware(app)
        return app
    
    @pytest.fixture
    def error_client(self, error_app):
        return TestClient(error_app)
    
    def test_malformed_authorization_header(self, error_client):
        """Test malformed authorization header"""
        response = error_client.get(
            "/api/test",
            headers={"Authorization": "Malformed header"}
        )
        
        assert response.status_code == 401
        assert "Invalid authorization header format" in response.json()["detail"]
    
    def test_missing_bearer_token(self, error_client):
        """Test missing bearer token"""
        response = error_client.get(
            "/api/test",
            headers={"Authorization": "Bearer"}
        )
        
        assert response.status_code == 401
    
    def test_expired_token(self, error_client):
        """Test expired token handling"""
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.side_effect = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
            
            response = error_client.get(
                "/api/test",
                headers={"Authorization": "Bearer expired-token"}
            )
            
            assert response.status_code == 401
            assert "Token has expired" in response.json()["detail"]
    
    def test_service_unavailable_error(self, error_client):
        """Test authentication service error"""
        with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
            mock_validate.side_effect = Exception("Service unavailable")
            
            response = error_client.get(
                "/api/test",
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 500
            assert "Authentication service error" in response.json()["detail"]


class TestConcurrencyAndPerformance:
    """Test concurrent requests and performance scenarios"""
    
    @pytest.fixture
    def perf_app(self):
        """Create app for performance testing"""
        app = FastAPI()
        
        @app.get("/api/fast")
        async def fast_endpoint(user: dict = Depends(get_current_user_dependency)):
            return {"user_id": user["id"], "timestamp": "now"}
        
        add_auth_middleware(app)
        return app
    
    @pytest.fixture
    def perf_client(self, perf_app):
        return TestClient(perf_app)
    
    def test_multiple_concurrent_requests(self, perf_client):
        """Test handling multiple concurrent authenticated requests"""
        import concurrent.futures
        import threading
        
        def make_request():
            with patch('src.volatility_filter.auth.azure_auth.azure_auth_service.validate_token') as mock_validate:
                mock_validate.return_value = MOCK_AZURE_USER
                
                response = perf_client.get(
                    "/api/fast",
                    headers={"Authorization": "Bearer valid-token"}
                )
                return response.status_code
        
        # Make 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # All requests should succeed
        assert all(status_code == 200 for status_code in results)
        assert len(results) == 10