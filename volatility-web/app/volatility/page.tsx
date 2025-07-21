'use client'

import { useState } from 'react'
import { AppLayout } from "@/components/layout/app-layout"
import { VolatilitySurfaceChart } from "@/components/bloomberg/views/volatility/volatility-surface-chart"
import { VolatilityHeatmap } from "@/components/bloomberg/views/volatility/volatility-heatmap"
import { IVSliceChart } from "@/components/bloomberg/views/volatility/iv-slice-chart"
import { VolatilityStats } from "@/components/bloomberg/views/volatility/volatility-stats"

export default function VolatilityPage() {
  const [viewMode, setViewMode] = useState<'3d' | 'heatmap'>('3d')
  const [sliceType, setSliceType] = useState<'strike' | 'time'>('strike')
  const [selectedStrike, setSelectedStrike] = useState<number>(1.0)
  const [selectedExpiry, setSelectedExpiry] = useState<number>(30)

  return (
    <AppLayout>
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Volatility Surface</h1>
        </div>
        <div className="space-y-6">
        {/* View Mode Toggle */}
        <div className="border border-bloomberg-amber/50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">IMPLIED VOLATILITY SURFACE</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('3d')}
                className={`px-4 py-2 border ${
                  viewMode === '3d' 
                    ? 'border-bloomberg-amber bg-bloomberg-amber/20' 
                    : 'border-bloomberg-amber/50'
                }`}
              >
                3D VIEW
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-4 py-2 border ${
                  viewMode === 'heatmap' 
                    ? 'border-bloomberg-amber bg-bloomberg-amber/20' 
                    : 'border-bloomberg-amber/50'
                }`}
              >
                HEATMAP
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Surface View - spans 2 columns */}
          <div className="lg:col-span-2">
            {viewMode === '3d' ? (
              <VolatilitySurfaceChart />
            ) : (
              <VolatilityHeatmap 
                onSelectCell={(strike, expiry) => {
                  setSelectedStrike(strike)
                  setSelectedExpiry(expiry)
                }}
              />
            )}
          </div>

          {/* Stats Panel */}
          <VolatilityStats />

          {/* IV Slice View - full width */}
          <div className="lg:col-span-3">
            <IVSliceChart
              sliceType={sliceType}
              selectedStrike={selectedStrike}
              selectedExpiry={selectedExpiry}
              onToggleSliceType={() => setSliceType(sliceType === 'strike' ? 'time' : 'strike')}
            />
          </div>
        </div>
        </div>
      </div>
    </AppLayout>
  )
}