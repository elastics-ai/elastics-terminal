'use client'

import { cn } from '@/lib/utils'

export function RiskMetrics() {
  const metrics = [
    {
      label: 'Max Drawdown',
      value: -26,
      change: 0.00,
      changeLabel: '0.00',
    },
    {
      label: 'Annual Volatility',
      value: 38,
      change: 0.02,
      changeLabel: '0.02',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric, index) => (
        <div key={index} className="metric-card">
          <p className="metric-label">{metric.label}</p>
          <p className={cn(
            "metric-value",
            metric.value < 0 ? "text-[hsl(var(--negative))]" : ""
          )}>
            {metric.value}%
          </p>
          <div className={cn(
            "metric-change",
            metric.change >= 0 ? "text-[hsl(var(--positive))]" : "text-[hsl(var(--negative))]"
          )}>
            <span className="text-[10px]">24h</span>
            <span>{metric.change >= 0 ? '+' : ''}{metric.changeLabel}</span>
          </div>
        </div>
      ))}
    </div>
  )
}