'use client'

import { useQuery } from '@tanstack/react-query'
import { portfolioAPI } from '@/lib/api'
import { formatCurrency, formatPercentage, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function PortfolioOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: portfolioAPI.getSummary,
    refetchInterval: 5000,
  })

  const metrics = [
    {
      label: 'Portfolio Value',
      value: data?.total_value || 0,
      format: 'currency',
      change: null,
    },
    {
      label: 'Cumulative PnL',
      value: data?.total_pnl || 0,
      format: 'currency',
      change: data?.total_pnl_percentage || 0,
    },
    {
      label: 'Cumulative Return',
      value: data?.total_pnl_percentage || 0,
      format: 'percentage',
      change: 1.53, // Mock data
    },
    {
      label: 'Annual Return',
      value: 14, // Mock data
      format: 'percentage',
      change: 0.53, // Mock data
    },
    {
      label: 'Max Drawdown',
      value: -26,
      format: 'percentage',
      change: 0.00,
    },
    {
      label: 'Annual Volatility',
      value: 38,
      format: 'percentage',
      change: 0.02,
    },
  ]

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold mb-4">Portfolio Overview</h2>
      
      <div className="grid grid-cols-6 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="space-y-2">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="text-2xl font-semibold">
              {metric.format === 'currency' 
                ? formatCurrency(metric.value)
                : `${metric.value >= 0 ? '+' : ''}${metric.value}%`
              }
            </p>
            {metric.change !== null && (
              <div className={cn(
                "flex items-center gap-1 text-sm",
                metric.change >= 0 ? "text-positive" : "text-negative"
              )}>
                {metric.change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{formatPercentage(metric.change)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}