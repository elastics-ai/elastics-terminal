"""
Azure AD Authentication Service for FastAPI Backend

This module provides Azure Active Directory authentication capabilities for the
FastAPI backend, including JWT token validation and user information extraction.
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import jwt
from jwt import PyJWKClient
from azure.identity import DefaultAzureCredential, ClientSecretCredential
from azure.core.exceptions import ClientAuthenticationError
import httpx
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)


class AzureAuthService:
    """Azure AD authentication service for validating JWT tokens"""
    
    def __init__(self):
        # Azure AD configuration
        self.tenant_id = os.getenv("AUTH_AZURE_AD_TENANT_ID")
        self.client_id = os.getenv("AUTH_AZURE_AD_CLIENT_ID")
        self.client_secret = os.getenv("AUTH_AZURE_AD_CLIENT_SECRET")
        
        # Check if Azure AD configuration is available
        self.has_azure_config = bool(
            self.tenant_id and self.client_id and self.client_secret
        )
        
        if self.has_azure_config:
            # Azure AD endpoints
            self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
            self.jwks_uri = f"https://login.microsoftonline.com/{self.tenant_id}/discovery/v2.0/keys"
            self.issuer = f"https://login.microsoftonline.com/{self.tenant_id}/v2.0"
            
            # Initialize JWT client for key validation
            self.jwks_client = PyJWKClient(self.jwks_uri)
            
            # Azure credential for CLI integration
            try:
                if self.client_secret:
                    self.credential = ClientSecretCredential(
                        tenant_id=self.tenant_id,
                        client_id=self.client_id,
                        client_secret=self.client_secret
                    )
                else:
                    self.credential = DefaultAzureCredential()
            except Exception as e:
                logger.warning(f"Failed to initialize Azure credentials: {e}")
                self.credential = None
        else:
            logger.info("Azure AD configuration not found, using local development mode")
            self.jwks_client = None
            self.credential = None
    
    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate an Azure AD JWT token and return user information
        
        Args:
            token: JWT token from Azure AD
            
        Returns:
            User information dict if valid, None if invalid
        """
        if not self.has_azure_config:
            # For local development, accept any token and return default user
            return self._get_local_dev_user()
        
        try:
            # Get signing key from Azure AD
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            
            # Decode and validate the token
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.client_id,
                issuer=self.issuer,
                options={"verify_exp": True}
            )
            
            # Extract user information
            user_info = {
                "id": payload.get("sub") or payload.get("oid"),
                "email": payload.get("email") or payload.get("upn") or payload.get("preferred_username"),
                "name": payload.get("name"),
                "tenant_id": payload.get("tid"),
                "roles": payload.get("roles", []),
                "groups": payload.get("groups", []),
                "upn": payload.get("upn"),
                "expires_at": payload.get("exp"),
                "issued_at": payload.get("iat"),
                "raw_token": payload
            }
            
            logger.info(f"Successfully validated token for user: {user_info.get('email')}")
            return user_info
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication service error"
            )
    
    def _get_local_dev_user(self) -> Dict[str, Any]:
        """Return default user information for local development"""
        return {
            "id": "local-dev-user",
            "email": "wojciech@elastics.ai",
            "name": "Wojtek",
            "tenant_id": "local-dev",
            "roles": ["admin"],
            "groups": [],
            "upn": "wojciech@elastics.ai",
            "expires_at": None,
            "issued_at": int(datetime.now(timezone.utc).timestamp()),
            "raw_token": {}
        }
    
    async def get_user_info_from_graph(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        Get additional user information from Microsoft Graph API
        
        Args:
            access_token: Access token for Microsoft Graph
            
        Returns:
            Extended user information from Graph API
        """
        if not self.has_azure_config:
            return None
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://graph.microsoft.com/v1.0/me",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                
                if response.status_code == 200:
                    return response.json()
                else:
                    logger.warning(f"Failed to get user info from Graph API: {response.status_code}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching user info from Graph API: {e}")
            return None
    
    async def verify_azure_cli_auth(self) -> bool:
        """
        Verify Azure CLI authentication status
        
        Returns:
            True if Azure CLI is authenticated, False otherwise
        """
        if not self.credential:
            return False
        
        try:
            # Try to get a token to verify authentication
            token = self.credential.get_token("https://management.azure.com/.default")
            return bool(token and token.token)
        except ClientAuthenticationError:
            logger.warning("Azure CLI not authenticated")
            return False
        except Exception as e:
            logger.error(f"Error checking Azure CLI auth: {e}")
            return False
    
    def extract_token_from_header(self, authorization_header: Optional[str]) -> Optional[str]:
        """
        Extract JWT token from Authorization header
        
        Args:
            authorization_header: Authorization header value
            
        Returns:
            JWT token string or None
        """
        if not authorization_header:
            return None
        
        parts = authorization_header.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]
        
        return None


# Global instance
azure_auth_service = AzureAuthService()


async def get_current_user(authorization: Optional[str] = None) -> Dict[str, Any]:
    """
    Get current user information from JWT token
    
    Args:
        authorization: Authorization header value
        
    Returns:
        User information dictionary
        
    Raises:
        HTTPException: If authentication fails
    """
    if not authorization:
        if not azure_auth_service.has_azure_config:
            # Return default user for local development
            return azure_auth_service._get_local_dev_user()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required"
        )
    
    token = azure_auth_service.extract_token_from_header(authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format"
        )
    
    return await azure_auth_service.validate_token(token)