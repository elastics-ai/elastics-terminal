'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Text } from '@react-three/drei'
import * as THREE from 'three'

interface SurfaceData {
  strikes: number[]
  expiries: string[]
  ivs: number[][]
}

export function Surface({ data }: { data: SurfaceData | null }) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.02
    }
  })

  if (!data) return null

  const { strikes = [], expiries = [], ivs = [] } = data
  
  // Create geometry for the surface
  const geometry = new THREE.BufferGeometry()
  const vertices: number[] = []
  const colors: number[] = []
  
  // Generate vertices and colors
  for (let i = 0; i < strikes.length; i++) {
    for (let j = 0; j < expiries.length; j++) {
      const x = (i / (strikes.length - 1) - 0.5) * 10
      const z = (j / (expiries.length - 1) - 0.5) * 10
      const y = (ivs[i]?.[j] || 0.5) * 5 - 2.5
      
      vertices.push(x, y, z)
      
      // Color based on volatility level
      const vol = ivs[i]?.[j] || 0.5
      const color = new THREE.Color()
      color.setHSL(0.1 - vol * 0.1, 1, 0.5) // Red to green gradient
      colors.push(color.r, color.g, color.b)
    }
  }
  
  // Create indices for the mesh
  const indices: number[] = []
  for (let i = 0; i < strikes.length - 1; i++) {
    for (let j = 0; j < expiries.length - 1; j++) {
      const a = i * expiries.length + j
      const b = (i + 1) * expiries.length + j
      const c = (i + 1) * expiries.length + (j + 1)
      const d = i * expiries.length + (j + 1)
      
      indices.push(a, b, c)
      indices.push(a, c, d)
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  return (
    <>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      <Grid 
        args={[20, 20]} 
        cellSize={1} 
        cellThickness={0.5} 
        cellColor="#FF8800" 
        sectionColor="#FF8800"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        position={[0, -2.5, 0]}
      />
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={true}
        autoRotateSpeed={0.5}
      />
      
      {/* Axis labels */}
      <Text
        position={[6, -3, 0]}
        rotation={[0, 0, 0]}
        color="#FF8800"
        fontSize={0.5}
      >
        Strike/Spot →
      </Text>
      <Text
        position={[0, -3, 6]}
        rotation={[0, Math.PI / 2, 0]}
        color="#FF8800"
        fontSize={0.5}
      >
        Time to Expiry →
      </Text>
      <Text
        position={[-6, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        color="#FF8800"
        fontSize={0.5}
      >
        Implied Vol ↑
      </Text>
    </>
  )
}
