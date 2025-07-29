'use client'

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowLeft } from "lucide-react"

function AuthErrorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  
  const errorParam = searchParams.get("error")

  useEffect(() => {
    if (errorParam) {
      setError(getErrorMessage(errorParam))
    }
  }, [errorParam])

  const getErrorMessage = (error: string): string => {
    switch (error) {
      case "Configuration":
        return "There is a problem with the server configuration. Please contact your administrator."
      case "AccessDenied":
        return "Access denied. You do not have permission to access this application. Please contact your administrator if you believe this is an error."
      case "Verification":
        return "The verification token has expired or has already been used. Please try signing in again."
      case "OAuthSignin":
        return "Error in constructing an authorization URL. Please try again or contact support."
      case "OAuthCallback":
        return "Error in handling the response from Azure AD. Please try again or contact support."
      case "OAuthCreateAccount":
        return "Could not create your account. Please contact your administrator."
      case "EmailCreateAccount":
        return "Could not create account with email. Please contact support."
      case "Callback":
        return "Error in the OAuth callback handler. Please try again or contact support."
      case "OAuthAccountNotLinked":
        return "Your email is already associated with another account. Please use a different email or contact support."
      case "EmailSignin":
        return "Sending the verification email failed. Please try again."
      case "CredentialsSignin":
        return "Invalid credentials. Please check your information and try again."
      case "SessionRequired":
        return "You must be signed in to access this page."
      case "Default":
      default:
        return "An authentication error occurred. Please try signing in again or contact support if the problem persists."
    }
  }

  const handleRetry = () => {
    router.push("/auth/signin")
  }

  const handleHome = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Elastics Terminal
          </h1>
          <p className="text-gray-600">
            Authentication Error
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-900">Authentication Failed</CardTitle>
            <CardDescription>
              We encountered an issue while trying to sign you in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 leading-relaxed">{error}</p>
              </div>
            )}
            
            <div className="space-y-3">
              <Button
                onClick={handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                Try Again
              </Button>
              
              <Button
                onClick={handleHome}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                If you continue to experience issues, please contact support at{" "}
                <a href="mailto:support@elastics.ai" className="text-blue-600 hover:text-blue-500">
                  support@elastics.ai
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Error Code: {errorParam || "Unknown"}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
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
      <AuthErrorContent />
    </Suspense>
  )
}