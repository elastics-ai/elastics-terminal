import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import FlowBuilder from '@/components/agent-builder/flow-builder'
import { agentAPI } from '@/lib/api'
import { ReactFlowProvider } from 'reactflow'

// Mock ReactFlow
jest.mock('reactflow', () => ({
  __esModule: true,
  default: ({ children, nodes, edges, onNodesChange, onEdgesChange }: any) => (
    <div data-testid="react-flow">
      <div data-testid="nodes">{JSON.stringify(nodes)}</div>
      <div data-testid="edges">{JSON.stringify(edges)}</div>
      {children}
    </div>
  ),
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
  Background: () => <div data-testid="flow-background" />,
  Controls: () => <div data-testid="flow-controls" />,
  MiniMap: () => <div data-testid="flow-minimap" />,
  Panel: ({ children, position }: any) => (
    <div data-testid={`flow-panel-${position}`}>{children}</div>
  ),
  Handle: ({ type, position }: any) => (
    <div data-testid={`handle-${type}-${position}`} />
  ),
  useReactFlow: () => ({
    getNodes: jest.fn(() => []),
    getEdges: jest.fn(() => []),
    setNodes: jest.fn(),
    setEdges: jest.fn(),
    addNodes: jest.fn(),
    addEdges: jest.fn(),
    deleteElements: jest.fn(),
    fitView: jest.fn(),
  }),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
}))

// Mock the API
jest.mock('@/lib/api', () => ({
  agentAPI: {
    getAgentTemplates: jest.fn(),
    saveAgent: jest.fn(),
    validateFlow: jest.fn(),
    executeAgent: jest.fn(),
    getNodeTypes: jest.fn(),
  },
}))

const mockAgentAPI = agentAPI as jest.Mocked<typeof agentAPI>

