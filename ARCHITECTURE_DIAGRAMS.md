# Architecture Diagrams

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile App<br/>Future]
    end
    
    subgraph "Frontend Application"
        NextJS[Next.js App<br/>Port 3000]
        ReactComponents[React Components]
        WebSocketClient[WebSocket Client]
        ReactQuery[React Query Cache]
        ThreeJS[3D Visualizations]
    end
    
    subgraph "API Gateway"
        FastAPI[FastAPI Server<br/>Port 8000]
        WSServer[WebSocket Server<br/>Port 8765]
    end
    
    subgraph "Business Logic"
        VolEngine[Volatility Engine]
        PortfolioMgr[Portfolio Manager]
        OptionsAnalytics[Options Analytics]
        MarketData[Market Data Service]
        AIClient[Claude AI Client]
        SQLAgent[SQL Agent]
    end
    
    subgraph "Data Layer"
        SQLite[(SQLite Database)]
        Cache[In-Memory Cache]
    end
    
    subgraph "External Services"
        Deribit[Deribit API]
        Polymarket[Polymarket API]
        Anthropic[Anthropic API]
    end
    
    Browser --> NextJS
    Mobile -.-> NextJS
    
    NextJS --> ReactComponents
    NextJS --> WebSocketClient
    NextJS --> ReactQuery
    NextJS --> ThreeJS
    
    ReactComponents --> FastAPI
    WebSocketClient --> WSServer
    
    FastAPI --> VolEngine
    FastAPI --> PortfolioMgr
    FastAPI --> OptionsAnalytics
    FastAPI --> AIClient
    FastAPI --> SQLAgent
    
    WSServer --> VolEngine
    WSServer --> MarketData
    
    VolEngine --> SQLite
    PortfolioMgr --> SQLite
    OptionsAnalytics --> SQLite
    MarketData --> Cache
    SQLAgent --> SQLite
    
    MarketData --> Deribit
    MarketData --> Polymarket
    AIClient --> Anthropic
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant FastAPI
    participant WebSocket
    participant VolEngine
    participant Database
    participant Deribit
    
    User->>Frontend: Open Dashboard
    Frontend->>FastAPI: GET /api/portfolio/summary
    FastAPI->>Database: Query positions
    Database-->>FastAPI: Return data
    FastAPI-->>Frontend: Portfolio data
    
    Frontend->>WebSocket: Subscribe to events
    WebSocket-->>Frontend: Subscription confirmed
    
    loop Market Data Updates
        Deribit->>VolEngine: Option prices
        VolEngine->>VolEngine: Calculate volatility
        VolEngine->>Database: Store calculations
        VolEngine->>WebSocket: Broadcast update
        WebSocket->>Frontend: Push update
        Frontend->>User: Display update
    end
    
    User->>Frontend: Set alert threshold
    Frontend->>FastAPI: POST /api/volatility/threshold
    FastAPI->>VolEngine: Update threshold
    VolEngine->>Database: Save configuration
```

## Component Architecture

```mermaid
graph LR
    subgraph "Frontend Components"
        Dashboard[Dashboard]
        Portfolio[Portfolio View]
        VolSurface[Volatility Surface]
        Chat[AI Chat]
        Alerts[Alerts Panel]
    end
    
    subgraph "Shared Components"
        Layout[App Layout]
        Charts[Chart Components]
        Tables[Data Tables]
        Forms[Form Controls]
        Modals[Modal Dialogs]
    end
    
    subgraph "Hooks & Utils"
        WSHooks[WebSocket Hooks]
        APIHooks[API Hooks]
        Utils[Utilities]
        Types[TypeScript Types]
    end
    
    Dashboard --> Layout
    Portfolio --> Layout
    VolSurface --> Layout
    Chat --> Layout
    
    Dashboard --> Charts
    Portfolio --> Tables
    VolSurface --> Charts
    Alerts --> Tables
    
    Dashboard --> WSHooks
    Portfolio --> APIHooks
    Chat --> APIHooks
    
    WSHooks --> Types
    APIHooks --> Types
    Utils --> Types
