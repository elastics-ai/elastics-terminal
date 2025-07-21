'use client'

import { useQuery } from '@tanstack/react-query'
import { portfolioAPI } from '@/lib/api'
import { formatCurrency, formatPercentage, cn } from '@/lib/utils'
import { Bot } from 'lucide-react'
import { useQuickChat } from '@/hooks/useQuickChat'

export function PortfolioValueCards() {
  const { openChatWith } = useQuickChat()
  const { data, isLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: portfolioAPI.getSummary,
    refetchInterval: 5000,
  })

  const cards = [
    {
      label: 'Portfolio Value',
      value: data?.total_value || 2540300,
      format: 'currency',
      change: 34000,
      changeLabel: '$34,000',
      percentage: 1.36,
    },
    {
      label: 'Cumulative PnL',
      value: data?.total_pnl || 1524180,
      format: 'currency',
      change: 54000,
      changeLabel: '$54,000',
      percentage: 3.68,
    },
    {
      label: 'Cumulative Return',
      value: 60,
      format: 'percentage',
      change: 1.53,
      changeLabel: '1.53%',
    },
    {
      label: 'Annual Return',
      value: 14,
      format: 'percentage',
      change: 0.53,
      changeLabel: '0.53%',
    },
  ]

  return (
    <div className="relative">
      {/* Ask AI Button */}
      <button
        onClick={() => openChatWith("Analyze my portfolio performance and provide insights")}
        className="absolute -top-2 -right-2 flex items-center gap-1.5 px-3 py-1.5 
                   bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-full
                   shadow-lg transition-all hover:scale-105 z-10"
      >
        <Bot className="w-3.5 h-3.5" />
        Ask AI the about portfolio
      </button>

      <div className="grid grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg p-6 shadow-sm border border-border">
            <p className="text-sm text-muted-foreground mb-2">{card.label}</p>
          <div className="flex items-baseline gap-3">
            <p className="text-3xl font-semibold">
              {card.format === 'currency' 
                ? formatCurrency(card.value)
                : `+${card.value}%`
              }
            </p>
            {card.percentage && (
              <span className={cn(
                "text-sm font-medium",
                card.percentage >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {card.percentage >= 0 ? '+' : ''}{card.percentage}%
              </span>
            )}
          </div>
          {card.changeLabel && (
            <p className="text-sm text-muted-foreground mt-2">
              24h: <span className={cn(
                "font-medium",
                card.change >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {card.change >= 0 ? '+' : ''}{card.changeLabel}
              </span>
            </p>
          )}
        </div>
      ))}
      </div>
    </div>
  )
}