'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/lib/websocket'
import { formatCurrency, getColorForValue } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { FormattedTime } from '@/components/ui/formatted-time'

export function PriceDisplay() {
  const [price, setPrice] = useState<number>(0)
  const [previousPrice, setPreviousPrice] = useState<number>(0)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  // Load initial price from API
  useEffect(() => {
    fetch('/api/stats/realtime')
      .then(res => res.json())
      .then(data => {
        if (data.avg_price) {
          setPrice(data.avg_price)
          setPreviousPrice(data.avg_price)
        }
      })
      .catch(err => console.error('Failed to load initial price:', err))
  }, [])

  // Subscribe to all_trades event
  useWebSocket('all_trades', (data) => {
    if (data?.data?.price) {
      setPreviousPrice(price)
      setPrice(data.data.price)
      setLastUpdate(new Date(data.timestamp))
    }
  })

  const priceChange = price - previousPrice
  const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">BTC-PERPETUAL</h3>
      
      <div className="space-y-4">
        <div>
          <div className="text-4xl font-bold text-gray-900">
            {formatCurrency(price)}
          </div>
          <div className={cn(
            "text-lg mt-2 flex items-center gap-2",
            priceChange >= 0 ? "text-green-600" : "text-red-600"
          )}>
            <span>{priceChange >= 0 ? '▲' : '▼'}</span>
            <span>{formatCurrency(Math.abs(priceChange))}</span>
            <span className="text-sm">
              ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">Last Update</div>
          <div className="text-sm font-medium text-gray-900">
            <FormattedTime 
              timestamp={lastUpdate} 
              format="datetime"
              fallback="--:--:--"
            />
          </div>
        </div>
      </div>
    </div>
  )
}