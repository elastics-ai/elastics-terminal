import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import PortfolioPage from '@/app/portfolio/page'

// Mock the components
jest.mock('@/components/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('recharts', () => ({
  LineChart: () => <div data-testid="line-chart" />,
  BarChart: () => <div data-testid="bar-chart" />,
  PieChart: () => <div data-testid="pie-chart" />,
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Cell: () => null,
}))

describe('PortfolioPage', () => {
  it('renders portfolio page with header', () => {
    render(<PortfolioPage />)
    
    expect(screen.getByText('Portfolio Analysis')).toBeInTheDocument()
    expect(screen.getByText('Comprehensive portfolio performance and risk metrics')).toBeInTheDocument()
  })

  it('displays key metrics cards', () => {
    render(<PortfolioPage />)
    
    expect(screen.getByText('Total Value')).toBeInTheDocument()
    expect(screen.getByText('$2,547,890')).toBeInTheDocument()
    expect(screen.getByText('Daily P&L')).toBeInTheDocument()
    expect(screen.getByText('Sharpe Ratio')).toBeInTheDocument()
    expect(screen.getByText('Max Drawdown')).toBeInTheDocument()
  })

  it('shows correct P&L formatting', () => {
    render(<PortfolioPage />)
    
    expect(screen.getByText('+$12,340')).toBeInTheDocument()
    expect(screen.getByText('+0.48%')).toBeInTheDocument()
  })

  it('renders all tabs', () => {
    render(<PortfolioPage />)
    
    expect(screen.getByRole('tab', { name: 'Performance' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Positions' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Allocation' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Greeks' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Risk Analysis' })).toBeInTheDocument()
  })

  it('switches between tabs', () => {
    render(<PortfolioPage />)
    
    // Click on Positions tab
    fireEvent.click(screen.getByRole('tab', { name: 'Positions' }))
    expect(screen.getByText('Open Positions')).toBeInTheDocument()
    
    // Click on Greeks tab
    fireEvent.click(screen.getByRole('tab', { name: 'Greeks' }))
    expect(screen.getByText('Greeks Exposure')).toBeInTheDocument()
  })

  it('displays positions table with correct data', () => {
    render(<PortfolioPage />)
    
    fireEvent.click(screen.getByRole('tab', { name: 'Positions' }))
    
    expect(screen.getByText('SPX 4500C 03/15')).toBeInTheDocument()
    expect(screen.getByText('SPX 4400P 03/15')).toBeInTheDocument()
    expect(screen.getByText('+$340.00')).toBeInTheDocument()
    expect(screen.getByText('+14.95%')).toBeInTheDocument()
  })

  it('shows Greeks with targets', () => {
    render(<PortfolioPage />)
    
    fireEvent.click(screen.getByRole('tab', { name: 'Greeks' }))
    
    expect(screen.getByText('Delta')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
    expect(screen.getByText('Vega')).toBeInTheDocument()
    expect(screen.getByText('Theta')).toBeInTheDocument()
    expect(screen.getByText('Rho')).toBeInTheDocument()
    
    expect(screen.getByText('Target: 0.2')).toBeInTheDocument()
  })

  it('has timeframe selector', () => {
    render(<PortfolioPage />)
    
    const timeframeSelector = screen.getByRole('combobox')
    expect(timeframeSelector).toBeInTheDocument()
    
    fireEvent.click(timeframeSelector)
    expect(screen.getByText('1 Day')).toBeInTheDocument()
    expect(screen.getByText('1 Week')).toBeInTheDocument()
    expect(screen.getByText('1 Month')).toBeInTheDocument()
  })

  it('has export and settings buttons', () => {
    render(<PortfolioPage />)
    
    expect(screen.getByText('Export')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })
})