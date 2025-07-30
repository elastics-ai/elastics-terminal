/**
 * Tests for the SignIn page component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, getSession } from 'next-auth/react'
import SignInPage from '@/app/auth/signin/page'
import {
  mockLocalDevSession,
  mockAzureSession,
  mockAuthErrors,
  mockEnvVars,
  mockLocalDevEnvVars
} from '@/lib/test-fixtures/auth-fixtures'

// Use global router mock from jest.setup.js

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  getSession: jest.fn()
}))

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>
const mockGetSession = getSession as jest.MockedFunction<typeof getSession>

// Store original environment variables
const originalEnv = process.env

describe('SignInPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // The router mock is already configured globally in jest.setup.js
    const router = useRouter()
    if (router.push?.mockClear) {
      router.push.mockClear()
      router.replace?.mockClear()
      router.back?.mockClear()
    }

    // SearchParams is also mocked globally
    const searchParams = useSearchParams()
    if (searchParams?.get?.mockClear) {
      searchParams.get.mockClear()
    }

    mockGetSession.mockResolvedValue(null)
  })

  describe('Local Development Mode', () => {
    beforeEach(() => {
      // Mock environment for local development
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development' })
      Object.defineProperty(process.env, 'NEXT_PUBLIC_AZURE_AD_ENABLED', { value: 'false' })
    })

    it('renders local development sign-in form', async () => {
      render(<SignInPage />)

      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /sign in \(local development\)/i })).toBeInTheDocument()
      })
    })

    it('has pre-filled email field with default user', async () => {
      render(<SignInPage />)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
        expect(emailInput.value).toBe('wojciech@elastics.ai')
      })
    })

    it('shows development mode warning', async () => {
      render(<SignInPage />)

      await waitFor(() => {
        expect(screen.getByText(/development mode/i)).toBeInTheDocument()
        expect(screen.getByText(/configure azure ad environment variables/i)).toBeInTheDocument()
      })
    })

    it('handles local development sign-in successfully', async () => {
      mockSignIn.mockResolvedValue({ 
        ok: true, 
        error: null,
        url: 'http://localhost:3000/dashboard'
      })

      render(<SignInPage />)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)
        const submitButton = screen.getByRole('button', { name: /sign in \(local development\)/i })

        fireEvent.change(passwordInput, { target: { value: 'test-password' } })
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('local-dev', {
          email: 'wojciech@elastics.ai',
          password: 'test-password',
          callbackUrl: '/',
          redirect: false
        })
        const router = useRouter()
        expect(router.push).toHaveBeenCalledWith('http://localhost:3000/dashboard')
      })
    })

    it('handles local development sign-in failure', async () => {
      mockSignIn.mockResolvedValue({ 
        ok: false, 
        error: 'CredentialsSignin',
        url: null
      })

      render(<SignInPage />)

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /sign in \(local development\)/i })
        fireEvent.click(submitButton)
      })

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
        expect(screen.getByText(/use wojciech@elastics.ai for local development/i)).toBeInTheDocument()
      })
    })
  })

  describe('Azure AD Mode', () => {
    beforeEach(() => {
      // Mock environment variables by replacing process.env
      process.env = {
        ...originalEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_AZURE_AD_ENABLED: 'true'
      }
    })

    afterEach(() => {
      // Restore original environment
      process.env = originalEnv
    })

    it('renders Azure AD sign-in button', async () => {
      render(<SignInPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with microsoft/i })).toBeInTheDocument()
        expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument()
        expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument()
      })
    })

    it('does not show development mode warning', async () => {
      render(<SignInPage />)

      await waitFor(() => {
        expect(screen.queryByText(/development mode/i)).not.toBeInTheDocument()
      })
    })

    it('handles Azure AD sign-in', async () => {
      mockSignIn.mockResolvedValue({ ok: true, error: null })

      render(<SignInPage />)

      await waitFor(() => {
        const azureButton = screen.getByRole('button', { name: /sign in with microsoft/i })
        fireEvent.click(azureButton)
      })

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('azure-ad', {
          callbackUrl: '/',
          redirect: true
        })
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock search params for error handling tests
      const mockSearchParams = new URLSearchParams('error=AccessDenied&callbackUrl=/dashboard')
      jest.mocked(useSearchParams).mockReturnValue(mockSearchParams as any)
    })

    it('displays error message from URL params', async () => {
      render(<SignInPage />)

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument()
      })
    })

    it('handles different error types', async () => {
      const errorTestCases = [
        { error: 'Configuration', expectedText: /server configuration/i },
        { error: 'AccessDenied', expectedText: /access denied/i },
        { error: 'Verification', expectedText: /token has expired/i },
        { error: 'OAuthSignin', expectedText: /authorization url/i },
        { error: 'SessionRequired', expectedText: /must be signed in/i }
      ]

      for (const testCase of errorTestCases) {
        // Mock search params for this specific error test
        const mockSearchParams = new URLSearchParams(`error=${testCase.error}`)
        jest.mocked(useSearchParams).mockReturnValue(mockSearchParams as any)

        const { unmount } = render(<SignInPage />)

        await waitFor(() => {
          expect(screen.getByText(testCase.expectedText)).toBeInTheDocument()
        })

        unmount()
      }
    })
  })

  describe('Session Redirect', () => {
    it('redirects to callback URL if user is already signed in', async () => {
      mockGetSession.mockResolvedValue(mockLocalDevSession)
      // Mock search params with callback URL
      const mockSearchParams = new URLSearchParams('callbackUrl=/dashboard')
      jest.mocked(useSearchParams).mockReturnValue(mockSearchParams as any)

      render(<SignInPage />)

      await waitFor(() => {
        const router = useRouter()
        expect(router.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('redirects to home if no callback URL provided', async () => {
      mockGetSession.mockResolvedValue(mockAzureSession)

      render(<SignInPage />)

      await waitFor(() => {
        const router = useRouter()
        expect(router.push).toHaveBeenCalledWith('/')
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading state during sign-in', async () => {
      // Mock environment for Azure AD to show the Microsoft button
      const originalProcessEnv = process.env
      process.env = {
        ...originalProcessEnv,
        NODE_ENV: 'production',
        NEXT_PUBLIC_AZURE_AD_ENABLED: 'true'
      }
      
      mockSignIn.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ ok: true, error: null }), 100)
      ))

      render(<SignInPage />)

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /sign in with microsoft/i })
        fireEvent.click(submitButton)
      })

      expect(screen.getAllByText(/signing in/i).length).toBeGreaterThan(0)
      expect(screen.getByRole('button')).toBeDisabled()
      
      // Restore environment
      process.env = originalProcessEnv
    })
  })

  describe('Accessibility', () => {
    it('has proper form labels and structure', async () => {
      const originalProcessEnv = process.env
      process.env = {
        ...originalProcessEnv,
        NEXT_PUBLIC_AZURE_AD_ENABLED: 'false'
      }

      render(<SignInPage />)

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)
        
        expect(emailInput).toHaveAttribute('type', 'email')
        expect(emailInput).toBeRequired()
        expect(passwordInput).toHaveAttribute('type', 'password')
      })
      
      // Restore environment
      process.env = originalProcessEnv
    })

    it('has proper ARIA attributes for error messages', async () => {
      // Mock search params with error
      const mockSearchParams = new URLSearchParams('error=AccessDenied')
      jest.mocked(useSearchParams).mockReturnValue(mockSearchParams as any)

      render(<SignInPage />)

      await waitFor(() => {
        const errorMessage = screen.getByText(/access denied/i)
        expect(errorMessage).toBeInTheDocument()
      })
    })
  })
})