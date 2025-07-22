'use client'

import { ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  change?: number
  isPercentage?: boolean
}

function MetricCard({ label, value, change, isPercentage }: MetricCardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground mb-1">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-semibold">{value}</span>
        {change !== undefined && (
          <div className={cn(
            "flex items-center text-xs",
            isPositive && "text-success",
            isNegative && "text-destructive"
          )}>
            {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            <span>
              {isPositive ? '+' : ''}{change.toFixed(2)}{isPercentage ? '%' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export function MetricsHeader() {
  return (
    <div className="bg-card rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <span className="text-sm text-muted-foreground">
          Active Strategies: <span className="font-semibold">1</span>
        </span>
      </div>
      
      <div className="grid grid-cols-5 gap-6">
        <MetricCard label="Total Return" value="+18.7%" change={18.7} isPercentage />
        <MetricCard label="Cumulative Return" value="+60%" change={60} isPercentage />
        <MetricCard label="Annual Return" value="+14%" change={14} isPercentage />
        <MetricCard label="Max Drawdown" value="-26%" change={-26} isPercentage />
        <MetricCard label="Annual Volatility" value="38%" />
      </div>
    </div>
  )
}