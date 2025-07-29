"""
Tests for Azure AD authentication service
"""

import os
import time
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from fastapi import HTTPException, status
import jwt
from azure.core.exceptions import ClientAuthenticationError

from src.volatility_filter.auth.azure_auth import (
    AzureAuthService,
    get_current_user,
    azure_auth_service
)
from tests.fixtures.auth_fixtures import (
    MOCK_AZURE_TOKEN_PAYLOAD,
    MOCK_EXPIRED_TOKEN_PAYLOAD,
    MOCK_LOCAL_DEV_USER,
    MOCK_AZURE_USER,
    MOCK_GRAPH_API_USER,
    create_mock_jwt_token,
    AuthTestScenarios,
    mock_azure_env_vars,
    mock_local_dev_env_vars
)


class TestAzureAuthService:
    """Test cases for AzureAuthService class"""
    
    def test_init_with_azure_config(self, mock_azure_env_vars):
        """Test initialization with Azure AD configuration"""
        service = AzureAuthService()
        
        assert service.has_azure_config is True
        assert service.tenant_id == "test-client-id"
        assert service.client_id == "test-client-id" 
        assert service.client_secret == "test-client-secret"
        assert service.authority == "https://login.microsoftonline.com/test-client-id"
        assert service.jwks_uri.startswith("https://login.microsoftonline.com/")
        assert service.jwks_client is not None
        assert service.credential is not None
    
    def test_init_without_azure_config(self, mock_local_dev_env_vars):
        """Test initialization without Azure AD configuration (local dev mode)"""
        service = AzureAuthService()
        
        assert service.has_azure_config is False
        assert service.jwks_client is None
        assert service.credential is None
    
    @pytest.mark.asyncio
    async def test_validate_token_azure_mode_valid(self, mock_azure_env_vars):
        """Test token validation in Azure mode with valid token"""
        service = AzureAuthService()
        
        # Mock JWKS client and JWT validation
        mock_signing_key = Mock()
        mock_signing_key.key = "test-key"
        service.jwks_client = Mock()
        service.jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key
        
        valid_token = create_mock_jwt_token()
        
        with patch('jwt.decode') as mock_jwt_decode:
            mock_jwt_decode.return_value = MOCK_AZURE_TOKEN_PAYLOAD
            
            result = await service.validate_token(valid_token)
            
            assert result['id'] == 'test-user-id'
            assert result['email'] == 'test.user@example.com'
            assert result['name'] == 'Test User'
            assert result['tenant_id'] == 'test-tenant-id'
            assert result['roles'] == ['User', 'Admin']
            
            # Verify JWT decode was called with correct parameters
            mock_jwt_decode.assert_called_once_with(
                valid_token,
                "test-key",
                algorithms=["RS256"],
                audience=service.client_id,
                issuer=service.issuer,
                options={"verify_exp": True}
            )
    
    @pytest.mark.asyncio
    async def test_validate_token_local_dev_mode(self, mock_local_dev_env_vars):
        """Test token validation in local development mode"""
        service = AzureAuthService()
        
        result = await service.validate_token("any-token")
        
        assert result == MOCK_LOCAL_DEV_USER
        assert result['id'] == 'local-dev-user'
        assert result['email'] == 'wojciech@elastics.ai'
        assert result['name'] == 'Wojtek'
    
    @pytest.mark.asyncio
    async def test_validate_token_expired(self, mock_azure_env_vars):
        """Test token validation with expired token"""
        service = AzureAuthService()
        
        mock_signing_key = Mock()
        mock_signing_key.key = "test-key"
        service.jwks_client = Mock()
        service.jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key
        
        expired_token = create_mock_jwt_token()
        
        with patch('jwt.decode') as mock_jwt_decode:
            mock_jwt_decode.side_effect = jwt.ExpiredSignatureError("Token expired")
            
            with pytest.raises(HTTPException) as exc_info:
                await service.validate_token(expired_token)
            
            assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Token has expired" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_validate_token_invalid(self, mock_azure_env_vars):
        """Test token validation with invalid token"""
        service = AzureAuthService()
        
        mock_signing_key = Mock()
        mock_signing_key.key = "test-key"
        service.jwks_client = Mock()
        service.jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key
        
        invalid_token = "invalid.token.here"
        
        with patch('jwt.decode') as mock_jwt_decode:
            mock_jwt_decode.side_effect = jwt.InvalidTokenError("Invalid token")
            
            with pytest.raises(HTTPException) as exc_info:
                await service.validate_token(invalid_token)
            
            assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Invalid token" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_validate_token_general_exception(self, mock_azure_env_vars):
        """Test token validation with general exception"""
        service = AzureAuthService()
        
        service.jwks_client = Mock()
        service.jwks_client.get_signing_key_from_jwt.side_effect = Exception("Network error")
        
        test_token = create_mock_jwt_token()
        
        with pytest.raises(HTTPException) as exc_info:
            await service.validate_token(test_token)
        
        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "Authentication service error" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_user_info_from_graph_success(self, mock_azure_env_vars):
        """Test successful user info retrieval from Graph API"""
        service = AzureAuthService()
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = MOCK_GRAPH_API_USER
            mock_client.get.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            result = await service.get_user_info_from_graph("test-access-token")
            
            assert result == MOCK_GRAPH_API_USER
            mock_client.get.assert_called_once_with(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": "Bearer test-access-token"}
            )
    
    @pytest.mark.asyncio
    async def test_get_user_info_from_graph_failure(self, mock_azure_env_vars):
        """Test failed user info retrieval from Graph API"""
        service = AzureAuthService()
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_response = Mock()
            mock_response.status_code = 401
            mock_client.get.return_value = mock_response
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            result = await service.get_user_info_from_graph("invalid-token")
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_get_user_info_from_graph_local_dev(self, mock_local_dev_env_vars):
        """Test Graph API call in local development mode"""
        service = AzureAuthService()
        
        result = await service.get_user_info_from_graph("any-token")
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_verify_azure_cli_auth_success(self, mock_azure_env_vars):
        """Test successful Azure CLI authentication verification"""
        service = AzureAuthService()
        
        mock_token = Mock()
        mock_token.token = "valid-cli-token"
        service.credential = Mock()
        service.credential.get_token.return_value = mock_token
        
        result = await service.verify_azure_cli_auth()
        
        assert result is True
        service.credential.get_token.assert_called_once_with(
            "https://management.azure.com/.default"
        )
    
    @pytest.mark.asyncio
    async def test_verify_azure_cli_auth_failure(self, mock_azure_env_vars):
        """Test failed Azure CLI authentication verification"""
        service = AzureAuthService()
        
        service.credential = Mock()
        service.credential.get_token.side_effect = ClientAuthenticationError("Not authenticated")
        
        result = await service.verify_azure_cli_auth()
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_verify_azure_cli_auth_no_credential(self, mock_local_dev_env_vars):
        """Test Azure CLI auth verification without credentials"""
        service = AzureAuthService()
        
        result = await service.verify_azure_cli_auth()
        
        assert result is False
    
    def test_extract_token_from_header_valid(self):
        """Test extracting token from valid Authorization header"""
        service = AzureAuthService()
        
        result = service.extract_token_from_header("Bearer test-token-123")
        
        assert result == "test-token-123"
    
    def test_extract_token_from_header_invalid_format(self):
        """Test extracting token from invalid Authorization header"""
        service = AzureAuthService()
        
        # Test various invalid formats
        assert service.extract_token_from_header("Token test-token") is None
        assert service.extract_token_from_header("Bearer") is None
        assert service.extract_token_from_header("bearer test-token") is None  # case sensitive
        assert service.extract_token_from_header("") is None
        assert service.extract_token_from_header(None) is None
    
    def test_get_local_dev_user(self):
        """Test getting local development user"""
        service = AzureAuthService()
        
        result = service._get_local_dev_user()
        
        assert result == MOCK_LOCAL_DEV_USER
        assert result['id'] == 'local-dev-user'
        assert result['email'] == 'wojciech@elastics.ai'
        assert result['roles'] == ['admin']


