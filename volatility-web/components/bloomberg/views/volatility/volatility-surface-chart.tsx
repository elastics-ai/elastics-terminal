'use client'

import { useEffect, useState, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useWebSocket } from '@/lib/websocket'
import { useQuery } from '@tanstack/react-query'

// Dynamically import Three.js components to avoid SSR issues
const Canvas = dynamic(() => import('@react-three/fiber').then(mod => mod.Canvas), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <div className="text-bloomberg-amber animate-pulse">Loading 3D engine...</div>
    </div>
  )
})

const Surface = dynamic(() => import('./surface-3d').then(mod => mod.Surface), { 
  ssr: false 
})

interface SurfaceData {
  strikes: number[]
  expiries: string[]
  ivs: number[][]
}

export function VolatilitySurfaceChart() {
  const [surfaceData, setSurfaceData] = useState<SurfaceData | null>(null)
  const [is3DReady, setIs3DReady] = useState(false)

  // Try to get data from WebSocket
  useWebSocket('vol_surface', (message) => {
    if (message?.data?.surface) {
      setSurfaceData(message.data.surface)
    }
  })

  // Fallback to REST API if no WebSocket data
  const { data: apiData } = useQuery({
    queryKey: ['volatility-surface'],
    queryFn: async () => {
      const response = await fetch('/api/volatility/surface/latest')
      if (!response.ok) throw new Error('Failed to fetch surface data')
      return response.json()
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !surfaceData // Only fetch if no WebSocket data
  })

  // Use API data if available and no WebSocket data
  useEffect(() => {
    if (!surfaceData && apiData?.surface_data) {
      // Convert API format to chart format
      const moneyness = apiData.moneyness_grid || []
      const ttm = apiData.ttm_grid || []
      const surface = apiData.surface_data || []
      
      // Convert to strikes (assuming spot price)
      const spotPrice = apiData.spot_price || 100000
      const strikes = moneyness.map((m: number) => spotPrice * m)
      
      // Convert TTM to expiry labels
      const expiries = ttm.map((t: number) => `${Math.round(t * 365)}D`)
      
      setSurfaceData({
        strikes,
        expiries,
        ivs: surface
      })
    }
  }, [apiData, surfaceData])

  // Ensure 3D components only load on client
  useEffect(() => {
    setIs3DReady(true)
  }, [])

  return (
    <div className="border border-bloomberg-amber/50 p-4">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="text-lg font-bold">3D VOLATILITY SURFACE</h3>
        <div className="text-sm text-bloomberg-amber/70">
          Drag to rotate • Scroll to zoom
        </div>
      </div>
      
      <div className="h-[500px] bg-black/50 relative">
        {is3DReady && (
          <Canvas camera={{ position: [15, 10, 15], fov: 50 }}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              <Surface data={surfaceData} />
            </Suspense>
          </Canvas>
        )}
        
        {!surfaceData && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-bloomberg-amber animate-pulse">
              Waiting for volatility surface data...
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
