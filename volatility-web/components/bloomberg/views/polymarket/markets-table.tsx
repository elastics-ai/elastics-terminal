'use client'

import { useQuery } from '@tanstack/react-query'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { polymarketAPI } from '@/lib/api'
import { FormattedTime } from '@/components/ui/formatted-time'

interface MarketsTableProps {
  searchTerm: string
  onSelectMarket: (market: any) => void
}

export function MarketsTable({ searchTerm, onSelectMarket }: MarketsTableProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['polymarket-markets', searchTerm],
    queryFn: () => polymarketAPI.getMarkets(searchTerm),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <div className="border border-bloomberg-amber/50 p-4">
        <h3 className="text-lg font-bold mb-4">ACTIVE MARKETS</h3>
        <div className="animate-pulse">Loading markets...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-bloomberg-amber/50 p-4">
        <h3 className="text-lg font-bold mb-4">ACTIVE MARKETS</h3>
        <div className="text-negative">Error loading markets</div>
      </div>
    )
  }

  const markets = data?.markets || []

  return (
    <div className="border border-bloomberg-amber/50 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">ACTIVE MARKETS</h3>
        <div className="text-sm text-bloomberg-amber/70">
          {markets.length} markets • Last update: <FormattedTime timestamp={new Date(data?.last_update || Date.now())} format="time" fallback="--:--:--" />
          {data?.is_mock && " (Demo Data)"}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bloomberg-amber/30">
              <th className="text-left py-2 px-2">Question</th>
              <th className="text-center py-2 px-2">Yes %</th>
              <th className="text-center py-2 px-2">No %</th>
              <th className="text-right py-2 px-2">Volume</th>
              <th className="text-center py-2 px-2">End Date</th>
              <th className="text-center py-2 px-2">Category</th>
              <th className="text-center py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market, index) => (
              <tr 
                key={market.id || index}
                onClick={() => onSelectMarket(market)}
                className="border-b border-bloomberg-amber/10 hover:bg-bloomberg-amber/10 cursor-pointer"
              >
                <td className="py-2 px-2">
                  <div className="max-w-md truncate">{market.question}</div>
                </td>
                <td className={cn(
                  "text-center py-2 px-2 font-bold",
                  market.yes_percentage > 50 ? "text-positive" : ""
                )}>
                  {formatNumber(market.yes_percentage, 1)}%
                </td>
                <td className={cn(
                  "text-center py-2 px-2 font-bold",
                  market.no_percentage > 50 ? "text-negative" : ""
                )}>
                  {formatNumber(market.no_percentage, 1)}%
                </td>
                <td className="text-right py-2 px-2 text-yellow-400">
                  {formatCurrency(market.volume)}
                </td>
                <td className="text-center py-2 px-2 text-sm">
                  <FormattedTime timestamp={new Date(market.end_date)} format="date" fallback="--/--/--" />
                </td>
                <td className="text-center py-2 px-2">
                  <span className="text-info">{market.category}</span>
                </td>
                <td className="text-center py-2 px-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded",
                    market.active ? "bg-positive/20 text-positive" : "bg-bloomberg-amber/20 text-bloomberg-amber"
                  )}>
                    {market.active ? "ACTIVE" : "CLOSED"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {markets.length === 0 && (
          <div className="text-center py-8 text-bloomberg-amber/50">
            {searchTerm ? "No markets found matching your search" : "No active markets"}
          </div>
        )}
      </div>
    </div>
  )
}