describe('FlowBuilder', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    jest.clearAllMocks()
  })

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ReactFlowProvider>
          <FlowBuilder {...props} />
        </ReactFlowProvider>
      </QueryClientProvider>
    )
  }

  const mockNodeTypes = [
    {
      type: 'dataSource',
      label: 'Data Source',
      category: 'input',
      icon: 'Database',
      fields: [
        { name: 'source', type: 'select', options: ['Deribit', 'Kalshi', 'Polymarket'] },
        { name: 'dataType', type: 'select', options: ['Price', 'Volume', 'Volatility'] },
      ],
    },
    {
      type: 'filter',
      label: 'Filter',
      category: 'processing',
      icon: 'Filter',
      fields: [
        { name: 'condition', type: 'select', options: ['Greater than', 'Less than', 'Equals'] },
        { name: 'value', type: 'number' },
      ],
    },
    {
      type: 'alert',
      label: 'Alert',
      category: 'output',
      icon: 'Bell',
      fields: [
        { name: 'channel', type: 'select', options: ['Email', 'SMS', 'Webhook'] },
        { name: 'message', type: 'text' },
      ],
    },
  ]

  describe('Flow Canvas', () => {
    it('should render the flow builder canvas', () => {
      renderComponent()

      expect(screen.getByTestId('react-flow')).toBeInTheDocument()
      expect(screen.getByTestId('flow-background')).toBeInTheDocument()
      expect(screen.getByTestId('flow-controls')).toBeInTheDocument()
    })

    it('should display the node palette', async () => {
      mockAgentAPI.getNodeTypes.mockResolvedValue(mockNodeTypes)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Node Palette')).toBeInTheDocument()
        expect(screen.getByText('Data Source')).toBeInTheDocument()
        expect(screen.getByText('Filter')).toBeInTheDocument()
        expect(screen.getByText('Alert')).toBeInTheDocument()
      })
    })

    it('should categorize nodes', async () => {
      mockAgentAPI.getNodeTypes.mockResolvedValue(mockNodeTypes)

      renderComponent()

      await waitFor(() => {
        expect(screen.getByText('Input')).toBeInTheDocument()
        expect(screen.getByText('Processing')).toBeInTheDocument()
        expect(screen.getByText('Output')).toBeInTheDocument()
      })
    })
  })

  describe('Node Operations', () => {
    it('should add node by dragging from palette', async () => {
      mockAgentAPI.getNodeTypes.mockResolvedValue(mockNodeTypes)

      renderComponent()

      await waitFor(() => {
        const dataSourceNode = screen.getByText('Data Source')
        
        // Simulate drag and drop
        fireEvent.dragStart(dataSourceNode)
        fireEvent.dragEnter(screen.getByTestId('react-flow'))
        fireEvent.drop(screen.getByTestId('react-flow'))
      })

      // Node should be added to the flow
      expect(screen.getByTestId('nodes')).toHaveTextContent('dataSource')
    })

    it('should open node configuration on click', async () => {
      const initialNodes = [
        {
          id: '1',
          type: 'dataSource',
          position: { x: 100, y: 100 },
          data: { label: 'Data Source', source: 'Deribit' },
        },
      ]

      renderComponent({ initialNodes })

      // Click on the node
      fireEvent.click(screen.getByText('Data Source'))

      await waitFor(() => {
        expect(screen.getByText('Configure Node')).toBeInTheDocument()
        expect(screen.getByLabelText('Source')).toBeInTheDocument()
        expect(screen.getByLabelText('Data Type')).toBeInTheDocument()
      })
    })

    it('should update node configuration', async () => {
      const user = userEvent.setup()
      const initialNodes = [
        {
          id: '1',
          type: 'filter',
          position: { x: 100, y: 100 },
          data: { label: 'Filter', condition: 'Greater than', value: 0 },
        },
      ]

      renderComponent({ initialNodes })

      // Open configuration
      fireEvent.click(screen.getByText('Filter'))

      // Update value
      const valueInput = screen.getByLabelText('Value')
      await user.clear(valueInput)
      await user.type(valueInput, '100')

      // Save configuration
      fireEvent.click(screen.getByText('Save'))

      // Node should be updated
      expect(screen.getByTestId('nodes')).toHaveTextContent('"value":100')
    })

    it('should delete node', async () => {
      const initialNodes = [
        {
          id: '1',
          type: 'alert',
          position: { x: 100, y: 100 },
          data: { label: 'Alert' },
        },
      ]

      renderComponent({ initialNodes })

      // Select node
      fireEvent.click(screen.getByText('Alert'))

      // Press delete key
      fireEvent.keyDown(document, { key: 'Delete' })

      // Node should be removed
      expect(screen.getByTestId('nodes')).toHaveTextContent('[]')
    })
  })

  describe('Edge Operations', () => {
    it('should connect nodes', async () => {
      const initialNodes = [
        {
          id: '1',
          type: 'dataSource',
          position: { x: 100, y: 100 },
          data: { label: 'Data Source' },
        },
        {
          id: '2',
          type: 'filter',
          position: { x: 300, y: 100 },
          data: { label: 'Filter' },
        },
      ]

      renderComponent({ initialNodes })

      // Simulate connection creation
      const sourceHandle = screen.getByTestId('handle-source-bottom')
      const targetHandle = screen.getByTestId('handle-target-top')

      fireEvent.mouseDown(sourceHandle)
      fireEvent.mouseMove(targetHandle)
      fireEvent.mouseUp(targetHandle)

      // Edge should be created
      expect(screen.getByTestId('edges')).toHaveTextContent('"source":"1"')
      expect(screen.getByTestId('edges')).toHaveTextContent('"target":"2"')
    })

    it('should delete edge', async () => {
      const initialNodes = [
        { id: '1', type: 'dataSource', position: { x: 100, y: 100 }, data: {} },
        { id: '2', type: 'filter', position: { x: 300, y: 100 }, data: {} },
      ]
      const initialEdges = [
        { id: 'e1-2', source: '1', target: '2' },
      ]

      renderComponent({ initialNodes, initialEdges })

      // Click on edge
      fireEvent.click(screen.getByTestId('edge-e1-2'))

      // Press delete
      fireEvent.keyDown(document, { key: 'Delete' })

      // Edge should be removed
      expect(screen.getByTestId('edges')).toHaveTextContent('[]')
    })
  })

  describe('Flow Validation', () => {
    it('should validate flow before saving', async () => {
      mockAgentAPI.validateFlow.mockResolvedValue({
        valid: false,
        errors: ['Data source node is required', 'No output nodes found'],
      })

      renderComponent()

      // Try to save empty flow
      fireEvent.click(screen.getByText('Save Agent'))

      await waitFor(() => {
        expect(screen.getByText('Flow Validation Failed')).toBeInTheDocument()
        expect(screen.getByText('Data source node is required')).toBeInTheDocument()
        expect(screen.getByText('No output nodes found')).toBeInTheDocument()
      })
    })

    it('should highlight invalid nodes', async () => {
      const initialNodes = [
        {
          id: '1',
          type: 'filter',
          position: { x: 100, y: 100 },
          data: { label: 'Filter' },
        },
      ]

      mockAgentAPI.validateFlow.mockResolvedValue({
        valid: false,
        errors: [],
        invalidNodes: ['1'],
      })

      renderComponent({ initialNodes })

      fireEvent.click(screen.getByText('Validate'))

      await waitFor(() => {
        const filterNode = screen.getByText('Filter').closest('[data-testid="flow-node"]')
        expect(filterNode).toHaveClass('error')
      })
    })
  })

  describe('Agent Templates', () => {
    it('should load agent templates', async () => {
      mockAgentAPI.getAgentTemplates.mockResolvedValue([
        {
          id: 'volatility-alert',
          name: 'Volatility Alert',
          description: 'Alert when volatility exceeds threshold',
          nodes: [],
          edges: [],
        },
        {
          id: 'arbitrage-bot',
          name: 'Arbitrage Bot',
          description: 'Cross-exchange arbitrage detection',
          nodes: [],
          edges: [],
        },
      ])

      renderComponent()

      fireEvent.click(screen.getByText('Templates'))

      await waitFor(() => {
        expect(screen.getByText('Volatility Alert')).toBeInTheDocument()
        expect(screen.getByText('Arbitrage Bot')).toBeInTheDocument()
      })
    })

    it('should apply template', async () => {
      const template = {
        id: 'volatility-alert',
        name: 'Volatility Alert',
        nodes: [
          { id: '1', type: 'dataSource', position: { x: 100, y: 100 }, data: {} },
          { id: '2', type: 'alert', position: { x: 300, y: 100 }, data: {} },
        ],
        edges: [{ id: 'e1-2', source: '1', target: '2' }],
      }

      mockAgentAPI.getAgentTemplates.mockResolvedValue([template])

      renderComponent()

      fireEvent.click(screen.getByText('Templates'))

      await waitFor(() => {
        fireEvent.click(screen.getByText('Volatility Alert'))
      })

      // Template should be applied
      expect(screen.getByTestId('nodes')).toHaveTextContent('dataSource')
      expect(screen.getByTestId('nodes')).toHaveTextContent('alert')
    })
  })

  describe('Flow Execution', () => {
    it('should test flow execution', async () => {
      const nodes = [
        { id: '1', type: 'dataSource', data: { source: 'Deribit' } },
        { id: '2', type: 'filter', data: { condition: 'Greater than', value: 70 } },
        { id: '3', type: 'alert', data: { message: 'High volatility' } },
      ]
      const edges = [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
      ]

      renderComponent({ initialNodes: nodes, initialEdges: edges })

      mockAgentAPI.executeAgent.mockResolvedValue({
        success: true,
        results: [
          { nodeId: '1', output: { volatility: 75 } },
          { nodeId: '2', output: { passed: true } },
          { nodeId: '3', output: { alertSent: true } },
        ],
      })

      fireEvent.click(screen.getByText('Test Run'))

      await waitFor(() => {
        expect(screen.getByText('Test Results')).toBeInTheDocument()
        expect(screen.getByText('✓ Data Source')).toBeInTheDocument()
        expect(screen.getByText('✓ Filter')).toBeInTheDocument()
        expect(screen.getByText('✓ Alert')).toBeInTheDocument()
      })
    })

    it('should show execution errors', async () => {
      mockAgentAPI.executeAgent.mockResolvedValue({
        success: false,
        error: 'Filter node configuration error',
        nodeId: '2',
      })

      renderComponent()

      fireEvent.click(screen.getByText('Test Run'))

      await waitFor(() => {
        expect(screen.getByText('Execution Failed')).toBeInTheDocument()
        expect(screen.getByText('Filter node configuration error')).toBeInTheDocument()
      })
    })
  })

  describe('Save and Load', () => {
    it('should save agent configuration', async () => {
      const nodes = [{ id: '1', type: 'dataSource', data: {} }]
      
      mockAgentAPI.validateFlow.mockResolvedValue({ valid: true })
      mockAgentAPI.saveAgent.mockResolvedValue({ success: true, id: 'agent-123' })

      renderComponent({ initialNodes: nodes })

      // Open save dialog
      fireEvent.click(screen.getByText('Save Agent'))

      // Enter agent details
      const nameInput = screen.getByLabelText('Agent Name')
      await userEvent.type(nameInput, 'My Volatility Agent')

      const descInput = screen.getByLabelText('Description')
      await userEvent.type(descInput, 'Monitors volatility spikes')

      // Save
      fireEvent.click(screen.getByText('Save'))

      expect(mockAgentAPI.saveAgent).toHaveBeenCalledWith({
        name: 'My Volatility Agent',
        description: 'Monitors volatility spikes',
        nodes,
        edges: [],
      })
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should undo/redo actions', () => {
      renderComponent()

      // Add a node
      // ... node addition logic

      // Undo
      fireEvent.keyDown(document, { key: 'z', ctrlKey: true })

      // Node should be removed

      // Redo
      fireEvent.keyDown(document, { key: 'y', ctrlKey: true })

      // Node should be restored
    })

    it('should copy/paste nodes', () => {
      const initialNodes = [
        { id: '1', type: 'filter', position: { x: 100, y: 100 }, data: {} },
      ]

      renderComponent({ initialNodes })

      // Select node
      fireEvent.click(screen.getByText('Filter'))

      // Copy
      fireEvent.keyDown(document, { key: 'c', ctrlKey: true })

      // Paste
      fireEvent.keyDown(document, { key: 'v', ctrlKey: true })

      // Should have 2 nodes now
      const nodes = JSON.parse(screen.getByTestId('nodes').textContent || '[]')
      expect(nodes).toHaveLength(2)
    })
  })
})