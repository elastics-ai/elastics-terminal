/**
 * Tests for Polymarket MarketDetailsModal component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { MarketDetailsModal } from '@/components/bloomberg/views/polymarket/market-details-modal'

// Mock the utils
jest.mock('@/lib/utils', () => ({
  formatNumber: jest.fn((num, decimals) => num.toFixed(decimals)),
  formatCurrency: jest.fn((num) => `$${num.toLocaleString()}`)
}))

const mockMarket = {
  id: 'test-market-1',
  question: 'Will Bitcoin reach $100,000 by end of 2024?',
  yes_percentage: 35.2,
  no_percentage: 64.8,
  volume: 1250000,
  end_date: '2024-12-31',
  category: 'Crypto',
  tags: ['bitcoin', 'crypto', 'price'],
  active: true,
  description: 'This market resolves to "Yes" if Bitcoin (BTC) closes above $100,000 on any day before January 1, 2025.'
}

describe('MarketDetailsModal', () => {
  const mockOnClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders market details correctly', () => {
    render(<MarketDetailsModal market={mockMarket} onClose={mockOnClose} />)

    // Check title and question
    expect(screen.getByText('MARKET DETAILS')).toBeInTheDocument()
    expect(screen.getByText('Will Bitcoin reach $100,000 by end of 2024?')).toBeInTheDocument()

    // Check percentages
    expect(screen.getByText('35.2%')).toBeInTheDocument()
    expect(screen.getByText('64.8%')).toBeInTheDocument()

    // Check volume
    expect(screen.getByText('$1,250,000')).toBeInTheDocument()

    // Check category and status
    expect(screen.getByText('Crypto')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()

    // Check description
    expect(screen.getByText(/This market resolves to "Yes"/)).toBeInTheDocument()
  })

  it('renders tags when present', () => {
    render(<MarketDetailsModal market={mockMarket} onClose={mockOnClose} />)

    expect(screen.getByText('TAGS')).toBeInTheDocument()
    expect(screen.getByText('bitcoin')).toBeInTheDocument()
    expect(screen.getByText('crypto')).toBeInTheDocument()
    expect(screen.getByText('price')).toBeInTheDocument()
  })

  it('does not render tags section when tags are empty', () => {
    const marketWithoutTags = { ...mockMarket, tags: [] }
    render(<MarketDetailsModal market={marketWithoutTags} onClose={mockOnClose} />)

    expect(screen.queryByText('TAGS')).not.toBeInTheDocument()
  })

  it('does not render description section when description is not provided', () => {
    const marketWithoutDescription = { ...mockMarket, description: undefined }
    render(<MarketDetailsModal market={marketWithoutDescription} onClose={mockOnClose} />)

    expect(screen.queryByText('DESCRIPTION')).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<MarketDetailsModal market={mockMarket} onClose={mockOnClose} />)

    const closeButton = screen.getByText('✕')
    fireEvent.click(closeButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when background overlay is clicked', () => {
    render(<MarketDetailsModal market={mockMarket} onClose={mockOnClose} />)

    const overlay = screen.getByText('MARKET DETAILS').closest('div')?.parentElement
    fireEvent.click(overlay!)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when modal content is clicked', () => {
    render(<MarketDetailsModal market={mockMarket} onClose={mockOnClose} />)

    const modalContent = screen.getByText('MARKET DETAILS').closest('div')
    fireEvent.click(modalContent!)

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('renders correct status for inactive market', () => {
    const inactiveMarket = { ...mockMarket, active: false }
    render(<MarketDetailsModal market={inactiveMarket} onClose={mockOnClose} />)

    expect(screen.getByText('CLOSED')).toBeInTheDocument()
  })

  it('applies correct styling classes for unified theme', () => {
    render(<MarketDetailsModal market={mockMarket} onClose={mockOnClose} />)

    const modalContent = screen.getByText('MARKET DETAILS').closest('div')
    expect(modalContent).toHaveClass('bg-background', 'border', 'border-border', 'rounded-lg')

    // Check YES percentage styling
    const yesPercentage = screen.getByText('35.2%')
    expect(yesPercentage).toHaveClass('text-green-600', 'dark:text-green-400')

    // Check NO percentage styling
    const noPercentage = screen.getByText('64.8%')
    expect(noPercentage).toHaveClass('text-red-600', 'dark:text-red-400')
  })

  it('handles market with null/undefined values gracefully', () => {
    const incompleteMarket = {
      id: 'test',
      question: 'Test question',
      yes_percentage: 50,
      no_percentage: 50,
      volume: 0,
      end_date: '',
      category: '',
      tags: null,
      active: true,
      description: null
    }

    render(<MarketDetailsModal market={incompleteMarket} onClose={mockOnClose} />)

    expect(screen.getByText('Test question')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.queryByText('TAGS')).not.toBeInTheDocument()
    expect(screen.queryByText('DESCRIPTION')).not.toBeInTheDocument()
  })

  it('displays formatted end date correctly', () => {
    render(<MarketDetailsModal market={mockMarket} onClose={mockOnClose} />)

    // The FormattedTime component should render the date
    // We can't easily test the exact format without mocking the component
    // but we can verify the End Date label is present
    expect(screen.getByText('End Date:')).toBeInTheDocument()
  })
})