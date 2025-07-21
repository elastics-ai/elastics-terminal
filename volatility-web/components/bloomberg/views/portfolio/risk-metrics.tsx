'use client'

import { useQuery } from '@tanstack/react-query'
import { portfolioAPI } from '@/lib/api'
import { formatNumber, getColorForValue } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function RiskMetrics() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio-summary'],
    queryFn: portfolioAPI.getSummary,
    refetchInterval: 5000,
  })

  if (isLoading) {
    return (
      <div className="border border-bloomberg-amber/50 p-4">
        <h3 className="text-lg font-bold mb-4">RISK METRICS</h3>
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-bloomberg-amber/50 p-4">
        <h3 className="text-lg font-bold mb-4">RISK METRICS</h3>
        <div className="text-negative">Error loading data</div>
      </div>
    )
  }

  return (
    <div className="border border-bloomberg-amber/50 p-4">
      <h3 className="text-lg font-bold mb-4">RISK METRICS</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Net Delta:</span>
          <span className={cn("font-bold", getColorForValue(data?.net_delta || 0))}>
            {formatNumber(data?.net_delta || 0, 2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Absolute Delta:</span>
          <span className="font-bold text-amber">
            {formatNumber(data?.absolute_delta || 0, 2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Gamma:</span>
          <span className="font-bold">
            {formatNumber(data?.gamma || 0, 4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Vega:</span>
          <span className="font-bold">
            {formatNumber(data?.vega || 0, 2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Theta:</span>
          <span className={cn("font-bold", data?.theta < 0 ? "text-negative" : "text-positive")}>
            {formatNumber(data?.theta || 0, 2)}
          </span>
        </div>
      </div>
    </div>
  )
}