'use client'

import { useQuery } from '@tanstack/react-query'
import { portfolioAPI } from '@/lib/api'
import { formatCurrency, formatPercentage, getColorForValue } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { FormattedTime } from '@/components/ui/formatted-time'

export function PortfolioSummary() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: portfolioAPI.getSummary,
    refetchInterval: 5000,
  })

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Summary</h3>
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">Portfolio Summary</h3>
        <div className="text-negative">Error loading data</div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold mb-4">Portfolio Summary</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Positions</span>
          <span className="font-medium">{data?.total_positions || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total Value</span>
          <span className="font-medium">{formatCurrency(data?.total_value || 0)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Total P&L</span>
          <span className={cn("font-medium", getColorForValue(data?.total_pnl || 0))}>
            {formatCurrency(data?.total_pnl || 0)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">P&L %</span>
          <span className={cn("font-medium", getColorForValue(data?.total_pnl_percentage || 0))}>
            {formatPercentage(data?.total_pnl_percentage || 0)}
          </span>
        </div>
        <div className="pt-3 border-t text-xs text-muted-foreground">
          Last Update: {data?.last_update ? (
            <FormattedTime timestamp={new Date(data.last_update)} format="time" fallback="--:--:--" />
          ) : 'N/A'}
        </div>
      </div>
    </div>
  )
}