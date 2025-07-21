'use client'

import { useQuery } from '@tanstack/react-query'
import { portfolioAPI } from '@/lib/api'
import { formatCurrency, formatPercentage, formatNumber, getColorForValue } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function PositionsTable() {
  const [sortField, setSortField] = useState<string>('value')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const { data: positions = [], isLoading, error } = useQuery({
    queryKey: ['portfolio-positions'],
    queryFn: portfolioAPI.getPositions,
    refetchInterval: 5000,
  })

  const sortedPositions = [...positions].sort((a, b) => {
    const aVal = a[sortField] || 0
    const bVal = b[sortField] || 0
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
  })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  if (isLoading) {
    return (
      <div className="border border-bloomberg-amber/50 p-4">
        <h3 className="text-lg font-bold mb-4">ACTIVE POSITIONS</h3>
        <div className="animate-pulse">Loading positions...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-bloomberg-amber/50 p-4">
        <h3 className="text-lg font-bold mb-4">ACTIVE POSITIONS</h3>
        <div className="text-negative">Error loading positions</div>
      </div>
    )
  }

  return (
    <div className="border border-bloomberg-amber/50 p-4">
      <h3 className="text-lg font-bold mb-4">ACTIVE POSITIONS</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bloomberg-amber/30">
              <th className="text-left py-2 px-2 cursor-pointer hover:text-bloomberg-amber" onClick={() => handleSort('instrument')}>
                Instrument {sortField === 'instrument' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-left py-2 px-2">Type</th>
              <th className="text-right py-2 px-2 cursor-pointer hover:text-bloomberg-amber" onClick={() => handleSort('quantity')}>
                Qty {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-right py-2 px-2">Entry</th>
              <th className="text-right py-2 px-2">Current</th>
              <th className="text-right py-2 px-2 cursor-pointer hover:text-bloomberg-amber" onClick={() => handleSort('value')}>
                Value {sortField === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-right py-2 px-2 cursor-pointer hover:text-bloomberg-amber" onClick={() => handleSort('pnl')}>
                P&L {sortField === 'pnl' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-right py-2 px-2 cursor-pointer hover:text-bloomberg-amber" onClick={() => handleSort('pnl_percentage')}>
                P&L% {sortField === 'pnl_percentage' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="text-right py-2 px-2">Delta</th>
              <th className="text-right py-2 px-2">IV</th>
            </tr>
          </thead>
          <tbody>
            {sortedPositions.map((position, index) => (
              <tr key={index} className="border-b border-bloomberg-amber/10 hover:bg-bloomberg-amber/5">
                <td className="py-2 px-2 font-mono">{position.instrument}</td>
                <td className="py-2 px-2 uppercase">{position.type}</td>
                <td className="text-right py-2 px-2">{formatNumber(position.quantity, 0)}</td>
                <td className="text-right py-2 px-2">{formatCurrency(position.entry_price)}</td>
                <td className="text-right py-2 px-2">{formatCurrency(position.current_price)}</td>
                <td className="text-right py-2 px-2">{formatCurrency(position.value)}</td>
                <td className={cn("text-right py-2 px-2 font-bold", getColorForValue(position.pnl))}>
                  {formatCurrency(position.pnl)}
                </td>
                <td className={cn("text-right py-2 px-2 font-bold", getColorForValue(position.pnl_percentage))}>
                  {formatPercentage(position.pnl_percentage)}
                </td>
                <td className="text-right py-2 px-2">{formatNumber(position.delta || 0, 3)}</td>
                <td className="text-right py-2 px-2">{position.iv ? formatNumber(position.iv * 100, 1) + '%' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {positions.length === 0 && (
          <div className="text-center py-8 text-bloomberg-amber/50">
            No active positions
          </div>
        )}
      </div>
    </div>
  )
}