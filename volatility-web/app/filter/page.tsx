'use client'

import { AppLayout } from "@/components/layout/app-layout"
import { PriceDisplay } from "@/components/bloomberg/views/filter/price-display"
import { VolatilityChart } from "@/components/bloomberg/views/filter/volatility-chart"
import { VolatilityLiveSurface } from "@/components/bloomberg/views/filter/volatility-live-surface"
import { AlertsPanel } from "@/components/bloomberg/views/filter/alerts-panel"

export default function FilterPage() {
  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Volatility Filter</h1>
          <p className="text-muted-foreground mt-1">
            Real-time volatility monitoring and analysis
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Top Section: Price and Volatility Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Price Display - spans 1 column */}
            <PriceDisplay />
            
            {/* Volatility Chart - spans 2 columns */}
            <div className="lg:col-span-2">
              <VolatilityChart />
            </div>
          </div>
          
          {/* Middle Section: Live Volatility Surface - full width */}
          <VolatilityLiveSurface />
          
          {/* Bottom Section: Alerts Panel - full width */}
          <AlertsPanel />
        </div>
      </div>
    </AppLayout>
  )
}