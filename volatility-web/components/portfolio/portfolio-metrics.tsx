'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  prefix?: string
  suffix?: string
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  prefix = '',
  suffix = '',
  trend,
  className
}) => {
  const getTrendIcon = () => {
    if (trend === 'up' || (change && change > 0)) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (trend === 'down' || (change && change < 0)) {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return null
  }

  const formatValue = () => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value)
    }
    return value
  }

  return (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold">
            {prefix}{formatValue()}{suffix}
          </span>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className={cn(
                "text-sm font-medium",
                change > 0 ? "text-green-500" : change < 0 ? "text-red-500" : "text-gray-500"
              )}>
                {change > 0 ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface PortfolioMetricsProps {
  totalValue: number
  cumulativePnL: number
  cumulativeReturn: number
  annualReturn: number
  maxDrawdown: number
  annualVolatility: number
  sharpeRatio?: number
  sortinoRatio?: number
}

export const PortfolioMetrics: React.FC<PortfolioMetricsProps> = ({
  totalValue,
  cumulativePnL,
  cumulativeReturn,
  annualReturn,
  maxDrawdown,
  annualVolatility,
  sharpeRatio,
  sortinoRatio
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        title="Portfolio Value"
        value={totalValue}
        prefix="$"
        change={cumulativeReturn * 100}
      />
      <MetricCard
        title="Cumulative PnL"
        value={cumulativePnL}
        prefix={cumulativePnL >= 0 ? '+$' : '-$'}
        trend={cumulativePnL >= 0 ? 'up' : 'down'}
      />
      <MetricCard
        title="Cumulative Return"
        value={cumulativeReturn * 100}
        prefix={cumulativeReturn >= 0 ? '+' : ''}
        suffix="%"
        trend={cumulativeReturn >= 0 ? 'up' : 'down'}
      />
      <MetricCard
        title="Annual Return"
        value={annualReturn * 100}
        prefix={annualReturn >= 0 ? '+' : ''}
        suffix="%"
        trend={annualReturn >= 0 ? 'up' : 'down'}
      />
      <MetricCard
        title="Max Drawdown"
        value={Math.abs(maxDrawdown * 100)}
        prefix="-"
        suffix="%"
        trend="down"
      />
      <MetricCard
        title="Annual Volatility"
        value={annualVolatility * 100}
        suffix="%"
      />
      {sharpeRatio !== undefined && (
        <MetricCard
          title="Sharpe Ratio"
          value={sharpeRatio.toFixed(2)}
        />
      )}
      {sortinoRatio !== undefined && (
        <MetricCard
          title="Sortino Ratio"
          value={sortinoRatio.toFixed(2)}
        />
      )}
    </div>
  )
}
