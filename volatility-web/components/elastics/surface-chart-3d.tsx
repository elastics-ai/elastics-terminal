'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

interface SurfaceChart3DProps {
  type: 'implied-volatility' | 'risk-neutral-density'
  height?: number
  showData?: boolean
  model?: string
}

export function SurfaceChart3D({ type, height = 300, showData = false, model }: SurfaceChart3DProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!mountRef.current) return

    const width = mountRef.current.clientWidth
    const currentHeight = height

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xfafafa)
    sceneRef.current = scene

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
    rendererRef.current = renderer
    mountRef.current.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    // Create surface geometry
    const createSurface = () => {
      const geometry = new THREE.BufferGeometry()
      const size = 50
      const vertices = []
      const colors = []
      
      for (let i = 0; i <= size; i++) {
        for (let j = 0; j <= size; j++) {
          const x = (i / size) * 4 - 2
          const z = (j / size) * 4 - 2
          
          let y
          if (type === 'implied-volatility') {
            // Create volatility smile surface
            const moneyness = Math.sqrt(x * x + z * z)
            y = 0.2 + 0.1 * Math.exp(-moneyness) + 0.05 * Math.sin(moneyness * 2)
          } else {
            // Create risk-neutral density surface
            y = Math.exp(-(x * x + z * z) / 2) / (2 * Math.PI)
          }
          
          vertices.push(x, y, z)
          
          // Color based on height
          const hue = (1 - y) * 240 / 360 // Blue to green gradient
          const color = new THREE.Color()
          color.setHSL(hue, 0.7, 0.5)
          colors.push(color.r, color.g, color.b)
        }
      }
      
      // Create indices for triangles
      const indices = []
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const a = i * (size + 1) + j
          const b = a + 1
          const c = a + size + 1
          const d = c + 1
          
          indices.push(a, b, c)
          indices.push(b, d, c)
        }
      }
      
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      geometry.setIndex(indices)
      geometry.computeVertexNormals()
      
      const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 100,
        opacity: 0.9,
        transparent: true
      })
      
      const mesh = new THREE.Mesh(geometry, material)
      scene.add(mesh)

      // Add grid
      const gridHelper = new THREE.GridHelper(4, 10, 0xcccccc, 0xeeeeee)
      gridHelper.position.y = -0.01
      scene.add(gridHelper)

      // Add axes
      const axesHelper = new THREE.AxesHelper(2.5)
      scene.add(axesHelper)

      // Add data points if requested
      if (showData) {
        const pointsGeometry = new THREE.BufferGeometry()
        const pointsVertices = []
        const pointsColors = []
        
        // Generate random data points
        for (let i = 0; i < 100; i++) {
          const x = (Math.random() - 0.5) * 3.5
          const z = (Math.random() - 0.5) * 3.5
          const moneyness = Math.sqrt(x * x + z * z)
          const y = 0.2 + 0.1 * Math.exp(-moneyness) + 0.05 * Math.sin(moneyness * 2) + (Math.random() - 0.5) * 0.02
          
          pointsVertices.push(x, y, z)
          pointsColors.push(1, 0.5, 0) // Orange color for data points
        }
        
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointsVertices, 3))
        pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(pointsColors, 3))
        
        const pointsMaterial = new THREE.PointsMaterial({
          size: 0.05,
          vertexColors: true
        })
        
        const points = new THREE.Points(pointsGeometry, pointsMaterial)
        scene.add(points)
      }
    }

    createSurface()

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return
      const newWidth = mountRef.current.clientWidth
      camera.aspect = newWidth / currentHeight
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, currentHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      window.removeEventListener('resize', handleResize)
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
      scene.clear()
    }
  }, [type, height, showData, model])

  return (
    <div 
      ref={mountRef} 
      style={{ height: `${height}px` }}
      className="w-full relative bg-gray-50 rounded-lg"
    />
  )
}