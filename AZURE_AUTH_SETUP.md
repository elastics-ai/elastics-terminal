# Azure Authentication Setup Guide

This guide explains how to set up Azure AD authentication for the Elastics Terminal application.

## Overview

The application now supports two authentication modes:

1. **Local Development Mode**: Uses default user (wojciech@elastics.ai) for development
2. **Azure AD Mode**: Enterprise-grade authentication with Azure Active Directory

## Quick Start (Local Development)

For local development, no Azure configuration is needed:

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Start the application:
   ```bash
   cd volatility-web
   npm install
   npm run dev
   ```

3. Access the application at `http://localhost:3000`
4. Use `wojciech@elastics.ai` or `wojtek@elastics.ai` with any password to sign in

## Azure AD Production Setup

### Step 1: Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**

Configure the app:
- **Name**: `Elastics Terminal`
- **Supported account types**: `Accounts in this organizational directory only`
- **Redirect URI**: 
  - Type: `Web`
  - URL: `https://yourdomain.com/api/auth/callback/azure-ad`

### Step 2: Configure Authentication

In your app registration:

1. Go to **Authentication**
2. Add redirect URIs:
   - `https://yourdomain.com/api/auth/callback/azure-ad`
   - `http://localhost:3000/api/auth/callback/azure-ad` (for testing)

3. Under **Implicit grant and hybrid flows**, enable:
   - ✅ ID tokens (used for implicit and hybrid flows)

### Step 3: Generate Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Set description: `Elastics Terminal Secret`
4. Set expiration: `24 months` (recommended)
5. **Copy the secret value immediately** - you won't see it again!

### Step 4: Configure API Permissions (Optional)

For enhanced features, add these permissions:

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Add these **Delegated permissions**:
   - `User.Read` (basic profile)
   - `User.ReadBasic.All` (to read user info)

5. Click **Grant admin consent** for your organization

### Step 5: Update Environment Variables

Update your `.env` file:

```bash
# Azure AD Configuration
AUTH_AZURE_AD_CLIENT_ID=your-application-client-id
AUTH_AZURE_AD_CLIENT_SECRET=your-client-secret-value
AUTH_AZURE_AD_TENANT_ID=your-tenant-id

# NextAuth Configuration
NEXTAUTH_SECRET=your-secure-random-secret-key
NEXTAUTH_URL=https://yourdomain.com

# Enable Azure AD in frontend
NEXT_PUBLIC_AZURE_AD_ENABLED=true
```

### Step 6: Generate NextAuth Secret

Generate a secure secret for NextAuth:

```bash
openssl rand -base64 32
```

### Step 7: Deploy and Test

1. Deploy your application
2. Navigate to your domain
3. Click "Sign in with Microsoft"
4. Complete the Azure AD authentication flow

## Configuration Details

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_AZURE_AD_CLIENT_ID` | Azure AD Application (Client) ID | Production |
| `AUTH_AZURE_AD_CLIENT_SECRET` | Azure AD Client Secret | Production |
| `AUTH_AZURE_AD_TENANT_ID` | Azure AD Tenant ID | Production |
| `NEXTAUTH_SECRET` | Secret for NextAuth.js JWT signing | Always |
| `NEXTAUTH_URL` | Base URL of your application | Always |
| `NEXT_PUBLIC_AZURE_AD_ENABLED` | Enable Azure AD in frontend | Optional |

### Authentication Flow

1. **Local Development**:
   - No Azure AD configuration needed
   - Uses credentials provider with hardcoded user
   - Any password works for development user

2. **Azure AD Production**:
   - Full OAuth 2.0 / OpenID Connect flow
   - JWT token validation
   - User information from Azure AD
   - Role and group support

### User Information

The authentication system provides:

```typescript
{
  id: string,           // User's unique identifier
  email: string,        // User's email address
  name: string,         // User's display name
  image?: string,       // User's profile picture
  tenant_id: string,    // Azure AD tenant ID
  roles: string[],      // Azure AD roles
  groups: string[],     // Azure AD groups
  upn: string          // User Principal Name
}
```

## Backend API Integration

The FastAPI backend automatically validates JWT tokens and provides user information:

```python
from volatility_filter.auth import get_current_user_dependency

@app.get("/api/protected")
async def protected_route(user: dict = Depends(get_current_user_dependency)):
    return {"message": f"Hello {user['name']}!"}
```

## Troubleshooting

### Common Issues

1. **"Configuration error"**
   - Check that all environment variables are set correctly
   - Verify Azure AD app registration settings

2. **"Access denied"**
   - User may not have access to the application
   - Check Azure AD user assignment requirements

3. **Redirect URI mismatch**
   - Ensure redirect URIs in Azure AD match your application URLs
   - Check for HTTP vs HTTPS mismatches

4. **Token validation errors**
   - Verify tenant ID is correct
   - Check that client ID matches the Azure AD app

### Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Authentication | Local credentials | Azure AD |
| User | wojciech@elastics.ai | Real Azure AD users |
| Security | Minimal | Enterprise-grade |
| Setup | No configuration | Azure AD setup required |

## Security Considerations

- Always use HTTPS in production
- Keep client secrets secure and rotate regularly
- Use the principle of least privilege for API permissions
- Monitor authentication logs through Azure AD
- Set appropriate token expiration times

## MCP Integration

The authentication system integrates with Azure MCP for enhanced capabilities:

- Azure CLI authentication status checking
- Microsoft Graph API integration
- Azure resource access with proper credentials
- Seamless SSO experience across Azure services

For questions or support, contact: support@elastics.ai