class TestGetCurrentUser:
    """Test cases for get_current_user function"""
    
    @pytest.mark.asyncio
    async def test_get_current_user_with_valid_token(self, mock_azure_env_vars):
        """Test get_current_user with valid authorization header"""
        valid_token = create_mock_jwt_token()
        authorization = f"Bearer {valid_token}"
        
        with patch.object(azure_auth_service, 'validate_token') as mock_validate:
            mock_validate.return_value = MOCK_AZURE_USER
            
            result = await get_current_user(authorization)
            
            assert result == MOCK_AZURE_USER
            mock_validate.assert_called_once_with(valid_token)
    
    @pytest.mark.asyncio
    async def test_get_current_user_no_header_azure_mode(self, mock_azure_env_vars):
        """Test get_current_user without authorization header in Azure mode"""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(None)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Authorization header required" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_current_user_no_header_local_dev(self, mock_local_dev_env_vars):
        """Test get_current_user without authorization header in local dev mode"""
        result = await get_current_user(None)
        
        assert result == MOCK_LOCAL_DEV_USER
    
    @pytest.mark.asyncio
    async def test_get_current_user_invalid_header_format(self, mock_azure_env_vars):
        """Test get_current_user with invalid authorization header format"""
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user("Invalid header format")
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Invalid authorization header format" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_current_user_token_validation_error(self, mock_azure_env_vars):
        """Test get_current_user when token validation fails"""
        authorization = "Bearer invalid-token"
        
        with patch.object(azure_auth_service, 'validate_token') as mock_validate:
            mock_validate.side_effect = HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
            
            with pytest.raises(HTTPException) as exc_info:
                await get_current_user(authorization)
            
            assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
            assert "Invalid token" in str(exc_info.value.detail)


