/**
 * Debug test to understand the actual structure of NextAuth config
 */

const originalEnv = process.env

describe('Debug Auth Structure', () => {
  afterEach(() => {
    process.env = originalEnv
    jest.resetModules()
  })

  it('shows Azure AD provider structure', () => {
    // Set Azure AD environment variables
    process.env.AUTH_AZURE_AD_CLIENT_ID = 'test-client-id'
    process.env.AUTH_AZURE_AD_CLIENT_SECRET = 'test-client-secret'
    process.env.AUTH_AZURE_AD_TENANT_ID = 'test-tenant-id'
    
    console.log('Environment variables set:')
    console.log('AUTH_AZURE_AD_CLIENT_ID:', process.env.AUTH_AZURE_AD_CLIENT_ID)
    console.log('AUTH_AZURE_AD_CLIENT_SECRET:', process.env.AUTH_AZURE_AD_CLIENT_SECRET)
    console.log('AUTH_AZURE_AD_TENANT_ID:', process.env.AUTH_AZURE_AD_TENANT_ID)
    
    jest.resetModules()
    const { config } = require('@/lib/auth')
    
    console.log('Azure AD Config Structure:')
    console.log('providers.length:', config.providers.length)
    console.log('provider[0] keys:', Object.keys(config.providers[0]))
    console.log('provider[0].id:', config.providers[0].id)
    console.log('provider[0].name:', config.providers[0].name)
    console.log('provider[0].type:', config.providers[0].type)
    console.log('provider[0].options:', config.providers[0].options)
    
    // This will help us understand the structure
    expect(config.providers).toHaveLength(1)
  })

  it('shows local dev provider structure', () => {
    // Set local development environment variables (no Azure)
    delete process.env.AUTH_AZURE_AD_CLIENT_ID
    delete process.env.AUTH_AZURE_AD_CLIENT_SECRET  
    delete process.env.AUTH_AZURE_AD_TENANT_ID
    
    jest.resetModules()
    const { config } = require('@/lib/auth')
    
    console.log('Local Dev Config Structure:')
    console.log('providers.length:', config.providers.length)
    console.log('provider[0] keys:', Object.keys(config.providers[0]))
    console.log('provider[0].id:', config.providers[0].id)
    console.log('provider[0].name:', config.providers[0].name)
    console.log('provider[0].type:', config.providers[0].type)
    console.log('provider[0].options id:', config.providers[0].options?.id)
    console.log('provider[0].options:', config.providers[0].options)
    
    // This will help us understand the structure
    expect(config.providers).toHaveLength(1)
  })
  
  it('shows partial Azure config (missing client ID)', () => {
    // Clear all then set partial Azure variables
    delete process.env.AUTH_AZURE_AD_CLIENT_ID
    delete process.env.AUTH_AZURE_AD_CLIENT_SECRET  
    delete process.env.AUTH_AZURE_AD_TENANT_ID
    
    process.env.AUTH_AZURE_AD_CLIENT_SECRET = 'secret'
    process.env.AUTH_AZURE_AD_TENANT_ID = 'tenant-id'
    // Missing AUTH_AZURE_AD_CLIENT_ID
    
    console.log('Partial Azure Environment variables:')
    console.log('AUTH_AZURE_AD_CLIENT_ID:', process.env.AUTH_AZURE_AD_CLIENT_ID)
    console.log('AUTH_AZURE_AD_CLIENT_SECRET:', process.env.AUTH_AZURE_AD_CLIENT_SECRET)
    console.log('AUTH_AZURE_AD_TENANT_ID:', process.env.AUTH_AZURE_AD_TENANT_ID)
    
    jest.resetModules()
    const { config } = require('@/lib/auth')
    
    console.log('Partial Azure Config Structure:')
    console.log('providers.length:', config.providers.length)
    console.log('provider[0].id:', config.providers[0].id)
    console.log('provider[0].name:', config.providers[0].name)
    console.log('provider[0].type:', config.providers[0].type)
    
    // This will help us understand the structure
    expect(config.providers).toHaveLength(1)
  })
})