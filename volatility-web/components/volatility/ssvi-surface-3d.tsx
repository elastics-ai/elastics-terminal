'use client'

import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'

interface SSVIParameters {
  theta_a: number
  theta_b: number
  theta_c: number
  phi_eta: number
  phi_gamma: number
  rho: number
  theta_model_type: string
  phi_model_type: string
}

interface SurfaceFitResult {
  symbol: string
  model_type: string
  parameters: SSVIParameters
  fit_quality: {
    rmse: number
    max_error: number
    r_squared: number
    data_points: number
    converged: boolean
  }
  calibration_timestamp: string
  expiry_range: [number, number]
  strike_range: [number, number]
}

interface SSVISurfaceData {
  surface: {
    x: number[][]  // Log-moneyness grid
    y: number[][]  // Time-to-expiry grid
    z: number[][]  // Implied volatility surface
    type: 'surface'
    colorscale: string
    name: string
  }
  market_data?: {
    x: number[]
    y: number[]
    z: number[]
    type: 'scatter3d'
    mode: 'markers'
    marker: { size: number; color: string }
    name: string
  }
  layout: {
    scene: {
      xaxis: { title: string }
      yaxis: { title: string }
      zaxis: { title: string }
    }
    title: string
    height: number
  }
}

interface SSVISurface3DProps {
  symbol?: string
  initialData?: SSVISurfaceData
  height?: number
  onCalibrate?: (symbol: string, config: any) => void
  onExport?: (data: SSVISurfaceData) => void
}

interface SurfaceMeshProps {
  data: SSVISurfaceData
  showMarketData: boolean
  showWireframe: boolean
  animate: boolean
  qualityLevel: number
}

