import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DataSourceCard } from '@/components/data/data-source-card'
import { TrendingUp } from 'lucide-react'

describe('DataSourceCard', () => {
  const mockSource = {
    id: '1',
    name: 'Options Chain Data',
    type: 'market' as const,
    provider: 'Deribit',
    status: 'active' as const,
    lastSync: new Date('2024-01-15T12:00:00'),
    frequency: 'Real-time',
    dataPoints: 1250000,
    description: 'Live options chain data including bid/ask, volume, and open interest',
    icon: TrendingUp
  }

  const mockOnConfigure = jest.fn()
  const mockOnSync = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders data source information correctly', () => {
    render(
      <DataSourceCard
        source={mockSource}
        onConfigure={mockOnConfigure}
        onSync={mockOnSync}
      />
    )

    expect(screen.getByText('Options Chain Data')).toBeInTheDocument()
    expect(screen.getByText('Deribit')).toBeInTheDocument()
    expect(screen.getByText('market')).toBeInTheDocument()
    expect(screen.getByText('Live options chain data including bid/ask, volume, and open interest')).toBeInTheDocument()
  })

  it('displays correct status badge', () => {
    render(
      <DataSourceCard
        source={mockSource}
        onConfigure={mockOnConfigure}
        onSync={mockOnSync}
      />
    )

    expect(screen.getByText('active')).toBeInTheDocument()
  })

  it('formats data points correctly', () => {
    render(
      <DataSourceCard
        source={mockSource}
        onConfigure={mockOnConfigure}
        onSync={mockOnSync}
      />
    )

    expect(screen.getByText('1.3M')).toBeInTheDocument()
  })

  it('shows frequency information', () => {
    render(
      <DataSourceCard
        source={mockSource}
        onConfigure={mockOnConfigure}
        onSync={mockOnSync}
      />
    )

    expect(screen.getByText('Real-time')).toBeInTheDocument()
  })

  it('displays error state correctly', () => {
    const errorSource = {
      ...mockSource,
      status: 'error' as const
    }

    render(
      <DataSourceCard
        source={errorSource}
        onConfigure={mockOnConfigure}
        onSync={mockOnSync}
      />
    )

    expect(screen.getByText('error')).toBeInTheDocument()
    expect(screen.getByText('Connection failed. Check configuration.')).toBeInTheDocument()
  })

  it('formats smaller data point counts correctly', () => {
    const smallDataSource = {
      ...mockSource,
      dataPoints: 5500
    }

    render(
      <DataSourceCard
        source={smallDataSource}
        onConfigure={mockOnConfigure}
        onSync={mockOnSync}
      />
    )

    expect(screen.getByText('6K')).toBeInTheDocument()
  })

  it('shows dropdown menu when more button is clicked', async () => {
    render(
      <DataSourceCard
        source={mockSource}
        onConfigure={mockOnConfigure}
        onSync={mockOnSync}
      />
    )

    const moreButton = screen.getByRole('button')
    fireEvent.click(moreButton)

    await waitFor(() => {
      expect(screen.getByText('Sync Now')).toBeInTheDocument()
      expect(screen.getByText('Configure')).toBeInTheDocument()
    })
  })

  it('calls onSync when sync menu item is clicked', async () => {
    render(
      <DataSourceCard
        source={mockSource}
        onConfigure={mockOnConfigure}
        onSync={mockOnSync}
      />
    )

    const moreButton = screen.getByRole('button')
    fireEvent.click(moreButton)

    await waitFor(() => {
      const syncButton = screen.getByText('Sync Now')
      fireEvent.click(syncButton)
    })

    expect(mockOnSync).toHaveBeenCalledTimes(1)
  })

  it('calls onConfigure when configure menu item is clicked', async () => {
    render(
      <DataSourceCard
        source={mockSource}
        onConfigure={mockOnConfigure}
        onSync={mockOnSync}
      />
    )

    const moreButton = screen.getByRole('button')
    fireEvent.click(moreButton)

    await waitFor(() => {
      const configureButton = screen.getByText('Configure')
      fireEvent.click(configureButton)
    })

    expect(mockOnConfigure).toHaveBeenCalledTimes(1)
  })
})