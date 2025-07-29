'use client'

interface StrategyData {
  strategy: string
  active: boolean
  health: number
  totalReturns: number
  exposure: number
  volatility: number
  overHerd: number
  maxDrawdown: number
  exposureTime: number
  alpha: number
  beta: number
  tags: string[]
}

const strategiesData: StrategyData[] = [
  {
    strategy: 'BTC Momentum Div',
    active: true,
    health: 76,
    totalReturns: 48.5,
    exposure: 5.2,
    volatility: 36.6,
    overHerd: 8.0,
    maxDrawdown: -18.9,
    exposureTime: 91.2,
    alpha: 0.024,
    beta: 0.84,
    tags: ['BTC', 'Momentum']
  },
  {
    strategy: 'Prediction Market M',
    active: true,
    health: 78,
    totalReturns: 16.3,
    exposure: 6.0,
    volatility: 22.2,
    overHerd: 1.7,
    maxDrawdown: -6.8,
    exposureTime: 88.0,
    alpha: 0.014,
    beta: 0.34,
    tags: ['Prediction', 'Multi-Asset']
  },
  {
    strategy: 'Volatility Trend Global',
    active: false,
    health: 0,
    totalReturns: -21.1,
    exposure: 4.0,
    volatility: 45.3,
    overHerd: -6.1,
    maxDrawdown: -29.1,
    exposureTime: 82.5,
    alpha: -0.009,
    beta: 1.09,
    tags: ['Volatility', 'Global']
  },
  {
    strategy: 'Scolarszen Basis Div',
    active: true,
    health: 93,
    totalReturns: 11.0,
    exposure: 3.2,
    volatility: 12.0,
    overHerd: 1.5,
    maxDrawdown: -2.1,
    exposureTime: 94.5,
    alpha: 0.009,
    beta: 0.05,
    tags: ['Basis', 'Neutral']
  },
  {
    strategy: 'Crypto Sentiment Tr',
    active: true,
    health: 87,
    totalReturns: 24.4,
    exposure: 4.8,
    volatility: 28.8,
    overHerd: 3.9,
    maxDrawdown: -10.1,
    exposureTime: 84.5,
    alpha: 0.019,
    beta: 0.69,
    tags: ['Crypto', 'Sentiment']
  },
  {
    strategy: 'Volatility Real Yield',
    active: true,
    health: 31,
    totalReturns: -4.6,
    exposure: 2.1,
    volatility: 18.2,
    overHerd: -1.2,
    maxDrawdown: -22.2,
    exposureTime: 91.2,
    alpha: -0.006,
    beta: 1.36,
    tags: ['Volatility', 'Yield']
  }
]

export function StrategyHealthTable() {
  const getHealthColor = (health: number) => {
    if (health >= 70) return 'text-green-600'
    if (health >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getHealthBg = (health: number) => {
    if (health >= 70) return 'bg-green-100'
    if (health >= 40) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const formatNumber = (num: number, decimals: number = 1) => {
    return num.toFixed(decimals)
  }

  const formatPercent = (num: number) => {
    const formatted = num > 0 ? `+${num.toFixed(1)}%` : `${num.toFixed(1)}%`
    return formatted
  }

  const getReturnColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="bg-card rounded-lg border">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="text-sm font-medium">Strategy</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>TAGS</span>
          <span>Suggest a constraint to reduce portfolio lapse by 40%</span>
          <span>Compare Alpha vs Beta across all strategies</span>
          <span>Explain Health metric</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs">
              <th className="text-left font-medium text-muted-foreground p-3">STRATEGY</th>
              <th className="text-center font-medium text-muted-foreground p-3">ACTIVE</th>
              <th className="text-center font-medium text-muted-foreground p-3">HEALTH</th>
              <th className="text-right font-medium text-muted-foreground p-3">TOTAL RETURNS</th>
              <th className="text-right font-medium text-muted-foreground p-3">EXPOSURE</th>
              <th className="text-right font-medium text-muted-foreground p-3">VOLATILITY</th>
              <th className="text-right font-medium text-muted-foreground p-3">OVER-HERD</th>
              <th className="text-right font-medium text-muted-foreground p-3">MAX DRAWDOWN</th>
              <th className="text-right font-medium text-muted-foreground p-3">EXPOSURE TIME</th>
              <th className="text-right font-medium text-muted-foreground p-3">ALPHA</th>
              <th className="text-right font-medium text-muted-foreground p-3">BETA</th>
              <th className="text-left font-medium text-muted-foreground p-3">TAGS</th>
            </tr>
          </thead>
          <tbody>
            {strategiesData.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium">{row.strategy}</td>
                <td className="p-3 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${row.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center justify-center w-10 h-6 rounded text-xs font-medium ${getHealthColor(row.health)} ${getHealthBg(row.health)}`}>
                    {row.health}%
                  </span>
                </td>
                <td className={`p-3 text-right ${getReturnColor(row.totalReturns)}`}>
                  {formatPercent(row.totalReturns)}
                </td>
                <td className="p-3 text-right">{formatNumber(row.exposure)}%</td>
                <td className="p-3 text-right">{formatNumber(row.volatility)}%</td>
                <td className={`p-3 text-right ${getReturnColor(row.overHerd)}`}>
                  {formatPercent(row.overHerd)}
                </td>
                <td className="p-3 text-right text-red-600">{formatNumber(row.maxDrawdown)}%</td>
                <td className="p-3 text-right">{formatNumber(row.exposureTime)}%</td>
                <td className={`p-3 text-right ${getReturnColor(row.alpha)}`}>
                  {formatNumber(row.alpha, 3)}
                </td>
                <td className="p-3 text-right">{formatNumber(row.beta, 2)}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {row.tags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 text-center text-xs text-muted-foreground">
        See Excessive Time Rate
      </div>
    </div>
  )
}