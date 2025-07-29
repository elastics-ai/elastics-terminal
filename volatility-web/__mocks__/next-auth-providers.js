// Mock for next-auth providers
export function AzureAD(options) {
  return {
    id: 'azure-ad',
    name: 'Azure Active Directory',
    type: 'oauth',
    wellKnown: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
    authorization: { params: { scope: 'openid profile user.read email' } },
    idToken: true,
    profile: jest.fn(),
    checks: ['pkce', 'state'],
    ...options,
  };
}

export function Credentials(options) {
  return {
    id: 'credentials',
    name: 'Credentials', 
    type: 'credentials',
    credentials: options?.credentials || {},
    authorize: options?.authorize || jest.fn(),
    ...options,
  };
}

export default function (providerName) {
  if (providerName === 'azure-ad') return AzureAD;
  if (providerName === 'credentials') return Credentials;
  return jest.fn();
}