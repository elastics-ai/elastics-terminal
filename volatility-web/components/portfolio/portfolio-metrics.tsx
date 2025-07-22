'use client'

import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  change?: number
  changeType?: 'percentage' | 'absolute'
}

function MetricCard({ label, value, change, changeType = 'percentage' }: MetricCardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0
  const isNeutral = !change || change === 0

  const Icon = isPositive ? ArrowUp : isNegative ? ArrowDown : Minus

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold">{value}</span>
        {change !== undefined && (
          <div className={cn(
            "flex items-center gap-0.5 text-sm font-medium",
            isPositive && "text-green-600",
            isNegative && "text-red-600",
            isNeutral && "text-gray-500"
          )}>
            <Icon className="h-3 w-3" />
            <span>
              {Math.abs(change)}{changeType === 'percentage' ? '%' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function PortfolioMetrics() {
  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-2xl font-semibold">Portfolio</h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Active Strategies</span>
              <span className="text-lg font-semibold text-primary">1</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <MetricCard label="Total Returns" value="+18.7%" change={18.7} />
          <MetricCard label="Cumulative Return" value="+60%" change={60} />
          <MetricCard label="Annual Return" value="+14%" change={14} />
          <MetricCard label="Max Drawdown" value="-26%" change={-26} />
          <MetricCard label="Annual Volatility" value="38%" />
          <MetricCard label="Annual Volatility" value="38%" />
        </div>
      </div>
    </div>
  )
}