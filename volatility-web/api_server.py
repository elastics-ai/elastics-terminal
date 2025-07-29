"""FastAPI backend for volatility terminal web app."""

import os
import sys
import logging
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import aiosqlite
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import asyncio

# Initialize Sentry SDK for error tracking
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

# Configure Sentry
sentry_logging = LoggingIntegration(
    level=logging.INFO,        # Capture info and above as breadcrumbs
    event_level=logging.ERROR   # Send errors as events
)

glitchtip_dsn = os.getenv('GLITCHTIP_DSN')
if glitchtip_dsn:
    sentry_sdk.init(
        dsn=glitchtip_dsn,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            sentry_logging
        ],
        traces_sample_rate=0.1,  # Capture 10% of transactions for performance monitoring
        environment=os.getenv('NODE_ENV', 'production'),
        release="volatility-filter@1.0.0"
    )

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if glitchtip_dsn:
    logger.info("GlitchTip error tracking initialized for API server")
else:
    logger.warning("GLITCHTIP_DSN not set, error tracking disabled")

# Add parent directory to path to import volatility_filter modules
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from src.volatility_filter.database import DatabaseManager
from src.volatility_filter.portfolio_manager import PortfolioManager
from src.volatility_filter.polymarket_client import PolymarketClient
from src.volatility_filter.claude_client import ClaudeClient

# Import API routers
from src.volatility_filter.api.contracts import router as contracts_router
from src.volatility_filter.api.risk_metrics import router as risk_metrics_router

# Initialize FastAPI app
app = FastAPI(title="Volatility Terminal API")


# Shutdown handler
async def shutdown_event():
    """Clean up resources on shutdown."""
    try:
        await polymarket_client.close()
        logger.info("Closed Polymarket client connections")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


app.add_event_handler("shutdown", shutdown_event)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(contracts_router)
app.include_router(risk_metrics_router)

# Global instances
# In Docker, the database is mounted at /data/volatility_filter.db
db_path = os.environ.get("DB_PATH", "/data/volatility_filter.db")
if not os.path.exists(db_path):
    # Fallback to local path if not in Docker
    db_path = os.path.join(parent_dir, "volatility_filter.db")

logger.info(f"Using database at: {db_path}")
db_manager = DatabaseManager(db_path)
portfolio_manager = PortfolioManager(db_path)
polymarket_client = PolymarketClient()


# Database connection helper
@asynccontextmanager
async def get_db():
    """Get async database connection."""
    conn = await aiosqlite.connect(db_path)
    conn.row_factory = aiosqlite.Row
    try:
        yield conn
    finally:
        await conn.close()


# API Routes


@app.get("/api/portfolio/summary")
async def get_portfolio_summary():
    """Get portfolio summary with total P&L and risk metrics."""
    async with get_db() as conn:
        # Get active positions
        cursor = await conn.execute("""
            SELECT COUNT(*) as total_positions,
                   SUM(position_value) as total_value,
                   SUM(pnl) as total_pnl
            FROM positions
            WHERE is_active = 1
        """)
        summary = await cursor.fetchone()

        if summary and summary["total_positions"] and summary["total_positions"] > 0:
            total_value = summary["total_value"] or 0
            total_pnl = summary["total_pnl"] or 0
            
            return {
                "portfolio_value": {"value": total_value, "change_24h": 57926},
                "cumulative_pnl": {"value": total_pnl, "change_24h": 57926},
                "cumulative_return": {"value": 0.60, "change_24h": 0.013},
                "annual_return": {"value": 0.14, "change_24h": 0.001},
                "max_drawdown": {"value": -0.26, "change_24h": 0.00},
                "annual_volatility": {"value": 0.38, "change_24h": 0.0002},
                "alpha": {"value": 0.15, "change_24h": 0.02},
                "beta": {"value": 0.46, "change_24h": 0.01},
                "cvar_95": {"value": 152492, "change_24h": -850},
                "sharpe_ratio": {"value": 2.46, "change_24h": 0.07},
                "calmar_ratio": {"value": 0.54, "change_24h": 0.1},
                "sortino_ratio": {"value": 3.10, "change_24h": 0.1},
            }
        else:
            return {
                "portfolio_value": {"value": 2540300, "change_24h": 57926},
                "cumulative_pnl": {"value": 1524180, "change_24h": 57926},
                "cumulative_return": {"value": 0.60, "change_24h": 0.013},
                "annual_return": {"value": 0.14, "change_24h": 0.001},
                "max_drawdown": {"value": -0.26, "change_24h": 0.00},
                "annual_volatility": {"value": 0.38, "change_24h": 0.0002},
                "alpha": {"value": 0.15, "change_24h": 0.02},
                "beta": {"value": 0.46, "change_24h": 0.01},
                "cvar_95": {"value": 152492, "change_24h": -850},
                "sharpe_ratio": {"value": 2.46, "change_24h": 0.07},
                "calmar_ratio": {"value": 0.54, "change_24h": 0.1},
                "sortino_ratio": {"value": 3.10, "change_24h": 0.1},
            }


