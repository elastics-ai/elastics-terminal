'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Home, RefreshCw, FileWarning } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-light">Something went wrong!</CardTitle>
          <CardDescription className="text-gray-400">
            An unexpected error has occurred. The error has been logged and we'll look into it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Error Details */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileWarning className="w-4 h-4" />
              <span>Error Details</span>
            </div>
            <div className="font-mono text-sm text-red-400 break-all">
              {error.message || 'An unknown error occurred'}
            </div>
            {error.digest && (
              <div className="text-xs text-gray-500">
                Error ID: {error.digest}
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">What you can try:</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Refresh the page to try again</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Check your internet connection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Clear your browser cache and cookies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Try again in a few minutes</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => reset()}
              className="flex-1 gap-2"
              variant="default"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full gap-2">
                <Home className="w-4 h-4" />
                Go to homepage
              </Button>
            </Link>
          </div>

          {/* Contact Support */}
          <div className="border-t border-gray-800 pt-6">
            <p className="text-sm text-gray-400 text-center">
              If this problem persists, please contact support at{' '}
              <a href="mailto:support@elastics.ai" className="text-blue-500 hover:underline">
                support@elastics.ai
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}