```

## Database Schema

```mermaid
erDiagram
    HISTORICAL_TRADES {
        int id PK
        string symbol
        float price
        float volume
        int timestamp
        string source
    }
    
    OPTION_INSTRUMENTS {
        int id PK
        string symbol UK
        string underlying
        float strike
        string expiry
        string option_type
    }
    
    OPTION_GREEKS {
        int id PK
        string symbol FK
        float delta
        float gamma
        float theta
        float vega
        float rho
        int timestamp
    }
    
    POSITIONS {
        int id PK
        string symbol
        float quantity
        float entry_price
        float current_price
        float realized_pnl
        float unrealized_pnl
        float delta
        float gamma
        float theta
        float vega
        int updated_at
    }
    
    VOLATILITY_EVENTS {
        int id PK
        string symbol
        string event_type
        float threshold
        float actual_value
        int timestamp
    }
    
    PERFORMANCE_METRICS {
        int id PK
        string metric_name
        float value
        int timestamp
    }
    
    OPTION_INSTRUMENTS ||--o{ OPTION_GREEKS : has
    OPTION_INSTRUMENTS ||--o{ POSITIONS : references
    OPTION_INSTRUMENTS ||--o{ VOLATILITY_EVENTS : triggers
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Docker Container"
        Supervisor[Supervisor Process Manager]
        
        subgraph "Services"
            NextBuild[Next.js Build]
            NextServer[Next.js Server<br/>Port 3001]
            FastAPIServer[FastAPI Server<br/>Port 8000]
            WebSocketSrv[WebSocket Server<br/>Port 8765]
        end
        
        subgraph "Data Volume"
            DBFile[(SQLite DB)]
            Logs[Log Files]
        end
    end
    
    subgraph "Host System"
        Docker[Docker Engine]
        Volume[Mounted Volume]
    end
    
    subgraph "External Network"
        Internet[Internet]
        APIs[External APIs]
    end
    
    Supervisor --> NextServer
    Supervisor --> FastAPIServer
    Supervisor --> WebSocketSrv
    
    NextBuild --> NextServer
    
    FastAPIServer --> DBFile
    WebSocketSrv --> DBFile
    
    DBFile -.-> Volume
    Logs -.-> Volume
    
    Docker --> Supervisor
    
    FastAPIServer --> APIs
    WebSocketSrv --> APIs
    
    Internet --> NextServer
    Internet --> FastAPIServer
    Internet --> WebSocketSrv
```

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    
    Disconnected --> Connecting: User opens app
    Connecting --> Connected: WebSocket established
    Connected --> Subscribed: Subscribe to events
    
    Subscribed --> ReceivingData: Server pushes data
    ReceivingData --> UpdateUI: Process & display
    UpdateUI --> Subscribed: Wait for next update
    
    Subscribed --> UserAction: User interaction
    UserAction --> APICall: Send to server
    APICall --> UpdateLocal: Optimistic update
    APICall --> ServerResponse: Wait for response
    ServerResponse --> UpdateConfirmed: Success
    ServerResponse --> Rollback: Error
    
    UpdateConfirmed --> Subscribed
    Rollback --> Subscribed
    
    Connected --> Disconnected: Connection lost
    Subscribed --> Disconnected: Connection lost
    Disconnected --> Reconnecting: Auto-reconnect
    Reconnecting --> Connected: Reconnected
    Reconnecting --> Disconnected: Max retries
```

## Security Architecture

```mermaid
graph TB
    subgraph "Client"
        Browser[Browser]
        LocalStorage[Local Storage]
    end
    
    subgraph "API Gateway"
        CORS[CORS Policy]
        RateLimit[Rate Limiter]
        Auth[Authentication]
        Validation[Input Validation]
    end
    
    subgraph "Application"
        FastAPI[FastAPI]
        Sanitizer[SQL Sanitizer]
        Encryption[Data Encryption]
    end
    
    subgraph "External"
        APIKeys[API Key Store]
        EnvVars[Environment Variables]
    end
    
    Browser --> CORS
    CORS --> RateLimit
    RateLimit --> Auth
    Auth --> Validation
    Validation --> FastAPI
    
    FastAPI --> Sanitizer
    Sanitizer --> Encryption
    
    Auth -.-> APIKeys
    FastAPI -.-> EnvVars
    
    LocalStorage -.-> Browser
    
    style CORS fill:#f9f,stroke:#333,stroke-width:2px
    style Auth fill:#f9f,stroke:#333,stroke-width:2px
    style Sanitizer fill:#f9f,stroke:#333,stroke-width:2px
```

## Performance Optimization Strategy

```mermaid
graph LR
    subgraph "Frontend Optimizations"
        CodeSplit[Code Splitting]
        LazyLoad[Lazy Loading]
        Memoization[React Memoization]
        VirtualList[Virtual Lists]
    end
    
    subgraph "API Optimizations"
        AsyncIO[Async I/O]
        ConnPool[Connection Pooling]
        Caching[Response Caching]
        Pagination[Pagination]
    end
    
    subgraph "Data Optimizations"
        Indexing[DB Indexing]
        QueryOpt[Query Optimization]
        Denorm[Denormalization]
        Archival[Data Archival]
    end
    
    subgraph "Network Optimizations"
        Compression[Gzip Compression]
        CDN[CDN Assets]
        WSBatch[WebSocket Batching]
        Throttle[Update Throttling]
    end
    
    CodeSplit --> Performance[Improved Performance]
    LazyLoad --> Performance
    Memoization --> Performance
    VirtualList --> Performance
    
    AsyncIO --> Performance
    ConnPool --> Performance
    Caching --> Performance
    Pagination --> Performance
    
    Indexing --> Performance
    QueryOpt --> Performance
    Denorm --> Performance
    Archival --> Performance
    
    Compression --> Performance
    CDN --> Performance
    WSBatch --> Performance
    Throttle --> Performance
```

These diagrams provide a visual representation of the system architecture, data flows, and key design decisions. They can be rendered in any Markdown viewer that supports Mermaid diagrams.