@app.get("/api/portfolio/positions")
async def get_portfolio_positions():
    """Get all active positions."""
    try:
        async with get_db() as conn:
            cursor = await conn.execute("""
                SELECT 
                    instrument_name as symbol,
                    instrument_type as type,
                    quantity,
                    entry_price,
                    current_price,
                    position_value as value,
                    pnl,
                    pnl_percent as pnl_percentage,
                    delta,
                    mark_iv as iv
                FROM positions
                WHERE is_active = 1
                ORDER BY ABS(position_value) DESC
            """)

            positions = []
            async for row in cursor:
                position = dict(row)
                positions.append(position)

            return positions
    except Exception as e:
        logger.error(f"Error fetching portfolio positions: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")


@app.get("/api/portfolio/pnl-breakdown")
async def get_pnl_breakdown():
    """Get P&L breakdown by instrument type."""
    async with get_db() as conn:
        cursor = await conn.execute("""
            SELECT 
                instrument_type,
                SUM(pnl) as total_pnl,
                COUNT(*) as count
            FROM positions
            WHERE is_active = 1
            GROUP BY instrument_type
        """)

        breakdown = {}
        total = 0

        async for row in cursor:
            breakdown[row["instrument_type"]] = row["total_pnl"] or 0
            total += row["total_pnl"] or 0

        return {
            "by_asset_class": {
                "options": breakdown.get("option", 0),
                "futures": breakdown.get("future", 0),
                "spot": breakdown.get("spot", 0),
            },
            "by_symbol": breakdown,  # For now, using instrument type
            "summary": {
                "total_pnl": total,
                "realized_pnl": 0,  # Would need additional logic
                "unrealized_pnl": total,  # Assuming all PnL is unrealized
            }
        }


@app.get("/api/volatility/alerts")
async def get_volatility_alerts(limit: int = 10):
    """Get recent volatility breach alerts."""
    async with get_db() as conn:
        cursor = await conn.execute(
            """
            SELECT 
                timestamp,
                datetime,
                price,
                volatility as current_volatility,
                threshold,
                CASE 
                    WHEN volatility > threshold THEN 'above'
                    ELSE 'below'
                END as breach_type
            FROM volatility_events
            WHERE event_type = 'threshold_exceeded'
            ORDER BY timestamp DESC
            LIMIT ?
        """,
            (limit,),
        )

        alerts = []
        async for row in cursor:
            alert = dict(row)
            # Add symbol field (not in current schema, using placeholder)
            alert["symbol"] = "BTC-USD"  # Would need to be added to schema
            alerts.append(alert)

        return alerts


@app.get("/api/volatility/surface/latest")
async def get_latest_vol_surface():
    """Get the latest volatility surface data."""
    async with get_db() as conn:
        cursor = await conn.execute("""
            SELECT 
                timestamp,
                datetime,
                spot_price,
                surface_data,
                moneyness_grid,
                ttm_grid,
                num_options,
                atm_vol
            FROM volatility_surface_fits
            ORDER BY timestamp DESC
            LIMIT 1
        """)

        row = await cursor.fetchone()
        if row:
            result = dict(row)
            # Parse JSON fields
            surface_data = json.loads(result["surface_data"])
            moneyness_grid = json.loads(result["moneyness_grid"])
            ttm_grid = json.loads(result["ttm_grid"])
            
            return {
                "timestamp": result["timestamp"],
                "surface_data": surface_data,
                "moneyness_grid": moneyness_grid,
                "ttm_grid": ttm_grid,
                "spot_price": result["spot_price"],
                "num_options": result["num_options"],
                "atm_vol": result["atm_vol"]
            }
        else:
            # Return empty surface data structure
            return {
                "timestamp": datetime.now().isoformat(),
                "surface_data": [],
                "moneyness_grid": [],
                "ttm_grid": [],
                "spot_price": 0,
                "num_options": 0,
                "atm_vol": 0
            }


