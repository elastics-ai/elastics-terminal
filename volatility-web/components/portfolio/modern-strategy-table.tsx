'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface Strategy {
  name: string
  benchmark?: string
  mode: string
  status: 'Relative' | 'Absolute'
  alerts?: number
}

const mockStrategies: Strategy[] = [
  { name: 'Alpha Strategy', benchmark: 'S&P 500', mode: 'Long/Short', status: 'Relative' },
  { name: 'Beta Neutral', benchmark: 'Russell 2000', mode: 'Market Neutral', status: 'Absolute', alerts: 2 },
  { name: 'Gamma Scalp', mode: 'Options', status: 'Relative' },
  { name: 'Delta One', benchmark: 'NASDAQ', mode: 'Long Only', status: 'Relative' },
  { name: 'Vega Trade', mode: 'Volatility', status: 'Absolute', alerts: 1 }
]

export function ModernStrategyTable() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('Alpha Strategy')
  const [sortField, setSortField] = useState<keyof Strategy>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: keyof Strategy) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedStrategies = [...mockStrategies].sort((a, b) => {
    const aValue = a[sortField] || ''
    const bValue = b[sortField] || ''
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  return (
    <div className="dashboard-section">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">Strategies</h3>
          <span className="text-sm text-muted-foreground">{mockStrategies.length} total</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th 
                className="text-left p-4 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name
                  {sortField === 'name' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground">
                Benchmark
              </th>
              <th className="text-left p-4 text-xs font-medium text-muted-foreground">
                Mode
              </th>
              <th 
                className="text-left p-4 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortField === 'status' && (
                    sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedStrategies.map((strategy) => (
              <tr
                key={strategy.name}
                className={cn(
                  "border-b border-border cursor-pointer transition-colors",
                  selectedStrategy === strategy.name 
                    ? "bg-primary/5" 
                    : "hover:bg-muted/50"
                )}
                onClick={() => setSelectedStrategy(strategy.name)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{strategy.name}</span>
                    {strategy.alerts && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0">
                        {strategy.alerts}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {strategy.benchmark || '-'}
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {strategy.mode}
                </td>
                <td className="p-4">
                  <Badge 
                    variant={strategy.status === 'Relative' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {strategy.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}