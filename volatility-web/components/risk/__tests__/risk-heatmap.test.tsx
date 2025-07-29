import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RiskHeatmap } from '../risk-heatmap'

describe('RiskHeatmap', () => {
  const mockData = [
    { category: 'Market Risk', subcategory: 'Delta', value: 0.75, label: 'High' },
    { category: 'Market Risk', subcategory: 'Gamma', value: 0.45, label: 'Medium' },
    { category: 'Market Risk', subcategory: 'Vega', value: 0.25, label: 'Low' },
    { category: 'Credit Risk', subcategory: 'Counterparty', value: 0.65, label: 'High' },
    { category: 'Credit Risk', subcategory: 'Settlement', value: 0.35, label: 'Medium' },
    { category: 'Operational Risk', subcategory: 'System', value: 0.15, label: 'Low' },
    { category: 'Operational Risk', subcategory: 'Process', value: 0.55, label: 'Medium' }
  ]

  it('renders heatmap with all risk categories', () => {
    render(<RiskHeatmap data={mockData} />)
    
    expect(screen.getByText('Market Risk')).toBeInTheDocument()
    expect(screen.getByText('Credit Risk')).toBeInTheDocument()
    expect(screen.getByText('Operational Risk')).toBeInTheDocument()
  })

  it('displays risk subcategories', () => {
    render(<RiskHeatmap data={mockData} />)
    
    expect(screen.getByText('Delta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
    expect(screen.getByText('Vega')).toBeInTheDocument()
    expect(screen.getByText('Counterparty')).toBeInTheDocument()
  })

  it('applies correct color intensity based on risk value', () => {
    render(<RiskHeatmap data={mockData} />)
    
    const highRiskCell = screen.getByTestId('heatmap-cell-Market Risk-Delta')
    const lowRiskCell = screen.getByTestId('heatmap-cell-Operational Risk-System')
    
    expect(highRiskCell).toHaveClass('bg-red-600')
    expect(lowRiskCell).toHaveClass('bg-green-600')
  })
})