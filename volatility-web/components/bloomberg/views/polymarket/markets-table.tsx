'use client'

import { useQuery } from '@tanstack/react-query'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { polymarketAPI } from '@/lib/api'
import { FormattedTime } from '@/components/ui/formatted-time'

interface MarketsTableProps {
  searchTerm: string
  onSelectMarket: (market: any) => void
  showVolatility?: boolean
}

export function MarketsTable({ searchTerm, onSelectMarket, showVolatility = false }: MarketsTableProps) {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['polymarket-markets', searchTerm, showVolatility],
    queryFn: async () => {
      try {
        let result
        if (showVolatility) {
          result = await polymarketAPI.getVolatility(searchTerm)
          console.log('Polymarket volatility API response:', result) // Debug log
        } else {
          result = await polymarketAPI.getMarkets(searchTerm)
          console.log('Polymarket API response:', result) // Debug log
        }
        return result
      } catch (err) {
        console.error('Polymarket API error:', err)
        throw err
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: process.env.NODE_ENV === 'test' ? false : 3, // No retries in test environment
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 10000, // Consider data stale after 10 seconds
    cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  if (isLoading) {
    return (
      <div className="border border-border p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">ACTIVE MARKETS</h3>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
        
        {/* Skeleton table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Question</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Yes %</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">No %</th>
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Volume</th>
                {showVolatility && (
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">IV %</th>
                )}
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">End Date</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Category</th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, index) => (
                <tr key={index} className="border-b border-border/50">
                  <td className="py-2 px-2">
                    <div className="h-4 bg-muted rounded animate-pulse max-w-md"></div>
                  </td>
                  <td className="text-center py-2 px-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-12 mx-auto"></div>
                  </td>
                  <td className="text-center py-2 px-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-12 mx-auto"></div>
                  </td>
                  <td className="text-right py-2 px-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-20 ml-auto"></div>
                  </td>
                  {showVolatility && (
                    <td className="text-center py-2 px-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-12 mx-auto"></div>
                    </td>
                  )}
                  <td className="text-center py-2 px-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-16 mx-auto"></div>
                  </td>
                  <td className="text-center py-2 px-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-16 mx-auto"></div>
                  </td>
                  <td className="text-center py-2 px-2">
                    <div className="h-6 bg-muted rounded-full animate-pulse w-16 mx-auto"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (error) {
    console.error('Query error:', error)
    return (
      <div className="border border-border/50 p-4">
        <h3 className="text-lg font-bold mb-4">ACTIVE MARKETS</h3>
        <div className="space-y-4">
          <div className="text-destructive">
            Error loading markets: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
          <div className="text-sm text-muted-foreground">
            This could be due to network issues or the API being temporarily unavailable.
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRefetching ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Retrying...
              </span>
            ) : (
              'Try Again'
            )}
          </button>
        </div>
      </div>
    )
  }

  const markets = data?.markets || []

  return (
    <div className="border border-border p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">ACTIVE MARKETS</h3>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {isRefetching && (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-muted-foreground"></div>
          )}
          {markets.length} markets • Last update: <FormattedTime timestamp={new Date(data?.last_update || Date.now())} format="time" fallback="--:--:--" />
          {data?.is_mock && " (Demo Data)"}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium text-muted-foreground">Question</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">Yes %</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">No %</th>
              <th className="text-right py-2 px-2 font-medium text-muted-foreground">Volume</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">End Date</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">Category</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {markets.map((market, index) => (
              <tr 
                key={market.id || index}
                onClick={() => onSelectMarket(market)}
                className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <td className="py-2 px-2">
                  <div className="max-w-md truncate font-medium">{market.question}</div>
                </td>
                <td className={cn(
                  "text-center py-2 px-2 font-bold",
                  market.yes_percentage > 50 ? "text-green-600 dark:text-green-400" : "text-foreground"
                )}>
                  {formatNumber(market.yes_percentage, 1)}%
                </td>
                <td className={cn(
                  "text-center py-2 px-2 font-bold",
                  market.no_percentage > 50 ? "text-red-600 dark:text-red-400" : "text-foreground"
                )}>
                  {formatNumber(market.no_percentage, 1)}%
                </td>
                <td className="text-right py-2 px-2 text-blue-600 dark:text-blue-400 font-medium">
                  {formatCurrency(market.volume)}
                </td>
                {showVolatility && (
                  <td className="text-center py-2 px-2">
                    {market.implied_volatility_pct !== undefined ? (
                      <span className={cn(
                        "font-bold",
                        market.implied_volatility_pct > 60 ? "text-red-600 dark:text-red-400" :
                        market.implied_volatility_pct > 40 ? "text-orange-600 dark:text-orange-400" :
                        market.implied_volatility_pct > 30 ? "text-yellow-600 dark:text-yellow-400" :
                        "text-green-600 dark:text-green-400"
                      )}>
                        {formatNumber(market.implied_volatility_pct, 1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">N/A</span>
                    )}
                  </td>
                )}
                <td className="text-center py-2 px-2 text-sm text-muted-foreground">
                  <FormattedTime timestamp={new Date(market.end_date)} format="date" fallback="--/--/--" />
                </td>
                <td className="text-center py-2 px-2">
                  <span className="text-blue-600 dark:text-blue-400 font-medium">{market.category}</span>
                </td>
                <td className="text-center py-2 px-2">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    market.active 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  )}>
                    {market.active ? "ACTIVE" : "CLOSED"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {markets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "No markets found matching your search" : "No active markets"}
          </div>
        )}
      </div>
    </div>
  )
}