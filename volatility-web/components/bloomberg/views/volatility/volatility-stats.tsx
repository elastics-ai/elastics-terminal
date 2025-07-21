'use client'

import { useWebSocket } from '@/lib/websocket'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { FormattedTime } from '@/components/ui/formatted-time'

export function VolatilityStats() {
  const [stats, setStats] = useState({
    spotPrice: 0,
    atmVol: 0,
    skew25Delta: 0,
    optionsCount: 0,
    lastUpdate: new Date()
  })

  useWebSocket('vol_surface', (message) => {
    if (message?.data) {
      const data = message.data
      setStats({
        spotPrice: data.spot_price || 0,
        atmVol: data.atm_vol || 0,
        skew25Delta: data.skew_25_delta || 0,
        optionsCount: data.options_count || 0,
        lastUpdate: new Date(message.timestamp)
      })
    }
  })

  return (
    <div className="border border-bloomberg-amber/50 p-4 h-fit">
      <h3 className="text-lg font-bold mb-4">MARKET STATISTICS</h3>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-bloomberg-amber/70">Spot Price:</span>
          <span className="font-bold">{formatCurrency(stats.spotPrice)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-bloomberg-amber/70">ATM Volatility:</span>
          <span className="font-bold">{formatNumber(stats.atmVol * 100, 1)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-bloomberg-amber/70">25-Delta Skew:</span>
          <span className="font-bold">{formatNumber(stats.skew25Delta, 2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-bloomberg-amber/70">Options Count:</span>
          <span className="font-bold">{stats.optionsCount}</span>
        </div>
        <div className="pt-3 border-t border-bloomberg-amber/30">
          <div className="text-xs text-bloomberg-amber/50">
            Last Update: <FormattedTime timestamp={stats.lastUpdate} format="time" fallback="--:--:--" />
          </div>
        </div>
      </div>
    </div>
  )
}