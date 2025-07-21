"""SQL module-related Pydantic models."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class QueryType(str, Enum):
    """SQL query types."""
    SELECT = "SELECT"
    UPDATE = "UPDATE"
    INSERT = "INSERT"
    DELETE = "DELETE"
    CREATE = "CREATE"
    ALTER = "ALTER"
    DROP = "DROP"
    OTHER = "OTHER"


class SQLModule(BaseModel):
    """SQL module model."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="Module ID")
    title: Optional[str] = Field(None, description="Module title")
    description: Optional[str] = Field(None, description="Module description")
    sql_query: str = Field(..., description="SQL query")
    query_type: QueryType = Field(..., description="Query type")
    message_id: Optional[int] = Field(None, description="Associated message ID")
    conversation_id: Optional[int] = Field(None, description="Associated conversation ID")
    execution_time_ms: Optional[int] = Field(None, description="Execution time in milliseconds")
    row_count: Optional[int] = Field(None, description="Number of rows returned")
    is_favorite: bool = Field(False, description="Whether module is favorited")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    executed_at: Optional[datetime] = Field(None, description="Last execution timestamp")
    execution_count: int = Field(0, description="Number of executions")
    
    
class SQLModuleCreate(BaseModel):
    """Create SQL module request model."""
    model_config = ConfigDict(from_attributes=True)
    
    title: Optional[str] = Field(None, description="Module title")
    description: Optional[str] = Field(None, description="Module description")
    sql_query: str = Field(..., description="SQL query")
    message_id: Optional[int] = Field(None, description="Associated message ID")
    conversation_id: Optional[int] = Field(None, description="Associated conversation ID")


class SQLModuleUpdate(BaseModel):
    """Update SQL module request model."""
    model_config = ConfigDict(from_attributes=True)
    
    title: Optional[str] = Field(None, description="Module title")
    description: Optional[str] = Field(None, description="Module description")
    is_favorite: Optional[bool] = Field(None, description="Favorite status")


class SQLExecutionRequest(BaseModel):
    """SQL execution request model."""
    model_config = ConfigDict(from_attributes=True)
    
    sql_query: str = Field(..., description="SQL query to execute")
    limit: Optional[int] = Field(100, description="Result limit")
    save_as_module: bool = Field(False, description="Whether to save as module")
    module_title: Optional[str] = Field(None, description="Module title if saving")
    module_description: Optional[str] = Field(None, description="Module description if saving")


class SQLExecutionResult(BaseModel):
    """SQL execution result model."""
    model_config = ConfigDict(from_attributes=True)
    
    success: bool = Field(..., description="Whether execution was successful")
    data: Optional[List[Dict[str, Any]]] = Field(None, description="Query results")
    row_count: Optional[int] = Field(None, description="Number of rows returned")
    execution_time_ms: Optional[int] = Field(None, description="Execution time in milliseconds")
    error: Optional[str] = Field(None, description="Error message if failed")
    columns: Optional[List[str]] = Field(None, description="Column names")
    query: Optional[str] = Field(None, description="Executed query")
    module_id: Optional[int] = Field(None, description="Created module ID if saved")


class SQLModulesResponse(BaseModel):
    """SQL modules list response."""
    model_config = ConfigDict(from_attributes=True)
    
    modules: List[SQLModule] = Field(..., description="List of SQL modules")
    total: int = Field(..., description="Total count")
    limit: int = Field(..., description="Page limit")
    offset: int = Field(..., description="Page offset")


class SQLModuleExecution(BaseModel):
    """SQL module execution history entry."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="Execution ID")
    module_id: int = Field(..., description="Module ID")
    executed_at: datetime = Field(..., description="Execution timestamp")
    execution_time_ms: int = Field(..., description="Execution time in milliseconds")
    row_count: int = Field(..., description="Number of rows returned")
    success: bool = Field(..., description="Whether execution was successful")
    error: Optional[str] = Field(None, description="Error message if failed")
    user_id: Optional[str] = Field(None, description="User who executed")


class SQLModuleStats(BaseModel):
    """SQL module statistics."""
    model_config = ConfigDict(from_attributes=True)
    
    total_modules: int = Field(0, description="Total number of modules")
    total_executions: int = Field(0, description="Total executions")
    favorite_count: int = Field(0, description="Number of favorited modules")
    recent_executions: int = Field(0, description="Executions in last 24 hours")
    most_used_query_type: Optional[str] = Field(None, description="Most common query type")
    avg_execution_time_ms: Optional[float] = Field(None, description="Average execution time")