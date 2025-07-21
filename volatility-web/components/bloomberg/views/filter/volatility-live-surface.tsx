'use client'

import { useState, useEffect, useRef } from 'react'
import { useWebSocket } from '@/lib/websocket'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface SurfaceData {
  surface: number[][]
  moneyness_grid: number[]
  ttm_grid: number[]
  timestamp?: number
}

export function VolatilityLiveSurface() {
  const [surfaceData, setSurfaceData] = useState<SurfaceData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const plotlyRef = useRef<any>(null)

  // Subscribe to vol_surface events
  useWebSocket('vol_surface', (message) => {
    if (message?.data && message.data.surface) {
      setSurfaceData(message.data)
      setLastUpdate(new Date(message.timestamp))
      setIsConnected(true)
    }
  })

  // Handle connection status
  useEffect(() => {
    const checkConnection = setInterval(() => {
      if (lastUpdate && new Date().getTime() - lastUpdate.getTime() > 30000) {
        setIsConnected(false)
      }
    }, 5000)

    return () => clearInterval(checkConnection)
  }, [lastUpdate])

  if (!surfaceData) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Implied Volatility Surface</h3>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              "bg-red-500 animate-pulse"
            )} />
            <span className="text-sm text-muted-foreground">Waiting for data...</span>
          </div>
        </div>
        <div className="h-96 flex items-center justify-center">
          <p className="text-muted-foreground">
            Connecting to volatility surface feed...
          </p>
        </div>
      </div>
    )
  }

  const plotData = [{
    type: 'surface' as const,
    z: surfaceData.surface,
    x: surfaceData.moneyness_grid,
    y: surfaceData.ttm_grid,
    colorscale: [
      [0, '#3b82f6'],     // Blue
      [0.5, '#10b981'],   // Green
      [1, '#ef4444']      // Red
    ],
    contours: {
      z: {
        show: true,
        usecolormap: true,
        highlightcolor: "#42f462",
        project: { z: true }
      }
    },
    hovertemplate: 'Moneyness: %{x:.3f}<br>Time to Maturity: %{y:.3f}<br>IV: %{z:.2%}<extra></extra>'
  }]

  const layout = {
    scene: {
      xaxis: {
        title: 'Moneyness (ln(K/S))',
        titlefont: { color: '#6b7280' },
        tickfont: { color: '#9ca3af' },
        gridcolor: '#e5e7eb',
        zerolinecolor: '#e5e7eb'
      },
      yaxis: {
        title: 'Time to Maturity (years)',
        titlefont: { color: '#6b7280' },
        tickfont: { color: '#9ca3af' },
        gridcolor: '#e5e7eb',
        zerolinecolor: '#e5e7eb'
      },
      zaxis: {
        title: 'Implied Volatility',
        titlefont: { color: '#6b7280' },
        tickfont: { color: '#9ca3af' },
        gridcolor: '#e5e7eb',
        zerolinecolor: '#e5e7eb',
        tickformat: '.0%'
      },
      bgcolor: '#ffffff',
      camera: {
        eye: { x: 1.5, y: 1.5, z: 1.5 }
      }
    },
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    margin: { l: 0, r: 0, t: 0, b: 0 },
    hovermode: 'closest' as const,
    autosize: true,
    height: 400
  }

  const config = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['select2d', 'lasso2d']
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Implied Volatility Surface</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time 3D visualization of option implied volatilities
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <span className="text-sm text-muted-foreground">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500 animate-pulse"
            )} />
            <span className="text-sm">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="relative">
        <Plot
          ref={plotlyRef}
          data={plotData}
          layout={layout}
          config={config}
          className="w-full"
          useResizeHandler={true}
          style={{ width: '100%', height: '400px' }}
        />
      </div>

      {/* Surface Stats */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Min IV</p>
          <p className="text-lg font-semibold">
            {(Math.min(...surfaceData.surface.flat()) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Max IV</p>
          <p className="text-lg font-semibold">
            {(Math.max(...surfaceData.surface.flat()) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">ATM IV</p>
          <p className="text-lg font-semibold">
            {(() => {
              const midIdx = Math.floor(surfaceData.moneyness_grid.length / 2)
              const atmIV = surfaceData.surface[0]?.[midIdx] || 0
              return (atmIV * 100).toFixed(1)
            })()}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Skew</p>
          <p className="text-lg font-semibold">
            {(() => {
              const midIdx = Math.floor(surfaceData.moneyness_grid.length / 2)
              const putIV = surfaceData.surface[0]?.[0] || 0
              const callIV = surfaceData.surface[0]?.[surfaceData.moneyness_grid.length - 1] || 0
              return ((putIV - callIV) * 100).toFixed(1)
            })()}%
          </p>
        </div>
      </div>
    </div>
  )
}