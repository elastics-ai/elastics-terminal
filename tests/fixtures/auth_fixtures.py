"""
Test fixtures and mock data for backend authentication testing
"""

import time
import json
from typing import Dict, Any, Optional
from unittest.mock import Mock, AsyncMock
import pytest
from fastapi import Request
from fastapi.security import HTTPAuthorizationCredentials


# Mock Azure AD token payloads
MOCK_AZURE_TOKEN_PAYLOAD = {
    "aud": "test-client-id",
    "iss": "https://login.microsoftonline.com/test-tenant-id/v2.0",
    "iat": int(time.time()),
    "exp": int(time.time()) + 3600,  # 1 hour from now
    "sub": "test-user-id",
    "oid": "test-object-id", 
    "tid": "test-tenant-id",
    "name": "Test User",
    "email": "test.user@example.com",
    "upn": "test.user@example.com",
    "preferred_username": "test.user@example.com",
    "roles": ["User", "Admin"],
    "groups": ["group-1", "group-2"]
}

MOCK_EXPIRED_TOKEN_PAYLOAD = {
    **MOCK_AZURE_TOKEN_PAYLOAD,
    "iat": int(time.time()) - 7200,  # 2 hours ago
    "exp": int(time.time()) - 3600   # 1 hour ago (expired)
}

MOCK_LOCAL_DEV_USER = {
    "id": "local-dev-user",
    "email": "wojciech@elastics.ai",
    "name": "Wojtek",
    "tenant_id": "local-dev",
    "roles": ["admin"],
    "groups": [],
    "upn": "wojciech@elastics.ai",
    "expires_at": None,
    "issued_at": int(time.time()),
    "raw_token": {}
}

MOCK_AZURE_USER = {
    "id": "test-user-id",
    "email": "test.user@example.com",
    "name": "Test User",
    "tenant_id": "test-tenant-id",
    "roles": ["User", "Admin"],
    "groups": ["group-1", "group-2"],
    "upn": "test.user@example.com",
    "expires_at": int(time.time()) + 3600,
    "issued_at": int(time.time()),
    "raw_token": MOCK_AZURE_TOKEN_PAYLOAD
}

# Mock environment variables
MOCK_AZURE_ENV_VARS = {
    "AUTH_AZURE_AD_CLIENT_ID": "test-client-id",
    "AUTH_AZURE_AD_CLIENT_SECRET": "test-client-secret",
    "AUTH_AZURE_AD_TENANT_ID": "test-tenant-id"
}

MOCK_LOCAL_DEV_ENV_VARS = {
    "AUTH_AZURE_AD_CLIENT_ID": "",
    "AUTH_AZURE_AD_CLIENT_SECRET": "",
    "AUTH_AZURE_AD_TENANT_ID": ""
}

# Mock Microsoft Graph API response
MOCK_GRAPH_API_USER = {
    "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users/$entity",
    "id": "test-user-id",
    "businessPhones": ["+1 425 555 0109"],
    "displayName": "Test User",
    "givenName": "Test",
    "surname": "User",
    "jobTitle": "Software Engineer",
    "mail": "test.user@example.com",
    "mobilePhone": None,
    "officeLocation": "Seattle",
    "preferredLanguage": "English",
    "userPrincipalName": "test.user@example.com"
}


def create_mock_jwt_token(payload: Optional[Dict[str, Any]] = None) -> str:
    """Create a mock JWT token for testing"""
    import base64
    
    if payload is None:
        payload = MOCK_AZURE_TOKEN_PAYLOAD
    
    header = {"alg": "RS256", "typ": "JWT"}
    
    # Encode header and payload
    encoded_header = base64.urlsafe_b64encode(
        json.dumps(header).encode()
    ).decode().rstrip('=')
    
    encoded_payload = base64.urlsafe_b64encode(
        json.dumps(payload).encode()
    ).decode().rstrip('=')
    
    signature = "mock-signature"
    
    return f"{encoded_header}.{encoded_payload}.{signature}"


def create_mock_request(
    path: str = "/",
    headers: Optional[Dict[str, str]] = None,
    user: Optional[Dict[str, Any]] = None
) -> Mock:
    """Create a mock FastAPI Request object"""
    request = Mock(spec=Request)
    request.url.path = path
    request.headers = headers or {}
    request.state = Mock()
    
    if user:
        request.state.user = user
        request.state.authenticated = True
    else:
        request.state.user = None
        request.state.authenticated = False
    
    return request


def create_mock_credentials(token: str) -> HTTPAuthorizationCredentials:
    """Create mock HTTP authorization credentials"""
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


@pytest.fixture
def mock_azure_env_vars(monkeypatch):
    """Fixture to set Azure environment variables"""
    for key, value in MOCK_AZURE_ENV_VARS.items():
        monkeypatch.setenv(key, value)


