import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RebalancingConfig } from '../rebalancing-config'

describe('RebalancingConfig', () => {
  const mockConfig = {
    timeFrequency: 'daily',
    driftFrequency: 10,
    slippageBudget: 50,
    optimizer: 'quadratic',
    tags: ['macro', 'crypto'],
    tradableMarkets: ['Kalshi', 'Polymarket']
  }

  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders configuration options correctly', () => {
    render(<RebalancingConfig config={mockConfig} onChange={mockOnChange} />)
    
    expect(screen.getByText('Rebalancing Configuration')).toBeInTheDocument()
    expect(screen.getByText('Time Frequency')).toBeInTheDocument()
    expect(screen.getByText('Drift Frequency (%)')).toBeInTheDocument()
    expect(screen.getByText('Slippage Budget (bps)')).toBeInTheDocument()
    expect(screen.getByText('Optimizer')).toBeInTheDocument()
  })

  it('displays current configuration values', () => {
    render(<RebalancingConfig config={mockConfig} onChange={mockOnChange} />)
    
    // Check that the text values are displayed
    expect(screen.getByText('Daily')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('50')).toBeInTheDocument()
    expect(screen.getByText('Quadratic')).toBeInTheDocument()
  })

  it('calls onChange when time frequency is changed', () => {
    render(<RebalancingConfig config={mockConfig} onChange={mockOnChange} />)
    
    // Find the select containing "Daily" and change it
    const selects = screen.getAllByRole('combobox')
    const timeSelect = selects[0] // First select is time frequency
    
    fireEvent.change(timeSelect, { target: { value: 'hourly' } })
    
    expect(mockOnChange).toHaveBeenCalledWith({
      ...mockConfig,
      timeFrequency: 'hourly'
    })
  })

  it('displays selected tags', () => {
    render(<RebalancingConfig config={mockConfig} onChange={mockOnChange} />)
    
    expect(screen.getByText('macro')).toBeInTheDocument()
    expect(screen.getByText('crypto')).toBeInTheDocument()
  })

  it('displays tradable markets checkboxes', () => {
    render(<RebalancingConfig config={mockConfig} onChange={mockOnChange} />)
    
    expect(screen.getByLabelText('Kalshi')).toBeChecked()
    expect(screen.getByLabelText('Polymarket')).toBeChecked()
    expect(screen.getByLabelText('Deribit')).not.toBeChecked()
  })
})