@app.get("/api/polymarket/markets")
async def get_polymarket_markets(
    active_only: bool = True, limit: int = 50, search: Optional[str] = None
):
    """Get Polymarket markets data."""
    # Define demo markets data
    demo_markets = [
        {
            "id": "demo-1",
            "question": "Will Bitcoin reach $100,000 by end of 2024?",
            "yes_percentage": 35.2,
            "no_percentage": 64.8,
            "volume": 1250000,
            "end_date": "2024-12-31",
            "category": "Crypto",
            "tags": ["bitcoin", "crypto", "price"],
            "active": True,
        },
        {
            "id": "demo-2",
            "question": "Will ETH/BTC ratio exceed 0.1 in Q1 2024?",
            "yes_percentage": 42.7,
            "no_percentage": 57.3,
            "volume": 850000,
            "end_date": "2024-03-31",
            "category": "Crypto",
            "tags": ["ethereum", "bitcoin", "ratio"],
            "active": True,
        },
        {
            "id": "demo-3",
            "question": "Will S&P 500 close above 5000 in January 2024?",
            "yes_percentage": 68.9,
            "no_percentage": 31.1,
            "volume": 2340000,
            "end_date": "2024-01-31",
            "category": "Finance",
            "tags": ["stocks", "S&P500", "markets"],
            "active": True,
        },
        {
            "id": "demo-4",
            "question": "Will inflation drop below 3% by Q2 2024?",
            "yes_percentage": 55.4,
            "no_percentage": 44.6,
            "volume": 980000,
            "end_date": "2024-06-30",
            "category": "Economics",
            "tags": ["inflation", "CPI", "economy"],
            "active": True,
        },
        {
            "id": "demo-5",
            "question": "Will Tesla release FSD v12 before March 2024?",
            "yes_percentage": 71.2,
            "no_percentage": 28.8,
            "volume": 450000,
            "end_date": "2024-03-01",
            "category": "Technology",
            "tags": ["Tesla", "FSD", "autonomous"],
            "active": True,
        },
    ]

    try:
        # Try to fetch real markets from Polymarket
        markets = await polymarket_client.get_markets(
            active_only=active_only, limit=limit
        )

        # If we got real data, convert format
        if markets:
            formatted_markets = []
            for m in markets:
                formatted_markets.append(
                    {
                        "id": m.get("id", ""),
                        "question": m.get("question", ""),
                        "yes_percentage": m.get("yes_price", 0) * 100,
                        "no_percentage": m.get("no_price", 0) * 100,
                        "volume": m.get("volume", 0),
                        "end_date": m.get("end_date", ""),
                        "category": m.get("category", "Other"),
                        "tags": m.get("tags", []),
                        "active": m.get("active", True),
                    }
                )
            markets = formatted_markets
        else:
            # Use demo data if no real data
            markets = demo_markets

    except Exception as e:
        logger.error(f"Error fetching Polymarket data: {e}")
        # Use demo data as fallback
        markets = demo_markets

    # Filter by search term if provided
    if search:
        search_lower = search.lower()
        markets = [
            m
            for m in markets
            if search_lower in m["question"].lower()
            or search_lower in m.get("category", "").lower()
            or any(search_lower in tag.lower() for tag in m.get("tags", []))
        ]

    # Filter by active status
    if active_only:
        markets = [m for m in markets if m.get("active", True)]

    return {
        "markets": markets[:limit],  # Apply limit
        "total": len(markets),
        "last_update": datetime.now().isoformat(),
        "is_mock": not markets or markets == demo_markets,
    }


