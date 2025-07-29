'use client'

import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Text } from '@react-three/drei'
import * as THREE from 'three'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'

interface GreeksSurfaceData {
  strikes: number[]
  expiries: number[]  // in days
  surface: number[][]
  greek: string
  option_type: string
  spot: number
  volatility: number
}

interface GreeksSnapshot {
  timestamp: string
  portfolio_value: number
  net_delta: number
  net_gamma: number
  net_vega: number
  net_theta: number
  net_rho: number
  net_vanna: number
  net_volga: number
  net_charm: number
  net_speed: number
  delta_adjusted_exposure: number
  gamma_adjusted_exposure: number
  largest_position_delta: number
  largest_position_gamma: number
  concentration_risk: number
}

interface GreeksSurface3DProps {
  symbol?: string
  spot?: number
  volatility?: number
  height?: number
  onExport?: (data: GreeksSurfaceData) => void
}

interface GreeksSurfaceMeshProps {
  data: GreeksSurfaceData
  showContours: boolean
  animate: boolean
  colorIntensity: number
}

function GreeksSurfaceMesh({ 
  data, 
  showContours, 
  animate,
  colorIntensity 
}: GreeksSurfaceMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const contoursRef = useRef<THREE.LineSegments>(null)
  
  // Animate rotation based on Greek type
  useFrame((state, delta) => {
    if (meshRef.current && animate) {
      const speed = data.greek === 'gamma' ? 0.02 : 0.01
      meshRef.current.rotation.z += delta * speed
    }
  })

  // Create geometry from Greeks surface data
  const geometry = useMemo(() => {
    const { strikes, expiries, surface } = data
    
    if (!strikes.length || !expiries.length || !surface.length) {
      return new THREE.PlaneGeometry(1, 1, 1, 1)
    }
    
    const width = strikes.length
    const height = expiries.length
    
    const geometry = new THREE.PlaneGeometry(
      8, 8,
      width - 1,
      height - 1
    )
    
    const positions = geometry.attributes.position
    let idx = 0
    
    // Map strikes and expiries to 3D coordinates
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const x = ((j / (width - 1)) - 0.5) * 8  // Strike dimension
        const y = ((i / (height - 1)) - 0.5) * 8  // Expiry dimension
        
        // Scale Greek values for visibility (different scaling for different Greeks)
        let z = surface[i]?.[j] || 0
        switch (data.greek) {
          case 'delta':
            z = z * 5  // Delta ranges roughly -1 to 1
            break
          case 'gamma':
            z = z * 100  // Gamma is typically small
            break
          case 'vega':
            z = z * 2  // Vega can be larger
            break
          case 'theta':
            z = Math.abs(z) * 10  // Theta is negative, show magnitude
            break
          case 'rho':
            z = z * 3
            break
          default:
            z = z * 10
        }
        
        positions.setXYZ(idx, x, y, z)
        idx++
      }
    }
    
    geometry.computeVertexNormals()
    return geometry
  }, [data])

  // Create colors based on Greek values and intensity
  const colors = useMemo(() => {
    const { surface, strikes, expiries } = data
    const colors = new Float32Array(strikes.length * expiries.length * 3)
    let idx = 0
    
    // Find min/max for normalization
    const flatValues = surface.flat().filter(v => v != null)
    const minVal = Math.min(...flatValues)
    const maxVal = Math.max(...flatValues)
    const range = maxVal - minVal
    
    for (let i = 0; i < expiries.length; i++) {
      for (let j = 0; j < strikes.length; j++) {
        const value = surface[i]?.[j] || 0
        const normalized = range > 0 ? (value - minVal) / range : 0.5
        
        // Greek-specific color schemes
        const color = new THREE.Color()
        switch (data.greek) {
          case 'delta':
            // Green for positive, red for negative
            if (value > 0) {
              color.setHSL(0.33, colorIntensity, 0.3 + normalized * 0.4)
            } else {
              color.setHSL(0, colorIntensity, 0.3 + Math.abs(normalized) * 0.4)
            }
            break
          case 'gamma':
            // Purple to yellow (gamma is always positive)
            color.setHSL(0.8 - normalized * 0.6, colorIntensity, 0.4 + normalized * 0.4)
            break
          case 'vega':
            // Blue to cyan (vega is usually positive)
            color.setHSL(0.6 - normalized * 0.1, colorIntensity, 0.3 + normalized * 0.5)
            break
          case 'theta':
            // Red gradient (theta decay)
            color.setHSL(0, colorIntensity, 0.2 + normalized * 0.6)
            break
          default:
            // Default rainbow
            color.setHSL(normalized * 0.8, colorIntensity, 0.5)
        }
        
        colors[idx * 3] = color.r
        colors[idx * 3 + 1] = color.g
        colors[idx * 3 + 2] = color.b
        idx++
      }
    }
    
    return colors
  }, [data, colorIntensity])

  // Create contour lines
  const contourGeometry = useMemo(() => {
    if (!showContours) return null
    
    const { strikes, expiries, surface } = data
    const contourLines: number[] = []
    
    // Generate contour lines at regular intervals
    const flatValues = surface.flat().filter(v => v != null)
    const minVal = Math.min(...flatValues)
    const maxVal = Math.max(...flatValues)
    const levels = 8
    
    for (let level = 1; level < levels; level++) {
      const threshold = minVal + (maxVal - minVal) * (level / levels)
      
      // Simple contour extraction (marching squares could be implemented here)
      for (let i = 0; i < expiries.length - 1; i++) {
        for (let j = 0; j < strikes.length - 1; j++) {
          const val1 = surface[i]?.[j] || 0
          const val2 = surface[i]?.[j + 1] || 0
          const val3 = surface[i + 1]?.[j] || 0
          
          if ((val1 <= threshold && val2 >= threshold) || 
              (val1 >= threshold && val2 <= threshold)) {
            const x1 = ((j / (strikes.length - 1)) - 0.5) * 8
            const x2 = (((j + 1) / (strikes.length - 1)) - 0.5) * 8
            const y = ((i / (expiries.length - 1)) - 0.5) * 8
            const z = threshold * (data.greek === 'gamma' ? 100 : 5)
            
            contourLines.push(x1, y, z, x2, y, z)
          }
        }
      }
    }
    
    if (contourLines.length === 0) return null
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(contourLines, 3))
    return geometry
  }, [data, showContours])

  return (
    <>
      {/* Main Greeks surface */}
      <mesh ref={meshRef} geometry={geometry}>
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
          transparent
          opacity={0.85}
          shininess={30}
        />
      </mesh>
      
      {/* Contour lines */}
      {contourGeometry && (
        <lineSegments ref={contoursRef} geometry={contourGeometry}>
          <lineBasicMaterial attach="material" color="#ffffff" opacity={0.6} transparent />
        </lineSegments>
      )}
      
      {/* Grid and axes */}
      <Grid 
        args={[16, 16]} 
        cellSize={0.5} 
        cellThickness={0.2} 
        cellColor="#4a5568" 
        sectionSize={2} 
        sectionThickness={0.5} 
        sectionColor="#2d3748"
        fadeDistance={20}
        fadeStrength={1}
        followCamera={false}
        position={[0, -2, 0]}
      />
      
      {/* Dynamic axis labels */}
      <Text
        position={[5, -2, 0]}
        rotation={[0, 0, 0]}
        fontSize={0.3}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
      >
        Strike →
      </Text>
      <Text
        position={[0, -2, 5]}
        rotation={[0, Math.PI / 2, 0]}
        fontSize={0.3}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
      >
        Expiry →
      </Text>
      <Text
        position={[-5, 2, 0]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={0.3}
        color="#e2e8f0"
        anchorX="center"
        anchorY="middle"
      >
        ↑ {data.greek.charAt(0).toUpperCase() + data.greek.slice(1)}
      </Text>
    </>
  )
}

