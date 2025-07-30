// Mock for next-auth providers

// This mock handles all next-auth provider imports through Jest's moduleNameMapper

// Default export for when a specific provider is imported
// The Jest moduleNameMapper maps all 'next-auth/providers/*' to this file
// So we need to determine which provider is being requested
export default function(options) {
  // This will be called when importing any provider
  // We need to return the appropriate mock based on the calling context
  
  // Create a mock that represents either provider depending on usage
  const mockProvider = {
    id: 'azure-ad', // Default to azure-ad
    name: 'Azure Active Directory',
    type: 'oidc',
    options: options || {}
  }

  // If no options or if we detect this is for credentials, return credentials mock
  if (!options || (options && options.id === 'local-dev')) {
    return {
      id: 'credentials',
      name: 'Credentials',
      type: 'credentials', 
      options: options || {}
    }
  }

  return mockProvider
}

// Named exports for specific imports
export const AzureAd = jest.fn((options) => ({
  id: 'azure-ad',
  name: 'Azure Active Directory',
  type: 'oidc',
  options: options
}))

export const Credentials = jest.fn((options) => ({
  id: 'credentials',
  name: 'Credentials',
  type: 'credentials',
  options: options
}))