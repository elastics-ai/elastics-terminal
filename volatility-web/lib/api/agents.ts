/**
 * API client for Agent workflow management
 */

export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: 'data-source' | 'function' | 'strategy' | 'risk' | 'execution';
  name: string;
  position: NodePosition;
  data: {
    label: string;
    fields?: string[];
    [key: string]: any;
  };
  config?: Record<string, any>;
}

export interface WorkflowConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface AgentWorkflow {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export interface Agent {
  id?: string;
  name: string;
  description?: string;
  status: 'draft' | 'testing' | 'active' | 'paused' | 'stopped' | 'error';
  workflow: AgentWorkflow;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface AgentExecutionRequest {
  agent_id: string;
  mode: 'live' | 'backtest' | 'paper';
  parameters?: Record<string, any>;
  start_date?: string;
  end_date?: string;
}

export interface AgentExecutionStatus {
  execution_id: string;
  agent_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  mode: string;
  started_at: string;
  completed_at?: string;
  error?: string;
  metrics?: Record<string, any>;
}

export interface BacktestResult {
  agent_id: string;
  execution_id: string;
  start_date: string;
  end_date: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  total_pnl: number;
  sharpe_ratio?: number;
  max_drawdown?: number;
  win_rate: number;
  avg_win: number;
  avg_loss: number;
  metrics?: Record<string, any>;
}

export interface AgentEvent {
  agent_id: string;
  execution_id: string;
  event_type: 'trade' | 'signal' | 'error' | 'status' | 'metric';
  timestamp: string;
  data: Record<string, any>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class AgentsAPI {
  /**
   * Create a new agent
   */
  static async createAgent(agent: Agent): Promise<{ agent_id: string; success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agent),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create agent');
    }

    return response.json();
  }

  /**
   * List all agents
   */
  static async listAgents(status?: string): Promise<{ agents: Agent[] }> {
    const url = new URL(`${API_BASE_URL}/api/agents`);
    if (status) {
      url.searchParams.append('status', status);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch agents');
    }

    return response.json();
  }

  /**
   * Get a specific agent
   */
  static async getAgent(agentId: string): Promise<Agent> {
    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Agent not found');
      }
      throw new Error('Failed to fetch agent');
    }

    return response.json();
  }

  /**
   * Update an agent
   */
  static async updateAgent(agentId: string, agent: Agent): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(agent),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update agent');
    }

    return response.json();
  }

  /**
   * Delete an agent
   */
  static async deleteAgent(agentId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Agent not found');
      }
      throw new Error('Failed to delete agent');
    }

    return response.json();
  }

  /**
   * Execute an agent
   */
  static async executeAgent(request: AgentExecutionRequest): Promise<{ execution_id: string; success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to execute agent');
    }

    return response.json();
  }

  /**
   * Get execution status
   */
  static async getExecutionStatus(executionId: string): Promise<AgentExecutionStatus> {
    const response = await fetch(`${API_BASE_URL}/api/agents/executions/${executionId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Execution not found');
      }
      throw new Error('Failed to fetch execution status');
    }

    return response.json();
  }

  /**
   * Stop an execution
   */
  static async stopExecution(executionId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/agents/executions/${executionId}/stop`, {
      method: 'POST',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Execution not found or already stopped');
      }
      throw new Error('Failed to stop execution');
    }

    return response.json();
  }

  /**
   * Get backtest results for an agent
   */
  static async getBacktestResults(agentId: string): Promise<{ results: BacktestResult[] }> {
    const response = await fetch(`${API_BASE_URL}/api/agents/${agentId}/backtests`);
    if (!response.ok) {
      throw new Error('Failed to fetch backtest results');
    }

    return response.json();
  }

  /**
   * Get execution events
   */
  static async getExecutionEvents(
    executionId: string, 
    eventType?: string, 
    limit: number = 100
  ): Promise<{ events: AgentEvent[] }> {
    const url = new URL(`${API_BASE_URL}/api/agents/executions/${executionId}/events`);
    if (eventType) {
      url.searchParams.append('event_type', eventType);
    }
    url.searchParams.append('limit', limit.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch execution events');
    }

    return response.json();
  }
}