@app.post("/api/chat/send")
async def send_chat_message(message: dict):
    """Send a message to Claude and get response with conversation tracking."""
    try:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            # Return helpful response if no API key
            return {
                "response": "Please set your ANTHROPIC_API_KEY environment variable to use the AI chat feature. You can get an API key from https://console.anthropic.com/",
                "timestamp": datetime.now().isoformat(),
                "error": "no_api_key",
            }

        # Initialize Claude client
        claude_client = ClaudeClient(api_key=api_key)

        # Get portfolio context
        portfolio_context = portfolio_manager.get_portfolio_context_dict()

        # Extract message details
        content = message.get("content", "")
        session_id = message.get(
            "session_id", f"session_{int(datetime.now().timestamp())}"
        )
        user_id = message.get("user_id")
        conversation_id = message.get("conversation_id")
        parent_message_id = message.get("parent_message_id")

        # Send message to Claude with history tracking
        result = await claude_client.ask_with_history(
            question=content,
            db_context=portfolio_context,
            session_id=session_id,
            user_id=user_id,
            conversation_id=conversation_id,
            parent_message_id=parent_message_id,
        )

        return result
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {
            "response": f"Sorry, I encountered an error: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "error": "api_error",
        }


@app.get("/api/chat/suggestions")
async def get_chat_suggestions():
    """Get suggested questions based on current portfolio state."""
    try:
        async with get_db() as conn:
            # Get portfolio stats for context
            cursor = await conn.execute("""
                SELECT COUNT(*) as position_count,
                       SUM(pnl) as total_pnl,
                       SUM(ABS(position_delta)) as total_delta
                FROM positions
                WHERE is_active = 1
            """)
            stats = await cursor.fetchone()

            suggestions = [
                "What's my current portfolio exposure?",
                "Show me my biggest winning positions",
                "What's my risk profile?",
                "Analyze my recent trading performance",
            ]

            if stats and stats["position_count"] > 0:
                if stats["total_pnl"] > 0:
                    suggestions.append("Why is my portfolio profitable?")
                else:
                    suggestions.append("How can I improve my portfolio performance?")

                if stats["total_delta"] > 1000:
                    suggestions.append("Should I hedge my delta exposure?")

            return {"suggestions": suggestions}
    except Exception as e:
        return {
            "suggestions": [
                "What's my current portfolio status?",
                "Show me recent volatility events",
                "Explain options Greeks",
                "What is implied volatility?",
            ]
        }


