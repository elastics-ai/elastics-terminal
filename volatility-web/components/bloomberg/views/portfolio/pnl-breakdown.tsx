'use client'

import { useQuery } from '@tanstack/react-query'
import { portfolioAPI } from '@/lib/api'
import { formatCurrency, getColorForValue } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function PnLBreakdown() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pnl-breakdown'],
    queryFn: portfolioAPI.getPnLBreakdown,
    refetchInterval: 5000,
  })

  if (isLoading) {
    return (
      <div className="border border-bloomberg-amber/50 p-4">
        <h3 className="text-lg font-bold mb-4">P&L BREAKDOWN</h3>
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-bloomberg-amber/50 p-4">
        <h3 className="text-lg font-bold mb-4">P&L BREAKDOWN</h3>
        <div className="text-negative">Error loading data</div>
      </div>
    )
  }

  return (
    <div className="border border-bloomberg-amber/50 p-4">
      <h3 className="text-lg font-bold mb-4">P&L BREAKDOWN</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Options:</span>
          <span className={cn("font-bold", getColorForValue(data?.options || 0))}>
            {formatCurrency(data?.options || 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Futures:</span>
          <span className={cn("font-bold", getColorForValue(data?.futures || 0))}>
            {formatCurrency(data?.futures || 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Spot:</span>
          <span className={cn("font-bold", getColorForValue(data?.spot || 0))}>
            {formatCurrency(data?.spot || 0)}
          </span>
        </div>
        <div className="border-t border-bloomberg-amber/30 pt-2 mt-2">
          <div className="flex justify-between">
            <span className="font-bold">Total P&L:</span>
            <span className={cn("font-bold", getColorForValue(data?.total || 0))}>
              {formatCurrency(data?.total || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}