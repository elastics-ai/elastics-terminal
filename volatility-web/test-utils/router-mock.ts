/**
 * Standardized Next.js router mock for tests
 */

export const createMockRouter = (overrides: Partial<any> = {}) => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  ...overrides
})

export const mockNextNavigation = (routerOverrides: Partial<any> = {}, otherMocks: any = {}) => {
  const mockRouter = createMockRouter(routerOverrides)
  
  return {
    useRouter: () => mockRouter,
    usePathname: jest.fn(() => '/'),
    useSearchParams: jest.fn(() => new URLSearchParams()),
    ...otherMocks
  }
}

// For use in jest.mock() calls
export const standardRouterMock = mockNextNavigation()