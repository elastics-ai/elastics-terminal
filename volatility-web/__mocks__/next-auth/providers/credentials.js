// Mock for next-auth/providers/credentials
export default function Credentials(options) {
  return {
    id: 'credentials',
    name: 'Credentials',
    type: 'credentials',
    options: {
      ...options,
      // Ensure authorize function is properly exposed
      authorize: options?.authorize || jest.fn()
    }
  }
}