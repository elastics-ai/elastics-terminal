// Mock for next-auth/providers/azure-ad
export default function AzureAd(options) {
  return {
    id: 'azure-ad',
    name: 'Azure Active Directory',
    type: 'oidc',
    options: options
  }
}