'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

interface ElasticsSurfaceChartProps {
  title: string
  data: any[]
  type: 'ssvi' | 'density'
}

export function ElasticsSurfaceChart({ title, data, type }: ElasticsSurfaceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = 300

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    sceneRef.current = scene

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(30, 30, 30)
    camera.lookAt(0, 0, 0)

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4)
    directionalLight.position.set(5, 10, 5)
    scene.add(directionalLight)

    // Create surface geometry
    const geometry = new THREE.PlaneGeometry(20, 20, 50, 50)
    
    // Generate mock surface data
    const vertices = geometry.attributes.position.array
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const y = vertices[i + 1]
      const z = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 5 + Math.random() * 0.5
      vertices[i + 2] = z
    }
    geometry.computeVertexNormals()

    // Create gradient material
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 100,
    })

    // Add colors based on height
    const colors = []
    const color = new THREE.Color()
    for (let i = 0; i < vertices.length; i += 3) {
      const z = vertices[i + 2]
      const normalized = (z + 5) / 10
      
      if (type === 'ssvi') {
        // Blue to green gradient
        color.setHSL(0.5 - normalized * 0.3, 0.7, 0.5)
      } else {
        // Purple to blue gradient
        color.setHSL(0.75 - normalized * 0.2, 0.7, 0.5)
      }
      
      colors.push(color.r, color.g, color.b)
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

    const mesh = new THREE.Mesh(geometry, material)
    mesh.rotation.x = -Math.PI / 2
    scene.add(mesh)

    // Grid helper
    const gridHelper = new THREE.GridHelper(20, 10, 0xcccccc, 0xeeeeee)
    scene.add(gridHelper)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return
      const newWidth = containerRef.current.clientWidth
      camera.aspect = newWidth / height
      camera.updateProjectionMatrix()
      renderer.setSize(newWidth, height)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [type])

  return (
    <div className="relative">
      <div className="absolute top-2 left-2 z-10">
        <h4 className="text-xs font-medium text-gray-600">{title}</h4>
      </div>
      <div ref={containerRef} className="w-full h-[300px] rounded" />
      <div className="absolute bottom-2 left-2 right-2 flex justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>SSVI</span>
          <span>ESSI</span>
          <span>LSTM</span>
          <span>Linear</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Deribit</span>
          <span>Kaiko</span>
          <span>Paradigm</span>
          <span>Portfolio Log</span>
        </div>
      </div>
    </div>
  )
}