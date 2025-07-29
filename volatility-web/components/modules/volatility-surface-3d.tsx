'use client'

import React, { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Text } from '@react-three/drei'
import * as THREE from 'three'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SurfaceData {
  strikes: number[]
  expiries: number[]
  surface: number[][]
  model: 'SSVI' | 'ESSVI' | 'LSTM'
}

interface VolatilitySurface3DProps {
  data: SurfaceData
  height?: number
}

function SurfaceMesh({ data, showData }: { data: SurfaceData; showData: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Rotate the surface slowly
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.1
    }
  })

  // Create geometry from surface data
  const geometry = useMemo(() => {
    const { strikes, expiries, surface } = data
    
    if (!strikes.length || !expiries.length || !surface.length) {
      return new THREE.PlaneGeometry(1, 1, 1, 1)
    }
    
    const geometry = new THREE.PlaneGeometry(
      10, 
      10, 
      strikes.length - 1, 
      expiries.length - 1
    )
    
    // Update vertices with volatility values
    const positions = geometry.attributes.position
    let idx = 0
    
    for (let i = 0; i < expiries.length; i++) {
      for (let j = 0; j < strikes.length; j++) {
        const x = (j / (strikes.length - 1) - 0.5) * 10
        const y = (i / (expiries.length - 1) - 0.5) * 10
        const z = surface[i]?.[j] ? surface[i][j] * 10 : 0 // Scale volatility for visibility
        
        positions.setXYZ(idx, x, y, z)
        idx++
      }
    }
    
    geometry.computeVertexNormals()
    return geometry
  }, [data])

  // Create color gradient based on volatility
  const colors = useMemo(() => {
    const { surface, strikes, expiries } = data
    const colors = new Float32Array(strikes.length * expiries.length * 3)
    let idx = 0
    
    for (let i = 0; i < expiries.length; i++) {
      for (let j = 0; j < strikes.length; j++) {
        const vol = surface[i]?.[j] || 0
        const normalized = Math.min(Math.max(vol, 0), 1)
        
        // Color gradient: blue (low vol) -> green -> yellow -> red (high vol)
        const color = new THREE.Color()
        color.setHSL(0.7 - normalized * 0.7, 1, 0.5)
        
        colors[idx * 3] = color.r
        colors[idx * 3 + 1] = color.g
        colors[idx * 3 + 2] = color.b
        idx++
      }
    }
    
    return colors
  }, [data])

  return (
    <>
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
          wireframe={false}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {showData && (
        <points>
          <bufferGeometry attach="geometry">
            <bufferAttribute
              attach="attributes-position"
              count={geometry.attributes.position.count}
              array={geometry.attributes.position.array}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial attach="material" size={0.1} color="white" />
        </points>
      )}
    </>
  )
}

export const VolatilitySurface3D: React.FC<VolatilitySurface3DProps> = ({ 
  data, 
  height = 400 
}) => {
  const [showData, setShowData] = useState(false)
  const [moneyScale, setMoneyScale] = useState([1])
  const [timeScale, setTimeScale] = useState([1])
  
  if (!data.strikes.length || !data.expiries.length) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    )
  }
  
  const minStrike = Math.min(...data.strikes)
  const maxStrike = Math.max(...data.strikes)
  const minExpiry = Math.min(...data.expiries)
  const maxExpiry = Math.max(...data.expiries)
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {data.model} Surface
            <Badge variant="outline">{data.model}</Badge>
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Strike Range: {minStrike.toFixed(2)} - {maxStrike.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              Expiry Range: {minExpiry} - {maxExpiry} days
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div style={{ height }}>
          <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <SurfaceMesh data={data} showData={showData} />
            <Grid 
              args={[20, 20]} 
              cellSize={1} 
              cellThickness={0.5} 
              cellColor="#6b7280" 
              sectionSize={5} 
              sectionThickness={1} 
              sectionColor="#374151"
              fadeDistance={30}
              fadeStrength={1}
              followCamera={false}
              infiniteGrid
            />
            <OrbitControls 
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
            />
            
            {/* Axis labels */}
            <Text
              position={[6, 0, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              Strike →
            </Text>
            <Text
              position={[0, 6, 0]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              Expiry →
            </Text>
            <Text
              position={[0, 0, 6]}
              rotation={[0, 0, 0]}
              fontSize={0.5}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              IV ↑
            </Text>
          </Canvas>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-data"
              checked={showData}
              onCheckedChange={setShowData}
            />
            <Label htmlFor="show-data">Show Data Points</Label>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Moneyness Scale</Label>
              <Slider
                value={moneyScale}
                onValueChange={setMoneyScale}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Time Scale</Label>
              <Slider
                value={timeScale}
                onValueChange={setTimeScale}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Export Data
            </Button>
            <Button variant="outline" size="sm">
              Calibrate
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}