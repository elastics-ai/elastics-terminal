'use client'

interface GreekData {
  name: string
  delta: number
  gamma: number
  vega: number
  theta: number
}

const greeksData: GreekData[] = [
  { name: 'Delta', delta: 100000, gamma: 0, vega: 0, theta: 0 },
  { name: 'Gamma', delta: 0, gamma: 50000, vega: 0, theta: 0 },
  { name: 'Vega', delta: 0, gamma: 0, vega: -20000, theta: 0 },
  { name: 'Theta', delta: 0, gamma: 0, vega: 0, theta: -15000 }
]

export function AggregateGreeksTable() {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  const getColorClass = (value: number) => {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-900'
  }

  return (
    <div className="bg-card rounded-lg border">
      <div className="p-4 border-b">
        <h3 className="text-sm font-medium">Aggregate Greeks (USD Notional)</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground p-3">Greek</th>
              <th className="text-right text-xs font-medium text-muted-foreground p-3">Delta</th>
              <th className="text-right text-xs font-medium text-muted-foreground p-3">Gamma</th>
              <th className="text-right text-xs font-medium text-muted-foreground p-3">Vega</th>
              <th className="text-right text-xs font-medium text-muted-foreground p-3">Theta</th>
            </tr>
          </thead>
          <tbody>
            {greeksData.map((row, idx) => (
              <tr key={idx} className="border-b hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{row.name}</td>
                <td className={`p-3 text-sm text-right ${getColorClass(row.delta)}`}>
                  {row.delta !== 0 ? formatNumber(row.delta) : '-'}
                </td>
                <td className={`p-3 text-sm text-right ${getColorClass(row.gamma)}`}>
                  {row.gamma !== 0 ? formatNumber(row.gamma) : '-'}
                </td>
                <td className={`p-3 text-sm text-right ${getColorClass(row.vega)}`}>
                  {row.vega !== 0 ? formatNumber(row.vega) : '-'}
                </td>
                <td className={`p-3 text-sm text-right ${getColorClass(row.theta)}`}>
                  {row.theta !== 0 ? formatNumber(row.theta) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}