@app.get("/api/chat/conversations")
async def get_conversations(
    user_id: Optional[str] = None,
    use_case: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """Get list of chat conversations with optional filters."""
    try:
        conversations = db_manager.get_conversations(
            user_id=user_id,
            use_case=use_case,
            search_query=search,
            limit=limit,
            offset=offset,
        )
        return {"conversations": conversations}
    except Exception as e:
        logger.error(f"Error fetching conversations: {e}")
        return {"conversations": [], "error": str(e)}


@app.get("/api/chat/conversations/{conversation_id}")
async def get_conversation_details(conversation_id: int):
    """Get details of a specific conversation."""
    try:
        conversation = db_manager.get_conversation_details(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation
    except Exception as e:
        logger.error(f"Error fetching conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: int, limit: int = 50):
    """Get messages for a specific conversation."""
    try:
        messages = db_manager.get_chat_messages(conversation_id, limit=limit)
        return {"messages": messages}
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        return {"messages": [], "error": str(e)}


@app.get("/api/chat/conversations/{conversation_id}/tree")
async def get_conversation_tree(conversation_id: int):
    """Get conversation tree structure for branching visualization."""
    try:
        tree = db_manager.get_conversation_tree(conversation_id)
        return {"tree": tree}
    except Exception as e:
        logger.error(f"Error fetching conversation tree: {e}")
        return {"tree": {}, "error": str(e)}


@app.post("/api/chat/conversations")
async def create_conversation(conversation_data: dict):
    """Create a new conversation."""
    try:
        conversation_id = db_manager.create_chat_conversation(conversation_data)
        if not conversation_id:
            raise HTTPException(status_code=500, detail="Failed to create conversation")
        return {"conversation_id": conversation_id}
    except Exception as e:
        logger.error(f"Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat/conversations/{conversation_id}/branch")
async def create_conversation_branch(conversation_id: int, branch_data: dict):
    """Create a branch from a message in an existing conversation."""
    try:
        parent_message_id = branch_data.get("parent_message_id")
        if not parent_message_id:
            raise HTTPException(status_code=400, detail="parent_message_id is required")

        # Get conversation details for context
        parent_conversation = db_manager.get_conversation_details(conversation_id)
        if not parent_conversation:
            raise HTTPException(status_code=404, detail="Parent conversation not found")

        # Get messages up to the branch point
        all_messages = db_manager.get_chat_messages(conversation_id, limit=1000)
        messages_up_to_branch = []

        for msg in all_messages:
            messages_up_to_branch.append(msg)
            if msg["id"] == parent_message_id:
                break

        # Create new conversation branching from the message
        new_conversation_data = {
            "session_id": parent_conversation["session_id"],
            "user_id": parent_conversation.get("user_id"),
            "title": branch_data.get(
                "title", f"Branch of {parent_conversation.get('title', 'Conversation')}"
            ),
            "use_case": parent_conversation.get("use_case"),
            "parent_message_id": parent_message_id,
        }

        new_conversation_id = db_manager.create_chat_conversation(new_conversation_data)
        if not new_conversation_id:
            raise HTTPException(status_code=500, detail="Failed to create branch")

        # Copy messages up to branch point to new conversation
        for msg in messages_up_to_branch:
            db_manager.insert_chat_message(
                {
                    "conversation_id": new_conversation_id,
                    "role": msg["role"],
                    "content": msg["content"],
                    "metadata": msg.get("metadata"),
                    "sql_query": msg.get("sql_query"),
                    "query_results": msg.get("query_results"),
                    "context_snapshot": msg.get("context_snapshot"),
                }
            )

        return {
            "conversation_id": new_conversation_id,
            "messages_copied": len(messages_up_to_branch),
            "branch_point": parent_message_id,
        }
    except Exception as e:
        logger.error(f"Error creating branch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/chat/messages/{message_id}/branches")
async def get_message_branches(message_id: int):
    """Get all conversation branches from a specific message."""
    try:
        async with get_db() as conn:
            cursor = await conn.execute(
                """
                SELECT 
                    c.id,
                    c.session_id,
                    c.title,
                    c.use_case,
                    c.created_at,
                    COUNT(m.id) as message_count
                FROM chat_conversations c
                LEFT JOIN chat_messages m ON c.id = m.conversation_id
                WHERE c.parent_message_id = ?
                GROUP BY c.id
                ORDER BY c.created_at DESC
                """,
                (message_id,),
            )

            branches = []
            async for row in cursor:
                branches.append(dict(row))

            return {"branches": branches}
    except Exception as e:
        logger.error(f"Error fetching branches: {e}")
        return {"branches": [], "error": str(e)}


@app.delete("/api/chat/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int):
    """Delete (soft delete) a conversation."""
    try:
        success = db_manager.delete_conversation(conversation_id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/chat/conversations/{conversation_id}")
async def update_conversation(conversation_id: int, update_data: dict):
    """Update conversation metadata."""
    try:
        title = update_data.get("title")
        use_case = update_data.get("use_case")

        success = db_manager.update_chat_conversation(
            conversation_id, title=title, use_case=use_case
        )

        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")

        return {"success": True}
    except Exception as e:
        logger.error(f"Error updating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats/realtime")
async def get_realtime_stats():
    """Get real-time trading statistics."""
    async with get_db() as conn:
        # Get latest trades
        cursor = await conn.execute(
            """
            SELECT 
                COUNT(*) as total_trades,
                AVG(ar_volatility) as avg_volatility,
                MAX(ar_volatility) as max_volatility,
                MIN(price) as min_price,
                MAX(price) as max_price,
                AVG(price) as avg_price
            FROM realtime_trades
            WHERE timestamp > ?
        """,
            (int((datetime.now().timestamp() - 3600) * 1000),),
        )  # Last hour

        stats = await cursor.fetchone()
        
        # Get active positions count
        cursor = await conn.execute("""
            SELECT COUNT(*) as active_positions,
                   SUM(pnl) as total_pnl
            FROM positions
            WHERE is_active = 1
        """)
        position_stats = await cursor.fetchone()

        if stats:
            result = dict(stats)
            result["total_volume"] = result.get("total_trades", 0) * (result.get("avg_price", 0) or 0)
            result["active_positions"] = position_stats["active_positions"] or 0
            result["total_pnl"] = position_stats["total_pnl"] or 0
            result["last_updated"] = datetime.now().isoformat()
            return result
        else:
            return {
                "total_volume": 0,
                "total_trades": 0,
                "active_positions": position_stats["active_positions"] or 0,
                "total_pnl": position_stats["total_pnl"] or 0,
                "last_updated": datetime.now().isoformat()
            }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/api/test-error")
async def test_error():
    """Test error tracking endpoint - triggers a test error."""
    logger.info("Test error endpoint called")
    
    # Capture some context
    sentry_sdk.set_context("test_info", {
        "endpoint": "/api/test-error",
        "timestamp": datetime.now().isoformat(),
        "environment": os.getenv('NODE_ENV', 'production')
    })
    
    # Trigger a test error
    try:
        # This will raise a ZeroDivisionError
        result = 1 / 0
    except ZeroDivisionError as e:
        logger.error("Test error triggered successfully", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail="Test error triggered for GlitchTip testing"
        )


# SQL Modules API Routes


@app.get("/api/modules")
async def get_sql_modules(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    query_type: Optional[str] = None,
    favorites_only: bool = False,
):
    """Get SQL modules with filtering and pagination."""
    try:
        modules = db_manager.get_sql_modules(
            limit=limit,
            offset=offset,
            search=search,
            query_type=query_type,
            favorites_only=favorites_only,
        )

        # Get total count for pagination
        async with get_db() as conn:
            count_query = "SELECT COUNT(*) as total FROM sql_modules WHERE 1=1"
            params = []

            if search:
                count_query += (
                    " AND (title LIKE ? OR description LIKE ? OR sql_query LIKE ?)"
                )
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern, search_pattern])

            if query_type:
                count_query += " AND query_type = ?"
                params.append(query_type)

            if favorites_only:
                count_query += " AND is_favorite = TRUE"

            cursor = await conn.execute(count_query, params)
            total_count = (await cursor.fetchone())["total"]

        return {
            "modules": modules,
            "total": total_count,
            "page": offset // limit + 1,
            "page_size": limit,
        }
    except Exception as e:
        logger.error(f"Error fetching SQL modules: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/modules/{module_id}")
async def get_sql_module(module_id: int):
    """Get a specific SQL module by ID."""
    try:
        module = db_manager.get_sql_module_by_id(module_id)
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")
        return module
    except Exception as e:
        logger.error(f"Error fetching SQL module: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/modules/{module_id}/executions")
async def get_module_executions(module_id: int, limit: int = 50):
    """Get execution history for a SQL module."""
    try:
        executions = db_manager.get_sql_module_executions(module_id, limit=limit)
        return {"executions": executions}
    except Exception as e:
        logger.error(f"Error fetching module executions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/modules/{module_id}/execute")
async def execute_sql_module(module_id: int):
    """Re-execute a SQL module and store the results."""
    try:
        # Get the module
        module = db_manager.get_sql_module_by_id(module_id)
        if not module:
            raise HTTPException(status_code=404, detail="Module not found")

        # Execute the query
        from src.volatility_filter.sql_agent import SQLAgent

        sql_agent = SQLAgent(db_path=db_path)

        results = sql_agent.execute_query(module["sql_query"])

        if results["success"]:
            # Create execution record
            db_manager.create_or_update_sql_module(
                sql_query=module["sql_query"],
                message_id=0,  # No associated message for manual execution
                conversation_id=0,  # No associated conversation
                execution_time_ms=results.get("execution_time_ms", 0),
                row_count=results.get("row_count", 0),
                query_results=json.dumps(results["data"][:10]),  # Store first 10 rows
            )

            # Format response for test compatibility
            if results["data"] and len(results["data"]) > 0:
                columns = list(results["data"][0].keys())
            else:
                columns = []
            
            rows = results["data"]
            
            return {
                "columns": columns,
                "rows": rows,
                "execution_time": results.get("execution_time_ms", 0),
            }
        else:
            return {"success": False, "error": results["error"]}
    except Exception as e:
        logger.error(f"Error executing SQL module: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/modules/{module_id}")
async def update_sql_module(module_id: int, update_data: dict):
    """Update SQL module metadata (title, description, favorite status)."""
    try:
        success = db_manager.update_sql_module_metadata(
            module_id=module_id,
            title=update_data.get("title"),
            description=update_data.get("description"),
            is_favorite=update_data.get("is_favorite"),
        )

        if not success:
            raise HTTPException(status_code=404, detail="Module not found")

        return {"success": True}
    except Exception as e:
        logger.error(f"Error updating SQL module: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/modules/stats/overview")
async def get_modules_stats():
    """Get overall SQL modules statistics."""
    try:
        stats = db_manager.get_sql_module_stats()
        return stats
    except Exception as e:
        logger.error(f"Error fetching module stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
