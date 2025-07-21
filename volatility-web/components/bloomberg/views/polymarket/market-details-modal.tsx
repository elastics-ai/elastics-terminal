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
        className="bg-black border border-bloomberg-amber p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">MARKET DETAILS</h2>
          <button
            onClick={onClose}
            className="text-bloomberg-amber hover:text-bloomberg-amber/80"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm text-bloomberg-amber/70 mb-1">QUESTION</h3>
            <p className="text-lg">{market.question}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-bloomberg-amber/30 p-4">
              <h4 className="text-sm text-bloomberg-amber/70 mb-2">YES</h4>
              <div className="text-2xl font-bold text-positive">
                {formatNumber(market.yes_percentage, 1)}%
              </div>
            </div>
            <div className="border border-bloomberg-amber/30 p-4">
              <h4 className="text-sm text-bloomberg-amber/70 mb-2">NO</h4>
              <div className="text-2xl font-bold text-negative">
                {formatNumber(market.no_percentage, 1)}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-bloomberg-amber/70">Volume:</span>
              <span className="ml-2 font-bold text-yellow-400">
                {formatCurrency(market.volume)}
              </span>
            </div>
            <div>
              <span className="text-bloomberg-amber/70">Category:</span>
              <span className="ml-2 font-bold text-info">{market.category}</span>
            </div>
            <div>
              <span className="text-bloomberg-amber/70">End Date:</span>
              <span className="ml-2 font-bold">
                <FormattedTime timestamp={new Date(market.end_date)} format="date" fallback="--/--/--" />
              </span>
            </div>
            <div>
              <span className="text-bloomberg-amber/70">Status:</span>
              <span className="ml-2 font-bold">
                {market.active ? "ACTIVE" : "CLOSED"}
              </span>
            </div>
          </div>

          {market.tags && market.tags.length > 0 && (
            <div>
              <h4 className="text-sm text-bloomberg-amber/70 mb-2">TAGS</h4>
              <div className="flex flex-wrap gap-2">
                {market.tags.map((tag: string, index: number) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs border border-bloomberg-amber/50 text-bloomberg-amber"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {market.description && (
            <div>
              <h4 className="text-sm text-bloomberg-amber/70 mb-2">DESCRIPTION</h4>
              <p className="text-sm">{market.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}