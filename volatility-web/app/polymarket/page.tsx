'use client'

import { useState } from 'react'
import { AppLayout } from "@/components/layout/app-layout"
import { MarketSearchBar } from "@/components/bloomberg/views/polymarket/market-search-bar"
import { MarketsTable } from "@/components/bloomberg/views/polymarket/markets-table"
import { MarketDetailsModal } from "@/components/bloomberg/views/polymarket/market-details-modal"

export default function PolymarketPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showVolatility, setShowVolatility] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<{
    id: string;
    question: string;
    description?: string;
    [key: string]: unknown;
  } | null>(null)

  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Prediction Markets</h1>
          <p className="text-muted-foreground mt-1">
            Real-time prediction market data from Polymarket
          </p>
        </div>
        <div className="space-y-6">
          <div className="border border-border p-4 rounded-lg bg-muted/20">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h2 className="text-xl font-bold">PREDICTION MARKETS</h2>
                <p className="text-sm text-muted-foreground">
                  Browse and analyze prediction markets with real-time pricing and volume data
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Volatility Analysis</label>
                <button
                  onClick={() => setShowVolatility(!showVolatility)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    showVolatility ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showVolatility ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <MarketSearchBar 
            value={searchTerm}
            onChange={setSearchTerm}
          />

          <MarketsTable 
            searchTerm={searchTerm}
            onSelectMarket={setSelectedMarket}
            showVolatility={showVolatility}
          />

          {selectedMarket && (
            <MarketDetailsModal
              market={selectedMarket}
              onClose={() => setSelectedMarket(null)}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
}