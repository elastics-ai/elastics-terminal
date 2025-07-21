import { NextResponse } from 'next/server'

interface NewsArticle {
  title: string
  url: string
  source: {
    name: string
  }
  description?: string
  publishedAt?: string
  author?: string
  urlToImage?: string
  content?: string
}

interface NewsAPIResponse {
  status: string
  articles: NewsArticle[]
}

export async function GET() {
  try {
    const response = await fetch('https://saurav.tech/NewsAPI/top-headlines/category/business/us.json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data: NewsAPIResponse = await response.json()
    
    // Transform the data to include only valid articles
    const filteredArticles = data.articles
      ?.filter((article: NewsArticle) => 
        article.title && 
        article.title !== '[Removed]' &&
        article.url &&
        article.source?.name
      )
      ?.slice(0, 10) // Limit to 10 articles
    
    return NextResponse.json({
      status: 'ok',
      totalResults: filteredArticles?.length || 0,
      articles: filteredArticles || []
    })
  } catch (error) {
    console.error('Error fetching news:', error)
    
    return NextResponse.json(
      { 
        status: 'error',
        message: 'Failed to fetch news',
        articles: []
      },
      { status: 500 }
    )
  }
}
