import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileX, Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
            <FileX className="w-8 h-8 text-yellow-500" />
          </div>
          <CardTitle className="text-6xl font-light mb-2">404</CardTitle>
          <CardDescription className="text-xl text-gray-300">
            Page not found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Message */}
          <div className="text-center text-gray-400">
            <p>The page you're looking for doesn't exist or has been moved.</p>
            <p className="mt-2">Here are some helpful links to get you back on track:</p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/">
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <Home className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <p className="font-medium">Dashboard</p>
                    <p className="text-sm text-gray-400">Go to home</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/portfolio">
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <Search className="w-5 h-5 text-green-500" />
                  <div className="text-left">
                    <p className="font-medium">Portfolio</p>
                    <p className="text-sm text-gray-400">View positions</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/market-overview">
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <FileX className="w-5 h-5 text-purple-500" />
                  <div className="text-left">
                    <p className="font-medium">Markets</p>
                    <p className="text-sm text-gray-400">Market data</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/data-library/modules">
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <ArrowLeft className="w-5 h-5 text-orange-500" />
                  <div className="text-left">
                    <p className="font-medium">Data Library</p>
                    <p className="text-sm text-gray-400">Browse data</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="flex-1 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go back
            </Button>
            <Link href="/" className="flex-1">
              <Button className="w-full gap-2">
                <Home className="w-4 h-4" />
                Go to homepage
              </Button>
            </Link>
          </div>

          {/* Help */}
          <div className="border-t border-gray-800 pt-6">
            <p className="text-sm text-gray-400 text-center">
              If you believe this is a mistake, please contact{' '}
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