@pytest.fixture
def mock_local_dev_env_vars(monkeypatch):
    """Fixture to set local development environment variables"""
    for key, value in MOCK_LOCAL_DEV_ENV_VARS.items():
        monkeypatch.setenv(key, value)


@pytest.fixture
def mock_jwt_token():
    """Fixture providing a valid mock JWT token"""
    return create_mock_jwt_token()


@pytest.fixture
def mock_expired_jwt_token():
    """Fixture providing an expired mock JWT token"""
    return create_mock_jwt_token(MOCK_EXPIRED_TOKEN_PAYLOAD)


@pytest.fixture
def mock_azure_user():
    """Fixture providing mock Azure user data"""
    return MOCK_AZURE_USER.copy()


@pytest.fixture
def mock_local_dev_user():
    """Fixture providing mock local development user data"""
    return MOCK_LOCAL_DEV_USER.copy()


@pytest.fixture
def mock_httpx_client():
    """Fixture providing a mock httpx client for Graph API calls"""
    client = AsyncMock()
    
    # Mock successful Graph API response
    response = Mock()
    response.status_code = 200
    response.json.return_value = MOCK_GRAPH_API_USER
    client.get.return_value = response
    
    return client


@pytest.fixture
def mock_failed_httpx_client():
    """Fixture providing a mock httpx client that fails"""
    client = AsyncMock()
    
    # Mock failed Graph API response
    response = Mock()
    response.status_code = 401
    client.get.return_value = response
    
    return client


@pytest.fixture
def mock_azure_credential():
    """Fixture providing a mock Azure credential"""
    credential = Mock()
    
    # Mock successful token retrieval
    token = Mock()
    token.token = "mock-azure-cli-token"
    credential.get_token.return_value = token
    
    return credential


@pytest.fixture
def mock_failed_azure_credential():
    """Fixture providing a mock Azure credential that fails"""
    from azure.core.exceptions import ClientAuthenticationError
    
    credential = Mock()
    credential.get_token.side_effect = ClientAuthenticationError("Not authenticated")
    
    return credential


# Mock JWT signing keys for validation
MOCK_JWT_SIGNING_KEY = Mock()
MOCK_JWT_SIGNING_KEY.key = "mock-signing-key"


@pytest.fixture
def mock_jwks_client():
    """Fixture providing a mock JWKS client"""
    client = Mock()
    client.get_signing_key_from_jwt.return_value = MOCK_JWT_SIGNING_KEY
    return client


@pytest.fixture
def mock_failed_jwks_client():
    """Fixture providing a mock JWKS client that fails"""
    import jwt
    
    client = Mock()
    client.get_signing_key_from_jwt.side_effect = jwt.InvalidTokenError("Invalid token")
    return client


# Common test scenarios
class AuthTestScenarios:
    """Common authentication test scenarios"""
    
    @staticmethod
    def valid_azure_auth():
        """Scenario: Valid Azure AD authentication"""
        return {
            "env_vars": MOCK_AZURE_ENV_VARS,
            "token": create_mock_jwt_token(),
            "expected_user": MOCK_AZURE_USER,
            "expected_authenticated": True
        }
    
    @staticmethod
    def local_dev_auth():
        """Scenario: Local development authentication"""
        return {
            "env_vars": MOCK_LOCAL_DEV_ENV_VARS,
            "token": None,
            "expected_user": MOCK_LOCAL_DEV_USER,
            "expected_authenticated": True
        }
    
    @staticmethod
    def expired_token():
        """Scenario: Expired token"""
        return {
            "env_vars": MOCK_AZURE_ENV_VARS,
            "token": create_mock_jwt_token(MOCK_EXPIRED_TOKEN_PAYLOAD),
            "expected_error": "Token has expired",
            "expected_status": 401
        }
    
    @staticmethod
    def invalid_token():
        """Scenario: Invalid token"""
        return {
            "env_vars": MOCK_AZURE_ENV_VARS,
            "token": "invalid-token",
            "expected_error": "Invalid token",
            "expected_status": 401
        }
    
    @staticmethod
    def missing_token():
        """Scenario: Missing token in Azure mode"""
        return {
            "env_vars": MOCK_AZURE_ENV_VARS,
            "token": None,
            "expected_error": "Authorization header required",
            "expected_status": 401
        }


# Paths that should be accessible without authentication
UNPROTECTED_PATHS = [
    "/api/health",
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/favicon.ico",
    "/_next/static/test.js",
    "/static/test.css"
]

# Paths that should require authentication
PROTECTED_PATHS = [
    "/",
    "/api/protected",
    "/api/users",
    "/dashboard",
    "/settings"
]