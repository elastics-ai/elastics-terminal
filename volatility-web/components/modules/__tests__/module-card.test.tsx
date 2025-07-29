import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ModuleCard } from '../module-card'

describe('ModuleCard', () => {
  const mockModule = {
    id: '1',
    name: 'SSVI Surface',
    description: 'Stochastic Surface Volatility Inspired model for options pricing',
    category: 'function',
    version: '2.0.1',
    status: 'active',
    lastUpdated: '2024-01-15T10:00:00Z',
    author: 'Elastics Team',
    dependencies: ['numpy', 'scipy'],
    tags: ['volatility', 'options', 'pricing']
  }

  it('renders module information correctly', () => {
    render(<ModuleCard module={mockModule} />)
    
    expect(screen.getByText('SSVI Surface')).toBeInTheDocument()
    expect(screen.getByText('Stochastic Surface Volatility Inspired model for options pricing')).toBeInTheDocument()
    expect(screen.getByText('v2.0.1')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('displays correct status badge', () => {
    const { rerender } = render(<ModuleCard module={mockModule} />)
    
    let badge = screen.getByText('Active')
    expect(badge).toHaveClass('bg-green-100')
    
    rerender(<ModuleCard module={{ ...mockModule, status: 'inactive' }} />)
    badge = screen.getByText('Inactive')
    expect(badge).toHaveClass('bg-gray-100')
  })

  it('shows category icon correctly', () => {
    render(<ModuleCard module={mockModule} />)
    
    const icon = screen.getByTestId('category-icon')
    expect(icon).toBeInTheDocument()
  })

  it('displays tags', () => {
    render(<ModuleCard module={mockModule} />)
    
    expect(screen.getByText('volatility')).toBeInTheDocument()
    expect(screen.getByText('options')).toBeInTheDocument()
    expect(screen.getByText('pricing')).toBeInTheDocument()
  })
})