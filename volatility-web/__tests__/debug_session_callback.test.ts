/**
 * Debug test for session callback
 */

import {
  mockEnvVars,
  mockAzureUser
} from '@/lib/test-fixtures/auth-fixtures'

// Mock environment variables
const originalEnv = process.env

describe('Debug Session Callback', () => {
  afterEach(() => {
    process.env = originalEnv
    jest.resetModules()
  })

  it('debugs session without profile data', async () => {
    // Set Azure AD environment variables
    process.env.AUTH_AZURE_AD_CLIENT_ID = mockEnvVars.AUTH_AZURE_AD_CLIENT_ID
    process.env.AUTH_AZURE_AD_CLIENT_SECRET = mockEnvVars.AUTH_AZURE_AD_CLIENT_SECRET
    process.env.AUTH_AZURE_AD_TENANT_ID = mockEnvVars.AUTH_AZURE_AD_TENANT_ID
    
    jest.resetModules()
    const config = require('@/lib/auth').config
    
    const tokenWithoutProfile = {
      sub: "test-user-id",
      name: "Test User", 
      email: "test.user@example.com",
      accessToken: 'mock-access-token',
      profile: undefined
    }

    const mockSession = {
      user: mockAzureUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }

    console.log('Input session:', JSON.stringify(mockSession, null, 2))
    console.log('Input token:', JSON.stringify(tokenWithoutProfile, null, 2))
    console.log('token.profile:', tokenWithoutProfile.profile)
    console.log('token.profile is undefined:', tokenWithoutProfile.profile === undefined)

    const result = await config.callbacks!.session!({
      session: mockSession,
      token: tokenWithoutProfile
    })

    console.log('Result session:', JSON.stringify(result, null, 2))
    console.log('result.user.tenantId:', result.user.tenantId)
    console.log('result.user.tenantId is undefined:', result.user.tenantId === undefined)

    expect(result.accessToken).toBe('mock-access-token')
    expect(result.user.id).toBe(mockAzureUser.id)
    expect(result.user.tenantId).toBeUndefined()
  })
})