class TestAuthTestScenarios:
    """Test the authentication test scenarios"""
    
    @pytest.mark.asyncio
    async def test_valid_azure_auth_scenario(self):
        """Test valid Azure authentication scenario"""
        scenario = AuthTestScenarios.valid_azure_auth()
        
        # Mock environment
        with patch.dict(os.environ, scenario['env_vars']):
            service = AzureAuthService()
            
            # Mock JWT validation
            mock_signing_key = Mock()
            mock_signing_key.key = "test-key"
            service.jwks_client = Mock()
            service.jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key
            
            with patch('jwt.decode') as mock_jwt_decode:
                mock_jwt_decode.return_value = MOCK_AZURE_TOKEN_PAYLOAD
                
                result = await service.validate_token(scenario['token'])
                
                assert result['id'] == scenario['expected_user']['id']
                assert result['email'] == scenario['expected_user']['email']
    
    @pytest.mark.asyncio 
    async def test_local_dev_auth_scenario(self):
        """Test local development authentication scenario"""
        scenario = AuthTestScenarios.local_dev_auth()
        
        # Mock environment
        with patch.dict(os.environ, scenario['env_vars']):
            service = AzureAuthService()
            
            result = await service.validate_token("any-token")
            
            assert result == scenario['expected_user']
    
    @pytest.mark.asyncio
    async def test_expired_token_scenario(self):
        """Test expired token scenario"""
        scenario = AuthTestScenarios.expired_token()
        
        # Mock environment
        with patch.dict(os.environ, scenario['env_vars']):
            service = AzureAuthService()
            
            mock_signing_key = Mock()
            mock_signing_key.key = "test-key"
            service.jwks_client = Mock()
            service.jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key
            
            with patch('jwt.decode') as mock_jwt_decode:
                mock_jwt_decode.side_effect = jwt.ExpiredSignatureError("Token expired")
                
                with pytest.raises(HTTPException) as exc_info:
                    await service.validate_token(scenario['token'])
                
                assert exc_info.value.status_code == scenario['expected_status']
                assert scenario['expected_error'] in str(exc_info.value.detail)


class TestEdgeCases:
    """Test edge cases and error conditions"""
    
    @pytest.mark.asyncio
    async def test_malformed_token_payload(self, mock_azure_env_vars):
        """Test handling of malformed token payload"""
        service = AzureAuthService()
        
        mock_signing_key = Mock()
        mock_signing_key.key = "test-key"
        service.jwks_client = Mock()
        service.jwks_client.get_signing_key_from_jwt.return_value = mock_signing_key
        
        # Token payload missing required fields
        malformed_payload = {"iss": "wrong-issuer"}
        
        with patch('jwt.decode') as mock_jwt_decode:
            mock_jwt_decode.return_value = malformed_payload
            
            result = await service.validate_token("test-token")
            
            # Should handle missing fields gracefully
            assert result['id'] is None
            assert result['email'] is None
            assert result['name'] is None
    
    @pytest.mark.asyncio
    async def test_network_timeout_graph_api(self, mock_azure_env_vars):
        """Test handling of network timeouts in Graph API calls"""
        service = AzureAuthService()
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.get.side_effect = Exception("Network timeout")
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            result = await service.get_user_info_from_graph("test-token")
            
            assert result is None
    
    def test_azure_credential_initialization_failure(self, mock_azure_env_vars):
        """Test handling of Azure credential initialization failure"""
        with patch('src.volatility_filter.auth.azure_auth.ClientSecretCredential') as mock_cred:
            mock_cred.side_effect = Exception("Credential init failed")
            
            # Should not raise exception during initialization
            service = AzureAuthService()
            
            assert service.credential is None