'use client'

import { useState } from 'react'
import { AppLayout } from "@/components/layout/app-layout"
import { MarketSearchBar } from "@/components/bloomberg/views/polymarket/market-search-bar"
import { MarketsTable } from "@/components/bloomberg/views/polymarket/markets-table"
import { MarketDetailsModal } from "@/components/bloomberg/views/polymarket/market-details-modal"

export default function PolymarketPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMarket, setSelectedMarket] = useState<any>(null)

  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Polymarket</h1>
        </div>
        <div className="space-y-6">
        <div className="border border-bloomberg-amber/50 p-4">
          <h2 className="text-xl font-bold mb-2">PREDICTION MARKETS</h2>
          <p className="text-sm text-bloomberg-amber/70">
            Real-time crypto prediction market data from Polymarket
          </p>
        </div>

        <MarketSearchBar 
          value={searchTerm}
          onChange={setSearchTerm}
        />

        <MarketsTable 
          searchTerm={searchTerm}
          onSelectMarket={setSelectedMarket}
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