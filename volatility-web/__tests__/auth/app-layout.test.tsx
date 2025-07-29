/**
 * Tests for the AppLayout component with authentication
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import {
  mockLocalDevSession,
  mockAzureSession,
  mockLocalDevUser,
  mockAzureUser
} from '@/lib/test-fixtures/auth-fixtures'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn()
}))

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn()
}))

// Mock components to focus on authentication logic
jest.mock('@/components/layout/header', () => ({
  Header: () => <div data-testid="header">Header</div>
}))

jest.mock('@/components/chat/FixedChatInput', () => ({
  FixedChatInput: () => <div data-testid="fixed-chat">Chat Input</div>
}))

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('AppLayout Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/')
    mockSignOut.mockResolvedValue(undefined)
  })

  describe('Loading State', () => {
    it('shows loading skeleton while session is loading', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      // Check for loading skeleton elements
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
      
      // Loading skeleton should be present
      const loadingElements = screen.getAllByRole('generic')
      const hasLoadingAnimation = loadingElements.some(element => 
        element.classList.contains('animate-pulse')
      )
      expect(hasLoadingAnimation).toBe(true)
    })
  })

  describe('Authenticated User Display', () => {
    it('displays local development user information', async () => {
      mockUseSession.mockReturnValue({
        data: mockLocalDevSession,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Wojtek')).toBeInTheDocument()
        expect(screen.getByText('wojciech@elastics.ai')).toBeInTheDocument()
      })

      // Check for user initial in avatar
      expect(screen.getByText('W')).toBeInTheDocument()
    })

    it('displays Azure AD user information', async () => {
      mockUseSession.mockReturnValue({
        data: mockAzureSession,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
        expect(screen.getByText('test.user@example.com')).toBeInTheDocument()
      })
    })

    it('displays user avatar image when available', async () => {
      const sessionWithImage = {
        ...mockAzureSession,
        user: {
          ...mockAzureUser,
          image: 'https://example.com/avatar.jpg'
        }
      }

      mockUseSession.mockReturnValue({
        data: sessionWithImage,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      await waitFor(() => {
        const avatar = screen.getByAltText('Test User')
        expect(avatar).toBeInTheDocument()
        expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      })
    })

    it('shows user initial when no avatar image', async () => {
      mockUseSession.mockReturnValue({
        data: mockLocalDevSession,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      await waitFor(() => {
        expect(screen.getByText('W')).toBeInTheDocument()
      })
    })
  })

  describe('User Dropdown Menu', () => {
    it('opens dropdown menu when user avatar is clicked', async () => {
      mockUseSession.mockReturnValue({
        data: mockLocalDevSession,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      await waitFor(() => {
        const userButton = screen.getByRole('button')
        fireEvent.click(userButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
        expect(screen.getByText('Sign out')).toBeInTheDocument()
      })
    })

    it('displays tenant information for Azure AD users', async () => {
      const sessionWithTenant = {
        ...mockAzureSession,
        tenantId: 'test-tenant-id'
      }

      mockUseSession.mockReturnValue({
        data: sessionWithTenant,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      await waitFor(() => {
        const userButton = screen.getByRole('button')
        fireEvent.click(userButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/tenant: test-tenant-id/i)).toBeInTheDocument()
      })
    })

    it('handles sign out when clicked', async () => {
      mockUseSession.mockReturnValue({
        data: mockLocalDevSession,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      await waitFor(() => {
        const userButton = screen.getByRole('button')
        fireEvent.click(userButton)
      })

      await waitFor(() => {
        const signOutButton = screen.getByText('Sign out')
        fireEvent.click(signOutButton)
      })

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/auth/signin' })
    })
  })

  describe('Unauthenticated State', () => {
    it('shows not signed in state when no session', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      expect(screen.getByText('Not signed in')).toBeInTheDocument()
      expect(screen.getByText('Sign in')).toBeInTheDocument()
    })

    it('provides sign in button when unauthenticated', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn()
      })

      // Mock window.location
      delete (window as any).location
      window.location = { href: '' } as any

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      const signInButton = screen.getByText('Sign in')
      fireEvent.click(signInButton)

      expect(window.location.href).toBe('/auth/signin')
    })
  })

  describe('Navigation Integration', () => {
    it('highlights active navigation item', () => {
      mockUsePathname.mockReturnValue('/portfolio')
      mockUseSession.mockReturnValue({
        data: mockLocalDevSession,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      const portfolioLink = screen.getByText('Portfolio').closest('a')
      expect(portfolioLink).toHaveClass('bg-[hsl(var(--sidebar-active))]')
    })

    it('renders all navigation items', () => {
      mockUseSession.mockReturnValue({
        data: mockLocalDevSession,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      // Check for main navigation items
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Agents')).toBeInTheDocument()
      expect(screen.getByText('Portfolio')).toBeInTheDocument()
      expect(screen.getByText('Risk')).toBeInTheDocument()
      expect(screen.getByText('Documentation')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles session errors gracefully', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn()
      })

      // Should not throw even with malformed session data
      expect(() => {
        render(
          <AppLayout>
            <div>Test Content</div>
          </AppLayout>
        )
      }).not.toThrow()

      expect(screen.getByText('Not signed in')).toBeInTheDocument()
    })

    it('handles missing user data gracefully', () => {
      const malformedSession = {
        ...mockLocalDevSession,
        user: null
      }

      mockUseSession.mockReturnValue({
        data: malformedSession,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      // Should fall back to unauthenticated state
      expect(screen.getByText('Not signed in')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes for user button', async () => {
      mockUseSession.mockReturnValue({
        data: mockLocalDevSession,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      await waitFor(() => {
        const userButton = screen.getByRole('button')
        expect(userButton).toBeInTheDocument()
        expect(userButton).toHaveAttribute('type', 'button')
      })
    })

    it('has proper keyboard navigation support', async () => {
      mockUseSession.mockReturnValue({
        data: mockLocalDevSession,
        status: 'authenticated',
        update: jest.fn()
      })

      render(
        <AppLayout>
          <div>Test Content</div>
        </AppLayout>
      )

      await waitFor(() => {
        const userButton = screen.getByRole('button')
        userButton.focus()
        expect(userButton).toHaveFocus()
      })
    })
  })
})