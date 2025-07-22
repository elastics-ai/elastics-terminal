'use client'

import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { elasticsApi } from '@/lib/api/elastics'

interface SSVISurfaceProps {
  symbol?: string
  height?: number
}

export function SSVISurface({ symbol = 'BTC', height = 400 }: SSVISurfaceProps) {
  const [surfaceData, setSurfaceData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    animationId: number
  } | null>(null)

  // Fetch surface data
  useEffect(() => {
    const fetchSurfaceData = async () => {
      try {
        setLoading(true)
        const data = await elasticsApi.getSSVISurface(symbol)
        setSurfaceData(data)
      } catch (error) {
        console.error('Error fetching SSVI surface:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSurfaceData()
  }, [symbol])

  useEffect(() => {
    if (!mountRef.current) return

    const width = mountRef.current.clientWidth
    const currentHeight = height

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xfafafa)

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      width / currentHeight,
      0.1,
      1000
    )
    camera.position.set(5, 5, 5)
    camera.lookAt(0, 0, 0)

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, currentHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    mountRef.current.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enableZoom = true
    controls.enablePan = true

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4)
    directionalLight.position.set(5, 10, 5)
    scene.add(directionalLight)

    // Create surface geometry
    const createSurface = () => {
      if (surfaceData && surfaceData.surface) {
        // Use real data
        const { strikes, maturities, ivs } = surfaceData.surface
        const geometry = new THREE.PlaneGeometry(4, 4, strikes[0].length - 1, maturities.length - 1)
        const positionAttribute = geometry.attributes.position
        const colors = []
        
        // Map IV data to surface heights
        for (let i = 0; i < maturities.length; i++) {
          for (let j = 0; j < strikes[0].length; j++) {
            const idx = i * strikes[0].length + j
            if (idx < positionAttribute.count) {
              const x = (j / (strikes[0].length - 1) - 0.5) * 4
              const y = (i / (maturities.length - 1) - 0.5) * 4
              const z = (ivs[i][j] - 0.2) * 3 // Scale IV to reasonable height
              
              positionAttribute.setXYZ(idx, x, y, z)
              
              // Color based on IV value
              const t = (ivs[i][j] - 0.1) / 0.4
              const r = 0.4 + t * 0.3
              const g = 0.5 + t * 0.2
              const b = 0.9 - t * 0.2
              colors.push(r, g, b)
            }
          }
        }
      } else {
        // Fallback to demo pattern
        const geometry = new THREE.PlaneGeometry(4, 4, 50, 50)
        const positionAttribute = geometry.attributes.position
        const colors = []

        for (let i = 0; i < positionAttribute.count; i++) {
          const x = positionAttribute.getX(i)
          const y = positionAttribute.getY(i)
          
          // Create wave pattern for demo
          const z = Math.sin(x * 2) * 0.3 + Math.cos(y * 2) * 0.3 + Math.sin(x * y) * 0.2
          positionAttribute.setZ(i, z)

          // Color based on height - gradient from blue to purple
          const t = (z + 0.8) / 1.6
          const r = 0.4 + t * 0.3
          const g = 0.5 + t * 0.2
          const b = 0.9 - t * 0.2
          colors.push(r, g, b)
        }
      }

      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      geometry.computeVertexNormals()

      const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 100,
        specular: new THREE.Color(0x222222)
      })

      return new THREE.Mesh(geometry, material)
    }

    const surface = createSurface()
    scene.add(surface)

    // Grid helper
    const gridHelper = new THREE.GridHelper(5, 20, 0xcccccc, 0xeeeeee)
    gridHelper.position.y = -0.8
    scene.add(gridHelper)

    // Animation loop
    const animate = () => {
      const animationId = requestAnimationFrame(animate)
      if (sceneRef.current) {
        sceneRef.current.animationId = animationId
      }
      
      controls.update()
      renderer.render(scene, camera)
    }

    sceneRef.current = { scene, camera, renderer, controls, animationId: 0 }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !sceneRef.current) return
      const newWidth = mountRef.current.clientWidth
      sceneRef.current.camera.aspect = newWidth / currentHeight
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(newWidth, currentHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId)
        sceneRef.current.renderer.dispose()
        sceneRef.current.controls.dispose()
        if (mountRef.current && sceneRef.current.renderer.domElement) {
          mountRef.current.removeChild(sceneRef.current.renderer.domElement)
        }
      }
    }
  }, [height, surfaceData])

  return (
    <div 
      ref={mountRef} 
      className="w-full rounded-lg overflow-hidden"
      style={{ height: `${height}px` }}
    />
  )
}