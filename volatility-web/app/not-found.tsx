import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <h1 className="text-6xl font-light mb-2 text-white">404</h1>
        <p className="text-xl text-gray-300 mb-6">Page not found</p>
        <Link href="/" className="text-blue-500 hover:text-blue-400">
          Go back home
        </Link>
      </div>
    </div>
  )
}