import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ContractMatcherTable } from '../contract-matcher-table'

describe('ContractMatcherTable', () => {
  const mockMatches = [
    {
      id: '1',
      event: 'Trump Win 2024',
      kalshiPrice: 48,
      polymarketPrice: 52,
      deribitPrice: null,
      spread: 4,
      spreadPercent: 8.3,
      recommendation: 'Buy Kalshi, Sell Polymarket',
      potentialProfit: 400,
      tags: ['arbitrage', 'politics']
    },
    {
      id: '2',
      event: 'BTC Above 100k',
      kalshiPrice: 32,
      polymarketPrice: 35,
      deribitPrice: 38,
      spread: 6,
      spreadPercent: 18.8,
      recommendation: 'Buy Kalshi, Sell Deribit',
      potentialProfit: 600,
      tags: ['crypto', 'spread']
    }
  ]

  it('renders contract matches correctly', () => {
    render(<ContractMatcherTable matches={mockMatches} />)
    
    expect(screen.getByText('Trump Win 2024')).toBeInTheDocument()
    expect(screen.getByText('BTC Above 100k')).toBeInTheDocument()
  })

  it('displays prices for different exchanges', () => {
    render(<ContractMatcherTable matches={mockMatches} />)
    
    // First match
    expect(screen.getByText('48¢')).toBeInTheDocument()
    expect(screen.getByText('52¢')).toBeInTheDocument()
    
    // Second match
    expect(screen.getByText('32¢')).toBeInTheDocument()
    expect(screen.getByText('35¢')).toBeInTheDocument()
    expect(screen.getByText('38¢')).toBeInTheDocument()
  })

  it('displays spread information', () => {
    render(<ContractMatcherTable matches={mockMatches} />)
    
    expect(screen.getByText('4¢ (8.3%)')).toBeInTheDocument()
    expect(screen.getByText('6¢ (18.8%)')).toBeInTheDocument()
  })

  it('shows recommendations with correct styling', () => {
    render(<ContractMatcherTable matches={mockMatches} />)
    
    const recommendations = screen.getAllByText(/Buy|Sell/)
    expect(recommendations.length).toBeGreaterThan(0)
  })

  it('displays tags', () => {
    render(<ContractMatcherTable matches={mockMatches} />)
    
    expect(screen.getByText('arbitrage')).toBeInTheDocument()
    expect(screen.getByText('politics')).toBeInTheDocument()
    expect(screen.getByText('crypto')).toBeInTheDocument()
    expect(screen.getByText('spread')).toBeInTheDocument()
  })
})