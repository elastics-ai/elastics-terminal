import React from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, ArrowUp, ArrowDown } from 'lucide-react'

interface Trade {
  id: string
  instrument: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  greekImpact: {
    delta: number
    gamma: number
    vega: number
    theta: number
    rho: number
  }
  cost: number
  approved?: boolean
}

interface SuggestedTradesTableProps {
  trades: Trade[]
  onExecute: () => void
}

export function SuggestedTradesTable({ trades, onExecute }: SuggestedTradesTableProps) {
  const [selectedTrades, setSelectedTrades] = React.useState<Set<string>>(
    new Set(trades.map(t => t.id))
  )
  
  const toggleTrade = (tradeId: string) => {
    const newSelected = new Set(selectedTrades)
    if (newSelected.has(tradeId)) {
      newSelected.delete(tradeId)
    } else {
      newSelected.add(tradeId)
    }
    setSelectedTrades(newSelected)
  }
  
  const totalCost = trades
    .filter(t => selectedTrades.has(t.id))
    .reduce((sum, t) => sum + t.cost, 0)

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Suggested Trades</h3>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Total Cost: ${totalCost.toFixed(2)}
          </span>
          <Button
            onClick={onExecute}
            disabled={selectedTrades.size === 0}
          >
            Execute {selectedTrades.size} Trade{selectedTrades.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">Select</th>
              <th className="text-left py-2 px-3">Instrument</th>
              <th className="text-left py-2 px-3">Action</th>
              <th className="text-right py-2 px-3">Quantity</th>
              <th className="text-right py-2 px-3">Price</th>
              <th className="text-center py-2 px-3">Greek Impact</th>
              <th className="text-right py-2 px-3">Cost</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr
                key={trade.id}
                className={`border-b hover:bg-gray-900/50 transition-colors ${
                  !selectedTrades.has(trade.id) ? 'opacity-50' : ''
                }`}
              >
                <td className="py-3 px-3">
                  <input
                    type="checkbox"
                    checked={selectedTrades.has(trade.id)}
                    onChange={() => toggleTrade(trade.id)}
                    className="rounded"
                  />
                </td>
                <td className="py-3 px-3">
                  <span className="font-medium">{trade.instrument}</span>
                </td>
                <td className="py-3 px-3">
                  <Badge
                    variant={trade.type === 'BUY' ? 'default' : 'destructive'}
                    className="font-medium"
                  >
                    {trade.type}
                  </Badge>
                </td>
                <td className="py-3 px-3 text-right">{trade.quantity}</td>
                <td className="py-3 px-3 text-right">${trade.price.toFixed(2)}</td>
                <td className="py-3 px-3">
                  <div className="flex justify-center gap-2">
                    {Object.entries(trade.greekImpact).map(([greek, impact]) => (
                      <div
                        key={greek}
                        className="flex items-center gap-1 text-xs"
                        title={`${greek}: ${impact > 0 ? '+' : ''}${impact.toFixed(3)}`}
                      >
                        <span className="text-gray-500">{greek[0].toUpperCase()}</span>
                        {impact > 0 ? (
                          <ArrowUp className="w-3 h-3 text-green-500" />
                        ) : impact < 0 ? (
                          <ArrowDown className="w-3 h-3 text-red-500" />
                        ) : (
                          <span className="w-3 h-3 text-gray-500">-</span>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-3 text-right">
                  ${trade.cost.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {trades.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No trades suggested
        </div>
      )}
    </Card>
  )
}