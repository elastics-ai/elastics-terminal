'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

interface ElasticsRiskNeutralDensityChartProps {
  data: any[]
}

export function ElasticsRiskNeutralDensityChart({ data }: ElasticsRiskNeutralDensityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = 300

    // Scene setup
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)

    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(30, 30, 30)
    camera.lookAt(0, 0, 0)

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)

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

    // Create surface geometry for risk-neutral density
    const geometry = new THREE.PlaneGeometry(20, 20, 60, 60)
    
    // Generate mock density surface data
    const vertices = geometry.attributes.position.array
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i]
      const y = vertices[i + 1]
      // Create a more peaked surface for density
      const r = Math.sqrt(x * x + y * y)
      const z = Math.exp(-r * 0.2) * 8 * Math.cos(r * 0.5)
      vertices[i + 2] = z
    }
    geometry.computeVertexNormals()

    // Create gradient material with purple-blue colors
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
      const normalized = Math.max(0, Math.min(1, z / 8))
      
      // Purple to blue gradient
      color.setHSL(0.75 - normalized * 0.15, 0.8, 0.5)
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
  }, [])

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full h-[300px] rounded" />
    </div>
  )
}