"""Pydantic models for system modules."""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

ModuleType = Literal["Data Source", "Function", "Risk", "Strategy", "Execution", "Datasource"]
ModuleStatus = Literal["Active", "Inactive"]


class ModuleConfig(BaseModel):
    """Configuration for a module."""
    parameters: Dict[str, Any] = Field(default_factory=dict)
    credentials: Optional[Dict[str, str]] = None
    settings: Dict[str, Any] = Field(default_factory=dict)


class Module(BaseModel):
    """System module model."""
    id: str
    type: ModuleType
    name: str
    description: str
    version: str
    status: ModuleStatus
    tags: List[str]
    icon: Optional[str] = None
    config: Optional[ModuleConfig] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ModuleStats(BaseModel):
    """Statistics for a module."""
    module_id: str
    execution_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    last_execution: Optional[datetime] = None
    average_execution_time: Optional[float] = None
    last_error: Optional[str] = None


class ModuleExecution(BaseModel):
    """Module execution record."""
    id: str
    module_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: Literal["running", "success", "failed"] = "running"
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    duration_ms: Optional[int] = None


class ModuleCreateRequest(BaseModel):
    """Request to create a new module."""
    type: ModuleType
    name: str
    description: str
    version: str = "1.0"
    tags: List[str] = Field(default_factory=list)
    icon: Optional[str] = None
    config: Optional[ModuleConfig] = None


class ModuleUpdateRequest(BaseModel):
    """Request to update a module."""
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None
    status: Optional[ModuleStatus] = None
    tags: Optional[List[str]] = None
    icon: Optional[str] = None
    config: Optional[ModuleConfig] = None


class ModuleResponse(BaseModel):
    """Response containing module data."""
    module: Module
    stats: Optional[ModuleStats] = None


class ModulesListResponse(BaseModel):
    """Response containing list of modules."""
    modules: List[Module]
    total: int
    page: int = 1
    per_page: int = 50