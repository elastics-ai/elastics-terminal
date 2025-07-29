'use client'

import { signIn, getSession } from "next-auth/react"
import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

function SignInContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("wojciech@elastics.ai")
  const [password, setPassword] = useState("")
  
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const errorParam = searchParams.get("error")

  // Check if Azure AD is configured (this would come from environment or API)
  const [hasAzureConfig, setHasAzureConfig] = useState(false)

  useEffect(() => {
    // Check if Azure AD is configured by trying to determine available providers
    // In a real implementation, you might expose this via an API endpoint
    setHasAzureConfig(process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_AZURE_AD_ENABLED === 'true')
  }, [])

  useEffect(() => {
    // Check if user is already signed in
    getSession().then(session => {
      if (session) {
        router.push(callbackUrl)
      }
    })
  }, [router, callbackUrl])

  useEffect(() => {
    if (errorParam) {
      setError(getErrorMessage(errorParam))
    }
  }, [errorParam])

  const handleAzureSignIn = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      await signIn("azure-ad", {
        callbackUrl,
        redirect: true,
      })
    } catch (error) {
      console.error("Azure sign in error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocalSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      setError(null)
      
      const result = await signIn("local-dev", {
        email,
        password,
        callbackUrl,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid credentials. Use wojciech@elastics.ai for local development.")
      } else if (result?.url) {
        router.push(result.url)
      }
    } catch (error) {
      console.error("Local sign in error:", error)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const getErrorMessage = (error: string): string => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration. Please contact support."
      case "AccessDenied":
        return "Access denied. You do not have permission to access this application."
      case "Verification":
        return "The token has expired or has already been used. Please try again."
      case "OAuthSignin":
        return "Error in constructing an authorization URL. Please try again."
      case "OAuthCallback":
        return "Error in handling the response from the OAuth provider. Please try again."
      case "OAuthCreateAccount":
        return "Could not create account in the OAuth provider. Please contact support."
      case "EmailCreateAccount":
        return "Could not create account with email. Please contact support."
      case "Callback":
        return "Error in the OAuth callback handler route. Please try again."
      case "OAuthAccountNotLinked":
        return "Email already associated with another account. Please use a different email or sign in with the linked provider."
      case "EmailSignin":
        return "Sending the email with the verification token failed. Please try again."
      case "CredentialsSignin":
        return "Authorization failed. Please check your credentials and try again."
      case "SessionRequired":
        return "You must be signed in to access this page."
      default:
        return "An error occurred during authentication. Please try again."
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Elastics Terminal
          </h1>
          <p className="text-gray-600">
            Professional volatility monitoring and portfolio management
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Access your portfolio dashboard and trading analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {hasAzureConfig ? (
              // Azure AD Sign In
              <Button
                onClick={handleAzureSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
                  </svg>
                )}
                {isLoading ? "Signing in..." : "Sign in with Microsoft"}
              </Button>
            ) : (
              // Local Development Sign In
              <form onSubmit={handleLocalSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="wojciech@elastics.ai"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Any password for local dev"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ) : null}
                  {isLoading ? "Signing in..." : "Sign in (Local Development)"}
                </Button>
              </form>
            )}

            {!hasAzureConfig && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700">
                  <strong>Development Mode:</strong> Using local authentication. 
                  Configure Azure AD environment variables for production.
                </p>
              </div>
            )}

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our terms of service and privacy policy.
                This application uses Azure Active Directory for secure authentication.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact support at{" "}
            <a href="mailto:support@elastics.ai" className="text-blue-600 hover:text-blue-500">
              support@elastics.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Elastics Terminal
            </h1>
            <p className="text-gray-600">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  )
}