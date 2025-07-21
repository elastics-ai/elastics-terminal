'use client'

import { useWebSocket } from '@/lib/websocket'
import { formatNumber } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface HeatmapProps {
  onSelectCell: (strike: number, expiry: number) => void
}

export function VolatilityHeatmap({ onSelectCell }: HeatmapProps) {
  const [surfaceData, setSurfaceData] = useState<any>(null)
  const [selectedCell, setSelectedCell] = useState<{ strike: number; expiry: number } | null>(null)

  useWebSocket('vol_surface', (message) => {
    if (message?.data?.surface) {
      setSurfaceData(message.data.surface)
    }
  })

  const getColorForVolatility = (vol: number): string => {
    // Map volatility to color gradient (green -> yellow -> red)
    const minVol = 0.2
    const maxVol = 1.5
    const normalized = Math.max(0, Math.min(1, (vol - minVol) / (maxVol - minVol)))
    
    if (normalized < 0.5) {
      // Green to Yellow
      const intensity = normalized * 2
      return `rgb(${Math.floor(intensity * 255)}, 255, 0)`
    } else {
      // Yellow to Red
      const intensity = (normalized - 0.5) * 2
      return `rgb(255, ${Math.floor((1 - intensity) * 255)}, 0)`
    }
  }

  if (!surfaceData) {
    return (
      <div className="border border-bloomberg-amber/50 p-4 h-[500px] flex items-center justify-center">
        <div className="animate-pulse">Loading volatility surface...</div>
      </div>
    )
  }

  const strikes = surfaceData.strikes || []
  const expiries = surfaceData.expiries || []
  const ivMatrix = surfaceData.ivs || []

  return (
    <div className="border border-bloomberg-amber/50 p-4">
      <div className="mb-4">
        <h3 className="text-lg font-bold mb-2">VOLATILITY HEATMAP</h3>
        <p className="text-sm text-bloomberg-amber/70">Strike/Spot Ratio vs Time to Expiry</p>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left">K/S</th>
              {expiries.map((exp: string, i: number) => (
                <th key={i} className="p-2 text-center min-w-[60px]">
                  {exp}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {strikes.map((strike: number, i: number) => (
              <tr key={i}>
                <td className="p-2 font-bold">{formatNumber(strike, 2)}</td>
                {expiries.map((exp: string, j: number) => {
                  const vol = ivMatrix[i]?.[j] || 0
                  const isSelected = selectedCell?.strike === strike && selectedCell?.expiry === j
                  
                  return (
                    <td
                      key={j}
                      onClick={() => {
                        setSelectedCell({ strike, expiry: j })
                        onSelectCell(strike, j)
                      }}
                      className="p-2 text-center cursor-pointer hover:outline hover:outline-2 hover:outline-bloomberg-amber"
                      style={{
                        backgroundColor: getColorForVolatility(vol),
                        color: vol > 0.8 ? '#000' : '#FF8800',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        outline: isSelected ? '2px solid #FF8800' : 'none'
                      }}
                    >
                      {formatNumber(vol * 100, 0)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span>Low Vol</span>
          <div className="flex h-4 w-32">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className="flex-1 h-full"
                style={{ backgroundColor: getColorForVolatility(0.2 + i * 0.13) }}
              />
            ))}
          </div>
          <span>High Vol</span>
        </div>
        {selectedCell && (
          <div className="text-bloomberg-amber">
            Selected: K/S={formatNumber(selectedCell.strike, 2)}, Expiry={expiries[selectedCell.expiry]}
          </div>
        )}
      </div>
    </div>
  )
}