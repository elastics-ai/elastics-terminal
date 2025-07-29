import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import DataLibraryPage from '@/app/data-library/page'

// Mock the components
jest.mock('@/components/layout/app-layout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@/components/data/data-source-card', () => ({
  DataSourceCard: ({ source }: any) => (
    <div data-testid="data-source-card">
      <div>{source.name}</div>
      <div>{source.provider}</div>
    </div>
  )
}))

describe('DataLibraryPage', () => {
  it('renders page header correctly', () => {
    render(<DataLibraryPage />)
    
    expect(screen.getByText('Data Library')).toBeInTheDocument()
    expect(screen.getByText('Manage and monitor all data sources')).toBeInTheDocument()
  })

  it('displays stats cards', () => {
    render(<DataLibraryPage />)
    
    expect(screen.getByText('Total Sources')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('Active Sources')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Total Data Points')).toBeInTheDocument()
    expect(screen.getByText('9.7M')).toBeInTheDocument()
  })

  it('renders all tabs', () => {
    render(<DataLibraryPage />)
    
    expect(screen.getByRole('tab', { name: 'Data Catalog' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pipelines' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Data Quality' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Usage Analytics' })).toBeInTheDocument()
  })

  it('displays data sources in catalog', () => {
    render(<DataLibraryPage />)
    
    expect(screen.getByText('Options Chain Data')).toBeInTheDocument()
    expect(screen.getByText('Historical Volatility')).toBeInTheDocument()
    expect(screen.getByText('Market Indices')).toBeInTheDocument()
    expect(screen.getByText('Custom Greeks Model')).toBeInTheDocument()
  })

  it('filters data sources by search query', () => {
    render(<DataLibraryPage />)
    
    const searchInput = screen.getByPlaceholderText('Search data sources...')
    fireEvent.change(searchInput, { target: { value: 'Options' } })
    
    expect(screen.getByText('Options Chain Data')).toBeInTheDocument()
    expect(screen.queryByText('Historical Volatility')).not.toBeInTheDocument()
  })

  it('filters data sources by type', () => {
    render(<DataLibraryPage />)
    
    const typeSelect = screen.getAllByRole('combobox')[0]
    fireEvent.click(typeSelect)
    fireEvent.click(screen.getByText('Market Data'))
    
    expect(screen.getByText('Options Chain Data')).toBeInTheDocument()
    expect(screen.getByText('Market Indices')).toBeInTheDocument()
    expect(screen.queryByText('Custom Greeks Model')).not.toBeInTheDocument()
  })

  it('filters data sources by status', () => {
    render(<DataLibraryPage />)
    
    const statusSelect = screen.getAllByRole('combobox')[1]
    fireEvent.click(statusSelect)
    fireEvent.click(screen.getByText('Error'))
    
    expect(screen.getByText('Economic Calendar')).toBeInTheDocument()
    expect(screen.queryByText('Options Chain Data')).not.toBeInTheDocument()
  })

  it('shows data quality metrics', () => {
    render(<DataLibraryPage />)
    
    fireEvent.click(screen.getByRole('tab', { name: 'Data Quality' }))
    
    expect(screen.getByText('Data Quality Monitoring')).toBeInTheDocument()
    expect(screen.getByText('Completeness')).toBeInTheDocument()
    expect(screen.getByText('98.5%')).toBeInTheDocument()
    expect(screen.getByText('Accuracy')).toBeInTheDocument()
    expect(screen.getByText('99.2%')).toBeInTheDocument()
  })

  it('has add data source button', () => {
    render(<DataLibraryPage />)
    
    expect(screen.getByText('Add Data Source')).toBeInTheDocument()
  })
})