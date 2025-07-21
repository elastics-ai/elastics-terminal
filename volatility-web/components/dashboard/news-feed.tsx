'use client'

import { BarChart2, Newspaper, ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface NewsArticle {
  source: {
    id: string | null
    name: string
  }
  author: string
  title: string
  description: string
  url: string
  urlToImage: string
  publishedAt: string
  content: string
}

interface NewsResponse {
  status: string
  totalResults: number
  articles: NewsArticle[]
}

const newsItems = [
  {
    id: 1,
    title: 'GDP Growth (QoQ)',
    value: '2.1%',
    trend: 'up'
  },
  {
    id: 2,
    title: 'Initial Jobless Claims',
    value: '250K',
    trend: 'down'
  },
  {
    id: 3,
    title: 'Consumer Sentiment',
    value: '64.9',
    trend: 'up'
  },
  {
    id: 4,
    title: 'ISM Manufacturing Index',
    value: '50.1',
    trend: 'neutral'
  }
]

export function NewsFeed() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNews = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try direct API first, fallback to our proxy if CORS issues
      let response: Response
      
      try {
        response = await fetch('https://saurav.tech/NewsAPI/top-headlines/category/business/us.json')
        if (!response.ok) {
          throw new Error('Direct API failed')
        }
      } catch (directError) {
        console.log('Direct API failed, trying proxy...', directError)
        response = await fetch('/api/news')
        if (!response.ok) {
          throw new Error(`API proxy failed: ${response.statusText}`)
        }
      }
      
      const data: NewsResponse = await response.json()
      
      if (data.status === 'ok' && data.articles) {
        // Filter out articles with null/undefined titles and limit to top 5
        const validArticles = data.articles
          .filter(article => article.title && article.title !== '[Removed]')
          .slice(0, 5)
        setArticles(validArticles)
      } else {
        throw new Error('Invalid news data received')
      }
    } catch (err) {
      console.error('Error fetching news:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch news')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNews()
    // Refresh news every 10 minutes
    const interval = setInterval(fetchNews, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours === 0) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return diffInMinutes === 0 ? 'Just now' : `${diffInMinutes}m ago`
    }
    if (diffInHours < 24) {
      return `${diffInHours}h ago`
    }
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-border h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">News Feed</h3>
        <button 
          onClick={fetchNews}
          className="text-sm text-blue-600 hover:underline"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Economic Data Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-900">Economic Data</h4>
        </div>
        <div className="space-y-3">
          {newsItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{item.title}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{item.value}</span>
                {item.trend === 'up' && (
                  <span className="text-green-600 text-xs">↑</span>
                )}
                {item.trend === 'down' && (
                  <span className="text-red-600 text-xs">↓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* News Headlines Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-4 h-4 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-900">Business News</h4>
        </div>
        
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading news...</span>
          </div>
        )}
        
        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-red-600 mb-2">Failed to load news</p>
            <button 
              onClick={fetchNews}
              className="text-xs text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        )}
        
        {!loading && !error && (
          <div className="space-y-4">
            {articles.map((article, index) => (
              <div key={`${article.url}-${index}`} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900">
                    {article.source.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(article.publishedAt)}
                  </span>
                </div>
                <a 
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <p className="text-sm text-gray-600 leading-relaxed group-hover:text-blue-600 transition-colors duration-150">
                    {article.title}
                    <ExternalLink className="inline w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </p>
                </a>
                {article.description && (
                  <p className="text-xs text-gray-500 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {article.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}