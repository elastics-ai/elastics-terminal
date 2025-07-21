'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/lib/websocket'
import { useQuery } from '@tanstack/react-query'
import { volatilityAPI } from '@/lib/api'
import { formatNumber, formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { FormattedTime } from '@/components/ui/formatted-time'

interface Alert {
  timestamp: number
  datetime?: string
  price: number
  volatility: number
  threshold: number
  isNew?: boolean
}

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  // Load initial alerts from API
  const { data: initialAlerts } = useQuery({
    queryKey: ['volatility-alerts'],
    queryFn: () => volatilityAPI.getAlerts(10),
    refetchInterval: false, // We'll use WebSocket for updates
  })

  useEffect(() => {
    if (initialAlerts) {
      setAlerts(initialAlerts.map(a => ({ ...a, isNew: false })))
    }
  }, [initialAlerts])

  // Listen for new alerts via WebSocket
  useWebSocket('threshold_breach', (message) => {
    if (message?.data) {
      const newAlert: Alert = {
        timestamp: message.timestamp,
        price: message.data.price,
        volatility: message.data.volatility,
        threshold: message.data.threshold,
        isNew: true
      }
      
      setAlerts(prev => {
        const updated = [newAlert, ...prev]
        // Keep only last 10 alerts
        return updated.slice(0, 10).map((a, i) => ({
          ...a,
          isNew: i === 0 && a.isNew
        }))
      })
      
      // Remove "new" highlight after 3 seconds
      setTimeout(() => {
        setAlerts(prev => prev.map(a => ({ ...a, isNew: false })))
      }, 3000)
    }
  })

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Volatility Breach Alerts</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 text-gray-600 font-medium">Time</th>
              <th className="text-right py-3 px-3 text-gray-600 font-medium">Price</th>
              <th className="text-right py-3 px-3 text-gray-600 font-medium">Volatility</th>
              <th className="text-right py-3 px-3 text-gray-600 font-medium">Threshold</th>
              <th className="text-right py-3 px-3 text-gray-600 font-medium">Breach</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, index) => {
              const breachAmount = (alert.volatility - alert.threshold) * 100
              const timestampDate = alert.datetime 
                ? new Date(alert.datetime)
                : new Date(alert.timestamp)
              
              return (
                <tr 
                  key={index}
                  className={cn(
                    "border-b border-gray-100",
                    alert.isNew && "bg-red-50 animate-pulse"
                  )}
                >
                  <td className="py-3 px-3 text-gray-900">
                    <FormattedTime timestamp={timestampDate} format="time" fallback="--:--:--" />
                  </td>
                  <td className="text-right py-3 px-3 text-gray-900">{formatCurrency(alert.price)}</td>
                  <td className="text-right py-3 px-3 text-red-600 font-semibold">
                    {formatNumber(alert.volatility * 100, 2)}%
                  </td>
                  <td className="text-right py-3 px-3 text-gray-600">
                    {formatNumber(alert.threshold * 100, 2)}%
                  </td>
                  <td className="text-right py-3 px-3 text-red-600 font-medium">
                    +{formatNumber(breachAmount, 2)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {alerts.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No volatility breaches detected
          </div>
        )}
      </div>
    </div>
  )
}