'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricData {
  label: string
  value: string
  change?: number
  suffix?: string
}

const metricsData: MetricData[] = [
  { label: 'Credit (BNN) Threshold', value: '55', suffix: '%' },
  { label: 'Max Daily Loss', value: '2', suffix: '%' },
  { label: 'Minimal Profit Factor', value: '0.65' },
  { label: 'Max Slippage', value: '0.05', suffix: '%' },
  { label: 'Max Cross-asset Notional', value: '10', suffix: '%' },
  { label: 'Max Position Size per Strategy', value: '2', suffix: '%' },
  { label: 'Min Leverage', value: '0.5', suffix: 'x' },
  { label: 'Max Leverage', value: '3', suffix: 'x' },
  { label: 'Max Volatility Threshold', value: '60', suffix: '%' },
  { label: 'Max Drawdown Limit', value: '15', suffix: '%' },
  { label: 'Max Order Rejection Rate', value: '1', suffix: '%' }
]

export function RiskOverviewSidebar() {
  const getTrendIcon = (change?: number) => {
    if (!change) return <Minus className="w-4 h-4 text-gray-400" />
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    return <TrendingDown className="w-4 h-4 text-red-500" />
  }

  return (
    <div className="w-80 border-l bg-muted/30 p-6 overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-4">Overview</h3>
          
          <div className="space-y-4">
            {metricsData.map((metric, idx) => (
              <div key={idx} className="bg-card rounded-lg p-3 border">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  {getTrendIcon(metric.change)}
                </div>
                <div className="mt-1">
                  <span className="text-lg font-semibold">
                    {metric.value}
                    {metric.suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{metric.suffix}</span>}
                  </span>
                  {metric.change && (
                    <span className={`text-xs ml-2 ${metric.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.change > 0 ? '+' : ''}{metric.change}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}