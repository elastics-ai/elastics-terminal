import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FlowBuilder } from '@/components/agent-builder/flow-builder'

// Mock @xyflow/react
jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children }: any) => <div data-testid="react-flow">{children}</div>,
  MiniMap: () => <div data-testid="mini-map" />,
  Controls: () => <div data-testid="controls" />,
  Background: () => <div data-testid="background" />,
  Panel: ({ children, position }: any) => <div data-testid={`panel-${position}`}>{children}</div>,
  useNodesState: () => [[], jest.fn(), jest.fn()],
  useEdgesState: () => [[], jest.fn(), jest.fn()],
  addEdge: jest.fn(),
}))

describe('FlowBuilder', () => {
  const mockAgent = {
    id: '1',
    name: 'Test Agent',
    description: 'Test description'
  }

  it('renders flow builder with correct title for new agent', () => {
    render(<FlowBuilder agent={null} isNew={true} />)
    
    expect(screen.getByText('New Agent Flow')).toBeInTheDocument()
  })

  it('renders flow builder with agent name', () => {
    render(<FlowBuilder agent={mockAgent} isNew={false} />)
    
    expect(screen.getByText('Test Agent')).toBeInTheDocument()
  })

  it('displays all node types in sidebar', () => {
    render(<FlowBuilder agent={mockAgent} isNew={false} />)
    
    expect(screen.getByText('Data Source')).toBeInTheDocument()
    expect(screen.getByText('Calculate')).toBeInTheDocument()
    expect(screen.getByText('Condition')).toBeInTheDocument()
    expect(screen.getByText('Filter')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Timer')).toBeInTheDocument()
    expect(screen.getByText('Alert')).toBeInTheDocument()
  })

  it('displays node descriptions', () => {
    render(<FlowBuilder agent={mockAgent} isNew={false} />)
    
    expect(screen.getByText('Connect to market data')).toBeInTheDocument()
    expect(screen.getByText('Perform calculations')).toBeInTheDocument()
    expect(screen.getByText('If/then logic')).toBeInTheDocument()
  })

  it('renders control buttons', () => {
    render(<FlowBuilder agent={mockAgent} isNew={false} />)
    
    expect(screen.getByText('Validate')).toBeInTheDocument()
    expect(screen.getByText('Generate Code')).toBeInTheDocument()
  })

  it('renders properties panel', () => {
    render(<FlowBuilder agent={mockAgent} isNew={false} />)
    
    expect(screen.getByText('Properties')).toBeInTheDocument()
    expect(screen.getByText('Select a node to view its properties')).toBeInTheDocument()
  })
})