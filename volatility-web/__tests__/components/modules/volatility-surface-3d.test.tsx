import React from 'react'
import { render, screen, waitFor } from '@/test-utils/render'
import { VolatilitySurface3D } from '@/components/modules/volatility-surface-3d'
import '@testing-library/jest-dom'
import * as THREE from 'three'

// Mock Three.js and React Three Fiber
jest.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="canvas">{children}</div>,
  useFrame: jest.fn(),
  useThree: () => ({
    camera: new THREE.PerspectiveCamera(),
    gl: { domElement: document.createElement('canvas') },
    scene: new THREE.Scene(),
  }),
}))

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
  Grid: () => <mesh data-testid="grid" />,
  Text: ({ children }: { children: React.ReactNode }) => <div data-testid="text">{children}</div>,
}))

describe('VolatilitySurface3D', () => {
  const mockSurfaceData = {
    strikes: [0.8, 0.9, 1.0, 1.1, 1.2],
    expiries: [7, 14, 30, 60, 90],
    surface: [
      [0.72, 0.68, 0.65, 0.63, 0.62],
      [0.70, 0.66, 0.63, 0.61, 0.60],
      [0.68, 0.64, 0.61, 0.59, 0.58],
      [0.67, 0.63, 0.60, 0.58, 0.57],
      [0.66, 0.62, 0.59, 0.57, 0.56]
    ],
    model: 'SSVI' as const
  }

  it('should render the 3D volatility surface', () => {
    render(<VolatilitySurface3D data={mockSurfaceData} />)
    
    expect(screen.getByTestId('canvas')).toBeInTheDocument()
  })

  it('should display the correct model type', () => {
    render(<VolatilitySurface3D data={mockSurfaceData} />)
    
    expect(screen.getByText('SSVI Surface')).toBeInTheDocument()
  })

  it('should show controls for the surface', () => {
    render(<VolatilitySurface3D data={mockSurfaceData} />)
    
    expect(screen.getByText('Show Data Points')).toBeInTheDocument()
    expect(screen.getByText('Moneyness Scale')).toBeInTheDocument()
    expect(screen.getByText('Time Scale')).toBeInTheDocument()
  })

  it('should handle different model types', () => {
    const essviData = { ...mockSurfaceData, model: 'ESSVI' as const }
    render(<VolatilitySurface3D data={essviData} />)
    
    expect(screen.getByText('ESSVI Surface')).toBeInTheDocument()
  })

  it('should toggle data point visibility', async () => {
    const { rerender } = render(<VolatilitySurface3D data={mockSurfaceData} />)
    
    const showDataToggle = screen.getByRole('switch', { name: /show data/i })
    expect(showDataToggle).not.toBeChecked()
    
    // Toggle should be interactive
    showDataToggle.click()
    await waitFor(() => {
      expect(showDataToggle).toBeChecked()
    })
  })

  it('should handle empty data gracefully', () => {
    const emptyData = {
      strikes: [],
      expiries: [],
      surface: [],
      model: 'SSVI' as const
    }
    
    render(<VolatilitySurface3D data={emptyData} />)
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('should display strike and expiry ranges', () => {
    render(<VolatilitySurface3D data={mockSurfaceData} />)
    
    expect(screen.getByText(/Strike Range:/)).toBeInTheDocument()
    expect(screen.getByText(/0\.80 - 1\.20/)).toBeInTheDocument()
    expect(screen.getByText(/Expiry Range:/)).toBeInTheDocument()
    expect(screen.getByText(/7 - 90 days/)).toBeInTheDocument()
  })
})