export const GreeksSurface3D: React.FC<GreeksSurface3DProps> = ({ 
  symbol = 'BTC-USD',
  spot = 50000,
  volatility = 0.8,
  height = 500,
  onExport
}) => {
  const [surfaceData, setSurfaceData] = useState<GreeksSurfaceData | null>(null)
  const [portfolioGreeks, setPortfolioGreeks] = useState<GreeksSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedGreek, setSelectedGreek] = useState('delta')
  const [optionType, setOptionType] = useState('call')
  const [showContours, setShowContours] = useState(false)
  const [animate, setAnimate] = useState(true)
  const [colorIntensity, setColorIntensity] = useState([0.8])
  const [strikeRange, setStrikeRange] = useState([0.8, 1.2])  // Moneyness range
  const [expiryRange, setExpiryRange] = useState([7, 365])   // Days
  const { toast } = useToast()

  // Fetch Greeks surface data
  const fetchGreeksSurface = async () => {
    setLoading(true)
    try {
      const minStrike = spot * strikeRange[0]
      const maxStrike = spot * strikeRange[1]
      
      const response = await fetch('/api/volatility/greeks/surface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spot,
          strike_range: [minStrike, maxStrike],
          expiry_range: [expiryRange[0] / 365, expiryRange[1] / 365], // Convert to years
          volatility,
          greek: selectedGreek,
          option_type: optionType,
          n_strikes: 25,
          n_expiries: 20
        })
      })
      
      if (!response.ok) throw new Error('Failed to fetch Greeks surface')
      
      const result = await response.json()
      setSurfaceData(result)
      
      toast({
        title: "Greeks Surface Updated",
        description: `${selectedGreek.charAt(0).toUpperCase() + selectedGreek.slice(1)} surface generated`
      })
    } catch (error) {
      console.error('Error fetching Greeks surface:', error)
      toast({
        title: "Error",
        description: "Failed to fetch Greeks surface data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch portfolio Greeks
  const fetchPortfolioGreeks = async () => {
    try {
      const response = await fetch('/api/portfolio/greeks')
      if (!response.ok) throw new Error('Failed to fetch portfolio Greeks')
      
      const result = await response.json()
      setPortfolioGreeks(result)
    } catch (error) {
      console.error('Error fetching portfolio Greeks:', error)
    }
  }

  // Initialize data
  useEffect(() => {
    fetchGreeksSurface()
    fetchPortfolioGreeks()
  }, [selectedGreek, optionType, spot, volatility])

  // Update surface when parameters change
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchGreeksSurface()
    }, 500)
    
    return () => clearTimeout(debounce)
  }, [strikeRange, expiryRange])

  const handleExport = () => {
    if (surfaceData) {
      onExport?.(surfaceData)
      
      const dataStr = JSON.stringify(surfaceData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${symbol}_${selectedGreek}_surface_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
      
      toast({
        title: "Export Complete",
        description: "Greeks surface data exported successfully"
      })
    }
  }

  if (!surfaceData) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="text-muted-foreground">
            {loading ? 'Calculating Greeks surface...' : 'No Greeks data available'}
          </div>
          {loading && <Progress value={50} className="w-[60%]" />}
          {!loading && (
            <Button onClick={fetchGreeksSurface} variant="outline">
              Generate Greeks Surface
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Greeks Surface Analysis - {symbol}
              <Badge variant="outline" className="capitalize">
                {selectedGreek}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {optionType}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div>Spot: ${spot.toLocaleString()}</div>
              <div>Vol: {(volatility * 100).toFixed(1)}%</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 3D Greeks Surface */}
          <div style={{ height }} className="relative">
            <Canvas camera={{ position: [10, 6, 10], fov: 50 }}>
              <ambientLight intensity={0.3} />
              <directionalLight position={[10, 10, 5]} intensity={0.7} />
              <pointLight position={[-10, -10, -5]} intensity={0.2} />
              
              <GreeksSurfaceMesh 
                data={surfaceData}
                showContours={showContours}
                animate={animate}
                colorIntensity={colorIntensity[0]}
              />
              
              <OrbitControls 
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                maxPolarAngle={Math.PI * 0.9}
                minDistance={3}
                maxDistance={30}
              />
            </Canvas>
            
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="space-y-2">
                  <Progress value={75} className="w-48" />
                  <p className="text-sm text-muted-foreground text-center">
                    Calculating {selectedGreek} surface...
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Controls */}
          <Tabs defaultValue="greek-config" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="greek-config">Greek Config</TabsTrigger>
              <TabsTrigger value="display">Display</TabsTrigger>
              <TabsTrigger value="ranges">Ranges</TabsTrigger>
            </TabsList>
            
            <TabsContent value="greek-config" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm">Greek Type</Label>
                  <Select value={selectedGreek} onValueChange={setSelectedGreek}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="delta">Delta (Δ)</SelectItem>
                      <SelectItem value="gamma">Gamma (Γ)</SelectItem>
                      <SelectItem value="vega">Vega (ν)</SelectItem>
                      <SelectItem value="theta">Theta (Θ)</SelectItem>
                      <SelectItem value="rho">Rho (ρ)</SelectItem>
                      <SelectItem value="vanna">Vanna</SelectItem>
                      <SelectItem value="volga">Volga</SelectItem>
                      <SelectItem value="charm">Charm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm">Option Type</Label>
                  <Select value={optionType} onValueChange={setOptionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="put">Put</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-sm">Spot Price</Label>
                  <div className="text-sm font-mono pt-2">${spot.toLocaleString()}</div>
                </div>
                
                <div>
                  <Label className="text-sm">Volatility</Label>
                  <div className="text-sm font-mono pt-2">{(volatility * 100).toFixed(1)}%</div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="display" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="contours"
                      checked={showContours}
                      onCheckedChange={setShowContours}
                    />
                    <Label htmlFor="contours" className="text-sm">Show Contours</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="animate-greeks"
                      checked={animate}
                      onCheckedChange={setAnimate}
                    />
                    <Label htmlFor="animate-greeks" className="text-sm">Animate</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Color Intensity</Label>
                  <Slider
                    value={colorIntensity}
                    onValueChange={setColorIntensity}
                    min={0.3}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExport}
                    disabled={!surfaceData}
                    className="w-full"
                  >
                    Export Surface
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="ranges" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Strike Range (Moneyness)</Label>
                  <Slider
                    value={strikeRange}
                    onValueChange={setStrikeRange}
                    min={0.5}
                    max={2}
                    step={0.05}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground">
                    {strikeRange[0]}x - {strikeRange[1]}x spot
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Expiry Range (Days)</Label>
                  <Slider
                    value={expiryRange}
                    onValueChange={setExpiryRange}
                    min={1}
                    max={730}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground">
                    {expiryRange[0]} - {expiryRange[1]} days
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Portfolio Greeks Summary */}
      {portfolioGreeks && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Portfolio Greeks Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Net Delta</div>
                <div className="font-mono text-lg">{portfolioGreeks.net_delta.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Net Gamma</div>
                <div className="font-mono text-lg">{portfolioGreeks.net_gamma.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Net Vega</div>
                <div className="font-mono text-lg">{portfolioGreeks.net_vega.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Net Theta</div>
                <div className="font-mono text-lg">{portfolioGreeks.net_theta.toFixed(0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Portfolio Value</div>
                <div className="font-mono text-lg">${portfolioGreeks.portfolio_value.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}