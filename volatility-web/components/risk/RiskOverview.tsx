'use client'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Risk heatmap data
const correlationData = [
  { asset1: 'BTC', asset2: 'BTC', value: 1.00 },
  { asset1: 'BTC', asset2: 'ETH', value: 0.82 },
  { asset1: 'BTC', asset2: 'SOL', value: 0.65 },
  { asset1: 'BTC', asset2: 'MATIC', value: 0.58 },
  { asset1: 'ETH', asset2: 'BTC', value: 0.82 },
  { asset1: 'ETH', asset2: 'ETH', value: 1.00 },
  { asset1: 'ETH', asset2: 'SOL', value: 0.71 },
  { asset1: 'ETH', asset2: 'MATIC', value: 0.77 },
  { asset1: 'SOL', asset2: 'BTC', value: 0.65 },
  { asset1: 'SOL', asset2: 'ETH', value: 0.71 },
  { asset1: 'SOL', asset2: 'SOL', value: 1.00 },
  { asset1: 'SOL', asset2: 'MATIC', value: 0.69 },
  { asset1: 'MATIC', asset2: 'BTC', value: 0.58 },
  { asset1: 'MATIC', asset2: 'ETH', value: 0.77 },
  { asset1: 'MATIC', asset2: 'SOL', value: 0.69 },
  { asset1: 'MATIC', asset2: 'MATIC', value: 1.00 },
]

const assets = ['BTC', 'ETH', 'SOL', 'MATIC']

// Risk breakdown data
const riskBreakdown = [
  { strategy: 'BTC Momentum Dx', active: true, health: 72, totalReturn: '$7.5M', exposure: 12.4, volatility: 16.4, ovmBeta: 10.2, maxDrawdown: -19.5, exposureTime: 14.3, alphaFactor: 0.021, beta: 0.34, tags: ['Long', 'Momentum'] },
  { strategy: 'Prediction Market Vt', active: true, health: 89, totalReturn: '$22.3K', exposure: 9, volatility: 11.2, ovmBeta: 3.2, maxDrawdown: -6.8, exposureTime: 66.2, alphaFactor: -0.034, beta: 0.21, tags: ['Volatility', 'Prediction'] },
  { strategy: 'Meta Trend Global', active: false, health: 45, totalReturn: '-$1.1M', exposure: 3.2, volatility: 45.6, ovmBeta: 8.7, maxDrawdown: -32.0, exposureTime: 89.1, alphaFactor: -2.16, beta: 0.009, tags: ['Trend', 'Global'] },
  { strategy: 'Screener Basis Ch', active: true, health: 91, totalReturn: '$11.0K', exposure: 3.2, volatility: 8.7, ovmBeta: 10.0, maxDrawdown: -2.16, exposureTime: 99.1, alphaFactor: -0.019, beta: 0.05, tags: ['Basis', 'Arbitrage'] },
  { strategy: 'Crypto Sentiment Fi', active: true, health: 67, totalReturn: '$15.4M', exposure: 13.4, volatility: 24.3, ovmBeta: 13.4, maxDrawdown: -10.4, exposureTime: 65.0, alphaFactor: -0.019, beta: 0.09, tags: ['Sentiment', 'Crypto'] },
  { strategy: 'Volatility Index Dtr', active: false, health: 35, totalReturn: '-$12.1M', exposure: 10.2, volatility: 35.2, ovmBeta: 22.3, maxDrawdown: -22.3, exposureTime: 52.0, alphaFactor: -1.23, beta: 1.38, tags: ['Volatility', 'Index'] },
]

