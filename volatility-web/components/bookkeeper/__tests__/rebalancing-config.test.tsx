import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RebalancingConfig } from '../rebalancing-config'

// Mock Radix UI components to avoid rendering issues in tests
jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, disabled }: any) => {
    // Extract options from children
    const options = React.Children.toArray(children).flatMap((child: any) => {
      if (child?.type?.name === 'SelectContent') {
        return React.Children.toArray(child.props.children).filter((c: any) => c?.type?.name === 'SelectItem')
      }
      return []
    })
    
    return (
      <select 
        onChange={(e) => onValueChange && onValueChange(e.target.value)} 
        value={value}
        disabled={disabled}
        data-testid="select"
      >
        {options.map((option: any, i: number) => (
          <option key={i} value={option.props.value}>
            {option.props.children}
          </option>
        ))}
      </select>
    )
  },
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => null, // Will be processed by Select
  SelectTrigger: ({ children, id }: any) => null, // Not needed for test
  SelectValue: ({ placeholder }: any) => null, // Not needed for test
}))

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id, disabled }: any) => (
    <button
      role="switch"
      id={id}
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      disabled={disabled}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
    >
      <span data-state={checked ? 'checked' : 'unchecked'} />
    </button>
  ),
}))

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, step, disabled, id }: any) => (
    <input
      type="range"
      id={id}
      value={value[0]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onValueChange && onValueChange([parseInt(e.target.value)])}
    />
  ),
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}))

describe('RebalancingConfig', () => {
  const mockProps = {
    autoRebalance: false,
    rebalanceInterval: '1h',
    maxDeviation: 15,
    onAutoRebalanceChange: jest.fn(),
    onIntervalChange: jest.fn(),
    onMaxDeviationChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders configuration sections correctly', () => {
    render(<RebalancingConfig {...mockProps} />)
    
    expect(screen.getByText('Auto-Rebalancing Settings')).toBeInTheDocument()
    expect(screen.getByText('Risk Controls')).toBeInTheDocument()
    expect(screen.getByText('Trading Hours')).toBeInTheDocument()
    expect(screen.getByText('Enable Auto-Rebalancing')).toBeInTheDocument()
    expect(screen.getByText('Rebalance Interval')).toBeInTheDocument()
    expect(screen.getByText('Maximum Deviation (%)')).toBeInTheDocument()
  })

  it('displays current configuration values', () => {
    const enabledProps = { ...mockProps, autoRebalance: true }
    render(<RebalancingConfig {...enabledProps} />)
    
    // Check that the current values are displayed
    expect(screen.getByText('15%')).toBeInTheDocument() // maxDeviation display
    expect(screen.getByDisplayValue('10')).toBeInTheDocument() // max trades default
    expect(screen.getByDisplayValue('50000')).toBeInTheDocument() // max cost default
    expect(screen.getByDisplayValue('09:30')).toBeInTheDocument() // start time default
    expect(screen.getByDisplayValue('16:00')).toBeInTheDocument() // end time default
  })

  it('calls onIntervalChange when rebalance interval is changed', () => {
    const enabledProps = { ...mockProps, autoRebalance: true }
    render(<RebalancingConfig {...enabledProps} />)
    
    // Find the select element
    const select = screen.getByTestId('select')
    
    fireEvent.change(select, { target: { value: '15m' } })
    
    expect(mockProps.onIntervalChange).toHaveBeenCalledWith('15m')
  })

  it('calls onAutoRebalanceChange when switch is toggled', () => {
    render(<RebalancingConfig {...mockProps} />)
    
    // Get the specific switch by its ID
    const switchButton = document.getElementById('auto-rebalance')
    
    fireEvent.click(switchButton!)
    
    expect(mockProps.onAutoRebalanceChange).toHaveBeenCalledWith(true)
  })

  it('calls onMaxDeviationChange when slider is moved', () => {
    const enabledProps = { ...mockProps, autoRebalance: true }
    render(<RebalancingConfig {...enabledProps} />)
    
    const slider = screen.getByRole('slider')
    
    fireEvent.change(slider, { target: { value: '25' } })
    
    expect(mockProps.onMaxDeviationChange).toHaveBeenCalledWith(25)
  })

  it('disables controls when auto-rebalance is off', () => {
    render(<RebalancingConfig {...mockProps} />)
    
    const slider = screen.getByRole('slider')
    const select = screen.getByTestId('select')
    
    expect(slider).toBeDisabled()
    expect(select).toBeDisabled()
  })

  it('displays save button', () => {
    render(<RebalancingConfig {...mockProps} />)
    
    expect(screen.getByText('Save Settings')).toBeInTheDocument()
  })
})