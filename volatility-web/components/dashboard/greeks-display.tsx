'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

export function GreeksDisplay() {
  const greeks = [
    {
      label: 'Alpha',
      value: 0.15,
      change: 0.02,
      changeLabel: '0.02',
    },
    {
      label: 'Beta',
      value: 0.46,
      change: 0.02,
      changeLabel: '0.02',
    },
    {
      label: 'cvxR 95%',
      value: '$152,492',
      change: 0.02,
      changeLabel: '0.02',
      isMonetary: true,
    },
    {
      label: 'Sharpe Ratio',
      value: 0.46,
      change: 0.03,
      changeLabel: '0.03%',
    },
    {
      label: 'Calmar Ratio',
      value: 0.46,
      change: 0.02,
      changeLabel: '0.02',
    },
    {
      label: 'Sortino Ratio',
      value: 0.46,
      change: 0.02,
      changeLabel: '0.02',
    },
  ]

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="grid grid-cols-6 gap-6">
        {greeks.map((greek, index) => (
          <div key={index} className="space-y-1">
            <p className="metric-label">{greek.label}</p>
            <p className="metric-value">
              {greek.isMonetary ? greek.value : greek.value}
            </p>
            <div className={cn(
              "metric-change",
              greek.change >= 0 ? "text-[hsl(var(--positive))]" : "text-[hsl(var(--negative))]"
            )}>
              <span className="text-[10px] text-muted-foreground">24h</span>
              {greek.change >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{greek.change >= 0 ? '+' : ''}{greek.changeLabel}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}