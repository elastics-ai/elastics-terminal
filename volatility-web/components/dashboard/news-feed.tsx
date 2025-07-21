'use client'

import { Clock } from 'lucide-react'

const newsItems = [
  {
    id: 1,
    title: 'Economic Data',
    items: [
      { label: 'GDP Growth Q2Q3', value: '2.1%' },
      { label: 'Initial Jobless Claims', value: '250k' },  
      { label: 'Consumer Sentiment', value: '64.9' },
      { label: 'ISM Manufacturing Index', value: '50.1' },
    ]
  }
]

const headlines = [
  {
    id: 1,
    title: 'The Wall Street Journal',
    content: 'Stocks climb on dovish Powell remarks; tech and financials lead gains',
    time: '2 min ago',
  },
  {
    id: 2,
    title: 'The Financial Times', 
    content: 'Crypto Volatility Spikes as Bitcoin Falls Below $60K',
    time: '5 min ago',
  },
]

export function NewsFeed() {
  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold">News Feed</h3>
        <button className="text-xs text-primary hover:underline">See All</button>
      </div>

      {/* Economic Data Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <h4 className="text-xs font-medium text-muted-foreground">Economic Data</h4>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {newsItems[0].items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* News Headlines Section */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-3">News Headlines</h4>
        <div className="space-y-3">
          {headlines.map((headline) => (
            <div key={headline.id} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs font-medium text-primary mb-1">{headline.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{headline.content}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{headline.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}