'use client'

import { useQuery } from '@tanstack/react-query'
import { portfolioAPI } from '@/lib/api'
import { formatCurrency, formatPercentage, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function PortfolioValueCards() {
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
      change: null,
      changeLabel: null,
    },
    {
      label: 'Cumulative PnL',
      value: data?.total_pnl || 1524180,
      format: 'currency',
      change: 54000,
      changeLabel: '$54,000',
      percentage: 1.53,
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
    <div className="grid grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div key={index} className="metric-card">
          <p className="metric-label">{card.label}</p>
          <p className="metric-value">
            {card.format === 'currency' 
              ? formatCurrency(card.value)
              : `+${card.value}%`
            }
          </p>
          {card.percentage && (
            <p className={cn("text-sm", card.percentage >= 0 ? "text-[hsl(var(--positive))]" : "text-[hsl(var(--negative))]")}>
              {card.percentage >= 0 ? '+' : ''}{card.percentage}%
            </p>
          )}
          {card.change !== null && (
            <div className={cn(
              "metric-change",
              card.change >= 0 ? "text-[hsl(var(--positive))]" : "text-[hsl(var(--negative))]"
            )}>
              {card.change >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{card.changeLabel}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}