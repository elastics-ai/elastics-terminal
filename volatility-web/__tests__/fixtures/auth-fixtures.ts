/**
 * Test fixtures and mock data for authentication testing
 */

import { Session } from "next-auth"
import { JWT } from "next-auth/jwt"

// Mock Azure AD JWT token payload
export const mockAzureTokenPayload = {
  aud: "test-client-id",
  iss: "https://login.microsoftonline.com/test-tenant-id/v2.0",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  sub: "test-user-id",
  oid: "test-object-id",
  tid: "test-tenant-id",
  name: "Test User",
  email: "test.user@example.com",
  upn: "test.user@example.com",
  preferred_username: "test.user@example.com",
  roles: ["User", "Admin"],
  groups: ["group-1", "group-2"]
}

// Mock expired token payload
export const mockExpiredTokenPayload = {
  ...mockAzureTokenPayload,
  iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
  exp: Math.floor(Date.now() / 1000) - 3600  // 1 hour ago (expired)
}

// Mock local development user
export const mockLocalDevUser = {
  id: "local-dev-user",
  name: "Wojtek",
  email: "wojciech@elastics.ai",
  image: null
}

// Mock Azure AD user
export const mockAzureUser = {
  id: "test-user-id",
  name: "Test User",
  email: "test.user@example.com",
  image: "https://example.com/avatar.jpg"
}

// Mock NextAuth session for local development
export const mockLocalDevSession: Session = {
  user: mockLocalDevUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  accessToken: undefined,
  idToken: undefined,
  refreshToken: undefined,
  expiresAt: undefined
}

// Mock NextAuth session for Azure AD
export const mockAzureSession: Session = {
  user: mockAzureUser,
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  accessToken: "mock-access-token",
  idToken: "mock-id-token",
  refreshToken: "mock-refresh-token",
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  tenantId: "test-tenant-id"
}

// Mock JWT token for NextAuth
export const mockJWT: JWT = {
  sub: "test-user-id",
  name: "Test User",
  email: "test.user@example.com",
  picture: "https://example.com/avatar.jpg",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  jti: "test-jwt-id",
  accessToken: "mock-access-token",
  idToken: "mock-id-token",
  refreshToken: "mock-refresh-token",
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  profile: mockAzureTokenPayload
}

// Mock environment variables for testing
export const mockEnvVars = {
  // Azure AD configuration
  AUTH_AZURE_AD_CLIENT_ID: "test-client-id",
  AUTH_AZURE_AD_CLIENT_SECRET: "test-client-secret",
  AUTH_AZURE_AD_TENANT_ID: "test-tenant-id",
  
  // NextAuth configuration
  NEXTAUTH_SECRET: "test-secret",
  NEXTAUTH_URL: "http://localhost:3000",
  
  // Frontend configuration
  NEXT_PUBLIC_AZURE_AD_ENABLED: "true"
}

// Mock environment variables for local development
export const mockLocalDevEnvVars = {
  NEXTAUTH_SECRET: "test-secret",
  NEXTAUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_AZURE_AD_ENABLED: "false"
}

// Mock Microsoft Graph API user response
export const mockGraphApiUser = {
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users/$entity",
  id: "test-user-id",
  businessPhones: ["+1 425 555 0109"],
  displayName: "Test User",
  givenName: "Test",
  surname: "User",
  jobTitle: "Software Engineer",
  mail: "test.user@example.com",
  mobilePhone: null,
  officeLocation: "Seattle",
  preferredLanguage: "English",
  userPrincipalName: "test.user@example.com"
}

// Mock authentication errors
export const mockAuthErrors = {
  Configuration: "Configuration",
  AccessDenied: "AccessDenied", 
  Verification: "Verification",
  OAuthSignin: "OAuthSignin",
  OAuthCallback: "OAuthCallback",
  OAuthCreateAccount: "OAuthCreateAccount",
  EmailCreateAccount: "EmailCreateAccount",
  Callback: "Callback",
  OAuthAccountNotLinked: "OAuthAccountNotLinked",
  EmailSignin: "EmailSignin",
  CredentialsSignin: "CredentialsSignin",
  SessionRequired: "SessionRequired",
  Default: "Default"
}

// Mock sign-in providers
export const mockProviders = {
  "azure-ad": {
    id: "azure-ad",
    name: "Azure Active Directory",
    type: "oauth",
    signinUrl: "http://localhost:3000/api/auth/signin/azure-ad",
    callbackUrl: "http://localhost:3000/api/auth/callback/azure-ad"
  },
  "local-dev": {
    id: "local-dev", 
    name: "Local Development",
    type: "credentials",
    signinUrl: "http://localhost:3000/api/auth/signin/local-dev",
    callbackUrl: "http://localhost:3000/api/auth/callback/local-dev"
  }
}

// Mock CSRF token
export const mockCSRFToken = "test-csrf-token"

// Valid JWT token for testing (base64 encoded)
export const createMockJWTToken = (payload: any = mockAzureTokenPayload): string => {
  const header = { alg: "RS256", typ: "JWT" }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = "mock-signature"
  
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

// Mock authorization headers
export const mockAuthHeaders = {
  validBearer: `Bearer ${createMockJWTToken()}`,
  invalidBearer: "Bearer invalid-token",
  malformedBearer: "Bearer",
  noBearer: "Token invalid-format",
  empty: ""
}

// Mock request objects for middleware testing
export const createMockRequest = (path: string, headers: Record<string, string> = {}) => ({
  url: { pathname: path },
  headers: new Map(Object.entries(headers)),
  nextUrl: { pathname: path }
})

// Mock response objects
export const createMockResponse = () => ({
  status: 200,
  headers: new Map(),
  json: jest.fn(),
  redirect: jest.fn()
})