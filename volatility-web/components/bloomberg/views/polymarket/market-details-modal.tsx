'use client'

import { formatNumber, formatCurrency } from '@/lib/utils'
import { FormattedTime } from '@/components/ui/formatted-time'

interface MarketDetailsModalProps {
  market: any
  onClose: () => void
}

export function MarketDetailsModal({ market, onClose }: MarketDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-background border border-border p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">MARKET DETAILS</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm text-muted-foreground mb-1 font-medium">QUESTION</h3>
            <p className="text-lg font-medium">{market.question}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border p-4 rounded-lg">
              <h4 className="text-sm text-muted-foreground mb-2 font-medium">YES</h4>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatNumber(market.yes_percentage, 1)}%
              </div>
            </div>
            <div className="border border-border p-4 rounded-lg">
              <h4 className="text-sm text-muted-foreground mb-2 font-medium">NO</h4>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatNumber(market.no_percentage, 1)}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Volume:</span>
              <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(market.volume)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Category:</span>
              <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">{market.category}</span>
            </div>
            <div>
              <span className="text-muted-foreground">End Date:</span>
              <span className="ml-2 font-bold">
                <FormattedTime timestamp={new Date(market.end_date)} format="date" fallback="--/--/--" />
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className={`ml-2 font-bold ${
                market.active 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>
                {market.active ? "ACTIVE" : "CLOSED"}
              </span>
            </div>
          </div>

          {market.tags && market.tags.length > 0 && (
            <div>
              <h4 className="text-sm text-muted-foreground mb-2 font-medium">TAGS</h4>
              <div className="flex flex-wrap gap-2">
                {market.tags.map((tag: string, index: number) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs border border-border text-foreground rounded-md bg-muted/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {market.description && (
            <div>
              <h4 className="text-sm text-muted-foreground mb-2 font-medium">DESCRIPTION</h4>
              <p className="text-sm text-foreground leading-relaxed">{market.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}