export function RiskOverview() {
  return (
    <div className="space-y-6">
      {/* Risk Heatmap */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Risk</h3>
        
        {/* Correlation Heatmap */}
        <div className="mb-6">
          <h4 className="text-xs text-muted-foreground mb-2">Strategy-Factor Correlation Heatmap (Realistic Dependencies)</h4>
          <div className="grid grid-cols-5 gap-1">
            <div /> {/* Empty corner cell */}
            {assets.map((asset) => (
              <div key={asset} className="text-center text-xs font-medium">
                {asset}
              </div>
            ))}
            {assets.map((asset1) => (
              <div key={asset1} className="contents">
                <div className="text-xs font-medium text-right pr-1">{asset1}</div>
                {assets.map((asset2) => {
                  const correlation = correlationData.find(
                    (d) => d.asset1 === asset1 && d.asset2 === asset2
                  )?.value || 0
                  return (
                    <div
                      key={`${asset1}-${asset2}`}
                      className={cn(
                        "aspect-square flex items-center justify-center text-xs rounded",
                        getHeatmapColor(correlation)
                      )}
                    >
                      {correlation.toFixed(2)}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* VaR Heatmap */}
        <div>
          <h4 className="text-xs text-muted-foreground mb-2">VaR Carry</h4>
          <div className="grid grid-cols-4 gap-1">
            {['Spot VaR', 'Delta', 'Gamma', 'Vega', 'Theta'].map((metric) => (
              <div key={metric} className="contents">
                <div className="text-xs font-medium">{metric}</div>
                <div className={cn(
                  "aspect-square flex items-center justify-center text-xs rounded",
                  metric === 'Spot VaR' ? 'bg-blue-500/20' : 
                  metric === 'Delta' ? 'bg-blue-400/20' :
                  metric === 'Gamma' ? 'bg-blue-300/20' :
                  metric === 'Vega' ? 'bg-purple-400/20' :
                  'bg-purple-300/20'
                )}>
                  {metric === 'Spot VaR' ? '0.82' : 
                   metric === 'Delta' ? '0.65' :
                   metric === 'Gamma' ? '0.43' :
                   metric === 'Vega' ? '0.38' :
                   '0.21'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Risk Breakdown Table */}
      <Card className="p-4">
        <h3 className="text-sm font-medium mb-3">Risk Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left pb-2">Strategy</th>
                <th className="text-center pb-2">Active</th>
                <th className="text-center pb-2">Health</th>
                <th className="text-right pb-2">Total Returns</th>
                <th className="text-right pb-2">Exposure</th>
                <th className="text-right pb-2">Volatility</th>
                <th className="text-right pb-2">OVM Beta</th>
                <th className="text-right pb-2">Max Drawdown</th>
              </tr>
            </thead>
            <tbody>
              {riskBreakdown.map((row, index) => (
                <tr key={index} className="border-b border-border/50">
                  <td className="py-2">
                    <div>
                      <div className="font-medium">{row.strategy}</div>
                      <div className="flex gap-1 mt-1">
                        {row.tags.map((tag) => (
                          <span key={tag} className="text-[10px] px-1 py-0.5 bg-secondary rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full mx-auto",
                      row.active ? "bg-green-500" : "bg-gray-400"
                    )} />
                  </td>
                  <td className="text-center py-2">
                    <div className={cn(
                      "inline-flex items-center justify-center w-10 h-6 rounded text-[10px] font-medium",
                      row.health >= 80 ? "bg-green-500/20 text-green-500" :
                      row.health >= 60 ? "bg-yellow-500/20 text-yellow-500" :
                      "bg-red-500/20 text-red-500"
                    )}>
                      {row.health}
                    </div>
                  </td>
                  <td className={cn(
                    "text-right py-2",
                    row.totalReturn.startsWith('-') ? "text-red-500" : "text-green-500"
                  )}>
                    {row.totalReturn}
                  </td>
                  <td className="text-right py-2">{row.exposure}%</td>
                  <td className="text-right py-2">{row.volatility}</td>
                  <td className="text-right py-2">{row.ovmBeta}</td>
                  <td className="text-right py-2 text-red-500">{row.maxDrawdown}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function getHeatmapColor(value: number): string {
  if (value >= 0.8) return 'bg-blue-500/30 text-blue-700'
  if (value >= 0.6) return 'bg-blue-400/25 text-blue-600'
  if (value >= 0.4) return 'bg-blue-300/20 text-blue-500'
  if (value >= 0.2) return 'bg-purple-300/20 text-purple-600'
  return 'bg-purple-200/15 text-purple-500'
}