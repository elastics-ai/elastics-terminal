"""
Azure AD Authentication Module

This module provides Azure Active Directory authentication capabilities
for the Elastics Terminal backend services.
"""

from .azure_auth import (
    AzureAuthService,
    azure_auth_service,
    get_current_user
)

from .middleware import (
    AuthenticationMiddleware,
    get_current_user_dependency,
    get_optional_user,
    require_roles,
    require_tenant,
    add_auth_middleware
)

__all__ = [
    "AzureAuthService",
    "azure_auth_service", 
    "get_current_user",
    "AuthenticationMiddleware",
    "get_current_user_dependency",
    "get_optional_user", 
    "require_roles",
    "require_tenant",
    "add_auth_middleware"
]