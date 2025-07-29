"""Pydantic models for Agent workflow management."""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from enum import Enum


class NodeType(str, Enum):
    """Types of nodes in the agent workflow."""
    DATA_SOURCE = "data-source"
    FUNCTION = "function"
    STRATEGY = "strategy"
    RISK = "risk"
    EXECUTION = "execution"


class AgentStatus(str, Enum):
    """Status of an agent."""
    DRAFT = "draft"
    TESTING = "testing"
    ACTIVE = "active"
    PAUSED = "paused"
    STOPPED = "stopped"
    ERROR = "error"


class NodePosition(BaseModel):
    """Position of a node in the workflow canvas."""
     e  x: float
    y: float


class WorkflowNode(BaseModel):
    """A node in the agent workflow."""
    id: str
    type: NodeType
    name: str
    position: NodePosition
    data: Dict[str, Any] = Field(default_factory=dict)
    config: Optional[Dict[str, Any]] = None
    
    class Config:
        use_enum_values = True


class WorkflowConnection(BaseModel):
    """A connection between nodes in the workflow."""
    id: str
    source: str
    target: str
    sourceHandle: Optional[str] = None
    targetHandle: Optional[str] = None


class AgentWorkflow(BaseModel):
    """Complete workflow definition for an agent."""
    nodes: List[WorkflowNode]
    connections: List[WorkflowConnection]
    
    def validate_workflow(self) -> List[str]:
        """Validate the workflow structure."""
        errors = []
        node_ids = {node.id for node in self.nodes}
        
        # Check all connections reference valid nodes
        for conn in self.connections:
            if conn.source not in node_ids:
                errors.append(f"Connection {conn.id} references invalid source node: {conn.source}")
            if conn.target not in node_ids:
                errors.append(f"Connection {conn.id} references invalid target node: {conn.target}")
        
        # Check for cycles
        # TODO: Implement cycle detection
        
        return errors


class Agent(BaseModel):
    """Complete agent definition."""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: AgentStatus = AgentStatus.DRAFT
    workflow: AgentWorkflow
    config: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        use_enum_values = True


class AgentExecutionRequest(BaseModel):
    """Request to execute an agent."""
    agent_id: str
    mode: Literal["live", "backtest", "paper"] = "paper"
    parameters: Optional[Dict[str, Any]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class AgentExecutionStatus(BaseModel):
    """Status of an agent execution."""
    execution_id: str
    agent_id: str
    status: Literal["running", "completed", "failed", "cancelled"]
    mode: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None


class BacktestResult(BaseModel):
    """Results from agent backtesting."""
    agent_id: str
    execution_id: str
    start_date: datetime
    end_date: datetime
    total_trades: int
    winning_trades: int
    losing_trades: int
    total_pnl: float
    sharpe_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    win_rate: float
    avg_win: float
    avg_loss: float
    metrics: Dict[str, Any] = Field(default_factory=dict)


class AgentEvent(BaseModel):
    """Real-time event from agent execution."""
    agent_id: str
    execution_id: str
    event_type: Literal["trade", "signal", "error", "status", "metric"]
    timestamp: datetime
    data: Dict[str, Any]
    
    
class DataSourceConfig(BaseModel):
    """Configuration for a data source node."""
    source_type: Literal["kalshi", "polymarket", "deribit", "twitter", "reddit", "bloomberg"]
    symbols: Optional[List[str]] = None
    update_interval: int = 60  # seconds
    filters: Optional[Dict[str, Any]] = None


class FunctionConfig(BaseModel):
    """Configuration for a function node."""
    function_type: Literal["contract_matcher", "iv_calculator", "sentiment_analysis", "greek_calculator", "essvi_surface"]
    parameters: Dict[str, Any] = Field(default_factory=dict)
    
    
class StrategyConfig(BaseModel):
    """Configuration for a strategy node."""
    strategy_type: Literal["market_making", "arbitrage", "delta_neutral", "volatility_arb"]
    risk_limits: Dict[str, float] = Field(default_factory=dict)
    parameters: Dict[str, Any] = Field(default_factory=dict)


class RiskConfig(BaseModel):
    """Configuration for a risk management node."""
    risk_type: Literal["hedging", "var_calculator", "exposure_monitor", "position_sizing"]
    limits: Dict[str, float] = Field(default_factory=dict)
    actions: List[str] = Field(default_factory=list)


class ExecutionConfig(BaseModel):
    """Configuration for an execution node."""
    execution_type: Literal["limit_orders", "market_orders", "smart_routing", "algo_execution"]
    venues: List[str] = Field(default_factory=list)
    parameters: Dict[str, Any] = Field(default_factory=dict)
