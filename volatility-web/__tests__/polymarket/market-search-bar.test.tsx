/**
 * Tests for Polymarket MarketSearchBar component
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { MarketSearchBar } from '@/components/bloomberg/views/polymarket/market-search-bar'

describe('MarketSearchBar', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search input with placeholder text', () => {
    render(<MarketSearchBar value="" onChange={mockOnChange} />)

    const searchInput = screen.getByPlaceholderText('Search by market question, category, or tags...')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveValue('')
  })

  it('displays current search value', () => {
    const testValue = 'bitcoin price'
    render(<MarketSearchBar value={testValue} onChange={mockOnChange} />)

    const searchInput = screen.getByDisplayValue(testValue)
    expect(searchInput).toBeInTheDocument()
  })

  it('calls onChange when input value changes', () => {
    render(<MarketSearchBar value="" onChange={mockOnChange} />)

    const searchInput = screen.getByPlaceholderText('Search by market question, category, or tags...')
    fireEvent.change(searchInput, { target: { value: 'ethereum' } })

    expect(mockOnChange).toHaveBeenCalledWith('ethereum')
  })

  it('shows clear button when value is not empty', () => {
    render(<MarketSearchBar value="test query" onChange={mockOnChange} />)

    const clearButton = screen.getByText('CLEAR')
    expect(clearButton).toBeInTheDocument()
  })

  it('hides clear button when value is empty', () => {
    render(<MarketSearchBar value="" onChange={mockOnChange} />)

    const clearButton = screen.queryByText('CLEAR')
    expect(clearButton).not.toBeInTheDocument()
  })

  it('clears input when clear button is clicked', () => {
    render(<MarketSearchBar value="test query" onChange={mockOnChange} />)

    const clearButton = screen.getByText('CLEAR')
    fireEvent.click(clearButton)

    expect(mockOnChange).toHaveBeenCalledWith('')
  })

  it('applies correct styling classes for unified theme', () => {
    render(<MarketSearchBar value="" onChange={mockOnChange} />)

    const container = screen.getByText('SEARCH:').closest('div')?.parentElement
    expect(container).toHaveClass('border', 'border-border', 'rounded-lg')

    const searchInput = screen.getByPlaceholderText('Search by market question, category, or tags...')
    expect(searchInput).toHaveClass('text-foreground', 'placeholder:text-muted-foreground')
  })

  it('applies focus styles correctly', () => {
    render(<MarketSearchBar value="" onChange={mockOnChange} />)

    const searchInput = screen.getByPlaceholderText('Search by market question, category, or tags...')
    expect(searchInput).toHaveClass('focus:border-primary')
  })

  it('clear button has correct hover styles', () => {
    render(<MarketSearchBar value="test" onChange={mockOnChange} />)

    const clearButton = screen.getByText('CLEAR')
    expect(clearButton).toHaveClass('hover:text-foreground')
  })
})