function SurfaceMesh({ 
  data, 
  showMarketData, 
  showWireframe, 
  animate,
  qualityLevel 
}: SurfaceMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const marketDataRef = useRef<THREE.Points>(null)
  
  // Animate surface rotation
  useFrame((state, delta) => {
    if (meshRef.current && animate) {
      meshRef.current.rotation.z += delta * 0.05
    }
  })

  // Create high-quality surface geometry
  const surfaceGeometry = useMemo(() => {
    const { surface } = data
    
    if (!surface.x.length || !surface.y.length || !surface.z.length) {
      return new THREE.PlaneGeometry(1, 1, 1, 1)
    }
    
    const xGrid = surface.x
    const yGrid = surface.y
    const zGrid = surface.z
    
    const width = xGrid[0].length
    const height = xGrid.length
    
    // Create high-resolution geometry based on quality level
    const segments = Math.max(10, Math.min(100, qualityLevel * 20))
    const geometry = new THREE.PlaneGeometry(
      10, 10, 
      Math.min(segments, width - 1), 
      Math.min(segments, height - 1)
    )
    
    const positions = geometry.attributes.position
    let idx = 0
    
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const x = xGrid[i][j] * 3  // Scale log-moneyness
        const y = yGrid[i][j] * 5  // Scale time-to-expiry
        const z = zGrid[i][j] * 8  // Scale implied volatility for visibility
        
        if (idx < positions.count) {
          positions.setXYZ(idx, x, y, z)
          idx++
        }
      }
    }
    
    geometry.computeVertexNormals()
    return geometry
  }, [data, qualityLevel])

  // Create dynamic color mapping based on volatility levels
  const colors = useMemo(() => {
    const { surface } = data
    const zGrid = surface.z
    
    if (!zGrid.length) return new Float32Array([])
    
    const flatValues = zGrid.flat()
    const minVol = Math.min(...flatValues)
    const maxVol = Math.max(...flatValues)
    const range = maxVol - minVol
    
    const colors = new Float32Array(flatValues.length * 3)
    
    flatValues.forEach((vol, idx) => {
      const normalized = range > 0 ? (vol - minVol) / range : 0
      
      // Advanced color mapping: Blue (low) -> Cyan -> Green -> Yellow -> Red (high)
      const color = new THREE.Color()
      if (normalized < 0.25) {
        color.setHSL(0.67 - normalized * 0.67, 1, 0.5) // Blue to Cyan
      } else if (normalized < 0.5) {
        color.setHSL(0.5 - (normalized - 0.25) * 0.5, 1, 0.5) // Cyan to Green
      } else if (normalized < 0.75) {
        color.setHSL(0.33 - (normalized - 0.5) * 0.33, 1, 0.5) // Green to Yellow
      } else {
        color.setHSL(0.17 - (normalized - 0.75) * 0.17, 1, 0.5) // Yellow to Red
      }
      
      colors[idx * 3] = color.r
      colors[idx * 3 + 1] = color.g
      colors[idx * 3 + 2] = color.b
    })
    
    return colors
  }, [data])

  // Create market data points
  const marketDataGeometry = useMemo(() => {
    if (!data.market_data || !showMarketData) return null
    
    const { x, y, z } = data.market_data
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(x.length * 3)
    
    for (let i = 0; i < x.length; i++) {
      positions[i * 3] = x[i] * 3
      positions[i * 3 + 1] = y[i] * 5
      positions[i * 3 + 2] = z[i] * 8
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [data.market_data, showMarketData])

  return (
    <>
      {/* Main volatility surface */}
      <mesh ref={meshRef} geometry={surfaceGeometry}>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-color"
            count={colors.length / 3}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        <meshPhongMaterial
          attach="material"
          vertexColors
          side={THREE.DoubleSide}
          wireframe={showWireframe}
          transparent
          opacity={showWireframe ? 0.6 : 0.9}
          shininess={100}
        />
      </mesh>
      
      {/* Market data points */}
      {marketDataGeometry && (
        <points ref={marketDataRef} geometry={marketDataGeometry}>
          <pointsMaterial 
            attach="material" 
            size={0.15} 
            color="#ff4444" 
            sizeAttenuation={true}
          />
        </points>
      )}
      
      {/* Axis grid and labels */}
      <Grid 
        args={[20, 20]} 
        cellSize={1} 
        cellThickness={0.3} 
        cellColor="#4a5568" 
        sectionSize={5} 
        sectionThickness={0.8} 
        sectionColor="#2d3748"
        fadeDistance={25}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
        position={[0, -1, 0]}
      />
      
      {/* Interactive axis labels */}
      <Text
        position={[8, -1, 0]}
        rotation={[0, 0, 0]}
        fontSize={0.4}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
      >
        Log-Moneyness (k) →
      </Text>
      <Text
        position={[0, -1, 8]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.4}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
      >
        Time to Expiry (τ) →
      </Text>
      <Text
        position={[-8, 4, 0]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={0.4}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
      >
        ↑ Implied Volatility (σ)
      </Text>
    </>
  )
}

export const SSVISurface3D: React.FC<SSVISurface3DProps> = ({ 
  symbol = 'BTC-USD',
  initialData,
  height = 500,
  onCalibrate,
  onExport
}) => {
  const [surfaceData, setSurfaceData] = useState<SSVISurfaceData | null>(initialData || null)
  const [fitResult, setFitResult] = useState<SurfaceFitResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showMarketData, setShowMarketData] = useState(true)
  const [showWireframe, setShowWireframe] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [qualityLevel, setQualityLevel] = useState([3])
  const [thetaModel, setThetaModel] = useState('power_law')
  const [phiModel, setPhiModel] = useState('heston')
  const { toast } = useToast()

  // Fetch surface data from backend
  const fetchSurfaceData = async (forceRecalibrate = false) => {
    setLoading(true)
    try {
      const response = await fetch('/api/volatility/ssvi/surface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          theta_model_type: thetaModel,
          phi_model_type: phiModel,
          force_recalibrate: forceRecalibrate
        })
      })
      
      if (!response.ok) throw new Error('Failed to fetch surface data')
      
      const result = await response.json()
      setSurfaceData(result.surface_data)
      setFitResult(result.fit_result)
      
      toast({
        title: "Surface Updated",
        description: `SSVI surface calibrated with RMSE: ${result.fit_result?.fit_quality.rmse.toFixed(6)}`
      })
    } catch (error) {
      console.error('Error fetching surface data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch volatility surface data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Initialize data on mount
  useEffect(() => {
    if (!initialData) {
      fetchSurfaceData()
    }
  }, [symbol, thetaModel, phiModel])

  const handleCalibrate = () => {
    onCalibrate?.(symbol, { theta_model_type: thetaModel, phi_model_type: phiModel })
    fetchSurfaceData(true)
  }

  const handleExport = () => {
    if (surfaceData) {
      onExport?.(surfaceData)
      
      // Create downloadable JSON
      const dataStr = JSON.stringify(surfaceData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${symbol}_ssvi_surface_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
      
      toast({
        title: "Export Complete",
        description: "Surface data exported successfully"
      })
    }
  }

  if (!surfaceData) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-muted-foreground">
            {loading ? 'Loading volatility surface...' : 'No surface data available'}
          </div>
          {loading && <Progress value={33} className="w-[60%]" />}
          {!loading && (
            <Button onClick={() => fetchSurfaceData()} variant="outline">
              Load Surface Data
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            SSVI Volatility Surface - {symbol}
            <Badge variant="outline">SSVI</Badge>
            {fitResult && (
              <Badge 
                variant={fitResult.fit_quality.converged ? "default" : "destructive"}
                className="ml-2"
              >
                {fitResult.fit_quality.converged ? 'Converged' : 'Failed'}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {fitResult && (
              <>
                <div>RMSE: {fitResult.fit_quality.rmse.toFixed(6)}</div>
                <div>R²: {fitResult.fit_quality.r_squared.toFixed(4)}</div>
                <div>Points: {fitResult.fit_quality.data_points}</div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 3D Surface Canvas */}
        <div style={{ height }} className="relative">
          <Canvas camera={{ position: [12, 8, 12], fov: 60 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={0.8} />
            <pointLight position={[-10, -10, -5]} intensity={0.3} />
            
            <SurfaceMesh 
              data={surfaceData} 
              showMarketData={showMarketData}
              showWireframe={showWireframe}
              animate={animate}
              qualityLevel={qualityLevel[0]}
            />
            
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              maxPolarAngle={Math.PI}
              minDistance={5}
              maxDistance={50}
            />
          </Canvas>
          
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <div className="space-y-2">
                <Progress value={66} className="w-48" />
                <p className="text-sm text-muted-foreground text-center">
                  Calibrating SSVI surface...
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Controls Panel */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Display Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Display</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="market-data"
                  checked={showMarketData}
                  onCheckedChange={setShowMarketData}
                />
                <Label htmlFor="market-data" className="text-xs">Market Data</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="wireframe"
                  checked={showWireframe}
                  onCheckedChange={setShowWireframe}
                />
                <Label htmlFor="wireframe" className="text-xs">Wireframe</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="animate"
                  checked={animate}
                  onCheckedChange={setAnimate}
                />
                <Label htmlFor="animate" className="text-xs">Animate</Label>
              </div>
            </div>
          </div>
          
          {/* Model Configuration */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Model Config</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Theta Function</Label>
                <Select value={thetaModel} onValueChange={setThetaModel}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="power_law">Power Law</SelectItem>
                    <SelectItem value="heston">Heston</SelectItem>
                    <SelectItem value="linear">Linear</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Phi Function</Label>
                <Select value={phiModel} onValueChange={setPhiModel}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="power_law">Power Law</SelectItem>
                    <SelectItem value="heston">Heston</SelectItem>
                    <SelectItem value="exponential">Exponential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Quality Settings */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Quality</Label>
            <div className="space-y-2">
              <Label className="text-xs">Surface Resolution</Label>
              <Slider
                value={qualityLevel}
                onValueChange={setQualityLevel}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground">
                Level: {qualityLevel[0]}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Actions</Label>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCalibrate}
                disabled={loading}
                className="w-full"
              >
                Recalibrate
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                disabled={!surfaceData}
                className="w-full"
              >
                Export Data
              </Button>
            </div>
          </div>
        </div>
        
        {/* Fit Quality Metrics */}
        {fitResult && (
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <div className="text-sm font-medium mb-2">Calibration Results</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <div className="text-muted-foreground">RMSE</div>
                <div className="font-mono">{fitResult.fit_quality.rmse.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Max Error</div>
                <div className="font-mono">{fitResult.fit_quality.max_error.toFixed(6)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">R-Squared</div>
                <div className="font-mono">{fitResult.fit_quality.r_squared.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Data Points</div>
                <div className="font-mono">{fitResult.fit_quality.data_points}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}