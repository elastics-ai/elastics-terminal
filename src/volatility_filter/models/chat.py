"""Chat-related Pydantic models."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class MessageRole(str, Enum):
    """Message roles in conversation."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    """Chat message request model."""
    model_config = ConfigDict(from_attributes=True)
    
    content: str = Field(..., description="Message content")
    session_id: Optional[str] = Field(None, description="Session ID")
    user_id: Optional[str] = Field(None, description="User ID")
    conversation_id: Optional[int] = Field(None, description="Conversation ID")
    parent_message_id: Optional[int] = Field(None, description="Parent message ID for branching")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class ChatResponse(BaseModel):
    """Chat response model."""
    model_config = ConfigDict(from_attributes=True)
    
    response: str = Field(..., description="Assistant response")
    timestamp: datetime = Field(default_factory=datetime.now)
    conversation_id: Optional[int] = Field(None, description="Conversation ID")
    message_id: Optional[int] = Field(None, description="Message ID")
    parent_message_id: Optional[int] = Field(None, description="Parent message ID")
    error: Optional[str] = Field(None, description="Error message if any")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class Message(BaseModel):
    """Database message model."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="Message ID")
    conversation_id: int = Field(..., description="Conversation ID")
    role: MessageRole = Field(..., description="Message role")
    content: str = Field(..., description="Message content")
    parent_id: Optional[int] = Field(None, description="Parent message ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    is_branch_point: bool = Field(False, description="Whether this message has branches")
    branch_count: int = Field(0, description="Number of branches from this message")


class Conversation(BaseModel):
    """Conversation model."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="Conversation ID")
    session_id: str = Field(..., description="Session ID")
    title: Optional[str] = Field(None, description="Conversation title")
    use_case: Optional[str] = Field(None, description="Use case category")
    user_id: Optional[str] = Field(None, description="User ID")
    parent_conversation_id: Optional[int] = Field(None, description="Parent conversation ID for branches")
    parent_message_id: Optional[int] = Field(None, description="Parent message ID for branches")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    message_count: int = Field(0, description="Number of messages")
    is_deleted: bool = Field(False, description="Soft delete flag")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class ConversationCreate(BaseModel):
    """Create conversation request model."""
    model_config = ConfigDict(from_attributes=True)
    
    session_id: str = Field(..., description="Session ID")
    title: Optional[str] = Field(None, description="Conversation title")
    use_case: Optional[str] = Field(None, description="Use case category")
    user_id: Optional[str] = Field(None, description="User ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class ConversationUpdate(BaseModel):
    """Update conversation request model."""
    model_config = ConfigDict(from_attributes=True)
    
    title: Optional[str] = Field(None, description="New title")
    use_case: Optional[str] = Field(None, description="New use case")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class BranchCreate(BaseModel):
    """Create branch request model."""
    model_config = ConfigDict(from_attributes=True)
    
    parent_message_id: int = Field(..., description="Parent message ID to branch from")
    title: Optional[str] = Field(None, description="Branch title")
    initial_message: Optional[str] = Field(None, description="Initial message for the branch")


class MessageCreate(BaseModel):
    """Create message request model."""
    model_config = ConfigDict(from_attributes=True)
    
    conversation_id: int = Field(..., description="Conversation ID")
    role: MessageRole = Field(..., description="Message role")
    content: str = Field(..., description="Message content")
    parent_id: Optional[int] = Field(None, description="Parent message ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class ConversationTree(BaseModel):
    """Conversation tree structure for visualization."""
    model_config = ConfigDict(from_attributes=True)
    
    conversation_id: int = Field(..., description="Root conversation ID")
    messages: List[Message] = Field(..., description="All messages in the tree")
    branches: List['ConversationTree'] = Field(default_factory=list, description="Branch conversations")
    
    
ConversationTree.model_rebuild()


class ChatSuggestion(BaseModel):
    """Chat suggestion model."""
    model_config = ConfigDict(from_attributes=True)
    
    suggestions: List[str] = Field(..., description="List of suggested questions")