import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DataSourceCard } from '../data-source-card'
import { Database } from 'lucide-react'

// Mock Radix UI DropdownMenu to avoid rendering issues in tests
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div role="menuitem" onClick={onClick}>{children}</div>
  ),
}))

describe('DataSourceCard', () => {
  const mockDataSource = {
    id: '1',
    name: 'US Stock Market Data',
    type: 'market' as const,
    provider: 'NYSE',
    status: 'active' as const,
    lastSync: new Date('2024-01-15T10:00:00Z'),
    frequency: 'Real-time',
    dataPoints: 1500000,
    description: 'Real-time US stock market data with comprehensive coverage',
    icon: Database
  }

  const mockOnConfigure = jest.fn()
  const mockOnSync = jest.fn()

  beforeEach(() => {
    mockOnConfigure.mockClear()
    mockOnSync.mockClear()
  })

  it('renders data source information correctly', () => {
    render(
      <DataSourceCard 
        source={mockDataSource} 
        onConfigure={mockOnConfigure} 
        onSync={mockOnSync} 
      />
    )
    
    expect(screen.getByText('US Stock Market Data')).toBeInTheDocument()
    expect(screen.getByText('NYSE')).toBeInTheDocument()
    expect(screen.getByText('market')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('displays correct status badge variant', () => {
    const { rerender } = render(
      <DataSourceCard 
        source={mockDataSource} 
        onConfigure={mockOnConfigure} 
        onSync={mockOnSync} 
      />
    )
    
    let badge = screen.getByText('active')
    expect(badge).toBeInTheDocument()
    
    rerender(
      <DataSourceCard 
        source={{ ...mockDataSource, status: 'inactive' }} 
        onConfigure={mockOnConfigure} 
        onSync={mockOnSync} 
      />
    )
    badge = screen.getByText('inactive')
    expect(badge).toBeInTheDocument()
  })

  it('shows data source details correctly', () => {
    render(
      <DataSourceCard 
        source={mockDataSource} 
        onConfigure={mockOnConfigure} 
        onSync={mockOnSync} 
      />
    )
    
    expect(screen.getByText('Real-time')).toBeInTheDocument()
    expect(screen.getByText('1.5M')).toBeInTheDocument() // 1,500,000 formatted as 1.5M
    expect(screen.getByText('Real-time US stock market data with comprehensive coverage')).toBeInTheDocument()
  })

  it('handles dropdown menu interactions', () => {
    render(
      <DataSourceCard 
        source={mockDataSource} 
        onConfigure={mockOnConfigure} 
        onSync={mockOnSync} 
      />
    )
    
    const syncButton = screen.getByText('Sync Now')
    const configureButton = screen.getByText('Configure')
    
    fireEvent.click(syncButton)
    expect(mockOnSync).toHaveBeenCalledTimes(1)
    
    fireEvent.click(configureButton)
    expect(mockOnConfigure).toHaveBeenCalledTimes(1)
  })

  it('displays error state correctly', () => {
    const errorSource = { ...mockDataSource, status: 'error' as const }
    
    render(
      <DataSourceCard 
        source={errorSource} 
        onConfigure={mockOnConfigure} 
        onSync={mockOnSync} 
      />
    )
    
    expect(screen.getByText('Connection failed. Check configuration.')).toBeInTheDocument()
  })

  it('formats data points correctly', () => {
    const { rerender } = render(
      <DataSourceCard 
        source={{ ...mockDataSource, dataPoints: 999 }} 
        onConfigure={mockOnConfigure} 
        onSync={mockOnSync} 
      />
    )
    
    expect(screen.getByText('999')).toBeInTheDocument()
    
    rerender(
      <DataSourceCard 
        source={{ ...mockDataSource, dataPoints: 1500 }} 
        onConfigure={mockOnConfigure} 
        onSync={mockOnSync} 
      />
    )
    expect(screen.getByText('2K')).toBeInTheDocument() // 1500 rounds to 2K
    
    rerender(
      <DataSourceCard 
        source={{ ...mockDataSource, dataPoints: 2500000 }} 
        onConfigure={mockOnConfigure} 
        onSync={mockOnSync} 
      />
    )
    expect(screen.getByText('2.5M')).toBeInTheDocument()
  })
})