"""Pydantic models for Elastics data management."""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum


class DatasetStatus(str, Enum):
    """Dataset status types."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ERROR = "error"


class Region(str, Enum):
    """Geographic regions."""
    NORTH_AMERICA = "North America"
    EUROPE = "Europe"
    ASIA = "Asia"
    GLOBAL = "Global"
    US = "US"


class DatasetFeatures(BaseModel):
    """Features supported by a dataset."""
    btc: bool = Field(default=False, description="Bitcoin support")
    eth: bool = Field(default=False, description="Ethereum support")
    bnb: bool = Field(default=False, description="Binance Coin support")
    sol: bool = Field(default=False, description="Solana support")


class IssueCount(BaseModel):
    """Issue counts by severity."""
    critical: int = Field(default=0, ge=0)
    warning: int = Field(default=0, ge=0)
    info: int = Field(default=0, ge=0)


class ElasticsDataset(BaseModel):
    """Model for individual dataset entries."""
    id: int
    name: str = Field(..., description="Dataset name")
    provider: str = Field(..., description="Data provider name")
    description: str = Field(..., description="Dataset description")
    category: str = Field(..., description="Category code (e.g., MBPY, SPY)")
    schema: str = Field(..., description="Schema identifier")
    publisher: str = Field(..., description="Publisher identifier")
    region: Region = Field(..., description="Geographic region")
    history: str = Field(..., description="Available history (e.g., 'Since 2016')")
    products: str = Field(..., description="Number of products (e.g., '20,948 products')")
    last_update: datetime = Field(default_factory=datetime.utcnow)
    status: DatasetStatus = Field(default=DatasetStatus.ACTIVE)
    features: DatasetFeatures = Field(default_factory=DatasetFeatures)
    issues: Optional[IssueCount] = Field(default=None)
    highlight: bool = Field(default=False, description="Whether to highlight this dataset")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "Deribiteth US Equities",
                "provider": "Deribit",
                "description": "Data from 16 US equities exchanges\nand 30 STOs make a single product",
                "category": "MBPY",
                "schema": "G009L",
                "publisher": "TSLA",
                "region": "North America",
                "history": "Since 2016",
                "products": "20,948 products",
                "status": "active",
                "features": {"btc": True, "eth": True, "bnb": False, "sol": True},
                "issues": {"critical": 3, "warning": 2, "info": 6},
                "highlight": True
            }
        }


class ElasticsMajor(BaseModel):
    """Model for major data providers."""
    id: int
    name: str = Field(..., description="Major provider name")
    provider: str = Field(..., description="Provider organization")
    description: str = Field(..., description="Provider description")
    products: str = Field(..., description="Number of products")
    status: str = Field(..., description="Coverage area or status")
    since: str = Field(..., description="Operating since")
    features: DatasetFeatures = Field(default_factory=DatasetFeatures)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "CoinGecko Majors",
                "provider": "CoinGecko",
                "description": "Tracks top crypto market cap assets.\nPolled from CoinGecko's top 1-1000.",
                "products": "1,521 products",
                "status": "Global",
                "since": "Since 2013",
                "features": {"btc": True, "eth": True, "bnb": True, "sol": True}
            }
        }


class ElasticsStats(BaseModel):
    """Statistics for Elastics data."""
    total_datasets: int = Field(ge=0)
    active_datasets: int = Field(ge=0)
    total_products: int = Field(ge=0)
    issues: IssueCount = Field(default_factory=IssueCount)
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class ElasticsFilter(BaseModel):
    """Filter parameters for Elastics data queries."""
    category: Optional[str] = None
    schema: Optional[str] = None
    publisher: Optional[str] = None
    region: Optional[Region] = None
    history: Optional[str] = None
    search: Optional[str] = None
    status: Optional[DatasetStatus] = None
    features: Optional[List[str]] = Field(default=None, description="List of required features")


class ElasticsResponse(BaseModel):
    """Response model for Elastics data endpoints."""
    datasets: List[ElasticsDataset] = Field(default_factory=list)
    majors: List[ElasticsMajor] = Field(default_factory=list)
    stats: ElasticsStats
    filters: Optional[ElasticsFilter] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "datasets": [
                    {
                        "id": 1,
                        "name": "Deribiteth US Equities",
                        "provider": "Deribit",
                        "description": "Data from 16 US equities exchanges",
                        "category": "MBPY",
                        "schema": "G009L",
                        "publisher": "TSLA",
                        "region": "North America",
                        "history": "Since 2016",
                        "products": "20,948 products",
                        "status": "active",
                        "features": {"btc": True, "eth": True, "bnb": False, "sol": True}
                    }
                ],
                "majors": [
                    {
                        "id": 1,
                        "name": "CoinGecko Majors",
                        "provider": "CoinGecko",
                        "description": "Tracks top crypto market cap assets",
                        "products": "1,521 products",
                        "status": "Global",
                        "since": "Since 2013",
                        "features": {"btc": True, "eth": True, "bnb": True, "sol": True}
                    }
                ],
                "stats": {
                    "total_datasets": 10,
                    "active_datasets": 8,
                    "total_products": 45000,
                    "issues": {"critical": 3, "warning": 2, "info": 6}
                }
            }
        }