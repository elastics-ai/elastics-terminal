import React from 'react';
import { Calendar, TrendingUp, AlertCircle, Info } from 'lucide-react';

interface NewsItem {
  id: string;
  type: 'economic' | 'market' | 'news';
  title: string;
  source?: string;
  time?: string;
  impact?: 'high' | 'medium' | 'low';
}

interface NewsFeedProps {
  items?: NewsItem[];
}

const mockNewsItems: NewsItem[] = [
  {
    id: '1',
    type: 'economic',
    title: 'US GDP Growth Data',
    time: 'In 2 hours',
    impact: 'high'
  },
  {
    id: '2',
    type: 'market',
    title: 'Stocks Climb on Dovish Powell Remarks',
    source: 'Wall Street Journal',
    time: '15m ago',
    impact: 'medium'
  },
  {
    id: '3',
    type: 'news',
    title: 'The Financial Times',
    source: 'Oracle Volatility Spikes as Bitcoin Falls Below $100K',
    time: '38m ago',
    impact: 'medium'
  }
];

export function NewsFeed({ items = mockNewsItems }: NewsFeedProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'economic':
        return <Calendar className="w-4 h-4" />;
      case 'market':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getImpactColor = (impact?: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="elastics-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">News Feed</h3>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          See All
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
            <div className={`p-2 rounded-lg ${getImpactColor(item.impact)}`}>
              {getIcon(item.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {item.type === 'economic' ? item.title : item.source}
              </h4>
              {item.type !== 'economic' && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {item.title}
                </p>
              )}
              {item.time && (
                <p className="text-xs text-gray-500 mt-1">{item.time}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <button className="w-full py-2 text-center text-sm font-medium text-blue-600 hover:text-blue-700 rounded-lg hover:bg-gray-50 transition-colors">
          View All News
        </button>
      </div>
    </div>
  );
}