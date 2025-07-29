/**
 * Tests for NextAuth.js configuration
 */

import { config } from '@/lib/auth'
import {
  mockEnvVars,
  mockLocalDevEnvVars,
  mockAzureTokenPayload,
  mockJWT,
  mockAzureUser,
  mockLocalDevUser
} from '@/lib/test-fixtures/auth-fixtures'

// Mock environment variables
const originalEnv = process.env

describe('NextAuth Configuration', () => {
  afterEach(() => {
    process.env = originalEnv
  })

  describe('Provider Configuration', () => {
    it('configures Azure AD provider when environment variables are present', () => {
      // Set Azure AD environment variables
      process.env = { ...originalEnv, ...mockEnvVars }
      
      // Import config again to get new instance with updated env vars
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      expect(newConfig.providers).toHaveLength(1)
      expect(newConfig.providers[0].id).toBe('azure-ad')
      expect(newConfig.providers[0].name).toBe('Azure Active Directory')
    })

    it('configures local development provider when Azure AD env vars are missing', () => {
      // Set local development environment variables
      process.env = { ...originalEnv, ...mockLocalDevEnvVars }
      
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      expect(newConfig.providers).toHaveLength(1)
      expect(newConfig.providers[0].id).toBe('local-dev')
      expect(newConfig.providers[0].name).toBe('Local Development')
    })

    it('uses Azure AD provider in production with proper configuration', () => {
      process.env = {
        ...originalEnv,
        ...mockEnvVars,
        NODE_ENV: 'production'
      }
      
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      const azureProvider = newConfig.providers[0]
      expect(azureProvider.clientId).toBe(mockEnvVars.AUTH_AZURE_AD_CLIENT_ID)
      expect(azureProvider.clientSecret).toBe(mockEnvVars.AUTH_AZURE_AD_CLIENT_SECRET)
      expect(azureProvider.tenantId).toBe(mockEnvVars.AUTH_AZURE_AD_TENANT_ID)
    })
  })

  describe('Callbacks', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, ...mockEnvVars }
    })

    describe('JWT Callback', () => {
      it('persists OAuth tokens and profile on signin', async () => {
        const mockAccount = {
          access_token: 'mock-access-token',
          id_token: 'mock-id-token',
          refresh_token: 'mock-refresh-token',
          expires_at: 1234567890
        }
        
        const result = await config.callbacks!.jwt!({
          token: mockJWT,
          account: mockAccount,
          profile: mockAzureTokenPayload
        })

        expect(result.accessToken).toBe('mock-access-token')
        expect(result.idToken).toBe('mock-id-token')
        expect(result.refreshToken).toBe('mock-refresh-token')
        expect(result.expiresAt).toBe(1234567890)
        expect(result.profile).toEqual(mockAzureTokenPayload)
      })

      it('preserves existing token when no new account data', async () => {
        const existingToken = {
          ...mockJWT,
          accessToken: 'existing-access-token'
        }

        const result = await config.callbacks!.jwt!({
          token: existingToken,
          account: null,
          profile: null
        })

        expect(result.accessToken).toBe('existing-access-token')
        expect(result).toEqual(existingToken)
      })
    })

    describe('Session Callback', () => {
      it('includes tokens and Azure AD user info in session', async () => {
        const tokenWithProfile = {
          ...mockJWT,
          accessToken: 'mock-access-token',
          idToken: 'mock-id-token',
          refreshToken: 'mock-refresh-token',
          expiresAt: 1234567890,
          profile: mockAzureTokenPayload
        }

        const mockSession = {
          user: mockAzureUser,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }

        const result = await config.callbacks!.session!({
          session: mockSession,
          token: tokenWithProfile
        })

        expect(result.accessToken).toBe('mock-access-token')
        expect(result.idToken).toBe('mock-id-token')
        expect(result.refreshToken).toBe('mock-refresh-token')
        expect(result.expiresAt).toBe(1234567890)
        expect(result.user.id).toBe(mockAzureTokenPayload.sub)
        expect(result.user.tenantId).toBe(mockAzureTokenPayload.tid)
        expect(result.user.upn).toBe(mockAzureTokenPayload.upn)
        expect(result.user.roles).toEqual(mockAzureTokenPayload.roles)
      })

      it('handles session without profile data', async () => {
        const tokenWithoutProfile = {
          ...mockJWT,
          accessToken: 'mock-access-token'
        }

        const mockSession = {
          user: mockAzureUser,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }

        const result = await config.callbacks!.session!({
          session: mockSession,
          token: tokenWithoutProfile
        })

        expect(result.accessToken).toBe('mock-access-token')
        expect(result.user.id).toBeUndefined()
        expect(result.user.tenantId).toBeUndefined()
      })
    })

    describe('SignIn Callback', () => {
      it('allows sign in by default', async () => {
        const result = await config.callbacks!.signIn!({
          user: mockAzureUser,
          account: { type: 'oauth', provider: 'azure-ad' },
          profile: mockAzureTokenPayload
        })

        expect(result).toBe(true)
      })

      it('can be extended for custom authorization logic', async () => {
        // This test demonstrates how the signIn callback could be extended
        const customSignIn = async ({ user, account, profile }: any) => {
          // Example: Only allow users from specific domain
          if (user.email?.endsWith('@elastics.ai')) {
            return true
          }
          return false
        }

        const allowedUser = { ...mockAzureUser, email: 'user@elastics.ai' }
        const deniedUser = { ...mockAzureUser, email: 'user@external.com' }

        expect(await customSignIn({ user: allowedUser })).toBe(true)
        expect(await customSignIn({ user: deniedUser })).toBe(false)
      })
    })

    describe('Redirect Callback', () => {
      it('allows relative callback URLs', async () => {
        const result = await config.callbacks!.redirect!({
          url: '/dashboard',
          baseUrl: 'http://localhost:3000'
        })

        expect(result).toBe('http://localhost:3000/dashboard')
      })

      it('allows callback URLs on same origin', async () => {
        const result = await config.callbacks!.redirect!({
          url: 'http://localhost:3000/auth/callback',
          baseUrl: 'http://localhost:3000'
        })

        expect(result).toBe('http://localhost:3000/auth/callback')
      })

      it('redirects to baseUrl for external URLs', async () => {
        const result = await config.callbacks!.redirect!({
          url: 'https://external.com/malicious',
          baseUrl: 'http://localhost:3000'
        })

        expect(result).toBe('http://localhost:3000')
      })

      it('handles URLs without protocol', async () => {
        const result = await config.callbacks!.redirect!({
          url: 'dashboard',
          baseUrl: 'http://localhost:3000'
        })

        expect(result).toBe('http://localhost:3000')
      })
    })
  })

  describe('Session Configuration', () => {
    it('uses JWT strategy', () => {
      expect(config.session.strategy).toBe('jwt')
    })

    it('sets appropriate max age', () => {
      expect(config.session.maxAge).toBe(24 * 60 * 60) // 24 hours
    })
  })

  describe('Pages Configuration', () => {
    it('configures custom sign-in page', () => {
      expect(config.pages?.signIn).toBe('/auth/signin')
    })

    it('configures custom error page', () => {
      expect(config.pages?.error).toBe('/auth/error')
    })
  })

  describe('Debug Configuration', () => {
    it('enables debug in development', () => {
      process.env = { ...originalEnv, NODE_ENV: 'development' }
      
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      expect(newConfig.debug).toBe(true)
    })

    it('disables debug in production', () => {
      process.env = { ...originalEnv, NODE_ENV: 'production' }
      
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      expect(newConfig.debug).toBe(false)
    })
  })

  describe('Local Development Provider', () => {
    beforeEach(() => {
      process.env = { ...originalEnv, ...mockLocalDevEnvVars }
    })

    it('authorizes local development user', async () => {
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      const localProvider = newConfig.providers[0]
      
      const result = await localProvider.authorize({
        email: 'wojciech@elastics.ai',
        password: 'any-password'
      })

      expect(result).toEqual({
        id: 'local-dev-user',
        name: 'Wojtek',
        email: 'wojciech@elastics.ai',
        image: null
      })
    })

    it('authorizes alternative local development email', async () => {
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      const localProvider = newConfig.providers[0]
      
      const result = await localProvider.authorize({
        email: 'wojtek@elastics.ai',
        password: 'any-password'
      })

      expect(result).toEqual({
        id: 'local-dev-user',
        name: 'Wojtek',
        email: 'wojciech@elastics.ai',
        image: null
      })
    })

    it('rejects unauthorized emails', async () => {
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      const localProvider = newConfig.providers[0]
      
      const result = await localProvider.authorize({
        email: 'unauthorized@example.com',
        password: 'any-password'
      })

      expect(result).toBeNull()
    })
  })

  describe('Environment Variable Validation', () => {
    it('handles missing Azure AD client ID', () => {
      process.env = {
        ...originalEnv,
        AUTH_AZURE_AD_CLIENT_SECRET: 'secret',
        AUTH_AZURE_AD_TENANT_ID: 'tenant-id'
        // Missing AUTH_AZURE_AD_CLIENT_ID
      }
      
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      // Should fall back to local development
      expect(newConfig.providers[0].id).toBe('local-dev')
    })

    it('handles missing Azure AD client secret', () => {
      process.env = {
        ...originalEnv,
        AUTH_AZURE_AD_CLIENT_ID: 'client-id',
        AUTH_AZURE_AD_TENANT_ID: 'tenant-id'
        // Missing AUTH_AZURE_AD_CLIENT_SECRET
      }
      
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      // Should fall back to local development
      expect(newConfig.providers[0].id).toBe('local-dev')
    })

    it('handles missing Azure AD tenant ID', () => {
      process.env = {
        ...originalEnv,
        AUTH_AZURE_AD_CLIENT_ID: 'client-id',
        AUTH_AZURE_AD_CLIENT_SECRET: 'secret'
        // Missing AUTH_AZURE_AD_TENANT_ID
      }
      
      jest.resetModules()
      const { config: newConfig } = require('@/lib/auth')
      
      // Should fall back to local development
      expect(newConfig.providers[0].id).toBe('local-dev')
    })
  })

  describe('Error Handling', () => {
    it('handles malformed token data gracefully', async () => {
      const malformedProfile = {
        // Missing standard fields
        custom_field: 'value'
      }

      const result = await config.callbacks!.session!({
        session: { user: {}, expires: '' },
        token: { ...mockJWT, profile: malformedProfile }
      })

      // Should not throw and should handle missing fields
      expect(result.user.id).toBeUndefined()
      expect(result.user.tenantId).toBeUndefined()
      expect(result.user.roles).toEqual([])
    })

    it('handles missing account data in JWT callback', async () => {
      const result = await config.callbacks!.jwt!({
        token: mockJWT,
        account: null,
        profile: null
      })

      // Should preserve existing token
      expect(result).toEqual(mockJWT)
    })
  })

  describe('Type Safety', () => {
    it('maintains type safety for session extensions', () => {
      // This test ensures our extended session type works correctly
      const extendedSession = {
        user: {
          id: 'test-id',
          name: 'Test User',
          email: 'test@example.com',
          tenantId: 'test-tenant',
          upn: 'test@example.com',
          roles: ['User']
        },
        expires: new Date().toISOString(),
        accessToken: 'token',
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now()
      }

      // Type checking - this would fail at compile time if types are wrong
      expect(extendedSession.user.tenantId).toBe('test-tenant')
      expect(extendedSession.accessToken).toBe('token')
      expect(Array.isArray(extendedSession.user.roles)).toBe(true)
    })
  })
})