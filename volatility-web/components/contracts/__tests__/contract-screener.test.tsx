import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ContractScreenerTable } from '../contract-screener-table'

describe('ContractScreenerTable', () => {
  const mockContracts = [
    {
      id: '1',
      contract: 'BTC_Abov_100k',
      price: 420,
      size: 10000,
      value: 42000,
      pnl: 1800,
      delta: 0.85,
      gamma: 5.2,
      theta: -0.19,
      vega: 11,
      tags: ['btc', 'binary'],
      exchange: 'Polymarket'
    },
    {
      id: '2',
      contract: 'ETH_Over_5k',
      price: 470,
      size: 7500,
      value: 35250,
      pnl: -320,
      delta: 0.78,
      gamma: 4.8,
      theta: -0.1,
      vega: 9,
      tags: ['eth', 'binary'],
      exchange: 'Polymarket'
    }
  ]

  it('renders contract data correctly', () => {
    render(<ContractScreenerTable contracts={mockContracts} />)
    
    expect(screen.getByText('BTC_Abov_100k')).toBeInTheDocument()
    expect(screen.getByText('ETH_Over_5k')).toBeInTheDocument()
    expect(screen.getByText('$42,000')).toBeInTheDocument()
    expect(screen.getByText('$35,250')).toBeInTheDocument()
  })

  it('displays PnL with correct styling', () => {
    render(<ContractScreenerTable contracts={mockContracts} />)
    
    const profitPnl = screen.getByText('+$1,800')
    const lossPnl = screen.getByText('$320')
    
    expect(profitPnl).toHaveClass('text-green-600')
    expect(lossPnl).toHaveClass('text-red-600')
  })

  it('sorts columns when headers are clicked', () => {
    render(<ContractScreenerTable contracts={mockContracts} />)
    
    const priceHeader = screen.getByText('PRICE')
    fireEvent.click(priceHeader)
    
    // Check if sort indicator appears
    expect(screen.getByTestId('sort-indicator-price')).toBeInTheDocument()
  })

  it('displays tags correctly', () => {
    render(<ContractScreenerTable contracts={mockContracts} />)
    
    expect(screen.getByText('btc')).toBeInTheDocument()
    expect(screen.getAllByText('binary')).toHaveLength(2)
    expect(screen.getByText('eth')).toBeInTheDocument()
  })
})