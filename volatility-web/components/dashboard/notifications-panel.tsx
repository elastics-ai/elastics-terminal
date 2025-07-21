'use client'

import { Twitter } from 'lucide-react'
import { cn } from '@/lib/utils'

const notifications = [
  {
    id: 1,
    type: 'critical',
    label: 'Critical',
    title: 'Pair Trading Strategy',
    subtitle: 'IT triggered • 7h ago',
    source: '@crypto_quant_ai',
    avatar: '/avatars/crypto_quant.jpg',
    content: 'Volatility surface flattening + funding negative. Expecting reversion to $67k before next leg.'
  },
  {
    id: 2,
    type: 'critical',
    label: 'Critical',
    title: 'Event-driven Strategy',
    subtitle: 'IT triggered • 1d ago',
    source: '@crypto_quant_ai',
    avatar: '/avatars/crypto_quant.jpg',
    content: 'Volatility surface flattening + funding negative. Expecting reversion to $67k before next leg.'
  },
  {
    id: 3,
    type: 'critical',
    label: 'Critical',
    title: 'Pair Trading Strategy',
    subtitle: 'IT triggered • 7h ago',
    source: '@crypto_quant_ai',
    avatar: '/avatars/crypto_quant.jpg',
    content: 'Volatility surface flattening + funding negative. Expecting reversion to $67k before next leg.'
  },
  {
    id: 4,
    type: 'info',
    label: 'Info',
    title: 'Event-driven Strategy',
    subtitle: 'IT triggered • 1d ago',
    source: '@crypto_quant_ai',
    avatar: '/avatars/crypto_quant.jpg',
    content: 'Volatility surface flattening + funding negative. Expecting reversion to $67k before next leg.'
  },
]

export function NotificationsPanel() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Notifications</h3>
          <span className="text-xs bg-gray-900 text-white px-2 py-1 rounded">1</span>
        </div>
      </div>

      <div className="divide-y divide-border">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <span className={cn(
                "status-badge text-[10px] px-2 py-0.5",
                notification.type === 'critical' ? "status-critical" : "status-info"
              )}>
                {notification.label}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold">{notification.title}</h4>
                <p className="text-xs text-gray-500 mb-2">{notification.subtitle}</p>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gray-300"></div>
                    <span className="text-xs font-medium">{notification.source}</span>
                    <Twitter className="w-3 h-3 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {notification.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 text-center border-t border-border">
        <a href="#" className="text-sm text-blue-600 hover:underline">
          See All
        </a>
      </div>
    </div>
  )
}