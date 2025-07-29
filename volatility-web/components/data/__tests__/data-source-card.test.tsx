import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DataSourceCard } from '../data-source-card'

describe('DataSourceCard', () => {
  const mockDataSource = {
    id: '1',
    name: 'US Stock Market Data',
    publisher: 'NYSE',
    region: 'Americas',
    version: '2.1.0',
    status: 'active',
    lastUpdated: '2024-01-15T10:00:00Z',
    schema: 'OHLCV',
    availableHistory: '10 years',
    tags: ['equities', 'realtime']
  }

  it('renders data source information correctly', () => {
    render(<DataSourceCard dataSource={mockDataSource} />)
    
    expect(screen.getByText('US Stock Market Data')).toBeInTheDocument()
    expect(screen.getByText(/NYSE/)).toBeInTheDocument()
    expect(screen.getByText('v2.1.0')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('displays correct status badge color', () => {
    const { rerender } = render(<DataSourceCard dataSource={mockDataSource} />)
    
    let badge = screen.getByText('Active')
    expect(badge).toHaveClass('bg-green-100')
    
    rerender(<DataSourceCard dataSource={{ ...mockDataSource, status: 'inactive' }} />)
    badge = screen.getByText('Inactive')
    expect(badge).toHaveClass('bg-gray-100')
  })

  it('shows tags correctly', () => {
    render(<DataSourceCard dataSource={mockDataSource} />)
    
    expect(screen.getByText('equities')).toBeInTheDocument()
    expect(screen.getByText('realtime')).toBeInTheDocument()
  })
})