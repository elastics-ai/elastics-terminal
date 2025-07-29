'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewsItem {
  id: string
  title: string
  description: string
  sentiment: 'Extremely Positive' | 'Positive' | 'Neutral' | 'Negative' | 'Extremely Negative'
  timestamp: string
  source?: string
}

interface NewsFeedProps {
  news: NewsItem[]
}

const sentimentConfig = {
  'Extremely Positive': { color: 'bg-green-600', icon: TrendingUp },
  'Positive': { color: 'bg-green-500', icon: TrendingUp },
  'Neutral': { color: 'bg-gray-500', icon: Minus },
  'Negative': { color: 'bg-red-500', icon: TrendingDown },
  'Extremely Negative': { color: 'bg-red-600', icon: TrendingDown }
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ news }) => {
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>News Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {news.map((item) => {
            const config = sentimentConfig[item.sentiment]
            const Icon = config.icon
            
            return (
              <div key={item.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    
                    <div className="flex items-center gap-4 mt-3">
                      <Badge className={cn(config.color, "text-white")}>
                        <Icon className="h-3 w-3 mr-1" />
                        {item.sentiment}
                      </Badge>
                      
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimestamp(item.timestamp)}
                      </div>
                      
                      {item.source && (
                        <span className="text-xs text-muted-foreground">
                          {item.source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}