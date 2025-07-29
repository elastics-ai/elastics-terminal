'use client'

import { useMemo } from 'react'

interface HeatmapData {
  strategy: string
  btc: number
  eth: number
  volatility: number
  spx: number
  pairs: number
}

const heatmapData: HeatmapData[] = [
  { strategy: 'BTC: Momentum Returns', btc: 0.8, eth: 0.3, volatility: 0.2, spx: 0.1, pairs: 0.15 },
  { strategy: 'BTC: Vol Returns Pearson', btc: 0.9, eth: 0.4, volatility: 0.7, spx: 0.2, pairs: 0.1 },
  { strategy: 'BTC: Market Returns', btc: 0.7, eth: 0.2, volatility: 0.1, spx: 0.05, pairs: 0.1 },
  { strategy: 'BTC: Sentiment Returns', btc: 0.6, eth: 0.3, volatility: 0.3, spx: 0.15, pairs: 0.2 },
  { strategy: 'BTC: Machine Beta Returns', btc: 0.5, eth: 0.25, volatility: 0.4, spx: 0.3, pairs: 0.25 },
  { strategy: 'BTC: Leverage Returns', btc: 0.4, eth: 0.35, volatility: 0.2, spx: 0.25, pairs: 0.15 },
  { strategy: 'BTC: Crowd Returns', btc: 0.3, eth: 0.2, volatility: 0.15, spx: 0.1, pairs: 0.05 },
  { strategy: 'BTC: Quant Returns', btc: 0.7, eth: 0.5, volatility: 0.6, spx: 0.4, pairs: 0.35 },
  { strategy: 'BTC: Volatility Returns', btc: 0.8, eth: 0.6, volatility: 0.9, spx: 0.3, pairs: 0.2 },
  { strategy: 'BTC: Size Returns', btc: 0.5, eth: 0.3, volatility: 0.2, spx: 0.2, pairs: 0.15 },
  { strategy: 'BTC: Large Cap Size Returns', btc: 0.6, eth: 0.4, volatility: 0.3, spx: 0.4, pairs: 0.25 },
  { strategy: 'S&P: Fundamental Returns', btc: 0.1, eth: 0.05, volatility: 0.2, spx: 0.8, pairs: 0.1 },
  { strategy: 'S&P: Sell-side Returns', btc: 0.05, eth: 0.02, volatility: 0.15, spx: 0.7, pairs: 0.05 },
]

const columns = ['btc', 'eth', 'volatility', 'spx', 'pairs'] as const

export function RiskBreakdownHeatmap() {
  const getHeatmapColor = (value: number) => {
    // Blue gradient for positive values
    const intensity = Math.abs(value)
    const baseHue = 211 // Blue hue
    const saturation = 70 + (intensity * 20) // 70-90%
    const lightness = 90 - (intensity * 40) // 90-50%
    
    return `hsl(${baseHue}, ${saturation}%, ${lightness}%)`
  }

  const columnLabels = {
    btc: 'BTC',
    eth: 'ETH',
    volatility: 'Volatility',
    spx: 'SPX',
    pairs: 'Pairs'
  }

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="text-sm font-medium mb-4">Strategy-Factor Correlation Heatmap (Realistic Dependencies)</div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-muted-foreground pb-2">Strategy</th>
              {columns.map(col => (
                <th key={col} className="text-center text-xs font-medium text-muted-foreground pb-2 px-2">
                  {columnLabels[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/50">
                <td className="text-xs py-1 pr-4">{row.strategy}</td>
                {columns.map(col => (
                  <td key={col} className="px-2 py-1">
                    <div 
                      className="w-12 h-6 rounded flex items-center justify-center text-xs font-medium"
                      style={{ backgroundColor: getHeatmapColor(row[col]) }}
                    >
                      {(row[col] * 100).toFixed(0)}%
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>0%</span>
        <div className="flex-1 h-4 rounded bg-gradient-to-r from-blue-50 via-blue-300 to-blue-700" />
        <span>100%</span>
      </div>
    </div>
  )
}